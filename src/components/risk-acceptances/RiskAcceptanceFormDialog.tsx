"use client";

import { useState, useEffect, useMemo } from "react";
import Modal from "@/components/common/Modal";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Search, X, AlertTriangle } from "lucide-react";
import type { RiskAcceptance, RiskAcceptanceSource } from "@/lib/types";
import { RISK_ACCEPTANCE_SOURCE_LABELS } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (acceptance: RiskAcceptance) => void;
  prefillSource?: RiskAcceptanceSource;
  prefillRiskId?: string;
  prefillControlId?: string;
}

const SOURCES: RiskAcceptanceSource[] = ["RISK_REGISTER", "CONTROL_TESTING", "INCIDENT", "AD_HOC"];

function defaultReviewDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split("T")[0];
}

function isMoreThanSixMonths(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  // Add 1 day buffer for "more than"
  sixMonths.setDate(sixMonths.getDate() + 1);
  return d >= sixMonths;
}

export default function RiskAcceptanceFormDialog({ open, onClose, onSave, prefillSource, prefillRiskId, prefillControlId }: Props) {
  const risks = useAppStore((s) => s.risks);
  const actions = useAppStore((s) => s.actions);
  const users = useAppStore((s) => s.users);
  const controls = useAppStore((s) => s.controls);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<RiskAcceptanceSource>("RISK_REGISTER");
  const [riskId, setRiskId] = useState("");
  const [rationale, setRationale] = useState("");
  const [conditions, setConditions] = useState("");
  const [linkedActionIds, setLinkedActionIds] = useState<string[]>([]);
  const [reviewDate, setReviewDate] = useState(defaultReviewDate());
  const [acceptorId, setAcceptorId] = useState("");
  const [linkedControlId, setLinkedControlId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Search states
  const [riskSearch, setRiskSearch] = useState("");
  const [actionSearch, setActionSearch] = useState("");
  const [controlSearch, setControlSearch] = useState("");

  // Handle prefill when dialog opens
  useEffect(() => {
    if (open && prefillSource) {
      setSource(prefillSource);
      if (prefillSource === "RISK_REGISTER" && prefillRiskId) {
        handleRiskSelect(prefillRiskId);
      }
      if (prefillSource === "CONTROL_TESTING" && prefillControlId) {
        setLinkedControlId(prefillControlId);
        const ctrl = controls.find((c) => c.id === prefillControlId);
        if (ctrl) {
          setTitle(`Risk acceptance for ${ctrl.controlRef}: ${ctrl.controlName}`);
          setDescription(`Risk acceptance raised from control testing for ${ctrl.controlRef} — ${ctrl.controlName}`);
        }
      }
    }
  }, [open, prefillSource, prefillRiskId, prefillControlId]);

  // Filtered risks for searchable selector
  const filteredRisks = useMemo(() => {
    if (!riskSearch.trim()) return risks;
    const q = riskSearch.toLowerCase();
    return risks.filter((r) =>
      (r.reference + " " + r.name).toLowerCase().includes(q)
    );
  }, [risks, riskSearch]);

  // Filtered actions for searchable selector
  const filteredActions = useMemo(() => {
    const active = actions.filter((a) => a.status !== "COMPLETED");
    if (!actionSearch.trim()) return active;
    const q = actionSearch.toLowerCase();
    return active.filter((a) =>
      (a.reference + " " + a.title).toLowerCase().includes(q)
    );
  }, [actions, actionSearch]);

  // Filtered controls for searchable selector
  const filteredControls = useMemo(() => {
    const activeControls = controls.filter((c) => c.isActive);
    if (!controlSearch.trim()) return activeControls;
    const q = controlSearch.toLowerCase();
    return activeControls.filter((c) =>
      (c.controlRef + " " + c.controlName).toLowerCase().includes(q)
    );
  }, [controls, controlSearch]);

  // Selected control object
  const selectedControl = useMemo(
    () => controls.find((c) => c.id === linkedControlId),
    [controls, linkedControlId]
  );

  function handleRiskSelect(id: string) {
    setRiskId(id);
    if (id) {
      const risk = risks.find((r) => r.id === id);
      if (risk) {
        setTitle(risk.name);
        setDescription(risk.description);
      }
    }
  }

  function reset() {
    setTitle("");
    setDescription("");
    setSource("RISK_REGISTER");
    setRiskId("");
    setRationale("");
    setConditions("");
    setLinkedActionIds([]);
    setReviewDate(defaultReviewDate());
    setAcceptorId("");
    setLinkedControlId("");
    setRiskSearch("");
    setActionSearch("");
    setControlSearch("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!rationale.trim()) newErrors.rationale = "Rationale is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const result = await api<RiskAcceptance>("/api/risk-acceptances", {
        method: "POST",
        body: {
          title,
          description,
          source,
          riskId: riskId || null,
          proposedRationale: rationale,
          proposedConditions: conditions || null,
          linkedControlId: linkedControlId || null,
          reviewDate: reviewDate || null,
          approverId: acceptorId || null,
          linkedActionIds,
        },
      });
      onSave(result);
      toast.success("Risk acceptance proposed successfully");
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create risk acceptance");
    } finally {
      setSaving(false);
    }
  }

  const showReviewWarning = isMoreThanSixMonths(reviewDate);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Propose Risk Acceptance"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !rationale.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-updraft-deep hover:bg-updraft-bar rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Proposing..." : "Propose Acceptance"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value as RiskAcceptanceSource);
              setRiskId("");
              setLinkedControlId("");
              setRiskSearch("");
              setControlSearch("");
            }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>{RISK_ACCEPTANCE_SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Risk Register: Searchable risk selector */}
        {source === "RISK_REGISTER" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link to Risk</label>
            {riskId ? (
              <div className="flex items-center gap-2 rounded-lg border border-updraft-bright-purple bg-updraft-pale-purple/20 px-3 py-2">
                <span className="text-sm text-gray-800 flex-1">
                  {risks.find((r) => r.id === riskId)?.reference}: {risks.find((r) => r.id === riskId)?.name}
                </span>
                <button type="button" onClick={() => { setRiskId(""); setTitle(""); setDescription(""); }} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={riskSearch}
                    onChange={(e) => setRiskSearch(e.target.value)}
                    placeholder="Search by reference or name..."
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200">
                  {filteredRisks.slice(0, 10).map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => handleRiskSelect(r.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <span className="font-mono text-xs font-bold text-updraft-deep">{r.reference}</span>{" "}
                      <span className="text-gray-700">{r.name}</span>
                    </button>
                  ))}
                  {filteredRisks.length === 0 && (
                    <p className="text-xs text-gray-400 p-2">No matching risks</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Control Testing: Searchable control selector */}
        {source === "CONTROL_TESTING" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link to Control</label>
            {linkedControlId ? (
              <div className="rounded-lg border border-updraft-bright-purple bg-updraft-pale-purple/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="font-mono text-xs font-bold text-updraft-deep">{selectedControl?.controlRef}</span>{" "}
                    <span className="text-sm text-gray-800">{selectedControl?.controlName}</span>
                  </div>
                  <button type="button" onClick={() => setLinkedControlId("")} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                </div>
                {selectedControl?.testingSchedule?.testResults && selectedControl.testingSchedule.testResults.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Latest test: {selectedControl.testingSchedule.testResults[selectedControl.testingSchedule.testResults.length - 1]?.result ?? "None"}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={controlSearch}
                    onChange={(e) => setControlSearch(e.target.value)}
                    placeholder="Search by control ref or name..."
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200">
                  {filteredControls.slice(0, 10).map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setLinkedControlId(c.id);
                        if (!title) setTitle(`Risk acceptance for ${c.controlRef}: ${c.controlName}`);
                        if (!description) setDescription(`Risk acceptance raised from control testing for ${c.controlRef} — ${c.controlName}`);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <span className="font-mono text-xs font-bold text-updraft-deep">{c.controlRef}</span>{" "}
                      <span className="text-gray-700">{c.controlName}</span>
                    </button>
                  ))}
                  {filteredControls.length === 0 && (
                    <p className="text-xs text-gray-400 p-2">No matching controls</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
          <input
            id="ra-title"
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((p) => ({ ...p, title: "" })); }}
            onBlur={() => { if (!title.trim()) setErrors((p) => ({ ...p, title: "Title is required" })); }}
            placeholder="Risk acceptance title"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple ${errors.title ? "border-red-400 bg-red-50" : "border-gray-200"}`}
            aria-required="true"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "ra-title-error" : undefined}
          />
          {errors.title && <p id="ra-title-error" className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the risk being accepted..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          />
        </div>

        {/* Rationale */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rationale <span className="text-red-500">*</span></label>
          <textarea
            id="ra-rationale"
            value={rationale}
            onChange={(e) => { setRationale(e.target.value); if (errors.rationale) setErrors((p) => ({ ...p, rationale: "" })); }}
            onBlur={() => { if (!rationale.trim()) setErrors((p) => ({ ...p, rationale: "Rationale is required" })); }}
            rows={3}
            placeholder="Why should this risk be accepted?"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple ${errors.rationale ? "border-red-400 bg-red-50" : "border-gray-200"}`}
            aria-required="true"
            aria-invalid={!!errors.rationale}
            aria-describedby={errors.rationale ? "ra-rationale-error" : undefined}
          />
          {errors.rationale && <p id="ra-rationale-error" className="mt-1 text-xs text-red-600">{errors.rationale}</p>}
        </div>

        {/* Conditions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conditions (optional)</label>
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            placeholder="Any conditions attached to this acceptance..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          />
        </div>

        {/* Accepted Till (Review Date) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Accepted Till</label>
          <input
            type="date"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          />
          {showReviewWarning && (
            <div className="flex items-center gap-2 mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700">
                Acceptance periods longer than 6 months require CCRO/CEO sign-off
              </span>
            </div>
          )}
        </div>

        {/* Formally Accepted By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Formally Accepted By</label>
          <select
            value={acceptorId}
            onChange={(e) => setAcceptorId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          >
            <option value="">Select approver (optional)...</option>
            {users
              .filter((u) => u.isActive)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
          </select>
        </div>

        {/* Searchable Linked Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Linked Actions</label>
          {/* Selected action chips */}
          {linkedActionIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {linkedActionIds.map((aid) => {
                const action = actions.find((a) => a.id === aid);
                return action ? (
                  <span key={aid} className="inline-flex items-center gap-1 rounded-full bg-updraft-pale-purple/30 text-updraft-deep px-2.5 py-1 text-xs">
                    {action.reference}: {action.title.length > 30 ? action.title.slice(0, 30) + "..." : action.title}
                    <button type="button" onClick={() => setLinkedActionIds(linkedActionIds.filter((id) => id !== aid))} className="text-updraft-deep/60 hover:text-updraft-deep">
                      <X size={12} />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}
          {/* Search input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              placeholder="Search actions by reference or title..."
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
            />
          </div>
          {/* Results */}
          <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200 mt-1">
            {filteredActions.filter((a) => !linkedActionIds.includes(a.id)).slice(0, 8).map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-3 py-1.5 border-b border-gray-100 last:border-0">
                <input
                  type="checkbox"
                  checked={linkedActionIds.includes(a.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setLinkedActionIds([...linkedActionIds, a.id]);
                    } else {
                      setLinkedActionIds(linkedActionIds.filter((id) => id !== a.id));
                    }
                  }}
                  className="rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bright-purple"
                />
                <span className="text-gray-700">
                  <span className="font-mono text-xs font-bold text-updraft-deep">{a.reference}</span>{" "}
                  {a.title}
                </span>
              </label>
            ))}
            {filteredActions.filter((a) => !linkedActionIds.includes(a.id)).length === 0 && (
              <p className="text-xs text-gray-400 p-2">No matching actions</p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
