"use client";

import { useState } from "react";
import type {
  TestingScheduleEntry,
  TestResultValue,
  ControlTestResult,
} from "@/lib/types";
import {
  TEST_RESULT_LABELS,
  TEST_RESULT_COLOURS,
  CD_OUTCOME_LABELS,
  TESTING_FREQUENCY_LABELS,
} from "@/lib/types";
import { useAppStore } from "@/lib/store";
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldQuestion,
  Clock,
  Plus,
} from "lucide-react";

/* ── Constants ────────────────────────────────────────────────────────────── */

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const RESULT_OPTIONS: TestResultValue[] = [
  "PASS",
  "FAIL",
  "PARTIALLY",
  "NOT_TESTED",
  "NOT_DUE",
];

/* ── Helper ───────────────────────────────────────────────────────────────── */

function getResultForPeriod(
  entry: TestingScheduleEntry,
  year: number,
  month: number,
): TestResultValue | null {
  const results = entry.testResults ?? [];
  const found = results.find(
    (r) => r.periodYear === year && r.periodMonth === month,
  );
  return found?.result ?? null;
}

/**
 * Walk backwards N months from (year, month).
 * Returns an array of { year, month } objects, most recent first.
 */
function previousMonths(
  year: number,
  month: number,
  count: number,
): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i++) {
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    result.push({ year: y, month: m });
  }
  return result;
}

/* ── Types ────────────────────────────────────────────────────────────────── */

interface CardViewTestEntryProps {
  selectedYear: number;
  selectedMonth: number;
  entries: TestingScheduleEntry[];
  edits: Map<string, { result: TestResultValue; notes: string; effectiveDate?: string; evidenceLinks?: string[] }>;
  onEditResult: (entryId: string, result: TestResultValue) => void;
  onEditNotes: (entryId: string, notes: string) => void;
  onEditEffectiveDate?: (entryId: string, date: string) => void;
  onEditEvidenceLink?: (entryId: string, link: string) => void;
  onCreateAction?: (entry: TestingScheduleEntry) => void;
  onCreateRiskAcceptance?: (entry: TestingScheduleEntry) => void;
  onOpenRecordModal?: (entryId: string) => void;
  expandedNote: string | null;
  onToggleNote: (entryId: string) => void;
}

/* ── Component ────────────────────────────────────────────────────────────── */

export default function CardViewTestEntry({
  selectedYear,
  selectedMonth,
  entries,
  edits,
  onEditResult,
  onEditNotes,
  onEditEffectiveDate,
  onEditEvidenceLink,
  onCreateAction,
  onCreateRiskAcceptance,
  onOpenRecordModal,
  expandedNote,
  onToggleNote,
}: CardViewTestEntryProps) {
  const users = useAppStore((s) => s.users);
  const controls = useAppStore((s) => s.controls);

  /* Per-card expanded history state */
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(
    new Set(),
  );

  function toggleHistory(entryId: string) {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }

  /* ── Resolve display values ──────────────────────────────────────────── */

  function getTesterName(entry: TestingScheduleEntry): string {
    if (entry.assignedTester?.name) return entry.assignedTester.name;
    const user = users.find((u) => u.id === entry.assignedTesterId);
    return user?.name ?? "Unassigned";
  }

  /**
   * Check whether the control owner has attested for this period.
   * Looks at control.attestations on the parent control record.
   */
  function getAttestationForPeriod(entry: TestingScheduleEntry): {
    attested: boolean;
    issuesFlagged: boolean;
  } | null {
    const control = entry.control;
    if (!control) return null;

    /* The control's attestations may come from the entry.control or from
       the top-level controls list in the store */
    const attestations =
      control.attestations ??
      controls.find((c) => c.id === control.id)?.attestations ??
      [];

    const found = attestations.find(
      (a) => a.periodYear === selectedYear && a.periodMonth === selectedMonth,
    );

    if (!found) return null;
    return { attested: found.attested, issuesFlagged: found.issuesFlagged };
  }

  /**
   * Get the effective result for the current period —
   * edits override, then fall back to existing test result.
   */
  function getEffectiveResult(
    entry: TestingScheduleEntry,
  ): TestResultValue | null {
    const edit = edits.get(entry.id);
    if (edit) return edit.result;
    return getResultForPeriod(entry, selectedYear, selectedMonth);
  }

  function getEffectiveDate(entry: TestingScheduleEntry): string {
    const edit = edits.get(entry.id);
    if (edit?.effectiveDate !== undefined) return edit.effectiveDate;
    const found = (entry.testResults ?? []).find(
      (r) => r.periodYear === selectedYear && r.periodMonth === selectedMonth,
    );
    return found?.effectiveDate ?? "";
  }

  function getEffectiveEvidenceLink(entry: TestingScheduleEntry): string {
    const edit = edits.get(entry.id);
    if (edit?.evidenceLinks !== undefined) return edit.evidenceLinks[0] ?? "";
    const found = (entry.testResults ?? []).find(
      (r) => r.periodYear === selectedYear && r.periodMonth === selectedMonth,
    );
    return found?.evidenceLinks?.[0] ?? "";
  }

  function getEffectiveNotes(entry: TestingScheduleEntry): string {
    const edit = edits.get(entry.id);
    if (edit) return edit.notes;

    const results = entry.testResults ?? [];
    const found = results.find(
      (r) =>
        r.periodYear === selectedYear && r.periodMonth === selectedMonth,
    );
    return found?.notes ?? "";
  }

  /* ── Previous 3 months for mini-history ──────────────────────────────── */
  const prev3 = previousMonths(selectedYear, selectedMonth, 3);

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (entries.length === 0) {
    return (
      <div className="bento-card p-8 text-center text-gray-500">
        <p>No controls are currently in the testing schedule.</p>
        <p className="text-sm mt-1">
          Add controls to the testing schedule to begin recording results.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {entries.map((entry) => {
        const control = entry.control;
        const effectiveResult = getEffectiveResult(entry);
        const effectiveNotes = getEffectiveNotes(entry);
        const effectiveDate = getEffectiveDate(entry);
        const effectiveEvidenceLink = getEffectiveEvidenceLink(entry);
        const attestation = getAttestationForPeriod(entry);
        const isNotesExpanded = expandedNote === entry.id;
        const isHistoryExpanded = expandedHistory.has(entry.id);

        /* Discrepancy: owner attested but test result is FAIL */
        const hasDiscrepancy =
          attestation?.attested === true && effectiveResult === "FAIL";

        /* Result styling */
        const resultColours = effectiveResult
          ? TEST_RESULT_COLOURS[effectiveResult]
          : null;

        return (
          <div
            key={entry.id}
            className={`bento-card p-4 flex flex-col gap-3 transition-shadow ${
              hasDiscrepancy ? "ring-2 ring-amber-400" : ""
            }`}
          >
            {/* ── Header: Ref + Name ──────────────────────────────── */}
            <div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-sm font-semibold text-updraft-deep whitespace-nowrap">
                  {control?.controlRef ?? "—"}
                </span>
                <span className="text-sm font-poppins font-medium text-gray-900 line-clamp-2">
                  {control?.controlName ?? "—"}
                </span>
              </div>
            </div>

            {/* ── Metadata line ───────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
              <span className="font-medium text-gray-700">
                {control?.businessArea?.name ?? "—"}
              </span>
              <span aria-hidden="true">&middot;</span>
              <span>
                {control
                  ? CD_OUTCOME_LABELS[control.consumerDutyOutcome]
                  : "—"}
              </span>
              <span aria-hidden="true">&middot;</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {TESTING_FREQUENCY_LABELS[entry.testingFrequency]}
              </span>
              <span aria-hidden="true">&middot;</span>
              <span>{getTesterName(entry)}</span>
            </div>

            {/* ── Attestation status ──────────────────────────────── */}
            <div className="flex items-center gap-1.5 text-xs">
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  attestation?.attested
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              />
              <span
                className={
                  attestation?.attested
                    ? "text-green-700 font-medium"
                    : "text-gray-500"
                }
              >
                Owner Attestation:{" "}
                {attestation === null
                  ? "Not yet"
                  : attestation.attested
                    ? "Attested"
                    : "Pending"}
              </span>
              {attestation?.issuesFlagged && (
                <span className="ml-1 text-amber-600 font-medium">
                  (Issues flagged)
                </span>
              )}
            </div>

            {/* ── Current period result dropdown ──────────────────── */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {MONTH_ABBR[selectedMonth - 1]} {selectedYear}:
              </label>
              <div className="relative">
                <select
                  value={effectiveResult ?? ""}
                  onChange={(e) =>
                    onEditResult(
                      entry.id,
                      e.target.value as TestResultValue,
                    )
                  }
                  className={`w-full rounded-md border px-3 py-2 text-sm appearance-none pr-8 font-medium focus:outline-none focus:ring-2 focus:ring-updraft-deep/30 transition-colors ${
                    effectiveResult
                      ? `${resultColours?.bg ?? ""} ${resultColours?.text ?? ""} border-transparent`
                      : "border-gray-300 text-gray-500"
                  }`}
                >
                  <option value="">-- Select --</option>
                  {RESULT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {TEST_RESULT_LABELS[opt]}
                    </option>
                  ))}
                </select>

                {/* Colour dot */}
                {effectiveResult && (
                  <span
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${resultColours?.dot ?? ""}`}
                  />
                )}
              </div>
            </div>

            {/* ── 3-month history dots ────────────────────────────── */}
            <div className="flex items-center gap-3">
              {prev3.map(({ year: py, month: pm }) => {
                const histResult = getResultForPeriod(entry, py, pm);
                const dotColour = histResult
                  ? TEST_RESULT_COLOURS[histResult].dot
                  : "bg-gray-300";
                const label = histResult
                  ? TEST_RESULT_LABELS[histResult]
                  : "No result";
                return (
                  <div
                    key={`${py}-${pm}`}
                    className="flex items-center gap-1 text-xs text-gray-500"
                    title={`${MONTH_ABBR[pm - 1]} ${py}: ${label}`}
                  >
                    <span>{MONTH_ABBR[pm - 1]}:</span>
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${dotColour}`}
                    />
                    {histResult && (
                      <span className="text-[10px] text-gray-400">
                        {TEST_RESULT_LABELS[histResult]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Discrepancy warning ─────────────────────────────── */}
            {hasDiscrepancy && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>
                  Owner attested this control is operating effectively, but
                  the test result is <strong>Fail</strong>. Please investigate
                  the discrepancy.
                </span>
              </div>
            )}

            {/* ── Action buttons ──────────────────────────────────── */}
            <div className="flex items-center gap-2 mt-auto pt-1 border-t border-gray-100">
              {/* Quick Record button — opens primary recording modal */}
              {onOpenRecordModal && (
                <button
                  onClick={() => onOpenRecordModal(entry.id)}
                  title="Record result"
                  className="h-7 w-7 rounded-full bg-updraft-bright-purple text-white flex items-center justify-center text-base font-semibold hover:bg-updraft-deep transition-colors shrink-0"
                >
                  +
                </button>
              )}
              {/* Inline notes toggle */}
              <button
                onClick={() => onToggleNote(entry.id)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isNotesExpanded
                    ? "bg-updraft-deep/10 text-updraft-deep"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                {effectiveNotes.trim() ? "Notes" : "Notes"}
                {effectiveNotes.trim() && !isNotesExpanded && (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-updraft-bright-purple" />
                )}
              </button>

              <button
                onClick={() => toggleHistory(entry.id)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isHistoryExpanded
                    ? "bg-updraft-deep/10 text-updraft-deep"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                {isHistoryExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                History
              </button>

              <div className="ml-auto flex items-center gap-1.5">
                {/* Risk Acceptance */}
                {onCreateRiskAcceptance && (
                  <button
                    onClick={() => onCreateRiskAcceptance(entry)}
                    className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    <ShieldQuestion className="w-3.5 h-3.5" />
                    Risk Acceptance
                  </button>
                )}
                {/* Create Action */}
                {onCreateAction && (
                  <button
                    onClick={() => onCreateAction(entry)}
                    className="inline-flex items-center gap-1 rounded-md bg-updraft-pale-purple px-2.5 py-1.5 text-xs font-medium text-updraft-deep hover:bg-updraft-light-purple transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Action
                  </button>
                )}
              </div>
            </div>

            {/* ── Expanded edit fields ────────────────────────────── */}
            {isNotesExpanded && (
              <div className="space-y-2">
                {/* Date tested */}
                {onEditEffectiveDate && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date tested</label>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => onEditEffectiveDate(entry.id, e.target.value)}
                      className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
                    />
                  </div>
                )}
                {/* Evidence link */}
                {onEditEvidenceLink && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Evidence (Google Drive link)</label>
                    <input
                      type="url"
                      value={effectiveEvidenceLink}
                      onChange={(e) => onEditEvidenceLink(entry.id, e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
                    />
                  </div>
                )}
                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea
                    value={effectiveNotes}
                    onChange={(e) => onEditNotes(entry.id, e.target.value)}
                    placeholder="Enter testing notes, observations, or evidence references..."
                    rows={3}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30 resize-y"
                  />
                  {(effectiveResult === "FAIL" ||
                    effectiveResult === "PARTIALLY") &&
                    !effectiveNotes.trim() && (
                      <p className="mt-1 text-xs text-amber-600">
                        Notes are required for{" "}
                        {effectiveResult
                          ? TEST_RESULT_LABELS[effectiveResult]
                          : ""}{" "}
                        results.
                      </p>
                    )}
                </div>
              </div>
            )}

            {/* ── Expanded history panel ──────────────────────────── */}
            {isHistoryExpanded && (
              <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Full Test History
                </p>
                {(entry.testResults ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No previous test results recorded.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {(entry.testResults ?? [])
                      .slice()
                      .sort((a, b) => {
                        if (a.periodYear !== b.periodYear)
                          return b.periodYear - a.periodYear;
                        return b.periodMonth - a.periodMonth;
                      })
                      .map((tr: ControlTestResult) => {
                        const colours = TEST_RESULT_COLOURS[tr.result];
                        return (
                          <div
                            key={tr.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="w-16 text-gray-500">
                              {MONTH_ABBR[tr.periodMonth - 1]}{" "}
                              {tr.periodYear}
                            </span>
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${colours.dot}`}
                            />
                            <span className={colours.text}>
                              {TEST_RESULT_LABELS[tr.result]}
                            </span>
                            {tr.notes && (
                              <span
                                className="text-gray-400 truncate max-w-[120px]"
                                title={tr.notes}
                              >
                                — {tr.notes}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
