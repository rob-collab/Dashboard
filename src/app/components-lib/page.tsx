"use client";

import RoleGuard from "@/components/common/RoleGuard";
import ComponentsPanel from "@/components/settings/ComponentsPanel";
import { usePageTitle } from "@/lib/usePageTitle";

export default function ComponentsLibPage() {
  usePageTitle("Component Library");
  return (
    <RoleGuard allowedRoles={["CCRO_TEAM"]}>
      <ComponentsPanel />
    </RoleGuard>
  );
}
