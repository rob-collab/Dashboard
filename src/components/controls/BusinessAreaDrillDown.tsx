"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type {
  TestingScheduleEntry,
  TestResultValue,
} from "@/lib/types";
import {
  TEST_RESULT_LABELS,
  TEST_RESULT_COLOURS,
  CD_OUTCOME_LABELS,
  TESTING_FREQUENCY_LABELS,
  CONTROL_FREQUENCY_LABELS,
} from "@/lib/types";
import { ArrowLeft, AlertTriangle, ChevronRight, ThumbsDown } from "lucide-react";

// ── Props ────────────────────────────────────────────────────────────────────

interface BusinessAreaDrillDownProps {
  areaId: string;
  areaName: string;
  selectedYear: number;
  selectedMonth: number;
  onBack: () => void;
  onSelectControl: (scheduleEntryId: string) => void;
}

// ── Chart colour mapping (hex values for the stacked bar) ────────────────────

const RESULT_COLOURS: Record<TestResultValue, string> = {
  PASS: "#22c55e",     // green
  FAIL: "#ef4444",     // red
  PARTIALLY: "#f59e0b", // amber
  NOT_TESTED: "#9ca3af", // grey
  NOT_DUE: "#d1d5db",   // light grey
};

// ── Month helpers ────────────────────────────────────────────────────────────

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Get the test result for a specific period. Falls back to NOT_DUE if none found. */
function getResultForPeriod(
  entry: TestingScheduleEntry,
  year: number,
  month: number,
): TestResultValue {
  const results = entry.testResults ?? [];
  const match = results.find(
    (r) => r.periodYear === year && r.periodMonth === month,
  );
  return match?.result ?? "NOT_DUE";
}

/** Build the last 12 months as {year, month} pairs, from 11 months ago to current. */
function buildLast12Months(
  year: number,
  month: number,
): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  for (let offset = 11; offset >= 0; offset--) {
    let m = month - offset;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push({ year: y, month: m });
  }
  return months;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function BusinessAreaDrillDown({
  areaId,
  areaName,
  selectedYear,
  selectedMonth,
  onBack,
  onSelectControl,
}: BusinessAreaDrillDownProps) {
  const testingSchedule = useAppStore((s) => s.testingSchedule);
  const controls = useAppStore((s) => s.controls);

  // ── Filtered entries for this business area ────────────────────────────────

  const areaEntries = useMemo(
    () =>
      testingSchedule.filter(
        (e) => e.isActive && e.control?.businessAreaId === areaId,
      ),
    [testingSchedule, areaId],
  );

  // ── 12-month window ────────────────────────────────────────────────────────

  const last12 = useMemo(
    () => buildLast12Months(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  // ── Current-period result per entry ────────────────────────────────────────

  const entryResults = useMemo(
    () =>
      areaEntries.map((entry) => ({
        entry,
        result: getResultForPeriod(entry, selectedYear, selectedMonth),
      })),
    [areaEntries, selectedYear, selectedMonth],
  );

  // ── Overall stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const counts: Record<TestResultValue, number> = {
      PASS: 0,
      FAIL: 0,
      PARTIALLY: 0,
      NOT_TESTED: 0,
      NOT_DUE: 0,
    };
    for (const { result } of entryResults) {
      counts[result] += 1;
    }
    const total = entryResults.length;
    return { counts, total };
  }, [entryResults]);

  // ── Attestation data (from controls array, keyed by controlId) ─────────────

  const attestationMap = useMemo(() => {
    const map = new Map<string, { attested: boolean; ccroAgreement: boolean | null }>();
    for (const ctrl of controls) {
      const attestations = ctrl.attestations ?? [];
      const match = attestations.find(
        (a) =>
          a.periodYear === selectedYear &&
          a.periodMonth === selectedMonth &&
          a.attested,
      );
      map.set(ctrl.id, {
        attested: !!match,
        ccroAgreement: match?.ccroAgreement ?? null,
      });
    }
    return map;
  }, [controls, selectedYear, selectedMonth]);

  // ── Attestation completion rate ────────────────────────────────────────────

  const attestationRate = useMemo(() => {
    if (areaEntries.length === 0)
      return { attested: 0, ccroAgreed: 0, total: 0, pct: "0%", ccroPct: "0%" };
    let attested = 0;
    let ccroAgreed = 0;
    for (const entry of areaEntries) {
      const data = attestationMap.get(entry.controlId);
      if (data?.attested) {
        attested += 1;
        if (data.ccroAgreement === true) ccroAgreed += 1;
      }
    }
    const pct =
      areaEntries.length > 0
        ? `${Math.round((attested / areaEntries.length) * 100)}%`
        : "0%";
    const ccroPct =
      areaEntries.length > 0
        ? `${Math.round((ccroAgreed / areaEntries.length) * 100)}%`
        : "0%";
    return { attested, ccroAgreed, total: areaEntries.length, pct, ccroPct };
  }, [areaEntries, attestationMap]);

  // ── Overall pass rate bar segments ─────────────────────────────────────────

  const passRateSegments = useMemo(() => {
    const order: TestResultValue[] = [
      "PASS",
      "PARTIALLY",
      "FAIL",
      "NOT_TESTED",
      "NOT_DUE",
    ];
    return order
      .filter((k) => stats.counts[k] > 0)
      .map((k) => ({
        key: k,
        count: stats.counts[k],
        pct: stats.total > 0 ? (stats.counts[k] / stats.total) * 100 : 0,
        colour: RESULT_COLOURS[k],
        label: TEST_RESULT_LABELS[k],
      }));
  }, [stats]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Back navigation & header ────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colours"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-poppins font-bold text-updraft-deep">
            {areaName}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.total} tested control{stats.total !== 1 ? "s" : ""} in this
            business area
          </p>
        </div>
        <div className="text-sm text-gray-500 space-y-0.5 text-right">
          <div>
            Owner Attested:{" "}
            <span className="font-semibold text-updraft-deep">
              {attestationRate.pct}
            </span>{" "}
            ({attestationRate.attested} / {attestationRate.total})
          </div>
          <div>
            CCRO Agreed:{" "}
            <span className="font-semibold text-green-600">
              {attestationRate.ccroPct}
            </span>{" "}
            ({attestationRate.ccroAgreed} / {attestationRate.total})
          </div>
        </div>
      </div>

      {/* ── Overall pass rate progress bar ──────────────────────────────────── */}
      {stats.total > 0 && (
        <div className="bento-card p-4">
          <h3 className="text-xs font-poppins font-semibold text-gray-600 mb-2">
            Overall Pass Rate
          </h3>
          <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-100">
            {passRateSegments.map((seg) => (
              <div
                key={seg.key}
                className="h-full transition-all duration-300"
                style={{
                  width: `${seg.pct}%`,
                  backgroundColor: seg.colour,
                  minWidth: seg.pct > 0 ? "4px" : "0px",
                }}
                title={`${seg.label}: ${seg.count} (${Math.round(seg.pct)}%)`}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {passRateSegments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: seg.colour }}
                />
                {seg.label}: {seg.count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Control cards ───────────────────────────────────────────────────── */}
      {areaEntries.length === 0 ? (
        <div className="bento-card flex items-center justify-center py-16 text-sm text-gray-400">
          No active tested controls in this business area.
        </div>
      ) : (
        <div className="space-y-3">
          {entryResults.map(({ entry, result }) => {
            const controlRef = entry.control?.controlRef ?? "—";
            const controlName = entry.control?.controlName ?? "Unknown Control";
            const testerName = entry.assignedTester?.name ?? "—";
            const ownerName = entry.control?.controlOwner?.name ?? "—";
            const cdOutcome = entry.control?.consumerDutyOutcome;
            const cdLabel = cdOutcome ? CD_OUTCOME_LABELS[cdOutcome] : "—";
            const controlFreq = entry.control?.controlFrequency;
            const controlFreqLabel = controlFreq
              ? CONTROL_FREQUENCY_LABELS[controlFreq]
              : "—";
            const testingFreqLabel =
              TESTING_FREQUENCY_LABELS[entry.testingFrequency] ?? "—";

            const attestData = attestationMap.get(entry.controlId);
            const isAttested = attestData?.attested ?? false;
            const hasCCRODisagreement = isAttested && attestData?.ccroAgreement === false;
            const resultColours = TEST_RESULT_COLOURS[result];

            // Discrepancy: attested but failed
            const hasDiscrepancy = isAttested && result === "FAIL";

            return (
              <div
                key={entry.id}
                onClick={() => onSelectControl(entry.id)}
                className="bento-card p-4 hover:shadow-md hover:border-updraft-pale-purple cursor-pointer transition-all group"
              >
                {/* ── Top row: ref, name, badge, attestation ─────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                  <span className="text-xs font-mono font-semibold text-gray-500 shrink-0">
                    {controlRef}
                  </span>
                  <h4 className="text-sm font-poppins font-semibold text-gray-800 flex-1 truncate">
                    {controlName}
                  </h4>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Current result badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${resultColours.bg} ${resultColours.text}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${resultColours.dot}`} />
                      {TEST_RESULT_LABELS[result]}
                    </span>
                    {/* Attestation status */}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isAttested
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-50 text-gray-400"
                      }`}
                    >
                      {isAttested ? "Attested" : "Not Attested"}
                    </span>
                  </div>
                </div>

                {/* ── Detail row: CD outcome, frequency, tester, owner ──── */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 mb-3">
                  <span>
                    <span className="font-medium text-gray-600">CD Outcome:</span>{" "}
                    {cdLabel}
                  </span>
                  <span>
                    <span className="font-medium text-gray-600">Control Freq:</span>{" "}
                    {controlFreqLabel}
                  </span>
                  <span>
                    <span className="font-medium text-gray-600">Testing Freq:</span>{" "}
                    {testingFreqLabel}
                  </span>
                  <span>
                    <span className="font-medium text-gray-600">Tester:</span>{" "}
                    {testerName}
                  </span>
                  <span>
                    <span className="font-medium text-gray-600">Owner:</span>{" "}
                    {ownerName}
                  </span>
                </div>

                {/* ── 12-month trend line ────────────────────────────────── */}
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] text-gray-400 mr-1 shrink-0">
                    Trend:
                  </span>
                  {last12.map((period) => {
                    const periodResult = getResultForPeriod(
                      entry,
                      period.year,
                      period.month,
                    );
                    const dotColour = TEST_RESULT_COLOURS[periodResult];
                    const monthLabel = SHORT_MONTHS[period.month - 1];
                    const yearLabel = String(period.year).slice(-2);
                    return (
                      <div
                        key={`${period.year}-${period.month}`}
                        className="flex flex-col items-center gap-0.5"
                        title={`${monthLabel} ${period.year}: ${TEST_RESULT_LABELS[periodResult]}`}
                      >
                        <span
                          className={`w-3 h-3 rounded-full ${dotColour.dot}`}
                        />
                        <span className="text-[8px] text-gray-400 leading-none">
                          {monthLabel.slice(0, 1)}
                          {yearLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* ── Discrepancy warning ────────────────────────────────── */}
                {hasDiscrepancy && (
                  <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs text-amber-700 mb-2">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span>
                      Discrepancy: owner has attested but the control failed
                      testing this period.
                    </span>
                  </div>
                )}

                {/* ── CCRO Disagreement warning ───────────────────────────── */}
                {hasCCRODisagreement && (
                  <div className="flex items-center gap-1.5 rounded-md bg-orange-50 border border-orange-200 px-2.5 py-1.5 text-xs text-orange-700 mb-2">
                    <ThumbsDown size={13} className="shrink-0" />
                    <span>
                      CCRO Disagrees: the CCRO team does not agree with this attestation.
                    </span>
                  </div>
                )}

                {/* ── View link ──────────────────────────────────────────── */}
                <div className="flex justify-end">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-updraft-bright-purple group-hover:text-updraft-deep transition-colours">
                    View
                    <ChevronRight
                      size={14}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
