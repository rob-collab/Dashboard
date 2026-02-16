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
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
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
        } else if (char === delimiter) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseLine(line);
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
  title: string;
  description: string;
  status: string;
  assignedTo: string;
  dueDate: string;
}

export interface ActionRowValidation {
  row: ParsedRow;
  rowIndex: number;
  errors: string[];
  mapped: {
    actionId: string;
    title?: string;
    description?: string;
    status?: string;
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
    { field: "title", matches: ["title", "name", "actiontitle", "action_title"] },
    { field: "description", matches: ["description", "desc", "detail", "details"] },
    { field: "status", matches: ["status", "actionstatus", "action_status", "state"] },
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

const VALID_ACTION_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE"];

/**
 * Validate a single parsed row for action import.
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
  const assignedTo = row[columnMapping.assignedTo ?? ""] ?? "";
  const dueDate = row[columnMapping.dueDate ?? ""] ?? "";

  if (!actionId) {
    errors.push("Missing Action ID");
    return { row, rowIndex, errors, mapped: null };
  }

  if (statusRaw) {
    const upper = statusRaw.toUpperCase().replace(/ /g, "_");
    if (!VALID_ACTION_STATUSES.includes(upper)) {
      errors.push(`Invalid status: ${statusRaw}`);
    }
  }

  if (dueDate) {
    const parsed = new Date(dueDate);
    if (isNaN(parsed.getTime())) {
      errors.push(`Invalid date: ${dueDate}`);
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
      actionId,
      ...(title && { title }),
      ...(description && { description }),
      ...(statusRaw && { status: statusRaw.toUpperCase().replace(/ /g, "_") }),
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
    "Action ID",
    "Title",
    "Description",
    "Report / Period",
    "Section",
    "Owner",
    "Due Date",
    "Status",
    "Created",
    "Completed Date",
  ];

  function escapeField(val: string): string {
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
    a.id,
    a.title,
    a.description,
    a.reportPeriod,
    a.sectionTitle || "",
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
