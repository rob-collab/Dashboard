"use client";

import RoleGuard from "@/components/common/RoleGuard";
import ComponentsPanel from "@/components/settings/ComponentsPanel";

export default function ComponentsLibPage() {
  return (
    <RoleGuard allowedRoles={["CCRO_TEAM"]}>
      <ComponentsPanel />
    </RoleGuard>
  );
}
