"use client";

import { useState } from "react";
import Link from "next/link";
import { X, ChevronDown, ChevronRight, Check, Clock, AlertTriangle, MessageCircle, Send, ArrowRight, ExternalLink } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { getRiskScore, getAppetiteMaxScore, calculateBreach, APPETITE_DISPLAY } from "@/lib/risk-categories";
import ScoreBadge from "@/components/risk-register/ScoreBadge";
import type { RiskAcceptance, RiskAcceptanceStatus, RiskAcceptanceComment as RAComment } from "@/lib/types";
import { RISK_ACCEPTANCE_STATUS_LABELS, RISK_ACCEPTANCE_STATUS_COLOURS, RISK_ACCEPTANCE_SOURCE_LABELS } from "@/lib/types";

interface Props {
  acceptance: RiskAcceptance | null;
  onClose: () => void;
  onUpdate: (updated: RiskAcceptance) => void;
}

// Workflow steps
const WORKFLOW_STEPS: { status: RiskAcceptanceStatus; label: string }[] = [
  { status: "PROPOSED", label: "Proposed" },
  { status: "CCRO_REVIEW", label: "CCRO Review" },
  { status: "AWAITING_APPROVAL", label: "Awaiting Approval" },
  { status: "APPROVED", label: "Approved" },
];

function getStepIndex(status: RiskAcceptanceStatus): number {
  if (status === "RETURNED") return 1;
  if (status === "REJECTED") return 2;
  if (status === "EXPIRED") return 3;
  return WORKFLOW_STEPS.findIndex((s) => s.status === status);
}

function CollapsibleSection({ title, defaultOpen = false, children, badge }: { title: string; defaultOpen?: boolean; children: React.ReactNode; badge?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-3 px-1 text-left hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {badge}
        </div>
      </button>
      {open && <div className="pb-4 px-1">{children}</div>}
    </div>
  );
}

export default function RiskAcceptanceDetailPanel({ acceptance, onClose, onUpdate }: Props) {
  const currentUser = useAppStore((s) => s.currentUser);
  const authUser = useAppStore((s) => s.authUser);
  const users = useAppStore((s) => s.users);
  const storeActions = useAppStore((s) => s.actions);

  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // CCRO Decision form state
  const [ccroDecision, setCcroDecision] = useState<"route" | "return">("route");
  const [selectedApprover, setSelectedApprover] = useState("");
  const [ccroNote, setCcroNote] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [returnComment, setReturnComment] = useState("");
  const [submittingCcro, setSubmittingCcro] = useState(false);

  // Approver Decision form state
  const [approverDecision, setApproverDecision] = useState<"accept" | "reject">("accept");
  const [approverRationale, setApproverRationale] = useState("");
  const [approverReviewDate, setApproverReviewDate] = useState("");
  const [submittingApprover, setSubmittingApprover] = useState(false);

  if (!acceptance) return null;

  const isCCRO = currentUser?.role === "CCRO_TEAM";
  const activeUserId = authUser?.id ?? currentUser?.id;
  const isApprover = acceptance.approverId === activeUserId;
  const risk = acceptance.risk;
  const stepIndex = getStepIndex(acceptance.status);

  async function handleTransition(action: string, body: Record<string, unknown> = {}) {
    try {
      const updated = await api<RiskAcceptance>(`/api/risk-acceptances/${acceptance!.id}`, {
        method: "PATCH",
        body: { action, ...body },
      });
      onUpdate(updated);
      toast.success(`Risk acceptance ${action.toLowerCase().replace(/_/g, " ")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function handleComment() {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      await api<RAComment>(`/api/risk-acceptances/${acceptance!.id}/comments`, {
        method: "POST",
        body: { content: newComment },
      });
      // Refresh acceptance data
      const updated = await api<RiskAcceptance>(`/api/risk-acceptances/${acceptance!.id}`);
      onUpdate(updated);
      setNewComment("");
      toast.success("Comment added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSendingComment(false);
    }
  }

  async function handleCcroSubmit() {
    setSubmittingCcro(true);
    try {
      if (ccroDecision === "route") {
        if (!selectedApprover) { toast.error("Select an approver"); setSubmittingCcro(false); return; }
        // First move to CCRO_REVIEW if still PROPOSED
        if (acceptance!.status === "PROPOSED") {
          await handleTransition("SUBMIT_FOR_REVIEW");
          // Re-fetch
          const refreshed = await api<RiskAcceptance>(`/api/risk-acceptances/${acceptance!.id}`);
          onUpdate(refreshed);
        }
        await handleTransition("ROUTE_TO_APPROVER", {
          approverId: selectedApprover,
          ccroNote: ccroNote || null,
          reviewDate: reviewDate || null,
        });
      } else {
        if (!returnComment.trim()) { toast.error("A comment is required when returning"); setSubmittingCcro(false); return; }
        // First move to CCRO_REVIEW if still PROPOSED
        if (acceptance!.status === "PROPOSED") {
          await handleTransition("SUBMIT_FOR_REVIEW");
        }
        await handleTransition("RETURN", { comment: returnComment });
      }
    } finally {
      setSubmittingCcro(false);
    }
  }

  async function handleApproverSubmit() {
    if (!approverRationale.trim()) { toast.error("Rationale is required"); return; }
    setSubmittingApprover(true);
    try {
      if (approverDecision === "accept") {
        await handleTransition("APPROVE", {
          approverRationale,
          reviewDate: approverReviewDate || null,
        });
      } else {
        await handleTransition("REJECT", { approverRationale });
      }
    } finally {
      setSubmittingApprover(false);
    }
  }

  const statusColours = RISK_ACCEPTANCE_STATUS_COLOURS[acceptance.status];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">Risk Acceptances › {acceptance.reference}</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-updraft-deep">{acceptance.reference}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColours.bg} ${statusColours.text}`}>
                  {RISK_ACCEPTANCE_STATUS_LABELS[acceptance.status]}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {RISK_ACCEPTANCE_SOURCE_LABELS[acceptance.source]}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 font-poppins truncate">{acceptance.title}</h2>
              {acceptance.reviewDate && (
                <div className="mt-1">
                  {(() => {
                    const daysLeft = Math.ceil((new Date(acceptance.reviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isExpired = daysLeft <= 0;
                    const isApproaching = daysLeft > 0 && daysLeft <= 30;
                    return (
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                        isExpired ? "bg-red-100 text-red-700" : isApproaching ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      )}>
                        <Clock size={12} />
                        Accepted until {new Date(acceptance.reviewDate!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {isExpired && " (Expired)"}
                        {isApproaching && ` (${daysLeft}d remaining)`}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0 ml-2" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-0">
          {/* 1. Workflow Stepper */}
          <CollapsibleSection title="Workflow Progress" defaultOpen>
            <div className="flex items-center gap-1 py-2">
              {WORKFLOW_STEPS.map((step, i) => {
                const isCompleted = i < stepIndex;
                const isCurrent = i === stepIndex && !["RETURNED", "REJECTED", "EXPIRED"].includes(acceptance.status);
                const isTerminal = ["RETURNED", "REJECTED", "EXPIRED"].includes(acceptance.status) && i === stepIndex;
                return (
                  <div key={step.status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                        isCompleted ? "bg-green-500 text-white" :
                        isCurrent ? "bg-updraft-bright-purple text-white animate-pulse" :
                        isTerminal ? (acceptance.status === "REJECTED" ? "bg-red-500 text-white" : acceptance.status === "EXPIRED" ? "bg-gray-400 text-white" : "bg-orange-500 text-white") :
                        "bg-gray-200 text-gray-500"
                      )}>
                        {isCompleted ? <Check size={14} /> : i + 1}
                      </div>
                      <span className={cn("text-[10px] mt-1 text-center", isCurrent ? "font-semibold text-updraft-deep" : "text-gray-500")}>
                        {isTerminal && acceptance.status !== step.status ? RISK_ACCEPTANCE_STATUS_LABELS[acceptance.status] : step.label}
                      </span>
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className={cn("h-0.5 w-full mx-1", i < stepIndex ? "bg-green-500" : "bg-gray-200")} />
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* 2. Appetite Breach Assessment */}
          {risk && (
            <CollapsibleSection title="Appetite Breach Assessment" defaultOpen>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Inherent Score</p>
                  <ScoreBadge likelihood={risk.inherentLikelihood} impact={risk.inherentImpact} size="sm" />
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Residual Score</p>
                  <ScoreBadge likelihood={risk.residualLikelihood} impact={risk.residualImpact} size="sm" />
                </div>
                {risk.riskAppetite && (
                  <>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500 mb-1">Risk Appetite</p>
                      <p className="font-medium">{APPETITE_DISPLAY[risk.riskAppetite]} (max {getAppetiteMaxScore(risk.riskAppetite)})</p>
                    </div>
                    <div className={cn("rounded-lg p-3", calculateBreach(getRiskScore(risk.residualLikelihood, risk.residualImpact), risk.riskAppetite).breached ? "bg-red-50" : "bg-green-50")}>
                      <p className="text-xs text-gray-500 mb-1">Breach Status</p>
                      {(() => {
                        const b = calculateBreach(getRiskScore(risk.residualLikelihood, risk.residualImpact), risk.riskAppetite!);
                        return b.breached
                          ? <p className="font-semibold text-red-700 flex items-center gap-1"><AlertTriangle size={14} /> Breached (+{b.difference})</p>
                          : <p className="font-semibold text-green-700 flex items-center gap-1"><Check size={14} /> Within Appetite</p>;
                      })()}
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* 3. Proposer's Rationale */}
          <CollapsibleSection title="Proposer's Rationale" defaultOpen>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Proposed by <strong>{acceptance.proposer?.name ?? "Unknown"}</strong></span>
                <span>·</span>
                <span>{formatDate(acceptance.createdAt)}</span>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-700 whitespace-pre-wrap">{acceptance.proposedRationale}</p>
              </div>
              {acceptance.proposedConditions && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Conditions</p>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-gray-700 whitespace-pre-wrap text-xs">{acceptance.proposedConditions}</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">{acceptance.description}</p>
            </div>
          </CollapsibleSection>

          {/* 4. Controls & Mitigations */}
          {(risk || acceptance.linkedControlId || acceptance.linkedActionIds.length > 0) && (() => {
            const hasFailingControl = acceptance.linkedControl?.approvalStatus === "REJECTED";
            const hasPendingControl = acceptance.linkedControl && acceptance.linkedControl.approvalStatus !== "APPROVED";
            const overdueActions = acceptance.linkedActionIds.filter((aid) => storeActions.find((a) => a.id === aid)?.status === "OVERDUE").length;
            const totalCount = (risk?.controls?.length ?? 0) + (risk?.mitigations?.length ?? 0) + (acceptance.linkedControlId ? 1 : 0);
            const hasIssues = hasFailingControl || overdueActions > 0;
            return (
            <CollapsibleSection title="Controls & Mitigations" badge={
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{totalCount}</span>
                {hasIssues && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold"
                    title={hasFailingControl ? "Linked control rejected" : `${overdueActions} overdue action${overdueActions !== 1 ? "s" : ""}`}
                  >
                    <AlertTriangle size={9} />
                    {hasFailingControl ? "Rejected" : `${overdueActions} overdue`}
                  </span>
                )}
                {!hasIssues && hasPendingControl && (
                  <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold" title="Linked control pending approval">
                    Pending
                  </span>
                )}
              </div>
            }>
              <div className="space-y-3 text-sm">
                {/* Linked Control (from Control Testing source) */}
                {acceptance.linkedControlId && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Linked Control</p>
                    <Link
                      href={`/controls?control=${acceptance.linkedControlId}`}
                      className="flex items-center gap-2 rounded-lg bg-updraft-pale-purple/20 border border-updraft-pale-purple/30 p-2 text-xs text-updraft-deep hover:bg-updraft-pale-purple/30 transition-colors"
                    >
                      <ExternalLink size={12} />
                      <span className="font-medium">
                        {acceptance.linkedControl
                          ? `${acceptance.linkedControl.controlRef}: ${acceptance.linkedControl.controlName}`
                          : "View Control Test Results"}
                      </span>
                      <span className="ml-auto text-updraft-bright-purple">&rarr;</span>
                    </Link>
                  </div>
                )}
                {risk?.controls && risk.controls.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Controls</p>
                    {risk.controls.map((c) => (
                      <div key={c.id} className="rounded-lg bg-gray-50 p-2 mb-1 text-xs text-gray-700">{c.description}</div>
                    ))}
                  </div>
                )}
                {risk?.mitigations && risk.mitigations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Mitigations</p>
                    {risk.mitigations.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2 mb-1 text-xs">
                        <span className="text-gray-700">{m.action}</span>
                        <span className={cn("px-1.5 py-0.5 rounded-full font-medium",
                          m.status === "COMPLETE" ? "bg-green-100 text-green-700" :
                          m.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        )}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                {acceptance.linkedActionIds.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Linked Actions</p>
                    {acceptance.linkedActionIds.map((aid) => {
                      const action = storeActions.find((a) => a.id === aid);
                      return action ? (
                        <Link key={aid} href={`/actions?edit=${aid}`} className="flex items-center justify-between rounded-lg bg-gray-50 p-2 mb-1 text-xs hover:bg-gray-100 transition-colors">
                          <span className="text-gray-700">{action.reference}: {action.title}</span>
                          <span className="text-gray-500">{action.status}</span>
                        </Link>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/actions?newAction=true&source=${encodeURIComponent("Risk Acceptance")}&metricName=${encodeURIComponent(`${acceptance.reference}: ${acceptance.title}`)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-updraft-bright-purple hover:text-updraft-deep transition-colors"
                  >
                    <ArrowRight size={12} /> Raise Action
                  </Link>
                  <Link
                    href="/controls?newControl=true&source=Risk+Acceptance"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-updraft-bright-purple hover:text-updraft-deep transition-colors"
                  >
                    <ExternalLink size={12} /> Link Control
                  </Link>
                </div>
              </div>
            </CollapsibleSection>
            );
          })()}

          {/* 5. Comments & Discussion */}
          <CollapsibleSection title="Comments & Discussion" defaultOpen badge={
            acceptance.comments && acceptance.comments.length > 0 ? (
              <span className="text-[10px] bg-updraft-pale-purple/40 text-updraft-deep px-1.5 py-0.5 rounded-full">{acceptance.comments.length}</span>
            ) : undefined
          }>
            <div className="space-y-3">
              {(acceptance.comments ?? []).map((c) => {
                const commenter = c.user ?? users.find((u) => u.id === c.userId);
                const isCcroComment = commenter && users.find((u) => u.id === commenter.id)?.role === "CCRO_TEAM";
                return (
                  <div key={c.id} className={cn("rounded-lg p-3 text-sm", isCcroComment ? "bg-updraft-pale-purple/20 border border-updraft-pale-purple/30" : "bg-gray-50")}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white", isCcroComment ? "bg-updraft-bright-purple" : "bg-gray-400")}>
                        {(commenter?.name ?? "?").charAt(0)}
                      </div>
                      <span className="text-xs font-medium text-gray-700">{commenter?.name ?? "Unknown"}</span>
                      <span className="text-[10px] text-gray-400">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{c.content}</p>
                  </div>
                );
              })}
              {(acceptance.comments ?? []).length === 0 && (
                <p className="text-xs text-gray-400">No comments yet</p>
              )}
              {/* Add comment form */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                />
                <button
                  onClick={handleComment}
                  disabled={sendingComment || !newComment.trim()}
                  className="rounded-lg bg-updraft-deep text-white px-3 py-2 text-sm hover:bg-updraft-bar transition-colors disabled:opacity-50"
                  aria-label="Send comment"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </CollapsibleSection>

          {/* 6. CCRO Decision */}
          {isCCRO && ["PROPOSED", "CCRO_REVIEW"].includes(acceptance.status) && (
            <CollapsibleSection title="CCRO Decision" defaultOpen>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <label className={cn("flex-1 rounded-lg border-2 p-3 cursor-pointer transition-colors text-center text-sm",
                    ccroDecision === "route" ? "border-updraft-bright-purple bg-updraft-pale-purple/20" : "border-gray-200 hover:border-gray-300"
                  )}>
                    <input type="radio" name="ccroDecision" value="route" checked={ccroDecision === "route"} onChange={() => setCcroDecision("route")} className="sr-only" />
                    <ArrowRight size={16} className="mx-auto mb-1 text-updraft-bright-purple" />
                    <span className="font-medium">Route to Approver</span>
                  </label>
                  <label className={cn("flex-1 rounded-lg border-2 p-3 cursor-pointer transition-colors text-center text-sm",
                    ccroDecision === "return" ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                  )}>
                    <input type="radio" name="ccroDecision" value="return" checked={ccroDecision === "return"} onChange={() => setCcroDecision("return")} className="sr-only" />
                    <AlertTriangle size={16} className="mx-auto mb-1 text-orange-500" />
                    <span className="font-medium">Return to Proposer</span>
                  </label>
                </div>

                {ccroDecision === "route" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Approver</label>
                      <select value={selectedApprover} onChange={(e) => setSelectedApprover(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <option value="">Select approver...</option>
                        {users.filter((u) => u.isActive).map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CCRO Note (optional)</label>
                      <textarea value={ccroNote} onChange={(e) => setCcroNote(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Note for the approver..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Review Date</label>
                      <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                )}

                {ccroDecision === "return" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reason for Return</label>
                    <textarea value={returnComment} onChange={(e) => setReturnComment(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Why is this being returned?" required />
                  </div>
                )}

                <button
                  onClick={handleCcroSubmit}
                  disabled={submittingCcro}
                  className="w-full rounded-lg bg-updraft-deep text-white py-2 text-sm font-medium hover:bg-updraft-bar transition-colors disabled:opacity-50"
                >
                  {submittingCcro ? "Processing..." : ccroDecision === "route" ? "Route to Approver" : "Return"}
                </button>
              </div>
            </CollapsibleSection>
          )}

          {/* 7. Approver Decision */}
          {acceptance.status === "AWAITING_APPROVAL" && (isApprover || isCCRO) && (
            <CollapsibleSection title="Approver Decision" defaultOpen>
              <div className="space-y-3">
                {acceptance.ccroNote && (
                  <div className="rounded-lg bg-updraft-pale-purple/20 border border-updraft-pale-purple/30 p-3 text-xs">
                    <p className="font-medium text-updraft-deep mb-1">CCRO Note</p>
                    <p className="text-gray-600">{acceptance.ccroNote}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <label className={cn("flex-1 rounded-lg border-2 p-3 cursor-pointer transition-colors text-center text-sm",
                    approverDecision === "accept" ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-gray-300"
                  )}>
                    <input type="radio" name="approverDecision" value="accept" checked={approverDecision === "accept"} onChange={() => setApproverDecision("accept")} className="sr-only" />
                    <Check size={16} className="mx-auto mb-1 text-green-600" />
                    <span className="font-medium">Accept</span>
                  </label>
                  <label className={cn("flex-1 rounded-lg border-2 p-3 cursor-pointer transition-colors text-center text-sm",
                    approverDecision === "reject" ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"
                  )}>
                    <input type="radio" name="approverDecision" value="reject" checked={approverDecision === "reject"} onChange={() => setApproverDecision("reject")} className="sr-only" />
                    <X size={16} className="mx-auto mb-1 text-red-600" />
                    <span className="font-medium">Reject</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rationale <span className="text-red-500">*</span></label>
                  <textarea value={approverRationale} onChange={(e) => setApproverRationale(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Reason for your decision..." required />
                </div>
                {approverDecision === "accept" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Review Date</label>
                    <input type="date" value={approverReviewDate || (acceptance.reviewDate ? new Date(acceptance.reviewDate).toISOString().split("T")[0] : "")} onChange={(e) => setApproverReviewDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                )}
                <button
                  onClick={handleApproverSubmit}
                  disabled={submittingApprover || !approverRationale.trim()}
                  className={cn("w-full rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50",
                    approverDecision === "accept" ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-600 text-white hover:bg-red-700"
                  )}
                >
                  {submittingApprover ? "Processing..." : approverDecision === "accept" ? "Approve Acceptance" : "Reject Acceptance"}
                </button>
              </div>
            </CollapsibleSection>
          )}

          {/* 8. Acceptance Record */}
          {acceptance.status === "APPROVED" && (
            <CollapsibleSection title="Acceptance Record" defaultOpen>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-xs text-gray-500">Approved By</p>
                    <p className="font-medium text-green-800">{acceptance.approver?.name ?? "Unknown"}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-xs text-gray-500">Approved On</p>
                    <p className="font-medium text-green-800">{acceptance.approvedAt ? formatDate(acceptance.approvedAt) : "—"}</p>
                  </div>
                </div>
                {acceptance.approverRationale && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Approver Rationale</p>
                    <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap">{acceptance.approverRationale}</div>
                  </div>
                )}
                {acceptance.proposedConditions && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Conditions</p>
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-gray-700 whitespace-pre-wrap">{acceptance.proposedConditions}</div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-gray-500">Review Date: {acceptance.reviewDate ? formatDate(acceptance.reviewDate) : "Not set"}</span>
                </div>
                {acceptance.consumerDutyOutcome && (
                  <div className="flex items-center gap-2 text-xs">
                    <MessageCircle size={12} className="text-gray-400" />
                    <span className="text-gray-500">CD Outcome: {acceptance.consumerDutyOutcome.name}</span>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* 9. History Timeline */}
          <CollapsibleSection title="History Timeline" badge={
            acceptance.history && acceptance.history.length > 0 ? (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{acceptance.history.length}</span>
            ) : undefined
          }>
            <div className="relative pl-6 space-y-3">
              <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />
              {(acceptance.history ?? []).map((h) => {
                const historyUser = h.user ?? users.find((u) => u.id === h.userId);
                const dotColour = h.action === "CREATED" ? "bg-blue-500"
                  : h.action === "APPROVE" ? "bg-green-500"
                  : h.action === "REJECT" ? "bg-red-500"
                  : h.action === "RETURN" ? "bg-orange-500"
                  : h.action === "EXPIRE" ? "bg-gray-400"
                  : h.action === "COMMENT_ADDED" ? "bg-purple-400"
                  : "bg-updraft-bright-purple";
                return (
                  <div key={h.id} className="relative">
                    <div className={cn("absolute -left-[18px] top-1 h-3 w-3 rounded-full border-2 border-white", dotColour)} />
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">{h.action.replace(/_/g, " ")}</span>
                        {h.fromStatus && h.toStatus && (
                          <span className="text-gray-400">{h.fromStatus} → {h.toStatus}</span>
                        )}
                      </div>
                      <p className="text-gray-500 mt-0.5">{h.details}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {historyUser?.name ?? "System"} · {formatDate(h.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(acceptance.history ?? []).length === 0 && (
                <p className="text-xs text-gray-400">No history recorded</p>
              )}
            </div>
          </CollapsibleSection>

          {/* CCRO quick actions for RETURNED status */}
          {isCCRO && acceptance.status === "RETURNED" && (
            <div className="pt-4">
              <button
                onClick={() => handleTransition("RESUBMIT", { comment: "Resubmitted after revisions" })}
                className="w-full rounded-lg bg-updraft-deep text-white py-2 text-sm font-medium hover:bg-updraft-bar transition-colors"
              >
                Resubmit for CCRO Review
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
