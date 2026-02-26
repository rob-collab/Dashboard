"use client";

import { useState } from "react";
import { X, Info, Map, Layers, FlaskConical } from "lucide-react";
import type { ImportantBusinessService } from "@/lib/types";
import { IBS_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import IBSOverviewTab from "./IBSOverviewTab";
import IBSResourceMapTab from "./IBSResourceMapTab";
import IBSProcessesTab from "./IBSProcessesTab";
import IBSScenarioTestingTab from "./IBSScenarioTestingTab";

type Tab = "overview" | "resource-map" | "processes" | "scenarios";

const TABS: { id: Tab; label: string; icon: typeof Info }[] = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "resource-map", label: "Resource Map", icon: Map },
  { id: "processes", label: "Processes", icon: Layers },
  { id: "scenarios", label: "Scenario Testing", icon: FlaskConical },
];

export default function IBSDetailPanel({
  ibs,
  onUpdate,
  onClose,
  isCCRO,
}: {
  ibs: ImportantBusinessService;
  onUpdate: (updated: ImportantBusinessService) => void;
  onClose: () => void;
  isCCRO: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const statusColour = ibs.status === "ACTIVE"
    ? "bg-green-100 text-green-700"
    : ibs.status === "UNDER_REVIEW"
    ? "bg-amber-100 text-amber-700"
    : "bg-gray-100 text-gray-500";

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-updraft-deep to-updraft-bar flex items-start justify-between px-5 py-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono bg-white/20 text-white px-2 py-0.5 rounded">{ibs.reference}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColour)}>
              {IBS_STATUS_LABELS[ibs.status]}
            </span>
          </div>
          <h2 className="font-poppins font-semibold text-white text-sm leading-snug">{ibs.name}</h2>
          {ibs.smfAccountable && (
            <p className="text-xs text-white/50 mt-0.5">{ibs.smfAccountable}</p>
          )}
        </div>
        <button onClick={onClose} className="ml-3 p-1 text-white/70 hover:bg-white/10 hover:text-white rounded shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 px-4 border-b border-gray-200 shrink-0 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "border-updraft-bright-purple text-updraft-deep"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && (
          <IBSOverviewTab ibs={ibs} onUpdate={onUpdate} isCCRO={isCCRO} />
        )}
        {activeTab === "resource-map" && (
          <IBSResourceMapTab ibsId={ibs.id} isCCRO={isCCRO} />
        )}
        {activeTab === "processes" && (
          <IBSProcessesTab ibs={ibs} />
        )}
        {activeTab === "scenarios" && (
          <IBSScenarioTestingTab ibsId={ibs.id} isCCRO={isCCRO} />
        )}
      </div>
    </div>
  );
}
