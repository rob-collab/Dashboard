"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  ListChecks,
  ShieldAlert,
  FlaskConical,
  ExternalLink,
  Loader2,
  XCircle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { api, friendlyApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { ActionChange, ControlChange, RiskChange } from "@/lib/types";

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
export type PendingItem = (ActionChange | ControlChange | RiskChange) & {
  _type: "action" | "control" | "risk";
  _parentTitle: string;
  _parentId: string;
  _parentRef: string;
};

export default function PendingChangesPanel({
  changes,
  users,
  updateAction,
  updateControl,
  updateRisk,
}: {
  changes: PendingItem[];
  users: { id: string; name: string }[];
  updateAction: (id: string, data: Record<string, unknown>) => void;
  updateControl: (id: string, data: Record<string, unknown>) => void;
  updateRisk: (id: string, data: Record<string, unknown>) => void;
}) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [collapsedDiffs, setCollapsedDiffs] = useState<Set<string>>(
    () => new Set(changes.map((c) => c.id))
  );
  function toggleDiff(id: string) {
    setCollapsedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const handleReview = useCallback(async (
    change: PendingItem,
    decision: "APPROVED" | "REJECTED"
  ) => {
    setReviewingId(change.id);
    setReviewErrors((prev) => { const next = { ...prev }; delete next[change.id]; return next; });
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
      } else if (change._type === "control") {
        const cc = change as ControlChange & { _parentId: string };
        await api(`/api/controls/library/${cc._parentId}/changes/${change.id}`, {
          method: "PATCH",
          body: { status: decision, reviewNote: note },
        });
        const updatedChanges = await api<ControlChange[]>(`/api/controls/library/${cc._parentId}/changes`);
        updateControl(cc._parentId, { changes: updatedChanges });
      } else {
        const rc = change as RiskChange & { _parentId: string };
        await api(`/api/risks/${rc._parentId}/changes/${change.id}`, {
          method: "PATCH",
          body: { status: decision, reviewNote: note },
        });
        const updatedChanges = await api<RiskChange[]>(`/api/risks/${rc._parentId}/changes`);
        updateRisk(rc._parentId, { changes: updatedChanges });
      }
      setProcessedIds((prev) => { const next = new Set(prev); next.add(change.id); return next; });
      toast.success(decision === "APPROVED" ? "Change approved" : "Change rejected");
    } catch (err) {
      const { message, description } = friendlyApiError(err);
      setReviewErrors((prev) => ({ ...prev, [change.id]: `${message}${description ? ` — ${description}` : ""}` }));
      toast.error(message, { description });
    } finally {
      setReviewingId(null);
    }
  }, [reviewNotes, updateAction, updateControl, updateRisk]);

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
          const isControl = c._type === "control";
          const isRisk = c._type === "risk";
          const ac = isAction ? (c as ActionChange & PendingItem) : null;
          const cc = isControl ? (c as ControlChange & PendingItem) : null;
          const isProcessing = reviewingId === c.id;
          const originHref = isAction ? `/actions?edit=${c._parentId}` : isControl ? `/controls?control=${c._parentId}` : `/risk-register?risk=${c._parentId}`;

          return (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Header */}
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-50/80">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isAction ? "bg-blue-100" : isRisk ? "bg-red-100" : "bg-purple-100"}`}>
                  {isAction ? <ListChecks className="h-4 w-4 text-blue-600" /> : isRisk ? <ShieldAlert className="h-4 w-4 text-red-600" /> : <FlaskConical className="h-4 w-4 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isAction ? "bg-blue-50 text-blue-700" : isRisk ? "bg-red-50 text-red-700" : "bg-purple-50 text-purple-700"}`}>
                      {isAction ? "Action" : isRisk ? "Risk" : "Control"}
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

              {/* Change Details — lead with who/when/why */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{proposerName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(c.proposedAt)}</p>
                    {cc?.rationale && (
                      <p className="text-xs text-gray-600 mt-1 italic">&ldquo;{cc.rationale}&rdquo;</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleDiff(c.id)}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-updraft-bright-purple hover:text-updraft-deep transition-colors"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsedDiffs.has(c.id) ? "" : "rotate-180"}`} />
                    {collapsedDiffs.has(c.id) ? "Show changes" : "Hide changes"}
                  </button>
                </div>

                {!collapsedDiffs.has(c.id) && (ac?.isUpdate ? (
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
                  </div>
                ))}

                {/* Review note input + action buttons */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  {reviewErrors[c.id] && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Failed to process change: {reviewErrors[c.id]}</span>
                    </div>
                  )}
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
