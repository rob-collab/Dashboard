"use client";

import { useMemo, useState, useCallback } from "react";
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
  ShieldQuestion,
  ListChecks,
  BarChart3,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { formatDate, ragBgColor } from "@/lib/utils";
import { getActionLabel } from "@/lib/audit";
import { getRiskScore } from "@/lib/risk-categories";
import type { ActionPriority, ActionChange, ControlChange } from "@/lib/types";
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

/* ── Field label humaniser ───────────────────────────────────────────── */
const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  dueDate: "Due Date",
  assignedTo: "Assigned To",
  title: "Title",
  description: "Description",
  priority: "Priority",
  controlName: "Control Name",
  controlDescription: "Control Description",
  controlOwnerId: "Control Owner",
  consumerDutyOutcome: "Consumer Duty Outcome",
  controlFrequency: "Frequency",
  controlType: "Control Type",
  internalOrThirdParty: "Internal/Third Party",
  standingComments: "Standing Comments",
  businessAreaId: "Business Area",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

/* ── Pending Changes Panel ───────────────────────────────────────────── */
type PendingItem = (ActionChange | ControlChange) & {
  _type: "action" | "control";
  _parentTitle: string;
  _parentId: string;
  _parentRef: string;
};

function PendingChangesPanel({
  changes,
  users,
  updateAction,
  updateControl,
}: {
  changes: PendingItem[];
  users: { id: string; name: string }[];
  updateAction: (id: string, data: Record<string, unknown>) => void;
  updateControl: (id: string, data: Record<string, unknown>) => void;
}) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  const handleReview = useCallback(async (
    change: PendingItem,
    decision: "APPROVED" | "REJECTED"
  ) => {
    setReviewingId(change.id);
    try {
      const note = reviewNotes[change.id] || undefined;
      if (change._type === "action") {
        const ac = change as ActionChange & { _parentId: string };
        await api(`/api/actions/${ac._parentId}/changes/${change.id}`, {
          method: "PATCH",
          body: { status: decision, reviewNote: note },
        });
        // Refresh action changes in store
        const updatedChanges = await api<ActionChange[]>(`/api/actions/${ac._parentId}/changes`);
        updateAction(ac._parentId, { changes: updatedChanges });
      } else {
        const cc = change as ControlChange & { _parentId: string };
        await api(`/api/controls/library/${cc._parentId}/changes/${change.id}`, {
          method: "PATCH",
          body: { status: decision, reviewNote: note },
        });
        const updatedChanges = await api<ControlChange[]>(`/api/controls/library/${cc._parentId}/changes`);
        updateControl(cc._parentId, { changes: updatedChanges });
      }
      setProcessedIds((prev) => { const next = new Set(prev); next.add(change.id); return next; });
      toast.success(decision === "APPROVED" ? "Change approved" : "Change rejected");
    } catch (err) {
      toast.error("Failed to process change", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setReviewingId(null);
    }
  }, [reviewNotes, updateAction, updateControl]);

  const visibleChanges = changes.filter((c) => !processedIds.has(c.id));

  if (visibleChanges.length === 0) return null;

  return (
    <div className="bento-card border-2 border-amber-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">Proposed Changes</h2>
          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">{visibleChanges.length}</span>
        </div>
      </div>
      <div className="space-y-3">
        {visibleChanges.map((c) => {
          const proposerName = c.proposer?.name ?? users.find((u) => u.id === c.proposedBy)?.name ?? "Unknown";
          const isAction = c._type === "action";
          const ac = isAction ? (c as ActionChange & PendingItem) : null;
          const cc = !isAction ? (c as ControlChange & PendingItem) : null;
          const isProcessing = reviewingId === c.id;
          const originHref = isAction ? `/actions?edit=${c._parentId}` : `/controls?control=${c._parentId}`;

          return (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Header */}
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-50/80">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isAction ? "bg-blue-100" : "bg-purple-100"}`}>
                  {isAction ? <ListChecks className="h-4 w-4 text-blue-600" /> : <FlaskConical className="h-4 w-4 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isAction ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                      {isAction ? "Action" : "Control"}
                    </span>
                    <span className="text-xs font-mono font-bold text-updraft-deep">{c._parentRef}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{c._parentTitle}</p>
                </div>
                <Link
                  href={originHref}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-updraft-bright-purple hover:text-updraft-deep transition-colors px-2 py-1 rounded-md hover:bg-updraft-pale-purple/20"
                  title={`View ${isAction ? "action" : "control"} details`}
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </Link>
              </div>

              {/* Change Details */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Proposed by <strong className="text-gray-700">{proposerName}</strong></span>
                  <span className="text-gray-300">·</span>
                  <span>{formatDate(c.proposedAt)}</span>
                </div>

                {ac?.isUpdate ? (
                  <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Progress Update</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{ac.newValue ?? "No details provided"}</p>
                    {ac.evidenceUrl && (
                      <a
                        href={ac.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {ac.evidenceName ?? "View evidence"}
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-2">
                      Field: {fieldLabel(c.fieldChanged)}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Current Value</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white/70 rounded px-2 py-1.5 border border-gray-100 min-h-[2rem]">
                          {c.oldValue || <span className="text-gray-400 italic">Empty</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Proposed Value</p>
                        <p className="text-sm text-gray-900 font-medium whitespace-pre-wrap bg-white/70 rounded px-2 py-1.5 border border-amber-200 min-h-[2rem]">
                          {c.newValue || <span className="text-gray-400 italic">Empty</span>}
                        </p>
                      </div>
                    </div>
                    {cc?.rationale && (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Rationale</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{cc.rationale}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Review note input + action buttons */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <textarea
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple/30 outline-none resize-none"
                    rows={2}
                    placeholder="Review note (optional)..."
                    value={reviewNotes[c.id] ?? ""}
                    onChange={(e) => setReviewNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleReview(c, "REJECTED")}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview(c, "APPROVED")}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const riskAcceptances = useAppStore((s) => s.riskAcceptances);
  const controls = useAppStore((s) => s.controls);
  const updateAction = useAppStore((s) => s.updateAction);
  const updateControl = useAppStore((s) => s.updateControl);

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

  const pendingActionChanges = useMemo(() => {
    return actions.flatMap((a) =>
      (a.changes ?? []).filter((c) => c.status === "PENDING").map((c) => ({
        ...c,
        _type: "action" as const,
        _parentTitle: a.title,
        _parentId: a.id,
        _parentRef: a.reference ?? a.id.slice(0, 8),
      }))
    );
  }, [actions]);

  const pendingControlChanges = useMemo(() => {
    return controls.flatMap((ctrl) =>
      (ctrl.changes ?? []).filter((c) => c.status === "PENDING").map((c) => ({
        ...c,
        _type: "control" as const,
        _parentTitle: ctrl.controlName,
        _parentId: ctrl.id,
        _parentRef: ctrl.controlRef,
      }))
    );
  }, [controls]);

  const allPendingChanges = useMemo(() => {
    return [...pendingActionChanges, ...pendingControlChanges].sort(
      (a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime()
    );
  }, [pendingActionChanges, pendingControlChanges]);

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

  // Overdue metrics (not updated in 30+ days)
  const overdueMetrics = useMemo(() => {
    return outcomes.flatMap((o) =>
      (o.measures ?? []).filter((m) => {
        if (!m.lastUpdatedAt) return true;
        const lastUpdate = new Date(m.lastUpdatedAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastUpdate < thirtyDaysAgo;
      })
    );
  }, [outcomes]);

  // Published reports for non-CCRO users
  const publishedReports = useMemo(() => reports.filter((r) => r.status === "PUBLISHED"), [reports]);

  // Risk Acceptance stats — visible to all roles
  const raStats = useMemo(() => {
    const expired = riskAcceptances.filter((ra) => ra.status === "EXPIRED");
    const awaiting = riskAcceptances.filter((ra) => ra.status === "AWAITING_APPROVAL");
    const ccroReview = riskAcceptances.filter((ra) => ra.status === "CCRO_REVIEW" || ra.status === "PROPOSED");
    const accepted = riskAcceptances.filter((ra) => ra.status === "APPROVED");
    // Urgent: expired first, then awaiting approval
    const urgent = [...expired, ...awaiting].slice(0, 3);
    // Upcoming reviews: approved with review dates
    const now = Date.now();
    const withReview = accepted
      .filter((ra) => ra.reviewDate)
      .map((ra) => ({ ...ra, daysUntil: Math.ceil((new Date(ra.reviewDate!).getTime() - now) / 86400000) }))
      .sort((a, b) => a.daysUntil - b.daysUntil);
    const overdue = withReview.filter((r) => r.daysUntil < 0);
    const due30 = withReview.filter((r) => r.daysUntil >= 0 && r.daysUntil <= 30);
    const beyond30 = withReview.filter((r) => r.daysUntil > 30);
    return { expired: expired.length, awaiting: awaiting.length, ccroReview: ccroReview.length, accepted: accepted.length, urgent, overdue, due30, beyond30 };
  }, [riskAcceptances]);

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
      <div className="card-entrance card-entrance-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1C1B29] via-updraft-deep to-updraft-bar p-8 text-white">
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(255,255,255,0.1) 25%, transparent 25%),
            linear-gradient(225deg, rgba(255,255,255,0.1) 25%, transparent 25%),
            linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
            linear-gradient(315deg, rgba(255,255,255,0.05) 25%, transparent 25%)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 0 0, 20px 20px, 20px 20px',
        }} />
        {/* Angled accent lines */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
            <line x1="100" y1="0" x2="300" y2="200" stroke="#E1BEE7" strokeWidth="1" />
            <line x1="150" y1="0" x2="350" y2="200" stroke="#BA68C8" strokeWidth="0.5" />
            <line x1="200" y1="0" x2="400" y2="200" stroke="#E1BEE7" strokeWidth="1" />
            <line x1="250" y1="0" x2="400" y2="150" stroke="#BA68C8" strokeWidth="0.5" />
            <line x1="300" y1="0" x2="400" y2="100" stroke="#E1BEE7" strokeWidth="0.5" />
          </svg>
        </div>
        <div className="relative flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-poppins tracking-tight">
              Welcome back, {currentUser?.name || "User"}
            </h1>
            <p className="mt-1 text-white/60 text-sm">
              Updraft CCRO Report Management Dashboard
            </p>

            {/* Notification pills — role-specific */}
            {isCCRO && (myOverdueActions.length > 0 || myDueThisMonthActions.length > 0 || risksNeedingReview.length > 0 || allPendingChanges.length > 0 || overdueMetrics.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {overdueMetrics.length > 0 && (
                  <Link href="/consumer-duty?rag=ATTENTION" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <BarChart3 className="h-3 w-3 text-red-300" />
                    {overdueMetrics.length} overdue metric{overdueMetrics.length > 1 ? "s" : ""}
                  </Link>
                )}
                {myOverdueActions.length > 0 && (
                  <Link href="/actions?status=OVERDUE" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <AlertTriangle className="h-3 w-3 text-red-300" />
                    {myOverdueActions.length} overdue action{myOverdueActions.length > 1 ? "s" : ""}
                  </Link>
                )}
                {myDueThisMonthActions.length > 0 && (
                  <Link href="/actions" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <Clock className="h-3 w-3 text-amber-300" />
                    {myDueThisMonthActions.length} due this month
                  </Link>
                )}
                {risksNeedingReview.length > 0 && (
                  <Link href="/risk-register" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <ShieldAlert className="h-3 w-3 text-updraft-pale-purple" />
                    {risksNeedingReview.length} risk{risksNeedingReview.length > 1 ? "s" : ""} due for review
                  </Link>
                )}
                {allPendingChanges.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white">
                    <Bell className="h-3 w-3 text-blue-300" />
                    {allPendingChanges.length} pending approval{allPendingChanges.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}

            {isOwner && (myOverdueActions.length > 0 || myDueThisMonthActions.length > 0 || myRisksNeedingReview.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {myOverdueActions.length > 0 && (
                  <Link href="/actions?status=OVERDUE" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <AlertTriangle className="h-3 w-3 text-red-300" />
                    {myOverdueActions.length} overdue action{myOverdueActions.length > 1 ? "s" : ""}
                  </Link>
                )}
                {myDueThisMonthActions.length > 0 && (
                  <Link href="/actions" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <Clock className="h-3 w-3 text-amber-300" />
                    {myDueThisMonthActions.length} due this month
                  </Link>
                )}
                {myRisksNeedingReview.length > 0 && (
                  <Link href="/risk-register" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <ShieldAlert className="h-3 w-3 text-updraft-pale-purple" />
                    {myRisksNeedingReview.length} risk{myRisksNeedingReview.length > 1 ? "s" : ""} due for review
                  </Link>
                )}
              </div>
            )}

            {/* VIEWER: no notification pills */}

            {/* Action buttons — only CCRO gets New Report */}
            <div className="mt-4 flex gap-3">
              {isCCRO && (
                <Link
                  href="/reports/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/25 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  New Report
                </Link>
              )}
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-lg bg-white/[0.07] backdrop-blur-sm border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/15 hover:text-white transition-all"
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
        {(["P1", "P2", "P3"] as ActionPriority[]).map((p, idx) => {
          const config = PRIORITY_CONFIG[p];
          const items = priorityStats[p];
          return (
            <Link
              key={p}
              href={`/actions?priority=${p}`}
              className={`card-entrance card-entrance-${idx + 2} rounded-2xl border ${config.border} p-5 transition-all hover:shadow-bento-hover`}
              style={{ background: `linear-gradient(135deg, ${p === "P1" ? "#FEF2F2" : p === "P2" ? "#FFFBEB" : "#F8FAFC"} 0%, ${p === "P1" ? "#FFF5F5" : p === "P2" ? "#FEFCE8" : "#F1F5F9"} 100%)` }}
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
                      <Link
                        key={a.id}
                        href={`/actions?edit=${a.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between text-xs hover:text-updraft-bright-purple transition-colors"
                      >
                        <span className="text-gray-700 truncate flex-1 min-w-0">{a.title}</span>
                        <span className="text-gray-400 shrink-0 ml-2">{owner?.name ?? "—"}</span>
                      </Link>
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

      {/* ── Risk Acceptance Widget (ALL roles) ── */}
      {riskAcceptances.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 card-entrance card-entrance-5">
          {/* Main RA card */}
          <Link href="/risk-acceptances" className="bento-card hover:border-updraft-light-purple transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldQuestion className="h-5 w-5 text-updraft-bright-purple" />
                <h2 className="text-lg font-bold text-updraft-deep font-poppins">Risk Acceptances</h2>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-updraft-bright-purple transition-colors" />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="rounded-lg bg-surface-muted border border-[#E8E6E1] p-2 text-center">
                <p className="text-lg font-bold font-poppins text-gray-600">{raStats.expired}</p>
                <p className="text-[10px] text-text-secondary">Expired</p>
              </div>
              <div className="rounded-lg border border-amber-100 p-2 text-center" style={{ background: "linear-gradient(135deg, #FFFBEB, #FEFCE8)" }}>
                <p className="text-lg font-bold font-poppins text-amber-700">{raStats.awaiting}</p>
                <p className="text-[10px] text-text-secondary">Awaiting</p>
              </div>
              <div className="rounded-lg border border-purple-100 p-2 text-center" style={{ background: "linear-gradient(135deg, #FAF5FF, #F5F3FF)" }}>
                <p className="text-lg font-bold font-poppins text-purple-700">{raStats.ccroReview}</p>
                <p className="text-[10px] text-text-secondary">CCRO Review</p>
              </div>
              <div className="rounded-lg border border-green-100 p-2 text-center" style={{ background: "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                <p className="text-lg font-bold font-poppins text-green-700">{raStats.accepted}</p>
                <p className="text-[10px] text-text-secondary">Accepted</p>
              </div>
            </div>
            {raStats.urgent.length > 0 && (
              <div className="space-y-1.5">
                {raStats.urgent.map((ra) => (
                  <div key={ra.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-gray-700 truncate flex-1 min-w-0">
                      <span className="font-mono font-bold text-updraft-deep mr-1">{ra.reference}</span>
                      {ra.title}
                    </span>
                    <span className={`shrink-0 ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      ra.status === "EXPIRED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {ra.status === "EXPIRED" ? "Expired" : "Awaiting"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Link>

          {/* Upcoming reviews card */}
          <div className="bento-card">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Upcoming Reviews</h3>
            </div>
            {raStats.overdue.length === 0 && raStats.due30.length === 0 && raStats.beyond30.length === 0 ? (
              <p className="text-xs text-gray-400">No upcoming reviews</p>
            ) : (
              <div className="space-y-1.5">
                {raStats.overdue.slice(0, 3).map((ra) => (
                  <Link key={ra.id} href="/risk-acceptances" className="flex items-center justify-between p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors text-xs">
                    <span className="truncate flex-1 min-w-0"><span className="font-mono font-bold">{ra.reference}</span> {ra.title}</span>
                    <span className="shrink-0 ml-2 font-semibold text-red-700">{Math.abs(ra.daysUntil)}d overdue</span>
                  </Link>
                ))}
                {raStats.due30.slice(0, 3).map((ra) => (
                  <Link key={ra.id} href="/risk-acceptances" className="flex items-center justify-between p-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors text-xs">
                    <span className="truncate flex-1 min-w-0"><span className="font-mono font-bold">{ra.reference}</span> {ra.title}</span>
                    <span className="shrink-0 ml-2 font-semibold text-amber-700">{ra.daysUntil}d</span>
                  </Link>
                ))}
                {raStats.beyond30.slice(0, 2).map((ra) => (
                  <Link key={ra.id} href="/risk-acceptances" className="flex items-center justify-between p-2 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors text-xs">
                    <span className="truncate flex-1 min-w-0"><span className="font-mono font-bold">{ra.reference}</span> {ra.title}</span>
                    <span className="shrink-0 ml-2 text-gray-500">{ra.daysUntil}d</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ CCRO_TEAM Dashboard ═══════════════ */}
      {isCCRO && (
        <>
          {/* Proposed Changes — Full Detail Panel */}
          {allPendingChanges.length > 0 && (
            <PendingChangesPanel
              changes={allPendingChanges}
              users={users}
              updateAction={updateAction}
              updateControl={updateControl}
            />
          )}

          {/* Action Tracking stats */}
          <div className="card-entrance card-entrance-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">Action Tracking</h2>
              <Link href="/actions" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/actions?status=OPEN" className="rounded-xl border border-blue-100 p-3 cursor-pointer hover:border-blue-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F0F7FF 100%)" }}>
                <p className="text-xs text-text-secondary">Open</p>
                <p className="text-2xl font-bold font-poppins text-blue-700">{actionStats.open}</p>
              </Link>
              <Link href="/actions?status=OVERDUE" className="rounded-xl border border-red-100 p-3 cursor-pointer hover:border-red-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)" }}>
                <p className="text-xs text-text-secondary">Overdue</p>
                <p className="text-2xl font-bold font-poppins text-red-700">{actionStats.overdue}</p>
              </Link>
              <Link href="/actions" className="rounded-xl border border-amber-100 p-3 cursor-pointer hover:border-amber-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEFCE8 100%)" }}>
                <p className="text-xs text-text-secondary">Due This Month</p>
                <p className="text-2xl font-bold font-poppins text-amber-700">{actionStats.dueThisMonth}</p>
              </Link>
              <Link href="/actions?status=COMPLETED" className="rounded-xl border border-blue-100 p-3 cursor-pointer hover:border-blue-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F0F7FF 100%)" }}>
                <p className="text-xs text-text-secondary">Completed</p>
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
                <Link key={outcome.id} href={`/consumer-duty?outcome=${outcome.id}`} className="block rounded-xl bg-surface-muted p-3 hover:bg-surface-warm hover:-translate-y-0.5 transition-all cursor-pointer border border-transparent hover:border-[#E8E6E1]">
                  <div className="flex items-center justify-between">
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
                  {/* Inline measures with RAG colours */}
                  {(outcome.measures ?? []).length > 0 && (
                    <div className="mt-2 ml-6 space-y-1">
                      {(outcome.measures ?? []).map((m) => (
                        <Link
                          key={m.id}
                          href={`/consumer-duty?measure=${m.id}`}
                          className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-white/60 transition-colors"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${ragBgColor(m.ragStatus)}`} />
                          <span className="text-gray-600 truncate flex-1 min-w-0">{m.measureId} — {m.name}</span>
                          <span className={`font-semibold shrink-0 ${
                            m.ragStatus === "GOOD" ? "text-risk-green" :
                            m.ragStatus === "WARNING" ? "text-risk-amber" :
                            "text-risk-red"
                          }`}>
                            {m.ragStatus === "GOOD" ? "Green" : m.ragStatus === "WARNING" ? "Amber" : "Red"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Link>
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
                          <Link key={r.id} href="/risk-register" className="flex items-center justify-between p-2 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
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
                        <Link key={a.id} href={`/actions?edit=${a.id}`} className="flex items-center justify-between p-2 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
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
                    <tr key={report.id} className="border-b border-[#E8E6E1]/50 hover:bg-surface-muted">
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
                  <Link key={log.id} href="/audit" className="flex-shrink-0 w-64 rounded-xl border border-[#E8E6E1] bg-surface-warm p-3 hover:border-updraft-light-purple hover:-translate-y-0.5 hover:shadow-bento transition-all cursor-pointer">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-updraft-pale-purple/40 text-[10px] font-semibold text-updraft-bright-purple">
                        {(logUser?.name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-gray-800 truncate">{logUser?.name || log.userId}</span>
                    </div>
                    <p className="text-xs text-fca-gray truncate">{getActionLabel(log.action)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(log.timestamp)}</p>
                  </Link>
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
                    <Link key={r.id} href="/risk-register" className="flex items-center gap-4 p-3 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
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
                    <Link key={a.id} href={`/actions?edit=${a.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
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
                {myMetrics.map((m) => {
                  const isOverdue = !m.lastUpdatedAt || new Date(m.lastUpdatedAt) < new Date(Date.now() - 30 * 86400000);
                  return (
                    <Link
                      key={m.id}
                      href={`/consumer-duty?measure=${m.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.measureId}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {isOverdue && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Overdue
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          m.ragStatus === "GOOD" ? "bg-green-100 text-risk-green" :
                          m.ragStatus === "WARNING" ? "bg-amber-100 text-risk-amber" :
                          "bg-red-100 text-risk-red"
                        }`}>
                          {m.ragStatus === "GOOD" ? "Green" : m.ragStatus === "WARNING" ? "Amber" : "Red"}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                      </div>
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
                <Link key={outcome.id} href={`/consumer-duty?outcome=${outcome.id}`} className="block rounded-xl bg-surface-muted p-3 hover:bg-surface-warm hover:-translate-y-0.5 transition-all cursor-pointer border border-transparent hover:border-[#E8E6E1]">
                  <div className="flex items-center justify-between">
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
                  {(outcome.measures ?? []).length > 0 && (
                    <div className="mt-2 ml-6 space-y-1">
                      {(outcome.measures ?? []).map((m) => (
                        <Link
                          key={m.id}
                          href={`/consumer-duty?measure=${m.id}`}
                          className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-white/60 transition-colors"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${ragBgColor(m.ragStatus)}`} />
                          <span className="text-gray-600 truncate flex-1 min-w-0">{m.measureId} — {m.name}</span>
                          <span className={`font-semibold shrink-0 ${
                            m.ragStatus === "GOOD" ? "text-risk-green" :
                            m.ragStatus === "WARNING" ? "text-risk-amber" :
                            "text-risk-red"
                          }`}>
                            {m.ragStatus === "GOOD" ? "Green" : m.ragStatus === "WARNING" ? "Amber" : "Red"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Link>
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
                    <tr key={report.id} className="border-b border-[#E8E6E1]/50 hover:bg-surface-muted">
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
          {/* Overdue Metrics Alert */}
          {overdueMetrics.length > 0 && (
            <div className="bento-card border-2 border-red-200 bg-red-50/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h2 className="text-lg font-bold text-red-700 font-poppins">Overdue Metrics</h2>
                  <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold">{overdueMetrics.length}</span>
                </div>
                <Link href="/consumer-duty" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p className="text-xs text-red-600/70 mb-3">These metrics have not been updated in over 30 days and require attention.</p>
              <div className="space-y-2">
                {overdueMetrics.slice(0, 8).map((m) => (
                  <Link
                    key={m.id}
                    href={`/consumer-duty?measure=${m.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 hover:bg-white transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.measureId} — {m.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {m.lastUpdatedAt
                          ? `Last updated ${Math.floor((Date.now() - new Date(m.lastUpdatedAt).getTime()) / 86400000)}d ago`
                          : "Never updated"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 shrink-0 ml-2">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Overdue
                    </span>
                  </Link>
                ))}
                {overdueMetrics.length > 8 && (
                  <p className="text-[10px] text-red-500 text-center">+{overdueMetrics.length - 8} more overdue metrics</p>
                )}
              </div>
            </div>
          )}

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
                  <Link key={r.id} href="/risk-register" className="flex items-center gap-4 p-3 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
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
                    <Link key={a.id} href={`/actions?edit=${a.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
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
                <Link key={outcome.id} href={`/consumer-duty?outcome=${outcome.id}`} className="block rounded-xl bg-surface-muted p-3 hover:bg-surface-warm hover:-translate-y-0.5 transition-all cursor-pointer border border-transparent hover:border-[#E8E6E1]">
                  <div className="flex items-center justify-between">
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
                  {(outcome.measures ?? []).length > 0 && (
                    <div className="mt-2 ml-6 space-y-1">
                      {(outcome.measures ?? []).map((m) => (
                        <Link
                          key={m.id}
                          href={`/consumer-duty?measure=${m.id}`}
                          className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-white/60 transition-colors"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${ragBgColor(m.ragStatus)}`} />
                          <span className="text-gray-600 truncate flex-1 min-w-0">{m.measureId} — {m.name}</span>
                          <span className={`font-semibold shrink-0 ${
                            m.ragStatus === "GOOD" ? "text-risk-green" :
                            m.ragStatus === "WARNING" ? "text-risk-amber" :
                            "text-risk-red"
                          }`}>
                            {m.ragStatus === "GOOD" ? "Green" : m.ragStatus === "WARNING" ? "Amber" : "Red"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Risk Summary Stats */}
          <div className="card-entrance card-entrance-5">
            <h2 className="text-lg font-bold text-updraft-deep font-poppins mb-3">Risk Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/risk-register" className="rounded-xl border border-[#E8E6E1] bg-surface-warm p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all">
                <p className="text-xs text-text-secondary">Total Risks</p>
                <p className="text-2xl font-bold font-poppins text-updraft-deep">{risks.length}</p>
              </Link>
              <Link href="/risk-register" className="rounded-xl border border-green-100 p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all" style={{ background: "linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)" }}>
                <p className="text-xs text-text-secondary">Low Risk</p>
                <p className="text-2xl font-bold font-poppins text-green-700">
                  {risks.filter((r) => getRiskScore(r.residualLikelihood, r.residualImpact) <= 4).length}
                </p>
              </Link>
              <Link href="/risk-register" className="rounded-xl border border-amber-100 p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all" style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEFCE8 100%)" }}>
                <p className="text-xs text-text-secondary">Medium Risk</p>
                <p className="text-2xl font-bold font-poppins text-amber-700">
                  {risks.filter((r) => { const s = getRiskScore(r.residualLikelihood, r.residualImpact); return s > 4 && s <= 12; }).length}
                </p>
              </Link>
              <Link href="/risk-register" className="rounded-xl border border-red-100 p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all" style={{ background: "linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)" }}>
                <p className="text-xs text-text-secondary">High Risk</p>
                <p className="text-2xl font-bold font-poppins text-red-700">
                  {risks.filter((r) => getRiskScore(r.residualLikelihood, r.residualImpact) > 12).length}
                </p>
              </Link>
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
                    <tr key={report.id} className="border-b border-[#E8E6E1]/50 hover:bg-surface-muted">
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
