import { describe, it, expect } from "vitest";
import {
  parseCSV,
  autoMapColumns,
  normaliseRAG,
  resolveOutcomeId,
  validateRow,
  autoMapActionColumns,
  validateActionRow,
  buildActionCSV,
  autoMapRiskColumns,
  validateRiskRow,
} from "@/lib/csv-utils";
import type { Action } from "@/lib/types";

// ── parseCSV ─────────────────────────────────────────────────────────────────

describe("parseCSV", () => {
  it("returns empty result for empty string", () => {
    expect(parseCSV("")).toEqual({ headers: [], rows: [] });
    expect(parseCSV("   ")).toEqual({ headers: [], rows: [] });
  });

  it("parses a simple comma-delimited CSV", () => {
    const input = "Name,Owner,Status\nAlpha,Alice,GOOD\nBeta,Bob,WARNING";
    const { headers, rows } = parseCSV(input);
    expect(headers).toEqual(["Name", "Owner", "Status"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Name: "Alpha", Owner: "Alice", Status: "GOOD" });
    expect(rows[1]).toEqual({ Name: "Beta", Owner: "Bob", Status: "WARNING" });
  });

  it("auto-detects tab delimiter (TSV)", () => {
    const input = "Name\tOwner\tStatus\nAlpha\tAlice\tGOOD";
    const { headers, rows } = parseCSV(input);
    expect(headers).toEqual(["Name", "Owner", "Status"]);
    expect(rows[0]).toEqual({ Name: "Alpha", Owner: "Alice", Status: "GOOD" });
  });

  it("prefers tabs when first line has equal tabs and commas", () => {
    // 2 tabs vs 1 comma — tabs win
    const input = "A\tB\tC\n1\t2\t3";
    const { headers } = parseCSV(input);
    expect(headers).toEqual(["A", "B", "C"]);
  });

  it("handles quoted fields containing commas", () => {
    const input = `Name,Description\nFoo,"Has, a comma"\nBar,Normal`;
    const { rows } = parseCSV(input);
    expect(rows[0].Description).toBe("Has, a comma");
    expect(rows[1].Description).toBe("Normal");
  });

  it("handles double-quote escaping inside quoted fields", () => {
    const input = `Name,Note\nFoo,"He said ""hello"""\nBar,Fine`;
    const { rows } = parseCSV(input);
    expect(rows[0].Note).toBe('He said "hello"');
  });

  it("handles CRLF line endings", () => {
    const input = "A,B\r\n1,2\r\n3,4";
    const { headers, rows } = parseCSV(input);
    expect(headers).toEqual(["A", "B"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ A: "1", B: "2" });
  });

  it("skips trailing empty rows", () => {
    const input = "A,B\n1,2\n\n";
    const { rows } = parseCSV(input);
    expect(rows).toHaveLength(1);
  });

  it("handles header-only CSV (no data rows)", () => {
    const input = "Name,Owner,Status";
    const { headers, rows } = parseCSV(input);
    expect(headers).toEqual(["Name", "Owner", "Status"]);
    expect(rows).toHaveLength(0);
  });

  it("pads missing trailing columns with empty string", () => {
    const input = "A,B,C\n1,2";
    const { rows } = parseCSV(input);
    expect(rows[0].C).toBe("");
  });

  it("trims whitespace from unquoted field values", () => {
    const input = "A,B\n  hello ,  world  ";
    const { rows } = parseCSV(input);
    expect(rows[0].A).toBe("hello");
    expect(rows[0].B).toBe("world");
  });
});

// ── autoMapColumns (Consumer Duty) ───────────────────────────────────────────

describe("autoMapColumns", () => {
  it("maps exact canonical headers", () => {
    const mapping = autoMapColumns(["Measure ID", "Name", "Outcome ID", "Owner", "Summary", "RAG Status"]);
    expect(mapping.measureId).toBe("Measure ID");
    expect(mapping.name).toBe("Name");
    expect(mapping.outcomeId).toBe("Outcome ID");
    expect(mapping.owner).toBe("Owner");
    expect(mapping.summary).toBe("Summary");
    expect(mapping.ragStatus).toBe("RAG Status");
  });

  it("maps common header variations (case-insensitive)", () => {
    const mapping = autoMapColumns(["ref", "title", "outcome", "responsible", "description", "rag"]);
    expect(mapping.measureId).toBe("ref");
    expect(mapping.name).toBe("title");
    expect(mapping.outcomeId).toBe("outcome");
    expect(mapping.owner).toBe("responsible");
    expect(mapping.summary).toBe("description");
    expect(mapping.ragStatus).toBe("rag");
  });

  it("first match wins — does not double-map fields", () => {
    // Both "Name" and "Title" match the name field; first should win
    const mapping = autoMapColumns(["Name", "Title"]);
    expect(mapping.name).toBe("Name");
  });

  it("returns partial mapping when not all headers present", () => {
    const mapping = autoMapColumns(["Name", "Owner"]);
    expect(mapping.name).toBe("Name");
    expect(mapping.owner).toBe("Owner");
    expect(mapping.ragStatus).toBeUndefined();
  });

  it("handles headers with special characters (normalised away)", () => {
    const mapping = autoMapColumns(["Measure-ID", "RAG_Status"]);
    // normalise removes non-alphanumeric: "measureid", "ragstatus"
    expect(mapping.measureId).toBe("Measure-ID");
    expect(mapping.ragStatus).toBe("RAG_Status");
  });
});

// ── normaliseRAG ─────────────────────────────────────────────────────────────

describe("normaliseRAG", () => {
  it("maps GOOD variants", () => {
    expect(normaliseRAG("good")).toBe("GOOD");
    expect(normaliseRAG("GOOD")).toBe("GOOD");
    expect(normaliseRAG("green")).toBe("GOOD");
    expect(normaliseRAG("GREEN")).toBe("GOOD");
    expect(normaliseRAG("g")).toBe("GOOD");
    expect(normaliseRAG("Good Customer Outcome")).toBe("GOOD");
  });

  it("maps WARNING variants", () => {
    expect(normaliseRAG("warning")).toBe("WARNING");
    expect(normaliseRAG("amber")).toBe("WARNING");
    expect(normaliseRAG("AMBER")).toBe("WARNING");
    expect(normaliseRAG("w")).toBe("WARNING");
    expect(normaliseRAG("a")).toBe("WARNING");
    expect(normaliseRAG("Possible Detriment")).toBe("WARNING");
  });

  it("maps HARM variants", () => {
    expect(normaliseRAG("harm")).toBe("HARM");
    expect(normaliseRAG("red")).toBe("HARM");
    expect(normaliseRAG("RED")).toBe("HARM");
    expect(normaliseRAG("h")).toBe("HARM");
    expect(normaliseRAG("r")).toBe("HARM");
    expect(normaliseRAG("Harm Identified")).toBe("HARM");
  });

  it("returns null for unknown values", () => {
    expect(normaliseRAG("unknown")).toBeNull();
    expect(normaliseRAG("")).toBeNull();
    expect(normaliseRAG("pending")).toBeNull();
    expect(normaliseRAG("1")).toBeNull();
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(normaliseRAG("  GREEN  ")).toBe("GOOD");
    expect(normaliseRAG("  Amber  ")).toBe("WARNING");
  });
});

// ── resolveOutcomeId ─────────────────────────────────────────────────────────

describe("resolveOutcomeId", () => {
  const outcomes = [
    { id: "outcome-1", outcomeId: "O1", name: "Products & Services" },
    { id: "outcome-2", outcomeId: "O2", name: "Price & Value" },
    { id: "outcome-3", outcomeId: "O3", name: "Consumer Understanding" },
  ];

  it("matches by exact internal ID", () => {
    expect(resolveOutcomeId("outcome-1", outcomes)).toBe("outcome-1");
  });

  it("matches by outcomeId code (case-insensitive)", () => {
    expect(resolveOutcomeId("O1", outcomes)).toBe("outcome-1");
    expect(resolveOutcomeId("o2", outcomes)).toBe("outcome-2");
  });

  it("matches by exact name (case-insensitive)", () => {
    expect(resolveOutcomeId("Products & Services", outcomes)).toBe("outcome-1");
    expect(resolveOutcomeId("price & value", outcomes)).toBe("outcome-2");
  });

  it("matches by partial name (startsWith, case-insensitive)", () => {
    expect(resolveOutcomeId("Products", outcomes)).toBe("outcome-1");
    expect(resolveOutcomeId("consumer", outcomes)).toBe("outcome-3");
  });

  it("returns null for empty string", () => {
    expect(resolveOutcomeId("", outcomes)).toBeNull();
  });

  it("returns null when no match found", () => {
    expect(resolveOutcomeId("Nonexistent Outcome", outcomes)).toBeNull();
  });

  it("exact match takes priority over partial match", () => {
    // "Price & Value" is exact; "Price" would partial-match the same record
    expect(resolveOutcomeId("Price & Value", outcomes)).toBe("outcome-2");
  });
});

// ── validateRow (Consumer Duty measure) ──────────────────────────────────────

describe("validateRow", () => {
  const mapping = {
    measureId: "ID",
    name: "Name",
    outcomeId: "Outcome",
    ragStatus: "RAG",
    owner: "Owner",
    summary: "Summary",
  };

  const validRow = {
    ID: "M001",
    Name: "Test measure",
    Outcome: "O1",
    RAG: "green",
    Owner: "Alice",
    Summary: "Some summary",
  };

  it("returns mapped data for a valid row", () => {
    const result = validateRow(validRow, 1, mapping, ["O1"], [
      { id: "outcome-1", outcomeId: "O1", name: "Products" },
    ]);
    expect(result.errors).toHaveLength(0);
    expect(result.mapped).not.toBeNull();
    expect(result.mapped?.measureId).toBe("M001");
    expect(result.mapped?.ragStatus).toBe("GOOD");
  });

  it("errors on missing measureId", () => {
    const result = validateRow({ ...validRow, ID: "" }, 1, mapping, ["O1"]);
    expect(result.errors).toContain("Missing Measure ID");
    expect(result.mapped).toBeNull();
  });

  it("errors on missing name", () => {
    const result = validateRow({ ...validRow, Name: "" }, 1, mapping, ["O1"]);
    expect(result.errors).toContain("Missing Name");
    expect(result.mapped).toBeNull();
  });

  it("errors on invalid RAG status", () => {
    const result = validateRow({ ...validRow, RAG: "banana" }, 1, mapping, ["O1"]);
    expect(result.errors.some((e) => e.includes("Invalid RAG"))).toBe(true);
    expect(result.mapped).toBeNull();
  });

  it("defaults RAG to GOOD when column is absent/empty", () => {
    const result = validateRow({ ...validRow, RAG: "" }, 1, mapping, ["O1"], [
      { id: "outcome-1", outcomeId: "O1", name: "Products" },
    ]);
    expect(result.errors).toHaveLength(0);
    expect(result.mapped?.ragStatus).toBe("GOOD");
  });

  it("errors when outcome cannot be resolved", () => {
    const result = validateRow({ ...validRow, Outcome: "BADOUTCOME" }, 1, mapping, [], [
      { id: "outcome-1", outcomeId: "O1", name: "Products" },
    ]);
    expect(result.errors.some((e) => e.includes("Could not match outcome"))).toBe(true);
  });

  it("preserves rowIndex in the result", () => {
    const result = validateRow(validRow, 5, mapping, ["O1"]);
    expect(result.rowIndex).toBe(5);
  });
});

// ── autoMapActionColumns ──────────────────────────────────────────────────────

describe("autoMapActionColumns", () => {
  it("maps standard action headers", () => {
    const mapping = autoMapActionColumns(["Action ID", "Reference", "Title", "Description", "Status", "Priority", "Source", "Assigned To", "Due Date"]);
    expect(mapping.actionId).toBe("Action ID");
    expect(mapping.reference).toBe("Reference");
    expect(mapping.title).toBe("Title");
    expect(mapping.description).toBe("Description");
    expect(mapping.status).toBe("Status");
    expect(mapping.priority).toBe("Priority");
    expect(mapping.source).toBe("Source");
    expect(mapping.assignedTo).toBe("Assigned To");
    expect(mapping.dueDate).toBe("Due Date");
  });

  it("maps common variations", () => {
    const mapping = autoMapActionColumns(["id", "ref", "name", "desc", "state", "owner", "deadline"]);
    expect(mapping.actionId).toBe("id");
    expect(mapping.reference).toBe("ref");
    expect(mapping.title).toBe("name");
    expect(mapping.description).toBe("desc");
    expect(mapping.status).toBe("state");
    expect(mapping.assignedTo).toBe("owner");
    expect(mapping.dueDate).toBe("deadline");
  });
});

// ── validateActionRow ─────────────────────────────────────────────────────────

describe("validateActionRow", () => {
  const mapping = {
    actionId: "Action ID",
    title: "Title",
    description: "Description",
    status: "Status",
    priority: "Priority",
    source: "Source",
    assignedTo: "Assigned To",
    dueDate: "Due Date",
    reference: "Reference",
  };

  const createRow = {
    "Action ID": "",
    "Title": "Fix data issue",
    "Description": "Details here",
    "Status": "OPEN",
    "Priority": "P1",
    "Source": "Audit",
    "Assigned To": "Alice",
    "Due Date": "2025-06-30",
    "Reference": "",
  };

  const updateRow = {
    ...createRow,
    "Action ID": "action-123",
  };

  it("CREATE mode: valid row maps correctly", () => {
    const result = validateActionRow(createRow, 1, mapping);
    expect(result.errors).toHaveLength(0);
    expect(result.isCreate).toBe(true);
    expect(result.mapped?.title).toBe("Fix data issue");
    expect(result.mapped?.status).toBe("OPEN");
  });

  it("CREATE mode: errors on missing title", () => {
    const result = validateActionRow({ ...createRow, Title: "" }, 1, mapping);
    expect(result.errors.some((e) => e.includes("Missing Title"))).toBe(true);
    expect(result.mapped).toBeNull();
  });

  it("CREATE mode: errors on missing assignedTo", () => {
    const result = validateActionRow({ ...createRow, "Assigned To": "" }, 1, mapping);
    expect(result.errors.some((e) => e.includes("Missing Assigned To"))).toBe(true);
  });

  it("UPDATE mode: does not require title or assignedTo", () => {
    const result = validateActionRow({ ...updateRow, Title: "", "Assigned To": "" }, 1, mapping);
    expect(result.isCreate).toBe(false);
    expect(result.errors).toHaveLength(0);
    expect(result.mapped).not.toBeNull();
  });

  it("normalises status to uppercase with underscores", () => {
    const result = validateActionRow({ ...updateRow, Status: "in progress" }, 1, mapping);
    expect(result.errors).toHaveLength(0);
    expect(result.mapped?.status).toBe("IN_PROGRESS");
  });

  it("errors on invalid status", () => {
    const result = validateActionRow({ ...updateRow, Status: "PENDING" }, 1, mapping);
    expect(result.errors.some((e) => e.includes("Invalid status"))).toBe(true);
  });

  it("errors on invalid priority", () => {
    const result = validateActionRow({ ...updateRow, Priority: "HIGH" }, 1, mapping);
    expect(result.errors.some((e) => e.includes("Invalid priority"))).toBe(true);
  });

  it("accepts all valid priorities", () => {
    for (const p of ["P1", "P2", "P3", "p1", "p2", "p3"]) {
      const result = validateActionRow({ ...updateRow, Priority: p }, 1, mapping);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("errors on unparseable date", () => {
    const result = validateActionRow({ ...updateRow, "Due Date": "not-a-date" }, 1, mapping);
    expect(result.errors.some((e) => e.includes("Invalid date"))).toBe(true);
  });

  it("accepts valid ISO date", () => {
    const result = validateActionRow({ ...updateRow, "Due Date": "2025-12-31" }, 1, mapping);
    expect(result.errors).toHaveLength(0);
  });

  it("omits optional fields from mapped when empty", () => {
    const row = { "Action ID": "action-123", Title: "", Description: "", Status: "", Priority: "", Source: "", "Assigned To": "", "Due Date": "", Reference: "" };
    const result = validateActionRow(row, 1, mapping);
    expect(result.errors).toHaveLength(0);
    expect(result.mapped?.title).toBeUndefined();
    expect(result.mapped?.status).toBeUndefined();
  });
});

// ── buildActionCSV ────────────────────────────────────────────────────────────

describe("buildActionCSV", () => {
  const users = [
    { id: "user-1", name: "Alice Smith" },
    { id: "user-2", name: "Bob Jones" },
  ];

  const actions: Partial<Action>[] = [
    {
      id: "action-1",
      reference: "ACT-001",
      title: "Fix report",
      description: "Needs fixing",
      reportPeriod: "Q1 2025",
      source: "Audit",
      sectionTitle: "Data quality",
      assignedTo: "user-1",
      dueDate: "2025-06-30",
      status: "OPEN",
      createdAt: "2025-01-15",
      completedAt: null,
    },
    {
      id: "action-2",
      reference: "ACT-002",
      title: 'Title with "quotes"',
      description: "Has, a comma",
      reportPeriod: null,
      source: null,
      sectionTitle: null,
      assignedTo: "user-2",
      dueDate: null,
      status: "COMPLETED",
      createdAt: "2025-02-01",
      completedAt: "2025-03-01",
    },
  ];

  it("produces a CSV string with correct headers", () => {
    const csv = buildActionCSV(actions as Action[], users);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Reference");
    expect(lines[0]).toContain("Action ID");
    expect(lines[0]).toContain("Title");
    expect(lines[0]).toContain("Status");
    expect(lines[0]).toContain("Owner");
  });

  it("resolves user ID to name", () => {
    const csv = buildActionCSV(actions as Action[], users);
    expect(csv).toContain("Alice Smith");
    expect(csv).toContain("Bob Jones");
  });

  it("quotes fields containing commas", () => {
    const csv = buildActionCSV(actions as Action[], users);
    expect(csv).toContain('"Has, a comma"');
  });

  it('quotes fields containing double-quotes and escapes them', () => {
    const csv = buildActionCSV(actions as Action[], users);
    expect(csv).toContain('"Title with ""quotes"""');
  });

  it("produces one data row per action plus one header row", () => {
    const csv = buildActionCSV(actions as Action[], users);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // 1 header + 2 data rows
  });

  it("returns only header for empty action list", () => {
    const csv = buildActionCSV([], users);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Reference");
  });

  it("falls back to user ID when user not found in map", () => {
    const csv = buildActionCSV(actions as Action[], []);
    expect(csv).toContain("user-1");
    expect(csv).toContain("user-2");
  });
});

// ── autoMapRiskColumns ────────────────────────────────────────────────────────

describe("autoMapRiskColumns", () => {
  it("maps standard risk headers", () => {
    const mapping = autoMapRiskColumns([
      "Name", "Description", "Category L1", "Category L2", "Owner",
      "Inherent Likelihood", "Inherent Impact",
      "Residual Likelihood", "Residual Impact",
      "Control Effectiveness", "Risk Appetite", "Direction of Travel", "Controls",
    ]);
    expect(mapping.name).toBe("Name");
    expect(mapping.description).toBe("Description");
    expect(mapping.categoryL1).toBe("Category L1");
    expect(mapping.categoryL2).toBe("Category L2");
    expect(mapping.owner).toBe("Owner");
    expect(mapping.inherentLikelihood).toBe("Inherent Likelihood");
    expect(mapping.inherentImpact).toBe("Inherent Impact");
    expect(mapping.residualLikelihood).toBe("Residual Likelihood");
    expect(mapping.residualImpact).toBe("Residual Impact");
    expect(mapping.controlEffectiveness).toBe("Control Effectiveness");
    expect(mapping.riskAppetite).toBe("Risk Appetite");
    expect(mapping.directionOfTravel).toBe("Direction of Travel");
    expect(mapping.controls).toBe("Controls");
  });

  it("detects short-form month headers", () => {
    const mapping = autoMapRiskColumns(["Name", "Jan 25", "Feb 25", "Mar 25"]);
    expect(mapping.monthColumns).toHaveLength(3);
    expect(mapping.monthColumns?.[0].header).toBe("Jan 25");
  });

  it("detects full-form month headers", () => {
    const mapping = autoMapRiskColumns(["Name", "January 2025", "February 2025"]);
    expect(mapping.monthColumns).toHaveLength(2);
  });

  it("detects ISO month headers (YYYY-MM)", () => {
    const mapping = autoMapRiskColumns(["Name", "2025-01", "2025-02", "2025-03"]);
    expect(mapping.monthColumns).toHaveLength(3);
    expect(mapping.monthColumns?.[0].date.getUTCFullYear()).toBe(2025);
    expect(mapping.monthColumns?.[0].date.getUTCMonth()).toBe(0); // January
  });

  it("sorts month columns chronologically", () => {
    const mapping = autoMapRiskColumns(["Mar 25", "Jan 25", "Feb 25"]);
    const dates = mapping.monthColumns?.map((m) => m.header);
    expect(dates).toEqual(["Jan 25", "Feb 25", "Mar 25"]);
  });

  it("does not include known field headers as month columns", () => {
    const mapping = autoMapRiskColumns(["Name", "Jan 25"]);
    expect(mapping.name).toBe("Name");
    expect(mapping.monthColumns).toHaveLength(1);
    expect(mapping.monthColumns?.[0].header).toBe("Jan 25");
  });

  it("returns empty monthColumns when none detected", () => {
    const mapping = autoMapRiskColumns(["Name", "Description"]);
    expect(mapping.monthColumns).toEqual([]);
  });
});

// ── validateRiskRow ───────────────────────────────────────────────────────────

describe("validateRiskRow", () => {
  const mapping = {
    name: "Name",
    description: "Description",
    categoryL1: "Category L1",
    categoryL2: "Category L2",
    owner: "Owner",
    inherentLikelihood: "IL",
    inherentImpact: "II",
    residualLikelihood: "RL",
    residualImpact: "RI",
    controlEffectiveness: "Effectiveness",
    riskAppetite: "Appetite",
    directionOfTravel: "Direction",
    controls: "Controls",
    monthColumns: [],
  };

  const validRow = {
    Name: "Data breach risk",
    Description: "Risk of data breach",
    "Category L1": "Operational Risk",
    "Category L2": "Processes",
    Owner: "Alice",
    IL: "4",
    II: "5",
    RL: "2",
    RI: "3",
    Effectiveness: "EFFECTIVE",
    Appetite: "LOW",
    Direction: "IMPROVING",
    Controls: "CTRL-001|CTRL-002",
  };

  it("returns mapped data for a valid row", () => {
    const result = validateRiskRow(validRow, 1, mapping);
    expect(result.errors).toHaveLength(0);
    expect(result.mapped).not.toBeNull();
    expect(result.mapped?.name).toBe("Data breach risk");
    expect(result.mapped?.inherentLikelihood).toBe(4);
    expect(result.mapped?.inherentImpact).toBe(5);
    expect(result.mapped?.residualLikelihood).toBe(2);
    expect(result.mapped?.residualImpact).toBe(3);
    expect(result.mapped?.controlEffectiveness).toBe("EFFECTIVE");
    expect(result.mapped?.riskAppetite).toBe("LOW");
    expect(result.mapped?.directionOfTravel).toBe("IMPROVING");
  });

  it("parses pipe-separated controls into an array", () => {
    const result = validateRiskRow(validRow, 1, mapping);
    expect(result.mapped?.controls).toEqual(["CTRL-001", "CTRL-002"]);
  });

  it("errors on missing required text fields", () => {
    const row = { ...validRow, Name: "", Description: "", "Category L1": "", "Category L2": "", Owner: "" };
    const result = validateRiskRow(row, 1, mapping);
    expect(result.errors).toContain("Missing Name");
    expect(result.errors).toContain("Missing Description");
    expect(result.errors).toContain("Missing Category L1");
    expect(result.errors).toContain("Missing Category L2");
    expect(result.errors).toContain("Missing Owner");
  });

  it("errors on missing score fields", () => {
    const row = { ...validRow, IL: "", II: "", RL: "", RI: "" };
    const result = validateRiskRow(row, 1, mapping);
    expect(result.errors.some((e) => e.includes("Missing Inherent Likelihood"))).toBe(true);
    expect(result.errors.some((e) => e.includes("Missing Inherent Impact"))).toBe(true);
  });

  it("errors on scores outside 1-5 range", () => {
    const result = validateRiskRow({ ...validRow, IL: "6" }, 1, mapping);
    expect(result.errors.some((e) => e.includes("must be 1-5"))).toBe(true);
  });

  it("errors on non-numeric scores", () => {
    const result = validateRiskRow({ ...validRow, IL: "high" }, 1, mapping);
    expect(result.errors.some((e) => e.includes("must be 1-5"))).toBe(true);
  });

  it("accepts all valid control effectiveness values", () => {
    for (const val of ["EFFECTIVE", "PARTIALLY_EFFECTIVE", "INEFFECTIVE"]) {
      const result = validateRiskRow({ ...validRow, Effectiveness: val }, 1, mapping);
      expect(result.errors).toHaveLength(0);
      expect(result.mapped?.controlEffectiveness).toBe(val);
    }
  });

  it("errors on invalid control effectiveness", () => {
    const result = validateRiskRow({ ...validRow, Effectiveness: "UNKNOWN" }, 1, mapping);
    expect(result.errors.some((e) => e.includes("Invalid control effectiveness"))).toBe(true);
  });

  it("normalises control effectiveness with spaces", () => {
    const result = validateRiskRow({ ...validRow, Effectiveness: "Partially Effective" }, 1, mapping);
    expect(result.errors).toHaveLength(0);
    expect(result.mapped?.controlEffectiveness).toBe("PARTIALLY_EFFECTIVE");
  });

  it("accepts all valid risk appetite values", () => {
    for (const val of ["VERY_LOW", "LOW", "LOW_TO_MODERATE", "MODERATE"]) {
      const result = validateRiskRow({ ...validRow, Appetite: val }, 1, mapping);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("errors on invalid risk appetite", () => {
    const result = validateRiskRow({ ...validRow, Appetite: "HIGH" }, 1, mapping);
    expect(result.errors.some((e) => e.includes("Invalid risk appetite"))).toBe(true);
  });

  it("accepts all valid directions of travel", () => {
    for (const val of ["IMPROVING", "STABLE", "DETERIORATING"]) {
      const result = validateRiskRow({ ...validRow, Direction: val }, 1, mapping);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("errors on invalid direction of travel", () => {
    const result = validateRiskRow({ ...validRow, Direction: "UNKNOWN" }, 1, mapping);
    expect(result.errors.some((e) => e.includes("Invalid direction of travel"))).toBe(true);
  });

  it("parses month history columns", () => {
    const mappingWithMonths = {
      ...mapping,
      monthColumns: [
        { header: "Jan 25", date: new Date(Date.UTC(2025, 0, 1)) },
        { header: "Feb 25", date: new Date(Date.UTC(2025, 1, 1)) },
      ],
    };
    const rowWithHistory = { ...validRow, "Jan 25": "Green", "Feb 25": "Amber" };
    const result = validateRiskRow(rowWithHistory, 1, mappingWithMonths);
    expect(result.errors).toHaveLength(0);
    expect(result.mapped?.monthHistory).toHaveLength(2);
    expect(result.mapped?.monthHistory?.[0].colour).toBe("GREEN");
    expect(result.mapped?.monthHistory?.[1].colour).toBe("AMBER");
  });

  it("errors on invalid RAG colour in month column", () => {
    const mappingWithMonths = {
      ...mapping,
      monthColumns: [{ header: "Jan 25", date: new Date(Date.UTC(2025, 0, 1)) }],
    };
    const rowBadHistory = { ...validRow, "Jan 25": "purple" };
    const result = validateRiskRow(rowBadHistory, 1, mappingWithMonths);
    expect(result.errors.some((e) => e.includes("Invalid RAG colour"))).toBe(true);
  });

  it("skips empty month cells", () => {
    const mappingWithMonths = {
      ...mapping,
      monthColumns: [{ header: "Jan 25", date: new Date(Date.UTC(2025, 0, 1)) }],
    };
    const rowEmptyHistory = { ...validRow, "Jan 25": "" };
    const result = validateRiskRow(rowEmptyHistory, 1, mappingWithMonths);
    expect(result.errors).toHaveLength(0);
    expect(result.mapped?.monthHistory).toBeUndefined();
  });
});
