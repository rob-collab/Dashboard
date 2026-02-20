import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";

const connStr = process.env.DATABASE_URL as string;
const adapter = new PrismaPg({ connectionString: connStr });
const prisma = new PrismaClient({ adapter });

/* ── CSV parser ────────────────────────────────────────────────────── */
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

/* ── Main ──────────────────────────────────────────────────────────── */
const CSV_PATH = "/Users/robhealey/Downloads/Compliance_Universe_Master_v3_ENRICHED.csv";

async function main() {
  console.log("Updating regulation descriptions in database...");
  console.log("CSV:", CSV_PATH);
  console.log("─".repeat(60));

  const csvData = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(csvData);
  console.log(`Parsed ${rows.length} CSV rows`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const row of rows) {
    const reference = row.reference;
    const description = row.description;

    if (!reference || !description) continue;

    try {
      // Find regulation by reference
      const reg = await prisma.regulation.findFirst({
        where: {
          OR: [
            { reference },
            { shortName: reference },
          ],
        },
      });

      if (reg) {
        await prisma.regulation.update({
          where: { id: reg.id },
          data: { description },
        });
        updated++;
        if (updated % 50 === 0) {
          console.log(`  Updated ${updated} regulations...`);
        }
      } else {
        notFound++;
        if (notFound <= 10) {
          console.log(`  ⚠ Not found in DB: ${reference}`);
        }
      }
    } catch (err) {
      errors++;
      console.error(`  ✗ Error updating ${reference}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("─".repeat(60));
  console.log(`✓ Updated: ${updated} regulation descriptions`);
  console.log(`  Not found in DB: ${notFound}`);
  console.log(`  Errors: ${errors}`);

  const totalRegs = await prisma.regulation.count();
  console.log(`\nDB total regulations: ${totalRegs}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
