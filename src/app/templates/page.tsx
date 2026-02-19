"use client";

import RoleGuard from "@/components/common/RoleGuard";
import TemplatesPanel from "@/components/settings/TemplatesPanel";
import { usePageTitle } from "@/lib/usePageTitle";

export default function TemplatesPage() {
  usePageTitle("Templates");
  return (
    <RoleGuard allowedRoles={["CCRO_TEAM"]}>
      <TemplatesPanel />
    </RoleGuard>
  );
}
