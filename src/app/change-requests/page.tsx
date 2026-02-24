"use client";

import { useState, useEffect, useMemo } from "react";
import { api, friendlyApiError } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  X,
  ChevronDown,
  ShieldAlert,
  FlaskConical,
  ListChecks,
  Loader2,
  MessageSquare,
  KeyRound,
  Check,
  FileText,
  Clock,
  ArrowLeftRight,
} from "lucide-react";
import EntityLink from "@/components/common/EntityLink";
import { toast } from "sonner";
import { usePageTitle } from "@/lib/usePageTitle";
import type { PendingChange } from "@/app/api/change-requests/route";
import type { AccessRequest } from "@/lib/types";
import { ACCESS_REQUEST_STATUS_LABELS, ACCESS_REQUEST_STATUS_COLOURS } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  action: "Action",
  control: "Control",
  risk: "Risk",
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
  action: "bg-blue-100 text-blue-700",
  control: "bg-green-100 text-green-700",
  risk: "bg-red-100 text-red-700",
};

const ENTITY_TYPE_ICONS: Record<string, React.ReactNode> = {
  action: <ListChecks size={12} />,
  control: <FlaskConical size={12} />,
  risk: <ShieldAlert size={12} />,
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const FIELD_LABELS: Record<string, string> = {
  controlName: "Control Name",
  controlDescription: "Control Description",
  controlOwnerId: "Control Owner",
  consumerDutyOutcome: "Consumer Duty Outcome",
  controlFrequency: "Frequency",
  controlType: "Control Type",
  internalOrThirdParty: "Internal / Third Party",
  standingComments: "Standing Comments",
  businessAreaId: "Business Area",
  status: "Status",
  dueDate: "Due Date",
  assignedTo: "Assigned To",
  residualLikelihood: "Residual Likelihood",
  residualImpact: "Residual Impact",
  inherentLikelihood: "Inherent Likelihood",
  inherentImpact: "Inherent Impact",
  name: "Name",
  description: "Description",
};

type StatusFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";
type EntityFilter = "all" | "action" | "control" | "risk";
type ActiveView = "changes" | "access_requests";

export default function ChangeRequestsPage() {
  usePageTitle("Change Requests");
  const currentUser = useAppStore((s) => s.currentUser);
  const isCCROTeam = currentUser?.role === "CCRO_TEAM";

  // ── Field changes state ──────────────────────────────────────────────────
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<Record<string, { open: boolean; note: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // ── Access requests state (from store) ───────────────────────────────────
  const accessRequests = useAppStore((s) => s.accessRequests);
  const updateAccessRequest = useAppStore((s) => s.updateAccessRequest);

  // ── View toggle ──────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<ActiveView>("changes");

  function loadChanges() {
    setLoading(true);
    api<PendingChange[]>(`/api/change-requests?status=${statusFilter}`)
      .then(setChanges)
      .catch((e) => {
        console.error("[ChangeRequestsPage]", e);
        toast.error("Failed to load change requests");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadChanges(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = changes;
    if (entityFilter !== "all") list = list.filter((c) => c.entityType === entityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.entityName.toLowerCase().includes(q) ||
          c.entityRef.toLowerCase().includes(q) ||
          c.fieldChanged.toLowerCase().includes(q) ||
          c.proposerName.toLowerCase().includes(q) ||
          (c.oldValue ?? "").toLowerCase().includes(q) ||
          (c.newValue ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [changes, entityFilter, search]);

  const pendingCounts = useMemo(() => ({
    total: changes.length,
    action: changes.filter((c) => c.entityType === "action").length,
    control: changes.filter((c) => c.entityType === "control").length,
    risk: changes.filter((c) => c.entityType === "risk").length,
  }), [changes]);

  const pendingAccessRequests = useMemo(
    () => accessRequests.filter((r) => r.status === "PENDING"),
    [accessRequests]
  );

  function getApiPath(c: PendingChange): string {
    if (c.entityType === "action") return `/api/actions/${c.entityId}/changes/${c.changeId}`;
    if (c.entityType === "control") return `/api/controls/library/${c.entityId}/changes/${c.changeId}`;
    return `/api/risks/${c.entityId}/changes/${c.changeId}`;
  }

  async function handleReview(change: PendingChange, decision: "APPROVED" | "REJECTED") {
    const note = reviewing[change.id]?.note ?? "";
    setSubmitting(change.id);
    try {
      await api(getApiPath(change), {
        method: "PATCH",
        body: { status: decision, reviewNote: note || null },
      });
      toast.success(`Change ${decision === "APPROVED" ? "approved" : "rejected"} successfully`);
      setChanges((prev) => prev.filter((c) => c.id !== change.id));
      setReviewing((prev) => { const next = { ...prev }; delete next[change.id]; return next; });
    } catch (err) {
      const { message } = friendlyApiError(err);
      toast.error(message);
    } finally {
      setSubmitting(null);
    }
  }

  function toggleReviewPanel(id: string) {
    setReviewing((prev) => ({
      ...prev,
      [id]: { open: !prev[id]?.open, note: prev[id]?.note ?? "" },
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Change Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isCCROTeam
            ? "Review and approve proposed changes to actions, controls, risks, and access requests."
            : "Track the status of change proposals and access requests you have submitted."}
        </p>
      </div>

      {/* View toggle tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveView("changes")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2",
            activeView === "changes"
              ? "border-updraft-bright-purple text-updraft-deep"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <ArrowLeftRight size={14} />
          Field Changes
          {statusFilter === "PENDING" && pendingCounts.total > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {pendingCounts.total}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveView("access_requests")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2",
            activeView === "access_requests"
              ? "border-updraft-bright-purple text-updraft-deep"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <KeyRound size={14} />
          Access Requests
          {pendingAccessRequests.length > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {pendingAccessRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* ── FIELD CHANGES VIEW ── */}
      {activeView === "changes" && (
        <>
          {/* Status filter row */}
          <div className="flex flex-wrap items-center gap-3">
            {(["PENDING", "APPROVED", "REJECTED", "ALL"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  statusFilter === s
                    ? "border-updraft-bright-purple bg-updraft-pale-purple/20 text-updraft-deep"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} change{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Entity filter + search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search changes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 pl-8 pr-8 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-gray-400 shrink-0" />
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(["all", "action", "control", "risk"] as EntityFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setEntityFilter(f)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-200 flex items-center gap-1",
                      entityFilter === f
                        ? "bg-updraft-bright-purple text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {f !== "all" && ENTITY_TYPE_ICONS[f]}
                    {f === "all" ? "All" : ENTITY_TYPE_LABELS[f]}
                    {f !== "all" && statusFilter === "PENDING" && pendingCounts[f] > 0 && (
                      <span className={cn("rounded-full px-1.5 py-px text-[10px] font-bold", entityFilter === f ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700")}>
                        {pendingCounts[f]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bento-card py-16 text-center">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-600">
                {statusFilter === "PENDING" ? "No pending changes — all caught up!" : "No changes found."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((change) => (
                <ChangeCard
                  key={change.id}
                  change={change}
                  isCCROTeam={isCCROTeam}
                  reviewState={reviewing[change.id]}
                  submitting={submitting === change.id}
                  onToggleReview={() => toggleReviewPanel(change.id)}
                  onNoteChange={(note) => setReviewing((prev) => ({ ...prev, [change.id]: { ...prev[change.id], open: true, note } }))}
                  onApprove={() => handleReview(change, "APPROVED")}
                  onReject={() => handleReview(change, "REJECTED")}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ACCESS REQUESTS VIEW ── */}
      {activeView === "access_requests" && (
        <AccessRequestsView
          requests={accessRequests}
          isCCROTeam={isCCROTeam}
          onUpdate={updateAccessRequest}
        />
      )}
    </div>
  );
}

// ── Access Requests View ─────────────────────────────────────────────────────

function AccessRequestsView({
  requests,
  isCCROTeam,
  onUpdate,
}: {
  requests: AccessRequest[];
  isCCROTeam: boolean;
  onUpdate: (id: string, data: Partial<AccessRequest>) => void;
}) {
  const pending = requests.filter((r) => r.status === "PENDING");
  const resolved = requests.filter((r) => r.status !== "PENDING");

  if (requests.length === 0) {
    return (
      <div className="bento-card py-16 text-center">
        <KeyRound size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">No access requests yet.</p>
        {!isCCROTeam && (
          <p className="text-xs text-gray-400 mt-1">
            Use the &ldquo;Request Edit Access&rdquo; button on any record to submit a request.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <Clock size={14} className="text-amber-500" />
            Pending Requests ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((req) => (
              <AccessRequestCard
                key={req.id}
                request={req}
                isCCROTeam={isCCROTeam}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </section>
      )}

      {/* Resolved history */}
      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-gray-400" />
            Request History ({resolved.length})
          </h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2.5 font-medium text-gray-600 text-xs">Requester</th>
                  <th className="px-3 py-2.5 font-medium text-gray-600 text-xs">Permission / Record</th>
                  <th className="px-3 py-2.5 font-medium text-gray-600 text-xs">Duration</th>
                  <th className="px-3 py-2.5 font-medium text-gray-600 text-xs">Status</th>
                  <th className="px-3 py-2.5 font-medium text-gray-600 text-xs">Reviewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resolved.slice(0, 50).map((req) => {
                  const colours = ACCESS_REQUEST_STATUS_COLOURS[req.status];
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700 text-xs">{req.requester?.name ?? "Unknown"}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{req.permission}</span>
                        {req.entityName && (
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[180px]">{req.entityName}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{req.durationHours}h</td>
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
        </section>
      )}
    </div>
  );
}

// ── Access Request Card ───────────────────────────────────────────────────────

function AccessRequestCard({
  request,
  isCCROTeam,
  onUpdate,
}: {
  request: AccessRequest;
  isCCROTeam: boolean;
  onUpdate: (id: string, data: Partial<AccessRequest>) => void;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showNote, setShowNote] = useState(false);

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
    <div className="bento-card border border-amber-200/60 bg-amber-50/30">
      <div className="flex items-start justify-between gap-4">
        {/* Left: requester + permission */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-gray-800">{request.requester?.name ?? "Unknown User"}</span>
            <span className="text-xs text-gray-400">{request.requester?.email}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-2">
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{request.permission}</span>
            <span>·</span>
            <span>{request.durationHours} hours access</span>
          </div>

          {/* Entity scope */}
          {request.entityName && (
            <div className="flex items-center gap-2 rounded-lg bg-white border border-amber-200 px-3 py-2 mb-2 w-fit">
              <FileText size={12} className="text-amber-600 shrink-0" />
              <div className="min-w-0">
                {request.entityType && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">{request.entityType}</p>
                )}
                <p className="text-xs font-medium text-gray-800 truncate">{request.entityName}</p>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Reason</p>
            <p className="text-sm text-gray-700">{request.reason}</p>
          </div>

          <p className="text-[10px] text-gray-400 mt-2">Requested {formatDate(request.createdAt)}</p>
        </div>

        {/* Right: CCRO actions */}
        {isCCROTeam && (
          <div className="shrink-0 flex items-center gap-2 mt-0.5">
            <button
              type="button"
              onClick={() => setShowNote(!showNote)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                showNote
                  ? "border-updraft-bright-purple/40 bg-updraft-pale-purple/10 text-updraft-deep"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              <MessageSquare size={12} />
              Note
              <ChevronDown size={11} className={cn("transition-transform", showNote && "rotate-180")} />
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => handleAction("approve")}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {processing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Approve
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => handleAction("deny")}
              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {processing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              Deny
            </button>
          </div>
        )}
      </div>

      {/* Note panel (CCRO only) */}
      {isCCROTeam && showNote && (
        <div className="mt-3 pt-3 border-t border-amber-200/60">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Review note <span className="text-gray-400 font-normal">(optional — shown to requester)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="e.g. Approved for Q1 review cycle…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
            />
            <button
              type="button"
              disabled={processing}
              onClick={() => handleAction("approve")}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Check size={12} /> Approve
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => handleAction("deny")}
              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <XCircle size={12} /> Deny
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Field Change Card ─────────────────────────────────────────────────────────

interface ChangeCardProps {
  change: PendingChange;
  isCCROTeam: boolean;
  reviewState?: { open: boolean; note: string };
  submitting: boolean;
  onToggleReview: () => void;
  onNoteChange: (note: string) => void;
  onApprove: () => void;
  onReject: () => void;
}

function ChangeCard({ change, isCCROTeam, reviewState, submitting, onToggleReview, onNoteChange, onApprove, onReject }: ChangeCardProps) {
  const dateStr = new Date(change.proposedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const fieldLabel = FIELD_LABELS[change.fieldChanged] ?? change.fieldChanged;
  const reviewOpen = reviewState?.open ?? false;

  return (
    <div className={cn(
      "bento-card border",
      change.status === "PENDING" ? "border-amber-200/60" :
      change.status === "APPROVED" ? "border-green-200/60" :
      "border-red-200/60"
    )}>
      <div className="flex items-start gap-4">
        {/* Entity badge */}
        <div className="shrink-0 mt-0.5">
          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", ENTITY_TYPE_COLORS[change.entityType])}>
            {ENTITY_TYPE_ICONS[change.entityType]}
            {ENTITY_TYPE_LABELS[change.entityType]}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Entity name */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {change.entityRef ? (
              <EntityLink
                type={change.entityType as "action" | "control" | "risk"}
                id={change.entityId}
                reference={change.entityRef}
                label={change.entityName}
              />
            ) : (
              <span className="text-sm font-semibold text-gray-800 truncate">{change.entityName}</span>
            )}
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLORS[change.status])}>
              {change.status}
            </span>
          </div>

          {/* Field change */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="font-medium text-gray-700">{fieldLabel}</span>
            <span className="text-gray-400">changed</span>
            {change.oldValue != null && (
              <>
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 line-through">{change.oldValue}</span>
                <span className="text-gray-400">→</span>
              </>
            )}
            {change.newValue != null && (
              <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700 font-medium">{change.newValue}</span>
            )}
          </div>

          {/* Rationale */}
          {change.rationale && (
            <p className="mt-1 text-xs text-gray-500 italic">&ldquo;{change.rationale}&rdquo;</p>
          )}

          {/* Meta */}
          <div className="mt-1.5 text-[11px] text-gray-400 flex items-center gap-2 flex-wrap">
            <span>Proposed by <span className="font-medium text-gray-600">{change.proposerName}</span> on {dateStr}</span>
            {change.reviewerName && (
              <>
                <span>·</span>
                <span>Reviewed by <span className="font-medium text-gray-600">{change.reviewerName}</span></span>
              </>
            )}
            {change.reviewNote && (
              <>
                <span>·</span>
                <span className="italic">&ldquo;{change.reviewNote}&rdquo;</span>
              </>
            )}
          </div>
        </div>

        {/* Actions (CCRO only, only for PENDING) */}
        {isCCROTeam && change.status === "PENDING" && (
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleReview}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                reviewOpen
                  ? "border-updraft-bright-purple/40 bg-updraft-pale-purple/10 text-updraft-deep"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              <MessageSquare size={12} />
              Note
              <ChevronDown size={11} className={cn("transition-transform", reviewOpen && "rotate-180")} />
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onApprove}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Approve
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onReject}
              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              Reject
            </button>
          </div>
        )}

        {/* Status icon for non-pending */}
        {change.status !== "PENDING" && (
          <div className="shrink-0">
            {change.status === "APPROVED"
              ? <CheckCircle2 size={20} className="text-green-500" />
              : <XCircle size={20} className="text-red-400" />
            }
          </div>
        )}
      </div>

      {/* Review note panel */}
      {isCCROTeam && change.status === "PENDING" && reviewOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Review note <span className="text-gray-400 font-normal">(optional — shown to proposer)</span>
          </label>
          <div className="flex gap-2">
            <textarea
              value={reviewState?.note ?? ""}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="e.g. Approved as this aligns with the Q2 risk appetite review…"
              rows={2}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 resize-none"
            />
            <div className="flex flex-col gap-2 shrink-0">
              <button
                type="button"
                disabled={submitting}
                onClick={onApprove}
                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 size={12} /> Approve
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={onReject}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <XCircle size={12} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
