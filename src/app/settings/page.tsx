"use client";

import { useState } from "react";
import RoleGuard from "@/components/common/RoleGuard";
import BrandingSettings from "@/components/settings/BrandingSettings";
import CategoryEditor from "@/components/settings/CategoryEditor";
import PriorityEditor from "@/components/settings/PriorityEditor";
import TemplatesPanel from "@/components/settings/TemplatesPanel";
import ComponentsPanel from "@/components/settings/ComponentsPanel";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "branding", label: "Branding" },
  { id: "categories", label: "Categories" },
  { id: "priorities", label: "Priorities" },
  { id: "templates", label: "Templates" },
  { id: "components", label: "Components" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const FULL_WIDTH_TABS: TabId[] = ["templates", "components"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("branding");

  const isFullWidth = FULL_WIDTH_TABS.includes(activeTab);

  return (
    <RoleGuard allowedRoles={["CCRO_TEAM"]}>
      <div className={cn(!isFullWidth && "max-w-3xl mx-auto")}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Settings</h1>
          <p className="text-sm text-fca-gray mt-1">
            Configure branding, risk categories, priority definitions, templates, and components.
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
        {activeTab === "branding" && <BrandingSettings />}
        {activeTab === "categories" && <CategoryEditor />}
        {activeTab === "priorities" && <PriorityEditor />}
        {activeTab === "templates" && <TemplatesPanel />}
        {activeTab === "components" && <ComponentsPanel />}
      </div>
    </RoleGuard>
  );
}
