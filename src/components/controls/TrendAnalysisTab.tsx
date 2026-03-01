"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  TEST_RESULT_LABELS,
  CD_OUTCOME_LABELS,
} from "@/lib/types";
import type {
  TestResultValue,
  TestingScheduleEntry,
  ConsumerDutyOutcomeType,
} from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  CalendarRange,
  Clock,
  ShieldAlert,
  ArrowUpCircle,
} from "lucide-react";
import { ScrollChart } from "@/components/common/ScrollChart";

// ── Constants ──────────────────────────────────────────────────────────────────

const CHART_COLOURS = {
  primary: "#6C2BD9",     // updraft-bright-purple
  secondary: "#4F46E5",   // indigo
  pass: "#22C55E",        // green-500
  fail: "#EF4444",        // red-500
  partially: "#F59E0B",   // amber-500
  notTested: "#9CA3AF",   // gray-400
};

const AREA_PALETTE = [
  "#6C2BD9", "#4F46E5", "#0EA5E9", "#14B8A6", "#F97316",
  "#EC4899", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
];

const CD_OUTCOME_PALETTE: Record<ConsumerDutyOutcomeType, string> = {
  PRODUCTS_AND_SERVICES: "#6C2BD9",
  PRICE_AND_VALUE: "#F97316",
  CONSUMER_UNDERSTANDING: "#4F46E5",
  CONSUMER_SUPPORT: "#0EA5E9",
  GOVERNANCE_CULTURE_OVERSIGHT: "#14B8A6",
};

type TimeRange = "6m" | "12m" | "all";

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "6m": "Last 6 Months",
  "12m": "Last 12 Months",
  all: "All Time",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

interface MonthKey {
  year: number;
  month: number;
  label: string;
  sortKey: number; // year * 100 + month
}

/** Build a sorted list of months from schedule data. */
function buildMonthRange(
  entries: TestingScheduleEntry[],
  timeRange: TimeRange,
): MonthKey[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  if (timeRange === "all") {
    // Scan all test results to find earliest month
    let minSort = currentYear * 100 + currentMonth;
    let maxSort = currentYear * 100 + currentMonth;
    for (const entry of entries) {
      for (const r of entry.testResults ?? []) {
        const sk = r.periodYear * 100 + r.periodMonth;
        if (sk < minSort) minSort = sk;
        if (sk > maxSort) maxSort = sk;
      }
    }
    const startYear = Math.floor(minSort / 100);
    const startMonth = minSort % 100;
    const endYear = Math.floor(maxSort / 100);
    const endMonth = maxSort % 100;

    const months: MonthKey[] = [];
    let y = startYear;
    let m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const d = new Date(y, m - 1, 1);
      months.push({
        year: y,
        month: m,
        label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
        sortKey: y * 100 + m,
      });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return months.length > 0 ? months : buildFixedRange(currentYear, currentMonth, 6);
  }

  const count = timeRange === "6m" ? 6 : 12;
  return buildFixedRange(currentYear, currentMonth, count);
}

function buildFixedRange(endYear: number, endMonth: number, count: number): MonthKey[] {
  const months: MonthKey[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    let m = endMonth - offset;
    let y = endYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const d = new Date(y, m - 1, 1);
    months.push({
      year: y,
      month: m,
      label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      sortKey: y * 100 + m,
    });
  }
  return months;
}

/** Get the test result for a specific schedule entry in a given period. */
function getResultForPeriod(
  entry: TestingScheduleEntry,
  year: number,
  month: number,
): TestResultValue {
  const match = (entry.testResults ?? []).find(
    (r) => r.periodYear === year && r.periodMonth === month,
  );
  return match?.result ?? "NOT_DUE";
}

/** Get the latest notes for a schedule entry in a given period. */
function getNotesForPeriod(
  entry: TestingScheduleEntry,
  year: number,
  month: number,
): string | null {
  const match = (entry.testResults ?? []).find(
    (r) => r.periodYear === year && r.periodMonth === month,
  );
  return match?.notes ?? null;
}

// ── Tooltip styling ────────────────────────────────────────────────────────────

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TrendAnalysisTab() {
  const testingSchedule = useAppStore((s) => s.testingSchedule);
  const [timeRange, setTimeRange] = useState<TimeRange>("12m");

  const activeEntries = useMemo(
    () => testingSchedule.filter((e) => e.isActive),
    [testingSchedule],
  );

  const monthRange = useMemo(
    () => buildMonthRange(activeEntries, timeRange),
    [activeEntries, timeRange],
  );

  // ── 1. Overall Pass Rate Over Time ──────────────────────────────────────────

  const overallPassRateData = useMemo(() => {
    return monthRange.map((mk) => {
      let pass = 0;
      let fail = 0;
      let partially = 0;
      let notTested = 0;

      for (const entry of activeEntries) {
        const result = getResultForPeriod(entry, mk.year, mk.month);
        switch (result) {
          case "PASS":
            pass++;
            break;
          case "FAIL":
            fail++;
            break;
          case "PARTIALLY":
            partially++;
            break;
          case "NOT_TESTED":
            notTested++;
            break;
          // NOT_DUE excluded from calculation
        }
      }

      const tested = pass + fail + partially + notTested;
      const passRate = tested > 0 ? Math.round((pass / tested) * 100) : 0;

      return {
        month: mk.label,
        passRate,
        pass,
        fail,
        partially,
        notTested,
        tested,
      };
    });
  }, [monthRange, activeEntries]);

  // ── 2. Pass Rate by Business Area ───────────────────────────────────────────

  const { businessAreaNames, businessAreaData } = useMemo(() => {
    // Collect unique business area names
    const areaSet = new Set<string>();
    for (const entry of activeEntries) {
      const name = entry.control?.businessArea?.name;
      if (name) areaSet.add(name);
    }
    const areaNames = Array.from(areaSet).sort();

    const data = monthRange.map((mk) => {
      const row: Record<string, string | number> = { month: mk.label };

      for (const areaName of areaNames) {
        let pass = 0;
        let totalTested = 0;

        for (const entry of activeEntries) {
          if (entry.control?.businessArea?.name !== areaName) continue;
          const result = getResultForPeriod(entry, mk.year, mk.month);
          if (result !== "NOT_DUE") {
            totalTested++;
            if (result === "PASS") pass++;
          }
        }

        row[areaName] = totalTested > 0 ? Math.round((pass / totalTested) * 100) : 0;
      }

      return row;
    });

    return { businessAreaNames: areaNames, businessAreaData: data };
  }, [monthRange, activeEntries]);

  // ── 3. Pass Rate by Consumer Duty Outcome ───────────────────────────────────

  const cdOutcomeData = useMemo(() => {
    const outcomeTypes: ConsumerDutyOutcomeType[] = [
      "PRODUCTS_AND_SERVICES",
      "CONSUMER_UNDERSTANDING",
      "CONSUMER_SUPPORT",
      "GOVERNANCE_CULTURE_OVERSIGHT",
    ];

    return monthRange.map((mk) => {
      const row: Record<string, string | number> = { month: mk.label };

      for (const ot of outcomeTypes) {
        let pass = 0;
        let totalTested = 0;

        for (const entry of activeEntries) {
          if (entry.control?.consumerDutyOutcome !== ot) continue;
          const result = getResultForPeriod(entry, mk.year, mk.month);
          if (result !== "NOT_DUE") {
            totalTested++;
            if (result === "PASS") pass++;
          }
        }

        row[CD_OUTCOME_LABELS[ot]] =
          totalTested > 0 ? Math.round((pass / totalTested) * 100) : 0;
      }

      return row;
    });
  }, [monthRange, activeEntries]);

  // ── 4. Testing Coverage Rate ────────────────────────────────────────────────

  const testingCoverageData = useMemo(() => {
    return monthRange.map((mk) => {
      let totalDue = 0;
      let totalTested = 0;

      for (const entry of activeEntries) {
        const result = getResultForPeriod(entry, mk.year, mk.month);
        if (result !== "NOT_DUE") {
          totalDue++;
          if (result !== "NOT_TESTED") {
            totalTested++;
          }
        }
      }

      const coverage = totalDue > 0 ? Math.round((totalTested / totalDue) * 100) : 0;
      return {
        month: mk.label,
        coverage,
        tested: totalTested,
        due: totalDue,
      };
    });
  }, [monthRange, activeEntries]);

  // ── 5. Persistent Failures (3+ consecutive months FAIL) ─────────────────────

  const persistentFailures = useMemo(() => {
    if (monthRange.length < 3) return [];

    const failures: {
      entryId: string;
      controlRef: string;
      controlName: string;
      businessArea: string;
      consecutiveMonths: number;
      lastNotes: string | null;
    }[] = [];

    for (const entry of activeEntries) {
      // Walk backwards from the most recent month in range
      let consecutive = 0;
      let lastNotes: string | null = null;

      for (let i = monthRange.length - 1; i >= 0; i--) {
        const mk = monthRange[i];
        const result = getResultForPeriod(entry, mk.year, mk.month);
        if (result === "FAIL") {
          consecutive++;
          if (consecutive === 1) {
            lastNotes = getNotesForPeriod(entry, mk.year, mk.month);
          }
        } else {
          break;
        }
      }

      if (consecutive >= 3) {
        failures.push({
          entryId: entry.id,
          controlRef: entry.control?.controlRef ?? "---",
          controlName: entry.control?.controlName ?? "Unknown Control",
          businessArea: entry.control?.businessArea?.name ?? "Unknown",
          consecutiveMonths: consecutive,
          lastNotes,
        });
      }
    }

    // Sort by consecutive months descending
    return failures.sort((a, b) => b.consecutiveMonths - a.consecutiveMonths);
  }, [monthRange, activeEntries]);

  // ── 6. Improvements (FAIL/PARTIALLY -> PASS) ───────────────────────────────

  const improvements = useMemo(() => {
    if (monthRange.length < 2) return [];

    const items: {
      entryId: string;
      controlRef: string;
      controlName: string;
      businessArea: string;
      fromResult: TestResultValue;
      fromMonth: string;
      toMonth: string;
    }[] = [];

    for (const entry of activeEntries) {
      // Build a chronological array of (month, result) within the time range
      const timeline: { label: string; result: TestResultValue }[] = [];
      for (const mk of monthRange) {
        const result = getResultForPeriod(entry, mk.year, mk.month);
        if (result !== "NOT_DUE") {
          timeline.push({ label: mk.label, result });
        }
      }

      // Find the most recent improvement: earlier FAIL/PARTIALLY followed later by PASS
      let lastBadIdx = -1;
      let lastBadResult: TestResultValue | null = null;
      let firstGoodAfterBad = -1;

      for (let i = 0; i < timeline.length; i++) {
        const r = timeline[i].result;
        if (r === "FAIL" || r === "PARTIALLY") {
          lastBadIdx = i;
          lastBadResult = r;
          firstGoodAfterBad = -1; // reset
        } else if (r === "PASS" && lastBadIdx >= 0 && firstGoodAfterBad < 0) {
          firstGoodAfterBad = i;
        }
      }

      if (lastBadResult && firstGoodAfterBad >= 0 && firstGoodAfterBad > lastBadIdx) {
        items.push({
          entryId: entry.id,
          controlRef: entry.control?.controlRef ?? "---",
          controlName: entry.control?.controlName ?? "Unknown Control",
          businessArea: entry.control?.businessArea?.name ?? "Unknown",
          fromResult: lastBadResult,
          fromMonth: timeline[lastBadIdx].label,
          toMonth: timeline[firstGoodAfterBad].label,
        });
      }
    }

    return items;
  }, [monthRange, activeEntries]);

  // ── Empty state ─────────────────────────────────────────────────────────────

  const hasData = activeEntries.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-updraft-bright-purple" />
          <h2 className="text-lg font-poppins font-semibold text-gray-800">
            Trend Analysis
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <CalendarRange size={16} className="text-gray-400" />
          <label className="text-sm font-medium text-gray-600">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm text-gray-700 outline-none focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple cursor-pointer"
          >
            {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((key) => (
              <option key={key} value={key}>
                {TIME_RANGE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!hasData ? (
        <div className="bento-card p-12 text-center">
          <TrendingUp size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            No controls on the testing schedule yet. Add controls and record test
            results to see trend analysis.
          </p>
        </div>
      ) : (
        <>
          {/* ── Overall Pass Rate ─────────────────────────────────────────── */}
          <div className="bento-card p-5">
            <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-updraft-bright-purple" />
              Overall Pass Rate Over Time
            </h3>
            {overallPassRateData.every((d) => d.tested === 0) ? (
              <EmptyChart message="No test results recorded in the selected time range." />
            ) : (
              <ScrollChart className="h-[300px]">
                {(scrollKey) => (
                <ResponsiveContainer key={scrollKey} width="100%" height="100%">
                  <LineChart
                    data={overallPassRateData}
                    margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`${value}%`, "Pass Rate"]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="passRate"
                      name="Pass Rate (%)"
                      stroke={CHART_COLOURS.primary}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: CHART_COLOURS.primary }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </ScrollChart>
            )}
          </div>

          {/* ── By Business Area + By CD Outcome (side by side) ───────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Pass Rate by Business Area — Grouped Bar Chart */}
            <div className="bento-card p-5">
              <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4">
                Pass Rate by Business Area
              </h3>
              {businessAreaNames.length === 0 ? (
                <EmptyChart message="No business areas found in the testing schedule." />
              ) : (
                <ScrollChart className="h-[300px]">
                  {(scrollKey) => (
                  <ResponsiveContainer key={scrollKey} width="100%" height="100%">
                    <BarChart
                      data={businessAreaData}
                      margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, name) => [`${value}%`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {businessAreaNames.map((name, idx) => (
                        <Bar
                          key={name}
                          dataKey={name}
                          name={name}
                          fill={AREA_PALETTE[idx % AREA_PALETTE.length]}
                          radius={[2, 2, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  )}
                </ScrollChart>
              )}
            </div>

            {/* Pass Rate by Consumer Duty Outcome — Stacked Area Chart */}
            <div className="bento-card p-5">
              <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4">
                Pass Rate by Consumer Duty Outcome
              </h3>
              {cdOutcomeData.length === 0 ? (
                <EmptyChart message="No data available for Consumer Duty outcomes." />
              ) : (
                <ScrollChart className="h-[300px]">
                  {(scrollKey) => (
                  <ResponsiveContainer key={scrollKey} width="100%" height="100%">
                    <AreaChart
                      data={cdOutcomeData}
                      margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, name) => [`${value}%`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {(
                        Object.keys(CD_OUTCOME_PALETTE) as ConsumerDutyOutcomeType[]
                      ).map((ot) => (
                        <Area
                          key={ot}
                          type="monotone"
                          dataKey={CD_OUTCOME_LABELS[ot]}
                          name={CD_OUTCOME_LABELS[ot]}
                          stackId="cd"
                          stroke={CD_OUTCOME_PALETTE[ot]}
                          fill={CD_OUTCOME_PALETTE[ot]}
                          fillOpacity={0.3}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                  )}
                </ScrollChart>
              )}
            </div>
          </div>

          {/* ── Testing Coverage Rate ─────────────────────────────────────── */}
          <div className="bento-card p-5">
            <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" />
              Testing Coverage Rate
            </h3>
            {testingCoverageData.every((d) => d.due === 0) ? (
              <EmptyChart message="No due controls found in the selected time range." />
            ) : (
              <ScrollChart className="h-[280px]">
                {(scrollKey) => (
                <ResponsiveContainer key={scrollKey} width="100%" height="100%">
                  <LineChart
                    data={testingCoverageData}
                    margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [`${value}%`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="coverage"
                      name="Coverage (%)"
                      stroke={CHART_COLOURS.secondary}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: CHART_COLOURS.secondary }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </ScrollChart>
            )}
          </div>

          {/* ── Attestation Completion Rate (placeholder) ─────────────────── */}
          <div className="bento-card p-5">
            <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ShieldAlert size={16} className="text-gray-400" />
              Attestation Completion Rate
            </h3>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ShieldAlert size={36} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">
                Coming Soon
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Attestation tracking over time will be available once owner attestation
                workflows are fully implemented. This will show the percentage of controls
                attested by their owners each month.
              </p>
            </div>
          </div>

          {/* ── Persistent Failures + Improvements (side by side) ─────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Persistent Failures Table */}
            <div className="bento-card p-5">
              <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingDown size={16} className="text-red-500" />
                Persistent Failures
                <span className="text-xs font-normal text-gray-400 ml-1">
                  (3+ consecutive months)
                </span>
              </h3>
              {persistentFailures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
                    <TrendingUp size={20} className="text-green-500" />
                  </div>
                  <p className="text-sm text-gray-500">
                    No persistent failures found.
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    No controls have failed for 3 or more consecutive months.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Ref
                        </th>
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Control
                        </th>
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Area
                        </th>
                        <th className="text-center py-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Months
                        </th>
                        <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {persistentFailures.map((f) => (
                        <tr key={f.entryId} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-gray-500 whitespace-nowrap">
                            {f.controlRef}
                          </td>
                          <td className="py-2.5 pr-3 text-gray-800 max-w-[180px] truncate" title={f.controlName}>
                            {f.controlName}
                          </td>
                          <td className="py-2.5 pr-3 text-gray-600 whitespace-nowrap">
                            {f.businessArea}
                          </td>
                          <td className="py-2.5 pr-3 text-center">
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              {f.consecutiveMonths}
                            </span>
                          </td>
                          <td className="py-2.5 text-gray-500 text-xs max-w-[200px] truncate" title={f.lastNotes ?? ""}>
                            {f.lastNotes || <span className="text-gray-400">---</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Improvement Tracker Table */}
            <div className="bento-card p-5">
              <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ArrowUpCircle size={16} className="text-green-500" />
                Improvement Tracker
                <span className="text-xs font-normal text-gray-400 ml-1">
                  ({TEST_RESULT_LABELS.FAIL}/{TEST_RESULT_LABELS.PARTIALLY} to {TEST_RESULT_LABELS.PASS})
                </span>
              </h3>
              {improvements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                    <ArrowUpCircle size={20} className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500">
                    No improvements recorded yet.
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Controls that move from Fail or Partially to Pass will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Ref
                        </th>
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Control
                        </th>
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Area
                        </th>
                        <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Journey
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {improvements.map((imp) => (
                        <tr key={imp.entryId} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-gray-500 whitespace-nowrap">
                            {imp.controlRef}
                          </td>
                          <td className="py-2.5 pr-3 text-gray-800 max-w-[180px] truncate" title={imp.controlName}>
                            {imp.controlName}
                          </td>
                          <td className="py-2.5 pr-3 text-gray-600 whitespace-nowrap">
                            {imp.businessArea}
                          </td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                                  imp.fromResult === "FAIL"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {TEST_RESULT_LABELS[imp.fromResult]}
                              </span>
                              <span className="text-gray-400 text-[10px]">
                                {imp.fromMonth}
                              </span>
                              <svg
                                width="16"
                                height="10"
                                viewBox="0 0 16 10"
                                className="text-green-500 shrink-0"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M1 5H13M13 5L9 1M13 5L9 9"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">
                                {TEST_RESULT_LABELS.PASS}
                              </span>
                              <span className="text-gray-400 text-[10px]">
                                {imp.toMonth}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Reusable Empty Chart Placeholder ──────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-gray-400">
      {message}
    </div>
  );
}
