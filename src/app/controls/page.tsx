"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  Library,
  FlaskConical,
  BarChart3,
  ClipboardCheck,
  ShieldCheck,
  FileText,
  TrendingUp,
  Settings,
  Eye,
  History,
} from "lucide-react";
import ControlsLibraryTab from "@/components/controls/ControlsLibraryTab";
import TestingScheduleTab from "@/components/controls/TestingScheduleTab";
import TestResultsEntryTab from "@/components/controls/TestResultsEntryTab";
import ControlsDashboardTab from "@/components/controls/ControlsDashboardTab";
import AttestationTab from "@/components/controls/AttestationTab";
import QuarterlySummaryTab from "@/components/controls/QuarterlySummaryTab";
import TrendAnalysisTab from "@/components/controls/TrendAnalysisTab";
import ExcoConfigTab from "@/components/controls/ExcoConfigTab";
import ExcoDashboardTab from "@/components/controls/ExcoDashboardTab";
import HistoryTab from "@/components/common/HistoryTab";
import { SkeletonTable } from "@/components/common/SkeletonLoader";
import { usePageTitle } from "@/lib/usePageTitle";

type Tab =
  | "library"
  | "testing"
  | "results"
  | "dashboard"
  | "attestation"
  | "summaries"
  | "trends"
  | "exco-config"
  | "exco-dashboard"
  | "history";

const TABS: { id: Tab; label: string; icon: typeof Library; roles: string[] }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, roles: ["CCRO_TEAM", "OWNER"] },
  { id: "library", label: "Controls Library", icon: Library, roles: ["CCRO_TEAM", "OWNER"] },
  { id: "attestation", label: "Attestation", icon: ShieldCheck, roles: ["CCRO_TEAM", "OWNER"] },
  { id: "testing", label: "Testing Schedule", icon: FlaskConical, roles: ["CCRO_TEAM"] },
  { id: "results", label: "Record Results", icon: ClipboardCheck, roles: ["CCRO_TEAM"] },
  { id: "summaries", label: "Quarterly Summary", icon: FileText, roles: ["CCRO_TEAM"] },
  { id: "trends", label: "Trend Analysis", icon: TrendingUp, roles: ["CCRO_TEAM"] },
  { id: "exco-config", label: "ExCo Config", icon: Settings, roles: ["CCRO_TEAM"] },
  { id: "exco-dashboard", label: "ExCo View", icon: Eye, roles: ["CCRO_TEAM", "VIEWER"] },
  { id: "history", label: "History", icon: History, roles: ["CCRO_TEAM", "OWNER"] },
];

export default function ControlsPage() {
  return (
    <Suspense>
      <ControlsPageInner />
    </Suspense>
  );
}

function ControlsPageInner() {
  usePageTitle("Controls Testing");
  const searchParams = useSearchParams();
  const hydrated = useAppStore((s) => s._hydrated);
  const currentUser = useAppStore((s) => s.currentUser);

  const tabParam = searchParams.get("tab") as Tab | null;
  const initialControlId = searchParams.get("control");
  const initialTypeFilter = searchParams.get("type");
  const validTabs: Tab[] = ["library", "testing", "results", "dashboard", "attestation", "summaries", "trends", "exco-config", "exco-dashboard", "history"];
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && validTabs.includes(tabParam)
      ? tabParam
      : initialTypeFilter
      ? "library"
      : "dashboard"
  );

  if (!hydrated) return (
    <div className="space-y-6 p-1">
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
  if (!currentUser) return null;

  const visibleTabs = TABS.filter((t) => t.roles.includes(currentUser.role));

  // If current tab isn't visible for this role, default to first visible
  if (!visibleTabs.find((t) => t.id === activeTab) && visibleTabs.length > 0) {
    setActiveTab(visibleTabs[0].id);
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-poppins font-bold text-updraft-deep">
          2LOD Controls Testing
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Controls library, 2nd line of defence testing schedule, and results dashboard
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-4 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-updraft-bright-purple text-updraft-deep"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && <ControlsDashboardTab onNavigateToLibrary={() => setActiveTab("library")} />}
      {activeTab === "library" && <ControlsLibraryTab initialControlId={initialControlId} initialTypeFilter={initialTypeFilter} />}
      {activeTab === "attestation" && <AttestationTab />}
      {activeTab === "testing" && <TestingScheduleTab />}
      {activeTab === "results" && <TestResultsEntryTab />}
      {activeTab === "summaries" && <QuarterlySummaryTab />}
      {activeTab === "trends" && <TrendAnalysisTab />}
      {activeTab === "exco-config" && <ExcoConfigTab />}
      {activeTab === "exco-dashboard" && <ExcoDashboardTab />}
      {activeTab === "history" && (
        <HistoryTab
          entityTypes={["control"]}
          title="Controls Change History"
          description="Audit trail of control changes, archives and updates."
        />
      )}
    </div>
  );
}
