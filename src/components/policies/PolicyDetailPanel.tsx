"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Shield, BookOpen, Scale } from "lucide-react";
import type { Policy } from "@/lib/types";
import { POLICY_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import PolicyOverviewTab from "./PolicyOverviewTab";
import PolicyRegulationsTab from "./PolicyRegulationsTab";
import PolicyControlsTab from "./PolicyControlsTab";
import PolicyObligationsTab from "./PolicyObligationsTab";
import PolicyAuditTab from "./PolicyAuditTab";
import PolicyConsumerDutyTab from "./PolicyConsumerDutyTab";
import PolicyFormDialog from "./PolicyFormDialog";
import PolicyProcessesTab from "./PolicyProcessesTab";

type TabKey = "overview" | "regulations" | "controls" | "obligations" | "consumer-duty" | "processes" | "audit";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "regulations", label: "Regulatory Mapping" },
  { key: "controls", label: "Controls & Testing" },
  { key: "obligations", label: "Requirements" },
  { key: "consumer-duty", label: "Consumer Duty" },
  { key: "processes", label: "Processes" },
  { key: "audit", label: "Audit History" },
];

interface Props {
  policy: Policy;
  onClose: () => void;
  onUpdate: (policy: Policy) => void;
}

export default function PolicyDetailPanel({ policy, onClose, onUpdate }: Props) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [showEditForm, setShowEditForm] = useState(false);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Health summary
  const healthSummary = useMemo(() => {
    const controls = policy.controlLinks?.length ?? 0;
    const regulations = policy.regulatoryLinks?.length ?? 0;
    const obligations = policy.obligations?.length ?? 0;

    let pass = 0;
    for (const link of policy.controlLinks ?? []) {
      const ctrl = link.control;
      if (!ctrl) continue;
      const results = ctrl.testingSchedule?.testResults ?? [];
      if (results.length > 0) {
        const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
        if (sorted[0].result === "PASS") pass++;
      }
    }

    return { controls, pass, regulations, obligations };
  }, [policy]);

  function handleEditSave(updated: Policy) {
    onUpdate(updated);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-3xl bg-white shadow-xl border-l border-gray-200 flex flex-col animate-slide-in-right">
        {/* Gradient Header */}
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-r from-updraft-deep to-updraft-bar px-6 py-5">
          {/* Decorative */}
          <div className="absolute -top-4 -right-4 opacity-10">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="50" stroke="white" strokeWidth="1.5" />
              <circle cx="60" cy="60" r="30" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>

          <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium mb-2">Policy Review › {policy.reference}</p>
          <div className="relative flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold rounded-md bg-white/20 text-white px-2.5 py-1">{policy.reference}</span>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                policy.status === "OVERDUE" ? "bg-red-500 text-white" :
                policy.status === "CURRENT" ? "bg-green-500 text-white" :
                policy.status === "UNDER_REVIEW" ? "bg-amber-500 text-white" :
                "bg-gray-500 text-white"
              )}>
                {POLICY_STATUS_LABELS[policy.status]}
              </span>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10 transition-colors">
              <X size={18} className="text-white/80" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-white font-poppins">{policy.name}</h2>

          {/* Health summary */}
          <div className="flex items-center gap-4 mt-3 text-white/70 text-xs">
            <span className="inline-flex items-center gap-1">
              <Shield size={12} />
              {healthSummary.controls} controls{healthSummary.controls > 0 && `, ${healthSummary.pass} pass`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Scale size={12} />
              {healthSummary.regulations} regulations
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen size={12} />
              {healthSummary.obligations} requirements
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex items-center gap-1 border-b border-gray-200 px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors",
                tab === t.key ? "border-updraft-bright-purple text-updraft-deep" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
              {t.key === "regulations" && (policy.regulatoryLinks?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">{policy.regulatoryLinks?.length}</span>
              )}
              {t.key === "controls" && (policy.controlLinks?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">{policy.controlLinks?.length}</span>
              )}
              {t.key === "obligations" && (policy.obligations?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">{policy.obligations?.length}</span>
              )}
              {t.key === "consumer-duty" && (policy.consumerDutyOutcomes?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">{policy.consumerDutyOutcomes?.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-16">
          {tab === "overview" && <PolicyOverviewTab policy={policy} onEdit={() => setShowEditForm(true)} onSwitchToControls={healthSummary.controls > 0 ? () => setTab("controls") : undefined} />}
          {tab === "regulations" && <PolicyRegulationsTab policy={policy} onUpdate={onUpdate} />}
          {tab === "controls" && <PolicyControlsTab policy={policy} onUpdate={onUpdate} />}
          {tab === "obligations" && <PolicyObligationsTab policy={policy} onUpdate={onUpdate} />}
          {tab === "consumer-duty" && <PolicyConsumerDutyTab policy={policy} onUpdate={onUpdate} />}
          {tab === "processes" && <PolicyProcessesTab policy={policy} />}
          {tab === "audit" && <PolicyAuditTab policy={policy} />}
        </div>
      </div>

      {/* Edit Form */}
      <PolicyFormDialog
        open={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSave={handleEditSave}
        editPolicy={policy}
      />
    </>
  );
}
