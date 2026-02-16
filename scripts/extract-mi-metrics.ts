#!/usr/bin/env npx tsx

/**
 * Extract MI metrics from hierarchical Consumer Duty CSV
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
 *   Measure ID, Metric Name, Current Value, RAG
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

function extractMIMetrics(inputPath: string, outputPath: string) {
  const content = fs.readFileSync(inputPath, "utf-8");
  const lines = content.split(/\r?\n/);

  const outputRows: string[][] = [];
  outputRows.push(["Measure ID", "Metric Name", "Current Value", "RAG"]);

  let currentMeasureId = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);

    // Skip header rows and empty rows
    if (i <= 1) continue;
    if (cols.every((c) => !c)) continue;

    // Skip the "Assessment for Customer Harm" section at the bottom
    if (cols[1] === "Assesment for Customer Harm" || cols[1] === "Key") continue;

    const measureId = cols[2] || "";
    const miMetric = cols[4] || "";

    // Update current measure ID if we have one
    if (measureId && measureId.match(/^\d/)) {
      currentMeasureId = measureId;
    }

    // Add MI metric row if we have both measure ID and metric name
    if (currentMeasureId && miMetric) {
      outputRows.push([
        currentMeasureId,
        miMetric,
        "", // Current value (empty, user will fill in)
        "GOOD", // Default RAG status
      ]);
    }
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

  console.log(`✅ Extracted ${outputRows.length - 1} MI metrics`);
  console.log(`📁 Output: ${outputPath}`);
}

// Get input/output paths from args
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: npx tsx scripts/extract-mi-metrics.ts <input.csv> [output.csv]");
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = args[1]
  ? path.resolve(args[1])
  : inputPath.replace(/\.csv$/, "-mi-metrics.csv");

if (!fs.existsSync(inputPath)) {
  console.error(`❌ Input file not found: ${inputPath}`);
  process.exit(1);
}

extractMIMetrics(inputPath, outputPath);
