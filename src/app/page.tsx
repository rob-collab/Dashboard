"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Megaphone,
  RefreshCw,
  BarChart3,
  Radio,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useHasPermission } from "@/lib/usePermission";
import { usePageTitle } from "@/lib/usePageTitle";
import { cn } from "@/lib/utils";
import { BentoGrid } from "@/components/ui/bento-grid";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardNotification, Role } from "@/lib/types";

// ── Time-of-day greeting ──────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

// ── Greeting header with broadcast messages ───────────────────────────────
function GreetingHeader({
  userName,
  notifications,
  role,
}: {
  userName: string;
  notifications: DashboardNotification[];
  role: string;
}) {
  const [greeting] = useState(getGreeting);
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const activeMessages = notifications.filter((n) => {
    if (!n.active) return false;
    if (n.expiresAt && new Date(n.expiresAt) < now) return false;
    if (n.targetRoles?.length > 0 && !n.targetRoles.includes(role as Role)) return false;
    return true;
  });

  const urgencyStyles: Record<DashboardNotification["type"], string> = {
    URGENT: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/40 dark:text-red-300",
    WARNING: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/40 dark:text-amber-300",
    INFO: "bg-updraft-pale-purple/30 border-updraft-light-purple/30 text-updraft-deep dark:bg-updraft-bar/10 dark:border-updraft-bar/20 dark:text-updraft-pale-purple",
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-updraft-deep via-updraft-bar to-updraft-bright-purple p-6 text-white shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-poppins text-2xl font-semibold tracking-tight">
            {greeting}, {userName.split(" ")[0]}.
          </p>
          <p className="mt-0.5 text-sm text-white/60">{dateLabel}</p>
        </div>
        {/* Subtle logo mark */}
        <div className="shrink-0 opacity-20">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <circle cx="18" cy="18" r="17" stroke="white" strokeWidth="1.5" />
            <path d="M11 18 L18 10 L25 18 L18 26 Z" stroke="white" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      </div>

      {/* Broadcast messages */}
      {activeMessages.length > 0 && (
        <div className="mt-4 space-y-2">
          {activeMessages.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-sm",
                urgencyStyles[n.type]
              )}
            >
              <Megaphone size={14} className="mt-0.5 shrink-0" />
              <span>{n.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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


export default function DashboardHome() {
  usePageTitle("Dashboard");
  const prefersReduced = useReducedMotion();
  const router = useRouter();

  const hydrated = useAppStore((s) => s._hydrated);
  const currentUser = useAppStore((s) => s.currentUser);
  const risks = useAppStore((s) => s.risks);
  const actions = useAppStore((s) => s.actions);
  const controls = useAppStore((s) => s.controls);
  const regulations = useAppStore((s) => s.regulations);
  const certifiedPersons = useAppStore((s) => s.certifiedPersons);
  const notifications = useAppStore((s) => s.notifications);
  const outcomes = useAppStore((s) => s.outcomes);
  const horizonItems = useAppStore((s) => s.horizonItems);

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

  // ── Action Needed (personal) ──────────────────────────────────────────
  const actionNeeded = useMemo(() => {
    if (!currentUser) return { overdueActions: [], risksNeedingRefresh: [], staleMetrics: [], latestHorizon: null };

    // Overdue actions assigned to me
    const overdueActions = actions
      .filter((a) =>
        a.assignedTo === currentUser.id &&
        a.status !== "COMPLETED" &&
        (a.status === "OVERDUE" || (daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! <= 0))
      )
      .slice(0, 5);

    // My risks needing review
    const risksNeedingRefresh = risks
      .filter((r) => {
        if (r.ownerId !== currentUser.id) return false;
        if (r.reviewRequested) return true;
        const lastRev = new Date(r.lastReviewed);
        const nextReview = new Date(lastRev);
        nextReview.setDate(nextReview.getDate() + (r.reviewFrequencyDays ?? 90));
        return Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 7;
      })
      .slice(0, 4);

    // Consumer Duty metrics I own not updated in 30+ days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const staleMetrics = outcomes
      .flatMap((o) =>
        (o.measures ?? [])
          .filter(
            (m) =>
              currentUser.assignedMeasures.includes(m.measureId) &&
              (!m.lastUpdatedAt || new Date(m.lastUpdatedAt) < thirtyDaysAgo)
          )
          .map((m) => ({ ...m, outcomeName: o.name }))
      )
      .slice(0, 4);

    // Most recent inFocus or highest-urgency horizon item
    const latestHorizon =
      horizonItems.find((h) => h.inFocus && h.urgency === "HIGH") ??
      horizonItems.find((h) => h.urgency === "HIGH") ??
      horizonItems.find((h) => h.inFocus) ??
      horizonItems[0] ??
      null;

    return { overdueActions, risksNeedingRefresh, staleMetrics, latestHorizon };
  }, [currentUser, actions, risks, outcomes, horizonItems]);

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
      {currentUser && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <GreetingHeader
            userName={currentUser.name}
            notifications={notifications}
            role={currentUser.role}
          />
        </motion.div>
      )}

      <BentoGrid
        // ── 1. Action Needed (tall card — personal) ───────────────────
        overview={
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Action Needed</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5 overflow-y-auto">

              {/* All clear */}
              {actionNeeded.overdueActions.length === 0 &&
               actionNeeded.risksNeedingRefresh.length === 0 &&
               actionNeeded.staleMetrics.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                  <p className="font-medium text-gray-700 dark:text-gray-300">You&apos;re all caught up.</p>
                  <p className="text-xs text-gray-400">No overdue actions or items requiring your attention.</p>
                </div>
              )}

              {/* ── Overdue actions ── */}
              {actionNeeded.overdueActions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={12} className="text-red-500" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-red-500">
                      Overdue Actions
                    </p>
                    <span className="ml-auto font-mono text-xs text-red-400">
                      {actionNeeded.overdueActions.length}
                    </span>
                  </div>
                  {actionNeeded.overdueActions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => hasActionsPage && router.push(`/actions?edit=${a.id}`)}
                      className="flex w-full items-start gap-2 rounded-lg border border-red-100 bg-red-50/50 p-2.5 text-left transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-updraft-bright-purple focus-visible:ring-offset-1 dark:border-red-900/20 dark:bg-red-900/5 dark:hover:bg-red-900/10"
                    >
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">
                        {a.title}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-red-400">{a.reference}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Risks needing refresh ── */}
              {actionNeeded.risksNeedingRefresh.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={12} className="text-amber-500" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      Risks Due for Review
                    </p>
                    <span className="ml-auto font-mono text-xs text-amber-400">
                      {actionNeeded.risksNeedingRefresh.length}
                    </span>
                  </div>
                  {actionNeeded.risksNeedingRefresh.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => hasRiskPage && router.push(`/risk-register?risk=${r.id}`)}
                      className="flex w-full items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 text-left transition-colors hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-updraft-bright-purple focus-visible:ring-offset-1 dark:border-amber-900/20 dark:bg-amber-900/5 dark:hover:bg-amber-900/10"
                    >
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">
                        {r.name}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-amber-400">{r.reference}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Stale metrics ── */}
              {actionNeeded.staleMetrics.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={12} className="text-updraft-bar" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-updraft-bar dark:text-updraft-light-purple">
                      Metrics Not Updated
                    </p>
                    <span className="ml-auto font-mono text-xs text-updraft-light-purple">
                      {actionNeeded.staleMetrics.length}
                    </span>
                  </div>
                  {actionNeeded.staleMetrics.map((m) => (
                    <button
                      key={m.measureId}
                      onClick={() => router.push("/consumer-duty")}
                      className="flex w-full items-start gap-2 rounded-lg border border-updraft-pale-purple/40 bg-updraft-pale-purple/10 p-2.5 text-left transition-colors hover:bg-updraft-pale-purple/20 focus-visible:ring-2 focus-visible:ring-updraft-bright-purple focus-visible:ring-offset-1 dark:border-updraft-bar/20 dark:bg-updraft-bar/5 dark:hover:bg-updraft-bar/10"
                    >
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-updraft-bar" />
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">
                        {m.measureId} — {m.outcomeName}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Latest horizon update — only when nothing more urgent ── */}
              {actionNeeded.latestHorizon &&
               actionNeeded.overdueActions.length === 0 &&
               actionNeeded.risksNeedingRefresh.length === 0 &&
               actionNeeded.staleMetrics.length === 0 && (
                <div className="mt-auto space-y-2">
                  <div className="border-t border-gray-100 pt-4 dark:border-gray-800" />
                  <div className="flex items-center gap-2">
                    <Radio size={12} className="text-updraft-bar" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      Latest Horizon Update
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/horizon-scanning")}
                    className="flex w-full flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-left transition-colors hover:bg-gray-100/50 focus-visible:ring-2 focus-visible:ring-updraft-bright-purple focus-visible:ring-offset-1 dark:border-gray-800 dark:bg-gray-800/30 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-gray-400">{actionNeeded.latestHorizon.reference}</span>
                      <Badge variant={actionNeeded.latestHorizon.urgency === "HIGH" ? "critical" : actionNeeded.latestHorizon.urgency === "MEDIUM" ? "medium" : "low"}>
                        {actionNeeded.latestHorizon.urgency}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2 leading-snug">
                      {actionNeeded.latestHorizon.title}
                    </p>
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-updraft-bar dark:text-updraft-light-purple">
                      View horizon scanning <ArrowRight size={10} />
                    </span>
                  </button>
                </div>
              )}

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
                  <AnimatedNumber value={actionStats.open} duration={600} />
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
                <AnimatedNumber value={programmeHealth.score} duration={900} />
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
            <CardContent className="flex flex-1 flex-col justify-between">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">P1 — Critical</span>
                  </div>
                  <span className="font-poppins text-2xl font-bold text-red-600 dark:text-red-400">
                    <AnimatedNumber value={actionStats.p1} duration={500} />
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">P2 — High</span>
                  </div>
                  <span className="font-poppins text-2xl font-bold text-orange-500 dark:text-orange-400">
                    <AnimatedNumber value={actionStats.p2} duration={500} />
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-gray-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">P3 — Standard</span>
                  </div>
                  <span className="font-poppins text-2xl font-bold text-gray-600 dark:text-gray-300">
                    <AnimatedNumber value={actionStats.p3} duration={500} />
                  </span>
                </div>
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
                    <AnimatedNumber value={controlsHealth.passRate} duration={700} />%
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">pass rate</p>
                {/* Animated progress bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <motion.div
                    className={cn(
                      "h-full rounded-full origin-left",
                      controlsHealth.passRate >= 80
                        ? "bg-emerald-500"
                        : controlsHealth.passRate >= 60
                        ? "bg-amber-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${controlsHealth.passRate}%` }}
                    initial={prefersReduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                  />
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-400">
                {controlsHealth.passing} passing
                {controlsHealth.failing > 0 && <span className="text-red-500"> · {controlsHealth.failing} failing</span>}
                {controlsHealth.untested > 0 && ` · ${controlsHealth.untested} untested`}
              </p>

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
                <p className="text-xs text-gray-400">
                  No risks pinned.{" "}
                  <button
                    onClick={() => hasRiskPage && router.push("/risk-register")}
                    className="text-updraft-bar hover:text-updraft-deep transition-colors"
                  >
                    Star a risk in the register
                  </button>{" "}
                  to track it here.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {focusRisks.map((r) => {
                    const level = riskSeverityLevel(riskScore(r));
                    return (
                      <button
                        key={r.id}
                        onClick={() => hasRiskPage && router.push(`/risk-register?risk=${r.id}`)}
                        className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-3 text-left transition-all hover:border-updraft-light-purple/30 hover:shadow-bento focus-visible:ring-2 focus-visible:ring-updraft-bright-purple focus-visible:ring-offset-1 dark:border-gray-800 dark:hover:border-updraft-bar/30"
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
