"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { TestResultValue, TestingScheduleEntry } from "@/lib/types";
import { TEST_RESULT_LABELS, TEST_RESULT_COLOURS } from "@/lib/types";
import { naturalCompare } from "@/lib/utils";
import { Upload, Clipboard, Zap, X, AlertTriangle, CheckCircle2, FileText } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface BulkHistoricalEntryProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TabId = "csv" | "paste" | "quickfill";

interface ParsedRow {
  controlRef: string;
  year: number;
  month: number;
  result: TestResultValue;
  notes: string;
}

interface ValidatedRow {
  rowIndex: number;
  raw: string[];
  parsed: ParsedRow | null;
  scheduleEntryId: string | null;
  errors: string[];
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const VALID_RESULTS: Record<string, TestResultValue> = {
  PASS: "PASS",
  FAIL: "FAIL",
  PARTIALLY: "PARTIALLY",
  NOT_TESTED: "NOT_TESTED",
  NOT_DUE: "NOT_DUE",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const RESULT_OPTIONS: TestResultValue[] = [
  "PASS", "FAIL", "PARTIALLY", "NOT_TESTED", "NOT_DUE",
];

/* ── CSV Parser ─────────────────────────────────────────────────────────────── */

function parseCSV(text: string): string[][] {
  return text.trim().split("\n").map(line => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ""; continue; }
      current += char;
    }
    fields.push(current.trim());
    return fields;
  });
}

/* ── Tab-separated Parser ───────────────────────────────────────────────────── */

function parseTSV(text: string): string[][] {
  return text.trim().split("\n").map(line =>
    line.split("\t").map(cell => cell.trim())
  );
}

/* ── Validation ─────────────────────────────────────────────────────────────── */

function validateRows(
  rows: string[][],
  scheduleMap: Map<string, string>,
): ValidatedRow[] {
  return rows.map((fields, idx) => {
    const errors: string[] = [];

    if (fields.length < 4) {
      return { rowIndex: idx, raw: fields, parsed: null, scheduleEntryId: null, errors: ["Row has fewer than 4 columns (expected: control_ref, year, month, result, notes)"] };
    }

    const controlRef = fields[0];
    const yearStr = fields[1];
    const monthStr = fields[2];
    const resultStr = fields[3]?.toUpperCase().replace(/\s+/g, "_") ?? "";
    const notes = fields[4] ?? "";

    // Validate control_ref exists
    const entryId = scheduleMap.get(controlRef);
    if (!entryId) {
      errors.push(`Control ref "${controlRef}" not found in testing schedule`);
    }

    // Validate year
    const year = parseInt(yearStr, 10);
    if (isNaN(year) || year < 2020 || year > 2100) {
      errors.push(`Invalid year "${yearStr}" — must be between 2020 and 2100`);
    }

    // Validate month
    const month = parseInt(monthStr, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      errors.push(`Invalid month "${monthStr}" — must be between 1 and 12`);
    }

    // Validate result
    const result = VALID_RESULTS[resultStr];
    if (!result) {
      errors.push(`Invalid result "${fields[3]}" — must be one of: PASS, FAIL, PARTIALLY, NOT_TESTED, NOT_DUE`);
    }

    // Validate: FAIL and PARTIALLY require notes
    if ((resultStr === "FAIL" || resultStr === "PARTIALLY") && !notes.trim()) {
      errors.push(`Notes are required for ${resultStr} results`);
    }

    if (errors.length > 0) {
      return {
        rowIndex: idx,
        raw: fields,
        parsed: null,
        scheduleEntryId: entryId ?? null,
        errors,
      };
    }

    return {
      rowIndex: idx,
      raw: fields,
      parsed: {
        controlRef,
        year,
        month,
        result: result!,
        notes,
      },
      scheduleEntryId: entryId ?? null,
      errors: [],
    };
  });
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function BulkHistoricalEntry({ open, onClose, onSuccess }: BulkHistoricalEntryProps) {
  const testingSchedule = useAppStore((s) => s.testingSchedule);

  /* ── Tab state ─────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<TabId>("csv");

  /* ── CSV tab state ─────────────────────────────────────── */
  const [csvValidated, setCsvValidated] = useState<ValidatedRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  /* ── Paste tab state ───────────────────────────────────── */
  const [pasteText, setPasteText] = useState("");
  const [pasteValidated, setPasteValidated] = useState<ValidatedRow[]>([]);

  /* ── Quick-fill state ──────────────────────────────────── */
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [qfFromYear, setQfFromYear] = useState(new Date().getFullYear());
  const [qfFromMonth, setQfFromMonth] = useState(1);
  const [qfToYear, setQfToYear] = useState(new Date().getFullYear());
  const [qfToMonth, setQfToMonth] = useState(new Date().getMonth() + 1);
  const [qfResult, setQfResult] = useState<TestResultValue>("PASS");
  const [qfNotes, setQfNotes] = useState("");

  /* ── Shared state ──────────────────────────────────────── */
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<{ count: number } | null>(null);

  /* ── Build schedule map: controlRef -> scheduleEntryId ── */
  const buildScheduleMap = useCallback((): Map<string, string> => {
    const map = new Map<string, string>();
    for (const entry of testingSchedule) {
      if (!entry.isActive) continue;
      const ref = entry.control?.controlRef;
      if (ref) {
        map.set(ref, entry.id);
      }
    }
    return map;
  }, [testingSchedule]);

  /* ── Active schedule entries grouped by business area ─── */
  const groupedEntries = (() => {
    const groups = new Map<string, TestingScheduleEntry[]>();
    for (const entry of testingSchedule) {
      if (!entry.isActive) continue;
      const areaName = entry.control?.businessArea?.name ?? "Unassigned";
      const arr = groups.get(areaName) ?? [];
      arr.push(entry);
      groups.set(areaName, arr);
    }
    // Sort groups and entries
    return new Map(
      Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([area, entries]) => [
          area,
          entries.sort((a, b) =>
            naturalCompare(a.control?.controlRef ?? "", b.control?.controlRef ?? "")
          ),
        ] as [string, TestingScheduleEntry[]])
    );
  })();

  /* ── Year range ────────────────────────────────────────── */
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  /* ── CSV file handler ──────────────────────────────────── */
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setImportSuccess(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      const rows = parseCSV(text);

      // Skip header row if first field looks like a header
      const firstField = rows[0]?.[0]?.toLowerCase() ?? "";
      const dataRows = (firstField === "control_ref" || firstField === "controlref" || firstField === "control ref")
        ? rows.slice(1)
        : rows;

      const scheduleMap = buildScheduleMap();
      setCsvValidated(validateRows(dataRows, scheduleMap));
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re-selected
    e.target.value = "";
  }

  /* ── Paste handler ─────────────────────────────────────── */
  function handlePasteChange(text: string) {
    setPasteText(text);
    setImportSuccess(null);
    setImportError(null);

    if (!text.trim()) {
      setPasteValidated([]);
      return;
    }

    const rows = parseTSV(text);

    // Skip header row if first field looks like a header
    const firstField = rows[0]?.[0]?.toLowerCase() ?? "";
    const dataRows = (firstField === "control_ref" || firstField === "controlref" || firstField === "control ref")
      ? rows.slice(1)
      : rows;

    const scheduleMap = buildScheduleMap();
    setPasteValidated(validateRows(dataRows, scheduleMap));
  }

  /* ── Quick-fill: count entries that would be generated ── */
  const qfEntryCount = (() => {
    if (selectedEntryIds.size === 0) return 0;
    let months = 0;
    for (let y = qfFromYear; y <= qfToYear; y++) {
      const startM = y === qfFromYear ? qfFromMonth : 1;
      const endM = y === qfToYear ? qfToMonth : 12;
      if (startM <= endM) {
        months += endM - startM + 1;
      }
    }
    return selectedEntryIds.size * months;
  })();

  /* ── Quick-fill: validate range ────────────────────────── */
  const qfRangeValid = qfFromYear < qfToYear || (qfFromYear === qfToYear && qfFromMonth <= qfToMonth);

  /* ── Quick-fill: require notes for FAIL/PARTIALLY ─────── */
  const qfNeedsNotes = (qfResult === "FAIL" || qfResult === "PARTIALLY") && !qfNotes.trim();

  /* ── Toggle entry selection ────────────────────────────── */
  function toggleEntry(entryId: string) {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  /* ── Toggle all entries in an area ─────────────────────── */
  function toggleArea(areaEntries: TestingScheduleEntry[]) {
    const ids = areaEntries.map((e) => e.id);
    const allSelected = ids.every((id) => selectedEntryIds.has(id));
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  /* ── Import handler for CSV / Paste tabs ───────────────── */
  async function handleImport(validated: ValidatedRow[]) {
    const validRows = validated.filter((v) => v.errors.length === 0 && v.parsed && v.scheduleEntryId);
    if (validRows.length === 0) return;

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const results = validRows.map((v) => ({
        scheduleEntryId: v.scheduleEntryId!,
        periodYear: v.parsed!.year,
        periodMonth: v.parsed!.month,
        result: v.parsed!.result,
        notes: v.parsed!.notes || null,
        evidenceLinks: [],
      }));

      await api("/api/controls/test-results", {
        method: "POST",
        body: { results },
      });

      setImportSuccess({ count: validRows.length });
      onSuccess();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to import results. Please try again."
      );
    } finally {
      setImporting(false);
    }
  }

  /* ── Quick-fill apply handler ──────────────────────────── */
  async function handleQuickFillApply() {
    if (selectedEntryIds.size === 0 || !qfRangeValid || qfNeedsNotes) return;

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const results: {
        scheduleEntryId: string;
        periodYear: number;
        periodMonth: number;
        result: TestResultValue;
        notes: string | null;
        evidenceLinks: string[];
      }[] = [];

      for (const entryId of Array.from(selectedEntryIds)) {
        for (let y = qfFromYear; y <= qfToYear; y++) {
          const startM = y === qfFromYear ? qfFromMonth : 1;
          const endM = y === qfToYear ? qfToMonth : 12;
          for (let m = startM; m <= endM; m++) {
            results.push({
              scheduleEntryId: entryId,
              periodYear: y,
              periodMonth: m,
              result: qfResult,
              notes: qfNotes.trim() || null,
              evidenceLinks: [],
            });
          }
        }
      }

      if (results.length === 0) return;

      await api("/api/controls/test-results", {
        method: "POST",
        body: { results },
      });

      setImportSuccess({ count: results.length });
      onSuccess();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to apply results. Please try again."
      );
    } finally {
      setImporting(false);
    }
  }

  /* ── Reset and close ───────────────────────────────────── */
  function handleClose() {
    setCsvValidated([]);
    setCsvFileName(null);
    setPasteText("");
    setPasteValidated([]);
    setSelectedEntryIds(new Set());
    setQfResult("PASS");
    setQfNotes("");
    setImporting(false);
    setImportError(null);
    setImportSuccess(null);
    onClose();
  }

  /* ── Preview table component ───────────────────────────── */
  function renderPreviewTable(validated: ValidatedRow[]) {
    if (validated.length === 0) return null;

    const validCount = validated.filter((v) => v.errors.length === 0).length;
    const errorCount = validated.filter((v) => v.errors.length > 0).length;

    return (
      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">
            Preview ({validated.length} row{validated.length !== 1 ? "s" : ""})
          </h4>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-green-600 font-medium">{validCount} valid</span>
            {errorCount > 0 && (
              <span className="text-red-600 font-medium">
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="max-h-56 overflow-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 sticky top-0">
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">Control Ref</th>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">Period</th>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">Result</th>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">Notes</th>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {validated.map((v) => (
                <tr
                  key={v.rowIndex}
                  className={v.errors.length > 0 ? "bg-red-50/60" : ""}
                >
                  <td className="border-b border-gray-100 px-2 py-1 text-gray-700 font-mono text-[11px]">
                    {v.raw[0] ?? "—"}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1 text-gray-700">
                    {v.parsed ? `${MONTH_NAMES[v.parsed.month - 1]?.slice(0, 3)} ${v.parsed.year}` : `${v.raw[2] ?? "?"}/${v.raw[1] ?? "?"}`}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1">
                    {v.parsed ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TEST_RESULT_COLOURS[v.parsed.result].bg} ${TEST_RESULT_COLOURS[v.parsed.result].text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${TEST_RESULT_COLOURS[v.parsed.result].dot}`} />
                        {TEST_RESULT_LABELS[v.parsed.result]}
                      </span>
                    ) : (
                      <span className="text-gray-400">{v.raw[3] ?? "—"}</span>
                    )}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1 text-gray-600 max-w-[120px] truncate">
                    {v.parsed?.notes || v.raw[4] || "—"}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1">
                    {v.errors.length > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 text-red-600"
                        title={v.errors.join("; ")}
                      >
                        <X size={12} className="shrink-0" />
                        <span className="truncate max-w-[140px]">{v.errors[0]}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 size={12} />
                        Valid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Import button */}
        {validCount > 0 && (
          <button
            onClick={() => handleImport(validated)}
            disabled={importing}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
              importing
                ? "cursor-not-allowed bg-gray-300"
                : "bg-updraft-bright-purple hover:bg-updraft-deep"
            }`}
          >
            {importing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={15} />
                Import {validCount} Result{validCount !== 1 ? "s" : ""}
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  /* ── Tab: CSV Upload ───────────────────────────────────── */
  function renderCSVTab() {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Upload a CSV file with historical test results. Expected format:
          </p>
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 font-mono text-xs text-gray-600">
            control_ref,year,month,result,notes<br />
            CTRL-001,2025,6,PASS,Monthly check completed<br />
            CTRL-002,2025,6,FAIL,&quot;Issue found, remediation required&quot;
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-updraft-light-purple bg-updraft-pale-purple/10 p-6 cursor-pointer hover:bg-updraft-pale-purple/20 transition-colors"
          onClick={() => document.getElementById("bulk-csv-input")?.click()}
        >
          <FileText size={28} className="mb-2 text-updraft-bar" />
          <p className="text-sm font-medium text-gray-700">
            {csvFileName ? csvFileName : "Click to select a CSV file"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Accepts .csv files
          </p>
          <input
            id="bulk-csv-input"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {renderPreviewTable(csvValidated)}
      </div>
    );
  }

  /* ── Tab: Clipboard Paste ──────────────────────────────── */
  function renderPasteTab() {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Paste tab-separated data from Excel or Google Sheets. Expected columns:
          </p>
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 font-mono text-xs text-gray-600">
            control_ref &nbsp; year &nbsp; month &nbsp; result &nbsp; notes
          </div>
        </div>

        <textarea
          rows={8}
          value={pasteText}
          onChange={(e) => handlePasteChange(e.target.value)}
          placeholder={"CTRL-001\t2025\t6\tPASS\tMonthly check completed\nCTRL-002\t2025\t6\tFAIL\tIssue found"}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-updraft-bar focus:outline-none focus:ring-2 focus:ring-updraft-pale-purple/40 transition-colors resize-y"
        />

        {renderPreviewTable(pasteValidated)}
      </div>
    );
  }

  /* ── Tab: Quick-Fill ───────────────────────────────────── */
  function renderQuickFillTab() {
    return (
      <div className="space-y-5">
        {/* Control selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Controls
          </label>
          <div className="max-h-48 overflow-auto rounded-lg border border-gray-200">
            {Array.from(groupedEntries.entries()).map(([areaName, entries]) => {
              const allSelected = entries.every((e) => selectedEntryIds.has(e.id));
              const someSelected = entries.some((e) => selectedEntryIds.has(e.id));

              return (
                <div key={areaName}>
                  {/* Area header */}
                  <div className="sticky top-0 bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => toggleArea(entries)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bar"
                    />
                    <span className="text-xs font-semibold text-updraft-deep font-poppins">
                      {areaName}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {entries.filter((e) => selectedEntryIds.has(e.id)).length}/{entries.length}
                    </span>
                  </div>

                  {/* Entries */}
                  {entries.map((entry) => (
                    <label
                      key={entry.id}
                      className="flex items-center gap-2 px-3 py-1.5 pl-7 hover:bg-gray-50 cursor-pointer text-xs border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEntryIds.has(entry.id)}
                        onChange={() => toggleEntry(entry.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bar"
                      />
                      <span className="font-mono text-updraft-deep font-medium">
                        {entry.control?.controlRef ?? "—"}
                      </span>
                      <span className="text-gray-600 truncate">
                        {entry.control?.controlName ?? "—"}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}

            {groupedEntries.size === 0 && (
              <div className="px-3 py-6 text-center text-sm text-gray-400">
                No active controls in the testing schedule.
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {selectedEntryIds.size} control{selectedEntryIds.size !== 1 ? "s" : ""} selected
          </p>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">From:</span>
            <select
              value={qfFromMonth}
              onChange={(e) => setQfFromMonth(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              value={qfFromYear}
              onChange={(e) => setQfFromYear(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
            >
              {yearOptions.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>

            <span className="text-xs text-gray-500 mx-1">to:</span>
            <select
              value={qfToMonth}
              onChange={(e) => setQfToMonth(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              value={qfToYear}
              onChange={(e) => setQfToYear(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
            >
              {yearOptions.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
          {!qfRangeValid && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} />
              &quot;From&quot; date must be before or equal to &quot;To&quot; date.
            </p>
          )}
        </div>

        {/* Result to apply */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Result to Apply
          </label>
          <div className="flex flex-wrap gap-2">
            {RESULT_OPTIONS.map((opt) => {
              const colours = TEST_RESULT_COLOURS[opt];
              const isSelected = qfResult === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setQfResult(opt)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border ${
                    isSelected
                      ? `${colours.bg} ${colours.text} border-current`
                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? colours.dot : "bg-gray-300"}`} />
                  {TEST_RESULT_LABELS[opt]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={qfNotes}
            onChange={(e) => setQfNotes(e.target.value)}
            placeholder="Enter notes to apply to all generated entries..."
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-updraft-pale-purple/40 transition-colors resize-y ${
              qfNeedsNotes
                ? "border-amber-300 focus:border-amber-400"
                : "border-gray-200 focus:border-updraft-bar"
            }`}
          />
          {qfNeedsNotes && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} />
              Notes are required for {TEST_RESULT_LABELS[qfResult]} results.
            </p>
          )}
        </div>

        {/* Summary and apply */}
        {selectedEntryIds.size > 0 && qfRangeValid && (
          <div className="rounded-lg bg-updraft-pale-purple/20 border border-updraft-light-purple px-4 py-3">
            <p className="text-sm text-updraft-deep">
              This will create <strong>{qfEntryCount}</strong> test result{qfEntryCount !== 1 ? "s" : ""}
              {" "}({selectedEntryIds.size} control{selectedEntryIds.size !== 1 ? "s" : ""} &times;{" "}
              {qfEntryCount / selectedEntryIds.size} month{(qfEntryCount / selectedEntryIds.size) !== 1 ? "s" : ""})
              {" "}with result <strong>{TEST_RESULT_LABELS[qfResult]}</strong>.
            </p>
            <p className="text-xs text-updraft-bar mt-1">
              Existing results for the same periods will be overwritten.
            </p>
          </div>
        )}

        <button
          onClick={handleQuickFillApply}
          disabled={importing || selectedEntryIds.size === 0 || !qfRangeValid || qfNeedsNotes}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
            importing || selectedEntryIds.size === 0 || !qfRangeValid || qfNeedsNotes
              ? "cursor-not-allowed bg-gray-300"
              : "bg-updraft-bright-purple hover:bg-updraft-deep"
          }`}
        >
          {importing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Applying...
            </>
          ) : (
            <>
              <Zap size={15} />
              Apply {qfEntryCount} Result{qfEntryCount !== 1 ? "s" : ""}
            </>
          )}
        </button>
      </div>
    );
  }

  /* ── Main render ───────────────────────────────────────── */
  if (!open) return null;

  const tabs: { id: TabId; label: string; icon: typeof Upload }[] = [
    { id: "csv", label: "CSV Upload", icon: Upload },
    { id: "paste", label: "Clipboard Paste", icon: Clipboard },
    { id: "quickfill", label: "Quick-Fill", icon: Zap },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 font-poppins">
            Bulk Historical Data Entry
          </h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 px-6 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setImportSuccess(null);
                  setImportError(null);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? "border-updraft-bright-purple text-updraft-deep"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content area (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Success message */}
          {importSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 size={16} className="shrink-0" />
              Successfully imported {importSuccess.count} test result{importSuccess.count !== 1 ? "s" : ""}.
            </div>
          )}

          {/* Error message */}
          {importError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0" />
              {importError}
            </div>
          )}

          {/* Tab content */}
          {activeTab === "csv" && renderCSVTab()}
          {activeTab === "paste" && renderPasteTab()}
          {activeTab === "quickfill" && renderQuickFillTab()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-xl shrink-0">
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {importSuccess ? "Done" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
