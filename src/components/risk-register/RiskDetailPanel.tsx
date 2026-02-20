"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Risk, RiskControl, RiskMitigation, ControlEffectiveness, RiskAppetite, DirectionOfTravel, MitigationStatus, ActionPriority } from "@/lib/types";
import { RISK_ACCEPTANCE_STATUS_LABELS, RISK_ACCEPTANCE_STATUS_COLOURS } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import {
  LIKELIHOOD_SCALE,
  IMPACT_SCALE,
  EFFECTIVENESS_DISPLAY,
  APPETITE_DISPLAY,
  DIRECTION_DISPLAY,
  RISK_CATEGORIES as FALLBACK_CATEGORIES,
  getL2Categories as getFallbackL2,
} from "@/lib/risk-categories";
import ScoreBadge from "./ScoreBadge";
import { X, Plus, Trash2, AlertTriangle, ChevronRight, ChevronDown, History, Link2, ShieldQuestion, Star } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useHasPermission } from "@/lib/usePermission";
import EntityLink from "@/components/common/EntityLink";
import RequestEditAccessButton from "@/components/common/RequestEditAccessButton";

interface RiskDetailPanelProps {
  risk: Risk | null;
  isNew: boolean;
  onSave: (data: Partial<Risk> & { controls?: Partial<RiskControl>[]; mitigations?: Partial<RiskMitigation>[] }) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onViewHistory?: (risk: Risk) => void;
}

interface FormControl {
  id?: string;
  description: string;
  controlOwner: string;
}

interface FormMitigation {
  id?: string;
  action: string;
  owner: string;
  deadline: string;
  status: MitigationStatus;
  priority: string;
  actionId?: string | null;
}

export default function RiskDetailPanel({ risk, isNew, onSave, onClose, onDelete, onViewHistory }: RiskDetailPanelProps) {
  const router = useRouter();
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const storeCategories = useAppStore((s) => s.riskCategories);
  const priorityDefinitions = useAppStore((s) => s.priorityDefinitions);
  const riskAcceptances = useAppStore((s) => s.riskAcceptances);
  const storeControls = useAppStore((s) => s.controls);
  const toggleRiskInFocus = useAppStore((s) => s.toggleRiskInFocus);
  const linkControlToRisk = useAppStore((s) => s.linkControlToRisk);
  const unlinkControlFromRisk = useAppStore((s) => s.unlinkControlFromRisk);
  const isCCRO = currentUser?.role === "CCRO_TEAM";
  const canToggleFocus = useHasPermission("can:toggle-risk-focus");
  const canEditRisk = useHasPermission("edit:risk");
  const canBypassApproval = useHasPermission("can:bypass-approval");

  const activeUsers = users.filter((u) => u.isActive !== false);
  const PRIORITY_OPTIONS: { value: ActionPriority; label: string }[] =
    priorityDefinitions.length > 0
      ? priorityDefinitions.map((d) => ({ value: d.code as ActionPriority, label: `${d.code} — ${d.label}` }))
      : [
          { value: "P1", label: "P1 — Critical" },
          { value: "P2", label: "P2 — Important" },
          { value: "P3", label: "P3 — Routine" },
        ];

  // Use DB categories if available, fallback to hardcoded
  const categorySource = storeCategories.length > 0
    ? storeCategories.map((c) => ({ name: c.name, subcategories: c.children?.map((ch) => ({ name: ch.name })) ?? [] }))
    : FALLBACK_CATEGORIES;
  const getL2Options = (l1Name: string) => {
    if (storeCategories.length > 0) {
      const parent = storeCategories.find((c) => c.name === l1Name);
      return parent?.children?.map((ch) => ({ name: ch.name })) ?? [];
    }
    return getFallbackL2(l1Name);
  };
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryL1, setCategoryL1] = useState("");
  const [categoryL2, setCategoryL2] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [inherentLikelihood, setInherentLikelihood] = useState(3);
  const [inherentImpact, setInherentImpact] = useState(3);
  const [residualLikelihood, setResidualLikelihood] = useState(2);
  const [residualImpact, setResidualImpact] = useState(2);
  const [controlEffectiveness, setControlEffectiveness] = useState<ControlEffectiveness | "">("");
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite | "">("");
  const [directionOfTravel, setDirectionOfTravel] = useState<DirectionOfTravel>("STABLE");
  const [lastReviewed, setLastReviewed] = useState(new Date().toISOString().split("T")[0]);
  const [reviewFrequencyDays, setReviewFrequencyDays] = useState(90);
  const [controls, setControls] = useState<FormControl[]>([]);
  const [mitigations, setMitigations] = useState<FormMitigation[]>([]);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [mitigationsOpen, setMitigationsOpen] = useState(false);
  const [libraryControlsOpen, setLibraryControlsOpen] = useState(false);
  const [libCtrlSearch, setLibCtrlSearch] = useState("");

  // Populate form when risk changes
  useEffect(() => {
    if (risk && !isNew) {
      setName(risk.name);
      setDescription(risk.description);
      setCategoryL1(risk.categoryL1);
      setCategoryL2(risk.categoryL2);
      setOwnerId(risk.ownerId);
      setInherentLikelihood(risk.inherentLikelihood);
      setInherentImpact(risk.inherentImpact);
      setResidualLikelihood(risk.residualLikelihood);
      setResidualImpact(risk.residualImpact);
      setControlEffectiveness(risk.controlEffectiveness ?? "");
      setRiskAppetite(risk.riskAppetite ?? "");
      setDirectionOfTravel(risk.directionOfTravel);
      setReviewFrequencyDays(risk.reviewFrequencyDays ?? 90);
      setLastReviewed(risk.lastReviewed.split("T")[0]);
      setControls(risk.controls?.map((c) => ({ id: c.id, description: c.description, controlOwner: c.controlOwner ?? "" })) ?? []);
      setMitigations(risk.mitigations?.map((m) => ({
        id: m.id, action: m.action, owner: m.owner ?? "",
        deadline: m.deadline ? m.deadline.split("T")[0] : "", status: m.status,
        priority: m.priority ?? "",
        actionId: m.actionId,
      })) ?? []);
    }
  }, [risk, isNew]);

  const l2Options = getL2Options(categoryL1);
  const residualWarning = residualLikelihood > inherentLikelihood || residualImpact > inherentImpact;

  function handleSave() {
    const data: Record<string, unknown> = {
      name, description, categoryL1, categoryL2, ownerId,
      inherentLikelihood, inherentImpact, residualLikelihood, residualImpact,
      directionOfTravel, reviewFrequencyDays, lastReviewed,
      controlEffectiveness: controlEffectiveness || null,
      riskAppetite: riskAppetite || null,
      controls: controls.filter((c) => c.description.trim()).map((c, i) => ({
        description: c.description, controlOwner: c.controlOwner || null, sortOrder: i,
      })),
      mitigations: mitigations.filter((m) => m.action.trim()).map((m) => ({
        action: m.action, owner: m.owner || null,
        deadline: m.deadline || null, status: m.status,
        priority: m.priority || null,
      })),
    };
    onSave(data as Partial<Risk> & { controls?: Partial<RiskControl>[]; mitigations?: Partial<RiskMitigation>[] });
  }

  const [proposing, setProposing] = useState(false);

  async function handleProposeUpdate() {
    if (!risk) return;
    setProposing(true);
    try {
      // Compute diff between form state and original risk
      const changes: { fieldChanged: string; oldValue: string | null; newValue: string | null }[] = [];
      const fieldMap: [string, string | null, string | null][] = [
        ["name", risk.name, name],
        ["description", risk.description, description],
        ["categoryL1", risk.categoryL1, categoryL1],
        ["categoryL2", risk.categoryL2, categoryL2],
        ["ownerId", risk.ownerId, ownerId],
        ["inherentLikelihood", String(risk.inherentLikelihood), String(inherentLikelihood)],
        ["inherentImpact", String(risk.inherentImpact), String(inherentImpact)],
        ["residualLikelihood", String(risk.residualLikelihood), String(residualLikelihood)],
        ["residualImpact", String(risk.residualImpact), String(residualImpact)],
        ["controlEffectiveness", risk.controlEffectiveness ?? null, controlEffectiveness || null],
        ["riskAppetite", risk.riskAppetite ?? null, riskAppetite || null],
        ["directionOfTravel", risk.directionOfTravel, directionOfTravel],
        ["reviewFrequencyDays", String(risk.reviewFrequencyDays), String(reviewFrequencyDays)],
        ["lastReviewed", risk.lastReviewed.split("T")[0], lastReviewed],
      ];
      for (const [field, oldVal, newVal] of fieldMap) {
        if (oldVal !== newVal) {
          changes.push({ fieldChanged: field, oldValue: oldVal, newValue: newVal });
        }
      }

      if (changes.length === 0) {
        toast.info("No changes detected");
        setProposing(false);
        return;
      }

      await api(`/api/risks/${risk.id}/changes`, { method: "POST", body: changes });
      toast.success("Update proposed — awaiting CCRO review");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to propose update");
    } finally {
      setProposing(false);
    }
  }

  const canSave = name.trim() && description.trim() && categoryL1 && categoryL2 && ownerId;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-0.5">Risk Register {risk && !isNew ? `› ${risk.reference}` : ""}</p>
            <h2 className="text-lg font-poppins font-semibold text-gray-900 truncate">
              {isNew ? "Add New Risk" : `Edit: ${risk?.name ?? risk?.reference}`}
            </h2>
            {risk && !isNew && (
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block font-mono text-[11px] font-bold text-updraft-deep bg-updraft-pale-purple/30 px-1.5 py-0.5 rounded">
                  {risk.reference}
                </span>
                {canToggleFocus && (
                  <button
                    onClick={() => toggleRiskInFocus(risk.id, !risk.inFocus)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors hover:bg-amber-50"
                    title={risk.inFocus ? "Remove from Focus" : "Mark as Risk in Focus"}
                  >
                    <Star className={`w-3.5 h-3.5 ${risk.inFocus ? "text-amber-400 fill-amber-400" : "text-gray-400"}`} />
                    <span className={risk.inFocus ? "text-amber-600" : "text-gray-400"}>
                      {risk.inFocus ? "In Focus" : "Focus"}
                    </span>
                  </button>
                )}
                {!canToggleFocus && risk.inFocus && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-amber-600 bg-amber-50">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    In Focus
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  Last updated {new Date(risk.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!canEditRisk && !isNew && risk && (
              <RequestEditAccessButton
                permission="edit:risks"
                entityType="Risk"
                entityId={risk.id}
                entityName={`${risk.reference} – ${risk.name}`}
              />
            )}
            {risk && !isNew && onViewHistory && (
              <button
                onClick={() => onViewHistory(risk)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-updraft-bright-purple hover:bg-updraft-pale-purple/20 rounded-lg transition-colors"
                title="View 12-month history"
              >
                <History className="w-4 h-4" />
                History
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Approval info banner */}
          {isNew && !canBypassApproval && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700">
                This risk will be submitted for CCRO approval before becoming visible to all users.
              </span>
            </div>
          )}

          {/* Basic Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-updraft-deep text-white flex items-center justify-center text-xs">1</span>
              Risk Details
            </h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Risk Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Short risk title"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed risk description — cause, event, potential impact"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">L1 Category *</label>
                <select
                  value={categoryL1}
                  onChange={(e) => { setCategoryL1(e.target.value); setCategoryL2(""); }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">Select category...</option>
                  {categorySource.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">L2 Sub-Category *</label>
                <select
                  value={categoryL2}
                  onChange={(e) => setCategoryL2(e.target.value)}
                  disabled={!categoryL1}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Select sub-category...</option>
                  {l2Options.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Risk Owner *</label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
                >
                  <option value="">Select owner...</option>
                  {users.filter((u) => u.isActive).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Last Reviewed</label>
                <input
                  type="date"
                  value={lastReviewed}
                  onChange={(e) => setLastReviewed(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* Inherent Assessment */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs">2</span>
              Inherent Risk Assessment
              <span className="text-[10px] text-gray-400 font-normal">(before controls)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <ScoreSelector
                label="Likelihood"
                value={inherentLikelihood}
                onChange={setInherentLikelihood}
                options={LIKELIHOOD_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.description }))}
              />
              <ScoreSelector
                label="Impact"
                value={inherentImpact}
                onChange={setInherentImpact}
                options={IMPACT_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.description }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Inherent Score:</span>
              <ScoreBadge likelihood={inherentLikelihood} impact={inherentImpact} size="md" />
            </div>
          </section>

          {/* Controls (collapsible) */}
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setControlsOpen(!controlsOpen)}
              className="w-full text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">3</span>
              Controls
              <span className="rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold">{controls.filter((c) => c.description.trim()).length}</span>
              <span className="text-[10px] text-gray-400 font-normal">bridging inherent → residual</span>
              <span className="ml-auto">
                {controlsOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </span>
            </button>
            {controlsOpen && (<>
            {controls.map((ctrl, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={ctrl.description}
                  onChange={(e) => {
                    const next = [...controls];
                    next[i] = { ...next[i], description: e.target.value };
                    setControls(next);
                  }}
                  placeholder="Control description"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
                />
                <select
                  value={ctrl.controlOwner}
                  onChange={(e) => {
                    const next = [...controls];
                    next[i] = { ...next[i], controlOwner: e.target.value };
                    setControls(next);
                  }}
                  className="w-36 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
                >
                  <option value="">Owner...</option>
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setControls(controls.filter((_, j) => j !== i))}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Delete control"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setControls([...controls, { description: "", controlOwner: "" }])}
              className="flex items-center gap-1.5 text-sm text-updraft-bright-purple hover:text-updraft-deep transition-colors"
            >
              <Plus className="w-4 h-4" /> Add control
            </button>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Control Effectiveness</label>
              <select
                value={controlEffectiveness}
                onChange={(e) => setControlEffectiveness(e.target.value as ControlEffectiveness | "")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Not assessed</option>
                {(Object.keys(EFFECTIVENESS_DISPLAY) as ControlEffectiveness[]).map((k) => (
                  <option key={k} value={k}>{EFFECTIVENESS_DISPLAY[k].label}</option>
                ))}
              </select>
            </div>
            </>)}
          </section>

          {/* Library Controls — linked from control library */}
          {risk && !isNew && (
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setLibraryControlsOpen(!libraryControlsOpen)}
              className="w-full text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs">3b</span>
              Library Controls
              <span className="rounded-full bg-teal-100 text-teal-700 px-1.5 py-0.5 text-[10px] font-bold">{risk.controlLinks?.length ?? 0}</span>
              <span className="text-[10px] text-gray-400 font-normal">linked from control library</span>
              <span className="ml-auto">
                {libraryControlsOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </span>
            </button>
            {libraryControlsOpen && (
              <>
                {/* Linked controls list */}
                {(risk.controlLinks ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    {risk.controlLinks!.map((link) => (
                      <div key={link.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                        <span className="font-mono text-[10px] font-bold text-updraft-deep bg-updraft-pale-purple/30 px-1.5 py-0.5 rounded shrink-0">
                          {link.control?.controlRef ?? "CTRL"}
                        </span>
                        <EntityLink
                          type="control"
                          id={link.controlId}
                          reference={link.control?.controlRef ?? "CTRL"}
                          label={link.control?.controlName ?? "Control"}
                        />
                        {link.control?.businessArea?.name && (
                          <span className="text-[10px] text-gray-400 shrink-0">{link.control.businessArea.name}</span>
                        )}
                        {canEditRisk && (
                          <button
                            type="button"
                            onClick={() => unlinkControlFromRisk(risk.id, link.controlId)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                            title="Unlink control"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Search + link */}
                {canEditRisk && (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={libCtrlSearch}
                        onChange={(e) => setLibCtrlSearch(e.target.value)}
                        placeholder="Search control library to link..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 pl-9"
                      />
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    {libCtrlSearch.trim() && (
                      <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-gray-200 bg-white p-2">
                        {(() => {
                          const q = libCtrlSearch.toLowerCase();
                          const linkedIds = new Set((risk.controlLinks ?? []).map((l) => l.controlId));
                          const matches = storeControls.filter(
                            (c) => c.isActive && !linkedIds.has(c.id) && (c.controlRef.toLowerCase().includes(q) || c.controlName.toLowerCase().includes(q))
                          ).slice(0, 10);
                          if (matches.length === 0) return <p className="text-xs text-gray-400 py-2 text-center">No matching controls found</p>;
                          return matches.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                linkControlToRisk(risk.id, c.id, currentUser?.id ?? "");
                                setLibCtrlSearch("");
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-updraft-pale-purple/20 rounded-md transition-colors"
                            >
                              <span className="font-mono font-medium text-updraft-deep whitespace-nowrap">{c.controlRef}</span>
                              <span className="text-gray-600 truncate">{c.controlName}</span>
                              <Plus className="w-3.5 h-3.5 ml-auto text-gray-400 shrink-0" />
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
          )}

          {/* Residual Assessment */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">4</span>
              Residual Risk Assessment
              <span className="text-[10px] text-gray-400 font-normal">(after controls)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <ScoreSelector
                label="Likelihood"
                value={residualLikelihood}
                onChange={setResidualLikelihood}
                options={LIKELIHOOD_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.description }))}
              />
              <ScoreSelector
                label="Impact"
                value={residualImpact}
                onChange={setResidualImpact}
                options={IMPACT_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.description }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Residual Score:</span>
              <ScoreBadge likelihood={residualLikelihood} impact={residualImpact} size="md" />
            </div>
            {residualWarning && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-700">
                  Residual score exceeds inherent score on one or more axes. Controls typically reduce risk — please verify.
                </span>
              </div>
            )}
          </section>

          {/* Inherent → Residual Visual */}
          <section className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">Inherent</div>
                <ScoreBadge likelihood={inherentLikelihood} impact={inherentImpact} size="lg" />
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[10px] text-gray-400 mb-0.5">{controls.filter((c) => c.description.trim()).length} controls</div>
                <div className="w-16 h-0.5 bg-gray-300 relative">
                  <div className="absolute -right-1 -top-1 text-gray-400">→</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">Residual</div>
                <ScoreBadge likelihood={residualLikelihood} impact={residualImpact} size="lg" />
              </div>
            </div>
          </section>

          {/* Direction & Appetite */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs">5</span>
              Additional
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Direction of Travel</label>
                <select
                  value={directionOfTravel}
                  onChange={(e) => setDirectionOfTravel(e.target.value as DirectionOfTravel)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  {(Object.keys(DIRECTION_DISPLAY) as DirectionOfTravel[]).map((k) => (
                    <option key={k} value={k}>{DIRECTION_DISPLAY[k].icon} {DIRECTION_DISPLAY[k].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Risk Appetite</label>
                <select
                  value={riskAppetite}
                  onChange={(e) => setRiskAppetite(e.target.value as RiskAppetite | "")}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">Not set</option>
                  {(Object.keys(APPETITE_DISPLAY) as RiskAppetite[]).map((k) => (
                    <option key={k} value={k}>{APPETITE_DISPLAY[k]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Review Frequency</label>
                <select
                  value={reviewFrequencyDays}
                  onChange={(e) => setReviewFrequencyDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value={30}>Monthly (30 days)</option>
                  <option value={90}>Quarterly (90 days)</option>
                  <option value={180}>Semi-Annual (180 days)</option>
                  <option value={365}>Annual (365 days)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Next Review Due</label>
                <div className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
                  {(() => {
                    const base = lastReviewed ? new Date(lastReviewed) : new Date();
                    const next = new Date(base);
                    next.setDate(next.getDate() + reviewFrequencyDays);
                    const daysUntil = Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const formatted = next.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                    if (daysUntil <= 0) return <span className="text-red-600 font-medium">{formatted} (overdue)</span>;
                    if (daysUntil <= 7) return <span className="text-amber-600 font-medium">{formatted} ({daysUntil}d)</span>;
                    return <span>{formatted} ({daysUntil}d)</span>;
                  })()}
                </div>
              </div>
            </div>
          </section>

          {/* Mitigations (collapsible) */}
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setMitigationsOpen(!mitigationsOpen)}
              className="w-full text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">6</span>
              Mitigation Actions
              <span className="rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-bold">{mitigations.length}</span>
              <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
              <span className="ml-auto">
                {mitigationsOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </span>
            </button>
            {mitigationsOpen && (<>
            {mitigations.map((mit, i) => (
              <div key={i} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                {mit.actionId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-updraft-pale-purple/40 text-updraft-deep rounded-full">
                    <Link2 className="w-3 h-3" /> Linked to Action
                  </span>
                )}
                <div className="flex gap-2">
                  <input
                    value={mit.action}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...next[i], action: e.target.value };
                      setMitigations(next);
                    }}
                    placeholder="Action description"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
                  />
                  <button
                    onClick={() => setMitigations(mitigations.filter((_, j) => j !== i))}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Delete mitigation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={mit.owner}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...next[i], owner: e.target.value };
                      setMitigations(next);
                    }}
                    className="w-36 px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="">Owner...</option>
                    {activeUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <select
                    value={mit.priority}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...next[i], priority: e.target.value };
                      setMitigations(next);
                    }}
                    className="w-32 px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="">Priority...</option>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={mit.deadline}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...next[i], deadline: e.target.value };
                      setMitigations(next);
                    }}
                    className="w-36 px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                  <select
                    value={mit.status}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...next[i], status: e.target.value as MitigationStatus };
                      setMitigations(next);
                    }}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETE">Complete</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              onClick={() => setMitigations([...mitigations, { action: "", owner: "", deadline: "", status: "OPEN", priority: "" }])}
              className="flex items-center gap-1.5 text-sm text-updraft-bright-purple hover:text-updraft-deep transition-colors"
            >
              <Plus className="w-4 h-4" /> Add mitigation action
            </button>
            {risk && !isNew && (
              <button
                onClick={() => router.push(`/actions?newAction=true&source=${encodeURIComponent("Risk Register")}&metricName=${encodeURIComponent(`${risk.reference}: ${name}`)}&riskId=${risk.id}`)}
                className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-800 transition-colors"
              >
                <Plus className="w-4 h-4" /> Raise formal action
              </button>
            )}
            </>)}
          </section>

          {/* Risk Acceptances */}
          {risk && !isNew && (() => {
            const relatedAcceptances = riskAcceptances.filter((ra) => ra.riskId === risk.id);
            return (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-updraft-bright-purple text-white flex items-center justify-center text-xs">7</span>
                  Risk Acceptances
                  <span className="rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-bold">{relatedAcceptances.length}</span>
                </h3>
                {relatedAcceptances.length > 0 && (
                  <div className="space-y-1">
                    {relatedAcceptances.map((ra) => {
                      const sc = RISK_ACCEPTANCE_STATUS_COLOURS[ra.status];
                      return (
                        <div
                          key={ra.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-xs"
                        >
                          <EntityLink
                            type="risk-acceptance"
                            id={ra.id}
                            reference={ra.reference}
                            label={ra.title}
                          />
                          <span className={`px-1.5 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                            {RISK_ACCEPTANCE_STATUS_LABELS[ra.status]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/risk-acceptances?newFrom=risk&riskId=${risk.id}`)}
                  className="flex items-center gap-1.5 text-sm text-updraft-bright-purple hover:text-updraft-deep transition-colors"
                >
                  <ShieldQuestion className="w-4 h-4" /> Add Risk Acceptance
                </button>
              </section>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            {!isNew && onDelete && (
              <button
                onClick={() => { if (risk && confirm("Delete this risk? This cannot be undone.")) onDelete(risk.id); }}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Delete risk
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {!isNew && !isCCRO ? (
              <button
                onClick={handleProposeUpdate}
                disabled={!canSave || proposing}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {proposing ? "Proposing..." : "Propose Update"}
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!canSave}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  isNew && !canBypassApproval ? "bg-amber-600 hover:bg-amber-700" : "bg-updraft-deep hover:bg-updraft-bar"
                }`}
              >
                {isNew && !canBypassApproval ? "Submit for Approval" : isNew ? "Create Risk" : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Score Selector Sub-Component ──────────────────────────────────────────

function ScoreSelector({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string; description: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="space-y-1">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-updraft-bright-purple bg-updraft-pale-purple/20 ring-1 ring-updraft-bright-purple/30"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span
                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                  isSelected ? "bg-updraft-deep text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {opt.value}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-800">{opt.label}</div>
                <div className="text-[10px] text-gray-400 leading-tight">{opt.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
