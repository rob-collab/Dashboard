"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Process, ProcessCategory, ProcessType, ProcessStatus, ProcessCriticality, ProcessFrequency, AutomationLevel } from "@/lib/types";
import {
  PROCESS_CATEGORY_LABELS,
  PROCESS_TYPE_LABELS,
  PROCESS_STATUS_LABELS,
  PROCESS_CRITICALITY_LABELS,
  PROCESS_FREQUENCY_LABELS,
  AUTOMATION_LEVEL_LABELS,
} from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (process: Process) => void;
  initial?: Partial<Process>;
}

const CATEGORIES = Object.keys(PROCESS_CATEGORY_LABELS) as ProcessCategory[];
const TYPES = Object.keys(PROCESS_TYPE_LABELS) as ProcessType[];
const STATUSES = Object.keys(PROCESS_STATUS_LABELS) as ProcessStatus[];
const CRITICALITIES = Object.keys(PROCESS_CRITICALITY_LABELS) as ProcessCriticality[];
const FREQUENCIES = Object.keys(PROCESS_FREQUENCY_LABELS) as ProcessFrequency[];
const AUTOMATION_LEVELS = Object.keys(AUTOMATION_LEVEL_LABELS) as AutomationLevel[];

const labelClass = "block text-xs font-medium text-gray-700 mb-1";
const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple outline-none transition-colors";
const inputErrorClass =
  "w-full rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-400 outline-none transition-colors";

export default function ProcessFormDialog({ open, onClose, onSave, initial }: Props) {
  const users = useAppStore((s) => s.users);
  const isEdit = !!initial?.id;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProcessCategory>("COMPLIANCE");
  const [processType, setProcessType] = useState<ProcessType>("CORE");
  const [status, setStatus] = useState<ProcessStatus>("DRAFT");
  const [criticality, setCriticality] = useState<ProcessCriticality>("STANDARD");
  const [frequency, setFrequency] = useState<ProcessFrequency>("AD_HOC");
  const [automationLevel, setAutomationLevel] = useState<AutomationLevel>("MANUAL");
  const [ownerId, setOwnerId] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [scope, setScope] = useState("");
  const [version, setVersion] = useState("1.0");
  const [endToEndSlaDays, setEndToEndSlaDays] = useState("");
  const [smfFunction, setSmfFunction] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate from initial when dialog opens
  useEffect(() => {
    if (open && initial) {
      setName(initial.name ?? "");
      setCategory((initial.category as ProcessCategory) ?? "COMPLIANCE");
      setProcessType((initial.processType as ProcessType) ?? "CORE");
      setStatus((initial.status as ProcessStatus) ?? "DRAFT");
      setCriticality((initial.criticality as ProcessCriticality) ?? "STANDARD");
      setFrequency((initial.frequency as ProcessFrequency) ?? "AD_HOC");
      setAutomationLevel((initial.automationLevel as AutomationLevel) ?? "MANUAL");
      setOwnerId(initial.ownerId ?? "");
      setDescription(initial.description ?? "");
      setPurpose(initial.purpose ?? "");
      setScope(initial.scope ?? "");
      setVersion(initial.version ?? "1.0");
      setEndToEndSlaDays(initial.endToEndSlaDays != null ? String(initial.endToEndSlaDays) : "");
      setSmfFunction(initial.smfFunction ?? "");
      setNextReviewDate(initial.nextReviewDate?.slice(0, 10) ?? "");
    } else if (open && !initial) {
      // Reset for create
      setName("");
      setCategory("COMPLIANCE");
      setProcessType("CORE");
      setStatus("DRAFT");
      setCriticality("STANDARD");
      setFrequency("AD_HOC");
      setAutomationLevel("MANUAL");
      setOwnerId("");
      setDescription("");
      setPurpose("");
      setScope("");
      setVersion("1.0");
      setEndToEndSlaDays("");
      setSmfFunction("");
      setNextReviewDate("");
    }
    setErrors({});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    const body = {
      name: name.trim(),
      category,
      processType,
      status,
      criticality,
      frequency,
      automationLevel,
      ownerId: ownerId || null,
      description: description.trim() || null,
      purpose: purpose.trim() || null,
      scope: scope.trim() || null,
      version: version.trim() || "1.0",
      endToEndSlaDays: endToEndSlaDays !== "" ? Number(endToEndSlaDays) : null,
      smfFunction: smfFunction.trim() || null,
      nextReviewDate: nextReviewDate || null,
    };

    try {
      let result: Process;
      if (isEdit && initial?.id) {
        result = await api<Process>(`/api/processes/${initial.id}`, { method: "PATCH", body });
        toast.success("Process updated");
      } else {
        result = await api<Process>("/api/processes", { method: "POST", body });
        toast.success("Process created");
      }
      onSave(result);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save process");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const activeUsers = users.filter((u) => u.isActive).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="font-poppins text-base font-semibold text-updraft-deep">
            {isEdit ? "Edit Process" : "New Process"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className={labelClass}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: "" })); }}
              placeholder="e.g. Customer KYC Onboarding"
              className={errors.name ? inputErrorClass : inputClass}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Row: Category + Process Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as ProcessCategory)} className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{PROCESS_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Process Type</label>
              <select value={processType} onChange={(e) => setProcessType(e.target.value as ProcessType)} className={inputClass}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{PROCESS_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Status + Criticality */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ProcessStatus)} className={inputClass}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{PROCESS_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Criticality</label>
              <select value={criticality} onChange={(e) => setCriticality(e.target.value as ProcessCriticality)} className={inputClass}>
                {CRITICALITIES.map((c) => (
                  <option key={c} value={c}>{PROCESS_CRITICALITY_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Frequency + Automation Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as ProcessFrequency)} className={inputClass}>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{PROCESS_FREQUENCY_LABELS[f]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Automation Level</label>
              <select value={automationLevel} onChange={(e) => setAutomationLevel(e.target.value as AutomationLevel)} className={inputClass}>
                {AUTOMATION_LEVELS.map((a) => (
                  <option key={a} value={a}>{AUTOMATION_LEVEL_LABELS[a]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Owner */}
          <div>
            <label className={labelClass}>Owner</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputClass}>
              <option value="">Select owner (optional)...</option>
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Row: Version + End-to-End SLA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>End-to-End SLA (days)</label>
              <input
                type="number"
                value={endToEndSlaDays}
                onChange={(e) => setEndToEndSlaDays(e.target.value)}
                placeholder="e.g. 5"
                min={0}
                className={inputClass}
              />
            </div>
          </div>

          {/* Row: SMF Function + Next Review Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>SMF Function</label>
              <input
                type="text"
                value={smfFunction}
                onChange={(e) => setSmfFunction(e.target.value)}
                placeholder="e.g. SMF16"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Next Review Date</label>
              <input
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what this process does..."
              className={cn(inputClass, "resize-y")}
            />
          </div>

          {/* Purpose */}
          <div>
            <label className={labelClass}>Purpose</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              placeholder="Why does this process exist?"
              className={cn(inputClass, "resize-y")}
            />
          </div>

          {/* Scope */}
          <div>
            <label className={labelClass}>Scope</label>
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={2}
              placeholder="What does this process cover?"
              className={cn(inputClass, "resize-y")}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 shrink-0 bg-gray-50/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-updraft-deep hover:bg-updraft-bar rounded-lg transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {saving ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Changes" : "Create Process"}
          </button>
        </div>
      </div>
    </div>
  );
}
