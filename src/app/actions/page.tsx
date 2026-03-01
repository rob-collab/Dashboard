"use client";

import { useState, useMemo, useCallback, Suspense, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ListChecks,
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  Bell,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Circle,
  XCircle,
  CheckCircle,
  GitBranch,
  CheckSquare,
  Square,
  UserRoundCheck,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
// Audit logging is handled server-side by the API routes
import { cn, formatDateShort } from "@/lib/utils";
import type { Action, ActionStatus, ActionPriority } from "@/lib/types";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import ActionFormDialog from "@/components/actions/ActionFormDialog";
import ActionDetailPanel from "@/components/actions/ActionDetailPanel";
import ActionCSVUploadDialog from "@/components/actions/ActionCSVUploadDialog";
import HistoryTab from "@/components/common/HistoryTab";
import { usePageTitle } from "@/lib/usePageTitle";
import RequestEditAccessButton from "@/components/common/RequestEditAccessButton";
import { MotionListDiv } from "@/components/motion/MotionList";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import ScrollReveal from "@/components/common/ScrollReveal";
import { SkeletonStatRow, SkeletonTable } from "@/components/common/SkeletonLoader";
import { MotionDiv } from "@/components/motion/MotionRow";
import ConfirmDialog from "@/components/common/ConfirmDialog";

const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string; bgColor: string; icon: typeof Circle }> = {
  OPEN: { label: "Open", color: "text-blue-600", bgColor: "bg-blue-100 text-blue-700", icon: Circle },
  IN_PROGRESS: { label: "In Progress", color: "text-amber-600", bgColor: "bg-amber-100 text-amber-700", icon: Clock },
  COMPLETED: { label: "Completed", color: "text-green-600", bgColor: "bg-green-100 text-green-700", icon: CheckCircle2 },
  OVERDUE: { label: "Overdue", color: "text-red-600", bgColor: "bg-red-100 text-red-700", icon: AlertTriangle },
  PROPOSED_CLOSED: { label: "Proposed Closed", color: "text-purple-600", bgColor: "bg-purple-100 text-purple-700", icon: CheckCircle2 },
};

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; color: string; bgColor: string }> = {
  P1: { label: "P1", color: "text-red-700", bgColor: "bg-red-100 text-red-700" },
  P2: { label: "P2", color: "text-amber-700", bgColor: "bg-amber-100 text-amber-700" },
  P3: { label: "P3", color: "text-slate-600", bgColor: "bg-slate-100 text-slate-600" },
};

const GROUP_ORDER: ActionStatus[] = ["OVERDUE", "IN_PROGRESS", "OPEN", "PROPOSED_CLOSED", "COMPLETED"];

function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function dueDateColor(action: Action): string {
  if (action.status === "COMPLETED") return "text-gray-400";
  if (action.status === "OVERDUE") return "text-red-600 font-semibold";
  const days = daysUntilDue(action.dueDate);
  if (days === null) return "text-gray-400";
  if (days <= 0) return "text-red-600 font-semibold";
  if (days <= 7) return "text-amber-600 font-medium";
  return "text-gray-600";
}

function rowBorderColor(action: Action): string {
  if (action.priority === "P1") return "border-l-red-500";
  if (action.priority === "P2") return "border-l-amber-400";
  if (action.priority === "P3") return "border-l-green-400";
  return "border-l-gray-200";
}

function ActionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAppStore((s) => s.currentUser);
  const hydrated = useAppStore((s) => s._hydrated);
  const actions = useAppStore((s) => s.actions);
  const reports = useAppStore((s) => s.reports);
  const users = useAppStore((s) => s.users);
  const addAction = useAppStore((s) => s.addAction);
  const updateAction = useAppStore((s) => s.updateAction);
  const setActions = useAppStore((s) => s.setActions);

  const isCCRO = currentUser?.role === "CCRO_TEAM";

  // Page-level tab: actions list or history
  const [activeTab, setActiveTab] = useState<"actions" | "history">(() =>
    searchParams.get("tab") === "history" ? "history" : "actions"
  );

  // Sync activeTab from URL
  useEffect(() => {
    setActiveTab(searchParams.get("tab") === "history" ? "history" : "actions");
  }, [searchParams]);

  function handleTabChange(tab: "actions" | "history") {
    setActiveTab(tab);
    if (tab === "history") {
      router.replace("/actions?tab=history", { scroll: false });
    }
    // Switching back to "actions": the filter sync effect below will rewrite the URL
  }

  // Filters — initialise from URL params
  const [search, setSearch] = useState<string>(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const param = searchParams.get("status");
    if (param === "OPEN" || param === "IN_PROGRESS" || param === "OVERDUE" || param === "COMPLETED" || param === "DUE_THIS_MONTH" || param === "PROPOSED_CLOSED") return param;
    return "ALL";
  });
  const [priorityFilter, setPriorityFilter] = useState<string>(() => {
    const param = searchParams.get("priority");
    if (param === "P1" || param === "P2" || param === "P3") return param;
    return "ALL";
  });
  const [ownerFilter, setOwnerFilter] = useState<string>(() => {
    // Non-CCRO users always see their own actions (including when deep-linking via ?edit=)
    if (!isCCRO && currentUser?.id) return currentUser.id;
    return searchParams.get("owner") ?? "ALL";
  });
  const [reportFilter, setReportFilter] = useState<string>(() => searchParams.get("report") ?? "ALL");
  const [sourceFilter, setSourceFilter] = useState<string>(() => searchParams.get("source") ?? "ALL");

  // Query-param prefill for "Create Action from Metric"
  const prefillNewAction = searchParams.get("newAction") === "true";
  const prefillConsumerDutyMIId = searchParams.get("consumerDutyMIId") || undefined;
  const prefillMetricName = searchParams.get("metricName") || undefined;
  const prefillSource = searchParams.get("source") || undefined;
  const prefillRiskId = searchParams.get("riskId") || undefined;

  // UI State
  const [showForm, setShowForm] = useState(prefillNewAction);
  const [editAction, setEditAction] = useState<Action | undefined>(undefined);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(() => {
    return searchParams.get("action") || searchParams.get("edit") || null;
  });
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem("actions-collapsed-groups");
      return s ? new Set(JSON.parse(s) as string[]) : new Set(["COMPLETED"]);
    } catch { return new Set(["COMPLETED"]); }
  });
  const [progressMounted, setProgressMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReassignTo, setBulkReassignTo] = useState("");
  const [showBulkReassign, setShowBulkReassign] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [bulkCompleteConfirmOpen, setBulkCompleteConfirmOpen] = useState(false);
  const [lastRemindedAt, setLastRemindedAt] = useState<Date | null>(() => {
    try {
      const s = localStorage.getItem("actions-last-reminded");
      return s ? new Date(s) : null;
    } catch { return null; }
  });

  // Debounced URL sync for all filters
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (activeTab === "history") return; // don't overwrite ?tab=history with filter params
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      if (search.trim()) params.set("q", search.trim());
      if (isCCRO && ownerFilter !== "ALL") params.set("owner", ownerFilter);
      if (reportFilter !== "ALL") params.set("report", reportFilter);
      if (sourceFilter !== "ALL") params.set("source", sourceFilter);
      const qs = params.toString();
      router.replace(qs ? `/actions?${qs}` : "/actions", { scroll: false });
    }, 150);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [statusFilter, priorityFilter, search, ownerFilter, reportFilter, sourceFilter, isCCRO, router, activeTab]);

  const handleStatusChange = useCallback((value: string) => setStatusFilter(value), []);
  const handlePriorityChange = useCallback((value: string) => setPriorityFilter(value), []);

  const handleStatClick = useCallback((filterKey: string) => {
    setStatusFilter((prev) => prev === filterKey ? "ALL" : filterKey);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = actions.length;
    const open = actions.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS").length;
    const overdue = actions.filter((a) => a.status === "OVERDUE" || (a.status !== "COMPLETED" && daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! <= 0)).length;
    const dueThisMonth = actions.filter((a) => {
      if (a.status === "COMPLETED") return false;
      const days = daysUntilDue(a.dueDate);
      return days !== null && days > 0 && days <= 30;
    }).length;
    const completed = actions.filter((a) => a.status === "COMPLETED").length;
    const p1 = actions.filter((a) => a.priority === "P1" && a.status !== "COMPLETED").length;
    const p2 = actions.filter((a) => a.priority === "P2" && a.status !== "COMPLETED").length;
    const p3 = actions.filter((a) => a.priority === "P3" && a.status !== "COMPLETED").length;
    // Headline metrics
    const overdueItems = actions.filter((a) => a.status !== "COMPLETED" && daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! <= 0);
    const avgDelay = overdueItems.length > 0
      ? Math.round(overdueItems.reduce((sum, a) => sum + Math.abs(daysUntilDue(a.dueDate)!), 0) / overdueItems.length)
      : 0;
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ownerChanges30d = actions.reduce((count, a) => {
      if (!a.changes) return count;
      return count + a.changes.filter((c) => c.fieldChanged === "assignedTo" && new Date(c.proposedAt) >= cutoff30d).length;
    }, 0);
    return { total, open, overdue, dueThisMonth, completed, p1, p2, p3, avgDelay, ownerChanges30d };
  }, [actions]);

  // Filtered actions — handles virtual filter values (OPEN, DUE_THIS_MONTH, OVERDUE)
  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (statusFilter !== "ALL") {
        if (statusFilter === "OPEN") {
          if (a.status !== "OPEN" && a.status !== "IN_PROGRESS") return false;
        } else if (statusFilter === "DUE_THIS_MONTH") {
          if (a.status === "COMPLETED") return false;
          const days = daysUntilDue(a.dueDate);
          if (days === null || days <= 0 || days > 30) return false;
        } else if (statusFilter === "OVERDUE") {
          const isOverdue = a.status === "OVERDUE" || (a.status !== "COMPLETED" && daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! <= 0);
          if (!isOverdue) return false;
        } else {
          if (a.status !== statusFilter) return false;
        }
      }
      if (priorityFilter !== "ALL" && a.priority !== priorityFilter) return false;
      if (ownerFilter !== "ALL" && a.assignedTo !== ownerFilter) return false;
      if (reportFilter !== "ALL" && a.reportId !== reportFilter) return false;
      if (sourceFilter !== "ALL") {
        if (sourceFilter === "Risk Register" && a.source !== "Risk Register") return false;
        if (sourceFilter === "Report" && a.source === "Risk Register") return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const owner = users.find((u) => u.id === a.assignedTo);
        const matchesSearch =
          a.reference.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.reportPeriod?.toLowerCase().includes(q) ?? false) ||
          (a.source?.toLowerCase().includes(q) ?? false) ||
          (a.sectionTitle?.toLowerCase().includes(q) ?? false) ||
          (owner?.name.toLowerCase().includes(q) ?? false);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [actions, statusFilter, priorityFilter, ownerFilter, reportFilter, sourceFilter, search, users]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setProgressMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<ActionStatus, Action[]>(GROUP_ORDER.map((s) => [s, []]));
    for (const action of filteredActions) {
      const effectiveStatus: ActionStatus =
        (action.status === "OPEN" || action.status === "IN_PROGRESS") &&
        daysUntilDue(action.dueDate) !== null &&
        daysUntilDue(action.dueDate)! <= 0
          ? "OVERDUE"
          : action.status;
      map.get(effectiveStatus)?.push(action);
    }
    return map;
  }, [filteredActions]);

  const handleCreateAction = useCallback((action: Action) => {
    addAction(action);
  }, [addAction]);

  const handleEditAction = useCallback((action: Action) => {
    updateAction(action.id, action);
  }, [updateAction]);

  const handleExport = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (reportFilter !== "ALL") params.set("reportId", reportFilter);
    window.open(`/api/actions/export?${params.toString()}`, "_blank");
  }, [statusFilter, reportFilter]);

  const handleBulkClose = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkCompleteConfirmOpen(true);
  }, [selectedIds]);

  const handleBulkCloseConfirmed = useCallback(async () => {
    setBulkCompleteConfirmOpen(false);
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      updateAction(id, { status: "COMPLETED", completedAt: new Date().toISOString() });
    }
    setSelectedIds(new Set());
    toast.success(`${ids.length} action${ids.length === 1 ? "" : "s"} marked as Completed`);
  }, [selectedIds, updateAction]);

  const handleBulkReassign = useCallback(async () => {
    if (!bulkReassignTo) return;
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const targetUser = users.find((u) => u.id === bulkReassignTo);
    for (const id of ids) {
      updateAction(id, { assignedTo: bulkReassignTo });
    }
    setSelectedIds(new Set());
    setShowBulkReassign(false);
    setBulkReassignTo("");
    toast.success(`${ids.length} action${ids.length === 1 ? "" : "s"} reassigned to ${targetUser?.name ?? "new owner"}`);
  }, [selectedIds, bulkReassignTo, users, updateAction]);

  const handleBulkExport = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const params = new URLSearchParams();
    params.set("ids", ids.join(","));
    window.open(`/api/actions/export?${params.toString()}`, "_blank");
  }, [selectedIds]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredActions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredActions.map((a) => a.id)));
    }
  }, [selectedIds, filteredActions]);

  const handleImportComplete = useCallback(async () => {
    try {
      const refreshed = await api<Action[]>("/api/actions");
      setActions(refreshed);
    } catch {
      toast.error("Failed to refresh actions after import");
    }
  }, [setActions]);

  const selectedAction = selectedActionId ? actions.find((a) => a.id === selectedActionId) ?? null : null;

  async function handleSendReminders() {
    if (reminderSending) return;
    setReminderSending(true);
    try {
      const result = await api<{ sent: number }>("/api/actions/remind", { method: "POST" });
      const now = new Date();
      setLastRemindedAt(now);
      try { localStorage.setItem("actions-last-reminded", now.toISOString()); } catch { /* ignore */ }
      toast.success(`Sent ${result.sent} reminder email${result.sent !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to send reminders");
    } finally {
      setReminderSending(false);
    }
  }

  const statCards = [
    { label: "Total", value: stats.total, color: "text-gray-700", bg: "bg-gray-50", filterKey: "ALL", type: "status" as const },
    { label: "Open", value: stats.open, color: "text-blue-700", bg: "bg-blue-50", filterKey: "OPEN", type: "status" as const },
    { label: "Overdue", value: stats.overdue, color: "text-red-700", bg: "bg-red-50", filterKey: "OVERDUE", type: "status" as const },
    { label: "Due This Month", value: stats.dueThisMonth, color: "text-amber-700", bg: "bg-amber-50", filterKey: "DUE_THIS_MONTH", type: "status" as const },
    { label: "Completed", value: stats.completed, color: "text-blue-700", bg: "bg-blue-50", filterKey: "COMPLETED", type: "status" as const },
  ];

  const priorityCards = [
    { label: "P1 Critical", value: stats.p1, color: "text-red-700", bg: "bg-red-50", filterKey: "P1" },
    { label: "P2 Important", value: stats.p2, color: "text-amber-700", bg: "bg-amber-50", filterKey: "P2" },
    { label: "P3 Routine", value: stats.p3, color: "text-slate-600", bg: "bg-slate-50", filterKey: "P3" },
  ];

  if (!hydrated) return (
    <div className="space-y-6">
      <SkeletonStatRow count={4} />
      <SkeletonTable rows={6} cols={5} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-updraft-deep font-poppins flex items-center gap-2">
            <ListChecks size={24} className="text-updraft-bright-purple" />
            Actions
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage actions arising from reports</p>
        </div>
        {isCCRO ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendReminders}
              disabled={reminderSending}
              title={lastRemindedAt ? `Last sent: ${lastRemindedAt.toLocaleString("en-GB")}` : "Send email reminders to assignees with overdue or upcoming actions"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <Bell size={14} /> {reminderSending ? "Sending…" : "Send Reminders"}
            </button>
            <button
              onClick={() => setShowCSVImport(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Upload size={14} /> Import CSV
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => { setEditAction(undefined); setShowForm(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-3 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
            >
              <Plus size={14} /> New Action
            </button>
          </div>
        ) : (
          <RequestEditAccessButton permission="edit:actions" />
        )}
      </div>

      {/* Page tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["actions", "history"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab
                ? "border-updraft-bright-purple text-updraft-deep"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {tab === "actions" ? "Actions" : "History"}
          </button>
        ))}
      </div>

      {activeTab === "history" && (
        <HistoryTab
          entityTypes={["action"]}
          title="Actions History"
          description="Audit trail of action changes, assignments and status updates."
        />
      )}

      {activeTab === "actions" && <>

      {/* Headline metrics row */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        <span className="font-semibold text-gray-700">{stats.total}</span>
        <span>actions</span>
        <span className="text-gray-300 mx-0.5">·</span>
        <span className={cn("font-semibold", stats.overdue > 0 ? "text-red-600" : "text-gray-700")}>{stats.overdue}</span>
        <span className={stats.overdue > 0 ? "text-red-500" : "text-gray-500"}>overdue</span>
        <span className="text-gray-300 mx-0.5">·</span>
        <span>Avg delay:</span>
        <span className={cn("font-semibold", stats.avgDelay > 0 ? "text-amber-600" : "text-gray-700")}>{stats.avgDelay}d</span>
        <span className="text-gray-300 mx-0.5">·</span>
        <span className="font-semibold text-gray-700">{stats.ownerChanges30d}</span>
        <span>owner changes (30d)</span>
      </div>

      {/* My/All toggle */}
      {(() => {
        const myCount = actions.filter((a) => a.assignedTo === currentUser?.id).length;
        const isMyMode = ownerFilter === currentUser?.id;
        return (
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
            <button
              onClick={() => setOwnerFilter("ALL")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                !isMyMode
                  ? "bg-updraft-pale-purple/40 text-updraft-deep"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              All Actions
            </button>
            <button
              onClick={() => myCount > 0 && currentUser?.id && setOwnerFilter(currentUser.id)}
              disabled={myCount === 0}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isMyMode
                  ? "bg-updraft-pale-purple/40 text-updraft-deep"
                  : myCount === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              My Actions
              {myCount > 0 && (
                <span className="rounded-full bg-updraft-bright-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-updraft-bright-purple">
                  {myCount}
                </span>
              )}
            </button>
          </div>
        );
      })()}

      {/* Priority cards */}
      <ScrollReveal>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {priorityCards.map((p, idx) => (
          <button
            key={p.filterKey}
            onClick={() => handlePriorityChange(priorityFilter === p.filterKey ? "ALL" : p.filterKey)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all cursor-pointer",
              p.bg,
              priorityFilter === p.filterKey
                ? "border-updraft-bright-purple ring-2 ring-updraft-bright-purple/30"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <p className="text-xs text-gray-500">{p.label}</p>
            <AnimatedNumber value={p.value} delay={idx * 50} className={cn("text-2xl font-bold font-poppins", p.color)} />
            <p className="text-[10px] text-gray-400 mt-0.5">active actions</p>
          </button>
        ))}
      </div>
      </ScrollReveal>

      {/* Status stats — clickable with active highlight */}
      <ScrollReveal delay={80}>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map((s, idx) => (
          <button
            key={s.label}
            onClick={() => handleStatClick(s.filterKey)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all cursor-pointer",
              s.bg,
              statusFilter === s.filterKey
                ? "border-updraft-bright-purple ring-2 ring-updraft-bright-purple/30"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <AnimatedNumber value={s.value} delay={idx * 50} className={cn("text-2xl font-bold font-poppins", s.color)} />
          </button>
        ))}
      </div>
      </ScrollReveal>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions..."
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            showFilters ? "border-updraft-light-purple bg-updraft-pale-purple/20 text-updraft-deep" : "border-gray-200 text-gray-700 hover:bg-gray-50"
          )}
        >
          <Filter size={14} /> Filters
          <ChevronDown size={14} className={cn("transition-transform", showFilters && "rotate-180")} />
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50/50">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-updraft-light-purple"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="OVERDUE">Overdue</option>
              <option value="DUE_THIS_MONTH">Due This Month</option>
              <option value="COMPLETED">Completed</option>
              <option value="PROPOSED_CLOSED">Proposed Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-updraft-light-purple"
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 — Critical</option>
              <option value="P2">P2 — Important</option>
              <option value="P3">P3 — Routine</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-updraft-light-purple"
            >
              <option value="ALL">All Owners</option>
              {users.filter((u) => u.isActive).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Report</label>
            <select
              value={reportFilter}
              onChange={(e) => setReportFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-updraft-light-purple"
            >
              <option value="ALL">All Reports</option>
              {reports.map((r) => (
                <option key={r.id} value={r.id}>{r.title} — {r.period}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-updraft-light-purple"
            >
              <option value="ALL">All Sources</option>
              <option value="Risk Register">Risk Register</option>
              <option value="Report">Report</option>
            </select>
          </div>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {isCCRO && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-updraft-bright-purple/30 bg-updraft-pale-purple/10 px-4 py-3">
          <span className="text-sm font-semibold text-updraft-deep">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-gray-300" />
          <button
            type="button"
            onClick={handleBulkClose}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
          >
            <CheckCircle size={12} />Mark Completed
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBulkReassign((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserRoundCheck size={12} />Reassign...
            </button>
            {showBulkReassign && (
              <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-xl border border-gray-200 bg-white shadow-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600">Reassign {selectedIds.size} action{selectedIds.size === 1 ? "" : "s"} to:</p>
                <select
                  value={bulkReassignTo}
                  onChange={(e) => setBulkReassignTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none"
                >
                  <option value="">Select new owner...</option>
                  {users.filter((u) => u.isActive).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!bulkReassignTo}
                  onClick={handleBulkReassign}
                  className="w-full rounded-lg bg-updraft-bright-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50"
                >
                  Confirm Reassign
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleBulkExport}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={12} />Export Selected
          </button>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={12} />Clear
            </button>
          </div>
        </div>
      )}

      {/* Completion Progress Bar */}
      {filteredActions.length > 0 && (() => {
        const completedCount = (grouped.get("COMPLETED") ?? []).length;
        const pct = Math.round((completedCount / filteredActions.length) * 100);
        return (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: progressMounted ? `${pct}%` : "0%" }}
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0 w-40 text-right">
              {completedCount} of {filteredActions.length} complete ({pct}%)
            </span>
          </div>
        );
      })()}

      {/* Actions Table */}
      <ScrollReveal delay={120}>
      <div className="bento-card p-0 overflow-hidden">
        {/* Select-all header row */}
        {isCCRO && filteredActions.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/60">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {selectedIds.size === filteredActions.length && filteredActions.length > 0 ? (
                <CheckSquare size={15} className="text-updraft-bright-purple" />
              ) : (
                <Square size={15} />
              )}
              {selectedIds.size > 0 && selectedIds.size < filteredActions.length
                ? `${selectedIds.size} of ${filteredActions.length} selected`
                : selectedIds.size === filteredActions.length && filteredActions.length > 0
                ? "All selected"
                : "Select all"}
            </button>
          </div>
        )}
        {filteredActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ListChecks size={40} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No actions found</p>
            <p className="text-xs text-gray-400 mt-1">
              {actions.length === 0 ? "Create your first action to get started" : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <div>
            {GROUP_ORDER.filter((gStatus) => (grouped.get(gStatus) ?? []).length > 0).map((gStatus) => {
              const groupActions = grouped.get(gStatus) ?? [];
              const isGroupCollapsed = collapsedGroups.has(gStatus);
              const GroupCfg = STATUS_CONFIG[gStatus];
              const GroupIcon = GroupCfg.icon;
              return (
                <div key={gStatus} className="border-b border-gray-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(gStatus)) next.delete(gStatus);
                        else next.add(gStatus);
                        try { localStorage.setItem("actions-collapsed-groups", JSON.stringify(Array.from(next))); } catch {}
                        return next;
                      })
                    }
                    className="flex w-full items-center gap-3 px-4 py-2.5 bg-gray-50/80 hover:bg-gray-100/80 transition-colors text-left border-b border-gray-100"
                  >
                    <ChevronRight size={14} className={cn("text-gray-400 transition-transform shrink-0", !isGroupCollapsed && "rotate-90")} />
                    <GroupIcon size={14} className={cn("shrink-0", GroupCfg.color)} />
                    <span className={cn("text-xs font-semibold", GroupCfg.color)}>{GroupCfg.label}</span>
                    <span className="ml-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                      {groupActions.length}
                    </span>
                    {/* Mini on-track bar */}
                    {(() => {
                      const onTrack = groupActions.filter((a) => {
                        const days = daysUntilDue(a.dueDate);
                        return a.status === "COMPLETED" || a.status === "PROPOSED_CLOSED" || days === null || days > 0;
                      }).length;
                      const pct = groupActions.length > 0 ? Math.round((onTrack / groupActions.length) * 100) : 0;
                      return (
                        <div className="ml-auto flex items-center gap-2 pr-1">
                          <div className="w-14 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                pct >= 70 ? "bg-green-500" : pct >= 30 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">{pct}% on track</span>
                        </div>
                      );
                    })()}
                  </button>
                  {!isGroupCollapsed && (
                    <MotionListDiv className="divide-y divide-gray-100">
                      {groupActions.map((action) => {
              const owner = users.find((u) => u.id === action.assignedTo);
              const StatusIcon = STATUS_CONFIG[action.status].icon;
              const isSelected = selectedIds.has(action.id);
              return (
                <MotionDiv key={action.id} className={cn(isSelected && "bg-updraft-pale-purple/5", action.status === "OVERDUE" && "row-overdue")}>
                  {/* Row */}
                  <div
                    className={cn(
                      "flex w-full items-center gap-2 border-l-4",
                      rowBorderColor(action),
                      selectedActionId === action.id && "bg-updraft-pale-purple/10"
                    )}
                  >
                    {/* Checkbox (CCRO only) */}
                    {isCCRO && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(action.id)) next.delete(action.id);
                            else next.add(action.id);
                            return next;
                          });
                        }}
                        className="pl-3 py-3 shrink-0"
                      >
                        {isSelected
                          ? <CheckSquare size={15} className="text-updraft-bright-purple" />
                          : <Square size={15} className="text-gray-300 hover:text-gray-500" />}
                      </button>
                    )}
                  <button
                    onClick={() => setSelectedActionId(action.id)}
                    className={cn(
                      "flex flex-1 items-center gap-4 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors",
                      !isCCRO && "pl-4"
                    )}
                  >
                    {/* Title + Report */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold font-mono text-updraft-deep shrink-0">
                          {action.reference}
                        </span>
                        {action.priority && (
                          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0", PRIORITY_CONFIG[action.priority].bgColor, action.priority === "P1" && "badge-glow-red")}>
                            {action.priority}
                          </span>
                        )}
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{action.title}</p>
                        {action.source === "Risk Register" && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-updraft-pale-purple/40 px-1.5 py-0.5 text-[9px] font-semibold text-updraft-deep shrink-0">
                            Risk
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{action.reportPeriod || action.source}{action.sectionTitle ? ` → ${action.sectionTitle}` : ""}</p>
                    </div>

                    {/* Owner — click to filter by this assignee */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (action.assignedTo) setOwnerFilter(action.assignedTo);
                      }}
                      title={owner ? `Filter by ${owner.name}` : undefined}
                      className="hidden sm:flex items-center gap-1.5 shrink-0 w-32 rounded-md px-1 -mx-1 hover:bg-gray-100 transition-colors"
                    >
                      {owner ? (
                        <span
                          className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-updraft-bar text-white text-[9px] font-bold shrink-0"
                        >
                          {owner.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </span>
                      ) : (
                        <User size={13} className="text-gray-400" />
                      )}
                      <span className="text-xs text-gray-600 truncate">{owner?.name || "Unassigned"}</span>
                    </button>

                    {/* Due Date */}
                    <div className={cn("hidden sm:flex items-center gap-1.5 shrink-0 w-28", dueDateColor(action))}>
                      <Calendar size={13} />
                      <span className="text-xs">
                        {action.dueDate ? formatDateShort(action.dueDate) : "No date"}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", STATUS_CONFIG[action.status].bgColor)}>
                        <StatusIcon size={11} />
                        {STATUS_CONFIG[action.status].label}
                      </span>
                    </div>

                    {/* Approval status badge */}
                    {action.approvalStatus === "PENDING_APPROVAL" && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold" title="This action is awaiting CCRO approval">
                        <Clock size={10} />
                        Awaiting Approval
                      </span>
                    )}
                    {action.approvalStatus === "APPROVED" && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-semibold" title="This action has been approved">
                        <CheckCircle size={10} />
                        Approved
                      </span>
                    )}
                    {action.approvalStatus === "REJECTED" && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-semibold" title="This action has been rejected — review the reason in the detail view">
                        <XCircle size={10} />
                        Rejected
                      </span>
                    )}

                    {/* Pending changes badge — distinct from approval status */}
                    {action.changes && action.changes.filter((c) => c.status === "PENDING").length > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-[10px] font-semibold" title="This action has proposed changes awaiting review">
                        <GitBranch size={10} />
                        {action.changes.filter((c) => c.status === "PENDING").length} change{action.changes.filter((c) => c.status === "PENDING").length !== 1 ? "s" : ""} pending
                      </span>
                    )}
                  </button>
                  </div>{/* end row outer div */}
                </MotionDiv>
              );
              })}
                    </MotionListDiv>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </ScrollReveal>

      </> /* end activeTab === "actions" */ }

      {/* Action Form Dialog */}
      <ActionFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditAction(undefined); }}
        onSave={editAction ? handleEditAction : handleCreateAction}
        action={editAction}
        reports={reports}
        users={users}
        currentUserId={currentUser?.id ?? ""}
        prefillSource={prefillSource}
        prefillConsumerDutyMIId={prefillConsumerDutyMIId}
        prefillMetricName={prefillMetricName}
        prefillRiskId={prefillRiskId}
      />

      {/* CSV Import Dialog */}
      <ActionCSVUploadDialog
        open={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Action Detail Panel */}
      <ActionDetailPanel
        action={selectedAction}
        onClose={() => setSelectedActionId(null)}
        onEdit={(action) => { setEditAction(action); setShowForm(true); }}
      />

      <ConfirmDialog
        open={bulkCompleteConfirmOpen}
        onClose={() => setBulkCompleteConfirmOpen(false)}
        onConfirm={handleBulkCloseConfirmed}
        title={`Mark ${selectedIds.size} action${selectedIds.size === 1 ? "" : "s"} as Completed`}
        message="This will mark all selected actions as Completed. This action cannot be undone in bulk."
        confirmLabel="Mark as Completed"
        variant="warning"
      />
    </div>
  );
}

export default function ActionsPage() {
  usePageTitle("Actions");
  return (
    <Suspense>
      <ActionsPageContent />
    </Suspense>
  );
}
