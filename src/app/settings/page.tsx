"use client";

import RoleGuard from "@/components/common/RoleGuard";
import BrandingSettings from "@/components/settings/BrandingSettings";

export default function SettingsPage() {
  return (
    <RoleGuard allowedRoles={["CCRO_TEAM"]}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Settings</h1>
          <p className="text-sm text-fca-gray mt-1">
            Configure branding, logos, and display options for your reports.
          </p>
        </div>
        <BrandingSettings />
      </div>
    </RoleGuard>
  );
}
