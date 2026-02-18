"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { ControlRecord } from "@/lib/types";
import {
  CD_OUTCOME_LABELS,
  CONTROL_FREQUENCY_LABELS,
  CONTROL_TYPE_LABELS,
} from "@/lib/types";
import type { ConsumerDutyOutcomeType, ControlFrequency, ControlType } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";

interface ControlSuggestChangeFormProps {
  control: ControlRecord;
  onSubmitted: () => void;
}

const CHANGEABLE_FIELDS = [
  { key: "controlName", label: "Control Name", type: "text" as const },
  { key: "controlDescription", label: "Description", type: "textarea" as const },
  { key: "controlOwnerId", label: "Owner", type: "user-select" as const },
  { key: "consumerDutyOutcome", label: "CD Outcome", type: "cd-outcome" as const },
  { key: "controlFrequency", label: "Frequency", type: "frequency" as const },
  { key: "controlType", label: "Control Type", type: "control-type" as const },
  { key: "internalOrThirdParty", label: "Internal / Third Party", type: "int-ext" as const },
] as const;

export default function ControlSuggestChangeForm({
  control,
  onSubmitted,
}: ControlSuggestChangeFormProps) {
  const users = useAppStore((s) => s.users);

  const [selectedField, setSelectedField] = useState("");
  const [newValue, setNewValue] = useState("");
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldDef = CHANGEABLE_FIELDS.find((f) => f.key === selectedField);

  function getCurrentValue(): string {
    if (!selectedField) return "";
    const val = control[selectedField as keyof ControlRecord];
    if (val === null || val === undefined) return "";
    return String(val);
  }

  function getCurrentDisplayValue(): string {
    if (!selectedField) return "";
    const raw = getCurrentValue();
    if (selectedField === "controlOwnerId") {
      return control.controlOwner?.name ?? users.find((u) => u.id === raw)?.name ?? raw;
    }
    if (selectedField === "consumerDutyOutcome") {
      return CD_OUTCOME_LABELS[raw as ConsumerDutyOutcomeType] ?? raw;
    }
    if (selectedField === "controlFrequency") {
      return CONTROL_FREQUENCY_LABELS[raw as ControlFrequency] ?? raw;
    }
    if (selectedField === "controlType") {
      return raw ? (CONTROL_TYPE_LABELS[raw as ControlType] ?? raw) : "(Not set)";
    }
    if (selectedField === "internalOrThirdParty") {
      return raw === "THIRD_PARTY" ? "Third Party" : "Internal";
    }
    return raw;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedField || !rationale.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await api(`/api/controls/library/${control.id}/changes`, {
        method: "POST",
        body: {
          fieldChanged: selectedField,
          oldValue: getCurrentValue(),
          newValue: newValue || null,
          rationale: rationale.trim(),
        },
      });

      setSelectedField("");
      setNewValue("");
      setRationale("");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit change proposal");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClasses =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors";

  function renderNewValueInput() {
    if (!fieldDef) return null;

    switch (fieldDef.type) {
      case "textarea":
        return (
          <textarea
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Proposed new value..."
            rows={3}
            className={inputClasses}
          />
        );
      case "user-select":
        return (
          <select value={newValue} onChange={(e) => setNewValue(e.target.value)} className={inputClasses}>
            <option value="">Select user...</option>
            {users.filter((u) => u.isActive).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        );
      case "cd-outcome":
        return (
          <select value={newValue} onChange={(e) => setNewValue(e.target.value)} className={inputClasses}>
            <option value="">Select outcome...</option>
            {(Object.entries(CD_OUTCOME_LABELS) as [ConsumerDutyOutcomeType, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        );
      case "frequency":
        return (
          <select value={newValue} onChange={(e) => setNewValue(e.target.value)} className={inputClasses}>
            <option value="">Select frequency...</option>
            {(Object.entries(CONTROL_FREQUENCY_LABELS) as [ControlFrequency, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        );
      case "control-type":
        return (
          <select value={newValue} onChange={(e) => setNewValue(e.target.value)} className={inputClasses}>
            <option value="">Select type...</option>
            {(Object.entries(CONTROL_TYPE_LABELS) as [ControlType, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        );
      case "int-ext":
        return (
          <select value={newValue} onChange={(e) => setNewValue(e.target.value)} className={inputClasses}>
            <option value="">Select...</option>
            <option value="INTERNAL">Internal</option>
            <option value="THIRD_PARTY">Third Party</option>
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Proposed new value..."
            className={inputClasses}
          />
        );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Field selector */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Field to change
        </label>
        <select
          value={selectedField}
          onChange={(e) => { setSelectedField(e.target.value); setNewValue(""); }}
          className={inputClasses}
        >
          <option value="">Select a field...</option>
          {CHANGEABLE_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Current value (read-only) */}
      {selectedField && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Current value
          </label>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {getCurrentDisplayValue() || "(Not set)"}
          </div>
        </div>
      )}

      {/* New value input */}
      {selectedField && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Proposed new value
          </label>
          {renderNewValueInput()}
        </div>
      )}

      {/* Rationale (always visible when field selected) */}
      {selectedField && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Rationale <span className="text-red-400">*</span>
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Explain why this change is needed..."
            rows={2}
            className={inputClasses}
          />
        </div>
      )}

      {selectedField && (
        <button
          type="submit"
          disabled={submitting || !rationale.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-3 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={14} />
          {submitting ? "Submitting..." : "Submit Proposal"}
        </button>
      )}
    </form>
  );
}
