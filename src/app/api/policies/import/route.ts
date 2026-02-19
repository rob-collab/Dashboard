import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, generateReference } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const importSchema = z.object({
  type: z.enum(["policies", "regulations", "obligations"]),
  data: z.string().min(1),
  policyId: z.string().optional(), // Required for obligations import
});

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
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
    const errors: string[] = [];

    if (type === "policies") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.name || !row.description || !row.ownerId) {
          errors.push(`Row ${i + 1}: missing required fields (name, description, ownerId)`);
          continue;
        }
        try {
          const reference = await generateReference("POL-", "policy");
          await prisma.policy.create({
            data: {
              reference,
              name: row.name,
              description: row.description,
              status: (row.status as "CURRENT" | "OVERDUE" | "UNDER_REVIEW" | "ARCHIVED") || "CURRENT",
              ownerId: row.ownerId,
              classification: row.classification || "Internal Only",
              reviewFrequencyDays: row.reviewFrequencyDays ? parseInt(row.reviewFrequencyDays) : 365,
              scope: row.scope || null,
              applicability: row.applicability || null,
              relatedPolicies: row.relatedPolicies ? row.relatedPolicies.split(";") : [],
            },
          });
          created++;
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "creation failed"}`);
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

    return jsonResponse(serialiseDates({ created, total: rows.length, errors }));
  } catch (err) {
    console.error("[POST /api/policies/import]", err);
    return errorResponse("Internal server error", 500);
  }
}
