"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X, Save, Trash2, ExternalLink, Plus, Unlink, Loader2, Network, Zap, ChevronDown, ChevronRight, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { HorizonItem, HorizonCategory, HorizonUrgency, HorizonStatus, HorizonImpact, Risk } from "@/lib/types";
import { HORIZON_CATEGORY_LABELS, HORIZON_URGENCY_COLOURS, HORIZON_STATUS_LABELS } from "@/lib/types";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { AutoResizeTextarea } from "@/components/common/AutoResizeTextarea";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EntityLink from "@/components/common/EntityLink";

interface Props {
  item: HorizonItem;
  canManage: boolean;
  canCreateAction?: boolean; // defaults to canManage; OWNER also gets this via checkPermission
  risks: Risk[];
  onClose: () => void;
  onUpdated: (item: HorizonItem) => void;
  onDeleted: (id: string) => void;
}

const ACTION_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ON_HOLD: "On Hold",
};

type SectionKey = "details" | "overview" | "deadlineActions" | "source" | "linkedItems";

export function HorizonDetailPanel({ item, canManage, canCreateAction, risks, onClose, onUpdated, onDeleted }: Props) {
  const { users, addAction } = useAppStore();
  const prefersReduced = useReducedMotion();

  const effectiveCanCreateAction = canCreateAction ?? canManage;

  // Edit-unlock state — CCRO starts in read mode; pencil button unlocks
  const [isEditing, setIsEditing] = useState(false);

  // Edit state
  const [title, setTitle] = useState(item.title);
  const [category, setCategory] = useState<HorizonCategory>(item.category);
  const [source, setSource] = useState(item.source);
  const [urgency, setUrgency] = useState<HorizonUrgency>(item.urgency);
  const [impact, setImpact] = useState<HorizonImpact>(item.impact ?? "MEDIUM");
  const [status, setStatus] = useState<HorizonStatus>(item.status);
  const [summary, setSummary] = useState(item.summary);
  const [whyItMatters, setWhyItMatters] = useState(item.whyItMatters);
  const [deadline, setDeadline] = useState(item.deadline ? item.deadline.slice(0, 10) : "");
  const [actions, setActions] = useState(item.actions ?? "");
  const [sourceUrl, setSourceUrl] = useState(item.sourceUrl ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");

  // Dirty state — detect unsaved edits
  const isDirty =
    title !== item.title ||
    category !== item.category ||
    source !== item.source ||
    urgency !== item.urgency ||
    impact !== (item.impact ?? "MEDIUM") ||
    status !== item.status ||
    summary !== item.summary ||
    whyItMatters !== item.whyItMatters ||
    deadline !== (item.deadline ? item.deadline.slice(0, 10) : "") ||
    actions !== (item.actions ?? "") ||
    sourceUrl !== (item.sourceUrl ?? "") ||
    notes !== (item.notes ?? "");

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null);
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(["details", "overview", "deadlineActions", "linkedItems"] as SectionKey[]));

  // Action creation
  const [showCreateAction, setShowCreateAction] = useState(false);
  const [actionTitle, setActionTitle] = useState(item.title);
  const [actionAssignee, setActionAssignee] = useState("");
  const [actionDueDate, setActionDueDate] = useState(item.deadline ? item.deadline.slice(0, 10) : "");
  const [actionPriority, setActionPriority] = useState<"P1" | "P2" | "P3" | "">("");
  const [creatingAction, setCreatingAction] = useState(false);

  // Risk linking
  const [showLinkRisk, setShowLinkRisk] = useState(false);
  const [riskSearch, setRiskSearch] = useState("");
  const [linkingRisk, setLinkingRisk] = useState(false);

  const linkedRiskIds = new Set((item.riskLinks ?? []).map((r) => r.riskId));

  function toggleSection(key: SectionKey) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }

  function handleCancelEdit() {
    // Reset all fields to original values
    setTitle(item.title);
    setCategory(item.category);
    setSource(item.source);
    setUrgency(item.urgency);
    setImpact(item.impact ?? "MEDIUM");
    setStatus(item.status);
    setSummary(item.summary);
    setWhyItMatters(item.whyItMatters);
    setDeadline(item.deadline ? item.deadline.slice(0, 10) : "");
    setActions(item.actions ?? "");
    setSourceUrl(item.sourceUrl ?? "");
    setNotes(item.notes ?? "");
    setIsEditing(false);
  }

  function handleClose() {
    if (isEditing && isDirty) {
      setUnsavedConfirmOpen(true);
      return;
    }
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api<HorizonItem>(`/api/horizon-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title, category, source, urgency, impact, status, summary, whyItMatters,
          deadline: deadline || null,
          actions: actions || null,
          sourceUrl: sourceUrl || null,
          notes: notes || null,
        }),
      });
      onUpdated(updated);
      toast.success("Item saved");
      setIsEditing(false);
    } catch {
      toast.error("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api(`/api/horizon-items/${item.id}`, { method: "DELETE" });
      toast.success("Item deleted");
      onDeleted(item.id);
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleCreateAction() {
    if (!actionTitle || !actionAssignee) return;
    setCreatingAction(true);
    try {
      const result = await api<{ action: object; horizonItem: HorizonItem }>(`/api/horizon-items/${item.id}/actions`, {
        method: "POST",
        body: JSON.stringify({
          title: actionTitle,
          description: `Raised from horizon scan item ${item.reference}: ${item.title}`,
          assignedTo: actionAssignee,
          dueDate: actionDueDate || null,
          priority: actionPriority || null,
        }),
      });
      addAction(result.action as Parameters<typeof addAction>[0]);
      onUpdated(result.horizonItem);
      toast.success("Action created and linked");
      setShowCreateAction(false);
      setActionTitle(item.title);
      setActionAssignee("");
    } catch {
      toast.error("Failed to create action");
    } finally {
      setCreatingAction(false);
    }
  }

  async function handleLinkRisk(risk: Risk) {
    setLinkingRisk(true);
    try {
      const updated = await api<HorizonItem>(`/api/horizon-items/${item.id}/risks`, {
        method: "POST",
        body: JSON.stringify({ riskId: risk.id }),
      });
      onUpdated(updated);
      toast.success(`Linked to ${risk.reference}`);
      setShowLinkRisk(false);
      setRiskSearch("");
    } catch {
      toast.error("Failed to link risk");
    } finally {
      setLinkingRisk(false);
    }
  }

  async function handleConfirmedUnlink(riskId: string) {
    setConfirmUnlinkId(null);
    try {
      await api(`/api/horizon-items/${item.id}/risks?riskId=${riskId}`, { method: "DELETE" });
      onUpdated({ ...item, riskLinks: (item.riskLinks ?? []).filter((r) => r.riskId !== riskId) });
      toast.success("Risk unlinked");
    } catch {
      toast.error("Failed to unlink risk");
    }
  }

  const filteredRisks = risks.filter((r) => {
    if (linkedRiskIds.has(r.id)) return false;
    const q = riskSearch.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.reference.toLowerCase().includes(q);
  }).slice(0, 20);

  const urgencyStyle = HORIZON_URGENCY_COLOURS[urgency];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={handleClose} />

      {/* Panel — wider than before; expands left to show data without scrolling */}
      <motion.div
        className="fixed right-0 top-0 bottom-0 w-[min(800px,95vw)] bg-white shadow-2xl z-50 flex flex-col"
        initial={prefersReduced ? false : { x: "100%" }}
        animate={prefersReduced ? false : { x: 0 }}
        transition={prefersReduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30 }}
        style={{ willChange: "transform" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-updraft-deep to-updraft-bar px-6 py-4 flex items-start justify-between shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium mb-0.5">Horizon Scanning › {item.reference}</p>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", urgencyStyle.bg, urgencyStyle.text)}>
                {urgency}
              </span>
              {isEditing && isDirty && (
                <span className="text-xs font-medium text-amber-300 bg-white/10 px-1.5 py-0.5 rounded border border-amber-300/30">
                  Unsaved changes
                </span>
              )}
            </div>
            <h2 className="font-poppins font-semibold text-white text-sm leading-snug line-clamp-2">{title}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Edit unlock button — CCRO Team only */}
            {canManage && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Edit this item"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canManage && isEditing && (
              <button
                onClick={handleCancelEdit}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Cancel editing"
                title="Cancel edits"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
            <button onClick={handleClose} className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Item Details */}
          <Section title="Item Details" sectionKey="details" open={openSections.has("details")} onToggle={toggleSection}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Title</Label>
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isEditing} />
              </div>
              <div>
                <Label>Category</Label>
                <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as HorizonCategory)} disabled={!isEditing}>
                  {(Object.keys(HORIZON_CATEGORY_LABELS) as HorizonCategory[]).map((c) => (
                    <option key={c} value={c}>{HORIZON_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Source</Label>
                <input className={inputCls} value={source} onChange={(e) => setSource(e.target.value)} disabled={!isEditing} />
              </div>
              <div>
                <Label>Urgency</Label>
                <select className={inputCls} value={urgency} onChange={(e) => setUrgency(e.target.value as HorizonUrgency)} disabled={!isEditing}>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <Label>Impact</Label>
                <select className={inputCls} value={impact} onChange={(e) => setImpact(e.target.value as HorizonImpact)} disabled={!isEditing}>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as HorizonStatus)} disabled={!isEditing}>
                  {(Object.keys(HORIZON_STATUS_LABELS) as HorizonStatus[]).map((s) => (
                    <option key={s} value={s}>{HORIZON_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-3 text-xs text-slate-400">
                <div><span className="font-medium">Added:</span> {item.monthAdded}</div>
                <div><span className="font-medium">Last updated:</span> {new Date(item.updatedAt).toLocaleDateString("en-GB")}</div>
              </div>
            </div>
          </Section>

          {/* Overview */}
          <Section title="Overview" sectionKey="overview" open={openSections.has("overview")} onToggle={toggleSection}>
            <div className="space-y-3">
              <div>
                <Label>Summary</Label>
                <AutoResizeTextarea
                  className={inputCls}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={!isEditing}
                  minRows={3}
                />
              </div>
              <div>
                <Label>Why It Matters to Updraft</Label>
                <AutoResizeTextarea
                  className={inputCls}
                  value={whyItMatters}
                  onChange={(e) => setWhyItMatters(e.target.value)}
                  disabled={!isEditing}
                  minRows={3}
                />
              </div>
            </div>
          </Section>

          {/* Deadline & Actions */}
          <Section title="Deadline & Recommended Actions" sectionKey="deadlineActions" open={openSections.has("deadlineActions")} onToggle={toggleSection}>
            <div className="space-y-3">
              <div>
                <Label>Deadline</Label>
                <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={!isEditing} />
              </div>
              <div>
                <Label>Recommended Actions</Label>
                <AutoResizeTextarea
                  className={inputCls}
                  value={actions}
                  onChange={(e) => setActions(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Describe the recommended actions for this item…"
                  minRows={3}
                />
              </div>
            </div>
          </Section>

          {/* Source & Notes */}
          <Section title="Source & Notes" sectionKey="source" open={openSections.has("source")} onToggle={toggleSection}>
            <div className="space-y-3">
              <div>
                <Label>Source URL</Label>
                <div className="flex gap-2">
                  <input className={cn(inputCls, "flex-1")} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} disabled={!isEditing} placeholder="https://…" />
                  {sourceUrl && (
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-updraft-bright-purple transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              {canManage && (
                <div>
                  <Label>Internal Notes <span className="text-slate-400 font-normal">(CCRO Team only)</span></Label>
                  <AutoResizeTextarea
                    className={inputCls}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Internal notes not visible to Owner/Viewer roles…"
                    minRows={2}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* Linked Items */}
          <Section title="Linked Actions & Risks" sectionKey="linkedItems" open={openSections.has("linkedItems")} onToggle={toggleSection}>
            <div className="space-y-4">
              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Linked Actions
                  </span>
                  {effectiveCanCreateAction && (
                    <button onClick={() => setShowCreateAction(!showCreateAction)} className="text-xs text-updraft-bright-purple hover:underline flex items-center gap-0.5">
                      <Plus className="w-3 h-3" /> Create Action
                    </button>
                  )}
                </div>
                {(item.actionLinks ?? []).length === 0 && !showCreateAction && (
                  <p className="text-xs text-slate-400 italic">No actions linked yet.</p>
                )}
                {(item.actionLinks ?? []).map((link) => (
                  <div key={link.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <EntityLink
                      type="action"
                      id={link.actionId}
                      reference={link.action?.reference}
                      label={link.action?.title}
                    />
                    <span className="text-xs text-slate-400 shrink-0 ml-auto">{ACTION_STATUS_LABELS[link.action?.status ?? ""] ?? link.action?.status}</span>
                  </div>
                ))}

                {showCreateAction && effectiveCanCreateAction && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Create & link new action</p>
                    <input className={inputCls} placeholder="Action title" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} />
                    <select className={inputCls} value={actionAssignee} onChange={(e) => setActionAssignee(e.target.value)}>
                      <option value="">Assign to…</option>
                      {users.filter((u) => u.isActive).map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" className={inputCls} value={actionDueDate} onChange={(e) => setActionDueDate(e.target.value)} />
                      <select className={inputCls} value={actionPriority} onChange={(e) => setActionPriority(e.target.value as "P1" | "P2" | "P3" | "")}>
                        <option value="">Priority (optional)</option>
                        <option value="P1">P1 — Critical</option>
                        <option value="P2">P2 — Important</option>
                        <option value="P3">P3 — Normal</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateAction}
                        disabled={creatingAction || !actionTitle || !actionAssignee}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-updraft-bright-purple text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-updraft-light-purple transition-colors"
                      >
                        {creatingAction ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Create Action
                      </button>
                      <button onClick={() => setShowCreateAction(false)} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Risks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Network className="w-3.5 h-3.5 text-blue-500" /> Linked Risks
                  </span>
                  {canManage && (
                    <button onClick={() => setShowLinkRisk(!showLinkRisk)} className="text-xs text-updraft-bright-purple hover:underline flex items-center gap-0.5">
                      <Plus className="w-3 h-3" /> Link Risk
                    </button>
                  )}
                </div>
                {(item.riskLinks ?? []).length === 0 && !showLinkRisk && (
                  <p className="text-xs text-slate-400 italic">No risks linked yet.</p>
                )}
                {(item.riskLinks ?? []).map((link) => (
                  <div key={link.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <EntityLink
                      type="risk"
                      id={link.riskId}
                      reference={link.risk?.reference}
                      label={link.risk?.name}
                    />
                    <div className="ml-auto flex items-center gap-1 shrink-0">
                      {canManage && confirmUnlinkId === link.riskId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-600">Unlink?</span>
                          <button onClick={() => handleConfirmedUnlink(link.riskId)} className="text-xs text-red-600 font-semibold hover:underline">Yes</button>
                          <button onClick={() => setConfirmUnlinkId(null)} className="text-xs text-slate-400 hover:text-slate-600">No</button>
                        </div>
                      ) : canManage ? (
                        <button onClick={() => setConfirmUnlinkId(link.riskId)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}

                {showLinkRisk && canManage && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <input
                      className={inputCls}
                      placeholder="Search risks…"
                      value={riskSearch}
                      onChange={(e) => setRiskSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {filteredRisks.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => handleLinkRisk(r)}
                          disabled={linkingRisk}
                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-white rounded flex items-center gap-2 disabled:opacity-50"
                        >
                          <span className="font-mono text-slate-400 w-14 shrink-0">{r.reference}</span>
                          <span className="text-slate-700 truncate">{r.name}</span>
                        </button>
                      ))}
                      {filteredRisks.length === 0 && <p className="text-xs text-slate-400 px-2 py-1">No matching risks</p>}
                    </div>
                    <button onClick={() => { setShowLinkRisk(false); setRiskSearch(""); }} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
                  </div>
                )}
              </div>
            </div>
          </Section>
        </div>

        {/* Footer — save controls only visible in edit mode */}
        {canManage && (
          <div className="px-6 py-4 border-t bg-slate-50 shrink-0 flex items-center justify-between gap-3">
            <div>
              {isEditing && (
                <>
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 text-sm rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600">Confirm delete?</span>
                      <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50">
                        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                      </button>
                      <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                    </div>
                  )}
                </>
              )}
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-slate-600 border border-slate-200 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  className="flex items-center gap-2 px-4 py-2 bg-updraft-bright-purple text-white text-sm font-semibold rounded-lg hover:bg-updraft-light-purple disabled:opacity-60 transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 border border-updraft-bright-purple text-updraft-bright-purple text-sm font-semibold rounded-lg hover:bg-updraft-pale-purple transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
        )}
      </motion.div>
      <ConfirmDialog
        open={unsavedConfirmOpen}
        onClose={() => setUnsavedConfirmOpen(false)}
        onConfirm={() => { setUnsavedConfirmOpen(false); onClose(); }}
        title="Unsaved changes"
        message="You have unsaved changes. Are you sure you want to close without saving?"
        confirmLabel="Discard changes"
        variant="warning"
      />
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = "w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 bg-white disabled:bg-slate-50 disabled:text-slate-600";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-600 mb-1">{children}</label>;
}

function Section({
  title, sectionKey, open, onToggle, children,
}: {
  title: string; sectionKey: SectionKey; open: boolean;
  onToggle: (key: SectionKey) => void; children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}
