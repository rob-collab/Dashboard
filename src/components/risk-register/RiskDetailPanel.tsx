"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Risk, RiskActionLink, ControlEffectiveness, RiskAppetite, DirectionOfTravel, ActionPriority } from "@/lib/types";
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
import { X, Plus, Trash2, AlertTriangle, ChevronRight, ChevronDown, History, Link2, ShieldQuestion, Star, Clock, XCircle, Loader2, Pencil } from "lucide-react";
import { AutoResizeTextarea } from "@/components/common/AutoResizeTextarea";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useHasPermission } from "@/lib/usePermission";
import EntityLink from "@/components/common/EntityLink";
import RequestEditAccessButton from "@/components/common/RequestEditAccessButton";
import GlossaryTooltip from "@/components/common/GlossaryTooltip";
import ConfirmDialog from "@/components/common/ConfirmDialog";

interface RiskDetailPanelProps {
  risk: Risk | null;
  isNew: boolean;
  onSave: (data: Partial<Risk>) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onViewHistory?: (risk: Risk) => void;
}

export default function RiskDetailPanel({ risk, isNew, onSave, onClose, onDelete, onViewHistory }: RiskDetailPanelProps) {
  const prefersReduced = useReducedMotion();
  const router = useRouter();
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const risks = useAppStore((s) => s.risks);
  const setRisks = useAppStore((s) => s.setRisks);
  const storeCategories = useAppStore((s) => s.riskCategories);
  const priorityDefinitions = useAppStore((s) => s.priorityDefinitions);
  const riskAcceptances = useAppStore((s) => s.riskAcceptances);
  const storeControls = useAppStore((s) => s.controls);
  const controlBusinessAreas = useAppStore((s) => s.controlBusinessAreas);
  const toggleRiskInFocus = useAppStore((s) => s.toggleRiskInFocus);
  const linkControlToRisk = useAppStore((s) => s.linkControlToRisk);
  const unlinkControlFromRisk = useAppStore((s) => s.unlinkControlFromRisk);
  const linkActionToRisk = useAppStore((s) => s.linkActionToRisk);
  const unlinkActionFromRisk = useAppStore((s) => s.unlinkActionFromRisk);
  const actions = useAppStore((s) => s.actions);
  const pushNavigationStack = useAppStore((s) => s.pushNavigationStack);
  const isCCRO = currentUser?.role === "CCRO_TEAM";
  const canToggleFocus = useHasPermission("can:toggle-risk-focus");
  const canEditRisk = useHasPermission("edit:risk");
  const canBypassApproval = useHasPermission("can:bypass-approval");
  const canRaiseAction = useHasPermission("create:action");

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
  const [controlsOpen, setControlsOpen] = useState(false);
  const [linkedActionsOpen, setLinkedActionsOpen] = useState(false);
  const [showRaiseAction, setShowRaiseAction] = useState(false);
  const [showLinkAction, setShowLinkAction] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionAssignee, setActionAssignee] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionPriority, setActionPriority] = useState<ActionPriority | "">("");
  const [actionSearch, setActionSearch] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [raiseActionAttempted, setRaiseActionAttempted] = useState(false);
  const [confirmUnlinkActionId, setConfirmUnlinkActionId] = useState<string | null>(null);
  const [libCtrlSearch, setLibCtrlSearch] = useState("");
  const [libCtrlAreaFilter, setLibCtrlAreaFilter] = useState<string>("");

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
      setConfirmUnlinkActionId(null);
    }
  }, [risk, isNew]);

  const l2Options = getL2Options(categoryL1);
  const residualWarning = residualLikelihood > inherentLikelihood || residualImpact > inherentImpact;

  const [riskSaveState, setRiskSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDeleteRisk, setConfirmDeleteRisk] = useState(false);

  // Edit-unlock state — new risks start in edit mode; existing risks start in read mode
  const [isEditing, setIsEditing] = useState(isNew);
  const fieldsLocked = !isEditing && !isNew;

  const isDirty = !isNew && risk != null && (
    name !== risk.name ||
    description !== risk.description ||
    categoryL1 !== risk.categoryL1 ||
    categoryL2 !== risk.categoryL2 ||
    ownerId !== risk.ownerId ||
    inherentLikelihood !== risk.inherentLikelihood ||
    inherentImpact !== risk.inherentImpact ||
    residualLikelihood !== risk.residualLikelihood ||
    residualImpact !== risk.residualImpact ||
    directionOfTravel !== risk.directionOfTravel ||
    controlEffectiveness !== (risk.controlEffectiveness ?? "") ||
    riskAppetite !== (risk.riskAppetite ?? "")
  );

  function handleCancel() {
    if (isDirty) { setConfirmDiscard(true); } else { onClose(); }
  }

  function validateRisk(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Risk name is required";
    if (!categoryL1) errs.categoryL1 = "L1 category is required";
    if (!categoryL2) errs.categoryL2 = "L2 sub-category is required";
    if (!ownerId) errs.ownerId = "Risk owner is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (riskSaveState !== "idle") return;
    if (!validateRisk()) return;
    const data: Record<string, unknown> = {
      name, description, categoryL1, categoryL2, ownerId,
      inherentLikelihood, inherentImpact, residualLikelihood, residualImpact,
      directionOfTravel, reviewFrequencyDays, lastReviewed,
      controlEffectiveness: controlEffectiveness || null,
      riskAppetite: riskAppetite || null,
    };

    if (!isNew && risk) {
      // Explicit save: await the API call directly so failures surface to the user
      setRiskSaveState("saving");
      try {
        const updated = await api<Risk>(`/api/risks/${risk.id}`, {
          method: "PATCH",
          body: data,
        });
        setRisks(risks.map((r) => (r.id === risk.id ? { ...r, ...updated } : r)));
        toast.success("Risk saved");
        onClose();
      } catch {
        toast.error("Failed to save risk — please try again");
      } finally {
        setRiskSaveState("idle");
      }
    } else {
      // New risk: delegate to parent which builds the full Risk object and calls addRisk
      setRiskSaveState("saving");
      onSave(data as Partial<Risk>);
      await new Promise((r) => setTimeout(r, 400));
      setRiskSaveState("saved");
      await new Promise((r) => setTimeout(r, 600));
      setRiskSaveState("idle");
    }
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

  async function handleRaiseAction() {
    if (!risk || submittingAction) return;
    setRaiseActionAttempted(true);
    if (!actionTitle.trim() || !actionAssignee) return;
    setSubmittingAction(true);
    try {
      const link = await api<RiskActionLink>(`/api/risks/${risk.id}/action-links`, {
        method: "POST",
        body: {
          title: actionTitle.trim(),
          assignedTo: actionAssignee,
          dueDate: actionDueDate || null,
          priority: actionPriority || null,
        },
      });
      linkActionToRisk(risk.id, link);
      toast.success("Action raised and linked");
      setShowRaiseAction(false);
      setActionTitle("");
      setActionAssignee("");
      setActionDueDate("");
      setActionPriority("");
      setRaiseActionAttempted(false);
    } catch (err) {
      console.error("[raise action]", err);
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg && !msg.toLowerCase().includes("internal") ? `Failed to raise action: ${msg}` : "Failed to raise action — please try again");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleLinkExistingAction(actionId: string) {
    if (!risk || submittingAction) return;
    setSubmittingAction(true);
    try {
      const link = await api<RiskActionLink>(`/api/risks/${risk.id}/action-links`, {
        method: "POST",
        body: { actionId },
      });
      linkActionToRisk(risk.id, link);
      toast.success("Action linked");
      setShowLinkAction(false);
      setActionSearch("");
    } catch (err) {
      console.error("[link action]", err);
      toast.error("Failed to link action — please try again");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleUnlinkAction(actionId: string) {
    if (!risk) return;
    try {
      await api(`/api/risks/${risk.id}/action-links/${actionId}`, { method: "DELETE" });
      unlinkActionFromRisk(risk.id, actionId);
      toast.success("Action unlinked");
      setConfirmUnlinkActionId(null);
    } catch {
      toast.error("Failed to unlink action — please try again");
    }
  }

  const canSave = name.trim() && description.trim() && categoryL1 && categoryL2 && ownerId;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={handleCancel} />

      {/* Panel */}
      <motion.div
        className="relative w-[min(800px,95vw)] panel-surface shadow-2xl overflow-y-auto"
        initial={prefersReduced ? false : { x: "100%" }}
        animate={prefersReduced ? false : { x: 0 }}
        transition={prefersReduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30 }}
        style={{ willChange: "transform" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-updraft-deep to-updraft-bar px-6 py-4 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium mb-0.5">Risk Register {risk && !isNew ? `› ${risk.reference}` : ""}</p>
            <h2 className="text-lg font-poppins font-semibold text-white truncate">
              {isNew ? "Add New Risk" : `Edit: ${risk?.name ?? risk?.reference}`}
            </h2>
            {risk && !isNew && (
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block font-mono text-[11px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded">
                  {risk.reference}
                </span>
                {canToggleFocus && (
                  <button
                    onClick={() => toggleRiskInFocus(risk.id, !risk.inFocus)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors hover:bg-white/10"
                    title={risk.inFocus ? "Remove from Focus" : "Mark as Risk in Focus"}
                  >
                    <Star className={`w-3.5 h-3.5 ${risk.inFocus ? "text-amber-400 fill-amber-400" : "text-white/50"}`} />
                    <span className={risk.inFocus ? "text-amber-300" : "text-white/50"}>
                      {risk.inFocus ? "In Focus" : "Focus"}
                    </span>
                  </button>
                )}
                {!canToggleFocus && risk.inFocus && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-amber-300 bg-white/10">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    In Focus
                  </span>
                )}
                <span className="text-xs text-white/50">
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
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                title="View 12-month history"
              >
                <History className="w-4 h-4" />
                History
              </button>
            )}
            {/* Edit unlock button — visible for saved risks only */}
            {!isNew && canEditRisk && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                title="Edit this risk"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
            {!isNew && isEditing && (
              <button
                onClick={() => { setIsEditing(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                title="Cancel editing"
              >
                <XCircle className="w-4 h-4" /> Cancel
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors" aria-label="Close">
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Approval info banner — new risk */}
          {isNew && !canBypassApproval && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700">
                This risk will be submitted for CCRO approval before becoming visible to all users.
              </span>
            </div>
          )}

          {/* Approval status banner — existing risk awaiting approval */}
          {!isNew && risk?.approvalStatus === "PENDING_APPROVAL" && (
            <div className="sticky top-0 z-10 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Pending Approval</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Submitted by{" "}
                  <strong>{users.find((u) => u.id === risk.createdBy)?.name ?? "Unknown"}</strong>
                  {" "}· awaiting CCRO review before this risk is visible to all users.
                </p>
              </div>
            </div>
          )}

          {/* Approval status banner — existing risk rejected */}
          {!isNew && risk?.approvalStatus === "REJECTED" && (() => {
            const rejectedChange = [...(risk.changes ?? [])]
              .filter((c) => c.status === "REJECTED")
              .sort((a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime())[0];
            return (
              <div className="sticky top-0 z-10 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800">Rejected</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    Submitted by{" "}
                    <strong>{users.find((u) => u.id === risk.createdBy)?.name ?? "Unknown"}</strong>
                  </p>
                  {rejectedChange?.reviewNote && (
                    <p className="text-xs text-red-700 mt-1 italic">Reason: {rejectedChange.reviewNote}</p>
                  )}
                </div>
              </div>
            );
          })()}

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
                onChange={(e) => { setName(e.target.value); if (formErrors.name) setFormErrors((p) => ({ ...p, name: "" })); }}
                placeholder="Short risk title"
                disabled={fieldsLocked}
                className={cn("w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-600", formErrors.name ? "border-red-300 focus:ring-red-300/30" : "border-gray-200 focus:ring-updraft-bright-purple/30")}
              />
              {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
              <AutoResizeTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed risk description — cause, event, potential impact"
                disabled={fieldsLocked}
                minRows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">L1 Category *</label>
                <select
                  value={categoryL1}
                  onChange={(e) => { setCategoryL1(e.target.value); setCategoryL2(""); if (formErrors.categoryL1) setFormErrors((p) => ({ ...p, categoryL1: "" })); }}
                  disabled={fieldsLocked}
                  className={cn("w-full px-3 py-2 text-sm border rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-600", formErrors.categoryL1 ? "border-red-300" : "border-gray-200")}
                >
                  <option value="">Select category...</option>
                  {categorySource.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {formErrors.categoryL1 && <p className="text-xs text-red-500 mt-1">{formErrors.categoryL1}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">L2 Sub-Category *</label>
                <select
                  value={categoryL2}
                  onChange={(e) => { setCategoryL2(e.target.value); if (formErrors.categoryL2) setFormErrors((p) => ({ ...p, categoryL2: "" })); }}
                  disabled={fieldsLocked || !categoryL1}
                  className={cn("w-full px-3 py-2 text-sm border rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-400", formErrors.categoryL2 ? "border-red-300" : "border-gray-200")}
                >
                  <option value="">Select sub-category...</option>
                  {l2Options.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {formErrors.categoryL2 && <p className="text-xs text-red-500 mt-1">{formErrors.categoryL2}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Risk Owner *</label>
                <select
                  value={ownerId}
                  onChange={(e) => { setOwnerId(e.target.value); if (formErrors.ownerId) setFormErrors((p) => ({ ...p, ownerId: "" })); }}
                  disabled={fieldsLocked}
                  className={cn("w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-600", formErrors.ownerId ? "border-red-300 focus:ring-red-300/30" : "border-gray-200 focus:ring-updraft-bright-purple/30")}
                >
                  <option value="">Select owner...</option>
                  {users.filter((u) => u.isActive).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                {formErrors.ownerId && <p className="text-xs text-red-500 mt-1">{formErrors.ownerId}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Last Reviewed</label>
                <input
                  type="date"
                  value={lastReviewed}
                  onChange={(e) => setLastReviewed(e.target.value)}
                  disabled={fieldsLocked}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-600"
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
                disabled={fieldsLocked}
                options={LIKELIHOOD_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.description }))}
              />
              <ScoreSelector
                label="Impact"
                value={inherentImpact}
                onChange={setInherentImpact}
                disabled={fieldsLocked}
                options={IMPACT_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.description }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Inherent Score:</span>
              <ScoreBadge likelihood={inherentLikelihood} impact={inherentImpact} size="md" />
            </div>
          </section>

          {/* Residual Assessment */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">3</span>
              Residual Risk Assessment
              <span className="text-[10px] text-gray-400 font-normal">(after controls)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <ScoreSelector
                label="Likelihood"
                value={residualLikelihood}
                onChange={setResidualLikelihood}
                disabled={fieldsLocked}
                options={LIKELIHOOD_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.description }))}
              />
              <ScoreSelector
                label="Impact"
                value={residualImpact}
                onChange={setResidualImpact}
                disabled={fieldsLocked}
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
                <div className="text-[10px] text-gray-400 mb-0.5">{risk?.controlLinks?.length ?? 0} controls</div>
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

          {/* Controls (collapsible) */}
          {/* Controls — unified: inline (risk-specific) + library (linked) */}
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setControlsOpen(!controlsOpen)}
              className="w-full text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">4</span>
              Controls
              <span className="rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold">
                {risk?.controlLinks?.length ?? 0}
              </span>
              <span className="text-[10px] text-gray-400 font-normal">bridging inherent → residual</span>
              <span className="ml-auto">
                {controlsOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </span>
            </button>
            {controlsOpen && (
              <div className="space-y-4">
                {/* Control Library — shared controls linked from the Controls Library */}
                {risk && !isNew && (
                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                      Control Library
                      <span className="ml-1.5 rounded-full bg-blue-50 text-blue-500 px-1.5 py-0.5 text-[10px] font-bold normal-case">{risk.controlLinks?.length ?? 0}</span>
                      <span className="ml-1 text-gray-400 font-normal normal-case">— shared controls linked from library</span>
                    </p>
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
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all ml-auto"
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
                        {controlBusinessAreas.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setLibCtrlAreaFilter("")}
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors ${!libCtrlAreaFilter ? "bg-updraft-deep text-white border-updraft-deep" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                            >
                              All areas
                            </button>
                            {controlBusinessAreas.filter((a) => a.isActive).map((area) => (
                              <button
                                key={area.id}
                                type="button"
                                onClick={() => setLibCtrlAreaFilter(libCtrlAreaFilter === area.id ? "" : area.id)}
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors ${libCtrlAreaFilter === area.id ? "bg-updraft-bright-purple/20 text-updraft-deep border-updraft-bright-purple/40" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                              >
                                {area.name}
                              </button>
                            ))}
                          </div>
                        )}
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
                        {(libCtrlSearch.trim() || libCtrlAreaFilter) && (
                          <div className="max-h-52 overflow-y-auto space-y-1 rounded-lg border border-gray-200 bg-white p-2">
                            {(() => {
                              const q = libCtrlSearch.toLowerCase();
                              const linkedIds = new Set((risk.controlLinks ?? []).map((l) => l.controlId));
                              const matches = storeControls.filter((c) => {
                                if (!c.isActive) return false;
                                if (libCtrlAreaFilter && c.businessAreaId !== libCtrlAreaFilter) return false;
                                if (q && !c.controlRef.toLowerCase().includes(q) && !c.controlName.toLowerCase().includes(q)) return false;
                                return true;
                              });
                              if (matches.length === 0) return <p className="text-xs text-gray-400 py-2 text-center">No matching controls found</p>;
                              return matches.slice(0, 25).map((c) => {
                                const alreadyLinked = linkedIds.has(c.id);
                                const areaName = controlBusinessAreas.find((a) => a.id === c.businessAreaId)?.name;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    disabled={alreadyLinked}
                                    onClick={() => {
                                      if (!alreadyLinked) {
                                        linkControlToRisk(risk.id, c.id, currentUser?.id ?? "");
                                        setLibCtrlSearch("");
                                      }
                                    }}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs rounded-md transition-colors ${alreadyLinked ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:bg-updraft-pale-purple/20"}`}
                                  >
                                    <span className="font-mono font-medium text-updraft-deep whitespace-nowrap">{c.controlRef}</span>
                                    <span className="text-gray-600 truncate flex-1">{c.controlName}</span>
                                    {areaName && <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">{areaName}</span>}
                                    {alreadyLinked
                                      ? <span className="text-[10px] text-blue-600 font-medium whitespace-nowrap shrink-0">Linked</span>
                                      : <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    }
                                  </button>
                                );
                              });
                            })()}
                            {storeControls.filter((c) => {
                              if (!c.isActive) return false;
                              if (libCtrlAreaFilter && c.businessAreaId !== libCtrlAreaFilter) return false;
                              const q = libCtrlSearch.toLowerCase();
                              if (q && !c.controlRef.toLowerCase().includes(q) && !c.controlName.toLowerCase().includes(q)) return false;
                              return true;
                            }).length > 25 && (
                              <p className="text-[10px] text-gray-400 text-center pt-1 border-t border-gray-100">Showing first 25 — refine search to narrow results</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Direction & Appetite */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs">5</span>
              Additional
            </h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Overall Control Effectiveness</label>
              <select
                value={controlEffectiveness}
                onChange={(e) => setControlEffectiveness(e.target.value as ControlEffectiveness | "")}
                disabled={fieldsLocked}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-600"
              >
                <option value="">Not assessed</option>
                {(Object.keys(EFFECTIVENESS_DISPLAY) as ControlEffectiveness[]).map((k) => (
                  <option key={k} value={k}>{EFFECTIVENESS_DISPLAY[k].label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Direction of Travel</label>
                <select
                  value={directionOfTravel}
                  onChange={(e) => setDirectionOfTravel(e.target.value as DirectionOfTravel)}
                  disabled={fieldsLocked}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-600"
                >
                  {(Object.keys(DIRECTION_DISPLAY) as DirectionOfTravel[]).map((k) => (
                    <option key={k} value={k}>{DIRECTION_DISPLAY[k].icon} {DIRECTION_DISPLAY[k].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <GlossaryTooltip term="Appetite">Risk Appetite</GlossaryTooltip>
                </label>
                <select
                  value={riskAppetite}
                  onChange={(e) => setRiskAppetite(e.target.value as RiskAppetite | "")}
                  disabled={fieldsLocked}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-600"
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
                  disabled={fieldsLocked}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-600"
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

          {/* Linked Actions (collapsible) — only for saved risks */}
          {risk && !isNew && (
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setLinkedActionsOpen(!linkedActionsOpen)}
                className="w-full text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">6</span>
                Linked Actions
                <span className="rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-bold">
                  {risk.actionLinks?.length ?? 0}
                </span>
                <span className="text-[10px] text-gray-400 font-normal">tracking mitigation progress</span>
                <span className="ml-auto">
                  {linkedActionsOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </span>
              </button>
              {linkedActionsOpen && (
                <div className="space-y-3">
                  {/* Linked actions list */}
                  {(risk.actionLinks ?? []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">No actions linked yet.</p>
                  )}
                  {(risk.actionLinks ?? []).map((link) => {
                    const action = link.action;
                    if (!action) return null;
                    const isConfirming = confirmUnlinkActionId === link.actionId;
                    const STATUS_LABELS: Record<string, string> = {
                      OPEN: "Open", IN_PROGRESS: "In Progress", COMPLETED: "Completed",
                      PROPOSED_CLOSED: "Proposed Closed", OVERDUE: "Overdue",
                    };
                    const STATUS_COLOURS: Record<string, string> = {
                      OPEN: "bg-blue-50 text-blue-700",
                      IN_PROGRESS: "bg-amber-50 text-amber-700",
                      COMPLETED: "bg-green-50 text-green-700",
                      PROPOSED_CLOSED: "bg-purple-50 text-purple-700",
                      OVERDUE: "bg-red-50 text-red-700",
                    };
                    return (
                      <div key={link.id} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <EntityLink
                              type="action"
                              id={link.actionId}
                              reference={action.reference}
                              label={action.title}
                            />
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOURS[action.status] ?? "bg-gray-50 text-gray-500"}`}>
                              {STATUS_LABELS[action.status] ?? action.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Assigned to {users.find((u) => u.id === action.assignedTo)?.name ?? action.assignedTo}
                            {action.dueDate ? ` · Due ${new Date(action.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                            {action.priority ? ` · ${action.priority}` : ""}
                          </p>
                        </div>
                        {isCCRO && (
                          isConfirming ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[11px] text-gray-600">Unlink?</span>
                              <button
                                type="button"
                                onClick={() => handleUnlinkAction(link.actionId)}
                                className="text-[11px] font-medium text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmUnlinkActionId(null)}
                                className="text-[11px] font-medium text-gray-500 hover:text-gray-700 px-1.5 py-0.5 rounded"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmUnlinkActionId(link.actionId)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all shrink-0"
                              title="Unlink action"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                  {/* Raise / Link action buttons */}
                  {canRaiseAction && (
                    <div className="space-y-2 pt-1">
                      {!showRaiseAction && !showLinkAction && (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => { setShowRaiseAction(true); setShowLinkAction(false); }}
                            className="flex items-center gap-1.5 text-sm text-updraft-bright-purple hover:text-updraft-deep transition-colors"
                          >
                            <Plus className="w-4 h-4" /> Raise new action
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowLinkAction(true); setShowRaiseAction(false); }}
                            className="flex items-center gap-1.5 text-sm text-updraft-bright-purple hover:text-updraft-deep transition-colors"
                          >
                            <Link2 className="w-4 h-4" /> Link existing action
                          </button>
                        </div>
                      )}
                      {/* Raise new action form */}
                      {showRaiseAction && (
                        <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">Raise New Action</p>
                          <input
                            value={actionTitle}
                            onChange={(e) => setActionTitle(e.target.value)}
                            placeholder="Action title *"
                            className={cn("w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white", raiseActionAttempted && !actionTitle.trim() ? "border-red-300 focus:ring-red-300/30" : "border-gray-200 focus:ring-updraft-bright-purple/30")}
                          />
                          {raiseActionAttempted && !actionTitle.trim() && (
                            <p className="text-xs text-red-500 -mt-1">Action title is required</p>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                            <select
                              value={actionAssignee}
                              onChange={(e) => setActionAssignee(e.target.value)}
                              className={cn("w-full px-3 py-2 text-sm border rounded-lg bg-white", raiseActionAttempted && !actionAssignee ? "border-red-300" : "border-gray-200")}
                            >
                              <option value="">Assign to *</option>
                              {activeUsers.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                            {raiseActionAttempted && !actionAssignee && (
                              <p className="text-xs text-red-500 mt-0.5">Assignee is required</p>
                            )}
                            </div>
                            <select
                              value={actionPriority}
                              onChange={(e) => setActionPriority(e.target.value as ActionPriority | "")}
                              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                            >
                              <option value="">Priority...</option>
                              {PRIORITY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="date"
                            value={actionDueDate}
                            onChange={(e) => setActionDueDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => { setShowRaiseAction(false); setActionTitle(""); setActionAssignee(""); setActionDueDate(""); setActionPriority(""); setRaiseActionAttempted(false); }}
                              className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleRaiseAction}
                              disabled={submittingAction || !actionTitle.trim() || !actionAssignee}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-updraft-deep rounded-lg hover:bg-updraft-bar disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {submittingAction && <Loader2 size={12} className="animate-spin" />}
                              Raise Action
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Link existing action search */}
                      {showLinkAction && (
                        <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">Link Existing Action</p>
                          <div className="relative">
                            <input
                              type="text"
                              value={actionSearch}
                              onChange={(e) => setActionSearch(e.target.value)}
                              placeholder="Search by reference or title..."
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 pl-9 bg-white"
                            />
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          </div>
                          {submittingAction && (
                            <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-500">
                              <Loader2 size={14} className="animate-spin" />
                              Linking…
                            </div>
                          )}
                          {!submittingAction && actionSearch.trim() && (
                            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-gray-200 bg-white p-2">
                              {(() => {
                                const q = actionSearch.toLowerCase();
                                const linkedIds = new Set((risk.actionLinks ?? []).map((l) => l.actionId));
                                const matches = actions.filter((a) => {
                                  if (linkedIds.has(a.id)) return false;
                                  return a.reference.toLowerCase().includes(q) || a.title.toLowerCase().includes(q);
                                });
                                if (matches.length === 0) return <p className="text-xs text-gray-400 py-2 text-center">No matching actions found</p>;
                                return matches.slice(0, 20).map((a) => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => handleLinkExistingAction(a.id)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs rounded-md hover:bg-updraft-pale-purple/20 transition-colors"
                                  >
                                    <span className="font-mono font-medium text-updraft-deep whitespace-nowrap">{a.reference}</span>
                                    <span className="text-gray-600 truncate flex-1">{a.title}</span>
                                    <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  </button>
                                ));
                              })()}
                            </div>
                          )}
                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={submittingAction}
                              onClick={() => { setShowLinkAction(false); setActionSearch(""); }}
                              className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

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
                  onClick={() => { pushNavigationStack(window.location.pathname + window.location.search); router.push(`/risk-acceptances?newFrom=risk&riskId=${risk.id}`); }}
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
                onClick={() => { if (risk) setConfirmDeleteRisk(true); }}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Delete risk
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isEditing ? "Cancel" : "Close"}
            </button>
            {(isEditing || isNew) && (
              <>
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
                    disabled={!canSave || riskSaveState !== "idle"}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      isNew && !canBypassApproval ? "bg-amber-600 hover:bg-amber-700" : "bg-updraft-deep hover:bg-updraft-bar"
                    }`}
                  >
                    {riskSaveState === "saving" && <Loader2 size={14} className="animate-spin" />}
                    {riskSaveState === "saving" ? "Saving…" : riskSaveState === "saved" ? "Saved ✓" : isNew && !canBypassApproval ? "Submit for Approval" : isNew ? "Create Risk" : "Save Changes"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); onClose(); }}
        title="Unsaved changes"
        message="You have unsaved changes. Discard them and close?"
        confirmLabel="Discard changes"
        variant="warning"
      />
      <ConfirmDialog
        open={confirmDeleteRisk}
        onClose={() => setConfirmDeleteRisk(false)}
        onConfirm={() => { setConfirmDeleteRisk(false); if (risk && onDelete) onDelete(risk.id); }}
        title="Delete risk"
        message="Are you sure you want to delete this risk? This action cannot be undone."
        confirmLabel="Delete risk"
      />
    </div>
  );
}

// ── Score Selector Sub-Component ──────────────────────────────────────────

function ScoreSelector({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string; description: string }[];
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
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
