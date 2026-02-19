"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import SMFDirectory from "./smcr/SMFDirectory";
import ResponsibilitiesMatrix from "./smcr/ResponsibilitiesMatrix";
import CertificationTracker from "./smcr/CertificationTracker";
import ConductRulesPanel from "./smcr/ConductRulesPanel";
import DocumentTracker from "./smcr/DocumentTracker";
import { Shield, ClipboardList, Award, Scale, FileText } from "lucide-react";

const SUB_TABS = [
  { key: "smf-directory", label: "SMF Directory", icon: Shield },
  { key: "responsibilities", label: "Responsibilities", icon: ClipboardList },
  { key: "certification", label: "Certification", icon: Award },
  { key: "conduct-rules", label: "Conduct Rules", icon: Scale },
  { key: "documents", label: "Documents", icon: FileText },
] as const;

type SubTab = (typeof SUB_TABS)[number]["key"];

export default function SMCRTab() {
  const [activeTab, setActiveTab] = useState<SubTab>("smf-directory");

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px",
              activeTab === key
                ? "border-updraft-bright-purple text-updraft-deep"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Active sub-tab content */}
      {activeTab === "smf-directory" && <SMFDirectory />}
      {activeTab === "responsibilities" && <ResponsibilitiesMatrix />}
      {activeTab === "certification" && <CertificationTracker />}
      {activeTab === "conduct-rules" && <ConductRulesPanel />}
      {activeTab === "documents" && <DocumentTracker />}
    </div>
  );
}
