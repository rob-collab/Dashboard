"use client";

import { useState, useEffect, useMemo } from "react";
import Modal from "@/components/common/Modal";
import ControlChangePanel from "./ControlChangePanel";
import ControlSuggestChangeForm from "./ControlSuggestChangeForm";
import ActionFormDialog from "@/components/actions/ActionFormDialog";
import { deriveTestingStatus } from "@/lib/controls-utils";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import type { ControlRecord, Action, ControlChange, RegulationControlLink } from "@/lib/types";
import {
  CD_OUTCOME_LABELS,
  CONTROL_FREQUENCY_LABELS,
  CONTROL_TYPE_LABELS,
  TEST_RESULT_LABELS,
  TEST_RESULT_COLOURS,
  TESTING_FREQUENCY_LABELS,
} from "@/lib/types";
import type { ControlType } from "@/lib/types";
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Pencil,
  Plus,
  Unlink,
  Trash2,
  Link2,
  Search,
  FileText,
  Scale,
} from "lucide-react";
import { cn, formatDateShort } from "@/lib/utils";
import ScoreBadge from "@/components/risk-register/ScoreBadge";
import EntityLink from "@/components/common/EntityLink";
import RequestEditAccessButton from "@/components/common/RequestEditAccessButton";

interface ControlDetailModalProps {
  controlId: string | null;
  onClose: () => void;
  onEditControl?: (control: ControlRecord) => void;
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ACTION_STATUS_COLOURS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  PROPOSED_CLOSED: "bg-purple-100 text-purple-700",
};

export default function ControlDetailModal({
  controlId,
  onClose,
  onEditControl,
}: ControlDetailModalProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const users = useAppStore((s) => s.users);
  const reports = useAppStore((s) => s.reports);
  const allActions = useAppStore((s) => s.actions);
  const policies = useAppStore((s) => s.policies);
  const addAction = useAppStore((s) => s.addAction);
  const isCCRO = currentUser?.role === "CCRO_TEAM";
  const canEditActions = currentUser?.role === "CCRO_TEAM" || currentUser?.role === "OWNER";

  const [control, setControl] = useState<ControlRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [changesExpanded, setChangesExpanded] = useState(false);
  const [suggestFormOpen, setSuggestFormOpen] = useState(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [createActionOpen, setCreateActionOpen] = useState(false);

  // Fetch full control detail when controlId changes
  useEffect(() => {
    if (!controlId) {
      setControl(null);
      return;
    }

    setLoading(true);
    setChangesExpanded(false);
    setSuggestFormOpen(false);
    setLinkPickerOpen(false);
    setLinkSearch("");
    setCreateActionOpen(false);

    api<ControlRecord>(`/api/controls/library/${controlId}`)
      .then((data) => setControl(data))
      .catch((err) => console.error("[ControlDetailModal] fetch error:", err))
      .finally(() => setLoading(false));
  }, [controlId]);

  async function handleApproveChange(changeId: string, note: string) {
    if (!control) return;
    try {
      await api(`/api/controls/library/${control.id}/changes/${changeId}`, {
        method: "PATCH",
        body: { status: "APPROVED", reviewNote: note || undefined },
      });
      // Refresh
      const fresh = await api<ControlRecord>(`/api/controls/library/${control.id}`);
      setControl(fresh);
    } catch (err) {
      console.error("[ControlDetailModal] approve error:", err);
    }
  }

  async function handleRejectChange(changeId: string, note: string) {
    if (!control) return;
    try {
      await api(`/api/controls/library/${control.id}/changes/${changeId}`, {
        method: "PATCH",
        body: { status: "REJECTED", reviewNote: note || undefined },
      });
      const fresh = await api<ControlRecord>(`/api/controls/library/${control.id}`);
      setControl(fresh);
    } catch (err) {
      console.error("[ControlDetailModal] reject error:", err);
    }
  }

  async function handleChangeSubmitted() {
    if (!control) return;
    const fresh = await api<ControlRecord>(`/api/controls/library/${control.id}`);
    setControl(fresh);
    setSuggestFormOpen(false);
    setChangesExpanded(true);
  }

  async function handleUnlinkAction(actionId: string) {
    if (!control) return;
    try {
      await api(`/api/actions/${actionId}`, {
        method: "PATCH",
        body: { controlId: null },
      });
      const fresh = await api<ControlRecord>(`/api/controls/library/${control.id}`);
      setControl(fresh);
    } catch (err) {
      console.error("[ControlDetailModal] unlink action error:", err);
    }
  }

  async function handleDeleteAction(actionId: string) {
    if (!control) return;
    if (!window.confirm("Are you sure you want to permanently delete this action?")) return;
    try {
      await api(`/api/actions/${actionId}`, { method: "DELETE" });
      const fresh = await api<ControlRecord>(`/api/controls/library/${control.id}`);
      setControl(fresh);
    } catch (err) {
      console.error("[ControlDetailModal] delete action error:", err);
    }
  }

  // Actions that are not linked to any control (available for linking)
  const unlinkedActions = useMemo(() => {
    const q = linkSearch.toLowerCase();
    return allActions.filter((a) => {
      if (a.controlId) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.reference?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [allActions, linkSearch]);

  async function handleLinkAction(actionId: string) {
    if (!control) return;
    try {
      await api(`/api/actions/${actionId}`, {
        method: "PATCH",
        body: { controlId: control.id },
      });
      const fresh = await api<ControlRecord>(`/api/controls/library/${control.id}`);
      setControl(fresh);
      setLinkPickerOpen(false);
      setLinkSearch("");
    } catch (err) {
      console.error("[ControlDetailModal] link action error:", err);
    }
  }

  function handleCreateActionSave(action: Action) {
    addAction(action);
    setCreateActionOpen(false);
    // Refresh control to pick up newly created action
    if (control) {
      api<ControlRecord>(`/api/controls/library/${control.id}`)
        .then((fresh) => setControl(fresh))
        .catch((err) => console.error("[ControlDetailModal] refresh error:", err));
    }
  }

  if (!controlId) return null;

  const changes: ControlChange[] = control?.changes ?? [];
  const actions: Action[] = control?.actions ?? [];
  const pendingCount = changes.filter((c) => c.status === "PENDING").length;

  // Testing status
  const testingStatus = control ? deriveTestingStatus(control) : null;
  const testResults = control?.testingSchedule?.testResults ?? [];
  const sortedResults = [...testResults].sort((a, b) => {
    if (a.periodYear !== b.periodYear) return b.periodYear - a.periodYear;
    return b.periodMonth - a.periodMonth;
  });

  // Attestation
  const latestAttestation = control?.attestations?.[0] ?? null;

  return (
    <>
    <Modal
      open={!!controlId}
      onClose={onClose}
      title={loading ? "Loading..." : control ? `${control.controlRef} — ${control.controlName}` : "Control Detail"}
      size="xl"
      footer={
        <>
          {isCCRO && control && onEditControl && (
            <button
              onClick={() => { onClose(); onEditControl(control); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Pencil size={14} />
              Edit Control
            </button>
          )}
          {!isCCRO && control && (
            <RequestEditAccessButton
              permission="edit:controls"
              entityType="Control"
              entityId={control.id}
              entityName={`${control.controlRef} – ${control.controlName}`}
            />
          )}
          {!isCCRO && control && (
            <button
              onClick={() => setSuggestFormOpen(!suggestFormOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
            >
              <Plus size={14} />
              {suggestFormOpen ? "Cancel" : "Suggest Change"}
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-updraft-deep" />
        </div>
      ) : control ? (
        <div className="space-y-5">
          {/* ── Type badge ── */}
          {control.controlType && (
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-updraft-pale-purple px-3 py-0.5 text-xs font-semibold text-updraft-deep">
                {CONTROL_TYPE_LABELS[control.controlType as ControlType]}
              </span>
            </div>
          )}

          {/* ── Suggest Change Form (non-CCRO) ── */}
          {suggestFormOpen && !isCCRO && (
            <div className="rounded-lg border border-updraft-light-purple bg-updraft-pale-purple/30 p-4">
              <h4 className="text-sm font-semibold text-updraft-deep mb-3">Suggest a Change</h4>
              <ControlSuggestChangeForm
                control={control}
                onSubmitted={handleChangeSubmitted}
              />
            </div>
          )}

          {/* ── Details Grid ── */}
          <div className="bento-card p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Details</h4>
            <div className="space-y-3">
              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {control.controlDescription || "(No description)"}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Business Area</label>
                  <span className="text-gray-700">{control.businessArea?.name ?? "—"}</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Owner</label>
                  <span className="text-gray-700">{control.controlOwner?.name ?? "—"}</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">CD Outcome</label>
                  <span className="inline-block rounded-full bg-updraft-pale-purple px-2 py-0.5 text-xs font-medium text-updraft-deep">
                    {CD_OUTCOME_LABELS[control.consumerDutyOutcome]}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Control Frequency</label>
                  <span className="text-gray-700">{CONTROL_FREQUENCY_LABELS[control.controlFrequency]}</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Internal / Third Party</label>
                  <span className="text-gray-700">{control.internalOrThirdParty === "THIRD_PARTY" ? "Third Party" : "Internal"}</span>
                </div>
                {control.controlType && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Control Type</label>
                    <span className="text-gray-700">{CONTROL_TYPE_LABELS[control.controlType as ControlType]}</span>
                  </div>
                )}
              </div>

              {/* Standing Comments */}
              {control.standingComments && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Standing Comments</label>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{control.standingComments}</p>
                </div>
              )}

              {/* Attestation status */}
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className={cn("w-4 h-4", latestAttestation?.attested ? "text-green-600" : "text-gray-400")} />
                <span className="text-xs text-gray-600">
                  Attestation: {latestAttestation ? (latestAttestation.attested ? "Attested" : "Pending") : "No attestation"}
                  {latestAttestation?.ccroReviewedById && (
                    <span className="ml-2 text-gray-400">
                      (CCRO {latestAttestation.ccroAgreement ? "Agreed" : "Disagreed"})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* ── Testing Results ── */}
          <div className="bento-card p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              Testing Results
              {testingStatus && (
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", testingStatus.bgColour, testingStatus.colour)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", testingStatus.dotColour)} />
                  {testingStatus.label}
                </span>
              )}
            </h4>

            {control.testingSchedule ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {TESTING_FREQUENCY_LABELS[control.testingSchedule.testingFrequency]}
                  </span>
                  <span>
                    Tester: {control.testingSchedule.assignedTester?.name ?? users.find((u) => u.id === control.testingSchedule?.assignedTesterId)?.name ?? "—"}
                  </span>
                </div>

                {/* 12-month trend dots */}
                {sortedResults.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {sortedResults.slice(0, 12).map((tr) => {
                      const colours = TEST_RESULT_COLOURS[tr.result];
                      return (
                        <div
                          key={tr.id}
                          className="flex items-center gap-1 text-xs text-gray-500"
                          title={`${MONTH_ABBR[tr.periodMonth - 1]} ${tr.periodYear}: ${TEST_RESULT_LABELS[tr.result]}${tr.notes ? ` — ${tr.notes}` : ""}`}
                        >
                          <span className="text-[10px]">{MONTH_ABBR[tr.periodMonth - 1]}</span>
                          <span className={cn("inline-block w-2.5 h-2.5 rounded-full", colours.dot)} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {sortedResults.length === 0 && (
                  <p className="text-xs text-gray-400">No test results recorded yet.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">This control is not in the testing schedule.</p>
            )}
          </div>

          {/* ── Linked Risks ── */}
          {(control.riskLinks ?? []).length > 0 && (
            <div className="bento-card p-4">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <ShieldAlert size={14} className="text-updraft-bright-purple" />
                Linked Risks
                <span className="text-xs font-normal text-gray-400">({control.riskLinks!.length})</span>
              </h4>
              <div className="space-y-1.5">
                {control.riskLinks!.map((link) => (
                  <div key={link.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <EntityLink
                      type="risk"
                      id={link.riskId}
                      reference={link.risk?.reference ?? "Risk"}
                      label={link.risk?.name ?? "Unknown Risk"}
                    />
                    {link.risk && (
                      <ScoreBadge
                        likelihood={link.risk.residualLikelihood ?? 1}
                        impact={link.risk.residualImpact ?? 1}
                        size="sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Policies Supported ── */}
          {(() => {
            const linkedPolicies = policies.filter((p) =>
              (p.controlLinks ?? []).some((link) => link.controlId === control.id)
            );
            return linkedPolicies.length > 0 ? (
              <div className="bento-card p-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <FileText size={14} className="text-blue-600" />
                  Policies Supported
                  <span className="text-xs font-normal text-gray-400">({linkedPolicies.length})</span>
                </h4>
                <div className="space-y-1.5">
                  {linkedPolicies.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <EntityLink
                        type="policy"
                        id={p.id}
                        reference={p.reference}
                        label={p.name}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* ── Regulations Addressed ── */}
          {(control.regulationLinks ?? []).length > 0 && (
            <div className="bento-card p-4">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Scale size={14} className="text-green-600" />
                Regulations Addressed
                <span className="text-xs font-normal text-gray-400">({control.regulationLinks!.length})</span>
              </h4>
              <div className="space-y-1.5">
                {control.regulationLinks!.map((link: RegulationControlLink) => (
                  <div key={link.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <EntityLink
                      type="regulation"
                      id={link.regulationId}
                      reference={link.regulation?.reference ?? "Reg"}
                      label={link.regulation?.name ?? "Unknown Regulation"}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Associated Actions ── */}
          <div className="bento-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                Associated Actions
                {actions.length > 0 && (
                  <span className="text-xs font-normal text-gray-400">({actions.length})</span>
                )}
              </h4>
              {canEditActions && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setLinkPickerOpen(!linkPickerOpen); setCreateActionOpen(false); }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      linkPickerOpen
                        ? "bg-updraft-pale-purple/40 text-updraft-deep"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    )}
                  >
                    <Link2 size={13} />
                    Link Existing
                  </button>
                  <button
                    onClick={() => { setCreateActionOpen(true); setLinkPickerOpen(false); }}
                    className="inline-flex items-center gap-1 rounded-md bg-updraft-bright-purple px-2.5 py-1.5 text-xs font-medium text-white hover:bg-updraft-deep transition-colors"
                  >
                    <Plus size={13} />
                    Create Action
                  </button>
                </div>
              )}
            </div>

            {/* Inline link picker */}
            {linkPickerOpen && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search unlinked actions..."
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {unlinkedActions.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2 text-center">No unlinked actions found.</p>
                  ) : (
                    unlinkedActions.slice(0, 20).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleLinkAction(a.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-white transition-colors"
                      >
                        <span className="font-mono font-medium text-updraft-deep whitespace-nowrap">{a.reference}</span>
                        <span className="text-gray-600 truncate">{a.title}</span>
                        <span className={cn("ml-auto shrink-0 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", ACTION_STATUS_COLOURS[a.status] ?? "bg-gray-100 text-gray-600")}>
                          {a.status.replace("_", " ")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {actions.length === 0 && !linkPickerOpen ? (
              <p className="text-xs text-gray-400">No actions linked to this control.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="pb-2 pr-3 font-medium">Ref</th>
                      <th className="pb-2 pr-3 font-medium">Title</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 pr-3 font-medium">Priority</th>
                      <th className="pb-2 pr-3 font-medium">Assignee</th>
                      <th className="pb-2 pr-3 font-medium">Due Date</th>
                      {canEditActions && <th className="pb-2 font-medium text-right">Manage</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {actions.map((action: Action) => (
                      <tr
                        key={action.id}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/actions?action=${action.id}`}
                      >
                        <td className="py-2 pr-3 font-mono font-medium text-updraft-deep whitespace-nowrap">
                          {action.reference}
                        </td>
                        <td className="py-2 pr-3 text-gray-700 max-w-[200px] truncate">
                          {action.title}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", ACTION_STATUS_COLOURS[action.status] ?? "bg-gray-100 text-gray-600")}>
                            {action.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gray-500">
                          {action.priority ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                          {action.assignee?.name ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                          {action.dueDate ? formatDateShort(action.dueDate) : "—"}
                        </td>
                        {canEditActions && (
                          <td className="py-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUnlinkAction(action.id); }}
                                className="rounded p-1 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                title="Unlink from control"
                              >
                                <Unlink size={13} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteAction(action.id); }}
                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Delete action"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Change History Banner (at bottom) ── */}
          {changes.length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setChangesExpanded(!changesExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {changesExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                  <span className="text-sm font-medium text-gray-700">Change History</span>
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[20px]">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{changes.length} total</span>
              </button>
              {changesExpanded && (
                <div className="p-3 border-t border-gray-100">
                  <ControlChangePanel
                    changes={changes}
                    isCCRO={isCCRO}
                    onApprove={handleApproveChange}
                    onReject={handleRejectChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-gray-400">Control not found</div>
      )}
    </Modal>

    {/* Create Action dialog */}
    <ActionFormDialog
      open={createActionOpen}
      onClose={() => setCreateActionOpen(false)}
      onSave={handleCreateActionSave}
      reports={reports}
      users={users}
      currentUserId={currentUser?.id ?? ""}
      prefillControlId={control?.id}
      prefillSource={control ? `Control ${control.controlRef}` : undefined}
      prefillSectionTitle={control?.controlName}
    />
    </>
  );
}
