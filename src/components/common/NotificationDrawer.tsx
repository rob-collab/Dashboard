"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { usePermissionSet } from "@/lib/usePermission";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  X,
  Bell,
  ShieldAlert,
  ListChecks,
  Scale,
  BookOpen,
  ShieldQuestion,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Building2,
  FileCheck,
  Calendar,
  FlaskConical,
} from "lucide-react";

interface NotifItem {
  id: string;
  /** When set, the item is dismissible and this value is stored in localStorage on dismiss */
  dismissId?: string;
  icon: typeof Bell;
  iconColour: string;
  bgColour: string;
  title: string;
  description: string;
  href: string;
  priority: "critical" | "high" | "medium";
}

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function useNotificationCount(): number {
  const { items } = useNotifications();
  return items.length;
}

function useNotifications() {
  const currentUser = useAppStore((s) => s.currentUser);
  const actions = useAppStore((s) => s.actions);
  const controls = useAppStore((s) => s.controls);
  const risks = useAppStore((s) => s.risks);
  const riskAcceptances = useAppStore((s) => s.riskAcceptances);
  const regulations = useAppStore((s) => s.regulations);
  const policies = useAppStore((s) => s.policies);
  const scenarios = useAppStore((s) => s.scenarios);
  const ibs = useAppStore((s) => s.ibs);
  const selfAssessments = useAppStore((s) => s.selfAssessments);
  const processes = useAppStore((s) => s.processes);
  const regulatoryEvents = useAppStore((s) => s.regulatoryEvents);
  const permissionSet = usePermissionSet();

  const items = useMemo((): NotifItem[] => {
    if (!currentUser) return [];
    const out: NotifItem[] = [];
    const canViewPending = permissionSet.has("can:view-pending");
    const isOwner = currentUser.role === "OWNER";

    // Overdue actions assigned to current user
    const overdueActions = actions.filter((a) => {
      if (a.status === "COMPLETED") return false;
      if (!a.dueDate) return false;
      if (isOwner && a.assignedTo !== currentUser.id) return false;
      return new Date(a.dueDate) < new Date();
    });
    if (overdueActions.length > 0) {
      out.push({
        id: "overdue-actions",
        icon: ListChecks,
        iconColour: "text-red-600",
        bgColour: "bg-red-50",
        title: `${overdueActions.length} overdue action${overdueActions.length > 1 ? "s" : ""}`,
        description: `${overdueActions.slice(0, 2).map((a) => a.title).join(", ")}${overdueActions.length > 2 ? ` +${overdueActions.length - 2} more` : ""}`,
        href: "/actions?status=OVERDUE",
        priority: "critical",
      });
    }

    // Actions due soon (within 7 days, not yet overdue)
    const dueSoonActions = actions.filter((a) => {
      if (a.status === "COMPLETED") return false;
      if (isOwner && a.assignedTo !== currentUser.id) return false;
      const days = daysUntilDue(a.dueDate);
      return days !== null && days >= 0 && days <= 7;
    });
    if (dueSoonActions.length > 0) {
      out.push({
        id: "due-soon-actions",
        icon: Clock,
        iconColour: "text-amber-600",
        bgColour: "bg-amber-50",
        title: `${dueSoonActions.length} action${dueSoonActions.length > 1 ? "s" : ""} due within 7 days`,
        description: `${dueSoonActions.slice(0, 2).map((a) => a.title).join(", ")}${dueSoonActions.length > 2 ? ` +${dueSoonActions.length - 2} more` : ""}`,
        href: "/actions",
        priority: "high",
      });
    }

    // Pending control change approvals (CCRO only)
    if (canViewPending) {
      const pendingControlChanges = controls.reduce((acc, c) => {
        return acc + (c.changes ?? []).filter((ch) => ch.status === "PENDING").length;
      }, 0);
      if (pendingControlChanges > 0) {
        out.push({
          id: "pending-control-changes",
          icon: ClipboardList,
          iconColour: "text-sky-600",
          bgColour: "bg-sky-50",
          title: `${pendingControlChanges} control change${pendingControlChanges > 1 ? "s" : ""} awaiting approval`,
          description: "Review and approve or reject pending changes",
          href: "/controls",
          priority: "high",
        });
      }

      const pendingRiskChanges = risks.reduce((acc, r) => {
        return acc + (r.changes ?? []).filter((ch) => ch.status === "PENDING").length;
      }, 0);
      if (pendingRiskChanges > 0) {
        out.push({
          id: "pending-risk-changes",
          icon: ShieldAlert,
          iconColour: "text-sky-600",
          bgColour: "bg-sky-50",
          title: `${pendingRiskChanges} risk change${pendingRiskChanges > 1 ? "s" : ""} awaiting approval`,
          description: "Review and approve or reject proposed risk changes",
          href: "/risk-register",
          priority: "high",
        });
      }
    }

    // Risk acceptances needing review
    const pendingRA = riskAcceptances.filter((ra) =>
      ["PROPOSED", "CCRO_REVIEW", "AWAITING_APPROVAL"].includes(ra.status) ||
      ra.status === "EXPIRED"
    );
    if (pendingRA.length > 0) {
      out.push({
        id: "risk-acceptances",
        icon: ShieldQuestion,
        iconColour: "text-purple-600",
        bgColour: "bg-purple-50",
        title: `${pendingRA.length} risk acceptance${pendingRA.length > 1 ? "s" : ""} require attention`,
        description: `${pendingRA.filter((r) => r.status === "EXPIRED").length} expired, ${pendingRA.filter((r) => r.status === "PROPOSED").length} proposed`,
        href: "/risk-acceptances",
        priority: "high",
      });
    }

    // Compliance gaps (CCRO only)
    if (canViewPending) {
      const complianceGaps = regulations.filter(
        (r) => r.isApplicable && (r.complianceStatus === "NON_COMPLIANT" || r.complianceStatus === "GAP_IDENTIFIED")
      );
      if (complianceGaps.length > 0) {
        out.push({
          id: "compliance-gaps",
          icon: Scale,
          iconColour: "text-indigo-600",
          bgColour: "bg-indigo-50",
          title: `${complianceGaps.length} regulation${complianceGaps.length > 1 ? "s" : ""} with compliance gaps`,
          description: `${complianceGaps.slice(0, 2).map((r) => r.shortName ?? r.reference).join(", ")}${complianceGaps.length > 2 ? ` +${complianceGaps.length - 2} more` : ""}`,
          href: "/compliance?tab=regulatory-universe",
          priority: "medium",
        });
      }

      // Regulations not yet assessed
      const notAssessed = regulations.filter(
        (r) => r.isApplicable && r.isActive && r.complianceStatus === "NOT_ASSESSED"
      );
      if (notAssessed.length > 0) {
        out.push({
          id: "not-assessed-regs",
          icon: Scale,
          iconColour: "text-gray-500",
          bgColour: "bg-gray-50",
          title: `${notAssessed.length} regulation${notAssessed.length > 1 ? "s" : ""} not yet assessed`,
          description: "Compliance status unknown — assessment required",
          href: "/compliance?tab=assessment-log",
          priority: "medium",
        });
      }
    }

    // Overdue policies
    const overduePolicies = policies.filter((p) => p.status === "OVERDUE");
    if (overduePolicies.length > 0) {
      out.push({
        id: "overdue-policies",
        icon: BookOpen,
        iconColour: "text-red-600",
        bgColour: "bg-red-50",
        title: `${overduePolicies.length} polic${overduePolicies.length > 1 ? "ies" : "y"} overdue for review`,
        description: `${overduePolicies.slice(0, 2).map((p) => p.name).join(", ")}${overduePolicies.length > 2 ? ` +${overduePolicies.length - 2} more` : ""}`,
        href: "/compliance?tab=policies",
        priority: "high",
      });
    }

    const isCCRO = currentUser.role === "CCRO_TEAM";

    // 8. Overdue Scenario Tests (CCRO only)
    if (isCCRO) {
      const overdueScenarios = scenarios.filter(
        (s) => s.nextTestDate && new Date(s.nextTestDate) < new Date() && s.status !== "COMPLETE"
      );
      if (overdueScenarios.length > 0) {
        out.push({
          id: "overdue-scenarios",
          icon: ShieldAlert,
          iconColour: "text-red-600",
          bgColour: "bg-red-50",
          title: `${overdueScenarios.length} scenario test${overdueScenarios.length > 1 ? "s" : ""} overdue`,
          description: `${overdueScenarios.slice(0, 2).map((s) => s.name).join(", ")}${overdueScenarios.length > 2 ? ` +${overdueScenarios.length - 2} more` : ""}`,
          href: "/processes?tab=ibs",
          priority: "critical",
        });
      }

      // 9. Scenario Tests Due Soon (within 30 days)
      const dueSoonScenarios = scenarios.filter((s) => {
        if (s.status === "COMPLETE") return false;
        const days = daysUntilDue(s.nextTestDate);
        return days !== null && days >= 0 && days <= 30;
      });
      if (dueSoonScenarios.length > 0) {
        out.push({
          id: "due-soon-scenarios",
          icon: Clock,
          iconColour: "text-amber-600",
          bgColour: "bg-amber-50",
          title: `${dueSoonScenarios.length} scenario test${dueSoonScenarios.length > 1 ? "s" : ""} due within 30 days`,
          description: `${dueSoonScenarios.slice(0, 2).map((s) => s.name).join(", ")}${dueSoonScenarios.length > 2 ? ` +${dueSoonScenarios.length - 2} more` : ""}`,
          href: "/processes?tab=ibs",
          priority: "high",
        });
      }

      // 10. IBS Resource Coverage Gaps
      const ibsGaps = ibs.filter((i) => (i.categoriesFilled ?? 0) < 3);
      if (ibsGaps.length > 0) {
        out.push({
          id: "ibs-coverage-gaps",
          icon: Building2,
          iconColour: "text-amber-600",
          bgColour: "bg-amber-50",
          title: `${ibsGaps.length} IBS with incomplete resource mapping`,
          description: `${ibsGaps.slice(0, 2).map((i) => i.reference).join(", ")}${ibsGaps.length > 2 ? ` +${ibsGaps.length - 2} more` : ""} — fewer than 3 categories filled`,
          href: "/processes?tab=ibs",
          priority: "high",
        });
      }

      // 11. Annual Self-Assessment Not Submitted (only after 1 June)
      const currentYear = new Date().getFullYear();
      const juneFirst = new Date(currentYear, 5, 1); // June = month 5 (0-indexed)
      if (new Date() >= juneFirst) {
        const hasSubmitted = selfAssessments.some(
          (sa) => sa.year === currentYear && (sa.status === "SUBMITTED" || sa.status === "APPROVED")
        );
        if (!hasSubmitted) {
          const isOctober = new Date().getMonth() >= 9; // October+
          out.push({
            id: "self-assessment-not-submitted",
            icon: FileCheck,
            iconColour: isOctober ? "text-red-600" : "text-amber-600",
            bgColour: isOctober ? "bg-red-50" : "bg-amber-50",
            title: `${currentYear} self-assessment not yet submitted`,
            description: "Annual operational resilience self-assessment must be submitted to the board for approval",
            href: "/processes?tab=self-assessment",
            priority: isOctober ? "critical" : "high",
          });
        }
      }

      // 13. Upcoming Regulatory Deadlines
      const urgentEvents = regulatoryEvents.filter((e) => {
        const days = daysUntilDue(e.eventDate);
        return days !== null && days >= 0 && days <= e.alertDays;
      });
      if (urgentEvents.length > 0) {
        out.push({
          id: "regulatory-deadlines",
          icon: Calendar,
          iconColour: "text-amber-600",
          bgColour: "bg-amber-50",
          title: `${urgentEvents.length} regulatory deadline${urgentEvents.length > 1 ? "s" : ""} approaching`,
          description: `${urgentEvents.slice(0, 2).map((e) => e.title).join(", ")}${urgentEvents.length > 2 ? ` +${urgentEvents.length - 2} more` : ""}`,
          href: "/regulatory-calendar",
          priority: "high",
        });
      }
    }

    // 12. Processes Overdue for Review — scoped to own processes for OWNER role (D3)
    const overdueProcesses = processes.filter((p) => {
      if (!p.nextReviewDate || new Date(p.nextReviewDate) >= new Date() || p.status !== "ACTIVE") return false;
      if (isOwner && p.ownerId !== currentUser.id) return false;
      return true;
    });
    if (overdueProcesses.length > 0) {
      out.push({
        id: "overdue-process-reviews",
        icon: BookOpen,
        iconColour: "text-gray-500",
        bgColour: "bg-gray-50",
        title: `${overdueProcesses.length} process${overdueProcesses.length > 1 ? "es" : ""} overdue for review`,
        description: `${overdueProcesses.slice(0, 2).map((p) => p.name).join(", ")}${overdueProcesses.length > 2 ? ` +${overdueProcesses.length - 2} more` : ""}`,
        href: "/processes",
        priority: "medium",
      });
    }

    // E3. Overdue Control Tests — for the assigned tester
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1; // 1-12
    const nowQuarter = Math.ceil(nowMonth / 3);

    function isTestEntryOverdue(ts: import("@/lib/types").TestingScheduleEntry): boolean {
      const results = ts.testResults ?? [];
      switch (ts.testingFrequency) {
        case "MONTHLY":
          return !results.some((r) => r.periodYear === nowYear && r.periodMonth === nowMonth);
        case "QUARTERLY": {
          const qStartMonth = (nowQuarter - 1) * 3 + 1; // 1, 4, 7, 10
          return !results.some((r) => r.periodYear === nowYear && r.periodMonth === qStartMonth);
        }
        case "BI_ANNUAL": {
          const halfStart = nowMonth <= 6 ? 1 : 7;
          return !results.some((r) => r.periodYear === nowYear && r.periodMonth === halfStart);
        }
        case "ANNUAL":
          return !results.some((r) => r.periodYear === nowYear);
        default:
          return false;
      }
    }

    const overdueTestEntries = controls
      .map((c) => c.testingSchedule)
      .filter((ts): ts is import("@/lib/types").TestingScheduleEntry =>
        !!ts && ts.isActive && ts.assignedTesterId === currentUser.id && isTestEntryOverdue(ts)
      );
    if (overdueTestEntries.length > 0) {
      out.push({
        id: "overdue-control-tests",
        icon: FlaskConical,
        iconColour: "text-purple-600",
        bgColour: "bg-purple-50",
        title: `${overdueTestEntries.length} control test${overdueTestEntries.length > 1 ? "s" : ""} pending`,
        description: `Tests not yet submitted for the current period — you are the assigned tester`,
        href: "/controls",
        priority: "high",
      });
    }

    // R4 — Resolved change request feedback (proposer view)
    // Show each APPROVED/REJECTED change proposed by the current user in the last 30 days.
    // These are dismissible — the user clicks × to clear them, stored in localStorage.
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const action of actions) {
      for (const ch of action.changes ?? []) {
        if (ch.proposedBy !== currentUser.id) continue;
        if (ch.status !== "APPROVED" && ch.status !== "REJECTED") continue;
        const resolvedAt = ch.reviewedAt ? new Date(ch.reviewedAt).getTime() : new Date(ch.proposedAt).getTime();
        if (resolvedAt < thirtyDaysAgo) continue;
        const approved = ch.status === "APPROVED";
        out.push({
          id: `resolved-action-${ch.id}`,
          dismissId: `action-${ch.id}`,
          icon: approved ? CheckCircle2 : XCircle,
          iconColour: approved ? "text-green-600" : "text-red-600",
          bgColour: approved ? "bg-green-50" : "bg-red-50",
          title: `Change ${approved ? "approved" : "rejected"}: ${ch.fieldChanged}`,
          description: `Action: ${action.title}${ch.reviewNote ? ` · ${ch.reviewNote}` : ""}`,
          href: "/actions",
          priority: "medium",
        });
      }
    }

    for (const control of controls) {
      for (const ch of control.changes ?? []) {
        if (ch.proposedBy !== currentUser.id) continue;
        if (ch.status !== "APPROVED" && ch.status !== "REJECTED") continue;
        const resolvedAt = ch.reviewedAt ? new Date(ch.reviewedAt).getTime() : new Date(ch.proposedAt).getTime();
        if (resolvedAt < thirtyDaysAgo) continue;
        const approved = ch.status === "APPROVED";
        out.push({
          id: `resolved-control-${ch.id}`,
          dismissId: `control-${ch.id}`,
          icon: approved ? CheckCircle2 : XCircle,
          iconColour: approved ? "text-green-600" : "text-red-600",
          bgColour: approved ? "bg-green-50" : "bg-red-50",
          title: `Change ${approved ? "approved" : "rejected"}: ${ch.fieldChanged}`,
          description: `Control: ${control.controlRef} – ${control.controlName}${ch.reviewNote ? ` · ${ch.reviewNote}` : ""}`,
          href: "/controls",
          priority: "medium",
        });
      }
    }

    for (const risk of risks) {
      for (const ch of risk.changes ?? []) {
        if (ch.proposedBy !== currentUser.id) continue;
        if (ch.status !== "APPROVED" && ch.status !== "REJECTED") continue;
        const resolvedAt = ch.reviewedAt ? new Date(ch.reviewedAt).getTime() : new Date(ch.proposedAt).getTime();
        if (resolvedAt < thirtyDaysAgo) continue;
        const approved = ch.status === "APPROVED";
        out.push({
          id: `resolved-risk-${ch.id}`,
          dismissId: `risk-${ch.id}`,
          icon: approved ? CheckCircle2 : XCircle,
          iconColour: approved ? "text-green-600" : "text-red-600",
          bgColour: approved ? "bg-green-50" : "bg-red-50",
          title: `Change ${approved ? "approved" : "rejected"}: ${ch.fieldChanged}`,
          description: `Risk: ${risk.reference} – ${risk.name}${ch.reviewNote ? ` · ${ch.reviewNote}` : ""}`,
          href: "/risk-register",
          priority: "medium",
        });
      }
    }

    // Sort: critical first, then high, then medium
    const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2 };
    return out.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [currentUser, actions, controls, risks, riskAcceptances, regulations, policies, scenarios, ibs, selfAssessments, processes, regulatoryEvents, permissionSet]);

  return { items };
}

export default function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const { items } = useNotifications();
  const currentUser = useAppStore((s) => s.currentUser);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Dismissed change notification IDs, persisted in localStorage per user
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const stored = localStorage.getItem(`cr-dismissed-${currentUser.id}`);
      if (stored) setDismissedIds(new Set(JSON.parse(stored) as string[]));
    } catch {
      // ignore corrupt storage
    }
  }, [currentUser?.id]);

  function dismiss(e: React.MouseEvent, dismissId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser?.id) return;
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(dismissId);
      try {
        localStorage.setItem(`cr-dismissed-${currentUser.id}`, JSON.stringify(Array.from(next)));
      } catch { /* quota exceeded — ignore */ }
      return next;
    });
  }

  const visibleItems = items.filter(
    (item) => !item.dismissId || !dismissedIds.has(item.dismissId)
  );

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={drawerRef}
      className="fixed top-14 right-4 z-[9998] w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
        <Bell size={16} className="text-updraft-bright-purple" />
        <h2 className="flex-1 text-sm font-semibold text-gray-900">Notifications</h2>
        {visibleItems.length > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {visibleItems.length}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Close notifications"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[70vh] overflow-y-auto">
        {visibleItems.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <CheckCircle2 size={36} className="text-green-400" />
            <p className="text-sm font-medium text-gray-600">You&apos;re all caught up!</p>
            <p className="text-xs text-gray-400 text-center px-6">
              No overdue items, pending approvals, or compliance gaps to action.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const priorityDot = item.priority === "critical"
                ? "bg-red-500"
                : item.priority === "high"
                ? "bg-amber-500"
                : "bg-gray-300";
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", item.bgColour)}>
                    <Icon size={16} className={item.iconColour} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 leading-snug">{item.title}</p>
                      <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full shrink-0", priorityDot)} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                  </div>
                  {item.dismissId ? (
                    <button
                      type="button"
                      onClick={(e) => dismiss(e, item.dismissId!)}
                      className="mt-0.5 shrink-0 rounded p-0.5 text-gray-300 hover:bg-gray-200 hover:text-gray-500 transition-colors"
                      aria-label="Dismiss notification"
                    >
                      <X size={13} />
                    </button>
                  ) : (
                    <ExternalLink size={13} className="mt-1 shrink-0 text-gray-300" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {visibleItems.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">{visibleItems.length} item{visibleItems.length !== 1 ? "s" : ""} requiring attention</p>
          <Link
            href="/"
            onClick={onClose}
            className="text-[11px] text-updraft-bright-purple hover:underline font-medium"
          >
            View dashboard →
          </Link>
        </div>
      )}
    </div>
  );
}
