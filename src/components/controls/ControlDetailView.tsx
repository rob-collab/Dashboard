"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type {
  TestingScheduleEntry,
  ControlTestResult,
  TestResultValue,
  QuarterlySummaryRecord,
} from "@/lib/types";
import {
  TEST_RESULT_LABELS,
  CD_OUTCOME_LABELS,
  TESTING_FREQUENCY_LABELS,
  CONTROL_FREQUENCY_LABELS,
} from "@/lib/types";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Pencil,
  AlertTriangle,
  ExternalLink,
  Clock,
  ShieldCheck,
  FileText,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

/* ── Result colour maps ──────────────────────────────────────────────────── */

const RESULT_BG: Record<TestResultValue, string> = {
  PASS: "bg-green-500",
  FAIL: "bg-red-500",
  PARTIALLY: "bg-amber-500",
  NOT_TESTED: "bg-gray-400",
  NOT_DUE: "bg-gray-200",
};

const RESULT_TEXT: Record<TestResultValue, string> = {
  PASS: "text-green-700 bg-green-100",
  FAIL: "text-red-700 bg-red-100",
  PARTIALLY: "text-amber-700 bg-amber-100",
  NOT_TESTED: "text-gray-600 bg-gray-100",
  NOT_DUE: "text-gray-400 bg-gray-50",
};

/* ── Short month names ───────────────────────────────────────────────────── */

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ── Quarterly summary status badge colours ──────────────────────────────── */

const SUMMARY_STATUS_COLOURS: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Build an array of { year, month } for the 12-month window ending at the selected period. */
function buildTrendMonths(
  selectedYear: number,
  selectedMonth: number,
): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  for (let offset = 11; offset >= 0; offset--) {
    let m = selectedMonth - offset;
    let y = selectedYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push({ year: y, month: m });
  }
  return months;
}

/** Build an array of { year, month } going back 24 months from the selected period. */
function buildHistoryMonths(
  selectedYear: number,
  selectedMonth: number,
): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  for (let offset = 0; offset < 24; offset++) {
    let m = selectedMonth - offset;
    let y = selectedYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push({ year: y, month: m });
  }
  return months;
}

/** Find the test result for a given period from the entry's results. */
function getResultForPeriod(
  entry: TestingScheduleEntry,
  year: number,
  month: number,
): ControlTestResult | undefined {
  return entry.testResults?.find(
    (r) => r.periodYear === year && r.periodMonth === month,
  );
}

/** Get the TestResultValue for a period, defaulting to NOT_DUE. */
function getResultValueForPeriod(
  entry: TestingScheduleEntry,
  year: number,
  month: number,
): TestResultValue {
  const result = getResultForPeriod(entry, year, month);
  return result?.result ?? "NOT_DUE";
}

/** Check for 3+ consecutive failures in the 12-month trend. */
function hasConsecutiveFailures(
  entry: TestingScheduleEntry,
  trendMonths: { year: number; month: number }[],
): boolean {
  let consecutiveFails = 0;
  for (const { year, month } of trendMonths) {
    const val = getResultValueForPeriod(entry, year, month);
    if (val === "FAIL") {
      consecutiveFails++;
      if (consecutiveFails >= 3) return true;
    } else {
      consecutiveFails = 0;
    }
  }
  return false;
}

/** Format a period label like "January 2026". */
function periodLabel(year: number, month: number): string {
  return `${LONG_MONTHS[month - 1]} ${year}`;
}

/** Format a quarter label like "Q1 2026". */
function formatQuarterLabel(quarter: string): string {
  // quarter is stored as e.g. "2026-Q1"
  const parts = quarter.split("-");
  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`;
  }
  return quarter;
}

/* ── Props ────────────────────────────────────────────────────────────────── */

interface ControlDetailViewProps {
  scheduleEntryId: string;
  onBack: () => void;
  backLabel: string;
  selectedYear: number;
  selectedMonth: number;
}

/* ── Component ────────────────────────────────────────────────────────────── */

export default function ControlDetailView({
  scheduleEntryId,
  onBack,
  backLabel,
  selectedYear,
  selectedMonth,
}: ControlDetailViewProps) {
  const testingSchedule = useAppStore((s) => s.testingSchedule);
  const users = useAppStore((s) => s.users);
  const controls = useAppStore((s) => s.controls);

  /* ── Expanded-state management ─────────────────────────────────────────── */

  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    // Most recent month expanded by default
    return new Set([`${selectedYear}-${selectedMonth}`]);
  });

  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(
    new Set(),
  );

  /* ── Derived data ──────────────────────────────────────────────────────── */

  const entry = useMemo(
    () => testingSchedule.find((e) => e.id === scheduleEntryId),
    [testingSchedule, scheduleEntryId],
  );

  const control = useMemo(() => {
    if (entry?.control) return entry.control;
    if (entry?.controlId) {
      return controls.find((c) => c.id === entry.controlId) ?? null;
    }
    return null;
  }, [entry, controls]);

  const trendMonths = useMemo(
    () => buildTrendMonths(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  const historyMonths = useMemo(
    () => buildHistoryMonths(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  const showConsecutiveFailWarning = useMemo(() => {
    if (!entry) return false;
    return hasConsecutiveFailures(entry, trendMonths);
  }, [entry, trendMonths]);

  /** Filter history months to only show those with a test result or the current period. */
  const visibleHistoryMonths = useMemo(() => {
    if (!entry) return [];
    return historyMonths.filter(({ year, month }) => {
      // Always show the current period
      if (year === selectedYear && month === selectedMonth) return true;
      // Show months that have a recorded result
      const result = getResultForPeriod(entry, year, month);
      return result !== undefined;
    });
  }, [entry, historyMonths, selectedYear, selectedMonth]);

  const quarterlySummaries = useMemo(() => {
    return entry?.quarterlySummaries ?? [];
  }, [entry]);

  /** Current-period attestation status for the control owner. */
  const ownerAttestation = useMemo(() => {
    if (!control?.attestations) return null;
    return control.attestations.find(
      (a) => a.periodYear === selectedYear && a.periodMonth === selectedMonth,
    ) ?? null;
  }, [control, selectedYear, selectedMonth]);

  /* ── Toggle helpers ────────────────────────────────────────────────────── */

  function toggleMonth(year: number, month: number) {
    const key = `${year}-${month}`;
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleSummary(summaryId: string) {
    setExpandedSummaries((prev) => {
      const next = new Set(prev);
      if (next.has(summaryId)) {
        next.delete(summaryId);
      } else {
        next.add(summaryId);
      }
      return next;
    });
  }

  /* ── User lookup helper ────────────────────────────────────────────────── */

  function getUserName(userId: string | null | undefined): string {
    if (!userId) return "\u2014";
    const user = users.find((u) => u.id === userId);
    return user?.name ?? "\u2014";
  }

  /* ── Guard: entry not found ────────────────────────────────────────────── */

  if (!entry) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-updraft-deep hover:text-updraft-bright-purple transition-colors"
        >
          <ArrowLeft size={16} />
          Back to {backLabel}
        </button>
        <div className="bento-card p-8 text-center text-gray-500">
          <p>Schedule entry not found.</p>
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ── Back navigation ──────────────────────────────────────────────── */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-updraft-deep hover:text-updraft-bright-purple transition-colors"
      >
        <ArrowLeft size={16} />
        Back to {backLabel}
      </button>

      {/* ── Control header ───────────────────────────────────────────────── */}
      <div className="bento-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-gray-500">
                {control?.controlRef ?? "\u2014"}
              </span>
            </div>
            <h2 className="text-xl font-poppins font-semibold text-updraft-deep">
              {control?.controlName ?? "Unknown Control"}
            </h2>
          </div>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            title="Edit control"
          >
            <Pencil size={14} />
            Edit
          </button>
        </div>

        {/* Detail grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Business Area
            </dt>
            <dd className="mt-0.5 text-sm text-gray-800">
              {control?.businessArea?.name ?? "\u2014"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Consumer Duty Outcome
            </dt>
            <dd className="mt-0.5 text-sm text-gray-800">
              {control?.consumerDutyOutcome
                ? CD_OUTCOME_LABELS[control.consumerDutyOutcome]
                : "\u2014"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Control Frequency
            </dt>
            <dd className="mt-0.5 text-sm text-gray-800">
              {control?.controlFrequency
                ? CONTROL_FREQUENCY_LABELS[control.controlFrequency]
                : "\u2014"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Testing Frequency
            </dt>
            <dd className="mt-0.5 text-sm text-gray-800">
              {TESTING_FREQUENCY_LABELS[entry.testingFrequency]}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assigned Tester
            </dt>
            <dd className="mt-0.5 text-sm text-gray-800">
              {entry.assignedTester?.name ?? getUserName(entry.assignedTesterId)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Internal / Third Party
            </dt>
            <dd className="mt-0.5 text-sm text-gray-800">
              {control?.internalOrThirdParty === "INTERNAL"
                ? "Internal"
                : control?.internalOrThirdParty === "THIRD_PARTY"
                  ? "Third Party"
                  : "\u2014"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Control Owner
            </dt>
            <dd className="mt-0.5 text-sm text-gray-800">
              {control?.controlOwner?.name ??
                getUserName(control?.controlOwnerId ?? null)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Owner Attestation ({periodLabel(selectedYear, selectedMonth)})
            </dt>
            <dd className="mt-0.5 text-sm">
              {ownerAttestation ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    ownerAttestation.attested
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <ShieldCheck size={12} />
                  {ownerAttestation.attested ? "Attested" : "Pending"}
                </span>
              ) : (
                <span className="text-gray-400 text-xs">No attestation</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              CCRO Review ({periodLabel(selectedYear, selectedMonth)})
            </dt>
            <dd className="mt-0.5 text-sm">
              {ownerAttestation?.ccroAgreement !== null &&
              ownerAttestation?.ccroAgreement !== undefined ? (
                <div className="space-y-1">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      ownerAttestation.ccroAgreement
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {ownerAttestation.ccroAgreement ? (
                      <>
                        <ThumbsUp size={12} />
                        CCRO Agrees
                      </>
                    ) : (
                      <>
                        <ThumbsDown size={12} />
                        CCRO Disagrees
                      </>
                    )}
                  </span>
                  {ownerAttestation.ccroComments && (
                    <p className="text-xs text-gray-600 mt-1">
                      {ownerAttestation.ccroComments}
                    </p>
                  )}
                  {ownerAttestation.ccroReviewedAt && (
                    <p className="text-[10px] text-gray-400">
                      Reviewed{" "}
                      {new Date(ownerAttestation.ccroReviewedAt).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                      {ownerAttestation.ccroReviewedBy?.name &&
                        ` by ${ownerAttestation.ccroReviewedBy.name}`}
                    </p>
                  )}
                </div>
              ) : ownerAttestation ? (
                <span className="text-gray-400 text-xs">
                  Awaiting CCRO Review
                </span>
              ) : (
                <span className="text-gray-400 text-xs">{"\u2014"}</span>
              )}
            </dd>
          </div>
        </div>

        {/* Summary of Test */}
        {entry.summaryOfTest && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Summary of Test
            </dt>
            <dd className="text-sm text-gray-700 whitespace-pre-wrap">
              {entry.summaryOfTest}
            </dd>
          </div>
        )}

        {/* Standing Comments */}
        {(entry.standingComments || control?.standingComments) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Standing Comments
            </dt>
            <dd className="text-sm text-gray-700 whitespace-pre-wrap">
              {entry.standingComments ?? control?.standingComments}
            </dd>
          </div>
        )}
      </div>

      {/* ── 12-Month Trend Timeline ──────────────────────────────────────── */}
      <div className="bento-card p-5">
        <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4">
          12-Month Trend
        </h3>

        {/* 2LOD result row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs font-medium text-gray-500 shrink-0 w-10">
            2LOD:
          </span>
          <div className="flex items-end gap-3">
            {trendMonths.map(({ year, month }) => {
              const resultVal = getResultValueForPeriod(entry, year, month);
              return (
                <div
                  key={`trend-${year}-${month}`}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-5 h-5 rounded-full ${RESULT_BG[resultVal]} shrink-0`}
                    title={`${SHORT_MONTHS[month - 1]} ${year}: ${TEST_RESULT_LABELS[resultVal]}`}
                  />
                  <span className="text-[10px] text-gray-500 leading-none">
                    {SHORT_MONTHS[month - 1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Owner attestation row (if control has attestations) */}
        {control?.attestations && control.attestations.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto mt-3 pt-3 border-t border-gray-100 pb-2">
            <span className="text-xs font-medium text-gray-500 shrink-0 w-10">
              Owner:
            </span>
            <div className="flex items-end gap-3">
              {trendMonths.map(({ year, month }) => {
                const attestation = control.attestations?.find(
                  (a) => a.periodYear === year && a.periodMonth === month,
                );
                const attested = attestation?.attested ?? false;
                const hasAttestation = !!attestation;
                return (
                  <div
                    key={`att-${year}-${month}`}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-5 h-5 rounded-full shrink-0 ${
                        hasAttestation
                          ? attested
                            ? "bg-green-500"
                            : "bg-amber-500"
                          : "bg-gray-200"
                      }`}
                      title={`${SHORT_MONTHS[month - 1]} ${year}: ${
                        hasAttestation
                          ? attested
                            ? "Attested"
                            : "Pending"
                          : "No attestation"
                      }`}
                    />
                    <span className="text-[10px] text-gray-500 leading-none">
                      {SHORT_MONTHS[month - 1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trend legend */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3">
          {(
            ["PASS", "FAIL", "PARTIALLY", "NOT_TESTED", "NOT_DUE"] as TestResultValue[]
          ).map((val) => (
            <div key={val} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${RESULT_BG[val]}`} />
              <span className="text-[10px] text-gray-500">
                {TEST_RESULT_LABELS[val]}
              </span>
            </div>
          ))}
        </div>

        {/* Consecutive failure warning */}
        {showConsecutiveFailWarning && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <span>
              <strong>Persistent failures detected:</strong> This control has
              failed 3 or more consecutive months. Immediate attention required.
            </span>
          </div>
        )}
      </div>

      {/* ── Monthly Results Accordion ────────────────────────────────────── */}
      <div className="bento-card p-5">
        <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          Monthly Results
        </h3>

        {visibleHistoryMonths.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">
            No test results recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleHistoryMonths.map(({ year, month }) => {
              const key = `${year}-${month}`;
              const isExpanded = expandedMonths.has(key);
              const result = getResultForPeriod(entry, year, month);
              const resultVal = result?.result ?? "NOT_DUE";
              const testerName = result?.testedBy?.name ??
                getUserName(result?.testedById ?? null);
              const isCurrentPeriod =
                year === selectedYear && month === selectedMonth;

              return (
                <div key={key}>
                  {/* Accordion row header */}
                  <button
                    onClick={() => toggleMonth(year, month)}
                    className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-400 shrink-0" />
                    )}

                    <span className="text-sm font-medium text-gray-800 min-w-[140px]">
                      {periodLabel(year, month)}
                      {isCurrentPeriod && (
                        <span className="ml-2 text-[10px] font-semibold text-updraft-bright-purple uppercase">
                          Current
                        </span>
                      )}
                    </span>

                    {/* Result badge */}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${RESULT_TEXT[resultVal]}`}
                    >
                      {TEST_RESULT_LABELS[resultVal]}
                    </span>

                    {result && (
                      <>
                        <span className="text-xs text-gray-500 ml-auto">
                          {testerName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(result.testedDate).toLocaleDateString("en-GB")}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="pl-8 pr-2 pb-4 space-y-2">
                      {result ? (
                        <>
                          {/* Notes */}
                          {result.notes && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">
                                Notes:
                              </span>
                              <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">
                                {result.notes}
                              </p>
                            </div>
                          )}

                          {/* Evidence links */}
                          {result.evidenceLinks &&
                            result.evidenceLinks.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">
                                  Evidence:
                                </span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {result.evidenceLinks.map((link, idx) => (
                                    <a
                                      key={idx}
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-full bg-updraft-pale-purple/30 border border-updraft-light-purple/30 px-2.5 py-1 text-xs text-updraft-deep hover:bg-updraft-pale-purple/50 transition-colors"
                                    >
                                      <ExternalLink size={10} />
                                      {link.length > 40
                                        ? `${link.substring(0, 40)}...`
                                        : link}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Backdated indicator */}
                          {result.isBackdated && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600">
                              <AlertTriangle size={12} />
                              <span>This result was backdated</span>
                              {result.effectiveDate && (
                                <span className="text-gray-400">
                                  (effective date:{" "}
                                  {new Date(
                                    result.effectiveDate,
                                  ).toLocaleDateString("en-GB")}
                                  )
                                </span>
                              )}
                            </div>
                          )}

                          {/* Metadata row */}
                          <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                            <span>
                              Tested by: {testerName}
                            </span>
                            <span>
                              Date:{" "}
                              {new Date(result.testedDate).toLocaleDateString(
                                "en-GB",
                              )}
                            </span>
                            {result.updatedAt && (
                              <span>
                                Last updated:{" "}
                                {new Date(result.updatedAt).toLocaleDateString(
                                  "en-GB",
                                )}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          No result recorded for this period.
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

      {/* ── Quarterly Summaries Section ──────────────────────────────────── */}
      {quarterlySummaries.length > 0 && (
        <div className="bento-card p-5">
          <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-gray-400" />
            Quarterly Summaries
          </h3>

          <div className="divide-y divide-gray-100">
            {quarterlySummaries
              .slice()
              .sort((a, b) => b.quarter.localeCompare(a.quarter))
              .map((summary: QuarterlySummaryRecord) => {
                const isExpanded = expandedSummaries.has(summary.id);
                const authorName =
                  summary.author?.name ?? getUserName(summary.authorId);
                const statusLabel = summary.status.charAt(0) +
                  summary.status.slice(1).toLowerCase();
                const statusColour =
                  SUMMARY_STATUS_COLOURS[summary.status] ??
                  "bg-gray-100 text-gray-600";

                return (
                  <div key={summary.id}>
                    {/* Summary row header */}
                    <button
                      onClick={() => toggleSummary(summary.id)}
                      className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50/50 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown
                          size={16}
                          className="text-gray-400 shrink-0"
                        />
                      ) : (
                        <ChevronRight
                          size={16}
                          className="text-gray-400 shrink-0"
                        />
                      )}

                      <span className="text-sm font-medium text-gray-800">
                        {formatQuarterLabel(summary.quarter)}
                      </span>

                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColour}`}
                      >
                        {statusLabel}
                      </span>

                      <span className="text-xs text-gray-500 ml-auto">
                        {authorName}
                      </span>
                    </button>

                    {/* Expanded narrative */}
                    {isExpanded && (
                      <div className="pl-8 pr-2 pb-4 space-y-2">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {summary.narrative || (
                            <span className="italic text-gray-400">
                              No narrative entered.
                            </span>
                          )}
                        </p>

                        {/* Approved info */}
                        {summary.status === "APPROVED" &&
                          summary.approvedAt && (
                            <div className="text-xs text-gray-400">
                              Approved by{" "}
                              {summary.approvedBy?.name ??
                                getUserName(summary.approvedById ?? null)}{" "}
                              on{" "}
                              {new Date(
                                summary.approvedAt,
                              ).toLocaleDateString("en-GB")}
                            </div>
                          )}

                        {/* Timestamps */}
                        <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                          <span>
                            Created:{" "}
                            {new Date(summary.createdAt).toLocaleDateString(
                              "en-GB",
                            )}
                          </span>
                          {summary.updatedAt !== summary.createdAt && (
                            <span>
                              Updated:{" "}
                              {new Date(summary.updatedAt).toLocaleDateString(
                                "en-GB",
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
