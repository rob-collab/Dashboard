#!/usr/bin/env npx tsx

/**
 * Convert flat CSV format to both measure and MI import formats
 *
 * Input format:
 *   Outcome, Measure ID, Measure, Metric, Business Owner
 *
 * Outputs:
 *   1. Measures CSV: Measure ID, Name, Outcome, Owner, Summary, RAG
 *   2. MI Metrics CSV: Measure ID, Metric Name, Current Value, RAG
 */

import * as fs from "fs";
import * as path from "path";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function convertFlatCSV(inputPath: string) {
  const content = fs.readFileSync(inputPath, "utf-8");
  const lines = content.split(/\r?\n/);

  // Parse data
  interface Row {
    outcome: string;
    measureId: string;
    measureName: string;
    metric: string;
    owner: string;
  }

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.includes(",")) continue;

    const cols = parseCSVLine(line);
    if (cols.every((c) => !c)) continue;

    const outcome = cols[0] || "";
    const measureId = cols[1] || "";
    const measureName = cols[2] || "";
    const metric = cols[3] || "";
    const owner = cols[4] || "";

    if (!measureId || !measureName) continue;

    rows.push({ outcome, measureId, measureName, metric, owner });
  }

  // Fix duplicate measure IDs
  const measureIdCounts = new Map<string, number>();
  for (const row of rows) {
    const count = measureIdCounts.get(row.measureId) || 0;
    measureIdCounts.set(row.measureId, count + 1);
  }

  // Track which IDs are duplicates and need fixing
  const duplicates = Array.from(measureIdCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([id]) => id);

  console.log(`⚠️  Found duplicate Measure IDs: ${duplicates.join(", ")}`);

  // Auto-fix: 2.3 appears twice - second one should be 2.4 or 2.5
  const seenMeasures = new Map<string, { name: string; count: number }>();
  for (const row of rows) {
    if (row.measureId === "2.3") {
      const existing = seenMeasures.get("2.3");
      if (existing) {
        // This is the second 2.3
        if (row.measureName.toLowerCase().includes("long term")) {
          row.measureId = "2.5"; // Long-term relationships
          console.log(`   Fixed: "${row.measureName}" → 2.5`);
        } else {
          row.measureId = "2.4"; // Split of customers
          console.log(`   Fixed: "${row.measureName}" → 2.4`);
        }
      } else {
        seenMeasures.set("2.3", { name: row.measureName, count: 1 });
      }
    }
    // Fix 4.70 → 4.7
    if (row.measureId === "4.70") {
      row.measureId = "4.7";
      console.log(`   Fixed: 4.70 → 4.7`);
    }
  }

  // Group by measure
  const measureMap = new Map<string, Row[]>();
  for (const row of rows) {
    const key = `${row.measureId}|${row.measureName}`;
    const existing = measureMap.get(key) || [];
    existing.push(row);
    measureMap.set(key, existing);
  }

  // Normalize outcome names to match database
  function normalizeOutcome(outcome: string): string {
    const lower = outcome.toLowerCase().trim();
    if (lower.includes("product") && lower.includes("service")) return "Products & Services";
    if (lower.includes("price") && lower.includes("value")) return "Price & Value";
    if (lower.includes("customer") && lower.includes("understanding")) return "Customer Understanding";
    if (lower.includes("customer") && lower.includes("support")) return "Customer Support";
    if (lower.includes("governance") || lower.includes("culture")) return "Governance & Culture";
    return outcome;
  }

  // Build measures CSV
  const measuresRows: string[][] = [
    ["Measure ID", "Name", "Outcome", "Owner", "Summary", "RAG"],
  ];

  for (const [key, groupRows] of measureMap.entries()) {
    const first = groupRows[0];
    const metrics = groupRows.filter((r) => r.metric).map((r) => r.metric);
    const summary = metrics.length > 0 ? metrics.join("; ") : first.measureName;

    measuresRows.push([
      first.measureId,
      first.measureName,
      normalizeOutcome(first.outcome),
      first.owner,
      summary,
      "GOOD",
    ]);
  }

  // Build MI metrics CSV
  const miRows: string[][] = [
    ["Measure ID", "Metric Name", "Current Value", "RAG"],
  ];

  for (const [key, groupRows] of measureMap.entries()) {
    const first = groupRows[0];
    for (const row of groupRows) {
      if (row.metric) {
        miRows.push([first.measureId, row.metric, "", "GOOD"]);
      }
    }
  }

  // Write outputs
  const baseName = inputPath.replace(/\.csv$/, "");
  const measuresPath = `${baseName}-measures.csv`;
  const miPath = `${baseName}-mi.csv`;

  function escapeCSV(cell: string): string {
    if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }

  fs.writeFileSync(
    measuresPath,
    measuresRows.map((row) => row.map(escapeCSV).join(",")).join("\n"),
    "utf-8"
  );

  fs.writeFileSync(
    miPath,
    miRows.map((row) => row.map(escapeCSV).join(",")).join("\n"),
    "utf-8"
  );

  console.log(`\n✅ Converted ${measuresRows.length - 1} measures`);
  console.log(`✅ Extracted ${miRows.length - 1} MI metrics`);
  console.log(`\n📁 Measures: ${measuresPath}`);
  console.log(`📁 MI Metrics: ${miPath}`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: npx tsx scripts/convert-flat-csv.ts <input.csv>");
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
if (!fs.existsSync(inputPath)) {
  console.error(`❌ Input file not found: ${inputPath}`);
  process.exit(1);
}

convertFlatCSV(inputPath);
