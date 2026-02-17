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
} from "lucide-react";
import { useAppStore } from "@/lib/store";
// Audit logging is handled server-side by the API routes
import { cn, formatDateShort } from "@/lib/utils";
import type { Action, ActionStatus } from "@/lib/types";
import { api } from "@/lib/api-client";
import ActionFormDialog from "@/components/actions/ActionFormDialog";
import ActionChangePanel from "@/components/actions/ActionChangePanel";
import ActionCSVUploadDialog from "@/components/actions/ActionCSVUploadDialog";

const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string; bgColor: string; icon: typeof Circle }> = {
  OPEN: { label: "Open", color: "text-blue-600", bgColor: "bg-blue-100 text-blue-700", icon: Circle },
  IN_PROGRESS: { label: "In Progress", color: "text-amber-600", bgColor: "bg-amber-100 text-amber-700", icon: Clock },
  COMPLETED: { label: "Completed", color: "text-blue-600", bgColor: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  OVERDUE: { label: "Overdue", color: "text-red-600", bgColor: "bg-red-100 text-red-700", icon: AlertTriangle },
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

  // Filters — initialise status from URL param
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const param = searchParams.get("status");
    if (param === "OPEN" || param === "IN_PROGRESS" || param === "OVERDUE" || param === "COMPLETED" || param === "DUE_THIS_MONTH") return param;
    return "ALL";
  });
  const [ownerFilter, setOwnerFilter] = useState<string>("ALL");
  const [reportFilter, setReportFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [editAction, setEditAction] = useState<Action | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // URL-synced status change
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    router.replace(value === "ALL" ? "/actions" : `/actions?status=${value}`, { scroll: false });
  }, [router]);

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
    return { total, open, overdue, dueThisMonth, completed };
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
  }, [actions, statusFilter, ownerFilter, reportFilter, sourceFilter, search, users]);

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

  const expandedAction = expandedId ? actions.find((a) => a.id === expandedId) : null;

  const statCards = [
    { label: "Total", value: stats.total, color: "text-gray-700", bg: "bg-gray-50", filterKey: "ALL" },
    { label: "Open", value: stats.open, color: "text-blue-700", bg: "bg-blue-50", filterKey: "OPEN" },
    { label: "Overdue", value: stats.overdue, color: "text-red-700", bg: "bg-red-50", filterKey: "OVERDUE" },
    { label: "Due This Month", value: stats.dueThisMonth, color: "text-amber-700", bg: "bg-amber-50", filterKey: "DUE_THIS_MONTH" },
    { label: "Completed", value: stats.completed, color: "text-blue-700", bg: "bg-blue-50", filterKey: "COMPLETED" },
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

      {/* Stats — clickable with active highlight */}
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50/50">
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

                  {/* Expanded Detail */}
                  {isExpanded && expandedAction && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 animate-slide-up">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Details */}
                        <div className="lg:col-span-2 space-y-4">
                          <div>
                            <h3 className="font-poppins text-base font-semibold text-gray-900">{expandedAction.title}</h3>
                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                              {expandedAction.description || "No description provided."}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-gray-400 font-medium">Report</span>
                              <Link
                                href={`/reports/${expandedAction.reportId}`}
                                className="flex items-center gap-1 text-updraft-bright-purple hover:underline mt-0.5"
                              >
                                {expandedAction.reportPeriod} <ArrowUpRight size={11} />
                              </Link>
                            </div>
                            {expandedAction.sectionTitle && (
                              <div>
                                <span className="text-gray-400 font-medium">Section</span>
                                <p className="text-gray-700 mt-0.5">{expandedAction.sectionTitle}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-400 font-medium">Owner</span>
                              <p className="text-gray-700 mt-0.5">{owner?.name || "Unassigned"}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 font-medium">Due</span>
                              <p className={cn("mt-0.5", dueDateColor(expandedAction))}>
                                {expandedAction.dueDate ? formatDateShort(expandedAction.dueDate) : "No date"}
                                {days !== null && days > 0 && expandedAction.status !== "COMPLETED" && (
                                  <span className="text-gray-400 ml-1">({days}d)</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-2">
                            {isCCRO && (
                              <>
                                <button
                                  onClick={() => { setEditAction(expandedAction); setShowForm(true); }}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  Edit
                                </button>
                                {expandedAction.status !== "COMPLETED" && (
                                  <button
                                    onClick={() => {
                                      updateAction(expandedAction.id, { status: "COMPLETED", completedAt: new Date().toISOString() });
                                    }}
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
                            {!isCCRO && expandedAction.assignedTo === currentUser?.id && expandedAction.status !== "COMPLETED" && (
                              <button
                                onClick={() => handleProposeChange(expandedAction.id, "status", expandedAction.status, "COMPLETED")}
                                className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                              >
                                Propose Complete
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Right: Change History */}
                        <div className="lg:col-span-1">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Change History</h4>
                          <ActionChangePanel
                            changes={expandedAction.changes || []}
                            isCCRO={isCCRO}
                            onApprove={(changeId, note) => handleApproveChange(expandedAction.id, changeId, note)}
                            onReject={(changeId, note) => handleRejectChange(expandedAction.id, changeId, note)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
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
