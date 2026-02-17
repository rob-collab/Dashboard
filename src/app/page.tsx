"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Shield,
  AlertTriangle,
  ArrowRight,
  Plus,
  Bell,
  Clock,
  ShieldAlert,
  ListChecks,
  BarChart3,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate, ragBgColor } from "@/lib/utils";
import { getActionLabel } from "@/lib/audit";
import { getRiskScore } from "@/lib/risk-categories";
import type { ActionPriority } from "@/lib/types";
import ScoreBadge from "@/components/risk-register/ScoreBadge";
import DirectionArrow from "@/components/risk-register/DirectionArrow";

function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; description: string; color: string; bg: string; border: string }> = {
  P1: { label: "P1 — Critical", description: "Urgent, requires immediate attention", color: "text-red-700", bg: "bg-red-50", border: "border-red-200 hover:border-red-400" },
  P2: { label: "P2 — Important", description: "Significant, needs timely resolution", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200 hover:border-amber-400" },
  P3: { label: "P3 — Routine", description: "Standard priority, planned resolution", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200 hover:border-slate-400" },
};

export default function DashboardHome() {
  const hydrated = useAppStore((s) => s._hydrated);
  const currentUser = useAppStore((s) => s.currentUser);
  const branding = useAppStore((s) => s.branding);
  const siteSettings = useAppStore((s) => s.siteSettings);
  const reports = useAppStore((s) => s.reports);
  const outcomes = useAppStore((s) => s.outcomes);
  const actions = useAppStore((s) => s.actions);
  const auditLogs = useAppStore((s) => s.auditLogs);
  const users = useAppStore((s) => s.users);
  const risks = useAppStore((s) => s.risks);

  const role = currentUser?.role;
  const isCCRO = role === "CCRO_TEAM";
  const isOwner = role === "OWNER";

  // (Stats computed inline where needed per role)

  // Priority action stats — filtered by role
  const priorityStats = useMemo(() => {
    const pool = (isCCRO ? actions : isOwner ? actions.filter((a) => a.assignedTo === currentUser?.id) : actions)
      .filter((a) => a.status !== "COMPLETED");
    return {
      P1: pool.filter((a) => a.priority === "P1"),
      P2: pool.filter((a) => a.priority === "P2"),
      P3: pool.filter((a) => a.priority === "P3"),
    };
  }, [actions, isCCRO, isOwner, currentUser?.id]);

  const actionStats = useMemo(() => {
    const open = actions.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS").length;
    const overdue = actions.filter(
      (a) =>
        a.status === "OVERDUE" ||
        (a.status !== "COMPLETED" && daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! <= 0)
    ).length;
    const dueThisMonth = actions.filter((a) => {
      if (a.status === "COMPLETED") return false;
      const days = daysUntilDue(a.dueDate);
      return days !== null && days > 0 && days <= 30;
    }).length;
    const completed = actions.filter((a) => a.status === "COMPLETED").length;
    return { open, overdue, dueThisMonth, completed };
  }, [actions]);

  // Personal notification data
  const myOverdueActions = useMemo(() => {
    if (!currentUser) return [];
    return actions.filter((a) =>
      a.assignedTo === currentUser.id &&
      a.status !== "COMPLETED" &&
      (a.status === "OVERDUE" || (daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! <= 0))
    );
  }, [actions, currentUser]);

  const myDueThisMonthActions = useMemo(() => {
    if (!currentUser) return [];
    return actions.filter((a) => {
      if (a.assignedTo !== currentUser.id || a.status === "COMPLETED") return false;
      const days = daysUntilDue(a.dueDate);
      return days !== null && days > 0 && days <= 30;
    });
  }, [actions, currentUser]);

  const risksNeedingReview = useMemo(() => {
    return risks.filter((r) => {
      if (r.reviewRequested) return true;
      const lastRev = new Date(r.lastReviewed);
      const nextReview = new Date(lastRev);
      nextReview.setDate(nextReview.getDate() + (r.reviewFrequencyDays ?? 90));
      const daysUntil = Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    });
  }, [risks]);

  const pendingChanges = useMemo(() => {
    return actions.flatMap((a) => (a.changes ?? []).filter((c) => c.status === "PENDING"));
  }, [actions]);

  // OWNER-specific: my risks, my actions, my metrics
  const myRisks = useMemo(() => {
    if (!currentUser) return [];
    return risks.filter((r) => r.ownerId === currentUser.id);
  }, [risks, currentUser]);

  const myActions = useMemo(() => {
    if (!currentUser) return [];
    return actions
      .filter((a) => a.assignedTo === currentUser.id && a.status !== "COMPLETED")
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [actions, currentUser]);

  const myMetrics = useMemo(() => {
    if (!currentUser || currentUser.assignedMeasures.length === 0) return [];
    return outcomes.flatMap((o) =>
      (o.measures ?? []).filter((m) => currentUser.assignedMeasures.includes(m.measureId))
    );
  }, [outcomes, currentUser]);

  const myRisksNeedingReview = useMemo(() => {
    return risksNeedingReview.filter((r) => r.ownerId === currentUser?.id);
  }, [risksNeedingReview, currentUser?.id]);

  // Published reports for non-CCRO users
  const publishedReports = useMemo(() => reports.filter((r) => r.status === "PUBLISHED"), [reports]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-updraft-bright-purple border-t-transparent"></div>
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-updraft-deep to-updraft-bar p-8 text-white">
        <div className="absolute top-0 right-0 opacity-20">
          <svg width="300" height="200" viewBox="0 0 300 200">
            <circle cx="250" cy="30" r="100" fill="#E1BEE7" />
            <circle cx="180" cy="150" r="60" fill="#BA68C8" />
          </svg>
        </div>
        <div className="relative flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              Welcome back, {currentUser?.name || "User"}
            </h1>
            <p className="mt-1 text-white/80">
              Updraft CCRO Report Management Dashboard
            </p>

            {/* Notification pills — role-specific */}
            {isCCRO && (myOverdueActions.length > 0 || myDueThisMonthActions.length > 0 || risksNeedingReview.length > 0 || pendingChanges.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {myOverdueActions.length > 0 && (
                  <Link href="/actions?status=OVERDUE" className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 transition-colors">
                    <AlertTriangle className="h-3 w-3" />
                    {myOverdueActions.length} overdue action{myOverdueActions.length > 1 ? "s" : ""}
                  </Link>
                )}
                {myDueThisMonthActions.length > 0 && (
                  <Link href="/actions" className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 transition-colors">
                    <Clock className="h-3 w-3" />
                    {myDueThisMonthActions.length} due this month
                  </Link>
                )}
                {risksNeedingReview.length > 0 && (
                  <Link href="/risk-register" className="inline-flex items-center gap-1.5 rounded-full bg-updraft-bright-purple/90 px-3 py-1 text-xs font-semibold text-white hover:bg-updraft-bright-purple transition-colors">
                    <ShieldAlert className="h-3 w-3" />
                    {risksNeedingReview.length} risk{risksNeedingReview.length > 1 ? "s" : ""} due for review
                  </Link>
                )}
                {pendingChanges.length > 0 && (
                  <Link href="/actions" className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/90 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600 transition-colors">
                    <Bell className="h-3 w-3" />
                    {pendingChanges.length} pending approval{pendingChanges.length > 1 ? "s" : ""}
                  </Link>
                )}
              </div>
            )}

            {isOwner && (myOverdueActions.length > 0 || myDueThisMonthActions.length > 0 || myRisksNeedingReview.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {myOverdueActions.length > 0 && (
                  <Link href="/actions?status=OVERDUE" className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 transition-colors">
                    <AlertTriangle className="h-3 w-3" />
                    {myOverdueActions.length} overdue action{myOverdueActions.length > 1 ? "s" : ""}
                  </Link>
                )}
                {myDueThisMonthActions.length > 0 && (
                  <Link href="/actions" className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 transition-colors">
                    <Clock className="h-3 w-3" />
                    {myDueThisMonthActions.length} due this month
                  </Link>
                )}
                {myRisksNeedingReview.length > 0 && (
                  <Link href="/risk-register" className="inline-flex items-center gap-1.5 rounded-full bg-updraft-bright-purple/90 px-3 py-1 text-xs font-semibold text-white hover:bg-updraft-bright-purple transition-colors">
                    <ShieldAlert className="h-3 w-3" />
                    {myRisksNeedingReview.length} risk{myRisksNeedingReview.length > 1 ? "s" : ""} due for review
                  </Link>
                )}
              </div>
            )}

            {/* VIEWER: no notification pills */}

            {/* Action buttons — only CCRO gets New Report */}
            <div className="mt-3 flex gap-3">
              {isCCRO && (
                <Link
                  href="/reports/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Report
                </Link>
              )}
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <FileText className="h-4 w-4" />
                View Reports
              </Link>
            </div>
          </div>
          {branding.dashboardIconSrc && (
            <div className="flex-shrink-0 hidden sm:block">
              <img
                src={branding.dashboardIconSrc}
                alt={branding.dashboardIconAlt}
                className="object-contain"
                style={{
                  width: (siteSettings?.logoScale ?? 1) * 80,
                  height: (siteSettings?.logoScale ?? 1) * 80,
                  marginRight: siteSettings?.logoX ?? 0,
                  marginTop: siteSettings?.logoY ?? 0,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Priority Action Cards (ALL roles) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["P1", "P2", "P3"] as ActionPriority[]).map((p) => {
          const config = PRIORITY_CONFIG[p];
          const items = priorityStats[p];
          return (
            <Link
              key={p}
              href={`/actions?priority=${p}`}
              className={`rounded-2xl border ${config.border} ${config.bg} p-5 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold ${config.color}`}>{config.label}</h3>
                <span className={`text-3xl font-bold font-poppins ${config.color}`}>{items.length}</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-3">{config.description}</p>
              {items.length > 0 ? (
                <div className="space-y-1.5">
                  {items.slice(0, 3).map((a) => {
                    const owner = users.find((u) => u.id === a.assignedTo);
                    return (
                      <div key={a.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 truncate flex-1 min-w-0">{a.title}</span>
                        <span className="text-gray-400 shrink-0 ml-2">{owner?.name ?? "—"}</span>
                      </div>
                    );
                  })}
                  {items.length > 3 && (
                    <p className="text-[10px] text-gray-400">+{items.length - 3} more</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No active actions</p>
              )}
            </Link>
          );
        })}
      </div>

      {/* ═══════════════ CCRO_TEAM Dashboard ═══════════════ */}
      {isCCRO && (
        <>
          {/* Pending Approvals */}
          {pendingChanges.length > 0 && (
            <div className="bento-card border-2 border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-updraft-deep font-poppins">Pending Approvals</h2>
                  <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">{pendingChanges.length}</span>
                </div>
                <Link href="/actions" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                  Review All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-2">
                {pendingChanges.slice(0, 5).map((c) => {
                  const action = actions.find((a) => a.id === c.actionId);
                  return (
                    <Link key={c.id} href="/actions" className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/50 hover:bg-amber-100/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{action?.title ?? "Unknown action"}</p>
                        <p className="text-[10px] text-gray-500">
                          {c.isUpdate ? "Progress update" : `${c.fieldChanged}: ${c.oldValue ?? "—"} → ${c.newValue}`}
                          {" · "}by {c.proposer?.name ?? "Unknown"} · {formatDate(c.proposedAt)}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0 ml-2">Pending</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Tracking stats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">Action Tracking</h2>
              <Link href="/actions" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/actions?status=OPEN" className="rounded-xl border border-gray-200 bg-blue-50 p-3 cursor-pointer hover:border-blue-300 transition-colors">
                <p className="text-xs text-gray-500">Open</p>
                <p className="text-2xl font-bold font-poppins text-blue-700">{actionStats.open}</p>
              </Link>
              <Link href="/actions?status=OVERDUE" className="rounded-xl border border-gray-200 bg-red-50 p-3 cursor-pointer hover:border-red-300 transition-colors">
                <p className="text-xs text-gray-500">Overdue</p>
                <p className="text-2xl font-bold font-poppins text-red-700">{actionStats.overdue}</p>
              </Link>
              <Link href="/actions" className="rounded-xl border border-gray-200 bg-amber-50 p-3 cursor-pointer hover:border-amber-300 transition-colors">
                <p className="text-xs text-gray-500">Due This Month</p>
                <p className="text-2xl font-bold font-poppins text-amber-700">{actionStats.dueThisMonth}</p>
              </Link>
              <Link href="/actions?status=COMPLETED" className="rounded-xl border border-gray-200 bg-blue-50 p-3 cursor-pointer hover:border-blue-300 transition-colors">
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-2xl font-bold font-poppins text-blue-700">{actionStats.completed}</p>
              </Link>
            </div>
          </div>

          {/* Consumer Duty Overview */}
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-updraft-deep">Consumer Duty Overview</h2>
              <Link href="/consumer-duty" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                View Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {outcomes.map((outcome) => (
                <div key={outcome.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${ragBgColor(outcome.ragStatus)}`} />
                    <div>
                      <p className="text-sm font-medium">{outcome.name}</p>
                      <p className="text-xs text-fca-gray">{outcome.shortDesc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-fca-gray">{outcome.measures?.length || 0} measures</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      outcome.ragStatus === "GOOD" ? "bg-green-100 text-risk-green" :
                      outcome.ragStatus === "WARNING" ? "bg-amber-100 text-risk-amber" :
                      "bg-red-100 text-risk-red"
                    }`}>
                      {outcome.ragStatus === "GOOD" ? "Green" : outcome.ragStatus === "WARNING" ? "Amber" : "Red"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks & Reviews */}
          {(risksNeedingReview.length > 0 || myOverdueActions.length > 0) && (
            <div>
              <h2 className="text-lg font-bold text-updraft-deep font-poppins mb-3">Tasks & Reviews</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bento-card">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-4 w-4 text-updraft-bright-purple" />
                    <h3 className="text-sm font-semibold text-gray-700">Risks Due for Review</h3>
                  </div>
                  {risksNeedingReview.length === 0 ? (
                    <p className="text-xs text-gray-400">No reviews due</p>
                  ) : (
                    <div className="space-y-2">
                      {risksNeedingReview.slice(0, 5).map((r) => {
                        const nextReview = new Date(r.lastReviewed);
                        nextReview.setDate(nextReview.getDate() + (r.reviewFrequencyDays ?? 90));
                        const daysUntil = Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <Link key={r.id} href="/risk-register" className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{r.reference}: {r.name}</p>
                              <p className="text-[10px] text-gray-400">Owner: {r.riskOwner?.name ?? users.find(u => u.id === r.ownerId)?.name ?? "Unknown"}</p>
                            </div>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ml-2 ${
                              r.reviewRequested ? "bg-updraft-pale-purple/50 text-updraft-deep" :
                              daysUntil <= 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {r.reviewRequested ? "Requested" : daysUntil <= 0 ? "Overdue" : `${daysUntil}d`}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bento-card">
                  <div className="flex items-center gap-2 mb-3">
                    <ListChecks className="h-4 w-4 text-red-500" />
                    <h3 className="text-sm font-semibold text-gray-700">My Overdue Actions</h3>
                  </div>
                  {myOverdueActions.length === 0 ? (
                    <p className="text-xs text-gray-400">No overdue actions</p>
                  ) : (
                    <div className="space-y-2">
                      {myOverdueActions.slice(0, 5).map((a) => (
                        <Link key={a.id} href="/actions?status=OVERDUE" className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          <p className="text-xs font-medium text-gray-800 truncate flex-1 min-w-0">{a.title}</p>
                          <span className="text-[10px] font-semibold text-red-600 shrink-0 ml-2">
                            {a.dueDate ? `${Math.abs(daysUntilDue(a.dueDate) ?? 0)}d overdue` : "Overdue"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reports Table — all reports */}
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-updraft-deep">Reports</h2>
              <Link href="/reports" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-fca-gray">Report</th>
                    <th className="text-left py-2 px-3 font-medium text-fca-gray">Period</th>
                    <th className="text-left py-2 px-3 font-medium text-fca-gray">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-fca-gray">Updated</th>
                    <th className="text-right py-2 px-3 font-medium text-fca-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">{report.title}</td>
                      <td className="py-3 px-3 text-fca-gray">{report.period}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          report.status === "DRAFT" ? "bg-red-100 text-red-700" :
                          report.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {report.status === "DRAFT" ? "Draft" : report.status === "PUBLISHED" ? "Published" : "Archived"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-fca-gray text-xs">{formatDate(report.updatedAt)}</td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/reports/${report.id}/edit`} className="text-updraft-bright-purple hover:text-updraft-deep text-xs font-medium mr-3">Edit</Link>
                        <Link href={`/reports/${report.id}`} className="text-fca-gray hover:text-fca-dark-gray text-xs font-medium">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">Recent Activity</h2>
              <Link href="/audit" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {auditLogs.slice(0, 20).map((log) => {
                const logUser = users.find((u) => u.id === log.userId);
                return (
                  <div key={log.id} className="flex-shrink-0 w-64 rounded-xl border border-gray-200 bg-white p-3 hover:border-updraft-light-purple transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-updraft-pale-purple/40 text-[10px] font-semibold text-updraft-bright-purple">
                        {(logUser?.name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-gray-800 truncate">{logUser?.name || log.userId}</span>
                    </div>
                    <p className="text-xs text-fca-gray truncate">{getActionLabel(log.action)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(log.timestamp)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ OWNER Dashboard ═══════════════ */}
      {isOwner && (
        <>
          {/* My Risks */}
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-updraft-bright-purple" />
                <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Risks</h2>
                <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold">{myRisks.length}</span>
              </div>
              <Link href="/risk-register" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                Risk Register <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {myRisks.length === 0 ? (
              <p className="text-sm text-gray-400">No risks assigned to you</p>
            ) : (
              <div className="space-y-2">
                {myRisks.map((r) => {
                  const nextReview = new Date(r.lastReviewed);
                  nextReview.setDate(nextReview.getDate() + (r.reviewFrequencyDays ?? 90));
                  return (
                    <Link key={r.id} href="/risk-register" className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <span className="text-xs font-mono font-bold text-updraft-deep shrink-0">{r.reference}</span>
                      <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{r.name}</span>
                      <ScoreBadge likelihood={r.residualLikelihood} impact={r.residualImpact} size="sm" />
                      <DirectionArrow direction={r.directionOfTravel} />
                      <span className="text-[10px] text-gray-400 shrink-0">{nextReview.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Due Actions */}
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-updraft-bright-purple" />
                <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Due Actions</h2>
                <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold">{myActions.length}</span>
              </div>
              <Link href="/actions" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                All Actions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {myActions.length === 0 ? (
              <p className="text-sm text-gray-400">No active actions assigned to you</p>
            ) : (
              <div className="space-y-2">
                {myActions.slice(0, 8).map((a) => {
                  const days = daysUntilDue(a.dueDate);
                  const isOverdue = days !== null && days <= 0;
                  return (
                    <Link key={a.id} href="/actions" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      {a.priority && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          a.priority === "P1" ? "bg-red-100 text-red-700" :
                          a.priority === "P2" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>{a.priority}</span>
                      )}
                      <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{a.title}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                        a.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" :
                        a.status === "OVERDUE" || isOverdue ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {a.status === "OVERDUE" || isOverdue ? "Overdue" : a.status === "IN_PROGRESS" ? "In Progress" : "Open"}
                      </span>
                      <span className={`text-xs shrink-0 ${isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                        {a.dueDate ? new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "No date"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Metrics */}
          {myMetrics.length > 0 && (
            <div className="bento-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-updraft-bright-purple" />
                  <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Metrics</h2>
                  <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold">{myMetrics.length}</span>
                </div>
                <Link href="/consumer-duty" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                  Consumer Duty <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-2">
                {myMetrics.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.measureId}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      m.ragStatus === "GOOD" ? "bg-green-100 text-risk-green" :
                      m.ragStatus === "WARNING" ? "bg-amber-100 text-risk-amber" :
                      "bg-red-100 text-risk-red"
                    }`}>
                      {m.ragStatus === "GOOD" ? "Green" : m.ragStatus === "WARNING" ? "Amber" : "Red"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consumer Duty Overview */}
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-updraft-deep">Consumer Duty Overview</h2>
              <Link href="/consumer-duty" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                View Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {outcomes.map((outcome) => (
                <div key={outcome.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${ragBgColor(outcome.ragStatus)}`} />
                    <div>
                      <p className="text-sm font-medium">{outcome.name}</p>
                      <p className="text-xs text-fca-gray">{outcome.shortDesc}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    outcome.ragStatus === "GOOD" ? "bg-green-100 text-risk-green" :
                    outcome.ragStatus === "WARNING" ? "bg-amber-100 text-risk-amber" :
                    "bg-red-100 text-risk-red"
                  }`}>
                    {outcome.ragStatus === "GOOD" ? "Green" : outcome.ragStatus === "WARNING" ? "Amber" : "Red"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Published Reports only */}
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-updraft-deep">Published Reports</h2>
              <Link href="/reports" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-fca-gray">Report</th>
                    <th className="text-left py-2 px-3 font-medium text-fca-gray">Period</th>
                    <th className="text-left py-2 px-3 font-medium text-fca-gray">Updated</th>
                    <th className="text-right py-2 px-3 font-medium text-fca-gray"></th>
                  </tr>
                </thead>
                <tbody>
                  {publishedReports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">{report.title}</td>
                      <td className="py-3 px-3 text-fca-gray">{report.period}</td>
                      <td className="py-3 px-3 text-fca-gray text-xs">{formatDate(report.updatedAt)}</td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/reports/${report.id}`} className="text-updraft-bright-purple hover:text-updraft-deep text-xs font-medium">View</Link>
                      </td>
                    </tr>
                  ))}
                  {publishedReports.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-sm text-gray-400">No published reports yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ VIEWER Dashboard ═══════════════ */}
      {!isCCRO && !isOwner && (
        <>
          {/* My Risks (items VIEWER owns) */}
          {myRisks.length > 0 && (
            <div className="bento-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-updraft-bright-purple" />
                  <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Risks</h2>
                  <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold">{myRisks.length}</span>
                </div>
                <Link href="/risk-register" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                  Risk Register <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-2">
                {myRisks.map((r) => (
                  <Link key={r.id} href="/risk-register" className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-xs font-mono font-bold text-updraft-deep shrink-0">{r.reference}</span>
                    <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{r.name}</span>
                    <ScoreBadge likelihood={r.residualLikelihood} impact={r.residualImpact} size="sm" />
                    <DirectionArrow direction={r.directionOfTravel} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* My Actions (items VIEWER owns) */}
          {myActions.length > 0 && (
            <div className="bento-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-updraft-bright-purple" />
                  <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Actions</h2>
                  <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold">{myActions.length}</span>
                </div>
                <Link href="/actions" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                  All Actions <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-2">
                {myActions.slice(0, 5).map((a) => {
                  const days = daysUntilDue(a.dueDate);
                  const isOverdue = days !== null && days <= 0;
                  return (
                    <Link key={a.id} href="/actions" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      {a.priority && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          a.priority === "P1" ? "bg-red-100 text-red-700" :
                          a.priority === "P2" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>{a.priority}</span>
                      )}
                      <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{a.title}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                        a.status === "OVERDUE" || isOverdue ? "bg-red-100 text-red-700" :
                        a.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {a.status === "OVERDUE" || isOverdue ? "Overdue" : a.status === "IN_PROGRESS" ? "In Progress" : "Open"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Consumer Duty Overview */}
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-updraft-deep">Consumer Duty Overview</h2>
              <Link href="/consumer-duty" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                View Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {outcomes.map((outcome) => (
                <div key={outcome.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${ragBgColor(outcome.ragStatus)}`} />
                    <div>
                      <p className="text-sm font-medium">{outcome.name}</p>
                      <p className="text-xs text-fca-gray">{outcome.shortDesc}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    outcome.ragStatus === "GOOD" ? "bg-green-100 text-risk-green" :
                    outcome.ragStatus === "WARNING" ? "bg-amber-100 text-risk-amber" :
                    "bg-red-100 text-risk-red"
                  }`}>
                    {outcome.ragStatus === "GOOD" ? "Green" : outcome.ragStatus === "WARNING" ? "Amber" : "Red"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Summary Stats */}
          <div>
            <h2 className="text-lg font-bold text-updraft-deep font-poppins mb-3">Risk Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Total Risks</p>
                <p className="text-2xl font-bold font-poppins text-updraft-deep">{risks.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-green-50 p-3">
                <p className="text-xs text-gray-500">Low Risk</p>
                <p className="text-2xl font-bold font-poppins text-green-700">
                  {risks.filter((r) => getRiskScore(r.residualLikelihood, r.residualImpact) <= 4).length}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-amber-50 p-3">
                <p className="text-xs text-gray-500">Medium Risk</p>
                <p className="text-2xl font-bold font-poppins text-amber-700">
                  {risks.filter((r) => { const s = getRiskScore(r.residualLikelihood, r.residualImpact); return s > 4 && s <= 12; }).length}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-red-50 p-3">
                <p className="text-xs text-gray-500">High Risk</p>
                <p className="text-2xl font-bold font-poppins text-red-700">
                  {risks.filter((r) => getRiskScore(r.residualLikelihood, r.residualImpact) > 12).length}
                </p>
              </div>
            </div>
          </div>

          {/* Published Reports only */}
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-updraft-deep">Published Reports</h2>
              <Link href="/reports" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-fca-gray">Report</th>
                    <th className="text-left py-2 px-3 font-medium text-fca-gray">Period</th>
                    <th className="text-left py-2 px-3 font-medium text-fca-gray">Updated</th>
                    <th className="text-right py-2 px-3 font-medium text-fca-gray"></th>
                  </tr>
                </thead>
                <tbody>
                  {publishedReports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">{report.title}</td>
                      <td className="py-3 px-3 text-fca-gray">{report.period}</td>
                      <td className="py-3 px-3 text-fca-gray text-xs">{formatDate(report.updatedAt)}</td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/reports/${report.id}`} className="text-updraft-bright-purple hover:text-updraft-deep text-xs font-medium">View</Link>
                      </td>
                    </tr>
                  ))}
                  {publishedReports.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-sm text-gray-400">No published reports yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
