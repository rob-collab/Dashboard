"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Pencil,
  User,
  Shield,
  FileText,
  Calendar,
  Clock,
  Tag,
  CheckCircle2,
} from "lucide-react";
import RequestEditAccessButton from "@/components/common/RequestEditAccessButton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useAppStore } from "@/lib/store";
import type { Policy } from "@/lib/types";
import { POLICY_STATUS_LABELS, POLICY_STATUS_COLOURS } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";

interface Props {
  policy: Policy;
  onEdit: () => void;
}

const HEALTH_COLOURS = {
  Pass: "#22c55e",
  Fail: "#ef4444",
  Partial: "#f59e0b",
  "Not Tested": "#d1d5db",
};

export default function PolicyOverviewTab({ policy, onEdit }: Props) {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const owner = policy.owner ?? users.find((u) => u.id === policy.ownerId);
  const isOverdue = policy.status === "OVERDUE" || (policy.nextReviewDate && new Date(policy.nextReviewDate) < new Date());

  // Control health from linked controls
  const controlLinks = policy.controlLinks ?? [];
  const controlHealth = useMemo(() => {
    const h = { pass: 0, fail: 0, partial: 0, notTested: 0, total: controlLinks.length };
    for (const link of controlLinks) {
      const ctrl = link.control;
      if (!ctrl) continue;
      const schedule = ctrl.testingSchedule;
      const results = schedule?.testResults ?? [];
      if (results.length === 0) { h.notTested++; continue; }
      const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
      const latest = sorted[0];
      if (latest.result === "PASS") h.pass++;
      else if (latest.result === "FAIL") h.fail++;
      else if (latest.result === "PARTIALLY") h.partial++;
      else h.notTested++;
    }
    return h;
  }, [controlLinks]);

  const donutData = useMemo(() => [
    { name: "Pass", value: controlHealth.pass, colour: HEALTH_COLOURS.Pass },
    { name: "Fail", value: controlHealth.fail, colour: HEALTH_COLOURS.Fail },
    { name: "Partial", value: controlHealth.partial, colour: HEALTH_COLOURS.Partial },
    { name: "Not Tested", value: controlHealth.notTested, colour: HEALTH_COLOURS["Not Tested"] },
  ].filter(d => d.value > 0), [controlHealth]);

  return (
    <div className="space-y-6">
      {/* Overdue Alert */}
      {isOverdue && (
        <div className="relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-red-100 px-4 py-3">
          <div className="absolute -right-4 -top-4 opacity-10">
            <AlertTriangle size={80} className="text-red-600" />
          </div>
          <div className="relative flex items-center gap-2">
            <div className="rounded-lg bg-red-500 p-1.5">
              <AlertTriangle size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-red-800 font-semibold">Policy Overdue for Review</p>
              {policy.nextReviewDate && (
                <p className="text-xs text-red-600 mt-0.5">
                  Review was due {new Date(policy.nextReviewDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Button / Request Access */}
      <div className="flex justify-end gap-2">
        {isCCRO ? (
          <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Pencil size={12} /> Edit Policy
          </button>
        ) : (
          <RequestEditAccessButton
            permission="edit:policies"
            entityType="Policy"
            entityId={policy.id}
            entityName={`${policy.reference} – ${policy.name}`}
          />
        )}
      </div>

      {/* Metadata Grid */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Policy Details</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          <Field icon={<User size={12} className="text-updraft-bright-purple" />} label="Owner" value={owner?.name ?? "—"} />
          <Field icon={<CheckCircle2 size={12} className="text-updraft-bright-purple" />} label="Approved By" value={policy.approvedBy ?? "—"} />
          <Field icon={<Shield size={12} className="text-updraft-bright-purple" />} label="Classification" value={policy.classification} />
          <Field icon={<Tag size={12} className="text-updraft-bright-purple" />} label="Version" value={policy.version} />
          <Field icon={<Clock size={12} className="text-updraft-bright-purple" />} label="Review Frequency" value={`${policy.reviewFrequencyDays} days`} />
          <Field icon={<FileText size={12} className="text-updraft-bright-purple" />} label="Status">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", POLICY_STATUS_COLOURS[policy.status].bg, POLICY_STATUS_COLOURS[policy.status].text)}>
              {POLICY_STATUS_LABELS[policy.status]}
            </span>
          </Field>
          <Field icon={<Calendar size={12} className="text-updraft-bright-purple" />} label="Effective Date" value={policy.effectiveDate ? formatDate(policy.effectiveDate) : "—"} />
          <Field icon={<Calendar size={12} className="text-updraft-bright-purple" />} label="Last Reviewed" value={policy.lastReviewedDate ? formatDate(policy.lastReviewedDate) : "—"} />
          <Field icon={<Calendar size={12} className="text-updraft-bright-purple" />} label="Next Review" value={policy.nextReviewDate ? formatDate(policy.nextReviewDate) : "—"} />
          <Field icon={<Calendar size={12} className="text-updraft-bright-purple" />} label="Created" value={formatDate(policy.createdAt)} />
        </div>
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
              <span key={p} className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2.5 py-0.5 text-xs font-medium">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Control Health Donut */}
      {controlHealth.total > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Controls Health</h3>
          </div>
          <div className="p-4 flex items-center gap-6">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {donutData.map((d, i) => (
                    <Cell key={i} fill={d.colour} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}`]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-600">Pass</span>
                <span className="text-xs font-bold text-gray-800">{controlHealth.pass}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-600">Partial</span>
                <span className="text-xs font-bold text-gray-800">{controlHealth.partial}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-gray-600">Fail</span>
                <span className="text-xs font-bold text-gray-800">{controlHealth.fail}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-600">Not Tested</span>
                <span className="text-xs font-bold text-gray-800">{controlHealth.notTested}</span>
              </div>
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

function Field({ icon, label, value, children }: { icon?: React.ReactNode; label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        {icon}
        {label}
      </label>
      {children ?? <p className="text-sm text-gray-800 mt-0.5">{value}</p>}
    </div>
  );
}
