import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";

const connStr = process.env.DATABASE_URL as string;
const adapter = new PrismaPg({ connectionString: connStr });
const prisma = new PrismaClient({ adapter });

const CSV_PATH = "/Users/robhealey/Downloads/drive-download-20260219T231609Z-1-001/updraft_policies_complete.csv";

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

function parseDate(val: string | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  console.log("Importing policies from CSV:", CSV_PATH);
  console.log("─".repeat(60));

  const csvData = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(csvData);
  console.log(`Parsed ${rows.length} rows`);
  console.log(`Columns: ${Object.keys(rows[0]).join(", ")}`);

  let created = 0;
  let updated = 0;
  let errors = 0;
  let controlLinks = 0;
  let regLinks = 0;

  for (const row of rows) {
    // Resolve owner by email
    let ownerId = row.ownerId || null;
    if (!ownerId && row.ownerEmail) {
      const user = await prisma.user.findFirst({
        where: { email: { equals: row.ownerEmail, mode: "insensitive" } },
      });
      ownerId = user?.id ?? null;
      if (!ownerId) {
        // Try matching by name from email prefix
        const prefix = row.ownerEmail.split("@")[0];
        const byName = await prisma.user.findFirst({
          where: { name: { equals: prefix, mode: "insensitive" } },
        });
        ownerId = byName?.id ?? null;
      }
    }

    if (!row.name || !row.description || !ownerId) {
      console.error(`✗ Skipping "${row.name || row.reference}": missing name/description/owner (email: ${row.ownerEmail})`);
      errors++;
      continue;
    }

    try {
      // Find existing policy by reference or name
      const existingByRef = row.reference
        ? await prisma.policy.findUnique({ where: { reference: row.reference } })
        : null;
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
        console.log(`● Updated ${existing.reference} → ${row.name}`);
        updated++;
      } else {
        const reference = row.reference || `POL-${String((await prisma.policy.count()) + 1).padStart(3, "0")}`;
        policy = await prisma.policy.create({
          data: { reference, ...policyData },
        });
        console.log(`✓ Created ${reference} → ${row.name}`);
        created++;
      }

      // Link controls
      if (row.controlReferences) {
        const ctrlRefs = row.controlReferences.split(";").map((s) => s.trim()).filter(Boolean);
        for (const ref of ctrlRefs) {
          const ctrl = await prisma.control.findUnique({ where: { controlRef: ref } });
          if (ctrl) {
            try {
              await prisma.policyControlLink.upsert({
                where: { policyId_controlId: { policyId: policy.id, controlId: ctrl.id } },
                update: {},
                create: { policyId: policy.id, controlId: ctrl.id, linkedBy: "user-cath" },
              });
              controlLinks++;
            } catch { /* already exists */ }
          }
        }
      }

      // Link regulations
      if (row.regulationReferences) {
        const regRefs = row.regulationReferences.split(";").map((s) => s.trim()).filter(Boolean);
        for (const ref of regRefs) {
          const reg = await prisma.regulation.findFirst({
            where: { OR: [{ reference: ref }, { shortName: ref }, { name: { contains: ref, mode: "insensitive" } }] },
          });
          if (reg) {
            try {
              await prisma.policyRegulatoryLink.upsert({
                where: { policyId_regulationId: { policyId: policy.id, regulationId: reg.id } },
                update: {},
                create: { policyId: policy.id, regulationId: reg.id, linkedBy: "user-cath" },
              });
              regLinks++;
            } catch { /* already exists */ }
          }
        }
      }

      // Audit log
      await prisma.policyAuditLog.create({
        data: {
          policyId: policy.id,
          userId: "user-cath",
          action: existing ? "POLICY_UPDATED" : "POLICY_CREATED",
          details: `${existing ? "Updated" : "Created"} via CSV import script`,
        },
      });
    } catch (err) {
      console.error(`✗ Error on "${row.name}": ${err instanceof Error ? err.message : err}`);
      errors++;
    }
  }

  console.log("─".repeat(60));
  console.log(`Done: ${created} created, ${updated} updated, ${errors} errors`);
  console.log(`Linked: ${controlLinks} control links, ${regLinks} regulation links`);

  const totalPolicies = await prisma.policy.count();
  const totalLinks = await prisma.policyControlLink.count();
  const totalRegLinks = await prisma.policyRegulatoryLink.count();
  console.log(`\nDB totals: ${totalPolicies} policies, ${totalLinks} control links, ${totalRegLinks} regulation links`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
