import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, generateReference } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const importSchema = z.object({
  type: z.enum(["policies", "regulations", "obligations"]),
  data: z.string().min(1),
  policyId: z.string().optional(), // Required for obligations import
});

/* ── CSV parser that handles quoted fields with commas ───────────────── */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

/* ── Resolve ownerEmail → userId ─────────────────────────────────────── */
async function resolveOwnerId(row: Record<string, string>): Promise<string | null> {
  // Direct ownerId takes priority
  if (row.ownerId) return row.ownerId;
  // Resolve by email
  const email = row.ownerEmail;
  if (!email) return null;
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  return user?.id ?? null;
}

/* ── Parse date string to Date or null ───────────────────────────────── */
function parseDate(val: string | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const body = await request.json();
    const result = validateBody(importSchema, body);
    if ("error" in result) return result.error;
    const { type, data, policyId } = result.data;

    const rows = parseCSV(data);
    if (rows.length === 0) return errorResponse("No data rows found in CSV", 400);

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    if (type === "policies") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ownerId = await resolveOwnerId(row);
        if (!row.name || !row.description || !ownerId) {
          errors.push(`Row ${i + 1}: missing required fields (name, description, ownerId or ownerEmail)`);
          continue;
        }
        try {
          // Check if policy already exists by reference
          const existingByRef = row.reference
            ? await prisma.policy.findUnique({ where: { reference: row.reference } })
            : null;
          // Or by name (fuzzy match)
          const existingByName = !existingByRef
            ? await prisma.policy.findFirst({ where: { name: { equals: row.name, mode: "insensitive" } } })
            : null;
          const existing = existingByRef ?? existingByName;

          const policyData = {
            name: row.name,
            description: row.description,
            status: (row.status as "CURRENT" | "OVERDUE" | "UNDER_REVIEW" | "ARCHIVED") || "CURRENT",
            version: row.version || "1.0",
            ownerId,
            approvedBy: row.approvedBy || null,
            classification: row.classification || "Internal Only",
            reviewFrequencyDays: row.reviewFrequencyDays ? parseInt(row.reviewFrequencyDays) : 365,
            effectiveDate: parseDate(row.effectiveDate),
            lastReviewedDate: parseDate(row.lastReviewedDate),
            nextReviewDate: parseDate(row.nextReviewDate),
            scope: row.scope || null,
            applicability: row.applicability || null,
            exceptions: row.exceptions || null,
            storageUrl: row.storageUrl || null,
            approvingBody: row.approvingBody || null,
            consumerDutyOutcomes: row.consumerDutyOutcomes
              ? row.consumerDutyOutcomes.split(";").map((s) => s.trim()).filter(Boolean)
              : [],
            relatedPolicies: row.relatedPolicies ? row.relatedPolicies.split(";").map((s) => s.trim()).filter(Boolean) : [],
          };

          let policy;
          if (existing) {
            policy = await prisma.policy.update({
              where: { id: existing.id },
              data: policyData,
            });
            updated++;
          } else {
            const reference = row.reference || await generateReference("POL-", "policy");
            policy = await prisma.policy.create({
              data: { reference, ...policyData },
            });
            created++;
          }

          // Link control references → PolicyControlLink
          if (row.controlReferences) {
            const ctrlRefs = row.controlReferences.split(";").map((s) => s.trim()).filter(Boolean);
            for (const ref of ctrlRefs) {
              const ctrl = await prisma.control.findUnique({ where: { controlRef: ref } });
              if (ctrl) {
                await prisma.policyControlLink.upsert({
                  where: { policyId_controlId: { policyId: policy.id, controlId: ctrl.id } },
                  update: {},
                  create: { policyId: policy.id, controlId: ctrl.id, linkedBy: userId },
                });
              }
            }
          }

          // Link regulation references → PolicyRegulatoryLink
          if (row.regulationReferences) {
            const regRefs = row.regulationReferences.split(";").map((s) => s.trim()).filter(Boolean);
            for (const ref of regRefs) {
              // Find regulation by reference or shortName
              const reg = await prisma.regulation.findFirst({
                where: { OR: [{ reference: ref }, { shortName: ref }, { name: { contains: ref, mode: "insensitive" } }] },
              });
              if (reg) {
                await prisma.policyRegulatoryLink.upsert({
                  where: { policyId_regulationId: { policyId: policy.id, regulationId: reg.id } },
                  update: {},
                  create: { policyId: policy.id, regulationId: reg.id, linkedBy: userId },
                });
              }
            }
          }

          // Audit log
          await prisma.policyAuditLog.create({
            data: {
              policyId: policy.id,
              userId,
              action: existing ? "POLICY_UPDATED" : "POLICY_CREATED",
              details: `${existing ? "Updated" : "Created"} via CSV import`,
            },
          });
        } catch (err) {
          errors.push(`Row ${i + 1} (${row.name}): ${err instanceof Error ? err.message : "creation failed"}`);
        }
      }
    } else if (type === "regulations") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.name || !row.body || !row.type) {
          errors.push(`Row ${i + 1}: missing required fields (name, body, type)`);
          continue;
        }
        try {
          const reference = row.reference || await generateReference("REG-", "regulation");
          await prisma.regulation.upsert({
            where: { reference },
            update: {
              name: row.name,
              shortName: row.shortName || null,
              body: row.body,
              type: row.type as "HANDBOOK_RULE" | "PRINCIPLE" | "LEGISLATION" | "STATUTORY_INSTRUMENT" | "GUIDANCE" | "INDUSTRY_CODE",
              provisions: row.provisions || null,
              url: row.url || null,
              description: row.description || null,
            },
            create: {
              reference,
              name: row.name,
              shortName: row.shortName || null,
              body: row.body,
              type: row.type as "HANDBOOK_RULE" | "PRINCIPLE" | "LEGISLATION" | "STATUTORY_INSTRUMENT" | "GUIDANCE" | "INDUSTRY_CODE",
              provisions: row.provisions || null,
              url: row.url || null,
              description: row.description || null,
            },
          });
          created++;
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "creation failed"}`);
        }
      }
    } else if (type === "obligations") {
      if (!policyId) return errorResponse("policyId required for obligations import", 400);
      const policy = await prisma.policy.findUnique({ where: { id: policyId } });
      if (!policy) return errorResponse("Policy not found", 404);

      // Section-aware merging: rows with same (category, description) merge into
      // one requirement with multiple sections. The sectionName column triggers merging.
      const hasSectionColumn = rows.some((r) => r.sectionName);

      if (hasSectionColumn) {
        // Group rows by (category, description)
        const grouped = new Map<string, { category: string; description: string; notes: string; regRefs: Set<string>; ctrlRefs: Set<string>; sections: { name: string; regulationRefs: string[]; controlRefs: string[] }[] }>();

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row.category || !row.description) {
            errors.push(`Row ${i + 1}: missing required fields (category, description)`);
            continue;
          }
          const key = `${row.category}|||${row.description}`;
          if (!grouped.has(key)) {
            grouped.set(key, {
              category: row.category,
              description: row.description,
              notes: row.notes || "",
              regRefs: new Set<string>(),
              ctrlRefs: new Set<string>(),
              sections: [],
            });
          }
          const entry = grouped.get(key)!;

          const sectionRegRefs = row.regulationReferences ? row.regulationReferences.split(";").map((s: string) => s.trim()).filter(Boolean) : (row.regulationRefs ? row.regulationRefs.split(";").map((s: string) => s.trim()).filter(Boolean) : []);
          const sectionCtrlRefs = row.controlReferences ? row.controlReferences.split(";").map((s: string) => s.trim()).filter(Boolean) : (row.controlRefs ? row.controlRefs.split(";").map((s: string) => s.trim()).filter(Boolean) : []);

          // Add to union sets for top-level refs
          for (const r of sectionRegRefs) entry.regRefs.add(r);
          for (const c of sectionCtrlRefs) entry.ctrlRefs.add(c);

          if (row.sectionName) {
            entry.sections.push({
              name: row.sectionName,
              regulationRefs: sectionRegRefs,
              controlRefs: sectionCtrlRefs,
            });
          }

          if (row.notes && !entry.notes) entry.notes = row.notes;
        }

        // Create one obligation per group
        for (const entry of Array.from(grouped.values())) {
          try {
            const reference = await generateReference(`${policy.reference}-OBL-`, "policyObligation", "reference", 2);
            await prisma.policyObligation.create({
              data: {
                policyId,
                reference,
                category: entry.category,
                description: entry.description,
                regulationRefs: Array.from(entry.regRefs),
                controlRefs: Array.from(entry.ctrlRefs),
                sections: entry.sections.length > 0 ? entry.sections : [],
                notes: entry.notes || null,
              },
            });
            created++;
          } catch (err) {
            errors.push(`${entry.category}: ${err instanceof Error ? err.message : "creation failed"}`);
          }
        }
      } else {
        // Legacy flat import (no sections)
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row.category || !row.description) {
            errors.push(`Row ${i + 1}: missing required fields (category, description)`);
            continue;
          }
          try {
            const reference = await generateReference(`${policy.reference}-OBL-`, "policyObligation", "reference", 2);
            await prisma.policyObligation.create({
              data: {
                policyId,
                reference,
                category: row.category,
                description: row.description,
                regulationRefs: row.regulationRefs ? row.regulationRefs.split(";") : [],
                controlRefs: row.controlRefs ? row.controlRefs.split(";") : [],
                sections: [],
                notes: row.notes || null,
              },
            });
            created++;
          } catch (err) {
            errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "creation failed"}`);
          }
        }
      }

      // Audit
      await prisma.policyAuditLog.create({
        data: {
          policyId,
          userId,
          action: "BULK_IMPORT_OBLIGATIONS",
          details: `Imported ${created} requirements`,
        },
      });
    }

    return jsonResponse(serialiseDates({ created, updated, total: rows.length, errors }));
  } catch (err) {
    console.error("[POST /api/policies/import]", err);
    return errorResponse("Internal server error", 500);
  }
}
