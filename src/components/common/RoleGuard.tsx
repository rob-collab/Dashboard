"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useHasPermission } from "@/lib/usePermission";
import type { PermissionCode } from "@/lib/permissions";

interface RoleGuardProps {
  permission: PermissionCode;
  children: React.ReactNode;
}

export default function RoleGuard({ permission, children }: RoleGuardProps) {
  const hasPermission = useHasPermission(permission);

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-xl bg-risk-red/10 p-4 mb-4">
          <ShieldAlert size={48} className="text-risk-red" />
        </div>
        <h1 className="text-xl font-bold text-gray-700 font-poppins">Access Denied</h1>
        <p className="text-sm text-fca-gray mt-2 max-w-md">
          You don&apos;t have permission to view this page. This area is restricted to authorised team members only.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
