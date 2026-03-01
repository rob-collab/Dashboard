"use client";

import React from "react";
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
  FlaskConical,
  Info,
  Star,
  Scale,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getActionLabel } from "@/lib/audit";
import { getRiskScore } from "@/lib/risk-categories";
import type { ActionPriority } from "@/lib/types";
import ScoreBadge from "@/components/risk-register/ScoreBadge";
import DirectionArrow from "@/components/risk-register/DirectionArrow";
import { SECTION_ELEMENTS } from "@/lib/dashboard-sections";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import ChartReveal from "@/components/common/ChartReveal";
import { HorizonDashboardWidget } from "@/components/horizon/HorizonDashboardWidget";
import RiskMatrix from "@/components/dashboard/RiskMatrix";
import RiskTrendChart from "@/components/dashboard/RiskTrendChart";
import ActionPipeline from "@/components/dashboard/ActionPipeline";
import CDRadialRing from "@/components/dashboard/CDRadialRing";
import DomainScorecardRow from "@/components/dashboard/DomainScorecardRow";
import ActionRequiredSection from "@/components/dashboard/ActionRequiredSection";
import ControlHealthTrendWidget from "@/components/dashboard/ControlHealthTrendWidget";
import QuarterlySummaryWidget from "@/components/dashboard/QuarterlySummaryWidget";
import PendingChangesPanel, { type PendingItem } from "@/components/dashboard/PendingChangesPanel";
import type { Risk, User, Action, ControlRecord, RiskAcceptance, ConsumerDutyOutcome, ConsumerDutyMeasure, Report, AuditLogEntry, DashboardNotification, Policy, HorizonItem, BrandingConfig, SiteSettings } from "@/lib/types";

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

export interface SectionMapProps {
  // Store data
  currentUser: User | null;
  branding: BrandingConfig;
  siteSettings: SiteSettings | null;
  reports: Report[];
  outcomes: ConsumerDutyOutcome[];
  actions: Action[];
  auditLogs: AuditLogEntry[];
  users: User[];
  risks: Risk[];
  riskAcceptances: RiskAcceptance[];
  policies: Policy[];
  horizonItems: HorizonItem[];

  // Store actions
  updateAction: (id: string, data: Partial<Action>) => void;
  updateControl: (id: string, data: Partial<ControlRecord>) => void;
  updateRisk: (id: string, data: Partial<Risk>) => void;
  approveEntity: (type: "risk" | "action" | "control", id: string) => void;
  rejectEntity: (type: "risk" | "action" | "control", id: string) => void;

  // Permission flags
  isCCRO: boolean;
  canApproveEntities: boolean;
  canViewPending: boolean;
  hasActionsPage: boolean;
  hasConsumerDutyPage: boolean;
  hasReportsPage: boolean;
  hasAuditPage: boolean;
  hasRiskRegisterPage: boolean;

  // Computed values
  priorityStats: { P1: Action[]; P2: Action[]; P3: Action[] };
  actionStats: { open: number; overdue: number; dueThisMonth: number; completed: number };
  myOverdueActions: Action[];
  myDueThisMonthActions: Action[];
  risksNeedingReview: Risk[];
  allPendingChanges: PendingItem[];
  myRisks: Risk[];
  myActions: Action[];
  myMetrics: ConsumerDutyMeasure[];
  myRisksNeedingReview: Risk[];
  overdueMetrics: ConsumerDutyMeasure[];
  focusRisks: Risk[];
  pendingNewEntities: { type: "risk" | "action" | "control"; id: string; reference: string; name: string; createdBy: string; createdAt: string }[];
  publishedReports: Report[];
  activeNotifications: DashboardNotification[];
  raStats: {
    expired: number;
    awaiting: number;
    ccroReview: number;
    accepted: number;
    urgent: RiskAcceptance[];
    overdue: (RiskAcceptance & { daysUntil: number })[];
    due30: (RiskAcceptance & { daysUntil: number })[];
    beyond30: (RiskAcceptance & { daysUntil: number })[];
  };
  complianceHealth: {
    total: number;
    compliantPct: number;
    gaps: number;
    overdueAssessments: number;
    pendingCerts: number;
    statusCounts: Record<string, number>;
  } | null;
  controlsStats: {
    total: number;
    preventative: number;
    detective: number;
    directive: number;
    corrective: number;
    policiesWithControls: number;
    totalPolicies: number;
  } | null;
  crossEntityInsights: {
    risksWithFailingControls: { riskRef: string; riskName: string; riskId: string; failCount: number; totalControls: number }[];
    policiesWithGaps: { ref: string; name: string; id: string; uncovered: number; total: number }[];
    keyControls: { id: string; ref: string; name: string; policyCount: number }[];
    hasData: boolean;
  };

  // Render-time derived
  elementOrderForRender: Record<string, string[]>;
  hiddenElementsForRender: Set<string>;

  // Router
  router: { push: (url: string) => void };

  // Local helper
  getEntityUrl: (entityType: string | null, entityId: string | null) => string;
}

export function useDashboardSectionMap(props: SectionMapProps): Record<string, React.ReactNode> {
  const {
    currentUser,
    branding,
    siteSettings,
    reports,
    outcomes,
    actions,
    auditLogs,
    users,
    risks,
    riskAcceptances,
    policies,
    horizonItems,
    updateAction,
    updateControl,
    updateRisk,
    approveEntity,
    rejectEntity,
    isCCRO,
    canApproveEntities,
    canViewPending,
    hasActionsPage,
    hasConsumerDutyPage,
    hasReportsPage,
    hasAuditPage,
    hasRiskRegisterPage,
    priorityStats,
    actionStats,
    myOverdueActions,
    myDueThisMonthActions,
    risksNeedingReview,
    allPendingChanges,
    myRisks,
    myActions,
    myMetrics,
    myRisksNeedingReview,
    overdueMetrics,
    focusRisks,
    pendingNewEntities,
    publishedReports,
    activeNotifications,
    raStats,
    complianceHealth,
    controlsStats,
    crossEntityInsights,
    elementOrderForRender,
    hiddenElementsForRender,
    router,
    getEntityUrl,
  } = props;

  return {
    "welcome": (
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

            {/* Notification pills — unified, permission-based */}
            {(myOverdueActions.length > 0 || myDueThisMonthActions.length > 0 || (canViewPending && (risksNeedingReview.length > 0 || allPendingChanges.length > 0)) || myRisksNeedingReview.length > 0 || (hasConsumerDutyPage && overdueMetrics.length > 0)) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {hasConsumerDutyPage && overdueMetrics.length > 0 && (
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
                {canViewPending && risksNeedingReview.length > 0 && (
                  <Link href="/risk-register" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <ShieldAlert className="h-3 w-3 text-updraft-pale-purple" />
                    {risksNeedingReview.length} risk{risksNeedingReview.length > 1 ? "s" : ""} due for review
                  </Link>
                )}
                {!canViewPending && myRisksNeedingReview.length > 0 && (
                  <Link href="/risk-register" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <ShieldAlert className="h-3 w-3 text-updraft-pale-purple" />
                    {myRisksNeedingReview.length} risk{myRisksNeedingReview.length > 1 ? "s" : ""} due for review
                  </Link>
                )}
                {canViewPending && allPendingChanges.length > 0 && (
                  <Link href="/change-requests" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <Bell className="h-3 w-3 text-blue-300" />
                    {allPendingChanges.length} pending approval{allPendingChanges.length > 1 ? "s" : ""}
                  </Link>
                )}
              </div>
            )}

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
    ),

    "notifications": activeNotifications.length > 0 ? (
      <div className="space-y-2">
        {activeNotifications.map((n) => {
          const styles = n.type === "URGENT"
            ? { bg: "bg-red-50 border-red-200", text: "text-red-800", icon: <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" /> }
            : n.type === "WARNING"
            ? { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> }
            : { bg: "bg-blue-50 border-blue-200", text: "text-blue-800", icon: <Info className="h-4 w-4 text-blue-500 shrink-0" /> };
          return (
            <div key={n.id} className={`flex items-start gap-3 rounded-xl border ${styles.bg} px-4 py-3`}>
              {styles.icon}
              <p className={`text-sm font-medium ${styles.text} flex-1`}>{n.message}</p>
            </div>
          );
        })}
      </div>
    ) : null,

    "action-required": (() => {
      const reviewList = canViewPending ? risksNeedingReview : myRisksNeedingReview;
      const overdueActions = canViewPending
        ? actions.filter((a) => a.status === "OVERDUE" || (a.status !== "COMPLETED" && daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! < 0))
        : myOverdueActions;
      const hasPending = canApproveEntities && pendingNewEntities.length > 0;
      const hasChanges = canViewPending && allPendingChanges.length > 0;
      const hasItems = reviewList.length > 0 || overdueActions.length > 0 || hasPending || hasChanges;
      if (!hasItems) return null;

      const groups: { icon: React.ReactNode; label: string; count: number; href: string; colour: string; items: { label: string; sub?: string; href: string }[] }[] = [];

      if (overdueActions.length > 0) {
        groups.push({
          icon: <AlertTriangle className="h-4 w-4" />,
          label: "Overdue Actions",
          count: overdueActions.length,
          href: "/actions?status=OVERDUE",
          colour: "text-red-600 bg-red-50 border-red-200",
          items: overdueActions.slice(0, 3).map((a) => ({
            label: a.title,
            sub: a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : undefined,
            href: `/actions?edit=${a.id}`,
          })),
        });
      }

      if (reviewList.length > 0) {
        groups.push({
          icon: <ShieldAlert className="h-4 w-4" />,
          label: "Risks Due for Review",
          count: reviewList.length,
          href: "/risk-register",
          colour: "text-amber-600 bg-amber-50 border-amber-200",
          items: reviewList.slice(0, 3).map((r) => ({
            label: r.name,
            sub: r.reference,
            href: `/risk-register?risk=${r.id}`,
          })),
        });
      }

      if (hasPending) {
        groups.push({
          icon: <Bell className="h-4 w-4" />,
          label: "Pending Approvals",
          count: pendingNewEntities.length,
          href: "/risk-register",
          colour: "text-blue-600 bg-blue-50 border-blue-200",
          items: pendingNewEntities.slice(0, 3).map((e) => ({
            label: e.name,
            sub: e.reference,
            href: e.type === "risk" ? `/risk-register?risk=${e.id}` : e.type === "action" ? `/actions?edit=${e.id}` : `/controls?id=${e.id}`,
          })),
        });
      }

      if (hasChanges) {
        groups.push({
          icon: <Clock className="h-4 w-4" />,
          label: "Proposed Changes",
          count: allPendingChanges.length,
          href: "#proposed-changes",
          colour: "text-purple-600 bg-purple-50 border-purple-200",
          items: allPendingChanges.slice(0, 3).map((c) => ({
            label: c._parentTitle,
            sub: c._parentRef,
            href: c._type === "risk" ? `/risk-register?risk=${c._parentId}` : c._type === "action" ? `/actions?edit=${c._parentId}` : `/controls?id=${c._parentId}`,
          })),
        });
      }

      return <ActionRequiredSection groups={groups} />;
    })(),

    "priority-actions": (() => {
      const paOrder = elementOrderForRender["priority-actions"] ?? ["card-p1", "card-p2", "card-p3"];
      const paVisible = paOrder.filter((id) => !hiddenElementsForRender.has(`priority-actions:${id}`));
      const pMap: Record<string, ActionPriority> = { "card-p1": "P1", "card-p2": "P2", "card-p3": "P3" };
      return (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(1, paVisible.length)}, minmax(0, 1fr))` }}>
          {paVisible.map((id, idx) => {
            const p = pMap[id];
            if (!p) return null;
            const config = PRIORITY_CONFIG[p];
            const items = priorityStats[p];
            return (
              <Link
                key={id}
                href={`/actions?priority=${p}`}
                className={`card-entrance card-entrance-${idx + 2} rounded-2xl border ${config.border} p-5 transition-all hover:shadow-bento-hover`}
                style={{ background: `linear-gradient(135deg, ${p === "P1" ? "#FEF2F2" : p === "P2" ? "#FFFBEB" : "#F8FAFC"} 0%, ${p === "P1" ? "#FFF5F5" : p === "P2" ? "#FEFCE8" : "#F1F5F9"} 100%)` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold ${config.color}`}>{config.label}</h3>
                  <AnimatedNumber value={items.length} delay={(idx + 1) * 60} className={`text-3xl font-bold font-poppins ${config.color}`} />
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
      );
    })(),

    "risk-acceptances": riskAcceptances.length > 0 ? (
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="rounded-lg bg-surface-muted border border-[#E8E6E1] p-2 text-center">
              <AnimatedNumber value={raStats.expired} delay={0} duration={800} className="text-lg font-bold font-poppins text-gray-600" />
              <p className="text-[10px] text-text-secondary">Expired</p>
            </div>
            <div className="rounded-lg border border-amber-100 p-2 text-center" style={{ background: "linear-gradient(135deg, #FFFBEB, #FEFCE8)" }}>
              <AnimatedNumber value={raStats.awaiting} delay={100} duration={800} className="text-lg font-bold font-poppins text-amber-700" />
              <p className="text-[10px] text-text-secondary">Awaiting</p>
            </div>
            <div className="rounded-lg border border-purple-100 p-2 text-center" style={{ background: "linear-gradient(135deg, #FAF5FF, #F5F3FF)" }}>
              <AnimatedNumber value={raStats.ccroReview} delay={200} duration={800} className="text-lg font-bold font-poppins text-purple-700" />
              <p className="text-[10px] text-text-secondary">CCRO Review</p>
            </div>
            <div className="rounded-lg border border-green-100 p-2 text-center" style={{ background: "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
              <AnimatedNumber value={raStats.accepted} delay={300} duration={800} className="text-lg font-bold font-poppins text-green-700" />
              <p className="text-[10px] text-text-secondary">Accepted</p>
            </div>
          </div>
          {raStats.urgent.length > 0 && (
            <div className="space-y-1.5">
              {raStats.urgent.map((ra) => (
                <button key={ra.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/risk-acceptances?acceptance=${ra.id}`); }} className="w-full flex items-center justify-between text-xs py-1 hover:opacity-80 transition-opacity text-left">
                  <span className="text-gray-700 truncate flex-1 min-w-0">
                    <span className="font-mono font-bold text-updraft-deep mr-1">{ra.reference}</span>
                    {ra.title}
                  </span>
                  <span className={`shrink-0 ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    ra.status === "EXPIRED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {ra.status === "EXPIRED" ? "Expired" : "Awaiting"}
                  </span>
                </button>
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
    ) : null,

    "compliance-health": (() => {
      if (!complianceHealth) return null;
      const chOrder = elementOrderForRender["compliance-health"] ?? SECTION_ELEMENTS["compliance-health"].map((d) => d.id);
      const chVisible = chOrder.filter((id) => !hiddenElementsForRender.has(`compliance-health:${id}`));
      return (
        <Link href="/compliance" className="bento-card hover:border-updraft-light-purple transition-colors group block card-entrance card-entrance-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-updraft-bright-purple" />
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">Compliance Health</h2>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-updraft-bright-purple transition-colors" />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, chVisible.length)}, minmax(0, 1fr))` }}>
            {chVisible.map((id) => {
              switch (id) {
                case "stat-compliant": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/compliance?tab=regulatory-universe"); }} className="rounded-lg border border-green-100 p-3 text-center hover:opacity-80 transition-opacity" style={{ background: "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <p className="text-xl font-bold font-poppins text-green-700"><AnimatedNumber value={complianceHealth.compliantPct} delay={0} />%</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Compliant</p>
                  </button>
                );
                case "stat-applicable": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/compliance?tab=regulatory-universe"); }} className="rounded-lg border border-gray-200 p-3 text-center bg-surface-warm hover:opacity-80 transition-opacity">
                    <AnimatedNumber value={complianceHealth.total} delay={100} duration={800} className="text-xl font-bold font-poppins text-updraft-deep" />
                    <p className="text-[10px] text-gray-500 mt-0.5">Applicable</p>
                  </button>
                );
                case "stat-gaps": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/compliance?tab=regulatory-universe"); }} className={`rounded-lg border p-3 text-center hover:opacity-80 transition-opacity ${complianceHealth.gaps > 0 ? "border-red-100" : "border-green-100"}`} style={{ background: complianceHealth.gaps > 0 ? "linear-gradient(135deg, #FEF2F2, #FFF5F5)" : "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <AnimatedNumber value={complianceHealth.gaps} delay={200} duration={800} className={`text-xl font-bold font-poppins ${complianceHealth.gaps > 0 ? "text-red-700" : "text-green-700"}`} />
                    <p className="text-[10px] text-gray-500 mt-0.5">Open Gaps</p>
                  </button>
                );
                case "stat-assessments": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/compliance?tab=assessment-log"); }} className={`rounded-lg border p-3 text-center hover:opacity-80 transition-opacity ${complianceHealth.overdueAssessments > 0 ? "border-amber-100" : "border-green-100"}`} style={{ background: complianceHealth.overdueAssessments > 0 ? "linear-gradient(135deg, #FFFBEB, #FEFCE8)" : "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <AnimatedNumber value={complianceHealth.overdueAssessments} delay={300} duration={800} className={`text-xl font-bold font-poppins ${complianceHealth.overdueAssessments > 0 ? "text-amber-700" : "text-green-700"}`} />
                    <p className="text-[10px] text-gray-500 mt-0.5">Overdue Assessments</p>
                  </button>
                );
                case "stat-certs": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/compliance?tab=smcr"); }} className={`rounded-lg border p-3 text-center hover:opacity-80 transition-opacity ${complianceHealth.pendingCerts > 0 ? "border-amber-100" : "border-green-100"}`} style={{ background: complianceHealth.pendingCerts > 0 ? "linear-gradient(135deg, #FFFBEB, #FEFCE8)" : "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <AnimatedNumber value={complianceHealth.pendingCerts} delay={400} duration={800} className={`text-xl font-bold font-poppins ${complianceHealth.pendingCerts > 0 ? "text-amber-700" : "text-green-700"}`} />
                    <p className="text-[10px] text-gray-500 mt-0.5">Pending Certs</p>
                  </button>
                );
                default: return null;
              }
            })}
          </div>
        </Link>
      );
    })(),

    "controls-library": (() => {
      if (!controlsStats) return null;
      const clOrder = elementOrderForRender["controls-library"] ?? SECTION_ELEMENTS["controls-library"].map((d) => d.id);
      const clVisible = clOrder.filter((id) => !hiddenElementsForRender.has(`controls-library:${id}`));
      return (
        <Link href="/controls" className="bento-card hover:border-updraft-light-purple transition-colors group block card-entrance card-entrance-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-updraft-bright-purple" />
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">Controls Library</h2>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-updraft-bright-purple transition-colors" />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, clVisible.length)}, minmax(0, 1fr))` }}>
            {clVisible.map((id) => {
              switch (id) {
                case "stat-total": return (
                  <div key={id} className="rounded-lg border border-updraft-pale-purple p-3 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, #F3E8FF, #FAF5FF)" }}>
                    <AnimatedNumber value={controlsStats.total} delay={0} duration={800} className="text-xl font-bold font-poppins text-updraft-deep" />
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Total Controls">Total</p>
                  </div>
                );
                case "stat-preventative": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/controls?tab=library&type=PREVENTATIVE"); }} className="rounded-lg border border-green-100 p-3 text-center hover:opacity-80 transition-opacity overflow-hidden" style={{ background: "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <AnimatedNumber value={controlsStats.preventative} delay={100} duration={800} className="text-xl font-bold font-poppins text-green-700" />
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Preventative">Prevent.</p>
                  </button>
                );
                case "stat-detective": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/controls?tab=library&type=DETECTIVE"); }} className="rounded-lg border border-blue-100 p-3 text-center hover:opacity-80 transition-opacity overflow-hidden" style={{ background: "linear-gradient(135deg, #EFF6FF, #F0F9FF)" }}>
                    <AnimatedNumber value={controlsStats.detective} delay={200} duration={800} className="text-xl font-bold font-poppins text-blue-700" />
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Detective">Detect.</p>
                  </button>
                );
                case "stat-directive": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/controls?tab=library&type=DIRECTIVE"); }} className="rounded-lg border border-amber-100 p-3 text-center hover:opacity-80 transition-opacity overflow-hidden" style={{ background: "linear-gradient(135deg, #FFFBEB, #FEFCE8)" }}>
                    <AnimatedNumber value={controlsStats.directive} delay={300} duration={800} className="text-xl font-bold font-poppins text-amber-700" />
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Directive">Directive</p>
                  </button>
                );
                case "stat-corrective": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/controls?tab=library&type=CORRECTIVE"); }} className="rounded-lg border border-red-100 p-3 text-center hover:opacity-80 transition-opacity overflow-hidden" style={{ background: "linear-gradient(135deg, #FEF2F2, #FFF5F5)" }}>
                    <AnimatedNumber value={controlsStats.corrective} delay={400} duration={800} className="text-xl font-bold font-poppins text-red-700" />
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Corrective">Correct.</p>
                  </button>
                );
                case "stat-policies": return (
                  <div key={id} className="rounded-lg border border-gray-200 p-3 text-center bg-surface-warm overflow-hidden">
                    <p className="text-xl font-bold font-poppins text-updraft-deep"><AnimatedNumber value={controlsStats.policiesWithControls} delay={500} />/<AnimatedNumber value={controlsStats.totalPolicies} delay={600} /></p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Policies Covered">Policies</p>
                  </div>
                );
                default: return null;
              }
            })}
          </div>
        </Link>
      );
    })(),

    "cross-entity": crossEntityInsights.hasData ? (
      <div className="bento-card card-entrance card-entrance-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-updraft-bright-purple" />
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">Compliance Insights</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Risks with failing controls */}
          {crossEntityInsights.risksWithFailingControls.length > 0 && (
            <div className="rounded-xl border border-red-100 p-4" style={{ background: "linear-gradient(135deg, #FEF2F2, #FFF5F5)" }}>
              <h3 className="text-xs font-bold text-red-700 mb-2">Risks with Failing Controls</h3>
              <div className="space-y-2">
                {crossEntityInsights.risksWithFailingControls.map((r) => (
                  <Link key={r.riskId} href={`/risk-register?risk=${r.riskId}`} className="flex items-center justify-between text-xs hover:text-updraft-bright-purple transition-colors">
                    <span className="truncate flex-1 min-w-0 text-gray-700">
                      <span className="font-mono font-bold text-updraft-deep mr-1">{r.riskRef}</span>
                      {r.riskName}
                    </span>
                    <span className="shrink-0 ml-2 text-red-600 font-semibold">{r.failCount}/{r.totalControls}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Policies with coverage gaps */}
          {crossEntityInsights.policiesWithGaps.length > 0 && (
            <div className="rounded-xl border border-amber-100 p-4" style={{ background: "linear-gradient(135deg, #FFFBEB, #FEFCE8)" }}>
              <h3 className="text-xs font-bold text-amber-700 mb-2">Policies with Coverage Gaps</h3>
              <div className="space-y-2">
                {crossEntityInsights.policiesWithGaps.map((p) => (
                  <Link key={p.id} href={`/compliance?tab=policies&policy=${p.id}`} className="flex items-center justify-between text-xs hover:text-updraft-bright-purple transition-colors">
                    <span className="truncate flex-1 min-w-0 text-gray-700">
                      <span className="font-mono font-bold text-updraft-deep mr-1">{p.ref}</span>
                      {p.name}
                    </span>
                    <span className="shrink-0 ml-2 text-amber-600 font-semibold">{p.uncovered}/{p.total} uncovered</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Key controls */}
          {crossEntityInsights.keyControls.length > 0 && (
            <div className="rounded-xl border border-updraft-pale-purple p-4" style={{ background: "linear-gradient(135deg, #F3E8FF, #FAF5FF)" }}>
              <h3 className="text-xs font-bold text-updraft-deep mb-2">Key Controls (Multi-Policy)</h3>
              <div className="space-y-2">
                {crossEntityInsights.keyControls.map((c) => (
                  <Link key={c.ref} href={`/controls?tab=library&control=${c.id}`} className="flex items-center justify-between text-xs hover:text-updraft-bright-purple transition-colors">
                    <span className="truncate flex-1 min-w-0 text-gray-700">
                      <span className="font-mono font-bold text-updraft-deep mr-1">{c.ref}</span>
                      {c.name}
                    </span>
                    <span className="shrink-0 ml-2 text-updraft-bright-purple font-semibold">{c.policyCount} policies</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    ) : null,

    "policy-health": (() => {
      if (policies.length === 0) return null;
      const phOrder = elementOrderForRender["policy-health"] ?? SECTION_ELEMENTS["policy-health"].map((d) => d.id);
      const phVisible = phOrder.filter((id) => !hiddenElementsForRender.has(`policy-health:${id}`));
      const now = new Date();
      const overdueCount = policies.filter(
        (p) => p.status !== "ARCHIVED" && (p.status === "OVERDUE" || (!!p.nextReviewDate && new Date(p.nextReviewDate) < now))
      ).length;
      return (
        <Link href="/policies" className="bento-card hover:border-updraft-light-purple transition-colors group block card-entrance card-entrance-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-updraft-bright-purple" />
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">Policy Health</h2>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-updraft-bright-purple transition-colors" />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, phVisible.length)}, minmax(0, 1fr))` }}>
            {phVisible.map((id) => {
              switch (id) {
                case "stat-total": return (
                  <div key={id} className="rounded-lg border border-gray-200 p-3 text-center bg-surface-warm">
                    <AnimatedNumber value={policies.length} delay={0} duration={800} className="text-xl font-bold font-poppins text-updraft-deep" />
                    <p className="text-[10px] text-gray-500 mt-0.5">Total Policies</p>
                  </div>
                );
                case "stat-overdue": return (
                  <div key={id} className={`rounded-lg border p-3 text-center ${overdueCount > 0 ? "border-red-100" : "border-green-100"}`} style={{ background: overdueCount > 0 ? "linear-gradient(135deg, #FEF2F2, #FFF5F5)" : "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <AnimatedNumber value={overdueCount} delay={100} duration={800} className={`text-xl font-bold font-poppins ${overdueCount > 0 ? "text-red-700" : "text-green-700"}`} />
                    <p className="text-[10px] text-gray-500 mt-0.5">Overdue</p>
                  </div>
                );
                case "stat-requirements": return (
                  <div key={id} className="rounded-lg border border-updraft-pale-purple p-3 text-center" style={{ background: "linear-gradient(135deg, #F3E8FF, #FAF5FF)" }}>
                    <AnimatedNumber value={policies.reduce((sum, p) => sum + (p.obligations?.length ?? 0), 0)} delay={200} duration={800} className="text-xl font-bold font-poppins text-updraft-deep" />
                    <p className="text-[10px] text-gray-500 mt-0.5">Requirements</p>
                  </div>
                );
                case "stat-links": return (
                  <div key={id} className="rounded-lg border border-blue-100 p-3 text-center" style={{ background: "linear-gradient(135deg, #EFF6FF, #F0F9FF)" }}>
                    <AnimatedNumber value={policies.reduce((sum, p) => sum + (p.controlLinks?.length ?? 0), 0)} delay={300} duration={800} className="text-xl font-bold font-poppins text-blue-700" />
                    <p className="text-[10px] text-gray-500 mt-0.5">Control Links</p>
                  </div>
                );
                default: return null;
              }
            })}
          </div>
        </Link>
      );
    })(),

    "risks-in-focus": focusRisks.length > 0 ? (
      <div className="bento-card border-2 border-amber-200/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            <h2 className="text-lg font-bold text-updraft-deep font-poppins">Risks in Focus</h2>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold"><AnimatedNumber value={focusRisks.length} delay={200} duration={600} /></span>
          </div>
          <Link href="/risk-register" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
            Risk Register <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-2">
          {focusRisks.map((r) => {
            const ownerName = r.riskOwner?.name ?? users.find((u) => u.id === r.ownerId)?.name ?? "Unknown";
            return (
              <Link
                key={r.id}
                href={`/risk-register?risk=${r.id}`}
                className="flex items-center gap-2 p-3 rounded-lg bg-amber-50/40 hover:bg-amber-50 transition-colors min-w-0"
              >
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-updraft-deep shrink-0 w-14 truncate" title={r.reference}>{r.reference}</span>
                <span className="text-sm text-gray-800 truncate flex-1 min-w-0" title={r.name}>{r.name}</span>
                <span className="shrink-0"><ScoreBadge likelihood={r.residualLikelihood} impact={r.residualImpact} size="sm" /></span>
                <span className="shrink-0"><DirectionArrow direction={r.directionOfTravel} /></span>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/risk-register?q=${encodeURIComponent(ownerName)}`); }} className="text-xs text-gray-500 shrink-0 hover:text-updraft-bright-purple transition-colors w-10 truncate text-right" title={ownerName}>{ownerName.split(" ")[0]}</button>
              </Link>
            );
          })}
        </div>
      </div>
    ) : null,

    "pending-approvals": canApproveEntities && pendingNewEntities.length > 0 ? (
      <div className="bento-card border-2 border-amber-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-updraft-deep font-poppins">Pending Approvals</h2>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold"><AnimatedNumber value={pendingNewEntities.length} delay={200} duration={600} /></span>
          </div>
        </div>
        <div className="space-y-2">
          {pendingNewEntities.map((item) => {
            const creatorName = users.find((u) => u.id === item.createdBy)?.name ?? "Unknown";
            const href = item.type === "risk" ? `/risk-register?risk=${item.id}` : item.type === "action" ? `/actions?edit=${item.id}` : `/controls?control=${item.id}`;
            return (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/40 border border-amber-100">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  item.type === "risk" ? "bg-red-100 text-red-700" :
                  item.type === "action" ? "bg-blue-100 text-blue-700" :
                  "bg-purple-100 text-purple-700"
                }`}>
                  {item.type === "risk" ? "Risk" : item.type === "action" ? "Action" : "Control"}
                </span>
                <span className="text-xs font-mono font-bold text-updraft-deep shrink-0">{item.reference}</span>
                <Link href={href} className="text-sm text-gray-800 truncate flex-1 min-w-0 hover:text-updraft-bright-purple transition-colors">
                  {item.name}
                </Link>
                <span className="text-xs text-gray-500 shrink-0">{creatorName}</span>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(item.createdAt)}</span>
                <button
                  onClick={() => rejectEntity(item.type, item.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100 transition-colors shrink-0"
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </button>
                <button
                  onClick={() => approveEntity(item.type, item.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700 hover:bg-green-100 transition-colors shrink-0"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve
                </button>
              </div>
            );
          })}
        </div>
      </div>
    ) : null,

    "proposed-changes": canViewPending && allPendingChanges.length > 0 ? (
      <PendingChangesPanel
        changes={allPendingChanges}
        users={users}
        updateAction={updateAction}
        updateControl={updateControl}
        updateRisk={(id, data) => updateRisk(id, data as Partial<import("@/lib/types").Risk>)}
      />
    ) : null,

    "action-tracking": hasActionsPage ? (
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
            <AnimatedNumber value={actionStats.open} delay={300} className="text-2xl font-bold font-poppins text-blue-700" />
          </Link>
          <Link href="/actions?status=OVERDUE" className="rounded-xl border border-red-100 p-3 cursor-pointer hover:border-red-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)" }}>
            <p className="text-xs text-text-secondary">Overdue</p>
            <AnimatedNumber value={actionStats.overdue} delay={300} className="text-2xl font-bold font-poppins text-red-700" />
          </Link>
          <Link href="/actions?status=DUE_THIS_MONTH" className="rounded-xl border border-amber-100 p-3 cursor-pointer hover:border-amber-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEFCE8 100%)" }}>
            <p className="text-xs text-text-secondary">Due This Month</p>
            <AnimatedNumber value={actionStats.dueThisMonth} delay={300} className="text-2xl font-bold font-poppins text-amber-700" />
          </Link>
          <Link href="/actions?status=COMPLETED" className="rounded-xl border border-blue-100 p-3 cursor-pointer hover:border-blue-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F0F7FF 100%)" }}>
            <p className="text-xs text-text-secondary">Completed</p>
            <AnimatedNumber value={actionStats.completed} delay={300} className="text-2xl font-bold font-poppins text-blue-700" />
          </Link>
        </div>
        <div className="mt-4">
          <ChartReveal><ActionPipeline actions={actions} priorityStats={priorityStats} /></ChartReveal>
        </div>
      </div>
    ) : null,

    "overdue-metrics": hasConsumerDutyPage && overdueMetrics.length > 0 ? (
      <div className="bento-card border-2 border-red-200 bg-red-50/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-bold text-red-700 font-poppins">Overdue Metrics</h2>
            <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold"><AnimatedNumber value={overdueMetrics.length} delay={200} duration={600} /></span>
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
    ) : null,

    "tasks-reviews": ((canViewPending && risksNeedingReview.length > 0) || (!canViewPending && myRisksNeedingReview.length > 0) || myOverdueActions.length > 0 || myRisks.length > 0 || myActions.length > 0 || myMetrics.length > 0) ? (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-updraft-deep font-poppins">Tasks & Reviews</h2>

        {/* Risk reviews and overdue actions grid */}
        {((canViewPending && risksNeedingReview.length > 0) || (!canViewPending && myRisksNeedingReview.length > 0) || myOverdueActions.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bento-card">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-updraft-bright-purple" />
                <h3 className="text-sm font-semibold text-gray-700">Risks Due for Review</h3>
              </div>
              {(() => {
                const reviewList = canViewPending ? risksNeedingReview : myRisksNeedingReview;
                return reviewList.length === 0 ? (
                  <p className="text-xs text-gray-400">No reviews due</p>
                ) : (
                  <div className="space-y-2">
                    {reviewList.slice(0, 5).map((r) => {
                      const nextReview = new Date(r.lastReviewed);
                      nextReview.setDate(nextReview.getDate() + (r.reviewFrequencyDays ?? 90));
                      const daysUntil = Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <Link key={r.id} href={`/risk-register?risk=${r.id}`} className="flex items-center justify-between p-2 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
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
                );
              })()}
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
        )}

        {/* My Risks */}
        {myRisks.length > 0 && (
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-updraft-bright-purple" />
                <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Risks</h2>
                <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold"><AnimatedNumber value={myRisks.length} delay={200} duration={600} /></span>
              </div>
              <Link href="/risk-register" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                Risk Register <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {myRisks.map((r) => {
                const nextReview = new Date(r.lastReviewed);
                nextReview.setDate(nextReview.getDate() + (r.reviewFrequencyDays ?? 90));
                return (
                  <Link key={r.id} href={`/risk-register?risk=${r.id}`} className="flex items-center gap-4 p-3 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
                    <span className="text-xs font-mono font-bold text-updraft-deep shrink-0">{r.reference}</span>
                    <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{r.name}</span>
                    <ScoreBadge likelihood={r.residualLikelihood} impact={r.residualImpact} size="sm" />
                    <DirectionArrow direction={r.directionOfTravel} />
                    <span className="text-[10px] text-gray-400 shrink-0">{nextReview.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* My Due Actions */}
        {myActions.length > 0 && (
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-updraft-bright-purple" />
                <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Due Actions</h2>
                <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold"><AnimatedNumber value={myActions.length} delay={200} duration={600} /></span>
              </div>
              <Link href="/actions" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                All Actions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
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
          </div>
        )}

        {/* My Metrics */}
        {myMetrics.length > 0 && (
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-updraft-bright-purple" />
                <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Metrics</h2>
                <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold"><AnimatedNumber value={myMetrics.length} delay={200} duration={600} /></span>
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
      </div>
    ) : null,

    "consumer-duty": hasConsumerDutyPage ? <ChartReveal><CDRadialRing outcomes={outcomes} /></ChartReveal> : null,

    "risk-summary": hasRiskRegisterPage ? (() => {
      const rsOrder = elementOrderForRender["risk-summary"] ?? SECTION_ELEMENTS["risk-summary"].map((d) => d.id);
      const rsVisible = rsOrder.filter((id) => !hiddenElementsForRender.has(`risk-summary:${id}`));
      return (
      <div className="card-entrance card-entrance-5">
        <h2 className="text-lg font-bold text-updraft-deep font-poppins mb-3">Risk Summary</h2>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, rsVisible.length)}, minmax(0, 1fr))` }}>
          {rsVisible.map((id) => {
            switch (id) {
              case "stat-total": return (
                <Link key={id} href="/risk-register" className="rounded-xl border border-[#E8E6E1] bg-surface-warm p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all">
                  <p className="text-xs text-text-secondary">Total Risks</p>
                  <AnimatedNumber value={risks.length} delay={240} className="text-2xl font-bold font-poppins text-updraft-deep" />
                </Link>
              );
              case "stat-low": return (
                <Link key={id} href="/risk-register?filter=LOW" className="rounded-xl border border-green-100 p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all" style={{ background: "linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)" }}>
                  <p className="text-xs text-text-secondary">Low Risk</p>
                  <AnimatedNumber value={risks.filter((r) => getRiskScore(r.residualLikelihood, r.residualImpact) <= 4).length} delay={240} className="text-2xl font-bold font-poppins text-green-700" />
                </Link>
              );
              case "stat-medium": return (
                <Link key={id} href="/risk-register?filter=MEDIUM" className="rounded-xl border border-amber-100 p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all" style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEFCE8 100%)" }}>
                  <p className="text-xs text-text-secondary">Medium Risk</p>
                  <AnimatedNumber value={risks.filter((r) => { const s = getRiskScore(r.residualLikelihood, r.residualImpact); return s > 4 && s <= 12; }).length} delay={240} className="text-2xl font-bold font-poppins text-amber-700" />
                </Link>
              );
              case "stat-high": return (
                <Link key={id} href="/risk-register?filter=HIGH" className="rounded-xl border border-red-100 p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all" style={{ background: "linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)" }}>
                  <p className="text-xs text-text-secondary">High Risk</p>
                  <AnimatedNumber value={risks.filter((r) => getRiskScore(r.residualLikelihood, r.residualImpact) > 12).length} delay={240} className="text-2xl font-bold font-poppins text-red-700" />
                </Link>
              );
              default: return null;
            }
          })}
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bento-card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Risk Landscape</h3>
            <ChartReveal>
              <RiskMatrix risks={risks} onNavigate={(id) => router.push(`/risk-register?risk=${id}`)} />
            </ChartReveal>
          </div>
          <div className="bento-card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Portfolio Trend</h3>
            <ChartReveal>
              <RiskTrendChart risks={risks} />
            </ChartReveal>
          </div>
        </div>
      </div>
      );
    })() : null,

    "programme-health": (
      <ChartReveal>
        <DomainScorecardRow
          risks={risks}
          actions={actions}
          outcomes={outcomes}
          complianceHealth={complianceHealth}
        />
      </ChartReveal>
    ),

    "reports": hasReportsPage ? (
      <div className="bento-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-updraft-deep">{isCCRO ? "Reports" : "Published Reports"}</h2>
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
                {isCCRO && <th className="text-left py-2 px-3 font-medium text-fca-gray">Status</th>}
                <th className="text-left py-2 px-3 font-medium text-fca-gray">Updated</th>
                <th className="text-right py-2 px-3 font-medium text-fca-gray"></th>
              </tr>
            </thead>
            <tbody>
              {(isCCRO ? reports : publishedReports).map((report) => (
                <tr key={report.id} className="border-b border-[#E8E6E1]/50 hover:bg-surface-muted">
                  <td className="py-3 px-3 font-medium">{report.title}</td>
                  <td className="py-3 px-3 text-fca-gray">{report.period}</td>
                  {isCCRO && (
                    <td className="py-3 px-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        report.status === "DRAFT" ? "bg-red-100 text-red-700" :
                        report.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {report.status === "DRAFT" ? "Draft" : report.status === "PUBLISHED" ? "Published" : "Archived"}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-3 text-fca-gray text-xs">{formatDate(report.updatedAt)}</td>
                  <td className="py-3 px-3 text-right">
                    {isCCRO && <Link href={`/reports/${report.id}/edit`} className="text-updraft-bright-purple hover:text-updraft-deep text-xs font-medium mr-3">Edit</Link>}
                    <Link href={`/reports/${report.id}`} className="text-fca-gray hover:text-fca-dark-gray text-xs font-medium">View</Link>
                  </td>
                </tr>
              ))}
              {(isCCRO ? reports : publishedReports).length === 0 && (
                <tr><td colSpan={isCCRO ? 5 : 4} className="py-6 text-center text-sm text-gray-400">No {isCCRO ? "" : "published "}reports yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : null,

    "horizon-scanning": horizonItems.filter((h) => h.status !== "DISMISSED" && h.status !== "COMPLETED").length > 0 ? (
      <HorizonDashboardWidget />
    ) : null,

    "recent-activity": hasAuditPage && auditLogs.length > 0 ? (
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
            const entityUrl = getEntityUrl(log.entityType, log.entityId);
            return (
              <Link key={log.id} href={entityUrl} className="flex-shrink-0 w-64 rounded-xl border border-[#E8E6E1] bg-surface-warm p-3 hover:border-updraft-light-purple hover:-translate-y-0.5 hover:shadow-bento transition-all cursor-pointer">
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
    ) : null,

    "control-health": <ChartReveal><ControlHealthTrendWidget /></ChartReveal>,

    "quarterly-summary": <ChartReveal><QuarterlySummaryWidget /></ChartReveal>,
  };
}
