"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import type {
  TestingScheduleEntry,
  TestResultValue,
  ConsumerDutyOutcomeType,
} from "@/lib/types";
import {
  TEST_RESULT_LABELS,
  CD_OUTCOME_LABELS,
} from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import BusinessAreaDrillDown from "./BusinessAreaDrillDown";
import ControlDetailView from "./ControlDetailView";
import ExportPanel from "./ExportPanel";

// ── Chart colours ─────────────────────────────────────────────────────────────

const RESULT_COLOURS: Record<TestResultValue, string> = {
  PASS: "#22c55e",
  FAIL: "#ef4444",
  PARTIALLY: "#f59e0b",
  NOT_TESTED: "#9ca3af",
  NOT_DUE: "#d1d5db",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMonthOptions(): { label: string; year: number; month: number }[] {
  const now = new Date();
  const options: { label: string; year: number; month: number }[] = [];
  for (let offset = 11; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    options.push({
      label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth() + 1, // 1-indexed
    });
  }
  return options;
}

/** Get the latest test result for a schedule entry in a given period. */
function getResultForPeriod(
  entry: TestingScheduleEntry,
  year: number,
  month: number
): TestResultValue {
  const results = entry.testResults ?? [];
  const match = results.find(
    (r) => r.periodYear === year && r.periodMonth === month
  );
  return match?.result ?? "NOT_DUE";
}

/** Get the last N months of results for a schedule entry, most recent first. */
function getRecentResults(
  entry: TestingScheduleEntry,
  year: number,
  month: number,
  count: number
): TestResultValue[] {
  const results: TestResultValue[] = [];
  for (let i = 0; i < count; i++) {
    let m = month - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    results.push(getResultForPeriod(entry, y, m));
  }
  return results;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  percentage?: string;
  accentClass: string;
}

function StatCard({ icon, value, label, percentage, accentClass }: StatCardProps) {
  return (
    <div className="bento-card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className={`text-3xl font-bold ${accentClass}`}>{value}</div>
        <div className={`p-2 rounded-lg ${accentClass} opacity-20`}>{icon}</div>
      </div>
      <div className="text-sm text-gray-600 font-medium">{label}</div>
      {percentage !== undefined && (
        <div className="text-xs text-gray-400">{percentage}</div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

// ── Drill-down state types ────────────────────────────────────────────────────

type DrillDownView =
  | { type: "overview" }
  | { type: "business-area"; areaId: string; areaName: string }
  | { type: "control"; entryId: string; backLabel: string; backAreaId?: string; backAreaName?: string };

export default function ControlsDashboardTab() {
  const testingSchedule = useAppStore((s) => s.testingSchedule);
  const controlBusinessAreas = useAppStore((s) => s.controlBusinessAreas);

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const currentOption = monthOptions[monthOptions.length - 1];

  const [selectedYear, setSelectedYear] = useState(currentOption.year);
  const [selectedMonth, setSelectedMonth] = useState(currentOption.month);

  // Drill-down navigation
  const [drillDown, setDrillDown] = useState<DrillDownView>({ type: "overview" });

  const selectedLabel = useMemo(() => {
    const opt = monthOptions.find(
      (o) => o.year === selectedYear && o.month === selectedMonth
    );
    return opt?.label ?? "";
  }, [monthOptions, selectedYear, selectedMonth]);

  // ── Active schedule entries ───────────────────────────────────────────────

  const activeEntries = useMemo(
    () => testingSchedule.filter((e) => e.isActive),
    [testingSchedule]
  );

  // ── Period results per entry ──────────────────────────────────────────────

  const periodResults = useMemo(() => {
    return activeEntries.map((entry) => ({
      entry,
      result: getResultForPeriod(entry, selectedYear, selectedMonth),
    }));
  }, [activeEntries, selectedYear, selectedMonth]);

  // ── Summary counts ────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const counts: Record<TestResultValue, number> = {
      PASS: 0,
      FAIL: 0,
      PARTIALLY: 0,
      NOT_TESTED: 0,
      NOT_DUE: 0,
    };
    for (const { result } of periodResults) {
      counts[result] += 1;
    }
    const total = activeEntries.length;
    const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "0%");
    return { counts, total, pct };
  }, [periodResults, activeEntries.length]);

  // ── Pass rate by business area ────────────────────────────────────────────

  const businessAreaChartData = useMemo(() => {
    const areaMap = new Map<string, Record<TestResultValue, number>>();

    // Initialise from known business areas
    for (const area of controlBusinessAreas) {
      areaMap.set(area.name, { PASS: 0, FAIL: 0, PARTIALLY: 0, NOT_TESTED: 0, NOT_DUE: 0 });
    }

    for (const { entry, result } of periodResults) {
      const areaName = entry.control?.businessArea?.name ?? "Unknown";
      if (!areaMap.has(areaName)) {
        areaMap.set(areaName, { PASS: 0, FAIL: 0, PARTIALLY: 0, NOT_TESTED: 0, NOT_DUE: 0 });
      }
      areaMap.get(areaName)![result] += 1;
    }

    // Filter out areas with zero controls
    return Array.from(areaMap.entries())
      .filter(([, counts]) => {
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return total > 0;
      })
      .map(([name, counts]) => ({
        name,
        [TEST_RESULT_LABELS.PASS]: counts.PASS,
        [TEST_RESULT_LABELS.FAIL]: counts.FAIL,
        [TEST_RESULT_LABELS.PARTIALLY]: counts.PARTIALLY,
        [TEST_RESULT_LABELS.NOT_TESTED]: counts.NOT_TESTED,
        [TEST_RESULT_LABELS.NOT_DUE]: counts.NOT_DUE,
      }));
  }, [periodResults, controlBusinessAreas]);

  // ── Pass rate by Consumer Duty outcome ────────────────────────────────────

  const cdOutcomeData = useMemo(() => {
    const outcomeTypes: ConsumerDutyOutcomeType[] = [
      "PRODUCTS_AND_SERVICES",
      "CONSUMER_UNDERSTANDING",
      "CONSUMER_SUPPORT",
      "GOVERNANCE_CULTURE_OVERSIGHT",
    ];

    return outcomeTypes.map((outcomeType) => {
      const counts: Record<TestResultValue, number> = {
        PASS: 0,
        FAIL: 0,
        PARTIALLY: 0,
        NOT_TESTED: 0,
        NOT_DUE: 0,
      };

      for (const { entry, result } of periodResults) {
        if (entry.control?.consumerDutyOutcome === outcomeType) {
          counts[result] += 1;
        }
      }

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const pieData = (Object.keys(counts) as TestResultValue[])
        .filter((k) => counts[k] > 0)
        .map((k) => ({
          name: TEST_RESULT_LABELS[k],
          value: counts[k],
          colour: RESULT_COLOURS[k],
        }));

      return {
        outcomeType,
        label: CD_OUTCOME_LABELS[outcomeType],
        total,
        pieData,
      };
    });
  }, [periodResults]);

  // ── Attention required items ──────────────────────────────────────────────

  const attentionItems = useMemo(() => {
    const items: { id: string; controlRef: string; controlName: string; reason: string; severity: "high" | "medium" }[] = [];

    for (const { entry, result } of periodResults) {
      const ref = entry.control?.controlRef ?? "—";
      const name = entry.control?.controlName ?? "Unknown Control";

      // Failed in current period
      if (result === "FAIL") {
        items.push({
          id: `fail-${entry.id}`,
          controlRef: ref,
          controlName: name,
          reason: `Failed in ${selectedLabel}`,
          severity: "high",
        });
      }

      // Failed 3+ consecutive months
      const recentResults = getRecentResults(entry, selectedYear, selectedMonth, 3);
      if (recentResults.length >= 3 && recentResults.every((r) => r === "FAIL")) {
        // Avoid duplicate with "Failed in current period" — give distinct id
        items.push({
          id: `consecutive-fail-${entry.id}`,
          controlRef: ref,
          controlName: name,
          reason: "Failed 3+ consecutive months",
          severity: "high",
        });
      }

      // Not tested for 3+ months
      const recentNotTested = getRecentResults(entry, selectedYear, selectedMonth, 3);
      if (
        recentNotTested.length >= 3 &&
        recentNotTested.every((r) => r === "NOT_TESTED" || r === "NOT_DUE")
      ) {
        // Only flag if at least one period should have been tested (i.e. not all NOT_DUE)
        const hasAnyTestable = recentNotTested.some((r) => r === "NOT_TESTED");
        if (hasAnyTestable) {
          items.push({
            id: `not-tested-${entry.id}`,
            controlRef: ref,
            controlName: name,
            reason: "Not tested for 3+ months",
            severity: "medium",
          });
        }
      }
    }

    // Deduplicate by id
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [periodResults, selectedYear, selectedMonth, selectedLabel]);

  // ── Drill-down renders ───────────────────────────────────────────────────

  if (drillDown.type === "business-area") {
    return (
      <BusinessAreaDrillDown
        areaId={drillDown.areaId}
        areaName={drillDown.areaName}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onBack={() => setDrillDown({ type: "overview" })}
        onSelectControl={(entryId) =>
          setDrillDown({
            type: "control",
            entryId,
            backLabel: drillDown.areaName,
            backAreaId: drillDown.areaId,
            backAreaName: drillDown.areaName,
          })
        }
      />
    );
  }

  if (drillDown.type === "control") {
    return (
      <ControlDetailView
        scheduleEntryId={drillDown.entryId}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        backLabel={drillDown.backLabel}
        onBack={() => {
          if (drillDown.backAreaId && drillDown.backAreaName) {
            setDrillDown({ type: "business-area", areaId: drillDown.backAreaId, areaName: drillDown.backAreaName });
          } else {
            setDrillDown({ type: "overview" });
          }
        }}
      />
    );
  }

  // ── Overview Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <CalendarClock size={16} className="text-gray-400" />
        <label className="text-sm font-medium text-gray-600">Period:</label>
        <div className="relative">
          <select
            value={`${selectedYear}-${selectedMonth}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setSelectedYear(y);
              setSelectedMonth(m);
            }}
            className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm text-gray-700 outline-none focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          >
            {monthOptions.map((opt) => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
          />
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Activity size={20} />}
          value={summary.total}
          label="Active Tests"
          accentClass="text-updraft-bright-purple"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          value={summary.counts.PASS}
          label="Passed"
          percentage={summary.pct(summary.counts.PASS)}
          accentClass="text-green-600"
        />
        <StatCard
          icon={<XCircle size={20} />}
          value={summary.counts.FAIL}
          label="Failed"
          percentage={summary.pct(summary.counts.FAIL)}
          accentClass="text-red-600"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          value={summary.counts.PARTIALLY}
          label="Partially Effective"
          percentage={summary.pct(summary.counts.PARTIALLY)}
          accentClass="text-amber-600"
        />
        <StatCard
          icon={<MinusCircle size={20} />}
          value={summary.counts.NOT_TESTED}
          label="Not Tested"
          percentage={summary.pct(summary.counts.NOT_TESTED)}
          accentClass="text-gray-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pass rate by business area — stacked horizontal bar */}
        <div className="bento-card p-5">
          <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4">
            Pass Rate by Business Area
          </h3>
          {businessAreaChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              No data available for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, businessAreaChartData.length * 48)}>
              <BarChart
                data={businessAreaChartData}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={TEST_RESULT_LABELS.PASS} stackId="a" fill={RESULT_COLOURS.PASS} />
                <Bar dataKey={TEST_RESULT_LABELS.FAIL} stackId="a" fill={RESULT_COLOURS.FAIL} />
                <Bar dataKey={TEST_RESULT_LABELS.PARTIALLY} stackId="a" fill={RESULT_COLOURS.PARTIALLY} />
                <Bar dataKey={TEST_RESULT_LABELS.NOT_TESTED} stackId="a" fill={RESULT_COLOURS.NOT_TESTED} />
                <Bar dataKey={TEST_RESULT_LABELS.NOT_DUE} stackId="a" fill={RESULT_COLOURS.NOT_DUE} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pass rate by Consumer Duty outcome — 4 mini donuts */}
        <div className="bento-card p-5">
          <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4">
            Pass Rate by Consumer Duty Outcome
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {cdOutcomeData.map((outcome) => (
              <div key={outcome.outcomeType} className="text-center">
                <div className="text-xs font-medium text-gray-600 mb-1 truncate" title={outcome.label}>
                  {outcome.label}
                </div>
                {outcome.total === 0 ? (
                  <div className="flex items-center justify-center h-28 text-xs text-gray-300">
                    No controls
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie
                        data={outcome.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {outcome.pieData.map((segment, idx) => (
                          <Cell key={`cell-${idx}`} fill={segment.colour} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          fontSize: 11,
                        }}
                        formatter={((value: number, name: string) => [
                          `${value} (${Math.round((value / outcome.total) * 100)}%)`,
                          name,
                        ]) as never}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="text-[10px] text-gray-400 -mt-1">
                  {outcome.total} control{outcome.total !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Business areas — clickable list for drill-down */}
      <div className="bento-card p-5">
        <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4">
          Business Areas
        </h3>
        {businessAreaChartData.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            No business areas with controls on the testing schedule.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {businessAreaChartData.map((area) => {
              const total = Object.values(area).reduce<number>(
                (sum, v) => (typeof v === "number" ? sum + v : sum),
                0
              );
              const pass = (area as Record<string, unknown>)[TEST_RESULT_LABELS.PASS] as number;
              const fail = (area as Record<string, unknown>)[TEST_RESULT_LABELS.FAIL] as number;
              const partial = (area as Record<string, unknown>)[TEST_RESULT_LABELS.PARTIALLY] as number;
              const areaObj = controlBusinessAreas.find((ba) => ba.name === area.name);
              return (
                <button
                  key={area.name}
                  onClick={() => {
                    if (areaObj) {
                      setDrillDown({ type: "business-area", areaId: areaObj.id, areaName: area.name });
                    }
                  }}
                  className="w-full flex items-center gap-4 py-3 first:pt-0 last:pb-0 text-left hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800">{area.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {total} control{total !== 1 ? "s" : ""} · {pass} passed · {fail} failed · {partial} partial
                    </div>
                  </div>
                  {/* Mini pass rate bar */}
                  <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden flex shrink-0">
                    {total > 0 && (
                      <>
                        <div className="bg-green-500 h-full" style={{ width: `${(pass / total) * 100}%` }} />
                        <div className="bg-amber-500 h-full" style={{ width: `${(partial / total) * 100}%` }} />
                        <div className="bg-red-500 h-full" style={{ width: `${(fail / total) * 100}%` }} />
                      </>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Attention required panel */}
      <div className="bento-card p-5">
        <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          Attention Required
        </h3>
        {attentionItems.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            No items requiring attention for this period.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {attentionItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  // Find the schedule entry for this control
                  const entry = activeEntries.find((e) => e.control?.controlRef === item.controlRef);
                  if (entry) {
                    const areaName = entry.control?.businessArea?.name ?? "Dashboard";
                    const areaId = entry.control?.businessAreaId;
                    setDrillDown({
                      type: "control",
                      entryId: entry.id,
                      backLabel: "Dashboard",
                      backAreaId: areaId,
                      backAreaName: areaName,
                    });
                  }
                }}
                className="w-full flex items-center gap-3 py-3 first:pt-0 last:pb-0 text-left hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    item.severity === "high" ? "bg-red-500" : "bg-amber-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-gray-500">
                      {item.controlRef}
                    </span>
                    <span className="text-sm text-gray-800 truncate">
                      {item.controlName}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.reason}</div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    item.severity === "high"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.severity === "high" ? "High" : "Medium"}
                </span>
                <ChevronRight size={14} className="text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Export Panel */}
      <ExportPanel selectedYear={selectedYear} selectedMonth={selectedMonth} />
    </div>
  );
}
