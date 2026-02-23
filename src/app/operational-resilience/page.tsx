"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck, Library, FileText } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import ORDashboard from "@/components/or/ORDashboard";
import IBSRegistryTab from "@/components/or/IBSRegistryTab";
import SelfAssessmentTab from "@/components/or/SelfAssessmentTab";

type Tab = "dashboard" | "ibs" | "self-assessment";

const TABS: { id: Tab; label: string; icon: typeof ShieldCheck }[] = [
  { id: "dashboard", label: "Dashboard", icon: ShieldCheck },
  { id: "ibs", label: "IBS Registry", icon: Library },
  { id: "self-assessment", label: "Self-Assessment", icon: FileText },
];

export default function OperationalResiliencePage() {
  return (
    <Suspense>
      <ORPageInner />
    </Suspense>
  );
}

function ORPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && ["dashboard", "ibs", "self-assessment"].includes(tabParam) ? tabParam : "dashboard"
  );

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    router.replace(tab !== "dashboard" ? `/operational-resilience?tab=${tab}` : "/operational-resilience", { scroll: false });
  }

  function handleDashboardIbsClick(id: string) {
    handleTabChange("ibs");
    // The registry tab will show the IBS list — user clicks into it
    void id; // just switch to IBS tab
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-updraft-pale-purple/30 p-2">
            <ShieldCheck size={18} className="text-updraft-deep" />
          </div>
          <div>
            <h1 className="font-poppins font-semibold text-gray-900 text-lg">Operational Resilience</h1>
            <p className="text-xs text-gray-500">FCA PS21/3 · CMORG v3 · Important Business Services</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-6 border-b border-gray-200 bg-white shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-updraft-bright-purple text-updraft-deep"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "dashboard" && (
          <div className="h-full overflow-y-auto p-6">
            <ORDashboard onSelectIbs={handleDashboardIbsClick} />
          </div>
        )}
        {activeTab === "ibs" && (
          <div className="h-full flex overflow-hidden">
            <IBSRegistryTab isCCRO={isCCRO} />
          </div>
        )}
        {activeTab === "self-assessment" && (
          <div className="h-full overflow-y-auto p-6">
            <SelfAssessmentTab isCCRO={isCCRO} />
          </div>
        )}
      </div>
    </div>
  );
}
