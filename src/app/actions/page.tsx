"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ListChecks,
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ArrowUpRight,
  CalendarClock,
  UserRoundPen,
  ShieldAlert,
  History,
  MessageSquare,
  Info,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
// Audit logging is handled server-side by the API routes
import { cn, formatDateShort } from "@/lib/utils";
import type { Action, ActionStatus, ActionPriority } from "@/lib/types";
import { api } from "@/lib/api-client";
import ActionFormDialog from "@/components/actions/ActionFormDialog";
import ActionChangePanel from "@/components/actions/ActionChangePanel";
import ActionCSVUploadDialog from "@/components/actions/ActionCSVUploadDialog";
import ActionUpdateForm from "@/components/actions/ActionUpdateForm";

const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string; bgColor: string; icon: typeof Circle }> = {
  OPEN: { label: "Open", color: "text-blue-600", bgColor: "bg-blue-100 text-blue-700", icon: Circle },
  IN_PROGRESS: { label: "In Progress", color: "text-amber-600", bgColor: "bg-amber-100 text-amber-700", icon: Clock },
  COMPLETED: { label: "Completed", color: "text-blue-600", bgColor: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  OVERDUE: { label: "Overdue", color: "text-red-600", bgColor: "bg-red-100 text-red-700", icon: AlertTriangle },
  PROPOSED_CLOSED: { label: "Proposed Closed", color: "text-purple-600", bgColor: "bg-purple-100 text-purple-700", icon: CheckCircle2 },
};

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; color: string; bgColor: string }> = {
  P1: { label: "P1", color: "text-red-700", bgColor: "bg-red-100 text-red-700" },
  P2: { label: "P2", color: "text-amber-700", bgColor: "bg-amber-100 text-amber-700" },
  P3: { label: "P3", color: "text-slate-600", bgColor: "bg-slate-100 text-slate-600" },
};

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
  if (days <= 30) return "text-amber-600 font-medium";
  return "text-gray-600";
}

function rowBorderColor(action: Action): string {
  if (action.status === "COMPLETED") return "border-l-blue-400";
  if (action.status === "OVERDUE") return "border-l-red-400";
  const days = daysUntilDue(action.dueDate);
  if (days !== null && days <= 0) return "border-l-red-400";
  if (days !== null && days <= 30) return "border-l-amber-400";
  return "border-l-gray-200";
}

function ActionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAppStore((s) => s.currentUser);
  const actions = useAppStore((s) => s.actions);
  const reports = useAppStore((s) => s.reports);
  const users = useAppStore((s) => s.users);
  const addAction = useAppStore((s) => s.addAction);
  const updateAction = useAppStore((s) => s.updateAction);
  const deleteAction = useAppStore((s) => s.deleteAction);
  const setActions = useAppStore((s) => s.setActions);

  const isCCRO = currentUser?.role === "CCRO_TEAM";

  // Filters — initialise from URL params
  const [search, setSearch] = useState("");
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
    // If deep-linking to a specific action via ?edit=, show all so it's not filtered out
    if (searchParams.get("edit")) return "ALL";
    // Non-CCRO users see their own actions by default
    if (!isCCRO && currentUser?.id) return currentUser.id;
    return "ALL";
  });
  const [reportFilter, setReportFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [editAction, setEditAction] = useState<Action | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(() => searchParams.get("edit"));
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState<string | null>(null);
  const [showDateProposal, setShowDateProposal] = useState<string | null>(null);
  const [showReassignProposal, setShowReassignProposal] = useState<string | null>(null);
  const [proposedDate, setProposedDate] = useState("");
  const [proposedOwner, setProposedOwner] = useState("");
  const [proposalReason, setProposalReason] = useState("");

  // URL-synced status/priority change
  const buildUrl = useCallback((status: string, priority: string) => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (priority !== "ALL") params.set("priority", priority);
    const qs = params.toString();
    return qs ? `/actions?${qs}` : "/actions";
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    router.replace(buildUrl(value, priorityFilter), { scroll: false });
  }, [router, buildUrl, priorityFilter]);

  const handlePriorityChange = useCallback((value: string) => {
    setPriorityFilter(value);
    router.replace(buildUrl(statusFilter, value), { scroll: false });
  }, [router, buildUrl, statusFilter]);

  const handleStatClick = useCallback((filterKey: string) => {
    handleStatusChange(statusFilter === filterKey ? "ALL" : filterKey);
  }, [statusFilter, handleStatusChange]);

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
    return { total, open, overdue, dueThisMonth, completed, p1, p2, p3 };
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

  const handleCreateAction = useCallback((action: Action) => {
    addAction(action);
  }, [addAction]);

  const handleEditAction = useCallback((action: Action) => {
    updateAction(action.id, action);
  }, [updateAction]);

  const handleDeleteAction = useCallback((id: string) => {
    if (!confirm("Are you sure you want to delete this action?")) return;
    deleteAction(id);
  }, [deleteAction]);

  const handleApproveChange = useCallback(async (actionId: string, changeId: string, note: string) => {
    try {
      await api(`/api/actions/${actionId}/changes/${changeId}`, {
        method: "PATCH",
        body: { status: "APPROVED", reviewNote: note },
      });
      // Refresh action from API
      const updated = await api<Action>(`/api/actions/${actionId}`);
      updateAction(actionId, updated);
    } catch (err) {
      console.error("Failed to approve change:", err);
    }
  }, [updateAction]);

  const handleRejectChange = useCallback(async (actionId: string, changeId: string, note: string) => {
    try {
      await api(`/api/actions/${actionId}/changes/${changeId}`, {
        method: "PATCH",
        body: { status: "REJECTED", reviewNote: note },
      });
      const updated = await api<Action>(`/api/actions/${actionId}`);
      updateAction(actionId, updated);
    } catch (err) {
      console.error("Failed to reject change:", err);
    }
  }, [updateAction]);

  const handleProposeChange = useCallback(async (actionId: string, field: string, oldValue: string, newValue: string) => {
    try {
      await api(`/api/actions/${actionId}/changes`, {
        method: "POST",
        body: { fieldChanged: field, oldValue, newValue },
      });
      const updated = await api<Action>(`/api/actions/${actionId}`);
      updateAction(actionId, updated);
    } catch (err) {
      console.error("Failed to propose change:", err);
    }
  }, [updateAction]);

  const handleSubmitUpdate = useCallback(async (actionId: string, data: { updateText: string; evidenceUrl: string | null; evidenceName: string | null }) => {
    try {
      await api(`/api/actions/${actionId}/changes`, {
        method: "POST",
        body: {
          fieldChanged: "update",
          oldValue: null,
          newValue: data.updateText,
          isUpdate: true,
          evidenceUrl: data.evidenceUrl,
          evidenceName: data.evidenceName,
        },
      });
      const updated = await api<Action>(`/api/actions/${actionId}`);
      updateAction(actionId, updated);
      setShowUpdateForm(null);
    } catch (err) {
      console.error("Failed to submit update:", err);
    }
  }, [updateAction]);

  const handleExport = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (reportFilter !== "ALL") params.set("reportId", reportFilter);
    window.open(`/api/actions/export?${params.toString()}`, "_blank");
  }, [statusFilter, reportFilter]);

  const handleImportComplete = useCallback(async () => {
    try {
      const refreshed = await api<Action[]>("/api/actions");
      setActions(refreshed);
    } catch {
      // Fallback: keep current state
    }
  }, [setActions]);

  const handleProposeDateChange = useCallback(async (actionId: string) => {
    if (!proposedDate || !proposalReason.trim()) return;
    const action = actions.find((a) => a.id === actionId);
    if (!action) return;
    await handleProposeChange(actionId, "dueDate", action.dueDate || "", new Date(proposedDate).toISOString());
    // Also submit the reason as a progress update
    await handleSubmitUpdate(actionId, {
      updateText: `Date change requested: ${proposalReason.trim()}`,
      evidenceUrl: null,
      evidenceName: null,
    });
    setShowDateProposal(null);
    setProposedDate("");
    setProposalReason("");
  }, [actions, proposedDate, proposalReason, handleProposeChange, handleSubmitUpdate]);

  const handleProposeReassign = useCallback(async (actionId: string) => {
    if (!proposedOwner || !proposalReason.trim()) return;
    const action = actions.find((a) => a.id === actionId);
    if (!action) return;
    await handleProposeChange(actionId, "assignedTo", action.assignedTo, proposedOwner);
    await handleSubmitUpdate(actionId, {
      updateText: `Ownership reassignment requested: ${proposalReason.trim()}`,
      evidenceUrl: null,
      evidenceName: null,
    });
    setShowReassignProposal(null);
    setProposedOwner("");
    setProposalReason("");
  }, [actions, proposedOwner, proposalReason, handleProposeChange, handleSubmitUpdate]);

  // Derive original values from change history
  function getOriginalValue(action: Action, field: string): string | null {
    if (!action.changes || action.changes.length === 0) return null;
    const sorted = [...action.changes]
      .filter((c) => c.fieldChanged === field && !c.isUpdate)
      .sort((a, b) => new Date(a.proposedAt).getTime() - new Date(b.proposedAt).getTime());
    return sorted.length > 0 ? sorted[0].oldValue : null;
  }

  // Count total delays in days from date changes
  function getTotalDelayDays(action: Action): number {
    if (!action.changes) return 0;
    const dateChanges = action.changes
      .filter((c) => c.fieldChanged === "dueDate" && c.status === "APPROVED")
      .sort((a, b) => new Date(a.proposedAt).getTime() - new Date(b.proposedAt).getTime());
    if (dateChanges.length === 0) return 0;
    const originalDate = dateChanges[0].oldValue;
    const latestDate = dateChanges[dateChanges.length - 1].newValue;
    if (!originalDate || !latestDate) return 0;
    const diffMs = new Date(latestDate).getTime() - new Date(originalDate).getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  const expandedAction = expandedId ? actions.find((a) => a.id === expandedId) : null;

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
        {isCCRO && (
          <div className="flex items-center gap-2">
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
        )}
      </div>

      {/* Priority cards */}
      <div className="grid grid-cols-3 gap-3">
        {priorityCards.map((p) => (
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
            <p className={cn("text-2xl font-bold font-poppins", p.color)}>{p.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">active actions</p>
          </button>
        ))}
      </div>

      {/* Status stats — clickable with active highlight */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map((s) => (
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
            <p className={cn("text-2xl font-bold font-poppins", s.color)}>{s.value}</p>
          </button>
        ))}
      </div>

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

      {/* Actions Table */}
      <div className="bento-card p-0 overflow-hidden">
        {filteredActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ListChecks size={40} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No actions found</p>
            <p className="text-xs text-gray-400 mt-1">
              {actions.length === 0 ? "Create your first action to get started" : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredActions.map((action) => {
              const owner = users.find((u) => u.id === action.assignedTo);
              const isExpanded = expandedId === action.id;
              const StatusIcon = STATUS_CONFIG[action.status].icon;
              const days = daysUntilDue(action.dueDate);

              return (
                <div key={action.id}>
                  {/* Row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : action.id)}
                    className={cn(
                      "flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors border-l-4",
                      rowBorderColor(action),
                      isExpanded && "bg-updraft-pale-purple/10"
                    )}
                  >
                    <div className="shrink-0">
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400" />
                      )}
                    </div>

                    {/* Title + Report */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold font-mono text-updraft-deep shrink-0">
                          {action.reference}
                        </span>
                        {action.priority && (
                          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0", PRIORITY_CONFIG[action.priority].bgColor)}>
                            {action.priority}
                          </span>
                        )}
                        <p className="text-sm font-medium text-gray-900 truncate">{action.title}</p>
                        {action.source === "Risk Register" && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-updraft-pale-purple/40 px-1.5 py-0.5 text-[9px] font-semibold text-updraft-deep shrink-0">
                            Risk
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{action.reportPeriod || action.source}{action.sectionTitle ? ` → ${action.sectionTitle}` : ""}</p>
                    </div>

                    {/* Owner */}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0 w-32">
                      <User size={13} className="text-gray-400" />
                      <span className="text-xs text-gray-600 truncate">{owner?.name || "Unassigned"}</span>
                    </div>

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

                    {/* Pending badge */}
                    {action.changes && action.changes.filter((c) => c.status === "PENDING").length > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
                        {action.changes.filter((c) => c.status === "PENDING").length} pending
                      </span>
                    )}
                  </button>

                  {/* Expanded Detail Card */}
                  {isExpanded && expandedAction && (() => {
                    const creator = users.find((u) => u.id === expandedAction.createdBy);
                    const originalOwnerVal = getOriginalValue(expandedAction, "assignedTo");
                    const originalOwnerUser = originalOwnerVal ? users.find((u) => u.id === originalOwnerVal) : null;
                    const originalDueDateVal = getOriginalValue(expandedAction, "dueDate");
                    const totalDelay = getTotalDelayDays(expandedAction);
                    const dateChangeCount = (expandedAction.changes || []).filter((c) => c.fieldChanged === "dueDate").length;
                    const isMyAction = expandedAction.assignedTo === currentUser?.id;
                    const isActive = expandedAction.status !== "COMPLETED";

                    return (
                      <div className="border-t border-updraft-pale-purple/40 bg-white px-6 py-5 animate-slide-up">
                        {/* Issue Reference / Reason */}
                        <div className="mb-4 rounded-lg bg-updraft-pale-purple/15 border border-updraft-pale-purple/30 px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Info size={14} className="text-updraft-bar shrink-0" />
                            <span className="text-xs font-semibold text-updraft-bar uppercase tracking-wider">Reason for Action</span>
                          </div>
                          {expandedAction.source === "Risk Register" && expandedAction.linkedMitigation ? (
                            <Link
                              href={`/risk-register?risk=${expandedAction.linkedMitigation.riskId}`}
                              className="text-sm text-updraft-bright-purple hover:underline flex items-center gap-1"
                            >
                              <ShieldAlert size={13} />
                              Linked to risk: {expandedAction.linkedMitigation.riskId}
                              <ArrowUpRight size={11} />
                            </Link>
                          ) : expandedAction.reportId ? (
                            <Link
                              href={`/reports/${expandedAction.reportId}`}
                              className="text-sm text-updraft-bright-purple hover:underline flex items-center gap-1"
                            >
                              {expandedAction.reportPeriod || "Linked report"}
                              <ArrowUpRight size={11} />
                            </Link>
                          ) : expandedAction.source ? (
                            <p className="text-sm text-gray-700">{expandedAction.source}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No reason specified</p>
                          )}
                        </div>

                        {/* Title + Status + Priority */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-bold font-mono text-updraft-deep">
                                {expandedAction.reference}
                              </span>
                              {expandedAction.priority && (
                                <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-bold", PRIORITY_CONFIG[expandedAction.priority].bgColor)}>
                                  {PRIORITY_CONFIG[expandedAction.priority].label}
                                </span>
                              )}
                              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_CONFIG[expandedAction.status].bgColor)}>
                                {(() => { const SI = STATUS_CONFIG[expandedAction.status].icon; return <SI size={11} />; })()}
                                {STATUS_CONFIG[expandedAction.status].label}
                              </span>
                            </div>
                            <h3 className="font-poppins text-lg font-semibold text-gray-900">{expandedAction.title}</h3>
                          </div>
                        </div>

                        {/* Description — greyed out for non-CCRO */}
                        <div className={cn(
                          "rounded-lg border p-4 mb-4",
                          isCCRO ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50"
                        )}>
                          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                          <p className={cn(
                            "text-sm whitespace-pre-wrap leading-relaxed",
                            isCCRO ? "text-gray-700" : "text-gray-400"
                          )}>
                            {expandedAction.description || "No description provided."}
                          </p>
                          {!isCCRO && (
                            <p className="text-[10px] text-gray-300 mt-2 italic">Only the CCRO team can edit the description</p>
                          )}
                        </div>

                        {/* Key Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                            <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Current Owner</span>
                            <p className="text-sm font-medium text-gray-800">{owner?.name || "Unassigned"}</p>
                            {originalOwnerUser && originalOwnerUser.id !== expandedAction.assignedTo && (
                              <p className="text-[10px] text-gray-400 mt-0.5">Originally: {originalOwnerUser.name}</p>
                            )}
                          </div>
                          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                            <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Due Date</span>
                            <p className={cn("text-sm font-medium", dueDateColor(expandedAction))}>
                              {expandedAction.dueDate ? formatDateShort(expandedAction.dueDate) : "No date"}
                              {days !== null && days > 0 && isActive && (
                                <span className="text-gray-400 font-normal ml-1">({days}d)</span>
                              )}
                            </p>
                            {originalDueDateVal && originalDueDateVal !== expandedAction.dueDate && (
                              <p className="text-[10px] text-gray-400 mt-0.5">Originally: {formatDateShort(originalDueDateVal)}</p>
                            )}
                          </div>
                          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                            <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Created</span>
                            <p className="text-sm font-medium text-gray-800">{formatDateShort(expandedAction.createdAt)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">by {creator?.name || "Unknown"}</p>
                          </div>
                          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                            <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Delay Summary</span>
                            {totalDelay > 0 ? (
                              <>
                                <p className="text-sm font-medium text-red-600">{totalDelay} days delayed</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{dateChangeCount} date {dateChangeCount === 1 ? "change" : "changes"}</p>
                              </>
                            ) : dateChangeCount > 0 ? (
                              <p className="text-sm font-medium text-gray-600">{dateChangeCount} date {dateChangeCount === 1 ? "change" : "changes"}</p>
                            ) : (
                              <p className="text-sm text-gray-400">On track</p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 mb-5 pb-4 border-b border-gray-100">
                          {isCCRO && (
                            <>
                              <button
                                onClick={() => { setEditAction(expandedAction); setShowForm(true); }}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                Edit
                              </button>
                              {isActive && (
                                <button
                                  onClick={() => updateAction(expandedAction.id, { status: "COMPLETED", completedAt: new Date().toISOString() })}
                                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                                >
                                  Mark Complete
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteAction(expandedAction.id)}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {isActive && (isMyAction || isCCRO) && (
                            <>
                              <button
                                onClick={() => setShowUpdateForm(showUpdateForm === expandedAction.id ? null : expandedAction.id)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                                  showUpdateForm === expandedAction.id
                                    ? "border-updraft-bright-purple bg-updraft-pale-purple/30 text-updraft-deep"
                                    : "border-updraft-light-purple bg-updraft-pale-purple/20 text-updraft-deep hover:bg-updraft-pale-purple/40"
                                )}
                              >
                                <MessageSquare size={12} /> Add Update
                              </button>
                              {!isCCRO && (
                                <>
                                  <button
                                    onClick={() => {
                                      setShowDateProposal(showDateProposal === expandedAction.id ? null : expandedAction.id);
                                      setShowReassignProposal(null);
                                    }}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                                      showDateProposal === expandedAction.id
                                        ? "border-amber-400 bg-amber-50 text-amber-700"
                                        : "border-amber-200 text-amber-700 hover:bg-amber-50"
                                    )}
                                  >
                                    <CalendarClock size={12} /> Request Date Change
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowReassignProposal(showReassignProposal === expandedAction.id ? null : expandedAction.id);
                                      setShowDateProposal(null);
                                    }}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                                      showReassignProposal === expandedAction.id
                                        ? "border-blue-400 bg-blue-50 text-blue-700"
                                        : "border-blue-200 text-blue-700 hover:bg-blue-50"
                                    )}
                                  >
                                    <UserRoundPen size={12} /> Request Reassignment
                                  </button>
                                  <button
                                    onClick={() => handleProposeChange(expandedAction.id, "status", expandedAction.status, "PROPOSED_CLOSED")}
                                    className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                                  >
                                    Propose Closed
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>

                        {/* Inline Forms */}
                        <div className="space-y-3 mb-5">
                          {/* Progress Update Form */}
                          {showUpdateForm === expandedAction.id && (
                            <ActionUpdateForm
                              actionId={expandedAction.id}
                              onSubmit={(data) => handleSubmitUpdate(expandedAction.id, data)}
                              onCancel={() => setShowUpdateForm(null)}
                            />
                          )}

                          {/* Date Change Proposal Form */}
                          {showDateProposal === expandedAction.id && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                              <div className="flex items-center gap-2 mb-1">
                                <CalendarClock size={14} className="text-amber-600" />
                                <span className="text-xs font-semibold text-amber-700">Request Due Date Change</span>
                              </div>
                              <div className="rounded-md bg-amber-100/60 border border-amber-200 px-3 py-2">
                                <p className="text-xs text-amber-800">
                                  Date changes require approval from the CCRO team. Your request will be reviewed and you will be notified of the outcome.
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Due Date</label>
                                  <p className="text-sm text-gray-500 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200">
                                    {expandedAction.dueDate ? formatDateShort(expandedAction.dueDate) : "Not set"}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Proposed New Date</label>
                                  <input
                                    type="date"
                                    value={proposedDate}
                                    onChange={(e) => setProposedDate(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Change</label>
                                <textarea
                                  rows={2}
                                  value={proposalReason}
                                  onChange={(e) => setProposalReason(e.target.value)}
                                  placeholder="Explain why the due date needs to change..."
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple resize-none"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setShowDateProposal(null); setProposedDate(""); setProposalReason(""); }}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleProposeDateChange(expandedAction.id)}
                                  disabled={!proposedDate || !proposalReason.trim()}
                                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Submit for Approval
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Reassignment Proposal Form */}
                          {showReassignProposal === expandedAction.id && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                              <div className="flex items-center gap-2 mb-1">
                                <UserRoundPen size={14} className="text-blue-600" />
                                <span className="text-xs font-semibold text-blue-700">Request Ownership Reassignment</span>
                              </div>
                              <div className="rounded-md bg-blue-100/60 border border-blue-200 px-3 py-2">
                                <p className="text-xs text-blue-800">
                                  Reassignment requests are reviewed by the CCRO team before taking effect.
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Owner</label>
                                  <p className="text-sm text-gray-500 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200">
                                    {owner?.name || "Unassigned"}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Proposed New Owner</label>
                                  <select
                                    value={proposedOwner}
                                    onChange={(e) => setProposedOwner(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple"
                                  >
                                    <option value="">Select...</option>
                                    {users.filter((u) => u.isActive && u.id !== expandedAction.assignedTo).map((u) => (
                                      <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Reassignment</label>
                                <textarea
                                  rows={2}
                                  value={proposalReason}
                                  onChange={(e) => setProposalReason(e.target.value)}
                                  placeholder="Explain why this action should be reassigned..."
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple resize-none"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setShowReassignProposal(null); setProposedOwner(""); setProposalReason(""); }}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleProposeReassign(expandedAction.id)}
                                  disabled={!proposedOwner || !proposalReason.trim()}
                                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Submit for Approval
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Change History Timeline */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <History size={14} className="text-gray-500" />
                            <h4 className="text-sm font-semibold text-gray-700">Change History</h4>
                            {(expandedAction.changes || []).length > 0 && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                                {(expandedAction.changes || []).length}
                              </span>
                            )}
                          </div>
                          <ActionChangePanel
                            changes={expandedAction.changes || []}
                            isCCRO={isCCRO}
                            onApprove={(changeId, note) => handleApproveChange(expandedAction.id, changeId, note)}
                            onReject={(changeId, note) => handleRejectChange(expandedAction.id, changeId, note)}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Form Dialog */}
      <ActionFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditAction(undefined); }}
        onSave={editAction ? handleEditAction : handleCreateAction}
        action={editAction}
        reports={reports}
        users={users}
        currentUserId={currentUser?.id ?? ""}
      />

      {/* CSV Import Dialog */}
      <ActionCSVUploadDialog
        open={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}

export default function ActionsPage() {
  return (
    <Suspense>
      <ActionsPageContent />
    </Suspense>
  );
}
