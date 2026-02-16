#!/usr/bin/env npx tsx

/**
 * Convert hierarchical Consumer Duty CSV to flat format for import
 *
 * Input format:
 *   Column A: (empty or outcome category)
 *   Column B: Outcome name
 *   Column C: Measure ID (e.g. "1.1")
 *   Column D: Measure description
 *   Column E: MI metric name
 *   Column F: Business owner
 *
 * Output format:
 *   Measure ID, Name, Outcome, Owner, Summary, RAG
 */

import * as fs from "fs";
import * as path from "path";

interface ParsedRow {
  outcomeCategory?: string;
  outcomeName?: string;
  measureId?: string;
  measureName?: string;
  miMetric?: string;
  owner?: string;
}

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

function convertCSV(inputPath: string, outputPath: string) {
  const content = fs.readFileSync(inputPath, "utf-8");
  const lines = content.split(/\r?\n/);

  const outputRows: string[][] = [];
  outputRows.push(["Measure ID", "Name", "Outcome", "Owner", "Summary", "RAG"]);

  let currentOutcome = "";
  let currentMeasureId = "";
  let currentMeasureName = "";
  let currentOwner = "";
  const miMetrics: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);

    // Skip header rows and empty rows
    if (i <= 1) continue;
    if (cols.every((c) => !c)) continue;

    // Skip the "Assessment for Customer Harm" section at the bottom
    if (cols[1] === "Assesment for Customer Harm" || cols[1] === "Key") continue;

    const outcomeCategory = cols[0] || "";
    const outcomeName = cols[1] || "";
    const measureId = cols[2] || "";
    const measureName = cols[3] || "";
    const miMetric = cols[4] || "";
    const owner = cols[5] || "";

    // Detect outcome change (column B has value, column C is empty or starts with number)
    if (outcomeName && !measureId) {
      // This is an outcome header row, skip it
      continue;
    }

    // If we have an outcome name in column B but also have a measure ID, it's the first measure of a new outcome
    if (outcomeName && measureId && measureId.match(/^\d/)) {
      currentOutcome = outcomeName;
    }

    // New measure detected (has measure ID)
    if (measureId && measureId.match(/^\d/)) {
      // Save previous measure if exists
      if (currentMeasureId && currentMeasureName) {
        const summary = miMetrics.length > 0 ? miMetrics.join("; ") : currentMeasureName;
        outputRows.push([
          currentMeasureId,
          currentMeasureName,
          currentOutcome,
          currentOwner,
          summary,
          "GOOD", // Default RAG status
        ]);
      }

      // Start new measure
      currentMeasureId = measureId;
      currentMeasureName = measureName;
      currentOwner = owner || currentOwner; // Carry forward if blank
      miMetrics.length = 0;

      if (miMetric) {
        miMetrics.push(miMetric);
      }
    } else if (miMetric) {
      // Additional MI metric for current measure
      miMetrics.push(miMetric);
      if (owner) {
        currentOwner = owner;
      }
    }
  }

  // Save final measure
  if (currentMeasureId && currentMeasureName) {
    const summary = miMetrics.length > 0 ? miMetrics.join("; ") : currentMeasureName;
    outputRows.push([
      currentMeasureId,
      currentMeasureName,
      currentOutcome,
      currentOwner,
      summary,
      "GOOD",
    ]);
  }

  // Write output
  const outputContent = outputRows
    .map((row) =>
      row.map((cell) => {
        if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(",")
    )
    .join("\n");

  fs.writeFileSync(outputPath, outputContent, "utf-8");

  console.log(`✅ Converted ${outputRows.length - 1} measures`);
  console.log(`📁 Output: ${outputPath}`);
}

// Get input/output paths from args
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: npx tsx scripts/convert-csv.ts <input.csv> [output.csv]");
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = args[1]
  ? path.resolve(args[1])
  : inputPath.replace(/\.csv$/, "-converted.csv");

if (!fs.existsSync(inputPath)) {
  console.error(`❌ Input file not found: ${inputPath}`);
  process.exit(1);
}

convertCSV(inputPath, outputPath);
