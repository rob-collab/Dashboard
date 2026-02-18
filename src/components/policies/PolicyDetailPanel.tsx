"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Policy } from "@/lib/types";
import { POLICY_STATUS_LABELS, POLICY_STATUS_COLOURS } from "@/lib/types";
import { cn } from "@/lib/utils";
import PolicyOverviewTab from "./PolicyOverviewTab";
import PolicyRegulationsTab from "./PolicyRegulationsTab";
import PolicyControlsTab from "./PolicyControlsTab";
import PolicyObligationsTab from "./PolicyObligationsTab";
import PolicyAuditTab from "./PolicyAuditTab";
import PolicyFormDialog from "./PolicyFormDialog";

type TabKey = "overview" | "regulations" | "controls" | "obligations" | "audit";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "regulations", label: "Regulatory Mapping" },
  { key: "controls", label: "Controls & Testing" },
  { key: "obligations", label: "Obligations" },
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

  const sc = POLICY_STATUS_COLOURS[policy.status];

  function handleEditSave(updated: Policy) {
    onUpdate(updated);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-2xl bg-white shadow-xl border-l border-gray-200 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold rounded-md bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5">{policy.reference}</span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", sc.bg, sc.text)}>
                {POLICY_STATUS_LABELS[policy.status]}
              </span>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">{policy.name}</h2>
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
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "overview" && <PolicyOverviewTab policy={policy} onEdit={() => setShowEditForm(true)} />}
          {tab === "regulations" && <PolicyRegulationsTab policy={policy} onUpdate={onUpdate} />}
          {tab === "controls" && <PolicyControlsTab policy={policy} onUpdate={onUpdate} />}
          {tab === "obligations" && <PolicyObligationsTab policy={policy} onUpdate={onUpdate} />}
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
