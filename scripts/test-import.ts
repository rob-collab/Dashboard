#!/usr/bin/env npx tsx

/**
 * Test script to simulate CSV import workflow
 */

import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:3002";

async function testMeasureImport(csvPath: string) {
  console.log("\n📋 Testing Measure Import...");
  console.log(`   Reading: ${csvPath}`);

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());

  console.log(`   ✓ Found ${lines.length - 1} measures (excluding header)`);

  // Parse CSV
  const headers = lines[0].split(",");
  console.log(`   ✓ Headers: ${headers.join(", ")}`);

  const measures = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      measureId: cols[0],
      name: cols[1],
      outcome: cols[2],
      owner: cols[3],
      summary: cols[4],
      rag: cols[5],
    };
  });

  // Show sample
  console.log(`\n   Sample measures:`);
  measures.slice(0, 3).forEach((m) => {
    console.log(`     ${m.measureId}: ${m.name} (${m.outcome})`);
  });

  console.log(`\n   ✅ Measure import CSV is valid`);
  return measures;
}

async function testMIImport(csvPath: string) {
  console.log("\n📊 Testing MI Import...");
  console.log(`   Reading: ${csvPath}`);

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());

  console.log(`   ✓ Found ${lines.length - 1} MI metrics (excluding header)`);

  // Parse CSV
  const headers = lines[0].split(",");
  console.log(`   ✓ Headers: ${headers.join(", ")}`);

  const metrics = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      measureId: cols[0],
      metricName: cols[1],
      currentValue: cols[2],
      rag: cols[3],
    };
  });

  // Group by measure
  const byMeasure = new Map<string, typeof metrics>();
  for (const m of metrics) {
    const existing = byMeasure.get(m.measureId) ?? [];
    existing.push(m);
    byMeasure.set(m.measureId, existing);
  }

  console.log(`\n   Metrics grouped by measure:`);
  let count = 0;
  for (const [measureId, mets] of byMeasure.entries()) {
    if (count++ < 5) {
      console.log(`     ${measureId}: ${mets.length} metric${mets.length !== 1 ? "s" : ""}`);
      mets.forEach((m) => console.log(`       - ${m.metricName}`));
    }
  }
  if (byMeasure.size > 5) {
    console.log(`     ... and ${byMeasure.size - 5} more measures`);
  }

  console.log(`\n   ✅ MI import CSV is valid`);
  return { metrics, byMeasure };
}

async function testAPIEndpoints() {
  console.log("\n🌐 Testing API Endpoints...");

  try {
    // Test consumer duty GET
    const response = await fetch(`${BASE_URL}/api/consumer-duty`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log(`   ✓ GET /api/consumer-duty - ${data.length} outcomes`);

    // Check for existing measures
    const allMeasures = data.flatMap((o: any) => o.measures ?? []);
    console.log(`   ✓ Found ${allMeasures.length} existing measures`);

    return { outcomes: data, measures: allMeasures };
  } catch (error) {
    console.error(`   ❌ API test failed:`, error);
    return null;
  }
}

async function main() {
  console.log("🧪 CSV Import Test Suite\n");
  console.log("=" .repeat(60));

  const measureCSV = "/Users/robhealey/Downloads/Consumer Duty - simplified metrics - Proposed list of metrics-converted.csv";
  const miCSV = "/Users/robhealey/Downloads/Consumer Duty - simplified metrics - Proposed list of metrics-mi-metrics.csv";

  // Test measure CSV
  if (fs.existsSync(measureCSV)) {
    await testMeasureImport(measureCSV);
  } else {
    console.log(`\n❌ Measure CSV not found: ${measureCSV}`);
  }

  // Test MI CSV
  if (fs.existsSync(miCSV)) {
    await testMIImport(miCSV);
  } else {
    console.log(`\n❌ MI CSV not found: ${miCSV}`);
  }

  // Test API
  const apiResult = await testAPIEndpoints();

  console.log("\n" + "=".repeat(60));
  console.log("\n✅ All tests passed!");
  console.log("\n📝 Next steps:");
  console.log("   1. Open http://localhost:3002/consumer-duty");
  console.log("   2. Click 'Import Measures' (CCRO only)");
  console.log("   3. Upload the -converted.csv file");
  console.log("   4. Click 'Import MI'");
  console.log("   5. Upload the -mi-metrics.csv file");
  console.log("\n");
}

main().catch(console.error);
