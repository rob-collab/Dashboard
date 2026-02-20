import "dotenv/config";
import * as fs from "fs";
import { PRIN_CONC_DESCRIPTIONS } from "./enrich-descriptions-prin-conc";
import { SYSC_LEG_DESCRIPTIONS } from "./enrich-descriptions-sysc-leg";
import { REMAINING_DESCRIPTIONS } from "./enrich-descriptions-remaining";

/* ── Merge all description maps ────────────────────────────────────── */
const ALL_DESCRIPTIONS: Record<string, string> = {
  ...PRIN_CONC_DESCRIPTIONS,
  ...SYSC_LEG_DESCRIPTIONS,
  ...REMAINING_DESCRIPTIONS,
};

/* ── CSV parser (handles quoted fields with commas) ────────────────── */
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
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return '"' + value + '"';
}

/* ── Main ──────────────────────────────────────────────────────────── */
const INPUT_CSV = "/Users/robhealey/Downloads/Compliance_Universe_Master_v3_with_SMCR (1).csv";
const OUTPUT_CSV = "/Users/robhealey/Downloads/Compliance_Universe_Master_v3_ENRICHED.csv";

const csvData = fs.readFileSync(INPUT_CSV, "utf-8");
const lines = csvData.trim().split("\n");
const headerLine = lines[0];
const headers = parseCSVLine(headerLine);
const descIdx = headers.indexOf("description");

if (descIdx === -1) {
  console.error("ERROR: 'description' column not found in CSV headers");
  process.exit(1);
}

console.log(`Input CSV: ${INPUT_CSV}`);
console.log(`Output CSV: ${OUTPUT_CSV}`);
console.log(`Total rows: ${lines.length - 1}`);
console.log(`Description column index: ${descIdx}`);
console.log(`Enrichment entries: ${Object.keys(ALL_DESCRIPTIONS).length}`);
console.log("─".repeat(60));

let enriched = 0;
let skipped = 0;
let dataProtSkipped = 0;

const outputLines: string[] = [headerLine];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const fields = parseCSVLine(line);
  const cuId = fields[0]?.replace(/"/g, "");

  // Check if this CU-ID has an enriched description
  if (ALL_DESCRIPTIONS[cuId]) {
    fields[descIdx] = ALL_DESCRIPTIONS[cuId];
    enriched++;
  } else {
    // Data protection section (CU-0145 to CU-0218) already has good descriptions
    const num = parseInt(cuId.replace("CU-", ""));
    if (num >= 145 && num <= 218) {
      dataProtSkipped++;
    } else {
      skipped++;
      if (skipped <= 5) {
        console.log(`  ⚠ No enrichment for ${cuId}: "${fields[4]?.replace(/"/g, "").substring(0, 50)}..."`);
      }
    }
  }

  // Rebuild the CSV line with proper quoting
  const rebuiltLine = fields.map((f) => escapeCSVField(f.replace(/^"|"$/g, ""))).join(",");
  outputLines.push(rebuiltLine);
}

fs.writeFileSync(OUTPUT_CSV, outputLines.join("\n") + "\n", "utf-8");

console.log("─".repeat(60));
console.log(`✓ Enriched: ${enriched} descriptions`);
console.log(`  Data Protection (already good): ${dataProtSkipped} skipped`);
console.log(`  Other skipped: ${skipped}`);
console.log(`✓ Output written to: ${OUTPUT_CSV}`);
