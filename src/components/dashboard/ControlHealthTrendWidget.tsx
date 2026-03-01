"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { ScrollChart } from "@/components/common/ScrollChart";
import type { TestingScheduleEntry } from "@/lib/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

interface MonthPoint {
  month: string;   // e.g. "Jan '26"
  passRate: number;
  pass: number;
  fail: number;
  partially: number;
  tested: number;
}

/** Build the last N months as MonthPoint[] from active schedule entries. */
function buildPassRateTrend(
  entries: TestingScheduleEntry[],
  monthCount = 6,
): MonthPoint[] {
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1; // 1-indexed

  const points: MonthPoint[] = [];

  for (let offset = monthCount - 1; offset >= 0; offset--) {
    let m = endMonth - offset;
    let y = endYear;
    while (m <= 0) { m += 12; y -= 1; }

    let pass = 0, fail = 0, partially = 0, notTested = 0;

    for (const entry of entries) {
      const result = (entry.testResults ?? []).find(
        (r) => r.periodYear === y && r.periodMonth === m,
      )?.result ?? "NOT_DUE";

      switch (result) {
        case "PASS":      pass++;      break;
        case "FAIL":      fail++;      break;
        case "PARTIALLY": partially++; break;
        case "NOT_TESTED": notTested++; break;
        // NOT_DUE — excluded from denominator
      }
    }

    const tested = pass + fail + partially + notTested;
    const passRate = tested > 0 ? Math.round((pass / tested) * 100) : 0;

    const d = new Date(y, m - 1, 1);
    points.push({
      month: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      passRate,
      pass,
      fail,
      partially,
      tested,
    });
  }

  return points;
}

/* ── Custom Tooltip ─────────────────────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: MonthPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      <p className="text-green-700">Pass: {d.pass}</p>
      {d.fail > 0 && <p className="text-red-600">Fail: {d.fail}</p>}
      {d.partially > 0 && <p className="text-amber-600">Partial: {d.partially}</p>}
      <p className="text-gray-500 mt-1">{d.passRate}% pass rate</p>
    </div>
  );
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function ControlHealthTrendWidget() {
  const testingSchedule = useAppStore((s) => s.testingSchedule);

  const activeEntries = useMemo(
    () => testingSchedule.filter((e) => e.isActive),
    [testingSchedule],
  );

  const trendData = useMemo(
    () => buildPassRateTrend(activeEntries, 6),
    [activeEntries],
  );

  /* Trend direction: compare last two data-bearing months */
  const { currentRate, delta, direction } = useMemo(() => {
    const withData = trendData.filter((p) => p.tested > 0);
    if (withData.length === 0) return { currentRate: 0, delta: 0, direction: "flat" as const };
    const cur = withData[withData.length - 1].passRate;
    const prev = withData.length > 1 ? withData[withData.length - 2].passRate : cur;
    const d = cur - prev;
    return {
      currentRate: cur,
      delta: Math.abs(d),
      direction: d > 0 ? "up" as const : d < 0 ? "down" as const : "flat" as const,
    };
  }, [trendData]);

  const hasAnyData = trendData.some((p) => p.tested > 0);

  return (
    <div className="bento-card flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-poppins font-semibold text-gray-900">Control Health Trend</h2>
        <Link
          href="/controls?tab=trend-analysis"
          className="text-xs text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1 transition-colors"
        >
          Full analysis <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Headline stat — AnimatedNumber fires on scroll */}
      <div className="flex items-end gap-3">
        {hasAnyData ? (
          <>
            <AnimatedNumber
              value={currentRate}
              className="text-4xl font-bold font-poppins text-updraft-deep"
            />
            <span className="text-4xl font-bold font-poppins text-updraft-deep">%</span>
          </>
        ) : (
          <span className="text-4xl font-bold font-poppins text-updraft-deep">—</span>
        )}
        {hasAnyData && (
          <span
            className={cn(
              "mb-1 flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
              direction === "up"
                ? "bg-green-100 text-green-700"
                : direction === "down"
                ? "bg-red-100 text-red-600"
                : "bg-gray-100 text-gray-500",
            )}
          >
            {direction === "up"   ? <TrendingUp  size={11} /> :
             direction === "down" ? <TrendingDown size={11} /> :
                                    <Minus        size={11} />}
            {direction === "flat" ? "No change" : `${delta}pp ${direction === "up" ? "up" : "down"}`}
          </span>
        )}
        <span className="mb-1 text-xs text-gray-400 ml-auto">6-month pass rate</span>
      </div>

      {/* Chart — re-triggers Recharts animation on each scroll entry */}
      {hasAnyData ? (
        <ScrollChart className="flex-1 min-h-0">
          {(scrollKey) => (
            <ResponsiveContainer key={scrollKey} width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id="ctGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6C2BD9" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6C2BD9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="passRate"
                  stroke="#6C2BD9"
                  strokeWidth={2}
                  fill="url(#ctGrad)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#6C2BD9" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ScrollChart>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400 text-center">
            No test results recorded yet.
            <br />
            <Link
              href="/controls?tab=testing-schedule"
              className="text-updraft-bright-purple hover:underline"
            >
              Add test results →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
