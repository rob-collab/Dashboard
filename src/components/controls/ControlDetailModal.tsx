"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/common/Modal";
import ControlChangePanel from "./ControlChangePanel";
import ControlSuggestChangeForm from "./ControlSuggestChangeForm";
import { deriveTestingStatus } from "@/lib/controls-utils";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import type { ControlRecord, Action, ControlChange } from "@/lib/types";
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
  Clock,
  Pencil,
  Plus,
} from "lucide-react";
import { cn, formatDateShort } from "@/lib/utils";

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
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [control, setControl] = useState<ControlRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [changesExpanded, setChangesExpanded] = useState(false);
  const [suggestFormOpen, setSuggestFormOpen] = useState(false);

  // Fetch full control detail when controlId changes
  useEffect(() => {
    if (!controlId) {
      setControl(null);
      return;
    }

    setLoading(true);
    setChangesExpanded(false);
    setSuggestFormOpen(false);

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

          {/* ── Change History Banner ── */}
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

          {/* ── Associated Actions ── */}
          <div className="bento-card p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              Associated Actions
              {actions.length > 0 && (
                <span className="text-xs font-normal text-gray-400">({actions.length})</span>
              )}
            </h4>

            {actions.length === 0 ? (
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
                      <th className="pb-2 font-medium">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {actions.map((action: Action) => (
                      <tr
                        key={action.id}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/actions?highlight=${action.id}`}
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
                        <td className="py-2 text-gray-500 whitespace-nowrap">
                          {action.dueDate ? formatDateShort(action.dueDate) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-400">Control not found</div>
      )}
    </Modal>
  );
}
