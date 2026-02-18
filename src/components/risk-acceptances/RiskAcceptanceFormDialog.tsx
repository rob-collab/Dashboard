"use client";

import { useState } from "react";
import Modal from "@/components/common/Modal";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { RiskAcceptance, RiskAcceptanceSource } from "@/lib/types";
import { RISK_ACCEPTANCE_SOURCE_LABELS } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (acceptance: RiskAcceptance) => void;
}

const SOURCES: RiskAcceptanceSource[] = ["RISK_REGISTER", "CONTROL_TESTING", "INCIDENT", "AD_HOC"];

export default function RiskAcceptanceFormDialog({ open, onClose, onSave }: Props) {
  const risks = useAppStore((s) => s.risks);
  const outcomes = useAppStore((s) => s.outcomes);
  const actions = useAppStore((s) => s.actions);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<RiskAcceptanceSource>("RISK_REGISTER");
  const [riskId, setRiskId] = useState("");
  const [rationale, setRationale] = useState("");
  const [conditions, setConditions] = useState("");
  const [outcomeId, setOutcomeId] = useState("");
  const [linkedActionIds, setLinkedActionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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
    setOutcomeId("");
    setLinkedActionIds([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !rationale.trim()) return;

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
          consumerDutyOutcomeId: outcomeId || null,
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
            onChange={(e) => setSource(e.target.value as RiskAcceptanceSource)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>{RISK_ACCEPTANCE_SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Link to Risk (conditional) */}
        {source === "RISK_REGISTER" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link to Risk</label>
            <select
              value={riskId}
              onChange={(e) => handleRiskSelect(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
            >
              <option value="">Select a risk...</option>
              {risks.map((r) => (
                <option key={r.id} value={r.id}>{r.reference}: {r.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Risk acceptance title"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the risk being accepted..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          />
        </div>

        {/* Rationale */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rationale <span className="text-red-500">*</span></label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            placeholder="Why should this risk be accepted?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
            required
          />
        </div>

        {/* Conditions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conditions (optional)</label>
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            placeholder="Any conditions attached to this acceptance..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          />
        </div>

        {/* Consumer Duty Outcome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Duty Outcome</label>
          <select
            value={outcomeId}
            onChange={(e) => setOutcomeId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          >
            <option value="">None</option>
            {outcomes.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* Linked Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Linked Actions</label>
          <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-300 p-2 space-y-1">
            {actions.filter((a) => a.status !== "COMPLETED").map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
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
                <span className="text-gray-700">{a.reference}: {a.title}</span>
              </label>
            ))}
            {actions.filter((a) => a.status !== "COMPLETED").length === 0 && (
              <p className="text-xs text-gray-400 p-1">No active actions available</p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
