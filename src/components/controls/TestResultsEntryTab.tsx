"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type {
  TestingScheduleEntry,
  ControlTestResult,
  TestResultValue,
} from "@/lib/types";
import {
  TEST_RESULT_LABELS,
  TEST_RESULT_COLOURS,
} from "@/lib/types";
import { api } from "@/lib/api-client";
import {
  Save,
  Send,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Calendar,
  LayoutGrid,
  List,
  Upload,
} from "lucide-react";
import CardViewTestEntry from "./CardViewTestEntry";
import BulkHistoricalEntry from "./BulkHistoricalEntry";

/* ── Constants ────────────────────────────────────────────────────────────── */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const RESULT_OPTIONS: TestResultValue[] = [
  "PASS",
  "FAIL",
  "PARTIALLY",
  "NOT_TESTED",
  "NOT_DUE",
];

/* ── Types ────────────────────────────────────────────────────────────────── */

interface EditEntry {
  result: TestResultValue;
  notes: string;
}

/* ── Component ────────────────────────────────────────────────────────────── */

export default function TestResultsEntryTab() {
  const testingSchedule = useAppStore((s) => s.testingSchedule);
  const users = useAppStore((s) => s.users);

  /* Period selector state — defaults to current month/year */
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    now.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    now.getFullYear(),
  );

  /* Collapsible business area sections */
  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(
    new Set(),
  );

  /* Inline notes expansion */
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(
    new Set(),
  );

  /* View mode: grid (table) or card */
  const [viewMode, setViewMode] = useState<"grid" | "card">("grid");

  /* Bulk import dialog */
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  /* Local edits map: scheduleEntryId -> { result, notes } */
  const [edits, setEdits] = useState<Map<string, EditEntry>>(new Map());

  /* Saving state */
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* ── Derived data ────────────────────────────────────────────────────── */

  const isPastPeriod = useMemo(() => {
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return (
      selectedYear < currentYear ||
      (selectedYear === currentYear && selectedMonth < currentMonth)
    );
  }, [selectedMonth, selectedYear]);

  /* Build grouped data: business area name -> schedule entries */
  const groupedByArea = useMemo(() => {
    const groups = new Map<string, TestingScheduleEntry[]>();

    for (const entry of testingSchedule) {
      if (!entry.isActive) continue;
      const areaName =
        entry.control?.businessArea?.name ?? "Unassigned";
      const existing = groups.get(areaName) ?? [];
      existing.push(entry);
      groups.set(areaName, existing);
    }

    /* Sort groups alphabetically, and entries within each by control ref */
    const sorted = new Map(
      Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([area, entries]) => [
          area,
          entries.sort((a, b) =>
            (a.control?.controlRef ?? "").localeCompare(
              b.control?.controlRef ?? "",
            ),
          ),
        ] as [string, TestingScheduleEntry[]]),
    );

    return sorted;
  }, [testingSchedule]);

  /* Resolve an existing test result for a given entry + period */
  const getExistingResult = useCallback(
    (entry: TestingScheduleEntry): ControlTestResult | undefined => {
      return entry.testResults?.find(
        (r) =>
          r.periodYear === selectedYear &&
          r.periodMonth === selectedMonth,
      );
    },
    [selectedMonth, selectedYear],
  );

  /* Get the effective value for a schedule entry (edit overrides existing) */
  const getEffectiveEntry = useCallback(
    (entryId: string, scheduleEntry: TestingScheduleEntry): EditEntry => {
      const edit = edits.get(entryId);
      if (edit) return edit;

      const existing = getExistingResult(scheduleEntry);
      if (existing) {
        return { result: existing.result, notes: existing.notes ?? "" };
      }

      return { result: "" as TestResultValue, notes: "" };
    },
    [edits, getExistingResult],
  );

  /* Count progress */
  const { totalEntries, recordedCount } = useMemo(() => {
    let total = 0;
    let recorded = 0;

    for (const entries of Array.from(groupedByArea.values())) {
      for (const entry of entries) {
        total++;
        const effective = getEffectiveEntry(entry.id, entry);
        if (effective.result && effective.result !== ("" as TestResultValue)) {
          recorded++;
        }
      }
    }

    return { totalEntries: total, recordedCount: recorded };
  }, [groupedByArea, getEffectiveEntry]);

  const progressPct =
    totalEntries > 0
      ? Math.round((recordedCount / totalEntries) * 100)
      : 0;

  /* ── Validation ──────────────────────────────────────────────────────── */

  const validationErrors = useMemo(() => {
    const errors: { entryId: string; message: string }[] = [];

    for (const entries of Array.from(groupedByArea.values())) {
      for (const entry of entries) {
        const effective = getEffectiveEntry(entry.id, entry);
        if (
          (effective.result === "FAIL" || effective.result === "PARTIALLY") &&
          !effective.notes.trim()
        ) {
          errors.push({
            entryId: entry.id,
            message: `${entry.control?.controlRef ?? entry.id}: ${TEST_RESULT_LABELS[effective.result]} result requires notes`,
          });
        }
      }
    }

    return errors;
  }, [groupedByArea, getEffectiveEntry]);

  /* ── Handlers ────────────────────────────────────────────────────────── */

  function updateEdit(entryId: string, field: keyof EditEntry, value: string) {
    setEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(entryId) ?? { result: "" as TestResultValue, notes: "" };

      /* If this is the first edit for this entry, pre-populate from existing */
      if (!prev.has(entryId)) {
        const scheduleEntry = testingSchedule.find((e) => e.id === entryId);
        if (scheduleEntry) {
          const existing = scheduleEntry.testResults?.find(
            (r) =>
              r.periodYear === selectedYear &&
              r.periodMonth === selectedMonth,
          );
          if (existing) {
            current.result = existing.result;
            current.notes = existing.notes ?? "";
          }
        }
      }

      next.set(entryId, {
        ...current,
        [field]: value,
      });
      return next;
    });

    setSaveSuccess(false);
    setSaveError(null);
  }

  function toggleArea(areaName: string) {
    setCollapsedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaName)) {
        next.delete(areaName);
      } else {
        next.add(areaName);
      }
      return next;
    });
  }

  function toggleNotes(entryId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }

  function handlePeriodChange() {
    /* Reset edits when period changes */
    setEdits(new Map());
    setSaveSuccess(false);
    setSaveError(null);
  }

  async function handleSaveAll() {
    /* Block save if validation errors exist */
    if (validationErrors.length > 0) {
      setSaveError(
        "Cannot save: some results require notes. Please add notes for all Fail and Partially results.",
      );
      return;
    }

    /* Collect results to save — only entries with a result selected */
    const results: {
      scheduleEntryId: string;
      periodYear: number;
      periodMonth: number;
      result: TestResultValue;
      notes: string;
      evidenceLinks: string[];
    }[] = [];

    for (const entries of Array.from(groupedByArea.values())) {
      for (const entry of entries) {
        const effective = getEffectiveEntry(entry.id, entry);
        if (effective.result && effective.result !== ("" as TestResultValue)) {
          results.push({
            scheduleEntryId: entry.id,
            periodYear: selectedYear,
            periodMonth: selectedMonth,
            result: effective.result,
            notes: effective.notes,
            evidenceLinks: [],
          });
        }
      }
    }

    if (results.length === 0) {
      setSaveError("No results to save. Please select at least one result.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await api("/api/controls/test-results", {
        method: "POST",
        body: { results },
      });
      setSaveSuccess(true);
      /* Clear local edits after successful save */
      setEdits(new Map());
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to save results. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ── Helper to look up tester name ──────────────────────────────────── */

  function getTesterName(entry: TestingScheduleEntry): string {
    if (entry.assignedTester?.name) return entry.assignedTester.name;
    const user = users.find((u) => u.id === entry.assignedTesterId);
    return user?.name ?? "Unassigned";
  }

  /* ── Year range for dropdown ────────────────────────────────────────── */

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, []);

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-poppins font-semibold text-updraft-deep">
            Test Results Entry
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Record monthly 2LOD test results for controls in the testing
            schedule.
          </p>
        </div>
      </div>

      {/* Period selector */}
      <div className="bento-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-updraft-deep" />
            <span className="text-sm font-medium text-gray-700">
              Period:
            </span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(Number(e.target.value));
              handlePeriodChange();
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              handlePeriodChange();
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
          >
            {yearOptions.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* View toggle + Bulk import + Save */}
          <div className="ml-auto flex items-center gap-2">
            {/* View toggle */}
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-updraft-deep text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
                title="Grid view"
              >
                <List className="w-3.5 h-3.5" />
                Grid
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "card"
                    ? "bg-updraft-deep text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
                title="Card view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
            </div>

            {/* Bulk import */}
            <button
              onClick={() => setBulkImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </button>

            {/* Save */}
            <button
              onClick={handleSaveAll}
              disabled={saving || recordedCount === 0}
              className="inline-flex items-center gap-2 rounded-md bg-updraft-deep px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-updraft-deep/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Send className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save All Results
                </>
              )}
            </button>
          </div>
        </div>

        {/* Past period warning banner */}
        {isPastPeriod && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>
              You are entering results for a past period. These will be flagged
              as backdated.
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="bento-card p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">
            Results Recorded
          </span>
          <span className="text-gray-500">
            {recordedCount} of {totalEntries} ({progressPct}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all duration-300 bg-updraft-deep"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Error / success messages */}
      {saveError && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Results saved successfully.
        </div>
      )}

      {/* Validation warnings */}
      {validationErrors.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
          <p className="font-medium">Validation Warnings:</p>
          {validationErrors.map((err) => (
            <p key={err.entryId} className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              {err.message}
            </p>
          ))}
        </div>
      )}

      {/* Entry area — Grid or Card view */}
      {totalEntries === 0 ? (
        <div className="bento-card p-8 text-center text-gray-500">
          <p>No controls are currently in the testing schedule.</p>
          <p className="text-sm mt-1">
            Add controls to the testing schedule to begin recording results.
          </p>
        </div>
      ) : viewMode === "card" ? (
        /* ── Card view ─────────────────────────────────────────── */
        <CardViewTestEntry
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          entries={Array.from(groupedByArea.values()).flat()}
          edits={edits}
          onEditResult={(entryId, result) =>
            updateEdit(entryId, "result", result)
          }
          onEditNotes={(entryId, notes) =>
            updateEdit(entryId, "notes", notes)
          }
        />
      ) : (
        /* ── Grid view ─────────────────────────────────────────── */
        <div className="space-y-4">
          {Array.from(groupedByArea.entries()).map(([areaName, entries]) => {
            const isCollapsed = collapsedAreas.has(areaName);
            const areaRecorded = entries.filter((e) => {
              const eff = getEffectiveEntry(e.id, e);
              return eff.result && eff.result !== ("" as TestResultValue);
            }).length;

            return (
              <div key={areaName} className="bento-card overflow-hidden">
                {/* Area header (collapsible) */}
                <button
                  onClick={() => toggleArea(areaName)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="font-poppins font-semibold text-updraft-deep">
                      {areaName}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({areaRecorded}/{entries.length} recorded)
                    </span>
                  </div>
                </button>

                {/* Rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="col-span-2">Ref</div>
                      <div className="col-span-3">Control Name</div>
                      <div className="col-span-3">Result</div>
                      <div className="col-span-1 text-center">Notes</div>
                      <div className="col-span-3">Assigned Tester</div>
                    </div>

                    {entries.map((entry) => {
                      const effective = getEffectiveEntry(entry.id, entry);
                      const hasResult =
                        effective.result &&
                        effective.result !== ("" as TestResultValue);
                      const needsNotes =
                        (effective.result === "FAIL" ||
                          effective.result === "PARTIALLY") &&
                        !effective.notes.trim();
                      const isNotesExpanded = expandedNotes.has(entry.id);

                      return (
                        <div key={entry.id}>
                          <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50/50 transition-colors">
                            {/* Control ref */}
                            <div className="col-span-2">
                              <span className="text-sm font-mono font-medium text-updraft-deep">
                                {entry.control?.controlRef ?? "—"}
                              </span>
                            </div>

                            {/* Control name */}
                            <div className="col-span-3">
                              <span className="text-sm text-gray-800 line-clamp-2">
                                {entry.control?.controlName ?? "—"}
                              </span>
                            </div>

                            {/* Result dropdown */}
                            <div className="col-span-3">
                              <div className="relative">
                                <select
                                  value={effective.result}
                                  onChange={(e) =>
                                    updateEdit(
                                      entry.id,
                                      "result",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full rounded-md border px-3 py-1.5 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-updraft-deep/30 ${
                                    hasResult
                                      ? `${TEST_RESULT_COLOURS[effective.result]?.bg ?? ""} ${TEST_RESULT_COLOURS[effective.result]?.text ?? ""} border-transparent`
                                      : "border-gray-300 text-gray-500"
                                  }`}
                                >
                                  <option value="">— Select —</option>
                                  {RESULT_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {TEST_RESULT_LABELS[opt]}
                                    </option>
                                  ))}
                                </select>

                                {/* Colour dot indicator */}
                                {hasResult && (
                                  <span
                                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${TEST_RESULT_COLOURS[effective.result]?.dot ?? ""}`}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Notes toggle */}
                            <div className="col-span-1 flex justify-center">
                              <button
                                onClick={() => toggleNotes(entry.id)}
                                className={`relative p-1.5 rounded-md transition-colors ${
                                  isNotesExpanded
                                    ? "bg-updraft-deep/10 text-updraft-deep"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                }`}
                                title={
                                  isNotesExpanded
                                    ? "Hide notes"
                                    : "Add notes"
                                }
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                                {/* Warning icon for missing notes */}
                                {needsNotes && (
                                  <AlertTriangle className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-500" />
                                )}
                                {/* Dot for existing notes */}
                                {effective.notes.trim() && !needsNotes && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-updraft-deep" />
                                )}
                              </button>
                            </div>

                            {/* Assigned tester */}
                            <div className="col-span-3">
                              <span className="text-sm text-gray-600">
                                {getTesterName(entry)}
                              </span>
                            </div>
                          </div>

                          {/* Inline notes textarea */}
                          {isNotesExpanded && (
                            <div className="px-4 pb-3">
                              <textarea
                                value={effective.notes}
                                onChange={(e) =>
                                  updateEdit(
                                    entry.id,
                                    "notes",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter testing notes, observations, or evidence references..."
                                rows={3}
                                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30 resize-y ${
                                  needsNotes
                                    ? "border-amber-300 bg-amber-50/50"
                                    : "border-gray-300"
                                }`}
                              />
                              {needsNotes && (
                                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Notes are required for{" "}
                                  {TEST_RESULT_LABELS[effective.result]}{" "}
                                  results.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Historical Entry dialog */}
      <BulkHistoricalEntry
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={() => {
          setBulkImportOpen(false);
          setSaveSuccess(true);
        }}
      />
    </div>
  );
}
