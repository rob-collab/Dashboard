#!/usr/bin/env npx tsx

/**
 * Test bulk import by calling the API directly
 */

import * as fs from "fs";

const BASE_URL = "http://localhost:3003";

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

async function testBulkReplace() {
  console.log("🧪 Testing Bulk Replace Import\n");

  // Read measures CSV
  const measuresPath = "/Users/robhealey/Downloads/Consumer Duty - simplified metrics - Copy of Proposed list of metrics (2)-measures.csv";
  const measuresText = fs.readFileSync(measuresPath, "utf-8");
  const { rows: measureRows } = parseCSV(measuresText);

  console.log(`📋 Loaded ${measureRows.length} measures from CSV`);

  // Get current outcomes to map IDs
  console.log("\n🔍 Fetching current outcomes...");
  const outcomesRes = await fetch(`${BASE_URL}/api/consumer-duty`);
  const outcomes = await outcomesRes.json();

  console.log(`   Found ${outcomes.length} outcomes:`);
  outcomes.forEach((o: any) => {
    console.log(`   - ${o.name} (${o.id}): ${o.measures?.length || 0} measures`);
  });

  // Build outcome name → ID map
  const outcomeMap = new Map<string, string>();
  for (const o of outcomes) {
    outcomeMap.set(o.name.toLowerCase(), o.id);
  }

  // Transform CSV rows to API format
  const items: any[] = [];
  const affectedOutcomeIds = new Set<string>();

  for (const row of measureRows) {
    const outcomeName = row["Outcome"].toLowerCase();
    const outcomeId = outcomeMap.get(outcomeName);

    if (!outcomeId) {
      console.log(`   ⚠️  Could not find outcome ID for: ${row["Outcome"]}`);
      continue;
    }

    affectedOutcomeIds.add(outcomeId);

    items.push({
      id: `measure-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      outcomeId,
      measureId: row["Measure ID"],
      name: row["Name"],
      owner: row["Owner"] || null,
      summary: row["Summary"] || "",
      ragStatus: row["RAG"] || "GOOD",
      position: 0,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  console.log(`\n✅ Prepared ${items.length} measures for import`);
  console.log(`   Affecting ${affectedOutcomeIds.size} outcomes`);

  // Call bulk-replace API
  console.log("\n📤 Calling bulk-replace API...");
  const response = await fetch(`${BASE_URL}/api/consumer-duty/measures/bulk-replace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      outcomeIds: Array.from(affectedOutcomeIds),
      measures: items,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ API failed: ${response.status} ${response.statusText}`);
    console.error(error);
    return false;
  }

  const result = await response.json();
  console.log(`✅ API succeeded - ${result.length} measures created`);

  // Verify by fetching again
  console.log("\n🔍 Verifying database state...");
  const verifyRes = await fetch(`${BASE_URL}/api/consumer-duty`);
  const verifiedOutcomes = await verifyRes.json();

  console.log(`\n📊 Final state:`);
  verifiedOutcomes.forEach((o: any) => {
    console.log(`   - ${o.name}: ${o.measures?.length || 0} measures`);
    if (o.measures?.length > 0) {
      o.measures.slice(0, 3).forEach((m: any) => {
        console.log(`     • ${m.measureId}: ${m.name}`);
      });
      if (o.measures.length > 3) {
        console.log(`     ... and ${o.measures.length - 3} more`);
      }
    }
  });

  return true;
}

testBulkReplace()
  .then((success) => {
    if (success) {
      console.log("\n✅ Bulk replace test completed successfully!");
      console.log("\n📝 Next: Refresh the dashboard to see the new measures");
    }
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
