import type { RAGStatus } from "./types";

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
  if (["good", "green", "g"].includes(lower)) return "GOOD";
  if (["warning", "amber", "w", "a"].includes(lower)) return "WARNING";
  if (["harm", "red", "h", "r"].includes(lower)) return "HARM";
  return null;
}

/**
 * Validate a single parsed row and return mapped data or errors.
 */
export function validateRow(
  row: ParsedRow,
  rowIndex: number,
  columnMapping: Partial<ColumnMapping>,
  validOutcomeIds: string[]
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
  if (!outcomeIdRaw) errors.push("Missing Outcome");

  // Try to match outcome by ID or name
  let matchedOutcomeId = "";
  if (outcomeIdRaw) {
    const match = validOutcomeIds.find(
      (id) => id.toLowerCase() === outcomeIdRaw.toLowerCase()
    );
    matchedOutcomeId = match ?? outcomeIdRaw;
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
