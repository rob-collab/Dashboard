"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  BarChart3,
  Radio,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useHasPermission } from "@/lib/usePermission";
import { usePageTitle } from "@/lib/usePageTitle";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WidgetGrid } from "@/components/dashboard/widgets/WidgetGrid";
import { useWidgetLayout } from "@/hooks/useWidgetLayout";
import { RiskPostureWidget } from "@/components/dashboard/widgets/RiskPostureWidget";
import { ControlsHeartbeatWidget } from "@/components/dashboard/widgets/ControlsHeartbeatWidget";
import { ConsumerDutyHealthWidget } from "@/components/dashboard/widgets/ConsumerDutyHealthWidget";
import { HorizonAlertWidget } from "@/components/dashboard/widgets/HorizonAlertWidget";
import { ActionMomentumWidget } from "@/components/dashboard/widgets/ActionMomentumWidget";
import { ApprovalQueueWidget } from "@/components/dashboard/widgets/ApprovalQueueWidget";
import { FirmStatusWidget } from "@/components/dashboard/widgets/FirmStatusWidget";
import { MyRunwayWidget } from "@/components/dashboard/widgets/MyRunwayWidget";
import { MyPortfolioWidget } from "@/components/dashboard/widgets/MyPortfolioWidget";
import { RisksInFocusWidget } from "@/components/dashboard/widgets/RisksInFocusWidget";
import type { DashboardNotification, Role, WidgetId } from "@/lib/types";

// ── Time-of-day greeting ──────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

// ── Notification banner styles (module-level constant — no recreation per render) ──
const bannerStyles: Record<"INFO" | "WARNING" | "URGENT", { wrapper: string; badge: string }> = {
  INFO: {
    wrapper: "bg-white/[0.13] border-t border-white/[0.18]",
    badge: "bg-white/20 text-white/90",
  },
  WARNING: {
    wrapper: "bg-amber-400/[0.18] border-t border-amber-400/30",
    badge: "bg-amber-400/35 text-amber-200",
  },
  URGENT: {
    wrapper: "bg-red-500/20 border-t border-red-500/35",
    badge: "bg-red-500/35 text-red-200",
  },
};

// ── Greeting header with broadcast messages ───────────────────────────────
function GreetingHeader({
  userName,
  notifications,
  role,
  editMode,
  isSaving,
  onToggle,
}: {
  userName: string;
  notifications: DashboardNotification[];
  role: string;
  editMode: boolean;
  isSaving: boolean;
  onToggle: () => void;
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
  }).sort((a, b) => {
    const priority = { URGENT: 0, WARNING: 1, INFO: 2 };
    return priority[a.type] - priority[b.type];
  });

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-updraft-deep via-[#1e1b4b] to-updraft-bar p-6 text-white shadow-xl">
      {/* Subtle depth overlay — matches Horizon In Focus spotlight */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="font-poppins text-2xl font-semibold tracking-tight">
            {greeting}, {userName.split(" ")[0]}.
          </p>
          <p className="mt-0.5 text-sm text-white/60">{dateLabel}</p>
        </div>
        {/* Customise my dashboard toggle */}
        <button
          onClick={onToggle}
          disabled={isSaving}
          className={cn(
            "shrink-0 rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            editMode
              ? "border-white/35 bg-white/[0.22] font-semibold text-white"
              : "border-white/[0.2] bg-white/[0.12] font-medium text-white/80 hover:bg-white/20"
          )}
        >
          {isSaving ? "Saving…" : editMode ? "Done" : "Customise my dashboard"}
        </button>
      </div>

      {/* Notification banners — full-width strips pinned flush to the bottom edge */}
      {activeMessages.length > 0 && (
        <div className="relative -mx-6 -mb-6 mt-4">
          {activeMessages.map((n) => {
            const s = bannerStyles[n.type];
            return (
              <div
                key={n.id}
                data-testid={`notification-banner-${n.type.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-3 px-6 py-2.5 text-sm text-white/90",
                  s.wrapper
                )}
              >
                <span
                  data-testid={`notification-badge-${n.type.toLowerCase()}`}
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    s.badge
                  )}
                >
                  {n.type}
                </span>
                <span>{n.message}</span>
              </div>
            );
          })}
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


// ── Action Needed widget (personal items requiring attention) ─────────────
function ActionNeededCard() {
  const currentUser = useAppStore((s) => s.currentUser);
  const actions = useAppStore((s) => s.actions);
  const risks = useAppStore((s) => s.risks);
  const outcomes = useAppStore((s) => s.outcomes);
  const horizonItems = useAppStore((s) => s.horizonItems);
  const hasActionsPage = useHasPermission("page:actions");
  const hasRiskPage = useHasPermission("page:risk-register");
  const router = useRouter();

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

  return (
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
  );
}

export default function DashboardHome() {
  usePageTitle("Dashboard");
  const prefersReduced = useReducedMotion();

  const hydrated = useAppStore((s) => s._hydrated);
  const currentUser = useAppStore((s) => s.currentUser);
  const notifications = useAppStore((s) => s.notifications);

  const { order, heights, hiddenIds, pinnedIds, editMode, toggleEditMode, onOrderChange, onResize, onHide, onShow, isSaving, saveNow } =
    useWidgetLayout(currentUser?.id, currentUser?.role as Role | undefined);

  const renderWidget = useCallback((widgetId: WidgetId): React.ReactNode => {
    switch (widgetId) {
      case "approval-queue":       return <ApprovalQueueWidget />;
      case "risk-posture":         return <RiskPostureWidget simplified={currentUser?.role === "CEO"} />;
      case "controls-heartbeat":   return <ControlsHeartbeatWidget />;
      case "consumer-duty-health": return <ConsumerDutyHealthWidget />;
      case "horizon-alert":        return <HorizonAlertWidget />;
      case "action-momentum":      return <ActionMomentumWidget />;
      case "my-runway":            return <MyRunwayWidget />;
      case "firm-status":          return <FirmStatusWidget />;
      case "action-needed":        return <ActionNeededCard />;
      case "my-portfolio":         return <MyPortfolioWidget />;
      case "risks-in-focus":       return <RisksInFocusWidget />;
      default:                     return null;
    }
  }, [currentUser?.role]);

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
            editMode={editMode}
            isSaving={isSaving}
            onToggle={() => { if (editMode) saveNow(); toggleEditMode(); }}
          />
        </motion.div>
      )}

      <WidgetGrid
        order={order}
        heights={heights}
        hiddenIds={hiddenIds}
        pinnedIds={pinnedIds}
        editMode={editMode}
        onOrderChange={onOrderChange}
        onResize={onResize}
        onHide={onHide}
        onShow={onShow}
        renderWidget={renderWidget}
      />
    </div>
  );
}
