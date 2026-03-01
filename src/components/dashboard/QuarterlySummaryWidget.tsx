"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Clock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { TestingScheduleEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

interface QuarterSummary {
  quarter: string;    // "Q1 2026"
  qLabel: string;     // "Q1 '26"
  pass: number;
  fail: number;
  partially: number;
  tested: number;
  passRate: number;
}

/** Returns last N quarters as {year, q, months} objects (descending). */
function getLastQuarters(n = 5): Array<{ year: number; q: number; months: number[] }> {
  const now = new Date();
  let year = now.getFullYear();
  let q = Math.ceil((now.getMonth() + 1) / 3);
  const result = [];
  for (let i = 0; i < n; i++) {
    const startMonth = (q - 1) * 3 + 1;
    result.push({ year, q, months: [startMonth, startMonth + 1, startMonth + 2] });
    q--;
    if (q === 0) { q = 4; year--; }
  }
  return result;
}

function buildQuarterSummaries(entries: TestingScheduleEntry[]): QuarterSummary[] {
  const quarters = getLastQuarters(5);
  const results: QuarterSummary[] = [];

  for (const { year, q, months } of quarters) {
    let pass = 0, fail = 0, partially = 0;

    for (const entry of entries) {
      for (const m of months) {
        const result = (entry.testResults ?? []).find(
          (r) => r.periodYear === year && r.periodMonth === m,
        )?.result;
        if (!result || result === "NOT_DUE") continue;
        switch (result) {
          case "PASS":      pass++;      break;
          case "FAIL":      fail++;      break;
          case "PARTIALLY": partially++; break;
        }
      }
    }

    const tested = pass + fail + partially;
    const passRate = tested > 0 ? Math.round((pass / tested) * 100) : 0;

    results.push({
      quarter: `Q${q} ${year}`,
      qLabel: `Q${q} '${String(year).slice(2)}`,
      pass,
      fail,
      partially,
      tested,
      passRate,
    });
  }

  return results;
}

/* ── Pass rate bar ─────────────────────────────────────────────────────── */

function PassBar({ rate, tested }: { rate: number; tested: number }) {
  if (tested === 0) {
    return <span className="text-[10px] text-gray-400 italic">No results</span>;
  }
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            rate >= 80 ? "bg-green-500" : rate >= 60 ? "bg-amber-500" : "bg-red-500",
          )}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-semibold tabular-nums shrink-0",
          rate >= 80 ? "text-green-700" : rate >= 60 ? "text-amber-600" : "text-red-600",
        )}
      >
        {rate}%
      </span>
    </div>
  );
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function QuarterlySummaryWidget() {
  const testingSchedule = useAppStore((s) => s.testingSchedule);

  const activeEntries = useMemo(
    () => testingSchedule.filter((e) => e.isActive),
    [testingSchedule],
  );

  const quarters = useMemo(
    () => buildQuarterSummaries(activeEntries),
    [activeEntries],
  );

  const hasAnyData = quarters.some((q) => q.tested > 0);

  /* Latest quarter headline */
  const latest = quarters[0];

  return (
    <div className="bento-card flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-poppins font-semibold text-gray-900">Quarterly Summary</h2>
        <Link
          href="/controls?tab=quarterly-summary"
          className="text-xs text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1 transition-colors"
        >
          Full view <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Current quarter headline */}
      {latest && (
        <div className="rounded-xl bg-updraft-pale-purple/30 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-updraft-bar mb-0.5">
              {latest.quarter}
            </p>
            <p className="text-3xl font-bold font-poppins text-updraft-deep">
              {latest.tested > 0 ? <><AnimatedNumber value={latest.passRate} delay={100} duration={800} />%</> : "—"}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">pass rate</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            {latest.tested > 0 ? (
              <>
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 size={11} /> <AnimatedNumber value={latest.pass} delay={200} duration={600} /> passed
                </span>
                {latest.fail > 0 && (
                  <span className="text-red-600"><AnimatedNumber value={latest.fail} delay={300} duration={600} /> failed</span>
                )}
                {latest.partially > 0 && (
                  <span className="text-amber-600"><AnimatedNumber value={latest.partially} delay={400} duration={600} /> partial</span>
                )}
              </>
            ) : (
              <span className="flex items-center gap-1 text-gray-400">
                <Clock size={11} /> No results yet
              </span>
            )}
          </div>
        </div>
      )}

      {/* Previous quarters table */}
      {hasAnyData ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Historical
          </p>
          {quarters.slice(1).map((q) => (
            <Link
              key={q.quarter}
              href={`/controls?tab=quarterly-summary`}
              className="flex items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors group"
            >
              <span className="text-xs font-medium text-gray-500 w-12 shrink-0">
                {q.qLabel}
              </span>
              <PassBar rate={q.passRate} tested={q.tested} />
              {q.tested > 0 && (
                <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                  {q.tested} tested
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No test results yet.</p>
            <Link
              href="/controls?tab=quarterly-summary"
              className="text-xs text-updraft-bright-purple hover:underline"
            >
              Open quarterly summary →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
