"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import type { AccessRequest } from "@/lib/types";
import { ACCESS_REQUEST_STATUS_LABELS, ACCESS_REQUEST_STATUS_COLOURS } from "@/lib/types";
import { Check, X, Clock, Shield, FileText } from "lucide-react";
import { toast } from "sonner";

/**
 * CCRO review panel for access requests. Shows pending requests for review
 * and a history of resolved requests.
 */
export default function AccessRequestsPanel() {
  const accessRequests = useAppStore((s) => s.accessRequests);
  const updateAccessRequest = useAppStore((s) => s.updateAccessRequest);

  const pending = accessRequests.filter((r) => r.status === "PENDING");
  const resolved = accessRequests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <section>
        <h3 className="text-sm font-semibold text-updraft-deep font-poppins flex items-center gap-2 mb-3">
          <Clock size={16} className="text-amber-500" />
          Pending Requests ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No pending access requests</p>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => (
              <PendingRequestCard key={req.id} request={req} onUpdate={updateAccessRequest} />
            ))}
          </div>
        )}
      </section>

      {/* Resolved History */}
      <section>
        <h3 className="text-sm font-semibold text-updraft-deep font-poppins flex items-center gap-2 mb-3">
          <Shield size={16} className="text-gray-400" />
          Request History ({resolved.length})
        </h3>
        {resolved.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No previous requests</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-600">Requester</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Permission</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Duration</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Reviewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resolved.slice(0, 50).map((req) => {
                  const colours = ACCESS_REQUEST_STATUS_COLOURS[req.status];
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{req.requester?.name ?? "Unknown"}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{req.permission}</span>
                        {req.entityName && (
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[160px]">{req.entityName}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{req.durationHours}h</td>
                      <td className="px-3 py-2">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold", colours.bg, colours.text)}>
                          {ACCESS_REQUEST_STATUS_LABELS[req.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {req.reviewedAt ? formatDate(req.reviewedAt) : "—"}
                        {req.reviewedBy && ` by ${req.reviewedBy.name}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PendingRequestCard({
  request,
  onUpdate,
}: {
  request: AccessRequest;
  onUpdate: (id: string, data: Partial<AccessRequest>) => void;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleAction(action: "approve" | "deny") {
    setProcessing(true);
    try {
      const res = await fetch(`/api/access-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote: reviewNote.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(data.error || "Request failed");
      }
      const updated = await res.json();
      onUpdate(request.id, updated);
      toast.success(`Request ${action === "approve" ? "approved" : "denied"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process request");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{request.requester?.name ?? "Unknown User"}</p>
          <p className="text-xs text-gray-500">{request.requester?.email}</p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-gray-200">{request.permission}</span>
          <p className="text-xs text-gray-500 mt-1">{request.durationHours} hours</p>
        </div>
      </div>

      {/* Entity scope — shows when request is for a single record */}
      {request.entityName && (
        <div className="flex items-center gap-2 rounded-lg bg-white border border-amber-200 px-3 py-2">
          <FileText size={13} className="text-amber-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">{request.entityType ?? "Record"}</p>
            <p className="text-xs font-medium text-gray-800 truncate">{request.entityName}</p>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-500 mb-0.5">Reason</p>
        <p className="text-sm text-gray-700">{request.reason}</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Review Note (optional)</label>
        <input
          type="text"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5"
          placeholder="Add a note..."
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleAction("approve")}
          disabled={processing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Check size={13} />
          Approve
        </button>
        <button
          onClick={() => handleAction("deny")}
          disabled={processing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <X size={13} />
          Deny
        </button>
      </div>

      <p className="text-[10px] text-gray-400">Requested {formatDate(request.createdAt)}</p>
    </div>
  );
}
