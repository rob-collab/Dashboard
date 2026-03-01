"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Clock } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import type { TestingScheduleEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

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

/* ── Spring easing constant ─────────────────────────────────────────────── */

/** CSS spring easing — bars overshoot slightly then snap back. */
const SPRING_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/* ── Pass rate bar ─────────────────────────────────────────────────────── */

function PassBar({
  rate,
  tested,
  inView,
}: { rate: number; tested: number; inView: boolean }) {
  const prefersReduced = useReducedMotion();

  if (tested === 0) {
    return <span className="text-[10px] text-gray-400 italic">No results</span>;
  }

  // Bar grows from 0 to target when inView; spring easing for fun feel
  const barWidth = (prefersReduced || inView) ? `${rate}%` : "0%";

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            rate >= 80 ? "bg-green-500" : rate >= 60 ? "bg-amber-500" : "bg-red-500",
          )}
          style={{
            width: barWidth,
            transitionProperty: prefersReduced ? "none" : "width",
            transitionDuration: prefersReduced ? "0ms" : "600ms",
            transitionTimingFunction: prefersReduced ? "linear" : SPRING_EASING,
          }}
        />
      </div>
      <AnimatedNumber
        value={rate}
        className={cn(
          "text-xs font-semibold tabular-nums shrink-0",
          rate >= 80 ? "text-green-700" : rate >= 60 ? "text-amber-600" : "text-red-600",
        )}
      />
      <span
        className={cn(
          "text-xs font-semibold tabular-nums shrink-0",
          rate >= 80 ? "text-green-700" : rate >= 60 ? "text-amber-600" : "text-red-600",
        )}
      >
        %
      </span>
    </div>
  );
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function QuarterlySummaryWidget() {
  const testingSchedule = useAppStore((s) => s.testingSchedule);
  const prefersReduced  = useReducedMotion();

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

  /* Scroll trigger — observe the whole widget */
  const widgetRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const wasInView = useRef(false);

  useEffect(() => {
    if (prefersReduced) { setInView(true); return; }

    const el = widgetRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !wasInView.current) {
          wasInView.current = true;
          setInView(true);
        } else if (!entry.isIntersecting) {
          wasInView.current = false;
          setInView(false); // reset for re-entry
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  return (
    <div ref={widgetRef} className="bento-card flex flex-col gap-3 h-full">
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

      {/* Current quarter headline — AnimatedNumber fires on scroll */}
      {latest && (
        <div className="rounded-xl bg-updraft-pale-purple/30 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-updraft-bar mb-0.5">
              {latest.quarter}
            </p>
            <div className="flex items-baseline gap-0">
              {latest.tested > 0 ? (
                <>
                  <AnimatedNumber
                    value={latest.passRate}
                    className="text-3xl font-bold font-poppins text-updraft-deep"
                  />
                  <span className="text-3xl font-bold font-poppins text-updraft-deep">%</span>
                </>
              ) : (
                <p className="text-3xl font-bold font-poppins text-updraft-deep">—</p>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">pass rate</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            {latest.tested > 0 ? (
              <>
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 size={11} /> {latest.pass} passed
                </span>
                {latest.fail > 0 && (
                  <span className="text-red-600">{latest.fail} failed</span>
                )}
                {latest.partially > 0 && (
                  <span className="text-amber-600">{latest.partially} partial</span>
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

      {/* Previous quarters table — PassBars scroll-triggered */}
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
              <PassBar rate={q.passRate} tested={q.tested} inView={inView} />
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
