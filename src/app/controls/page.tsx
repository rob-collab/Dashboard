"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Library, FlaskConical, BarChart3, ClipboardCheck } from "lucide-react";
import ControlsLibraryTab from "@/components/controls/ControlsLibraryTab";
import TestingScheduleTab from "@/components/controls/TestingScheduleTab";
import TestResultsEntryTab from "@/components/controls/TestResultsEntryTab";
import ControlsDashboardTab from "@/components/controls/ControlsDashboardTab";

type Tab = "library" | "testing" | "results" | "dashboard";

const TABS: { id: Tab; label: string; icon: typeof Library; roles: string[] }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, roles: ["CCRO_TEAM", "OWNER"] },
  { id: "library", label: "Controls Library", icon: Library, roles: ["CCRO_TEAM", "OWNER"] },
  { id: "testing", label: "Testing Schedule", icon: FlaskConical, roles: ["CCRO_TEAM"] },
  { id: "results", label: "Record Results", icon: ClipboardCheck, roles: ["CCRO_TEAM"] },
];

export default function ControlsPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  if (!currentUser) return null;

  const visibleTabs = TABS.filter((t) => t.roles.includes(currentUser.role));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-poppins font-bold text-gray-900">
          2LOD Controls Testing
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Controls library, 2nd line of defence testing schedule, and results dashboard
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-4">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
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
      {activeTab === "dashboard" && <ControlsDashboardTab />}
      {activeTab === "library" && <ControlsLibraryTab />}
      {activeTab === "testing" && <TestingScheduleTab />}
      {activeTab === "results" && <TestResultsEntryTab />}
    </div>
  );
}
