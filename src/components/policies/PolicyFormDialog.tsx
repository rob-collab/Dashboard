"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Policy, PolicyStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: PolicyStatus[] = ["CURRENT", "OVERDUE", "UNDER_REVIEW", "ARCHIVED"];
const CLASSIFICATION_OPTIONS = ["Internal Only", "Confidential", "Public"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (policy: Policy) => void;
  editPolicy?: Policy | null;
}

export default function PolicyFormDialog({ open, onClose, onSave, editPolicy }: Props) {
  const users = useAppStore((s) => s.users);
  const ccroUsers = users.filter((u) => u.role === "CCRO_TEAM");

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
    }
  }, [editPolicy, open, ccroUsers]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
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
      createdAt: editPolicy?.createdAt ?? now,
      updatedAt: now,
      owner: users.find((u) => u.id === ownerId),
      regulatoryLinks: editPolicy?.regulatoryLinks ?? [],
      controlLinks: editPolicy?.controlLinks ?? [],
      obligations: editPolicy?.obligations ?? [],
      auditTrail: editPolicy?.auditTrail ?? [],
    };
    onSave(policy);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 rounded-t-xl">
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">
            {editPolicy ? "Edit Policy" : "New Policy"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Policy Name *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
              <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as PolicyStatus)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>

            {/* Version */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Version</label>
              <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Owner */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Owner *</label>
              <select required value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Select owner...</option>
                {ccroUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {/* Approved By */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Approved By</label>
              <input type="text" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Name or role" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Classification */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Classification</label>
              <select value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {CLASSIFICATION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Review Frequency */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Review Frequency (days)</label>
              <input type="number" value={reviewFrequencyDays} onChange={(e) => setReviewFrequencyDays(parseInt(e.target.value) || 365)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Last Reviewed Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Reviewed Date</label>
              <input type="date" value={lastReviewedDate} onChange={(e) => setLastReviewedDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Next Review Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Next Review Date</label>
              <input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Effective Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Effective Date</label>
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Scope */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Scope</label>
              <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Applicability */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Applicability</label>
              <textarea value={applicability} onChange={(e) => setApplicability(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Exceptions */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Exceptions</label>
              <textarea value={exceptions} onChange={(e) => setExceptions(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Related Policies */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Related Policies (comma-separated)</label>
              <input type="text" value={relatedPolicies} onChange={(e) => setRelatedPolicies(e.target.value)} placeholder="e.g. Data Protection Policy, Anti-Fraud Policy" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>

            {/* Storage URL */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Storage URL</label>
              <input type="url" value={storageUrl} onChange={(e) => setStorageUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className={cn("rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors", "bg-updraft-deep hover:bg-updraft-bar")}>
              {editPolicy ? "Save Changes" : "Create Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
