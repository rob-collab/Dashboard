"use client";

import { AlertTriangle, ExternalLink, Pencil } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Policy } from "@/lib/types";
import { POLICY_STATUS_LABELS, POLICY_STATUS_COLOURS } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";

interface Props {
  policy: Policy;
  onEdit: () => void;
}

export default function PolicyOverviewTab({ policy, onEdit }: Props) {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const owner = policy.owner ?? users.find((u) => u.id === policy.ownerId);
  const isOverdue = policy.status === "OVERDUE" || (policy.nextReviewDate && new Date(policy.nextReviewDate) < new Date());

  // Control health from linked controls
  const controlLinks = policy.controlLinks ?? [];
  const controlHealth = { pass: 0, fail: 0, partial: 0, total: controlLinks.length };
  for (const link of controlLinks) {
    const ctrl = link.control;
    if (!ctrl) continue;
    const schedule = ctrl.testingSchedule;
    const results = schedule?.testResults ?? [];
    if (results.length === 0) continue;
    const latest = results[results.length - 1];
    if (latest.result === "PASS") controlHealth.pass++;
    else if (latest.result === "FAIL") controlHealth.fail++;
    else if (latest.result === "PARTIALLY") controlHealth.partial++;
  }

  return (
    <div className="space-y-6">
      {/* Overdue Alert */}
      {isOverdue && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            This policy is overdue for review
            {policy.nextReviewDate && ` (due ${new Date(policy.nextReviewDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`}
          </p>
        </div>
      )}

      {/* Edit Button */}
      {isCCRO && (
        <div className="flex justify-end">
          <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Pencil size={12} /> Edit Policy
          </button>
        </div>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Owner" value={owner?.name ?? "—"} />
        <Field label="Approved By" value={policy.approvedBy ?? "—"} />
        <Field label="Classification" value={policy.classification} />
        <Field label="Version" value={policy.version} />
        <Field label="Review Frequency" value={`${policy.reviewFrequencyDays} days`} />
        <Field label="Status">
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", POLICY_STATUS_COLOURS[policy.status].bg, POLICY_STATUS_COLOURS[policy.status].text)}>
            {POLICY_STATUS_LABELS[policy.status]}
          </span>
        </Field>
        <Field label="Effective Date" value={policy.effectiveDate ? formatDate(policy.effectiveDate) : "—"} />
        <Field label="Last Reviewed" value={policy.lastReviewedDate ? formatDate(policy.lastReviewedDate) : "—"} />
        <Field label="Next Review" value={policy.nextReviewDate ? formatDate(policy.nextReviewDate) : "—"} />
        <Field label="Created" value={formatDate(policy.createdAt)} />
      </div>

      {/* Scope */}
      {policy.scope && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Scope</label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{policy.scope}</p>
        </div>
      )}

      {/* Applicability */}
      {policy.applicability && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Applicability</label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{policy.applicability}</p>
        </div>
      )}

      {/* Exceptions */}
      {policy.exceptions && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Exceptions</label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{policy.exceptions}</p>
        </div>
      )}

      {/* Storage URL */}
      {policy.storageUrl && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Policy Document</label>
          <a href={policy.storageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-updraft-bright-purple hover:underline">
            <ExternalLink size={12} /> View Document
          </a>
        </div>
      )}

      {/* Related Policies */}
      {policy.relatedPolicies.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Related Policies</label>
          <div className="flex flex-wrap gap-1.5">
            {policy.relatedPolicies.map((p) => (
              <span key={p} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Control Health */}
      {controlHealth.total > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Controls Health</label>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden flex">
              {controlHealth.pass > 0 && <div className="bg-green-500 h-full" style={{ width: `${(controlHealth.pass / controlHealth.total) * 100}%` }} />}
              {controlHealth.partial > 0 && <div className="bg-amber-500 h-full" style={{ width: `${(controlHealth.partial / controlHealth.total) * 100}%` }} />}
              {controlHealth.fail > 0 && <div className="bg-red-500 h-full" style={{ width: `${(controlHealth.fail / controlHealth.total) * 100}%` }} />}
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="text-green-600 font-medium">{controlHealth.pass} Pass</span>
              <span className="text-amber-600 font-medium">{controlHealth.partial} Partial</span>
              <span className="text-red-600 font-medium">{controlHealth.fail} Fail</span>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
        <p className="text-sm text-gray-700 whitespace-pre-line">{policy.description}</p>
      </div>
    </div>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
      {children ?? <p className="text-sm text-gray-800 mt-0.5">{value}</p>}
    </div>
  );
}
