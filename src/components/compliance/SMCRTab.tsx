"use client";

import { useState } from "react";
import SMFDirectory from "./smcr/SMFDirectory";
import { GlowMenu } from "@/components/ui/glow-menu";
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
      <GlowMenu
        items={SUB_TABS.map(({ key, label, icon }) => ({ id: key, label, icon }))}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as SubTab)}
        menuId="smcr"
      />

      {/* Active sub-tab content */}
      {activeTab === "smf-directory" && <SMFDirectory />}
      {activeTab === "responsibilities" && <ResponsibilitiesMatrix />}
      {activeTab === "certification" && <CertificationTracker />}
      {activeTab === "conduct-rules" && <ConductRulesPanel />}
      {activeTab === "documents" && <DocumentTracker />}
    </div>
  );
}
