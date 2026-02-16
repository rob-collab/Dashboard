"use client";

import { useState } from "react";
import { Check, X, Clock, MessageSquare } from "lucide-react";
import type { ActionChange, ChangeStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

interface ActionChangePanelProps {
  changes: ActionChange[];
  isCCRO: boolean;
  onApprove: (changeId: string, note: string) => void;
  onReject: (changeId: string, note: string) => void;
}

const STATUS_CONFIG: Record<ChangeStatus, { label: string; color: string; icon: typeof Check }> = {
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700", icon: Check },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700", icon: X },
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  status: "Status",
  assignedTo: "Owner",
  dueDate: "Due Date",
  sectionTitle: "Section",
};

export default function ActionChangePanel({
  changes,
  isCCRO,
  onApprove,
  onReject,
}: ActionChangePanelProps) {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  if (changes.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-400">
        No change history yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {changes.map((change) => {
        const config = STATUS_CONFIG[change.status];
        const Icon = config.icon;

        return (
          <div
            key={change.id}
            className={cn(
              "rounded-lg border p-3",
              change.status === "PENDING" ? "border-amber-200 bg-amber-50/50" : "border-gray-200 bg-white"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", config.color)}>
                    <Icon size={10} />
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {FIELD_LABELS[change.fieldChanged] || change.fieldChanged}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 line-through truncate max-w-[200px]">
                    {change.oldValue || "(empty)"}
                  </span>
                  <span className="text-gray-300">&rarr;</span>
                  <span className="text-gray-700 font-medium truncate max-w-[200px]">
                    {change.newValue || "(empty)"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                  <span>by {change.proposer?.name || "Unknown"}</span>
                  <span>&middot;</span>
                  <span>{formatDate(change.proposedAt)}</span>
                </div>
                {change.reviewNote && (
                  <div className="flex items-start gap-1 mt-1.5 text-xs text-gray-500">
                    <MessageSquare size={12} className="mt-0.5 shrink-0" />
                    <span>{change.reviewNote}</span>
                  </div>
                )}
                {change.reviewer && (
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Reviewed by {change.reviewer.name} &middot; {change.reviewedAt ? formatDate(change.reviewedAt) : ""}
                  </div>
                )}
              </div>

              {/* Approve/Reject buttons for CCRO on PENDING changes */}
              {isCCRO && change.status === "PENDING" && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={reviewNotes[change.id] || ""}
                    onChange={(e) => setReviewNotes((prev) => ({ ...prev, [change.id]: e.target.value }))}
                    className="w-36 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-updraft-light-purple"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => onApprove(change.id, reviewNotes[change.id] || "")}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-green-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-green-600 transition-colors"
                    >
                      <Check size={11} /> Approve
                    </button>
                    <button
                      onClick={() => onReject(change.id, reviewNotes[change.id] || "")}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-red-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-600 transition-colors"
                    >
                      <X size={11} /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
