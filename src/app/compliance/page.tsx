"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import RoleGuard from "@/components/common/RoleGuard";
import ComplianceOverview from "@/components/compliance/ComplianceOverview";
import RegulatoryUniverseTab from "@/components/compliance/RegulatoryUniverseTab";
import SMCRTab from "@/components/compliance/SMCRTab";
import PoliciesTab from "@/components/compliance/PoliciesTab";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/usePageTitle";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "regulatory-universe", label: "Regulatory Universe" },
  { id: "smcr", label: "SM&CR" },
  { id: "policies", label: "Policies" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CompliancePage() {
  usePageTitle("Compliance");
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "overview";
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : "overview"
  );

  return (
    <RoleGuard permission="page:compliance">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Compliance</h1>
          <p className="text-sm text-fca-gray mt-1">
            Regulatory universe, SM&amp;CR accountability, policy governance and compliance assessments.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-updraft-bright-purple text-updraft-deep"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && <ComplianceOverview onNavigate={setActiveTab} />}
        {activeTab === "regulatory-universe" && <RegulatoryUniverseTab />}
        {activeTab === "smcr" && <SMCRTab />}
        {activeTab === "policies" && <PoliciesTab />}
      </div>
    </RoleGuard>
  );
}
