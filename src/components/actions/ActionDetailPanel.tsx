"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  X,
  Info,
  History,
  MessageSquare,
  CalendarClock,
  UserRoundPen,
  ShieldAlert,
  ArrowUpRight,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Circle,
  CheckCircle,
  XCircle,
  GitBranch,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { cn, formatDateShort } from "@/lib/utils";
import type { Action, ActionStatus } from "@/lib/types";
import { toast } from "sonner";
import ActionUpdateForm from "./ActionUpdateForm";
import ActionAccountabilityTimeline from "./ActionAccountabilityTimeline";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AutoResizeTextarea } from "@/components/common/AutoResizeTextarea";

const RichTextEditor = dynamic(() => import("@/components/common/RichTextEditor"), { ssr: false });

// ── helpers (same as page) ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string; bgColor: string; icon: typeof Circle }> = {
  OPEN: { label: "Open", color: "text-blue-600", bgColor: "bg-blue-100 text-blue-700", icon: Circle },
  IN_PROGRESS: { label: "In Progress", color: "text-amber-600", bgColor: "bg-amber-100 text-amber-700", icon: Clock },
  COMPLETED: { label: "Completed", color: "text-green-600", bgColor: "bg-green-100 text-green-700", icon: CheckCircle2 },
  OVERDUE: { label: "Overdue", color: "text-red-600", bgColor: "bg-red-100 text-red-700", icon: AlertTriangle },
  PROPOSED_CLOSED: { label: "Proposed Closed", color: "text-purple-600", bgColor: "bg-purple-100 text-purple-700", icon: CheckCircle2 },
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

function getOriginalValue(action: Action, field: string): string | null {
  if (!action.changes || action.changes.length === 0) return null;
  const sorted = [...action.changes]
    .filter((c) => c.fieldChanged === field && !c.isUpdate)
    .sort((a, b) => new Date(a.proposedAt).getTime() - new Date(b.proposedAt).getTime());
  return sorted.length > 0 ? sorted[0].oldValue : null;
}

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

// ── component ─────────────────────────────────────────────────────────────────

interface ActionDetailPanelProps {
  action: Action | null;
  onClose: () => void;
  onEdit: (action: Action) => void;
}

export default function ActionDetailPanel({ action, onClose, onEdit }: ActionDetailPanelProps) {
  const prefersReduced = useReducedMotion();
  const currentUser = useAppStore((s) => s.currentUser);
  const users = useAppStore((s) => s.users);
  const actions = useAppStore((s) => s.actions);
  const risks = useAppStore((s) => s.risks);
  const updateAction = useAppStore((s) => s.updateAction);
  const setActions = useAppStore((s) => s.setActions);
  const deleteAction = useAppStore((s) => s.deleteAction);

  const router = useRouter();
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  // ── local state ────────────────────────────────────────────────────────────
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showDateProposal, setShowDateProposal] = useState(false);
  const [showReassignProposal, setShowReassignProposal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(false);
  const [issueEditorValue, setIssueEditorValue] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [proposedOwner, setProposedOwner] = useState("");
  const [proposalReason, setProposalReason] = useState("");
  const [savingIssue, setSavingIssue] = useState(false);
  const [savingComplete, setSavingComplete] = useState(false);

  // Reset when action changes
  useEffect(() => {
    setShowUpdateForm(false);
    setShowDateProposal(false);
    setShowReassignProposal(false);
    setEditingIssue(false);
    setIssueEditorValue("");
    setProposedDate("");
    setProposedOwner("");
    setProposalReason("");
    setSavingIssue(false);
    setSavingComplete(false);
  }, [action?.id]);

  // ── handlers ──────────────────────────────────────────────────────────────

  async function handleProposeChange(actionId: string, field: string, oldValue: string, newValue: string) {
    try {
      await api(`/api/actions/${actionId}/changes`, {
        method: "POST",
        body: { fieldChanged: field, oldValue, newValue },
      });
      const updated = await api<Action>(`/api/actions/${actionId}`);
      updateAction(actionId, updated);
    } catch {
      toast.error("Failed to propose change");
    }
  }

  async function handleSubmitUpdate(data: { updateText: string; evidenceUrl: string | null; evidenceName: string | null }) {
    if (!action) return;
    try {
      await api(`/api/actions/${action.id}/changes`, {
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
      const updated = await api<Action>(`/api/actions/${action.id}`);
      updateAction(action.id, updated);
      setShowUpdateForm(false);
      toast.success("Update submitted");
    } catch {
      toast.error("Failed to submit update");
    }
  }

  async function handleApproveChange(changeId: string, note: string) {
    if (!action) return;
    try {
      await api(`/api/actions/${action.id}/changes/${changeId}`, {
        method: "PATCH",
        body: { status: "APPROVED", reviewNote: note },
      });
      const updated = await api<Action>(`/api/actions/${action.id}`);
      updateAction(action.id, updated);
    } catch {
      toast.error("Failed to approve change");
    }
  }

  async function handleRejectChange(changeId: string, note: string) {
    if (!action) return;
    try {
      await api(`/api/actions/${action.id}/changes/${changeId}`, {
        method: "PATCH",
        body: { status: "REJECTED", reviewNote: note },
      });
      const updated = await api<Action>(`/api/actions/${action.id}`);
      updateAction(action.id, updated);
    } catch {
      toast.error("Failed to reject change");
    }
  }

  async function handleProposeDateChange() {
    if (!action || !proposedDate || !proposalReason.trim()) return;
    await handleProposeChange(action.id, "dueDate", action.dueDate || "", new Date(proposedDate).toISOString());
    await handleSubmitUpdate({
      updateText: `Date change requested: ${proposalReason.trim()}`,
      evidenceUrl: null,
      evidenceName: null,
    });
    setShowDateProposal(false);
    setProposedDate("");
    setProposalReason("");
  }

  async function handleProposeReassign() {
    if (!action || !proposedOwner || !proposalReason.trim()) return;
    await handleProposeChange(action.id, "assignedTo", action.assignedTo, proposedOwner);
    await handleSubmitUpdate({
      updateText: `Ownership reassignment requested: ${proposalReason.trim()}`,
      evidenceUrl: null,
      evidenceName: null,
    });
    setShowReassignProposal(false);
    setProposedOwner("");
    setProposalReason("");
  }

  async function handleSaveIssueDescription(html: string) {
    if (!action) return;
    const clean = html === "<p></p>" ? "" : html;
    setSavingIssue(true);
    try {
      const updated = await api<Action>(`/api/actions/${action.id}`, {
        method: "PATCH",
        body: { issueDescription: clean || null },
      });
      setActions(actions.map((a) => (a.id === action.id ? { ...a, ...updated } : a)));
      setEditingIssue(false);
      toast.success("Action saved");
    } catch {
      toast.error("Failed to save action — please try again");
    } finally {
      setSavingIssue(false);
    }
  }

  function handleDelete() {
    if (!action) return;
    if (!confirm("Are you sure you want to delete this action?")) return;
    deleteAction(action.id);
    onClose();
  }

  async function handleMarkComplete() {
    if (!action) return;
    setSavingComplete(true);
    try {
      const updated = await api<Action>(`/api/actions/${action.id}`, {
        method: "PATCH",
        body: { status: "COMPLETED", completedAt: new Date().toISOString() },
      });
      setActions(actions.map((a) => (a.id === action.id ? { ...a, ...updated } : a)));
      toast.success("Action marked as complete");
    } catch {
      toast.error("Failed to save action — please try again");
    } finally {
      setSavingComplete(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (!action) return null;

  const owner = users.find((u) => u.id === action.assignedTo);
  const creator = users.find((u) => u.id === action.createdBy);
  const StatusIcon = STATUS_CONFIG[action.status].icon;
  const days = daysUntilDue(action.dueDate);
  const isActive = action.status !== "COMPLETED";
  const isMyAction = action.assignedTo === currentUser?.id;
  const originalOwnerVal = getOriginalValue(action, "assignedTo");
  const originalOwnerUser = originalOwnerVal ? users.find((u) => u.id === originalOwnerVal) : null;
  const originalDueDateVal = getOriginalValue(action, "dueDate");
  const totalDelay = getTotalDelayDays(action);
  const dateChangeCount = (action.changes || []).filter((c) => c.fieldChanged === "dueDate").length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col panel-surface shadow-2xl sm:w-[560px] lg:w-[620px]"
        initial={prefersReduced ? false : { x: "100%" }}
        animate={prefersReduced ? false : { x: 0 }}
        transition={prefersReduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30 }}
        style={{ willChange: "transform" }}
      >
        {/* Purple gradient header */}
        <div className="bg-gradient-to-r from-updraft-deep to-updraft-bar px-6 py-4 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <span className="inline-flex items-center rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold font-mono text-white">
                  {action.reference}
                </span>
                {action.priority && (
                  <span className={cn(
                    "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold",
                    action.priority === "P1" ? "bg-red-400/80 text-white" :
                    action.priority === "P2" ? "bg-amber-400/80 text-white" :
                    "bg-white/20 text-white"
                  )}>
                    {action.priority}
                  </span>
                )}
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-white/20 text-white"
                )}>
                  <StatusIcon size={10} />
                  {STATUS_CONFIG[action.status].label}
                </span>
                {action.approvalStatus === "PENDING_APPROVAL" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/80 text-white px-2 py-0.5 text-[10px] font-semibold">
                    <Clock size={10} /> Awaiting Approval
                  </span>
                )}
                {action.changes && action.changes.filter((c) => c.status === "PENDING").length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/80 text-white px-2 py-0.5 text-[10px] font-semibold">
                    <GitBranch size={10} />
                    {action.changes.filter((c) => c.status === "PENDING").length} pending
                  </span>
                )}
              </div>
              {/* Title */}
              <h2 className="font-poppins text-lg font-semibold text-white leading-tight">
                {action.title}
              </h2>
              {/* Due date */}
              {action.dueDate && (
                <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                  <Calendar size={11} />
                  Due {formatDateShort(action.dueDate)}
                  {days !== null && isActive && days > 0 && (
                    <span className="text-white/50 ml-1">({days}d remaining)</span>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Issue to be Addressed */}
          <div className="rounded-lg bg-updraft-pale-purple/15 border border-updraft-pale-purple/30 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-updraft-bar shrink-0" />
                <span className="text-xs font-semibold text-updraft-bar uppercase tracking-wider">Issue to be Addressed</span>
              </div>
              {isCCRO && !editingIssue && (
                <button
                  type="button"
                  onClick={() => { setEditingIssue(true); setIssueEditorValue(action.issueDescription || ""); }}
                  className="text-[10px] font-medium text-updraft-bright-purple hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Risk link */}
            {action.linkedMitigation && (() => {
              const linkedRisk = risks.find((r) => r.id === action.linkedMitigation!.riskId);
              const riskLabel = linkedRisk
                ? `${linkedRisk.reference}: ${linkedRisk.name}`
                : action.linkedMitigation.riskId;
              return (
                <Link
                  href={`/risk-register?risk=${action.linkedMitigation.riskId}`}
                  className="mb-2 text-sm text-updraft-bright-purple hover:underline inline-flex items-center gap-1"
                >
                  <ShieldAlert size={13} />
                  {riskLabel}
                  <ArrowUpRight size={11} />
                </Link>
              );
            })()}

            {editingIssue ? (
              <div className="space-y-2">
                <RichTextEditor
                  value={issueEditorValue}
                  onChange={setIssueEditorValue}
                  placeholder="Describe the issue this action addresses..."
                  minHeight="80px"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingIssue(false)}
                    disabled={savingIssue}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveIssueDescription(issueEditorValue)}
                    disabled={savingIssue}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-3 py-1 text-xs font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingIssue && <Loader2 size={12} className="animate-spin" />}
                    {savingIssue ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : action.issueDescription ? (
              <RichTextEditor value={action.issueDescription} readOnly />
            ) : !action.linkedMitigation ? (
              <p className="text-sm text-gray-400 italic">No issue description provided</p>
            ) : null}
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Current Owner</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {owner ? (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-updraft-bar text-white text-[9px] font-bold shrink-0">
                    {owner.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </span>
                ) : <User size={13} className="text-gray-400" />}
                {owner ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/actions?owner=${action.assignedTo}`)}
                    className="text-sm font-medium text-updraft-bright-purple hover:underline transition-colors"
                  >
                    {owner.name}
                  </button>
                ) : (
                  <p className="text-sm font-medium text-gray-800">Unassigned</p>
                )}
              </div>
              {originalOwnerUser && originalOwnerUser.id !== action.assignedTo && (
                <p className="text-[10px] text-gray-400 mt-0.5">Originally: {originalOwnerUser.name}</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Due Date</span>
              <p className={cn("text-sm font-medium mt-0.5", dueDateColor(action))}>
                {action.dueDate ? formatDateShort(action.dueDate) : "No date"}
                {days !== null && days > 0 && isActive && (
                  <span className="text-gray-400 font-normal ml-1">({days}d)</span>
                )}
              </p>
              {originalDueDateVal && originalDueDateVal !== action.dueDate && (
                <p className="text-[10px] text-gray-400 mt-0.5">Originally: {formatDateShort(originalDueDateVal)}</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Created</span>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{formatDateShort(action.createdAt)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                by{" "}
                {creator ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/actions?owner=${creator.id}`)}
                    className="text-updraft-bright-purple hover:underline transition-colors"
                  >
                    {creator.name}
                  </button>
                ) : "Unknown"}
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Delay Summary</span>
              {totalDelay > 0 ? (
                <>
                  <p className="text-sm font-medium text-red-600 mt-0.5">{totalDelay} days delayed</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{dateChangeCount} date {dateChangeCount === 1 ? "change" : "changes"}</p>
                </>
              ) : dateChangeCount > 0 ? (
                <p className="text-sm font-medium text-gray-600 mt-0.5">{dateChangeCount} date {dateChangeCount === 1 ? "change" : "changes"}</p>
              ) : (
                <p className="text-sm text-gray-400 mt-0.5">On track</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-100">
            {isCCRO && (
              <>
                <button
                  onClick={() => onEdit(action)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Edit
                </button>
                {isActive && (
                  <button
                    onClick={handleMarkComplete}
                    disabled={savingComplete}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingComplete && <Loader2 size={12} className="animate-spin" />}
                    {savingComplete ? "Saving…" : "Mark Complete"}
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
            {isActive && (isMyAction || isCCRO) && (
              <>
                <button
                  onClick={() => setShowUpdateForm((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    showUpdateForm
                      ? "border-updraft-bright-purple bg-updraft-pale-purple/30 text-updraft-deep"
                      : "border-updraft-light-purple bg-updraft-pale-purple/20 text-updraft-deep hover:bg-updraft-pale-purple/40"
                  )}
                >
                  <MessageSquare size={12} /> Add Update
                </button>
                {!isCCRO && (
                  <>
                    <button
                      onClick={() => { setShowDateProposal((v) => !v); setShowReassignProposal(false); }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        showDateProposal
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-amber-200 text-amber-700 hover:bg-amber-50"
                      )}
                    >
                      <CalendarClock size={12} /> Request Date Change
                    </button>
                    <button
                      onClick={() => { setShowReassignProposal((v) => !v); setShowDateProposal(false); }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        showReassignProposal
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-blue-200 text-blue-700 hover:bg-blue-50"
                      )}
                    >
                      <UserRoundPen size={12} /> Request Reassignment
                    </button>
                    <button
                      onClick={() => handleProposeChange(action.id, "status", action.status, "PROPOSED_CLOSED")}
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
          <div className="space-y-3">
            {/* Progress Update Form */}
            {showUpdateForm && (
              <ActionUpdateForm
                actionId={action.id}
                onSubmit={handleSubmitUpdate}
                onCancel={() => setShowUpdateForm(false)}
              />
            )}

            {/* Date Change Proposal Form */}
            {showDateProposal && (
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
                      {action.dueDate ? formatDateShort(action.dueDate) : "Not set"}
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
                  <AutoResizeTextarea
                    value={proposalReason}
                    onChange={(e) => setProposalReason(e.target.value)}
                    placeholder="Explain why the due date needs to change..."
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => { setShowDateProposal(false); setProposedDate(""); setProposalReason(""); }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProposeDateChange}
                    disabled={!proposedDate || !proposalReason.trim()}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit for Approval
                  </button>
                </div>
              </div>
            )}

            {/* Reassignment Proposal Form */}
            {showReassignProposal && (
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
                      {users.filter((u) => u.isActive && u.id !== action.assignedTo).map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Reassignment</label>
                  <AutoResizeTextarea
                    value={proposalReason}
                    onChange={(e) => setProposalReason(e.target.value)}
                    placeholder="Explain why this action should be reassigned..."
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => { setShowReassignProposal(false); setProposedOwner(""); setProposalReason(""); }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProposeReassign}
                    disabled={!proposedOwner || !proposalReason.trim()}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit for Approval
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className={cn(
            "rounded-lg border p-4",
            isCCRO ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50"
          )}>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
            {action.description ? (
              <div className={cn(!isCCRO && "opacity-50")}>
                <RichTextEditor value={action.description} readOnly />
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No description provided.</p>
            )}
            {!isCCRO && (
              <p className="text-[10px] text-gray-400 mt-2 italic">Only the CCRO team can edit the description</p>
            )}
          </div>

          {/* Approval / rejection badges */}
          {action.approvalStatus === "APPROVED" && (
            <div className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
              <CheckCircle size={14} className="text-green-600 shrink-0" />
              <span className="text-xs font-medium text-green-700">This action has been approved</span>
            </div>
          )}
          {action.approvalStatus === "REJECTED" && (
            <div className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <XCircle size={14} className="text-red-600 shrink-0" />
              <span className="text-xs font-medium text-red-700">This action has been rejected</span>
            </div>
          )}

          {/* Accountability Timeline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History size={14} className="text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700">Accountability Timeline</h4>
              {(action.changes || []).length > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  {(action.changes || []).length}
                </span>
              )}
            </div>
            <ActionAccountabilityTimeline
              action={action}
              isCCRO={isCCRO}
              users={users}
              onApprove={(changeId, note) => handleApproveChange(changeId, note)}
              onReject={(changeId, note) => handleRejectChange(changeId, note)}
            />
          </div>

        </div>
      </motion.div>
    </>
  );
}
