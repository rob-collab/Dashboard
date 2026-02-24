"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import RoleGuard from "@/components/common/RoleGuard";
import ComplianceOverview from "@/components/compliance/ComplianceOverview";
import RegulatoryUniverseTab from "@/components/compliance/RegulatoryUniverseTab";
import SMCRTab from "@/components/compliance/SMCRTab";
import PoliciesTab from "@/components/compliance/PoliciesTab";
import CoverageChainTab from "@/components/compliance/CoverageChainTab";
import ComplianceRoadmapTab from "@/components/compliance/ComplianceRoadmapTab";
import RegulatoryChangeLogTab from "@/components/compliance/RegulatoryChangeLogTab";
import ComplianceHistoryTab from "@/components/compliance/ComplianceHistoryTab";
import RegulatoryCalendarWidget from "@/components/or/RegulatoryCalendarWidget";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/usePageTitle";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "regulatory-universe", label: "Regulatory Universe" },
  { id: "coverage", label: "Coverage" },
  { id: "roadmap", label: "Roadmap" },
  { id: "assessment-log", label: "Assessment Log" },
  { id: "smcr", label: "SM&CR" },
  { id: "policies", label: "Policies" },
  { id: "regulatory-calendar", label: "Regulatory Calendar" },
  { id: "history", label: "History" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CompliancePage() {
  usePageTitle("Compliance");
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPolicyId = searchParams.get("policy");
  const initialRegulationId = searchParams.get("regulation");
  const derivedTab: TabId = initialPolicyId
    ? "policies"
    : initialRegulationId
    ? "regulatory-universe"
    : (searchParams.get("tab") as TabId) || "overview";
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some((t) => t.id === derivedTab) ? derivedTab : "overview"
  );

  // Sync activeTab when URL changes (e.g. sidebar links navigate to /compliance?tab=X)
  useEffect(() => {
    const policyId = searchParams.get("policy");
    const regulationId = searchParams.get("regulation");
    const tab = (policyId ? "policies" : regulationId ? "regulatory-universe" : searchParams.get("tab") || "overview") as TabId;
    if (TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab !== "overview") params.set("tab", tab); else params.delete("tab");
    // Remove deep-link params when switching tabs manually
    params.delete("policy");
    params.delete("regulation");
    const qs = params.toString();
    router.replace(qs ? `/compliance?${qs}` : "/compliance", { scroll: false });
  }, [router, searchParams]);

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
              onClick={() => handleTabChange(tab.id)}
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
        {activeTab === "overview" && <ComplianceOverview onNavigate={handleTabChange} />}
        {activeTab === "regulatory-universe" && <RegulatoryUniverseTab initialRegulationId={initialRegulationId} />}
        {activeTab === "coverage" && <CoverageChainTab />}
        {activeTab === "roadmap" && <ComplianceRoadmapTab />}
        {activeTab === "assessment-log" && <RegulatoryChangeLogTab />}
        {activeTab === "smcr" && <SMCRTab />}
        {activeTab === "policies" && <PoliciesTab initialPolicyId={initialPolicyId} />}
        {activeTab === "regulatory-calendar" && (
          <div className="mt-4">
            <RegulatoryCalendarWidget />
          </div>
        )}
        {activeTab === "history" && <ComplianceHistoryTab />}
      </div>
    </RoleGuard>
  );
}
