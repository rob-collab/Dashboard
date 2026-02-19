"use client";

import RoleGuard from "@/components/common/RoleGuard";
import TemplatesPanel from "@/components/settings/TemplatesPanel";
import { usePageTitle } from "@/lib/usePageTitle";

export default function TemplatesPage() {
  usePageTitle("Templates");
  return (
    <RoleGuard permission="page:settings">
      <TemplatesPanel />
    </RoleGuard>
  );
}
