"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useHasPermission } from "@/lib/usePermission";
import { usePageTitle } from "@/lib/usePageTitle";
import { cn } from "@/lib/utils";
import { BentoGrid } from "@/components/ui/bento-grid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WelcomeBanner from "@/components/common/WelcomeBanner";

function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Risk severity helper ──────────────────────────────────────────────────
function riskScore(r: { residualLikelihood: number; residualImpact: number }): number {
  return r.residualLikelihood * r.residualImpact;
}

function riskSeverityLevel(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 20) return "critical";
  if (score >= 12) return "high";
  if (score >= 6) return "medium";
  return "low";
}

// ── Severity bar ──────────────────────────────────────────────────────────
function SeverityBar({
  label,
  count,
  total,
  variant,
}: {
  label: string;
  count: number;
  total: number;
  variant: "critical" | "high" | "medium" | "low";
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colours = {
    critical: "bg-red-500",
    high: "bg-orange-400",
    medium: "bg-amber-400",
    low: "bg-emerald-400",
  };
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn("h-full rounded-full transition-all duration-700", colours[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
        {count}
      </span>
    </div>
  );
}

export default function DashboardHome() {
  usePageTitle("Dashboard");
  const router = useRouter();

  const hydrated = useAppStore((s) => s._hydrated);
  const currentUser = useAppStore((s) => s.currentUser);
  const risks = useAppStore((s) => s.risks);
  const actions = useAppStore((s) => s.actions);
  const controls = useAppStore((s) => s.controls);
  const regulations = useAppStore((s) => s.regulations);
  const certifiedPersons = useAppStore((s) => s.certifiedPersons);

  const canViewPending = useHasPermission("can:view-pending");
  const hasCompliancePage = useHasPermission("page:compliance");
  const hasRiskPage = useHasPermission("page:risk-register");
  const hasActionsPage = useHasPermission("page:actions");
  const hasControlsPage = useHasPermission("page:controls");

  // ── Risk breakdown ────────────────────────────────────────────────────
  const riskStats = useMemo(() => {
    const scored = risks.map((r) => ({
      ...r,
      _score: riskScore(r),
      level: riskSeverityLevel(riskScore(r)),
    }));
    const critical = scored.filter((r) => r.level === "critical");
    const high = scored.filter((r) => r.level === "high");
    const medium = scored.filter((r) => r.level === "medium");
    const low = scored.filter((r) => r.level === "low");
    const needsReview = risks.filter((r) => {
      if (r.reviewRequested) return true;
      const lastRev = new Date(r.lastReviewed);
      const nextReview = new Date(lastRev);
      nextReview.setDate(nextReview.getDate() + (r.reviewFrequencyDays ?? 90));
      return Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 7;
    });
    const topCritical = [...critical, ...high]
      .sort((a, b) => b._score - a._score)
      .slice(0, 4);
    return { total: risks.length, critical: critical.length, high: high.length, medium: medium.length, low: low.length, needsReview: needsReview.length, topCritical };
  }, [risks]);

  // ── Action stats ──────────────────────────────────────────────────────
  const actionStats = useMemo(() => {
    const pool = canViewPending ? actions : actions.filter((a) => a.assignedTo === currentUser?.id);
    const open = pool.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS").length;
    const overdue = pool.filter(
      (a) =>
        a.status === "OVERDUE" ||
        (a.status !== "COMPLETED" && daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! <= 0)
    ).length;
    const dueThisWeek = pool.filter((a) => {
      if (a.status === "COMPLETED") return false;
      const d = daysUntilDue(a.dueDate);
      return d !== null && d > 0 && d <= 7;
    }).length;
    const p1 = pool.filter((a) => a.status !== "COMPLETED" && a.priority === "P1").length;
    const p2 = pool.filter((a) => a.status !== "COMPLETED" && a.priority === "P2").length;
    const p3 = pool.filter((a) => a.status !== "COMPLETED" && a.priority === "P3").length;
    return { open, overdue, dueThisWeek, p1, p2, p3 };
  }, [actions, canViewPending, currentUser?.id]);

  // ── Controls health ───────────────────────────────────────────────────
  const controlsHealth = useMemo(() => {
    const active = controls.filter((c) => c.isActive);
    if (active.length === 0) return { passRate: 0, passing: 0, failing: 0, total: 0, untested: 0 };
    let passing = 0;
    let failing = 0;
    let untested = 0;
    for (const ctrl of active) {
      const results = ctrl.testingSchedule?.testResults ?? [];
      if (results.length === 0) { untested++; continue; }
      const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
      if (sorted[0].result === "PASS") passing++;
      else failing++;
    }
    const tested = passing + failing;
    const passRate = tested > 0 ? Math.round((passing / tested) * 100) : 0;
    return { passRate, passing, failing, total: active.length, untested };
  }, [controls]);

  // ── Compliance health ─────────────────────────────────────────────────
  const complianceHealth = useMemo(() => {
    if (!hasCompliancePage) return null;
    const applicable = regulations.filter((r) => r.isApplicable);
    if (applicable.length === 0) return null;
    const compliant = applicable.filter((r) => r.complianceStatus === "COMPLIANT").length;
    const compliantPct = Math.round((compliant / applicable.length) * 100);
    const pendingCerts = certifiedPersons.filter((c) => c.status === "DUE" || c.status === "OVERDUE").length;
    return { compliantPct, total: applicable.length, compliant, pendingCerts };
  }, [regulations, certifiedPersons, hasCompliancePage]);

  // ── Programme health (composite) ─────────────────────────────────────
  const programmeHealth = useMemo(() => {
    const total = actions.filter((a) => a.status !== "COMPLETED").length;
    const onTrackPct = total > 0 ? Math.round(((total - actionStats.overdue) / total) * 100) : 100;
    const controlPct = controlsHealth.passRate;
    const compliancePct = complianceHealth?.compliantPct ?? 75;
    const criticalAndHigh = riskStats.critical + riskStats.high;
    const riskPct = riskStats.total > 0
      ? Math.round(((riskStats.total - criticalAndHigh) / riskStats.total) * 100)
      : 100;
    const score = Math.round((onTrackPct + controlPct + compliancePct + riskPct) / 4);
    let trend: "up" | "down" | "flat" = "flat";
    if (score >= 80) trend = "up";
    else if (score < 60) trend = "down";
    return { score, trend };
  }, [actions, actionStats.overdue, controlsHealth.passRate, complianceHealth, riskStats]);

  // ── Risks in Focus ────────────────────────────────────────────────────
  const focusRisks = useMemo(() => risks.filter((r) => r.inFocus).slice(0, 5), [risks]);

  // ── Loading ───────────────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-updraft-bright-purple border-t-transparent" />
          <p className="text-sm text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Score colour ──────────────────────────────────────────────────────
  const scoreColour =
    programmeHealth.score >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : programmeHealth.score >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-6 p-6">
      {currentUser && <WelcomeBanner currentUser={currentUser} />}

      <BentoGrid
        // ── 1. Risk Overview (tall card) ──────────────────────────────
        overview={
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Risk Register</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5">
              {/* Hero number */}
              <div className="flex items-baseline gap-2">
                <span className="font-poppins text-6xl font-bold text-gray-900 dark:text-white leading-none">
                  {riskStats.total}
                </span>
                <span className="text-sm text-gray-400">total risks</span>
              </div>

              {/* Severity bars */}
              <div className="space-y-2.5">
                <SeverityBar label="Critical" count={riskStats.critical} total={riskStats.total} variant="critical" />
                <SeverityBar label="High" count={riskStats.high} total={riskStats.total} variant="high" />
                <SeverityBar label="Medium" count={riskStats.medium} total={riskStats.total} variant="medium" />
                <SeverityBar label="Low" count={riskStats.low} total={riskStats.total} variant="low" />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-gray-800" />

              {/* Top risks */}
              <div className="flex-1 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Top Risks
                </p>
                {riskStats.topCritical.length === 0 && (
                  <p className="text-sm text-gray-400">No critical or high risks.</p>
                )}
                {riskStats.topCritical.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => hasRiskPage && router.push(`/risk-register?risk=${r.id}`)}
                    className="flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        r.level === "critical" ? "bg-red-500" : "bg-orange-400"
                      )}
                    />
                    <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">
                      {r.name}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-gray-400">{r.reference}</span>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                {riskStats.needsReview > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <Clock size={11} />
                    {riskStats.needsReview} need review
                  </span>
                )}
                <button
                  onClick={() => hasRiskPage && router.push("/risk-register")}
                  className="ml-auto flex items-center gap-1 text-xs font-medium text-updraft-bar hover:text-updraft-deep dark:text-updraft-light-purple transition-colors"
                >
                  View register <ArrowRight size={12} />
                </button>
              </div>
            </CardContent>
          </Card>
        }

        // ── 2. Actions summary ────────────────────────────────────────
        actions={
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between">
              <div className="flex items-baseline gap-3">
                <span className="font-poppins text-5xl font-bold text-gray-900 dark:text-white leading-none">
                  {actionStats.open}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">open</span>
                  {actionStats.overdue > 0 && (
                    <Badge variant="critical" className="text-xs">
                      {actionStats.overdue} overdue
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-400">Due this week</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{actionStats.dueThisWeek}</span>
                </div>
                {actionStats.overdue > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-400">Overdue</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{actionStats.overdue}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => hasActionsPage && router.push("/actions")}
                className="mt-auto flex items-center gap-1 self-end text-xs font-medium text-updraft-bar hover:text-updraft-deep dark:text-updraft-light-purple transition-colors"
              >
                View all <ArrowRight size={12} />
              </button>
            </CardContent>
          </Card>
        }

        // ── 3. Programme Health ───────────────────────────────────────
        health={
          <Card className="relative h-full overflow-hidden">
            {/* Dot pattern background */}
            <div
              className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08]"
              style={{
                backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
                backgroundSize: "18px 18px",
                color: "#673AB7",
              }}
            />
            <CardHeader className="relative z-10">
              <CardTitle>Programme Health</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 flex h-[calc(100%-4.5rem)] flex-col items-center justify-center gap-2">
              <span className={cn("font-poppins text-7xl font-bold leading-none", scoreColour)}>
                {programmeHealth.score}
                <span className="text-4xl">%</span>
              </span>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                {programmeHealth.trend === "up" && <TrendingUp size={13} className="text-emerald-500" />}
                {programmeHealth.trend === "down" && <TrendingDown size={13} className="text-red-500" />}
                {programmeHealth.trend === "flat" && <Minus size={13} className="text-gray-400" />}
                <span>composite score</span>
              </div>
            </CardContent>
          </Card>
        }

        // ── 4. Priority breakdown ─────────────────────────────────────
        priorities={
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Priorities</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2.5 dark:bg-red-900/10">
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">P1 — Critical</p>
                    <p className="text-xs text-red-500/70 dark:text-red-400/50">Immediate attention</p>
                  </div>
                  <span className="font-poppins text-3xl font-bold text-red-700 dark:text-red-400">
                    {actionStats.p1}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2.5 dark:bg-orange-900/10">
                  <div>
                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">P2 — High</p>
                    <p className="text-xs text-orange-500/70 dark:text-orange-400/50">Due within 7 days</p>
                  </div>
                  <span className="font-poppins text-3xl font-bold text-orange-700 dark:text-orange-400">
                    {actionStats.p2}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800/50">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">P3 — Standard</p>
                    <p className="text-xs text-gray-400">On track</p>
                  </div>
                  <span className="font-poppins text-3xl font-bold text-gray-600 dark:text-gray-300">
                    {actionStats.p3}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        }

        // ── 5. Controls health ────────────────────────────────────────
        controls={
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-poppins text-5xl font-bold leading-none",
                      controlsHealth.passRate >= 80
                        ? "text-emerald-600 dark:text-emerald-400"
                        : controlsHealth.passRate >= 60
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {controlsHealth.passRate}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">pass rate</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/10">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {controlsHealth.passing}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">passing</p>
                </div>
                <div className="rounded-lg bg-red-50 p-2 dark:bg-red-900/10">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle size={11} className="text-red-600 dark:text-red-400" />
                    <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                      {controlsHealth.failing}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">failing</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800/50">
                  <div className="flex items-center justify-center gap-1">
                    <ShieldCheck size={11} className="text-gray-500" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {controlsHealth.total}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">active</p>
                </div>
              </div>

              <button
                onClick={() => hasControlsPage && router.push("/controls")}
                className="mt-3 flex items-center gap-1 self-end text-xs font-medium text-updraft-bar hover:text-updraft-deep dark:text-updraft-light-purple transition-colors"
              >
                View library <ArrowRight size={12} />
              </button>
            </CardContent>
          </Card>
        }

        // ── 6. Risks in Focus (wide card) ─────────────────────────────
        focus={
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Risks in Focus</CardTitle>
                {focusRisks.length > 0 && (
                  <Badge variant="default">{focusRisks.length} starred</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {focusRisks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <Star size={20} className="text-gray-300" />
                  <p className="text-sm text-gray-400">
                    No risks in focus. Star a risk in the register to pin it here.
                  </p>
                  <button
                    onClick={() => hasRiskPage && router.push("/risk-register")}
                    className="mt-1 flex items-center gap-1 text-xs font-medium text-updraft-bar hover:text-updraft-deep transition-colors"
                  >
                    Open register <ArrowRight size={12} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {focusRisks.map((r) => {
                    const level = riskSeverityLevel(riskScore(r));
                    return (
                      <button
                        key={r.id}
                        onClick={() => hasRiskPage && router.push(`/risk-register?risk=${r.id}`)}
                        className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-3 text-left transition-all hover:border-updraft-light-purple/30 hover:shadow-bento dark:border-gray-800 dark:hover:border-updraft-bar/30"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-gray-400">{r.reference}</span>
                          <Badge variant={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</Badge>
                        </div>
                        <p className="line-clamp-2 text-xs font-medium text-gray-700 dark:text-gray-300 leading-snug">
                          {r.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
