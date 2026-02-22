"use client";

import { useState, useEffect, useMemo } from "react";
import { X, ChevronRight, ChevronLeft, Scale, Search, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Policy, PolicyStatus, PolicyRegulatoryLink } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: PolicyStatus[] = ["CURRENT", "OVERDUE", "UNDER_REVIEW", "ARCHIVED"];
const CLASSIFICATION_OPTIONS = ["Internal Only", "Confidential", "Public"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (policy: Policy) => void;
  editPolicy?: Policy | null;
}

type Step = 1 | 2;

export default function PolicyFormDialog({ open, onClose, onSave, editPolicy }: Props) {
  const users = useAppStore((s) => s.users);
  const allRegulations = useAppStore((s) => s.regulations);
  const currentUser = useAppStore((s) => s.currentUser);
  const ccroUsers = users.filter((u) => u.role === "CCRO_TEAM");

  const [step, setStep] = useState<Step>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Step 1 fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PolicyStatus>("CURRENT");
  const [version, setVersion] = useState("1.0");
  const [ownerId, setOwnerId] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [classification, setClassification] = useState("Internal Only");
  const [reviewFrequencyDays, setReviewFrequencyDays] = useState(365);
  const [lastReviewedDate, setLastReviewedDate] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [scope, setScope] = useState("");
  const [applicability, setApplicability] = useState("");
  const [exceptions, setExceptions] = useState("");
  const [relatedPolicies, setRelatedPolicies] = useState("");
  const [storageUrl, setStorageUrl] = useState("");

  // Step 2 fields — selected regulation IDs
  const [selectedRegIds, setSelectedRegIds] = useState<Set<string>>(new Set());
  const [regSearch, setRegSearch] = useState("");

  useEffect(() => {
    if (editPolicy) {
      setName(editPolicy.name);
      setDescription(editPolicy.description);
      setStatus(editPolicy.status);
      setVersion(editPolicy.version);
      setOwnerId(editPolicy.ownerId);
      setApprovedBy(editPolicy.approvedBy ?? "");
      setClassification(editPolicy.classification);
      setReviewFrequencyDays(editPolicy.reviewFrequencyDays);
      setLastReviewedDate(editPolicy.lastReviewedDate?.split("T")[0] ?? "");
      setNextReviewDate(editPolicy.nextReviewDate?.split("T")[0] ?? "");
      setEffectiveDate(editPolicy.effectiveDate?.split("T")[0] ?? "");
      setScope(editPolicy.scope ?? "");
      setApplicability(editPolicy.applicability ?? "");
      setExceptions(editPolicy.exceptions ?? "");
      setRelatedPolicies(editPolicy.relatedPolicies?.join(", ") ?? "");
      setStorageUrl(editPolicy.storageUrl ?? "");
      setSelectedRegIds(new Set((editPolicy.regulatoryLinks ?? []).map((l) => l.regulationId)));
    } else {
      setName("");
      setDescription("");
      setStatus("CURRENT");
      setVersion("1.0");
      setOwnerId(ccroUsers[0]?.id ?? "");
      setApprovedBy("");
      setClassification("Internal Only");
      setReviewFrequencyDays(365);
      setLastReviewedDate("");
      setNextReviewDate("");
      setEffectiveDate("");
      setScope("");
      setApplicability("");
      setExceptions("");
      setRelatedPolicies("");
      setStorageUrl("");
      setSelectedRegIds(new Set());
    }
    setStep(1);
    setErrors({});
    setRegSearch("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPolicy, open]);

  // Applicable regulations, filtered by search
  const applicableRegs = useMemo(
    () => allRegulations.filter((r) => r.isApplicable && r.isActive),
    [allRegulations]
  );
  const filteredRegs = useMemo(() => {
    const q = regSearch.trim().toLowerCase();
    if (!q) return applicableRegs;
    return applicableRegs.filter(
      (r) =>
        r.reference.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.shortName ?? "").toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q)
    );
  }, [applicableRegs, regSearch]);

  if (!open) return null;

  function validateStep1(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Policy name is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!ownerId) newErrors.ownerId = "Owner is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validateStep1()) setStep(2);
  }

  function handleSubmit() {
    if (!validateStep1()) { setStep(1); return; }
    setSaving(true);
    const now = new Date().toISOString();
    const userId = currentUser?.id ?? "system";

    // Build regulatory links from selected IDs
    const existingLinks = editPolicy?.regulatoryLinks ?? [];
    const regulatoryLinks: PolicyRegulatoryLink[] = Array.from(selectedRegIds).map((regId) => {
      const existing = existingLinks.find((l) => l.regulationId === regId);
      if (existing) return existing;
      return {
        id: `prl-${Date.now()}-${regId}`,
        policyId: editPolicy?.id ?? `temp-${Date.now()}`,
        regulationId: regId,
        regulation: allRegulations.find((r) => r.id === regId),
        policySections: null,
        notes: null,
        linkedAt: now,
        linkedBy: userId,
      };
    });

    const policy: Policy = {
      id: editPolicy?.id ?? `temp-${Date.now()}`,
      reference: editPolicy?.reference ?? "POL-???",
      name,
      description,
      status,
      version,
      ownerId,
      approvedBy: approvedBy || null,
      classification,
      reviewFrequencyDays,
      lastReviewedDate: lastReviewedDate || null,
      nextReviewDate: nextReviewDate || null,
      effectiveDate: effectiveDate || null,
      scope: scope || null,
      applicability: applicability || null,
      exceptions: exceptions || null,
      relatedPolicies: relatedPolicies ? relatedPolicies.split(",").map((s) => s.trim()).filter(Boolean) : [],
      storageUrl: storageUrl || null,
      approvingBody: editPolicy?.approvingBody ?? null,
      consumerDutyOutcomes: editPolicy?.consumerDutyOutcomes ?? [],
      createdAt: editPolicy?.createdAt ?? now,
      updatedAt: now,
      owner: users.find((u) => u.id === ownerId),
      regulatoryLinks,
      controlLinks: editPolicy?.controlLinks ?? [],
      obligations: editPolicy?.obligations ?? [],
      auditTrail: editPolicy?.auditTrail ?? [],
    };
    onSave(policy);
    setSaving(false);
    onClose();
  }

  const inputCls = (field: string) =>
    cn(
      "w-full rounded-lg border px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple",
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 rounded-t-xl shrink-0">
          <div>
            <h2 className="text-lg font-bold text-updraft-deep font-poppins">
              {editPolicy ? "Edit Policy" : "New Policy"}
            </h2>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-1">
              {(["1. Policy Details", "2. Linked Regulations"] as const).map((label, idx) => {
                const stepNum = (idx + 1) as Step;
                const isActive = step === stepNum;
                const isDone = step > stepNum;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { if (stepNum < step || (stepNum === 2 && validateStep1())) setStep(stepNum); }}
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors",
                      isActive ? "bg-updraft-bright-purple/10 text-updraft-bright-purple" :
                      isDone ? "text-gray-400 hover:text-updraft-deep" : "text-gray-300"
                    )}
                  >
                    {isDone && <Check size={10} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Policy Name *</label>
                  <input
                    type="text" value={name}
                    onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: "" })); }}
                    onBlur={() => { if (!name.trim()) setErrors((p) => ({ ...p, name: "Policy name is required" })); }}
                    className={inputCls("name")}
                    aria-required="true" aria-invalid={!!errors.name} aria-describedby={errors.name ? "err-name" : undefined}
                  />
                  {errors.name && <p id="err-name" className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors((p) => ({ ...p, description: "" })); }}
                    onBlur={() => { if (!description.trim()) setErrors((p) => ({ ...p, description: "Description is required" })); }}
                    rows={3} className={inputCls("description")}
                    aria-required="true" aria-invalid={!!errors.description} aria-describedby={errors.description ? "err-desc" : undefined}
                  />
                  {errors.description && <p id="err-desc" className="mt-1 text-xs text-red-600">{errors.description}</p>}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as PolicyStatus)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>

                {/* Version */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Version</label>
                  <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls("")} />
                </div>

                {/* Owner */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Owner *</label>
                  <select
                    value={ownerId}
                    onChange={(e) => { setOwnerId(e.target.value); if (errors.ownerId) setErrors((p) => ({ ...p, ownerId: "" })); }}
                    onBlur={() => { if (!ownerId) setErrors((p) => ({ ...p, ownerId: "Owner is required" })); }}
                    className={cn("w-full rounded-lg border px-3 py-2 text-sm", errors.ownerId ? "border-red-400 bg-red-50" : "border-gray-200")}
                    aria-required="true" aria-invalid={!!errors.ownerId} aria-describedby={errors.ownerId ? "err-owner" : undefined}
                  >
                    <option value="">Select owner...</option>
                    {ccroUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  {errors.ownerId && <p id="err-owner" className="mt-1 text-xs text-red-600">{errors.ownerId}</p>}
                </div>

                {/* Approved By */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Approved By</label>
                  <input type="text" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Name or role" className={inputCls("")} />
                </div>

                {/* Classification */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Classification</label>
                  <select value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    {CLASSIFICATION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Review Frequency */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Review Frequency (days)</label>
                  <input type="number" value={reviewFrequencyDays} onChange={(e) => setReviewFrequencyDays(parseInt(e.target.value) || 365)} className={inputCls("")} />
                </div>

                {/* Last Reviewed Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Reviewed Date</label>
                  <input type="date" value={lastReviewedDate} onChange={(e) => setLastReviewedDate(e.target.value)} className={inputCls("")} />
                </div>

                {/* Next Review Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Next Review Date</label>
                  <input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} className={inputCls("")} />
                </div>

                {/* Effective Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Effective Date</label>
                  <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputCls("")} />
                </div>

                {/* Scope */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Scope</label>
                  <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={2} className={inputCls("")} />
                </div>

                {/* Applicability */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Applicability</label>
                  <textarea value={applicability} onChange={(e) => setApplicability(e.target.value)} rows={2} className={inputCls("")} />
                </div>

                {/* Exceptions */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Exceptions</label>
                  <textarea value={exceptions} onChange={(e) => setExceptions(e.target.value)} rows={2} className={inputCls("")} />
                </div>

                {/* Related Policies */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Related Policies (comma-separated)</label>
                  <input type="text" value={relatedPolicies} onChange={(e) => setRelatedPolicies(e.target.value)} placeholder="e.g. Data Protection Policy, Anti-Fraud Policy" className={inputCls("")} />
                </div>

                {/* Storage URL */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Storage URL</label>
                  <input type="url" value={storageUrl} onChange={(e) => setStorageUrl(e.target.value)} placeholder="https://..." className={inputCls("")} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  Select the regulations this policy addresses. Linked regulations are visible in the Policy detail and the Regulatory Universe.
                  {selectedRegIds.size > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-updraft-bright-purple/10 text-updraft-bright-purple px-2 py-0.5 text-xs font-semibold">
                      {selectedRegIds.size} selected
                    </span>
                  )}
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text" value={regSearch} onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="Search regulations by reference, name or body..."
                  className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
                />
              </div>

              {/* Regulation list */}
              {filteredRegs.length === 0 ? (
                <div className="py-8 text-center">
                  <Scale size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No applicable regulations found</p>
                  <p className="text-xs text-gray-400 mt-1">Regulations are managed in Settings → Regulations</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {filteredRegs.map((reg) => {
                    const checked = selectedRegIds.has(reg.id);
                    return (
                      <label
                        key={reg.id}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                          checked
                            ? "border-updraft-bright-purple/40 bg-updraft-pale-purple/10"
                            : "border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedRegIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(reg.id)) next.delete(reg.id);
                              else next.add(reg.id);
                              return next;
                            });
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-updraft-bright-purple accent-updraft-bright-purple shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-gray-700">{reg.reference}</span>
                            <span className="text-xs text-gray-400 uppercase tracking-wide">{reg.body}</span>
                            <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1">{reg.type.replace(/_/g, " ")}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-800 mt-0.5 leading-tight">{reg.name}</p>
                          {reg.shortName && <p className="text-xs text-gray-500 mt-0.5">{reg.shortName}</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {applicableRegs.length === 0 && (
                <p className="text-xs text-gray-400 text-center">
                  No regulations are marked as applicable. Go to Settings → Regulations to configure your regulatory universe.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <div>
            {step === 2 && (
              <button
                type="button" onClick={() => setStep(1)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={14} />Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button" onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {step === 1 ? (
              <button
                type="button" onClick={handleNext}
                className="flex items-center gap-1.5 rounded-lg bg-updraft-deep px-4 py-2 text-sm font-medium text-white hover:bg-updraft-bar transition-colors"
              >
                Next: Regulations <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button" onClick={handleSubmit} disabled={saving}
                className={cn("rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed", "bg-updraft-deep hover:bg-updraft-bar")}
              >
                {saving ? "Saving..." : editPolicy ? "Save Changes" : "Create Policy"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
