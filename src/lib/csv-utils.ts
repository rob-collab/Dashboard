import type { RAGStatus, Action } from "./types";

export interface ParsedRow {
  [key: string]: string;
}

export interface ColumnMapping {
  measureId: string;
  name: string;
  outcomeId: string;
  owner: string;
  summary: string;
  ragStatus: string;
}

export interface RowValidation {
  row: ParsedRow;
  rowIndex: number;
  errors: string[];
  mapped: {
    measureId: string;
    name: string;
    outcomeId: string;
    owner: string;
    summary: string;
    ragStatus: RAGStatus;
  } | null;
}

/**
 * Auto-detect delimiter (tab for Google Sheets paste, comma for CSV files).
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] ?? "";
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount >= commaCount ? "\t" : ",";
}

/**
 * Parse CSV/TSV text into rows of key-value pairs.
 * Handles quoted fields.
 */
export function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const delimiter = detectDelimiter(text);
  const trimmed = text.trim();
  if (!trimmed) return { headers: [], rows: [] };

  // Parse the entire text character-by-character to handle multi-line quoted fields
  const allRows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (inQuotes) {
      if (char === '"' && trimmed[i + 1] === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        // skip CR
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        currentField = "";
        allRows.push(currentRow);
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }
  // Push remaining field and row
  currentRow.push(currentField.trim());
  if (currentRow.length > 1 || currentRow[0] !== "") {
    allRows.push(currentRow);
  }

  if (allRows.length === 0) return { headers: [], rows: [] };

  const headers = allRows[0];
  const rows: ParsedRow[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const values = allRows[i];
    // Skip empty rows
    if (values.length === 1 && values[0] === "") continue;
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Map common header variations to canonical field names.
 */
export function autoMapColumns(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const patterns: { field: keyof ColumnMapping; matches: string[] }[] = [
    { field: "measureId", matches: ["measureid", "id", "measure_id", "measurenumber", "ref"] },
    { field: "name", matches: ["name", "measurename", "measure_name", "title"] },
    { field: "outcomeId", matches: ["outcomeid", "outcome_id", "outcome", "outcomename"] },
    { field: "owner", matches: ["owner", "assignedto", "assigned_to", "responsible"] },
    { field: "summary", matches: ["summary", "description", "desc", "detail", "details"] },
    { field: "ragStatus", matches: ["ragstatus", "rag_status", "rag", "status", "rating"] },
  ];

  for (const header of headers) {
    const norm = normalise(header);
    for (const pattern of patterns) {
      if (pattern.matches.includes(norm) && !mapping[pattern.field]) {
        mapping[pattern.field] = header;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Normalise RAG status from various input formats.
 */
export function normaliseRAG(input: string): RAGStatus | null {
  const lower = input.toLowerCase().trim();
  if (["good", "green", "g", "good customer outcome"].includes(lower)) return "GOOD";
  if (["warning", "amber", "w", "a", "possible detriment"].includes(lower)) return "WARNING";
  if (["harm", "red", "h", "r", "harm identified"].includes(lower)) return "HARM";
  return null;
}

/**
 * Resolve an outcome from a raw CSV value. Matches by:
 * - internal ID (e.g. "outcome-1")
 * - outcomeId code (e.g. "o1")
 * - name (e.g. "Products & Services")
 * - partial name (case-insensitive startsWith)
 */
export function resolveOutcomeId(
  rawValue: string,
  outcomes: { id: string; outcomeId: string; name: string }[]
): string | null {
  if (!rawValue) return null;
  const lower = rawValue.toLowerCase().trim();

  // Exact match on internal ID
  const byId = outcomes.find((o) => o.id.toLowerCase() === lower);
  if (byId) return byId.id;

  // Match on outcomeId code
  const byCode = outcomes.find((o) => o.outcomeId.toLowerCase() === lower);
  if (byCode) return byCode.id;

  // Exact match on name
  const byName = outcomes.find((o) => o.name.toLowerCase() === lower);
  if (byName) return byName.id;

  // Partial match on name
  const byPartial = outcomes.find((o) => o.name.toLowerCase().startsWith(lower));
  if (byPartial) return byPartial.id;

  return null;
}

/**
 * Validate a single parsed row and return mapped data or errors.
 */
export function validateRow(
  row: ParsedRow,
  rowIndex: number,
  columnMapping: Partial<ColumnMapping>,
  validOutcomeIds: string[],
  outcomes?: { id: string; outcomeId: string; name: string }[]
): RowValidation {
  const errors: string[] = [];

  const measureId = row[columnMapping.measureId ?? ""] ?? "";
  const name = row[columnMapping.name ?? ""] ?? "";
  const outcomeIdRaw = row[columnMapping.outcomeId ?? ""] ?? "";
  const owner = row[columnMapping.owner ?? ""] ?? "";
  const summary = row[columnMapping.summary ?? ""] ?? "";
  const ragRaw = row[columnMapping.ragStatus ?? ""] ?? "";

  if (!measureId) errors.push("Missing Measure ID");
  if (!name) errors.push("Missing Name");

  // Try to match outcome
  let matchedOutcomeId = "";
  if (outcomeIdRaw) {
    if (outcomes) {
      const resolved = resolveOutcomeId(outcomeIdRaw, outcomes);
      if (resolved) {
        matchedOutcomeId = resolved;
      } else {
        const validNames = outcomes.map((o) => `${o.name} (${o.outcomeId})`).join(", ");
        errors.push(`Could not match outcome '${outcomeIdRaw}'. Valid: ${validNames}`);
      }
    } else {
      const match = validOutcomeIds.find(
        (id) => id.toLowerCase() === outcomeIdRaw.toLowerCase()
      );
      matchedOutcomeId = match ?? outcomeIdRaw;
    }
  }

  const ragStatus = ragRaw ? normaliseRAG(ragRaw) : "GOOD";
  if (ragRaw && !ragStatus) errors.push(`Invalid RAG status: ${ragRaw}`);

  if (errors.length > 0) {
    return { row, rowIndex, errors, mapped: null };
  }

  return {
    row,
    rowIndex,
    errors: [],
    mapped: {
      measureId,
      name,
      outcomeId: matchedOutcomeId,
      owner,
      summary,
      ragStatus: ragStatus ?? "GOOD",
    },
  };
}

// ──────────────────────────────────────────────────────────
// Action CSV utilities
// ──────────────────────────────────────────────────────────

export interface ActionColumnMapping {
  actionId: string;
  reference: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  source: string;
  assignedTo: string;
  dueDate: string;
}

export interface ActionRowValidation {
  row: ParsedRow;
  rowIndex: number;
  errors: string[];
  isCreate: boolean;
  mapped: {
    actionId: string;
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    source?: string;
    assignedTo?: string;
    dueDate?: string;
  } | null;
}

/**
 * Map common header variations to action field names.
 */
export function autoMapActionColumns(headers: string[]): Partial<ActionColumnMapping> {
  const mapping: Partial<ActionColumnMapping> = {};
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const patterns: { field: keyof ActionColumnMapping; matches: string[] }[] = [
    { field: "actionId", matches: ["actionid", "action_id", "id"] },
    { field: "reference", matches: ["reference", "ref", "actionref", "action_ref"] },
    { field: "title", matches: ["title", "name", "actiontitle", "action_title"] },
    { field: "description", matches: ["description", "desc", "detail", "details"] },
    { field: "status", matches: ["status", "actionstatus", "action_status", "state"] },
    { field: "priority", matches: ["priority", "prio", "p"] },
    { field: "source", matches: ["source", "origin"] },
    { field: "assignedTo", matches: ["assignedto", "assigned_to", "owner", "assignee", "responsible"] },
    { field: "dueDate", matches: ["duedate", "due_date", "due", "deadline"] },
  ];

  for (const header of headers) {
    const norm = normalise(header);
    for (const pattern of patterns) {
      if (pattern.matches.includes(norm) && !mapping[pattern.field]) {
        mapping[pattern.field] = header;
        break;
      }
    }
  }

  return mapping;
}

const VALID_ACTION_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE", "PROPOSED_CLOSED"];
const VALID_ACTION_PRIORITIES = ["P1", "P2", "P3"];

/**
 * Validate a single parsed row for action import.
 * Supports both UPDATE (has actionId) and CREATE (no actionId, has title + assignedTo) modes.
 */
export function validateActionRow(
  row: ParsedRow,
  rowIndex: number,
  columnMapping: Partial<ActionColumnMapping>
): ActionRowValidation {
  const errors: string[] = [];

  const actionId = row[columnMapping.actionId ?? ""] ?? "";
  const title = row[columnMapping.title ?? ""] ?? "";
  const description = row[columnMapping.description ?? ""] ?? "";
  const statusRaw = row[columnMapping.status ?? ""] ?? "";
  const priorityRaw = row[columnMapping.priority ?? ""] ?? "";
  const source = row[columnMapping.source ?? ""] ?? "";
  const assignedTo = row[columnMapping.assignedTo ?? ""] ?? "";
  const dueDate = row[columnMapping.dueDate ?? ""] ?? "";

  const isCreate = !actionId;

  // For CREATE rows, require title and assignedTo
  if (isCreate) {
    if (!title) errors.push("Missing Title (required for new actions)");
    if (!assignedTo) errors.push("Missing Assigned To (required for new actions)");
  }

  if (statusRaw) {
    const upper = statusRaw.toUpperCase().replace(/ /g, "_");
    if (!VALID_ACTION_STATUSES.includes(upper)) {
      errors.push(`Invalid status: ${statusRaw}`);
    }
  }

  if (priorityRaw) {
    const upper = priorityRaw.toUpperCase();
    if (!VALID_ACTION_PRIORITIES.includes(upper)) {
      errors.push(`Invalid priority: ${priorityRaw}`);
    }
  }

  if (dueDate) {
    const parsed = new Date(dueDate);
    if (isNaN(parsed.getTime())) {
      errors.push(`Invalid date: ${dueDate}`);
    }
  }

  if (errors.length > 0) {
    return { row, rowIndex, errors, isCreate, mapped: null };
  }

  return {
    row,
    rowIndex,
    errors: [],
    isCreate,
    mapped: {
      actionId,
      ...(title && { title }),
      ...(description && { description }),
      ...(statusRaw && { status: statusRaw.toUpperCase().replace(/ /g, "_") }),
      ...(priorityRaw && { priority: priorityRaw.toUpperCase() }),
      ...(source && { source }),
      ...(assignedTo && { assignedTo }),
      ...(dueDate && { dueDate }),
    },
  };
}

/**
 * Build CSV content from action data.
 */
export function buildActionCSV(actions: Action[], users: { id: string; name: string }[]): string {
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const headers = [
    "Reference",
    "Action ID",
    "Title",
    "Description",
    "Report / Period",
    "Source",
    "Section",
    "Owner",
    "Due Date",
    "Status",
    "Created",
    "Completed Date",
  ];

  function escapeField(val: string | null): string {
    if (!val) return "";
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  const rows = actions.map((a) => [
    a.reference,
    a.id,
    a.title,
    a.description,
    a.reportPeriod,
    a.source,
    a.sectionTitle,
    userMap.get(a.assignedTo) || a.assignedTo,
    fmtDate(a.dueDate),
    a.status,
    fmtDate(a.createdAt),
    fmtDate(a.completedAt),
  ]);

  return [
    headers.map(escapeField).join(","),
    ...rows.map((r) => r.map(escapeField).join(",")),
  ].join("\n");
}

// ──────────────────────────────────────────────────────────
// Risk CSV utilities
// ──────────────────────────────────────────────────────────

export interface RiskColumnMapping {
  name: string;
  description: string;
  categoryL1: string;
  categoryL2: string;
  owner: string;
  inherentLikelihood: string;
  inherentImpact: string;
  residualLikelihood: string;
  residualImpact: string;
  controlEffectiveness: string;
  riskAppetite: string;
  directionOfTravel: string;
  controls: string;
  /** Month columns mapped by header name → Date (first of month) */
  monthColumns: { header: string; date: Date }[];
}

export type RiskRAGColour = "GREEN" | "YELLOW" | "AMBER" | "RED";

export interface RiskRowValidation {
  row: ParsedRow;
  rowIndex: number;
  errors: string[];
  mapped: {
    name: string;
    description: string;
    categoryL1: string;
    categoryL2: string;
    owner: string;
    inherentLikelihood: number;
    inherentImpact: number;
    residualLikelihood: number;
    residualImpact: number;
    controlEffectiveness?: string;
    riskAppetite?: string;
    directionOfTravel?: string;
    controls?: string[];
    /** 12-month history: month Date → RAG colour */
    monthHistory?: { date: Date; colour: RiskRAGColour }[];
  } | null;
}

/**
 * Map common header variations to risk field names.
 */
/** Try to parse a column header as a month (e.g. "Jan 25", "Feb 2025", "June 24", "2025-03") */
function parseMonthHeader(header: string): Date | null {
  const trimmed = header.trim();

  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };

  // Match abbreviated or full month name + 2/4-digit year (e.g. "Jan 25", "June 24", "February 2025")
  const monthYear = trimmed.match(/^([A-Za-z]+)\s+(\d{2,4})$/);
  if (monthYear) {
    const mKey = monthYear[1].toLowerCase();
    const m = months[mKey];
    if (m !== undefined) {
      let y = parseInt(monthYear[2], 10);
      if (y < 100) y += 2000;
      return new Date(Date.UTC(y, m, 1));
    }
  }

  // Match "YYYY-MM" (e.g. "2025-03")
  const isoM = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (isoM) {
    return new Date(Date.UTC(parseInt(isoM[1], 10), parseInt(isoM[2], 10) - 1, 1));
  }
  return null;
}

export function autoMapRiskColumns(headers: string[]): Partial<RiskColumnMapping> {
  const mapping: Partial<RiskColumnMapping> = {};
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  type StringField = Exclude<keyof RiskColumnMapping, "monthColumns">;
  const patterns: { field: StringField; matches: string[] }[] = [
    { field: "name", matches: ["name", "riskname", "risk_name", "title", "risktitle"] },
    { field: "description", matches: ["description", "desc", "detail", "details", "riskdescription"] },
    { field: "categoryL1", matches: ["categoryl1", "category_l1", "l1category", "l1", "category", "riskcategory"] },
    { field: "categoryL2", matches: ["categoryl2", "category_l2", "l2category", "l2", "subcategory"] },
    { field: "owner", matches: ["owner", "riskowner", "risk_owner", "assignedto", "responsible"] },
    { field: "inherentLikelihood", matches: ["inherentlikelihood", "inherent_likelihood", "inherentl", "il"] },
    { field: "inherentImpact", matches: ["inherentimpact", "inherent_impact", "inherenti", "ii"] },
    { field: "residualLikelihood", matches: ["residuallikelihood", "residual_likelihood", "residuall", "rl"] },
    { field: "residualImpact", matches: ["residualimpact", "residual_impact", "residuali", "ri"] },
    { field: "controlEffectiveness", matches: ["controleffectiveness", "control_effectiveness", "effectiveness"] },
    { field: "controls", matches: ["controls", "control", "keycontrols", "key_controls", "riskcontrols"] },
    { field: "riskAppetite", matches: ["riskappetite", "risk_appetite", "appetite"] },
    { field: "directionOfTravel", matches: ["directionoftravel", "direction_of_travel", "direction", "trend", "dot"] },
  ];

  const monthColumns: { header: string; date: Date }[] = [];

  for (const header of headers) {
    const norm = normalise(header);
    let matched = false;
    for (const pattern of patterns) {
      if (pattern.matches.includes(norm) && !mapping[pattern.field]) {
        mapping[pattern.field] = header;
        matched = true;
        break;
      }
    }
    // If not a known field, check if it's a month column
    if (!matched) {
      const monthDate = parseMonthHeader(header);
      if (monthDate) {
        monthColumns.push({ header, date: monthDate });
      }
    }
  }

  // Sort month columns chronologically
  monthColumns.sort((a, b) => a.date.getTime() - b.date.getTime());
  mapping.monthColumns = monthColumns;

  return mapping;
}

const VALID_CONTROL_EFFECTIVENESS = ["EFFECTIVE", "PARTIALLY_EFFECTIVE", "INEFFECTIVE"];
const VALID_RISK_APPETITE = ["VERY_LOW", "LOW", "LOW_TO_MODERATE", "MODERATE"];
const VALID_DIRECTION = ["IMPROVING", "STABLE", "DETERIORATING"];

/** Normalise a RAG colour string from CSV (Green/Yellow/Amber/Red or Low/Medium/High/Very High) */
function parseRAGColour(raw: string): RiskRAGColour | null {
  const lower = raw.trim().toLowerCase();
  if (["green", "low", "g"].includes(lower)) return "GREEN";
  if (["yellow", "medium", "y"].includes(lower)) return "YELLOW";
  if (["amber", "high", "orange", "a"].includes(lower)) return "AMBER";
  if (["red", "very high", "veryhigh", "r", "critical"].includes(lower)) return "RED";
  return null;
}

/**
 * Validate a single parsed row for risk import.
 */
export function validateRiskRow(
  row: ParsedRow,
  rowIndex: number,
  columnMapping: Partial<RiskColumnMapping>
): RiskRowValidation {
  const errors: string[] = [];

  const getField = (key: string | undefined): string =>
    key ? (row[key] ?? "") : "";

  const name = getField(columnMapping.name);
  const description = getField(columnMapping.description);
  const categoryL1 = getField(columnMapping.categoryL1);
  const categoryL2 = getField(columnMapping.categoryL2);
  const owner = getField(columnMapping.owner);
  const ilRaw = getField(columnMapping.inherentLikelihood);
  const iiRaw = getField(columnMapping.inherentImpact);
  const rlRaw = getField(columnMapping.residualLikelihood);
  const riRaw = getField(columnMapping.residualImpact);
  const ceRaw = getField(columnMapping.controlEffectiveness);
  const raRaw = getField(columnMapping.riskAppetite);
  const dotRaw = getField(columnMapping.directionOfTravel);
  const controlsRaw = getField(columnMapping.controls);

  if (!name) errors.push("Missing Name");
  if (!description) errors.push("Missing Description");
  if (!categoryL1) errors.push("Missing Category L1");
  if (!categoryL2) errors.push("Missing Category L2");
  if (!owner) errors.push("Missing Owner");

  const parseScore = (raw: string, field: string): number => {
    if (!raw) { errors.push(`Missing ${field}`); return 0; }
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < 1 || num > 5) { errors.push(`${field} must be 1-5, got: ${raw}`); return 0; }
    return num;
  };

  const inherentLikelihood = parseScore(ilRaw, "Inherent Likelihood");
  const inherentImpact = parseScore(iiRaw, "Inherent Impact");
  const residualLikelihood = parseScore(rlRaw, "Residual Likelihood");
  const residualImpact = parseScore(riRaw, "Residual Impact");

  let controlEffectiveness: string | undefined;
  if (ceRaw) {
    const upper = ceRaw.toUpperCase().replace(/ /g, "_");
    if (!VALID_CONTROL_EFFECTIVENESS.includes(upper)) {
      errors.push(`Invalid control effectiveness: ${ceRaw}`);
    } else {
      controlEffectiveness = upper;
    }
  }

  let riskAppetite: string | undefined;
  if (raRaw) {
    const upper = raRaw.toUpperCase().replace(/ /g, "_");
    if (!VALID_RISK_APPETITE.includes(upper)) {
      errors.push(`Invalid risk appetite: ${raRaw}`);
    } else {
      riskAppetite = upper;
    }
  }

  let directionOfTravel: string | undefined;
  if (dotRaw) {
    const upper = dotRaw.toUpperCase().replace(/ /g, "_");
    if (!VALID_DIRECTION.includes(upper)) {
      errors.push(`Invalid direction of travel: ${dotRaw}`);
    } else {
      directionOfTravel = upper;
    }
  }

  // Parse controls (pipe-separated)
  const controls: string[] = controlsRaw
    ? controlsRaw.split("|").map((c) => c.trim()).filter(Boolean)
    : [];

  // Parse month history columns
  const monthHistory: { date: Date; colour: RiskRAGColour }[] = [];
  for (const mc of columnMapping.monthColumns ?? []) {
    const cellVal = row[mc.header] ?? "";
    if (!cellVal.trim()) continue;
    const colour = parseRAGColour(cellVal);
    if (colour) {
      monthHistory.push({ date: mc.date, colour });
    } else {
      errors.push(`Invalid RAG colour for ${mc.header}: "${cellVal}" (use Green/Yellow/Amber/Red)`);
    }
  }

  if (errors.length > 0) {
    return { row, rowIndex, errors, mapped: null };
  }

  return {
    row,
    rowIndex,
    errors: [],
    mapped: {
      name,
      description,
      categoryL1,
      categoryL2,
      owner,
      inherentLikelihood,
      inherentImpact,
      residualLikelihood,
      residualImpact,
      ...(controlEffectiveness && { controlEffectiveness }),
      ...(riskAppetite && { riskAppetite }),
      ...(directionOfTravel && { directionOfTravel }),
      ...(controls.length > 0 && { controls }),
      ...(monthHistory.length > 0 && { monthHistory }),
    },
  };
}
