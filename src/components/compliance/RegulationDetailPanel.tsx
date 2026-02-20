"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { usePermissionSet } from "@/lib/usePermission";
import {
  APPLICABILITY_LABELS,
  APPLICABILITY_COLOURS,
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLOURS,
  type Regulation,
  type ComplianceStatus,
  type Applicability,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { X, ExternalLink, ShieldCheck, FileText } from "lucide-react";
import EntityLink from "@/components/common/EntityLink";

interface Props {
  regulation: Regulation;
  onClose: () => void;
}

export default function RegulationDetailPanel({ regulation, onClose }: Props) {
  const permissionSet = usePermissionSet();
  const canEdit = permissionSet.has("edit:compliance");
  const updateRegulationCompliance = useAppStore((s) => s.updateRegulationCompliance);
  const controls = useAppStore((s) => s.controls);
  const policies = useAppStore((s) => s.policies);
  const smfRoles = useAppStore((s) => s.smfRoles);

  const status = (regulation.complianceStatus ?? "NOT_ASSESSED") as ComplianceStatus;
  const applicability = (regulation.applicability ?? "ASSESS") as Applicability;
  const statusColours = COMPLIANCE_STATUS_COLOURS[status];
  const appColours = APPLICABILITY_COLOURS[applicability];

  // SM&CR holder names
  const primaryHolder = regulation.primarySMF
    ? smfRoles.find((r) => r.smfId === regulation.primarySMF)
    : null;
  const secondaryHolder = regulation.secondarySMF
    ? smfRoles.find((r) => r.smfId === regulation.secondarySMF)
    : null;

  const [editStatus, setEditStatus] = useState(status);
  const [editNotes, setEditNotes] = useState(regulation.assessmentNotes ?? "");
  const [editNextReview, setEditNextReview] = useState(regulation.nextReviewDate?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    updateRegulationCompliance(regulation.id, {
      complianceStatus: editStatus,
      assessmentNotes: editNotes || undefined,
      nextReviewDate: editNextReview || undefined,
    });
    setTimeout(() => setSaving(false), 300);
  };

  return (
    <div className="w-[40%] min-w-[380px] max-w-[500px] border border-gray-200 rounded-lg bg-white shadow-lg overflow-y-auto max-h-[calc(100vh-200px)] sticky top-4">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{regulation.reference}</span>
            <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold", appColours.bg, appColours.text)}>
              {APPLICABILITY_LABELS[applicability]}
            </span>
          </div>
          <h3 className="text-base font-semibold text-updraft-deep font-poppins">{regulation.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span>{regulation.body}</span>
            {regulation.type && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{regulation.type.replace(/_/g, " ")}</span>}
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded shrink-0" aria-label="Close panel">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Description */}
        {regulation.description && (
          <section>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
            <p className="text-sm text-gray-700">{regulation.description}</p>
          </section>
        )}

        {/* Provisions */}
        {regulation.provisions && (
          <section>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Provisions</h4>
            <p className="text-sm text-gray-600 font-mono">{regulation.provisions}</p>
          </section>
        )}

        {/* URL */}
        {regulation.url && (
          <a href={regulation.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-updraft-bright-purple hover:underline">
            <ExternalLink size={14} /> View Source
          </a>
        )}

        {/* SMF Accountability */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">SMF Accountability</h4>
          <div className="space-y-2">
            {regulation.primarySMF && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-16">Primary</span>
                <span className="text-sm font-semibold text-updraft-deep">{regulation.primarySMF}</span>
                {primaryHolder?.currentHolder && (
                  <span className="text-xs text-gray-500">({primaryHolder.currentHolder.name})</span>
                )}
              </div>
            )}
            {regulation.secondarySMF && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-16">Secondary</span>
                <span className="text-sm font-medium text-gray-700">{regulation.secondarySMF}</span>
                {secondaryHolder?.currentHolder && (
                  <span className="text-xs text-gray-500">({secondaryHolder.currentHolder.name})</span>
                )}
              </div>
            )}
            {!regulation.primarySMF && !regulation.secondarySMF && (
              <p className="text-xs text-gray-400 italic">No SMF assigned</p>
            )}
          </div>
        </section>

        {/* Compliance Assessment (editable for CCRO) */}
        <section className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Compliance Assessment</h4>
          {canEdit ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ComplianceStatus)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                >
                  {(Object.entries(COMPLIANCE_STATUS_LABELS) as [ComplianceStatus, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Assessment Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Add assessment notes..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Next Review Date</label>
                <input
                  type="date"
                  value={editNextReview}
                  onChange={(e) => setEditNextReview(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-updraft-bright-purple rounded-lg hover:bg-updraft-deep transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Assessment"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", statusColours.dot)} />
                <span className="text-sm font-medium">{COMPLIANCE_STATUS_LABELS[status]}</span>
              </div>
              {regulation.assessmentNotes && <p className="text-sm text-gray-600">{regulation.assessmentNotes}</p>}
              {regulation.lastAssessedAt && <p className="text-xs text-gray-400">Last assessed: {new Date(regulation.lastAssessedAt).toLocaleDateString("en-GB")}</p>}
              {regulation.nextReviewDate && <p className="text-xs text-gray-400">Next review: {new Date(regulation.nextReviewDate).toLocaleDateString("en-GB")}</p>}
            </div>
          )}
        </section>

        {/* Linked Policies */}
        <section className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <FileText size={12} className="inline mr-1" />
            Linked Policies ({regulation.policyLinks?.length ?? 0})
          </h4>
          {regulation.policyLinks && regulation.policyLinks.length > 0 ? (
            <div className="space-y-1.5">
              {regulation.policyLinks.map((link) => {
                const policy = policies.find((p) => p.id === link.policyId);
                return (
                  <div key={link.id || link.policyId} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1.5">
                    <EntityLink
                      type="policy"
                      id={link.policyId}
                      reference={policy?.reference}
                      label={policy?.name ?? "Unknown policy"}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No policies linked</p>
          )}
        </section>

        {/* Linked Controls */}
        <section className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <ShieldCheck size={12} className="inline mr-1" />
            Linked Controls ({regulation.controlLinks?.length ?? 0})
          </h4>
          {regulation.controlLinks && regulation.controlLinks.length > 0 ? (
            <div className="space-y-1.5">
              {regulation.controlLinks.map((link) => {
                const control = controls.find((c) => c.id === link.controlId);
                return (
                  <div key={link.id || link.controlId} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1.5">
                    <EntityLink
                      type="control"
                      id={link.controlId}
                      reference={control?.controlRef}
                      label={control?.controlName ?? "Unknown control"}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No controls linked</p>
          )}
        </section>
      </div>
    </div>
  );
}
