"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/common/Modal";
import type { ConsumerDutyOutcome, RAGStatus } from "@/lib/types";
import { generateId } from "@/lib/utils";

interface OutcomeFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (outcome: ConsumerDutyOutcome) => void;
  outcome?: ConsumerDutyOutcome;
  nextPosition: number;
}

const ICON_OPTIONS = [
  { value: "ShieldCheck", label: "Shield Check" },
  { value: "HeartPulse", label: "Heart Pulse" },
  { value: "MessageSquare", label: "Message" },
  { value: "HandCoins", label: "Hand Coins" },
  { value: "Scale", label: "Scale" },
  { value: "HelpCircle", label: "Help Circle" },
];

const RAG_OPTIONS: { value: RAGStatus; label: string; colour: string }[] = [
  { value: "GOOD", label: "Green", colour: "text-risk-green" },
  { value: "WARNING", label: "Amber", colour: "text-risk-amber" },
  { value: "HARM", label: "Red", colour: "text-risk-red" },
];

export default function OutcomeFormDialog({
  open,
  onClose,
  onSave,
  outcome,
  nextPosition,
}: OutcomeFormDialogProps) {
  const isEdit = Boolean(outcome);

  const [name, setName] = useState("");
  const [outcomeId, setOutcomeId] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [previousRAG, setPreviousRAG] = useState<RAGStatus | "">("");
  const [icon, setIcon] = useState("ShieldCheck");
  const [ragStatus, setRagStatus] = useState<RAGStatus>("GOOD");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (open) {
      if (outcome) {
        setName(outcome.name);
        setOutcomeId(outcome.outcomeId);
        setShortDesc(outcome.shortDesc);
        setDetailedDescription(outcome.detailedDescription || "");
        setPreviousRAG(outcome.previousRAG || "");
        setIcon(outcome.icon ?? "ShieldCheck");
        setRagStatus(outcome.ragStatus);
      } else {
        setName("");
        setOutcomeId("");
        setShortDesc("");
        setDetailedDescription("");
        setPreviousRAG("");
        setIcon("ShieldCheck");
        setRagStatus("GOOD");
      }
      setErrors({});
      setSaveState("idle");
    }
  }, [open, outcome]);

  function validateField(field: "name" | "outcomeId" | "shortDesc") {
    setErrors((prev) => {
      const next = { ...prev };
      if (field === "name") { if (!name.trim()) next.name = "Name is required"; else delete next.name; }
      if (field === "outcomeId") { if (!outcomeId.trim()) next.outcomeId = "Outcome ID is required"; else delete next.outcomeId; }
      if (field === "shortDesc") { if (!shortDesc.trim()) next.shortDesc = "Short description is required"; else delete next.shortDesc; }
      return next;
    });
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!outcomeId.trim()) newErrors.outcomeId = "Outcome ID is required";
    if (!shortDesc.trim()) newErrors.shortDesc = "Short description is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || saveState !== "idle") return;

    const saved: ConsumerDutyOutcome = {
      id: outcome?.id ?? `outcome-${generateId()}`,
      outcomeId: outcomeId.trim(),
      name: name.trim(),
      shortDesc: shortDesc.trim(),
      detailedDescription: detailedDescription.trim() || null,
      riskOwner: null,
      previousRAG: previousRAG || null,
      mitigatingActions: null,
      icon,
      ragStatus,
      position: outcome?.position ?? nextPosition,
      measures: outcome?.measures ?? [],
    };

    setSaveState("saving");
    onSave(saved);
    await new Promise((r) => setTimeout(r, 400));
    setSaveState("saved");
    await new Promise((r) => setTimeout(r, 500));
    onClose();
  }

  const inputClasses =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "text-xs text-red-500 mt-1";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Outcome" : "Add Outcome"}
      size="md"
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
            form="outcome-form"
            disabled={saveState !== "idle"}
            className="rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-60"
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : isEdit ? "Save Changes" : "Add Outcome"}
          </button>
        </>
      }
    >
      <form id="outcome-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="outcome-id" className={labelClasses}>Outcome ID <span className="text-red-500 ml-0.5">*</span></label>
            <input
              id="outcome-id"
              type="text"
              value={outcomeId}
              onChange={(e) => setOutcomeId(e.target.value)}
              onBlur={() => validateField("outcomeId")}
              placeholder="e.g. O1"
              className={inputClasses}
              aria-required="true"
              aria-invalid={!!errors.outcomeId}
              aria-describedby={errors.outcomeId ? "outcome-id-error" : undefined}
            />
            {errors.outcomeId && <p id="outcome-id-error" className={errorClasses}>{errors.outcomeId}</p>}
          </div>

          <div>
            <label htmlFor="outcome-name" className={labelClasses}>Name <span className="text-red-500 ml-0.5">*</span></label>
            <input
              id="outcome-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => validateField("name")}
              placeholder="e.g. Products & Services"
              className={inputClasses}
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "outcome-name-error" : undefined}
            />
            {errors.name && <p id="outcome-name-error" className={errorClasses}>{errors.name}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="outcome-desc" className={labelClasses}>Short Description <span className="text-red-500 ml-0.5">*</span></label>
          <input
            id="outcome-desc"
            type="text"
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            onBlur={() => validateField("shortDesc")}
            placeholder="Brief description of this outcome"
            className={inputClasses}
            aria-required="true"
            aria-invalid={!!errors.shortDesc}
            aria-describedby={errors.shortDesc ? "outcome-desc-error" : undefined}
          />
          {errors.shortDesc && <p id="outcome-desc-error" className={errorClasses}>{errors.shortDesc}</p>}
        </div>

        <div>
          <label htmlFor="outcome-icon" className={labelClasses}>Icon</label>
          <select
            id="outcome-icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className={inputClasses}
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Outcome Details (Optional)</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="outcome-detailed-desc" className={labelClasses}>Detailed Description</label>
              <textarea
                id="outcome-detailed-desc"
                rows={4}
                value={detailedDescription}
                onChange={(e) => setDetailedDescription(e.target.value)}
                placeholder="Comprehensive explanation of this outcome and what it monitors..."
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="outcome-previous-rag" className={labelClasses}>Previous Period RAG</label>
              <select
                id="outcome-previous-rag"
                value={previousRAG}
                onChange={(e) => setPreviousRAG(e.target.value as RAGStatus | "")}
                className={inputClasses}
              >
                <option value="">— Not set —</option>
                {RAG_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClasses}>RAG Status</label>
          <div className="flex items-center gap-4">
            {RAG_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="outcome-rag"
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
      </form>
    </Modal>
  );
}
