"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/common/Modal";
import type { ConsumerDutyMeasure, ConsumerDutyOutcome, ConsumerDutyMI, RAGStatus } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Plus, X } from "lucide-react";

interface MeasureFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (outcomeId: string, measure: ConsumerDutyMeasure) => void;
  measure?: ConsumerDutyMeasure;
  outcomes: ConsumerDutyOutcome[];
  defaultOutcomeId?: string;
}

const RAG_OPTIONS: { value: RAGStatus; label: string; colour: string }[] = [
  { value: "GOOD", label: "Green", colour: "text-risk-green" },
  { value: "WARNING", label: "Amber", colour: "text-risk-amber" },
  { value: "HARM", label: "Red", colour: "text-risk-red" },
];

function blankMetric(measureRefId: string): ConsumerDutyMI {
  return {
    id: `mi-${generateId()}`,
    measureId: measureRefId,
    metric: "",
    current: "",
    previous: "",
    change: "",
    ragStatus: "GOOD",
    appetite: null,
    appetiteOperator: null,
  };
}

export default function MeasureFormDialog({
  open,
  onClose,
  onSave,
  measure,
  outcomes,
  defaultOutcomeId,
}: MeasureFormDialogProps) {
  const isEdit = Boolean(measure);
  const storeUsers = useAppStore((s) => s.users);

  const [measureId, setMeasureId] = useState("");
  const [name, setName] = useState("");
  const [outcomeId, setOutcomeId] = useState("");
  const [owner, setOwner] = useState("");
  const [summary, setSummary] = useState("");
  const [ragStatus, setRagStatus] = useState<RAGStatus>("GOOD");
  const [inlineMetrics, setInlineMetrics] = useState<ConsumerDutyMI[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (measure) {
        setMeasureId(measure.measureId);
        setName(measure.name);
        setOutcomeId(measure.outcomeId);
        setOwner(measure.owner ?? "");
        setSummary(measure.summary);
        setRagStatus(measure.ragStatus);
        setInlineMetrics((measure.metrics ?? []).map((m) => ({ ...m })));
      } else {
        setMeasureId("");
        setName("");
        setOutcomeId(defaultOutcomeId ?? outcomes[0]?.id ?? "");
        setOwner("");
        setSummary("");
        setRagStatus("GOOD");
        setInlineMetrics([]);
      }
      setErrors({});
    }
  }, [open, measure, outcomes, defaultOutcomeId]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!measureId.trim()) newErrors.measureId = "Measure ID is required";
    if (!name.trim()) newErrors.name = "Name is required";
    if (!outcomeId) newErrors.outcomeId = "Please select an outcome";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const targetOutcome = outcomes.find((o) => o.id === outcomeId);
    const nextPos = targetOutcome?.measures?.length ?? 0;
    const mId = measure?.id ?? `measure-${generateId()}`;

    // Filter out blank metrics (no metric name)
    const validMetrics = inlineMetrics
      .filter((m) => m.metric.trim())
      .map((m) => ({ ...m, measureId: mId }));

    const saved: ConsumerDutyMeasure = {
      id: mId,
      outcomeId,
      measureId: measureId.trim(),
      name: name.trim(),
      owner: owner.trim() || null,
      summary: summary.trim(),
      ragStatus,
      position: measure?.position ?? nextPos,
      lastUpdatedAt: new Date().toISOString(),
      updatedById: null,
      metrics: validMetrics,
    };

    onSave(outcomeId, saved);
    onClose();
  }

  function addMetric() {
    setInlineMetrics((prev) => [...prev, blankMetric(measure?.id ?? "")]);
  }

  function removeMetric(index: number) {
    setInlineMetrics((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInlineMetric(
    index: number,
    field: keyof ConsumerDutyMI,
    value: string
  ) {
    setInlineMetrics((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

  const inputClasses =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "text-xs text-red-500 mt-1";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Measure" : "Add Measure"}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="measure-form"
            className="rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
          >
            {isEdit ? "Save Changes" : "Add Measure"}
          </button>
        </>
      }
    >
      <form id="measure-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="measure-id" className={labelClasses}>Measure ID</label>
            <input
              id="measure-id"
              type="text"
              value={measureId}
              onChange={(e) => setMeasureId(e.target.value)}
              placeholder="e.g. 1.1"
              className={inputClasses}
            />
            {errors.measureId && <p className={errorClasses}>{errors.measureId}</p>}
          </div>
          <div>
            <label htmlFor="measure-outcome" className={labelClasses}>Outcome</label>
            <select
              id="measure-outcome"
              value={outcomeId}
              onChange={(e) => setOutcomeId(e.target.value)}
              className={inputClasses}
            >
              <option value="">Select outcome...</option>
              {outcomes.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            {errors.outcomeId && <p className={errorClasses}>{errors.outcomeId}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="measure-name" className={labelClasses}>Name</label>
          <input
            id="measure-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Customer Needs Met"
            className={inputClasses}
          />
          {errors.name && <p className={errorClasses}>{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="measure-owner" className={labelClasses}>Owner</label>
          <select
            id="measure-owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className={inputClasses}
          >
            <option value="">— Unassigned —</option>
            {storeUsers
              .filter((u) => u.isActive !== false)
              .map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
          </select>
        </div>

        <div>
          <label htmlFor="measure-summary" className={labelClasses}>Summary</label>
          <textarea
            id="measure-summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief description of what this measure tracks"
            className={inputClasses}
          />
        </div>

        <div>
          <label className={labelClasses}>RAG Status</label>
          <div className="flex items-center gap-4">
            {RAG_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="measure-rag"
                  value={opt.value}
                  checked={ragStatus === opt.value}
                  onChange={() => setRagStatus(opt.value)}
                  className="h-4 w-4 border-gray-300 text-updraft-bright-purple focus:ring-updraft-bar"
                />
                <span className={opt.colour}>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Inline MI Metrics */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className={labelClasses}>MI Metrics</label>
            <button
              type="button"
              onClick={addMetric}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Plus size={12} />
              Add Metric
            </button>
          </div>

          {inlineMetrics.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">
              No metrics yet. Click &ldquo;Add Metric&rdquo; to add one.
            </p>
          ) : (
            <div className="space-y-2">
              {inlineMetrics.map((m, idx) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/50 p-2"
                >
                  <input
                    type="text"
                    value={m.metric}
                    onChange={(e) => updateInlineMetric(idx, "metric", e.target.value)}
                    placeholder="Metric name"
                    className="flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-updraft-light-purple"
                  />
                  <input
                    type="text"
                    value={m.current}
                    onChange={(e) => updateInlineMetric(idx, "current", e.target.value)}
                    placeholder="Value"
                    className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-right outline-none focus:border-updraft-light-purple"
                  />
                  <select
                    value={m.ragStatus}
                    onChange={(e) => updateInlineMetric(idx, "ragStatus", e.target.value)}
                    className="rounded-md border border-gray-200 bg-white px-1.5 py-1.5 text-xs outline-none focus:border-updraft-light-purple"
                  >
                    {RAG_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMetric(idx)}
                    className="shrink-0 rounded-md p-1 text-gray-400 hover:text-risk-red hover:bg-red-50 transition-colors"
                    title="Remove metric"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
