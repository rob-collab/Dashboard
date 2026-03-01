"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api-client";
import type {
  TestResultValue,
  ExcoViewConfig,
  QuarterlySummaryRecord,
  ControlRecord,
} from "@/lib/types";
import {
  TEST_RESULT_LABELS,
  CD_OUTCOME_LABELS,
  CONTROL_TYPE_LABELS,
} from "@/lib/types";
import type { ControlType } from "@/lib/types";
import {
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  X,
  ChevronRight,
} from "lucide-react";
import ControlDetailModal from "./ControlDetailModal";
import { cn } from "@/lib/utils";
import { ScrollChart } from "@/components/common/ScrollChart";
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

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface ExcoDashboardData {
  config: ExcoViewConfig;
  summaryStats: {
    totalActive: number;
    passed: number;
    failed: number;
    partially: number;
    notTested: number;
    notDue: number;
    attestationRate: number;
  };
  byBusinessArea: Array<{
    areaId: string;
    areaName: string;
    pass: number;
    fail: number;
    partially: number;
    notTested: number;
    notDue: number;
  }>;
  byOutcome: Array<{
    outcome: string;
    pass: number;
    fail: number;
    partially: number;
    notTested: number;
    notDue: number;
  }>;
  quarterlySummaries: QuarterlySummaryRecord[];
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

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

const RESULT_COLOURS: Record<TestResultValue, string> = {
  PASS: "#22c55e",
  FAIL: "#ef4444",
  PARTIALLY: "#f59e0b",
  NOT_TESTED: "#9ca3af",
  NOT_DUE: "#d1d5db",
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function quarterLabel(quarter: string): string {
  // quarter is typically "2026-Q1" or similar
  const parts = quarter.split("-");
  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`;
  }
  return quarter;
}

/* ── Summary Stat Card (boardroom style) ────────────────────────────────────── */

interface StatCardProps {
  value: number | string;
  label: string;
  subtext?: string;
  accentColour: string;
  icon: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

function ExcoStatCard({ value, label, subtext, accentColour, icon, onClick, active }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bento-card p-6 flex flex-col gap-2 transition-all",
        onClick && "cursor-pointer hover:shadow-bento-hover hover:-translate-y-0.5",
        active && "ring-2 ring-updraft-bright-purple/40",
      )}
    >
      <div className="flex items-center justify-between">
        <div className={`text-4xl font-bold font-poppins ${accentColour}`}>
          {value}
        </div>
        <div className={`p-2.5 rounded-xl ${accentColour} opacity-15`}>
          {icon}
        </div>
      </div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      {subtext && (
        <div className="text-xs text-gray-400">{subtext}</div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */

export default function ExcoDashboardTab() {
  /* Period selector — defaults to current month/year */
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const currentYear = now.getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  /* Dashboard data */
  const [data, setData] = useState<ExcoDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Drill-down state */
  type DrillFilter = { type: "status"; status: string } | { type: "area"; areaId: string; areaName: string } | { type: "outcome"; outcome: string } | null;
  const [drillFilter, setDrillFilter] = useState<DrillFilter>(null);
  const [drillControls, setDrillControls] = useState<ControlRecord[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [detailControlId, setDetailControlId] = useState<string | null>(null);

  const periodLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  /* ── Fetch dashboard data ──────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      setLoading(true);
      setError(null);

      try {
        const result = await api<ExcoDashboardData>(
          `/api/controls/exco-dashboard?periodYear=${selectedYear}&periodMonth=${selectedMonth}`,
        );
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load ExCo dashboard data.",
          );
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [selectedYear, selectedMonth]);

  /* ── Drill-down: fetch controls when filter changes ────────────────── */

  useEffect(() => {
    if (!drillFilter) {
      setDrillControls([]);
      return;
    }
    let cancelled = false;
    setDrillLoading(true);

    api<ControlRecord[]>("/api/controls/library?isActive=true&includeSchedule=true")
      .then((controls) => {
        if (cancelled) return;
        const filtered = controls.filter((c) => {
          // Get latest test result for the selected period
          const results = c.testingSchedule?.testResults ?? [];
          const periodResult = results.find(
            (r) => r.periodYear === selectedYear && r.periodMonth === selectedMonth,
          );
          const status = periodResult?.result ?? (c.testingSchedule ? "NOT_DUE" : "NOT_TESTED");

          if (drillFilter.type === "status") {
            if (drillFilter.status === "ALL") return true;
            return status === drillFilter.status;
          }
          if (drillFilter.type === "area") {
            return c.businessAreaId === drillFilter.areaId;
          }
          if (drillFilter.type === "outcome") {
            return c.consumerDutyOutcome === drillFilter.outcome;
          }
          return true;
        });
        setDrillControls(filtered);
      })
      .catch((err) => {
        if (!cancelled) console.error("[ExcoDashboard] drill-down fetch error:", err);
      })
      .finally(() => {
        if (!cancelled) setDrillLoading(false);
      });

    return () => { cancelled = true; };
  }, [drillFilter, selectedYear, selectedMonth]);

  const handleDrillDown = useCallback((filter: DrillFilter) => {
    setDrillFilter((prev) => {
      // Toggle off if clicking the same filter
      if (prev && filter && prev.type === filter.type) {
        if (prev.type === "status" && filter.type === "status" && prev.status === filter.status) return null;
        if (prev.type === "area" && filter.type === "area" && prev.areaId === filter.areaId) return null;
        if (prev.type === "outcome" && filter.type === "outcome" && prev.outcome === filter.outcome) return null;
      }
      return filter;
    });
  }, []);

  const drillFilterLabel = useMemo(() => {
    if (!drillFilter) return "";
    if (drillFilter.type === "status") {
      if (drillFilter.status === "ALL") return "All Active Controls";
      return TEST_RESULT_LABELS[drillFilter.status as TestResultValue] ?? drillFilter.status;
    }
    if (drillFilter.type === "area") return drillFilter.areaName;
    if (drillFilter.type === "outcome") {
      return CD_OUTCOME_LABELS[drillFilter.outcome as keyof typeof CD_OUTCOME_LABELS] ?? drillFilter.outcome;
    }
    return "";
  }, [drillFilter]);

  /* ── Derived chart data ────────────────────────────────────────────────── */

  const businessAreaChartData = useMemo(() => {
    if (!data) return [];
    return data.byBusinessArea.map((area) => ({
      name: area.areaName,
      [TEST_RESULT_LABELS.PASS]: area.pass,
      [TEST_RESULT_LABELS.FAIL]: area.fail,
      [TEST_RESULT_LABELS.PARTIALLY]: area.partially,
      [TEST_RESULT_LABELS.NOT_TESTED]: area.notTested,
      [TEST_RESULT_LABELS.NOT_DUE]: area.notDue,
    }));
  }, [data]);

  const outcomeChartData = useMemo(() => {
    if (!data) return [];
    return data.byOutcome.map((item) => {
      const total = item.pass + item.fail + item.partially + item.notTested + item.notDue;
      const pieData = [
        { name: TEST_RESULT_LABELS.PASS, value: item.pass, colour: RESULT_COLOURS.PASS },
        { name: TEST_RESULT_LABELS.FAIL, value: item.fail, colour: RESULT_COLOURS.FAIL },
        { name: TEST_RESULT_LABELS.PARTIALLY, value: item.partially, colour: RESULT_COLOURS.PARTIALLY },
        { name: TEST_RESULT_LABELS.NOT_TESTED, value: item.notTested, colour: RESULT_COLOURS.NOT_TESTED },
        { name: TEST_RESULT_LABELS.NOT_DUE, value: item.notDue, colour: RESULT_COLOURS.NOT_DUE },
      ].filter((s) => s.value > 0);

      const label =
        CD_OUTCOME_LABELS[item.outcome as keyof typeof CD_OUTCOME_LABELS] ??
        item.outcome;

      return { outcome: item.outcome, label, total, pieData };
    });
  }, [data]);

  /* ── Convenience: config flags ─────────────────────────────────────────── */

  const config = data?.config;

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-8">
      {/* Main heading */}
      <div className="text-center">
        <h1 className="text-2xl font-poppins font-bold text-updraft-deep tracking-tight">
          Updraft Controls Assurance
        </h1>
        <p className="text-base text-gray-500 mt-1 font-inter">
          {periodLabel}
        </p>
      </div>

      {/* Period selector */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-600">Reporting Period:</span>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
        >
          {MONTH_NAMES.map((name, idx) => (
            <option key={idx} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
        >
          {yearOptions.map((yr) => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bento-card p-12 text-center text-gray-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-3 animate-pulse text-updraft-deep" />
          <p className="text-sm">Loading dashboard data...</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bento-card p-12 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
          <p className="text-sm text-gray-600">{error}</p>
          <p className="text-xs text-gray-400 mt-2">
            The ExCo dashboard may not yet be configured for this period. Please
            contact the CCRO team.
          </p>
        </div>
      )}

      {/* Dashboard content */}
      {!loading && !error && data && config && (
        <>
          {/* ── Summary Statistics ─────────────────────────────────────────── */}
          {config.showDashboardSummary && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
              <ExcoStatCard
                value={data.summaryStats.totalActive}
                label="Active Controls"
                icon={<BarChart3 size={22} />}
                accentColour="text-updraft-bright-purple"
                onClick={() => handleDrillDown({ type: "status", status: "ALL" })}
                active={drillFilter?.type === "status" && drillFilter.status === "ALL"}
              />
              <ExcoStatCard
                value={data.summaryStats.passed}
                label="Passed"
                subtext={pct(data.summaryStats.passed, data.summaryStats.totalActive)}
                icon={<ShieldCheck size={22} />}
                accentColour="text-green-600"
                onClick={() => handleDrillDown({ type: "status", status: "PASS" })}
                active={drillFilter?.type === "status" && drillFilter.status === "PASS"}
              />
              <ExcoStatCard
                value={data.summaryStats.failed}
                label="Failed"
                subtext={pct(data.summaryStats.failed, data.summaryStats.totalActive)}
                icon={<AlertTriangle size={22} />}
                accentColour="text-red-600"
                onClick={() => handleDrillDown({ type: "status", status: "FAIL" })}
                active={drillFilter?.type === "status" && drillFilter.status === "FAIL"}
              />
              <ExcoStatCard
                value={data.summaryStats.partially}
                label="Partially Effective"
                subtext={pct(data.summaryStats.partially, data.summaryStats.totalActive)}
                icon={<TrendingUp size={22} />}
                accentColour="text-amber-600"
                onClick={() => handleDrillDown({ type: "status", status: "PARTIALLY" })}
                active={drillFilter?.type === "status" && drillFilter.status === "PARTIALLY"}
              />
              <ExcoStatCard
                value={data.summaryStats.notTested}
                label="Not Tested"
                subtext={pct(data.summaryStats.notTested, data.summaryStats.totalActive)}
                icon={<BarChart3 size={22} />}
                accentColour="text-gray-500"
                onClick={() => handleDrillDown({ type: "status", status: "NOT_TESTED" })}
                active={drillFilter?.type === "status" && drillFilter.status === "NOT_TESTED"}
              />
              <ExcoStatCard
                value={data.summaryStats.notDue}
                label="Not Due"
                subtext={pct(data.summaryStats.notDue, data.summaryStats.totalActive)}
                icon={<BarChart3 size={22} />}
                accentColour="text-gray-400"
                onClick={() => handleDrillDown({ type: "status", status: "NOT_DUE" })}
                active={drillFilter?.type === "status" && drillFilter.status === "NOT_DUE"}
              />
            </div>
          )}

          {/* ── Charts Row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Pass Rate by Business Area */}
            {config.showPassRateByArea && (
              <div className="bento-card p-6">
                <h3 className="text-base font-poppins font-semibold text-gray-800 mb-5">
                  Pass Rate by Business Area
                </h3>
                {businessAreaChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-sm text-gray-400">
                    No data available for this period.
                  </div>
                ) : (
                  <div style={{ height: Math.max(220, businessAreaChartData.length * 52) }}>
                    <ScrollChart className="h-full">
                      {(scrollKey) => (
                      <ResponsiveContainer key={scrollKey} width="100%" height="100%">
                        <BarChart
                          data={businessAreaChartData}
                          layout="vertical"
                          margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
                          className="cursor-pointer"
                          onClick={(chartData: Record<string, unknown>) => {
                            const label = chartData?.activeLabel as string | undefined;
                            if (label) {
                              const area = data?.byBusinessArea.find((a) => a.areaName === label);
                              if (area) {
                                handleDrillDown({ type: "area", areaId: area.areaId, areaName: area.areaName });
                              }
                            }
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                            width={130}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 10,
                              border: "1px solid #e5e7eb",
                              fontSize: 12,
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar
                            dataKey={TEST_RESULT_LABELS.PASS}
                            stackId="a"
                            fill={RESULT_COLOURS.PASS}
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar
                            dataKey={TEST_RESULT_LABELS.FAIL}
                            stackId="a"
                            fill={RESULT_COLOURS.FAIL}
                          />
                          <Bar
                            dataKey={TEST_RESULT_LABELS.PARTIALLY}
                            stackId="a"
                            fill={RESULT_COLOURS.PARTIALLY}
                          />
                          <Bar
                            dataKey={TEST_RESULT_LABELS.NOT_TESTED}
                            stackId="a"
                            fill={RESULT_COLOURS.NOT_TESTED}
                          />
                          <Bar
                            dataKey={TEST_RESULT_LABELS.NOT_DUE}
                            stackId="a"
                            fill={RESULT_COLOURS.NOT_DUE}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      )}
                    </ScrollChart>
                  </div>
                )}
              </div>
            )}

            {/* Pass Rate by Consumer Duty Outcome */}
            {config.showPassRateByCDOutcome && (
              <div className="bento-card p-6">
                <h3 className="text-base font-poppins font-semibold text-gray-800 mb-5">
                  Pass Rate by Consumer Duty Outcome
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  {outcomeChartData.map((outcome) => (
                    <div
                      key={outcome.outcome}
                      className={cn(
                        "text-center cursor-pointer rounded-xl p-3 transition-all hover:bg-gray-50",
                        drillFilter?.type === "outcome" && drillFilter.outcome === outcome.outcome && "ring-2 ring-updraft-bright-purple/40 bg-gray-50",
                      )}
                      onClick={() => handleDrillDown({ type: "outcome", outcome: outcome.outcome })}
                    >
                      <div
                        className="text-xs font-medium text-gray-600 mb-2 truncate px-1"
                        title={outcome.label}
                      >
                        {outcome.label}
                      </div>
                      {outcome.total === 0 ? (
                        <div className="flex items-center justify-center h-32 text-xs text-gray-400">
                          No controls
                        </div>
                      ) : (
                        <ScrollChart className="h-[140px]">
                          {(scrollKey) => (
                          <ResponsiveContainer key={scrollKey} width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={outcome.pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={32}
                                outerRadius={55}
                                paddingAngle={2}
                                dataKey="value"
                                strokeWidth={0}
                              >
                                {outcome.pieData.map((segment, idx) => (
                                  <Cell
                                    key={`cell-${idx}`}
                                    fill={segment.colour}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  borderRadius: 10,
                                  border: "1px solid #e5e7eb",
                                  fontSize: 11,
                                  boxShadow:
                                    "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                }}
                                formatter={
                                  ((value: number, name: string) => [
                                    `${value} (${pct(value, outcome.total)})`,
                                    name,
                                  ]) as never
                                }
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          )}
                        </ScrollChart>
                      )}
                      <div className="text-[11px] text-gray-400 -mt-1">
                        {outcome.total} control
                        {outcome.total !== 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Attestation Overview ────────────────────────────────────────── */}
          {config.showAttestationOverview && (
            <div className="bento-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck className="w-5 h-5 text-updraft-deep" />
                <h3 className="text-base font-poppins font-semibold text-gray-800">
                  Attestation Overview
                </h3>
              </div>

              <div className="max-w-lg">
                {/* Attestation rate bar */}
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">
                    Attestation Completion Rate
                  </span>
                  <span className="text-gray-500 font-semibold">
                    {Math.round(data.summaryStats.attestationRate)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      data.summaryStats.attestationRate >= 100
                        ? "bg-green-500"
                        : data.summaryStats.attestationRate >= 75
                          ? "bg-updraft-bright-purple"
                          : data.summaryStats.attestationRate >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min(data.summaryStats.attestationRate, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Percentage of active controls attested by their owners for{" "}
                  {periodLabel}.
                </p>
              </div>
            </div>
          )}

          {/* ── Approved Quarterly Summaries ────────────────────────────────── */}
          {config.showQuarterlySummaries && (
            <div className="bento-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-updraft-deep" />
                <h3 className="text-base font-poppins font-semibold text-gray-800">
                  Quarterly Summaries
                </h3>
                <span className="text-xs text-gray-400 ml-1">
                  (Approved only)
                </span>
              </div>

              {data.quarterlySummaries.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  No approved quarterly summaries available for this period.
                </div>
              ) : (
                <div className="space-y-5">
                  {data.quarterlySummaries.map((summary) => (
                    <div
                      key={summary.id}
                      className="rounded-xl border border-gray-100 bg-gray-50/50 p-5"
                    >
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-updraft-deep">
                            {quarterLabel(summary.quarter)}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-[10px] font-semibold text-green-700 uppercase tracking-wider">
                            Approved
                          </span>
                        </div>
                        {summary.approvedBy && (
                          <span className="text-xs text-gray-400">
                            Approved by {summary.approvedBy.name}
                            {summary.approvedAt &&
                              ` on ${new Date(summary.approvedAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}`}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {summary.narrative}
                      </div>
                      {summary.author && (
                        <div className="text-xs text-gray-400 mt-3">
                          Author: {summary.author.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Drill-Down Panel ──────────────────────────────────────────── */}
          {drillFilter && (
            <div className="bento-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className="text-updraft-bright-purple" />
                  <h3 className="text-base font-poppins font-semibold text-gray-800">
                    {drillFilterLabel}
                  </h3>
                  <span className="text-xs text-gray-400">
                    ({drillControls.length} control{drillControls.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <button
                  onClick={() => setDrillFilter(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  title="Close drill-down"
                >
                  <X size={16} />
                </button>
              </div>

              {drillLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                  Loading controls...
                </div>
              ) : drillControls.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                  No controls match this filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                        <th className="pb-2 pr-4 font-medium">Ref</th>
                        <th className="pb-2 pr-4 font-medium">Control Name</th>
                        <th className="pb-2 pr-4 font-medium">Business Area</th>
                        <th className="pb-2 pr-4 font-medium">Owner</th>
                        <th className="pb-2 pr-4 font-medium">Type</th>
                        <th className="pb-2 font-medium">Period Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {drillControls.map((c) => {
                        const results = c.testingSchedule?.testResults ?? [];
                        const periodResult = results.find(
                          (r) => r.periodYear === selectedYear && r.periodMonth === selectedMonth,
                        );
                        const status = periodResult?.result ?? (c.testingSchedule ? "NOT_DUE" : "NOT_TESTED");
                        const resultLabel = TEST_RESULT_LABELS[status as TestResultValue] ?? status;
                        const resultColour = RESULT_COLOURS[status as TestResultValue] ?? "#9ca3af";

                        return (
                          <tr
                            key={c.id}
                            onClick={() => setDetailControlId(c.id)}
                            className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 pr-4 font-mono font-medium text-updraft-deep text-xs whitespace-nowrap">
                              {c.controlRef}
                            </td>
                            <td className="py-2.5 pr-4 text-gray-700 max-w-[250px] truncate">
                              {c.controlName}
                            </td>
                            <td className="py-2.5 pr-4 text-gray-500 text-xs">
                              {c.businessArea?.name ?? "—"}
                            </td>
                            <td className="py-2.5 pr-4 text-gray-500 text-xs whitespace-nowrap">
                              {c.controlOwner?.name ?? "—"}
                            </td>
                            <td className="py-2.5 pr-4 text-gray-500 text-xs">
                              {c.controlType ? CONTROL_TYPE_LABELS[c.controlType as ControlType] : "—"}
                            </td>
                            <td className="py-2.5">
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                                style={{ backgroundColor: resultColour }}
                              >
                                {resultLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <div className="text-center pt-4 pb-8">
            <p className="text-xs text-gray-400 font-inter">
              Updraft Controls Assurance &mdash; {periodLabel} &mdash;
              Generated for ExCo/Board review
            </p>
          </div>
        </>
      )}

      {/* Control Detail Modal (outside conditional to persist state) */}
      <ControlDetailModal
        controlId={detailControlId}
        onClose={() => setDetailControlId(null)}
      />
    </div>
  );
}
