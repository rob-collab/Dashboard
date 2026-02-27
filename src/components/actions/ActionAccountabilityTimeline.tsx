"use client";

import { useState } from "react";
import {
  Calendar,
  User,
  CheckCircle,
  FileText,
  Clock,
  Check,
  X,
  AlertTriangle,
  Paperclip,
  GitBranch,
} from "lucide-react";
import type { Action, ActionChange, User as UserType } from "@/lib/types";
import { cn, formatDate, formatDateShort } from "@/lib/utils";

interface ActionAccountabilityTimelineProps {
  action: Action;
  isCCRO: boolean;
  users: UserType[];
  onApprove: (changeId: string, note: string) => void;
  onReject: (changeId: string, note: string) => void;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  status: "Status",
  assignedTo: "Owner",
  dueDate: "Due Date",
  sectionTitle: "Section",
  update: "Update",
};

function getChangeIcon(change: ActionChange): typeof Calendar {
  if (change.isUpdate) return FileText;
  if (change.fieldChanged === "dueDate") return Calendar;
  if (change.fieldChanged === "assignedTo") return User;
  if (change.fieldChanged === "status") return CheckCircle;
  return GitBranch;
}

function getChangeDescription(change: ActionChange, users: UserType[]): string {
  if (change.isUpdate) return change.newValue || "(empty)";
  if (change.fieldChanged === "dueDate") {
    const oldDate = change.oldValue ? formatDateShort(change.oldValue) : "(not set)";
    const newDate = change.newValue ? formatDateShort(change.newValue) : "(not set)";
    return `Due date moved from ${oldDate} to ${newDate}`;
  }
  if (change.fieldChanged === "assignedTo") {
    const oldUser = users.find((u) => u.id === change.oldValue);
    const newUser = users.find((u) => u.id === change.newValue);
    return `Owner: ${oldUser?.name ?? change.oldValue ?? "Unassigned"} → ${newUser?.name ?? change.newValue ?? "Unassigned"}`;
  }
  const label = FIELD_LABELS[change.fieldChanged] ?? change.fieldChanged;
  return `${label}: ${change.oldValue ?? "(empty)"} → ${change.newValue ?? "(empty)"}`;
}

function wasMissedDeadline(change: ActionChange): boolean {
  if (change.fieldChanged !== "dueDate" || !change.oldValue) return false;
  return new Date(change.oldValue) < new Date(change.proposedAt);
}

export default function ActionAccountabilityTimeline({
  action,
  isCCRO,
  users,
  onApprove,
  onReject,
}: ActionAccountabilityTimelineProps) {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const changes = action.changes ?? [];
  const sorted = [...changes].sort(
    (a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime()
  );

  // Summary metrics
  const dateChanges = changes.filter((c) => c.fieldChanged === "dueDate" && !c.isUpdate);
  const ownerChanges = changes.filter((c) => c.fieldChanged === "assignedTo" && !c.isUpdate);
  const approvedDateChanges = dateChanges.filter((c) => c.status === "APPROVED");
  const originalDueDate =
    dateChanges.length > 0
      ? [...dateChanges].sort(
          (a, b) => new Date(a.proposedAt).getTime() - new Date(b.proposedAt).getTime()
        )[0].oldValue
      : action.dueDate;

  const hasDrift = approvedDateChanges.length > 0;
  const currentDays =
    action.dueDate
      ? Math.ceil((new Date(action.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
  const isOverdue =
    currentDays !== null && currentDays < 0 && action.status !== "COMPLETED";

  const creator = users.find((u) => u.id === action.createdBy);

  return (
    <div className="space-y-3">
      {/* Summary Banner */}
      <div
        className={cn(
          "rounded-lg border px-4 py-3 text-xs",
          hasDrift || isOverdue
            ? "border-amber-200 bg-amber-50/60 text-amber-800"
            : "border-gray-100 bg-gray-50/60 text-gray-600"
        )}
      >
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {originalDueDate && (
            <span>
              Originally due:{" "}
              <span className="font-medium">{formatDateShort(originalDueDate)}</span>
            </span>
          )}
          {dateChanges.length > 0 && (
            <span>
              · Due date changed{" "}
              <span className="font-medium">{dateChanges.length}×</span>
            </span>
          )}
          {isOverdue && currentDays !== null ? (
            <span>
              · <span className="font-semibold text-red-600">{Math.abs(currentDays)}d late</span>
            </span>
          ) : action.status === "COMPLETED" ? (
            <span>
              · <span className="font-semibold text-green-600">Completed</span>
            </span>
          ) : (
            <span>
              · <span className="font-medium text-green-700">On track</span>
            </span>
          )}
          {ownerChanges.length > 0 && (
            <span>
              · Owner changed{" "}
              <span className="font-medium">{ownerChanges.length}×</span>
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="text-center py-6 text-sm text-gray-400">No change history yet</div>
      )}

      {/* Timeline */}
      {sorted.length > 0 && (
        <div className="relative pl-7">
          {/* Vertical connecting line */}
          <div className="absolute left-2.5 top-2.5 bottom-8 w-px bg-gray-200" />

          <div className="space-y-4">
            {sorted.map((change) => {
              const Icon = getChangeIcon(change);
              const description = getChangeDescription(change, users);
              const missed = wasMissedDeadline(change);
              const isPending = change.status === "PENDING";
              const isApproved = change.status === "APPROVED";
              const isRejected = change.status === "REJECTED";

              return (
                <div key={change.id} className="relative">
                  {/* Node dot */}
                  <div
                    className={cn(
                      "absolute -left-7 mt-2.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-sm",
                      isPending
                        ? "bg-amber-400"
                        : isApproved
                        ? "bg-green-500"
                        : isRejected
                        ? "bg-red-400"
                        : change.isUpdate
                        ? "bg-updraft-bright-purple"
                        : "bg-gray-400"
                    )}
                  >
                    <Icon size={10} className="text-white" />
                  </div>

                  <div
                    className={cn(
                      "rounded-lg border p-3",
                      isPending
                        ? "border-amber-200 bg-amber-50/40"
                        : isRejected
                        ? "border-red-100 bg-red-50/30"
                        : "border-gray-100 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Header: type + status badge + missed warning */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="text-xs font-semibold text-gray-700">
                            {change.isUpdate
                              ? "Progress Update"
                              : FIELD_LABELS[change.fieldChanged] ?? change.fieldChanged}
                          </span>
                          {!change.isUpdate && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                isPending
                                  ? "bg-amber-100 text-amber-700"
                                  : isApproved
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              )}
                            >
                              {isPending ? (
                                <Clock size={9} />
                              ) : isApproved ? (
                                <Check size={9} />
                              ) : (
                                <X size={9} />
                              )}
                              {isPending ? "Pending" : isApproved ? "Approved" : "Rejected"}
                            </span>
                          )}
                          {missed && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                              <AlertTriangle size={9} /> Deadline missed
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {change.isUpdate ? (
                          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {change.newValue ?? "(empty)"}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-700">{description}</p>
                        )}

                        {/* Evidence attachment */}
                        {change.evidenceUrl && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Paperclip size={10} className="text-updraft-bright-purple shrink-0" />
                            <a
                              href={change.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-updraft-bright-purple hover:underline truncate"
                            >
                              {change.evidenceName ?? "Evidence attachment"}
                            </a>
                          </div>
                        )}

                        {/* Proposed by line */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-gray-400">
                          <span>
                            {change.isUpdate ? "Submitted by" : "Proposed by"}{" "}
                            <span className="font-medium text-gray-500">
                              {change.proposer?.name ?? "Unknown"}
                            </span>
                          </span>
                          <span>·</span>
                          <span>{formatDate(change.proposedAt)}</span>
                        </div>

                        {/* Reviewer line */}
                        {change.reviewer && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-gray-400">
                            <span>
                              {isApproved ? "Approved by" : "Rejected by"}{" "}
                              <span className="font-medium text-gray-500">{change.reviewer.name}</span>
                            </span>
                            {change.reviewedAt && <span>· {formatDate(change.reviewedAt)}</span>}
                          </div>
                        )}
                        {change.reviewNote && (
                          <p className="mt-1 text-[11px] text-gray-500 italic">
                            &ldquo;{change.reviewNote}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Approve / Reject buttons — CCRO + PENDING non-updates only */}
                      {isCCRO && isPending && !change.isUpdate && (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <input
                            type="text"
                            placeholder="Note (optional)"
                            value={reviewNotes[change.id] ?? ""}
                            onChange={(e) =>
                              setReviewNotes((prev) => ({ ...prev, [change.id]: e.target.value }))
                            }
                            className="w-32 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-updraft-light-purple"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => onApprove(change.id, reviewNotes[change.id] ?? "")}
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-green-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-green-600 transition-colors"
                            >
                              <Check size={10} /> Approve
                            </button>
                            <button
                              onClick={() => onReject(change.id, reviewNotes[change.id] ?? "")}
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-red-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-600 transition-colors"
                            >
                              <X size={10} /> Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Creation node */}
            <div className="relative">
              <div className="absolute -left-7 mt-2.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-updraft-bar shadow-sm">
                <FileText size={10} className="text-white" />
              </div>
              <div className="rounded-lg border border-gray-100 bg-white p-3">
                <p className="text-xs font-semibold text-gray-700">Action Created</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {creator && (
                    <>
                      by <span className="font-medium">{creator.name}</span>
                    </>
                  )}
                  {originalDueDate && (
                    <>
                      , originally due{" "}
                      <span className="font-medium">{formatDateShort(originalDueDate)}</span>
                    </>
                  )}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">{formatDate(action.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
