"use client";

import RoleGuard from "@/components/common/RoleGuard";
import TemplatesPanel from "@/components/settings/TemplatesPanel";

export default function TemplatesPage() {
  return (
    <RoleGuard allowedRoles={["CCRO_TEAM"]}>
      <TemplatesPanel />
    </RoleGuard>
  );
}
