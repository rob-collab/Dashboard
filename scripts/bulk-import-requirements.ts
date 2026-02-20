import "dotenv/config";
import { PrismaClient, Prisma } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── CSV files → Policy mapping ──────────────────────────────────────────
const CSV_DIR = "/Users/robhealey/Downloads/drive-download-20260219T231609Z-1-001";

const POLICY_MAP: Record<string, { name: string; description: string; ownerId: string }> = {
  "aml_kyc_requirements.csv":              { name: "AML/KYC/PEPs Policy", description: "Anti-money laundering, know your customer, and politically exposed persons policy.", ownerId: "user-cath" },
  "anti_bribery_requirements.csv":         { name: "Anti-Bribery & Corruption Policy", description: "Policy governing the prevention and detection of bribery and corrupt practices.", ownerId: "user-cath" },
  "arrears_collections_requirements.csv":  { name: "Arrears & Collections Policy", description: "Policy governing the treatment of customers in arrears, default, and the collections process.", ownerId: "user-cath" },
  "complaints_requirements.csv":           { name: "Complaints Handling Policy", description: "Policy governing the handling, investigation, and resolution of customer complaints.", ownerId: "user-cath" },
  "conduct_risk_requirements.csv":         { name: "Conduct Risk Policy", description: "Policy governing conduct risk identification, assessment, and mitigation across all business activities.", ownerId: "user-cath" },
  "conflicts_of_interest_requirements.csv":{ name: "Conflicts of Interest Policy", description: "Policy for identifying, managing, and recording conflicts of interest.", ownerId: "user-cath" },
  "credit_policy_requirements.csv":        { name: "Credit Policy", description: "Policy governing creditworthiness assessment, affordability, responsible lending, and credit risk management.", ownerId: "user-cath" },
  "data_protection_requirements.csv":      { name: "Data Protection Policy", description: "Policy governing the processing, storage, and protection of personal data under UK GDPR and DPA 2018.", ownerId: "user-cath" },
  "data_retention_requirements.csv":       { name: "Data Retention Policy", description: "Policy governing data retention periods, archiving, and secure destruction of records.", ownerId: "user-cath" },
  "fair_value_assessment_requirements.csv": { name: "Fair Value Assessment Policy", description: "Policy for assessing and evidencing fair value of products and services under Consumer Duty.", ownerId: "user-cath" },
  "financial_promotions_requirements.csv": { name: "Financial Promotions Policy", description: "Governs the creation, review, approval, and management of all financial promotional material.", ownerId: "user-cath" },
  "health_safety_requirements.csv":        { name: "Health & Safety Policy", description: "Policy governing workplace health and safety obligations and risk management.", ownerId: "user-cath" },
  "it_security_requirements.csv":          { name: "IT Security Policy", description: "Policy governing information technology security, access controls, and cyber risk management.", ownerId: "user-cath" },
  "lending_procedures_requirements.csv":   { name: "Lending Procedures Policy", description: "Policy governing operational lending procedures, application processing, and disbursement.", ownerId: "user-cath" },
  "payce_credit_requirements.csv":         { name: "Payce Credit Policy", description: "Product-specific credit policy for the Payce credit product.", ownerId: "user-cath" },
  "privacy_policy_requirements.csv":       { name: "Privacy Policy", description: "Customer-facing privacy notice governing data processing transparency and individual rights.", ownerId: "user-cath" },
  "product_annual_review_requirements.csv":{ name: "Product Annual Review Policy", description: "Policy governing annual product reviews, fair value assessments, and target market validation.", ownerId: "user-cath" },
  "provisioning_requirements.csv":         { name: "Provisioning Policy", description: "Policy governing credit loss provisioning, impairment assessment, and write-off procedures.", ownerId: "user-cath" },
  "terms_conditions_requirements.csv":     { name: "Terms & Conditions Policy", description: "Policy governing the drafting, review, and maintenance of customer terms and conditions.", ownerId: "user-cath" },
  "vulnerable_customers_requirements.csv": { name: "Vulnerable Customers Policy", description: "Policy governing the identification, support, and treatment of vulnerable customers.", ownerId: "user-cath" },
};

// ── CSV parser (handles quoted fields with commas) ──────────────────────
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

// ── Reference generator ─────────────────────────────────────────────────
let refCounter = 1;
async function generateRef(prefix: string): Promise<string> {
  // Find existing max
  const existing = await prisma.policyObligation.findMany({
    where: { reference: { startsWith: prefix } },
    select: { reference: true },
  });
  let max = 0;
  for (const e of existing) {
    const num = parseInt(e.reference.replace(prefix, ""), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  return `${prefix}${String(max + refCounter++).padStart(2, "0")}`;
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log("Bulk importing requirements from", CSV_DIR);
  console.log("─".repeat(60));

  let totalPolicies = 0;
  let totalRequirements = 0;
  let totalErrors = 0;

  for (const [csvFile, policyInfo] of Object.entries(POLICY_MAP)) {
    const csvPath = path.join(CSV_DIR, csvFile);
    if (!fs.existsSync(csvPath)) {
      console.log(`⚠ Skipping ${csvFile} — file not found`);
      continue;
    }

    // Find or create policy
    let policy = await prisma.policy.findFirst({
      where: { name: { contains: policyInfo.name.split(" ")[0], mode: "insensitive" } },
    });

    if (!policy) {
      // Generate reference
      const count = await prisma.policy.count();
      const ref = `POL-${String(count + 1).padStart(3, "0")}`;

      policy = await prisma.policy.create({
        data: {
          reference: ref,
          name: policyInfo.name,
          description: policyInfo.description,
          status: "CURRENT",
          version: "1.0",
          ownerId: policyInfo.ownerId,
          classification: "Internal Only",
          reviewFrequencyDays: 365,
        },
      });
      console.log(`✓ Created policy ${ref} — ${policyInfo.name}`);
      totalPolicies++;
    } else {
      console.log(`● Found existing policy ${policy.reference} — ${policy.name}`);
    }

    // Parse CSV and import requirements
    const csvData = fs.readFileSync(csvPath, "utf-8");
    const rows = parseCSV(csvData);

    // Section-aware merging
    const grouped = new Map<string, {
      category: string;
      description: string;
      notes: string;
      regRefs: Set<string>;
      ctrlRefs: Set<string>;
      sections: { name: string; regulationRefs: string[]; controlRefs: string[] }[];
    }>();

    for (const row of rows) {
      if (!row.category || !row.description) continue;
      const key = `${row.category}|||${row.description}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          category: row.category,
          description: row.description,
          notes: row.notes || "",
          regRefs: new Set(),
          ctrlRefs: new Set(),
          sections: [],
        });
      }
      const entry = grouped.get(key)!;

      const sectionRegRefs = (row.regulationReferences || "").split(";").map(s => s.trim()).filter(Boolean);
      const sectionCtrlRefs = (row.controlReferences || "").split(";").map(s => s.trim()).filter(Boolean);

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

    // Reset counter per policy
    refCounter = 1;
    let created = 0;
    let errors = 0;

    for (const entry of Array.from(grouped.values())) {
      try {
        const prefix = `${policy.reference}-OBL-`;
        const reference = await generateRef(prefix);

        await prisma.policyObligation.create({
          data: {
            policyId: policy.id,
            reference,
            category: entry.category,
            description: entry.description,
            regulationRefs: Array.from(entry.regRefs),
            controlRefs: Array.from(entry.ctrlRefs),
            sections: entry.sections.length > 0 ? entry.sections : Prisma.JsonNull,
            notes: entry.notes || null,
          },
        });
        created++;
      } catch (err) {
        errors++;
        console.error(`  ✗ Error: ${err instanceof Error ? err.message : err}`);
      }
    }

    console.log(`  → ${created} requirements imported (${rows.length} CSV rows → ${grouped.size} merged requirements)`);
    if (errors > 0) console.log(`  ✗ ${errors} errors`);
    totalRequirements += created;
    totalErrors += errors;

    // Audit log
    await prisma.policyAuditLog.create({
      data: {
        policyId: policy.id,
        userId: "user-cath",
        action: "BULK_IMPORT_OBLIGATIONS",
        details: `Script imported ${created} requirements from ${csvFile}`,
      },
    });
  }

  console.log("─".repeat(60));
  console.log(`Done: ${totalPolicies} policies created, ${totalRequirements} requirements imported, ${totalErrors} errors`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
