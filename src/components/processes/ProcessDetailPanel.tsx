"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { generateProcessHTML } from "@/lib/export-process-html";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Process } from "@/lib/types";
import {
  PROCESS_CATEGORY_LABELS,
  PROCESS_CATEGORY_COLOURS,
  PROCESS_CRITICALITY_LABELS,
  PROCESS_CRITICALITY_COLOURS,
} from "@/lib/types";
import MaturityBadge from "./MaturityBadge";
import ProcessOverviewTab from "./ProcessOverviewTab";
import ProcessStepsTab from "./ProcessStepsTab";
import ProcessControlsTab from "./ProcessControlsTab";
import ProcessPoliciesTab from "./ProcessPoliciesTab";
import ProcessRegulationsTab from "./ProcessRegulationsTab";
import ProcessRisksTab from "./ProcessRisksTab";
import ProcessIBSTab from "./ProcessIBSTab";
import ProcessFormDialog from "./ProcessFormDialog";

type TabId = "overview" | "steps" | "controls" | "policies" | "regulations" | "risks" | "ibs";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "steps", label: "Steps" },
  { id: "controls", label: "Controls" },
  { id: "policies", label: "Policies" },
  { id: "regulations", label: "Regulations" },
  { id: "risks", label: "Risks" },
  { id: "ibs", label: "IBS" },
];

interface Props {
  process: Process;
  onUpdate: (p: Process) => void;
  onClose: () => void;
}

export default function ProcessDetailPanel({ process, onUpdate, onClose }: Props) {
  const currentUser = useAppStore((s) => s.currentUser);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showEditForm, setShowEditForm] = useState(false);

  // Reset to overview tab when process changes
  useEffect(() => {
    setActiveTab("overview");
    setShowEditForm(false);
  }, [process.id]);

  const catColours = PROCESS_CATEGORY_COLOURS[process.category];
  const critColours = PROCESS_CRITICALITY_COLOURS[process.criticality];

  // Badge counts for tab labels
  const controlCount = process.controlLinks?.length ?? 0;
  const policyCount = process.policyLinks?.length ?? 0;
  const regulationCount = process.regulationLinks?.length ?? 0;
  const riskCount = process.riskLinks?.length ?? 0;
  const ibsCount = process.ibsLinks?.length ?? 0;
  const stepCount = process.steps?.length ?? 0;

  function tabBadge(id: TabId): number {
    switch (id) {
      case "steps": return stepCount;
      case "controls": return controlCount;
      case "policies": return policyCount;
      case "regulations": return regulationCount;
      case "risks": return riskCount;
      case "ibs": return ibsCount;
      default: return 0;
    }
  }

  function handleExport() {
    const html = generateProcessHTML(process);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const filename = `Process_${process.reference}_${date}.html`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full sm:w-[520px] bg-white border-l border-gray-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {/* Reference badge */}
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold bg-updraft-pale-purple/30 text-updraft-deep px-2 py-0.5 rounded">
                  {process.reference}
                </span>
                <MaturityBadge score={process.maturityScore} size="sm" />
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  critColours.bg, critColours.text,
                )}>
                  {PROCESS_CRITICALITY_LABELS[process.criticality]}
                </span>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  catColours.bg, catColours.text,
                )}>
                  {PROCESS_CATEGORY_LABELS[process.category]}
                </span>
              </div>
              <h2 className="font-poppins text-base font-semibold text-updraft-deep leading-snug">
                {process.name}
              </h2>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={handleExport}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Export process to HTML"
                title="Export to HTML"
              >
                <Download size={15} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close panel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <nav className="flex gap-0.5 mt-4 overflow-x-auto scrollbar-none" role="tablist">
            {TABS.map((tab) => {
              const count = tabBadge(tab.id);
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-updraft-pale-purple/40 text-updraft-deep font-semibold"
                      : "text-gray-500 hover:text-updraft-deep hover:bg-gray-50",
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      "inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]",
                      activeTab === tab.id
                        ? "bg-updraft-deep text-white"
                        : "bg-gray-200 text-gray-600",
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "overview" && (
            <ProcessOverviewTab
              process={process}
              onEdit={() => setShowEditForm(true)}
              onNavigateTab={(tab) => setActiveTab(tab as TabId)}
              isCCRO={isCCRO}
            />
          )}
          {activeTab === "steps" && (
            <ProcessStepsTab process={process} onUpdate={onUpdate} isCCRO={isCCRO} />
          )}
          {activeTab === "controls" && (
            <ProcessControlsTab process={process} onUpdate={onUpdate} isCCRO={isCCRO} />
          )}
          {activeTab === "policies" && (
            <ProcessPoliciesTab process={process} onUpdate={onUpdate} isCCRO={isCCRO} />
          )}
          {activeTab === "regulations" && (
            <ProcessRegulationsTab process={process} onUpdate={onUpdate} isCCRO={isCCRO} />
          )}
          {activeTab === "risks" && (
            <ProcessRisksTab process={process} onUpdate={onUpdate} isCCRO={isCCRO} />
          )}
          {activeTab === "ibs" && (
            <ProcessIBSTab process={process} onUpdate={onUpdate} isCCRO={isCCRO} />
          )}
        </div>
      </div>

      {/* Edit dialog */}
      {showEditForm && (
        <ProcessFormDialog
          open={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSave={(updated) => {
            onUpdate(updated);
            setShowEditForm(false);
          }}
          initial={process}
        />
      )}
    </>
  );
}
