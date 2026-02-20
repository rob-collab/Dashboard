"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Lock, Clock, CheckCircle, X, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  permission: string;
  label?: string;
  className?: string;
  /** Optional entity scoping — when provided, the request is tied to one specific record */
  entityType?: string;
  entityId?: string;
  entityName?: string;
}

const DURATION_OPTIONS = [
  { hours: 4, label: "4 hours" },
  { hours: 8, label: "8 hours" },
  { hours: 24, label: "24 hours" },
  { hours: 48, label: "48 hours" },
  { hours: 168, label: "1 week" },
];

/**
 * Button that lets non-editing users request temporary elevated permissions.
 * When entityType/entityId/entityName are supplied the request is scoped to a
 * single record; otherwise it covers the whole permission level.
 */
export default function RequestEditAccessButton({
  permission,
  label = "Request Edit Access",
  className,
  entityType,
  entityId,
  entityName,
}: Props) {
  const currentUser = useAppStore((s) => s.currentUser);
  const accessRequests = useAppStore((s) => s.accessRequests);
  const addAccessRequest = useAppStore((s) => s.addAccessRequest);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [durationHours, setDurationHours] = useState(8);
  const [submitting, setSubmitting] = useState(false);

  if (!currentUser) return null;

  const isEntityScoped = Boolean(entityType && entityId);

  // Check if there's already a pending request (match on permission + optional entityId)
  const pendingRequest = accessRequests.find(
    (r) =>
      r.requesterId === currentUser.id &&
      r.permission === permission &&
      r.status === "PENDING" &&
      (isEntityScoped ? r.entityId === entityId : !r.entityId),
  );

  if (pendingRequest) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200", className)}>
        <Clock size={13} />
        Request Pending
      </div>
    );
  }

  // Check if there's an approved request still active
  const activeGrant = accessRequests.find(
    (r) =>
      r.requesterId === currentUser.id &&
      r.permission === permission &&
      r.status === "APPROVED" &&
      r.grantedUntil &&
      new Date(r.grantedUntil) > new Date() &&
      (isEntityScoped ? r.entityId === entityId : !r.entityId),
  );

  if (activeGrant) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 border border-green-200", className)}>
        <CheckCircle size={13} />
        Access Granted until {new Date(activeGrant.grantedUntil!).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </div>
    );
  }

  async function handleSubmit() {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your request");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permission,
          reason: reason.trim(),
          durationHours,
          ...(isEntityScoped && { entityType, entityId, entityName }),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(data.error || "Request failed");
      }
      const created = await res.json();
      addAccessRequest(created);
      toast.success("Access request submitted");
      setDialogOpen(false);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-updraft-bright-purple/30 bg-updraft-pale-purple/20 px-3 py-1.5 text-xs font-medium text-updraft-bright-purple hover:bg-updraft-pale-purple/40 transition-colors",
          className,
        )}
      >
        <Lock size={13} />
        {label}
      </button>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDialogOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-updraft-deep font-poppins">Request Edit Access</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={16} />
              </button>
            </div>

            {/* Entity scope badge */}
            {isEntityScoped && entityName && (
              <div className="flex items-center gap-2 rounded-lg bg-updraft-pale-purple/30 px-3 py-2.5 border border-updraft-bright-purple/20">
                <FileText size={14} className="text-updraft-bright-purple shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-updraft-bright-purple uppercase tracking-wider">{entityType}</p>
                  <p className="text-sm font-medium text-updraft-deep truncate">{entityName}</p>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600">
              {isEntityScoped
                ? "Request temporary edit access to this specific record. A CCRO team member will review your request."
                : <>Request temporary <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{permission}</span> permission. A CCRO team member will review your request.</>
              }
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-updraft-bright-purple/30 focus:border-updraft-bright-purple"
                placeholder="Explain why you need edit access..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    onClick={() => setDurationHours(opt.hours)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
                      durationHours === opt.hours
                        ? "bg-updraft-bright-purple text-white border-updraft-bright-purple"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !reason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-updraft-bright-purple rounded-lg hover:bg-updraft-deep transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
