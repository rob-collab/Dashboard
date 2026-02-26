"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { usePermissionSet } from "@/lib/usePermission";
import {
  APPLICABILITY_LABELS,
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLOURS,
  APPLICABILITY_COLOURS,
  type Regulation,
  type ComplianceStatus,
  type Applicability,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { X, ExternalLink, ShieldCheck, FileText, Link2, Plus, Search, Pencil, Loader2, ChevronDown, ChevronRight, History, Layers } from "lucide-react";
import EntityLink from "@/components/common/EntityLink";
import MaturityBadge from "@/components/processes/MaturityBadge";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import type { RegulationHistoryEvent } from "@/app/api/compliance/regulations/[id]/history/route";

interface Props {
  regulation: Regulation | null;
  loading?: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function RegulationDetailPanel({ regulation, loading, onClose, onRefresh }: Props) {
  const permissionSet = usePermissionSet();
  const canEdit = permissionSet.has("edit:compliance");
  const updateRegulationCompliance = useAppStore((s) => s.updateRegulationCompliance);
  const linkRegulationToControl = useAppStore((s) => s.linkRegulationToControl);
  const unlinkRegulationFromControl = useAppStore((s) => s.unlinkRegulationFromControl);
  const linkRegulationToPolicy = useAppStore((s) => s.linkRegulationToPolicy);
  const unlinkRegulationFromPolicy = useAppStore((s) => s.unlinkRegulationFromPolicy);
  const currentUser = useAppStore((s) => s.currentUser);
  const controls = useAppStore((s) => s.controls);
  const policies = useAppStore((s) => s.policies);
  const smfRoles = useAppStore((s) => s.smfRoles);
  const allProcesses = useAppStore((s) => s.processes);

  const [editMode, setEditMode] = useState(false);

  // Edit state — reset when regulation changes
  const [editDescription, setEditDescription] = useState("");
  const [editProvisions, setEditProvisions] = useState("");
  const [editApplicability, setEditApplicability] = useState<Applicability>("ASSESS");
  const [editApplicabilityNotes, setEditApplicabilityNotes] = useState("");
  const [editPrimarySMF, setEditPrimarySMF] = useState("");
  const [editSecondarySMF, setEditSecondarySMF] = useState("");
  const [editSMFNotes, setEditSMFNotes] = useState("");
  const [editStatus, setEditStatus] = useState<ComplianceStatus>("NOT_ASSESSED");
  const [editNotes, setEditNotes] = useState("");
  const [editNextReview, setEditNextReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isDirty = editMode && regulation != null && (
    editDescription !== (regulation.description ?? "") ||
    editProvisions !== (regulation.provisions ?? "") ||
    editApplicability !== ((regulation.applicability ?? "ASSESS") as Applicability) ||
    editApplicabilityNotes !== (regulation.applicabilityNotes ?? "") ||
    editPrimarySMF !== (regulation.primarySMF ?? "") ||
    editSecondarySMF !== (regulation.secondarySMF ?? "") ||
    editSMFNotes !== (regulation.smfNotes ?? "") ||
    editStatus !== ((regulation.complianceStatus ?? "NOT_ASSESSED") as ComplianceStatus) ||
    editNotes !== (regulation.assessmentNotes ?? "") ||
    editNextReview !== (regulation.nextReviewDate?.slice(0, 10) ?? "")
  );

  function handleCancelEdit() {
    if (isDirty) { setConfirmDiscard(true); } else { setEditMode(false); }
  }

  // Control / Policy picker state
  const [showControlPicker, setShowControlPicker] = useState(false);
  const [ctrlSearch, setCtrlSearch] = useState("");
  const [linkingCtrl, setLinkingCtrl] = useState<string | null>(null);
  const [showPolicyPicker, setShowPolicyPicker] = useState(false);
  const [policySearch, setPolicySearch] = useState("");
  const [linkingPolicy, setLinkingPolicy] = useState<string | null>(null);

  // History section state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<RegulationHistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (regulation) {
      setEditDescription(regulation.description ?? "");
      setEditProvisions(regulation.provisions ?? "");
      setEditApplicability((regulation.applicability ?? "ASSESS") as Applicability);
      setEditApplicabilityNotes(regulation.applicabilityNotes ?? "");
      setEditPrimarySMF(regulation.primarySMF ?? "");
      setEditSecondarySMF(regulation.secondarySMF ?? "");
      setEditSMFNotes(regulation.smfNotes ?? "");
      setEditStatus((regulation.complianceStatus ?? "NOT_ASSESSED") as ComplianceStatus);
      setEditNotes(regulation.assessmentNotes ?? "");
      setEditNextReview(regulation.nextReviewDate?.slice(0, 10) ?? "");
    }
    setEditMode(false);
    setShowControlPicker(false);
    setShowPolicyPicker(false);
    setHistoryOpen(false);
    setHistoryEvents([]);
  }, [regulation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!historyOpen || !regulation) return;
    setHistoryLoading(true);
    api<RegulationHistoryEvent[]>(`/api/compliance/regulations/${regulation.id}/history`)
      .then(setHistoryEvents)
      .catch(() => {/* silent */})
      .finally(() => setHistoryLoading(false));
  }, [historyOpen, regulation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = (regulation?.complianceStatus ?? "NOT_ASSESSED") as ComplianceStatus;
  const applicability = (regulation?.applicability ?? "ASSESS") as Applicability;
  const statusColours = COMPLIANCE_STATUS_COLOURS[status];
  const appColours = APPLICABILITY_COLOURS[applicability];

  const primaryHolder = regulation?.primarySMF
    ? smfRoles.find((r) => r.smfId === regulation.primarySMF)
    : null;
  const secondaryHolder = regulation?.secondarySMF
    ? smfRoles.find((r) => r.smfId === regulation.secondarySMF)
    : null;

  const linkedControlIds = useMemo(
    () => new Set((regulation?.controlLinks ?? []).map((l) => l.controlId)),
    [regulation?.controlLinks],
  );
  const linkedPolicyIds = useMemo(
    () => new Set((regulation?.policyLinks ?? []).map((l) => l.policyId)),
    [regulation?.policyLinks],
  );

  const unlinkedControls = useMemo(() => {
    const q = ctrlSearch.toLowerCase();
    return controls.filter(
      (c) =>
        c.isActive !== false &&
        !linkedControlIds.has(c.id) &&
        (!q || c.controlRef.toLowerCase().includes(q) || c.controlName.toLowerCase().includes(q)),
    );
  }, [controls, linkedControlIds, ctrlSearch]);

  const unlinkedPolicies = useMemo(() => {
    const q = policySearch.toLowerCase();
    return policies.filter(
      (p) =>
        !linkedPolicyIds.has(p.id) &&
        (!q || p.reference.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)),
    );
  }, [policies, linkedPolicyIds, policySearch]);

  async function handleSave() {
    if (!regulation) return;
    setSaving(true);
    try {
      await api(`/api/compliance/regulations/${regulation.id}`, {
        method: "PATCH",
        body: {
          description: editDescription || null,
          provisions: editProvisions || null,
          applicability: editApplicability,
          applicabilityNotes: editApplicabilityNotes || null,
          primarySMF: editPrimarySMF || null,
          secondarySMF: editSecondarySMF || null,
          smfNotes: editSMFNotes || null,
          complianceStatus: editStatus,
          assessmentNotes: editNotes || null,
          nextReviewDate: editNextReview || null,
        },
      });
      updateRegulationCompliance(regulation.id, {
        description: editDescription || null,
        provisions: editProvisions || null,
        applicability: editApplicability,
        applicabilityNotes: editApplicabilityNotes || null,
        primarySMF: editPrimarySMF || null,
        secondarySMF: editSecondarySMF || null,
        smfNotes: editSMFNotes || null,
        complianceStatus: editStatus,
        assessmentNotes: editNotes || null,
        nextReviewDate: editNextReview || null,
      });
      toast.success("Regulation updated");
      setEditMode(false);
      onRefresh?.();
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleLinkControl(controlId: string) {
    if (!regulation || !currentUser) return;
    setLinkingCtrl(controlId);
    try {
      await api(`/api/compliance/regulations/${regulation.id}/control-links`, {
        method: "POST",
        body: { controlId },
      });
      linkRegulationToControl(regulation.id, controlId, currentUser.id);
      toast.success("Control linked");
      onRefresh?.();
    } catch {
      toast.error("Failed to link control");
    } finally {
      setLinkingCtrl(null);
    }
  }

  async function handleUnlinkControl(controlId: string) {
    if (!regulation) return;
    try {
      await api(`/api/compliance/regulations/${regulation.id}/control-links`, {
        method: "DELETE",
        body: { controlId },
      });
      unlinkRegulationFromControl(regulation.id, controlId);
      toast.success("Control unlinked");
      onRefresh?.();
    } catch {
      toast.error("Failed to unlink control");
    }
  }

  async function handleLinkPolicy(policyId: string) {
    if (!regulation || !currentUser) return;
    setLinkingPolicy(policyId);
    try {
      await api(`/api/compliance/regulations/${regulation.id}/policy-links`, {
        method: "POST",
        body: { policyId },
      });
      linkRegulationToPolicy(regulation.id, policyId, currentUser.id);
      toast.success("Policy linked");
      onRefresh?.();
    } catch {
      toast.error("Failed to link policy");
    } finally {
      setLinkingPolicy(null);
    }
  }

  async function handleUnlinkPolicy(policyId: string) {
    if (!regulation) return;
    try {
      await api(`/api/compliance/regulations/${regulation.id}/policy-links`, {
        method: "DELETE",
        body: { policyId },
      });
      unlinkRegulationFromPolicy(regulation.id, policyId);
      toast.success("Policy unlinked");
      onRefresh?.();
    } catch {
      toast.error("Failed to unlink policy");
    }
  }

  // Show loading skeleton while fetching detail
  if (loading && !regulation) {
    return (
      <div className="w-[40%] min-w-[380px] max-w-[500px] border border-gray-200 rounded-lg bg-white shadow-lg flex items-center justify-center h-64 sticky top-4">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!regulation) return null;

  return (
    <div className="w-[40%] min-w-[380px] max-w-[500px] border border-gray-200 rounded-lg bg-white shadow-lg overflow-y-auto max-h-[calc(100vh-200px)] sticky top-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-updraft-deep to-updraft-bar flex items-start justify-between p-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono bg-white/20 text-white px-2 py-0.5 rounded">{regulation.reference}</span>
            <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold", appColours.bg, appColours.text)}>
              {APPLICABILITY_LABELS[applicability]}
            </span>
          </div>
          <h3 className="text-base font-semibold text-white font-poppins">{regulation.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
            <span>{regulation.body}</span>
            {regulation.type && <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/80">{regulation.type.replace(/_/g, " ")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <button
              onClick={() => setEditMode((v) => !v)}
              className={cn(
                "p-1.5 rounded transition-colors",
                editMode
                  ? "bg-white/30 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
              title={editMode ? "Exit edit mode" : "Edit regulation"}
            >
              <Pencil size={14} />
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-white/70" aria-label="Close panel">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">

        {/* Description */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
          {editMode ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={6}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple resize-y"
              placeholder="Add a description..."
            />
          ) : (
            regulation.description
              ? <p className="text-sm text-gray-700 leading-relaxed">{regulation.description}</p>
              : <p className="text-xs text-gray-400 italic">No description</p>
          )}
        </section>

        {/* Provisions */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Provisions</h4>
          {editMode ? (
            <textarea
              value={editProvisions}
              onChange={(e) => setEditProvisions(e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
              placeholder="e.g. CONC 5.2.1R, CONC 5.2.2G"
            />
          ) : (
            regulation.provisions
              ? <p className="text-sm text-gray-600 font-mono">{regulation.provisions}</p>
              : <p className="text-xs text-gray-400 italic">—</p>
          )}
        </section>

        {/* URL */}
        {regulation.url && (
          <a href={regulation.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-updraft-bright-purple hover:underline">
            <ExternalLink size={14} /> View Source
          </a>
        )}

        {/* Applicability */}
        {editMode && (
          <section className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Applicability</h4>
            <div className="space-y-2">
              <select
                value={editApplicability}
                onChange={(e) => setEditApplicability(e.target.value as Applicability)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                {(Object.entries(APPLICABILITY_LABELS) as [Applicability, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <textarea
                value={editApplicabilityNotes}
                onChange={(e) => setEditApplicabilityNotes(e.target.value)}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                placeholder="Applicability notes..."
              />
            </div>
          </section>
        )}

        {/* SMF Accountability */}
        <section className={cn(editMode ? "" : "border-t border-gray-100 pt-4")}>
          {!editMode && <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">SMF Accountability</h4>}
          {editMode ? (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">SMF Accountability</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Primary SMF</label>
                  <input
                    value={editPrimarySMF}
                    onChange={(e) => setEditPrimarySMF(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                    placeholder="e.g. SMF16"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Secondary SMF</label>
                  <input
                    value={editSecondarySMF}
                    onChange={(e) => setEditSecondarySMF(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                    placeholder="e.g. SMF1"
                  />
                </div>
              </div>
              <textarea
                value={editSMFNotes}
                onChange={(e) => setEditSMFNotes(e.target.value)}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                placeholder="SMF notes..."
              />
            </div>
          ) : (
            <div className="space-y-2">
              {regulation.primarySMF && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-16">Primary</span>
                  <span className="text-sm font-semibold text-updraft-deep">{regulation.primarySMF}</span>
                  {primaryHolder?.currentHolder && (
                    <a href="/compliance?tab=smcr" className="text-xs text-updraft-bright-purple hover:underline transition-colors">({primaryHolder.currentHolder.name})</a>
                  )}
                </div>
              )}
              {regulation.secondarySMF && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-16">Secondary</span>
                  <span className="text-sm font-medium text-gray-700">{regulation.secondarySMF}</span>
                  {secondaryHolder?.currentHolder && (
                    <a href="/compliance?tab=smcr" className="text-xs text-updraft-bright-purple hover:underline transition-colors">({secondaryHolder.currentHolder.name})</a>
                  )}
                </div>
              )}
              {regulation.smfNotes && <p className="text-xs text-gray-500 italic">{regulation.smfNotes}</p>}
              {!regulation.primarySMF && !regulation.secondarySMF && (
                <p className="text-xs text-gray-400 italic">No SMF assigned</p>
              )}
            </div>
          )}
        </section>

        {/* Compliance Assessment */}
        <section className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Compliance Assessment</h4>
          {editMode ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ComplianceStatus)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  {(Object.entries(COMPLIANCE_STATUS_LABELS) as [ComplianceStatus, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Assessment Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Add assessment notes..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Next Review Date</label>
                <input
                  type="date"
                  value={editNextReview}
                  onChange={(e) => setEditNextReview(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", statusColours.dot)} />
                <span className="text-sm font-medium">{COMPLIANCE_STATUS_LABELS[status]}</span>
              </div>
              {regulation.assessmentNotes && <p className="text-sm text-gray-600">{regulation.assessmentNotes}</p>}
              {regulation.lastAssessedAt && <p className="text-xs text-gray-400">Last assessed: {new Date(regulation.lastAssessedAt).toLocaleDateString("en-GB")}</p>}
              {regulation.nextReviewDate && <p className="text-xs text-gray-400">Next review: {new Date(regulation.nextReviewDate).toLocaleDateString("en-GB")}</p>}
            </div>
          )}
        </section>

        {/* Save / Cancel (edit mode) */}
        {editMode && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-updraft-bright-purple rounded-lg hover:bg-updraft-deep transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Linked Policies */}
        <section className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <FileText size={12} className="inline mr-1" />
              Linked Policies ({regulation.policyLinks?.length ?? 0})
            </h4>
            {canEdit && (
              <button
                onClick={() => { setShowPolicyPicker((v) => !v); setPolicySearch(""); }}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Link2 size={10} /> Link Policy
              </button>
            )}
          </div>

          {/* Policy picker */}
          {showPolicyPicker && (
            <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5 space-y-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)}
                  placeholder="Search policies..."
                  className="w-full rounded-lg border border-gray-200 pl-7 pr-2 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
                  autoFocus
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {unlinkedPolicies.length === 0 && (
                  <p className="text-[11px] text-gray-400 py-2 text-center">No unlinked policies found</p>
                )}
                {unlinkedPolicies.slice(0, 50).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleLinkPolicy(p.id)}
                    disabled={linkingPolicy === p.id}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-white transition-colors disabled:opacity-50"
                  >
                    <span className="font-mono font-bold text-updraft-deep shrink-0">{p.reference}</span>
                    <span className="truncate text-gray-700">{p.name}</span>
                    <Plus size={10} className="ml-auto shrink-0 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {regulation.policyLinks && regulation.policyLinks.length > 0 ? (
            <div className="space-y-1.5">
              {regulation.policyLinks.map((link) => {
                const policy = policies.find((p) => p.id === link.policyId);
                return (
                  <div key={link.id || link.policyId} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1.5">
                    <EntityLink
                      type="policy"
                      id={link.policyId}
                      reference={policy?.reference}
                      label={policy?.name ?? "Unknown policy"}
                    />
                    {canEdit && (
                      <button
                        onClick={() => handleUnlinkPolicy(link.policyId)}
                        className="ml-auto rounded p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Unlink policy"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No policies linked</p>
          )}
        </section>

        {/* Linked Controls */}
        <section className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <ShieldCheck size={12} className="inline mr-1" />
              Linked Controls ({regulation.controlLinks?.length ?? 0})
            </h4>
            {canEdit && (
              <button
                onClick={() => { setShowControlPicker((v) => !v); setCtrlSearch(""); }}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Link2 size={10} /> Link Control
              </button>
            )}
          </div>

          {/* Control picker */}
          {showControlPicker && (
            <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5 space-y-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={ctrlSearch}
                  onChange={(e) => setCtrlSearch(e.target.value)}
                  placeholder="Search controls..."
                  className="w-full rounded-lg border border-gray-200 pl-7 pr-2 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
                  autoFocus
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {unlinkedControls.length === 0 && (
                  <p className="text-[11px] text-gray-400 py-2 text-center">No unlinked controls found</p>
                )}
                {unlinkedControls.slice(0, 50).map((ctrl) => (
                  <button
                    key={ctrl.id}
                    onClick={() => handleLinkControl(ctrl.id)}
                    disabled={linkingCtrl === ctrl.id}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-white transition-colors disabled:opacity-50"
                  >
                    <span className="font-mono font-bold text-updraft-deep shrink-0">{ctrl.controlRef}</span>
                    <span className="truncate text-gray-700">{ctrl.controlName}</span>
                    <Plus size={10} className="ml-auto shrink-0 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {regulation.controlLinks && regulation.controlLinks.length > 0 ? (
            <div className="space-y-1.5">
              {regulation.controlLinks.map((link) => {
                const control = controls.find((c) => c.id === link.controlId) ??
                  (link as { controlId: string; control?: { id: string; controlRef: string; controlName: string } }).control;
                const ctrlId = link.controlId;
                const ctrlRef = (control as { controlRef?: string } | undefined)?.controlRef;
                const ctrlName = (control as { controlName?: string } | undefined)?.controlName ?? "Unknown control";
                return (
                  <div key={ctrlId} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1.5">
                    <EntityLink
                      type="control"
                      id={ctrlId}
                      reference={ctrlRef}
                      label={ctrlName}
                    />
                    {canEdit && (
                      <button
                        onClick={() => handleUnlinkControl(ctrlId)}
                        className="ml-auto rounded p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Unlink control"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No controls linked</p>
          )}
        </section>

        {/* Linked Processes */}
        {regulation && (() => {
          const linked = allProcesses.filter((p) =>
            p.regulationLinks?.some((l) => l.regulationId === regulation.id)
          );
          if (linked.length === 0) return null;
          return (
            <section className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <Layers size={12} className="inline mr-1" />
                Linked Processes ({linked.length})
              </h4>
              <div className="space-y-1.5">
                {linked.map((proc) => (
                  <div key={proc.id} className="flex items-center gap-2 bg-teal-50 rounded px-2 py-1.5">
                    <EntityLink type="process" id={proc.id} reference={proc.reference} label={proc.name} />
                    <div className="ml-auto shrink-0">
                      <MaturityBadge score={proc.maturityScore} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Change History (collapsible) */}
        <section className="border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex w-full items-center gap-2 py-2 text-xs font-semibold text-gray-500 hover:text-updraft-deep transition-colors"
          >
            {historyOpen
              ? <ChevronDown size={13} className="shrink-0" />
              : <ChevronRight size={13} className="shrink-0" />
            }
            <History size={12} className="shrink-0" />
            Change History
          </button>

          {historyOpen && (
            <div className="mt-1 space-y-2 pb-2">
              {historyLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
              ) : historyEvents.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No history recorded yet.</p>
              ) : (
                historyEvents.map((ev) => (
                  <HistoryEventRow key={ev.id} event={ev} />
                ))
              )}
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); setEditMode(false); }}
        title="Unsaved changes"
        message="You have unsaved changes. Discard them and close?"
        confirmLabel="Discard changes"
        variant="warning"
      />
    </div>
  );
}

function HistoryEventRow({ event }: { event: RegulationHistoryEvent }) {
  const dotColour =
    event.type === "status_change" ? "bg-blue-500" :
    event.type === "control_linked" ? "bg-green-500" :
    event.type === "policy_linked" ? "bg-purple-500" :
    "bg-gray-400";

  const dateStr = new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  function fieldLabel(f: string) {
    const MAP: Record<string, string> = {
      complianceStatus: "Compliance Status",
      assessmentNotes: "Assessment Notes",
      applicability: "Applicability",
      applicabilityNotes: "Applicability Notes",
      primarySMF: "Primary SMF",
      secondarySMF: "Secondary SMF",
      smfNotes: "SMF Notes",
      description: "Description",
      provisions: "Provisions",
      nextReviewDate: "Next Review Date",
    };
    return MAP[f] ?? f;
  }

  return (
    <div className="flex gap-2">
      <div className="flex flex-col items-center shrink-0 pt-1">
        <div className={cn("w-2 h-2 rounded-full shrink-0", dotColour)} />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      <div className="pb-2 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-400">{dateStr}</span>
          <span className="text-[10px] font-medium text-gray-600">{event.userName}</span>
        </div>
        {event.type === "status_change" && (
          <p className="text-xs text-gray-700 mt-0.5">
            Status: <span className="text-gray-400 line-through">{event.from}</span>
            {" → "}
            <span className="font-medium text-updraft-deep">{event.to}</span>
          </p>
        )}
        {event.type === "field_updated" && event.field && (
          <p className="text-xs text-gray-700 mt-0.5">
            Updated <span className="font-medium">{fieldLabel(event.field)}</span>
            {event.from != null && event.to != null && (
              <span className="text-gray-400"> ({event.from} → {event.to})</span>
            )}
          </p>
        )}
        {(event.type === "control_linked" || event.type === "control_unlinked") && (
          <p className="text-xs text-gray-700 mt-0.5">
            {event.type === "control_linked" ? "Linked control" : "Unlinked control"}{" "}
            {event.entityRef && <span className="font-mono font-bold text-updraft-deep">{event.entityRef}</span>}
            {event.entityName && <span className="text-gray-500"> {event.entityName}</span>}
          </p>
        )}
        {(event.type === "policy_linked" || event.type === "policy_unlinked") && (
          <p className="text-xs text-gray-700 mt-0.5">
            {event.type === "policy_linked" ? "Linked policy" : "Unlinked policy"}{" "}
            {event.entityRef && <span className="font-mono font-bold text-updraft-deep">{event.entityRef}</span>}
            {event.entityName && <span className="text-gray-500"> {event.entityName}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
