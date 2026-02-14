"use client";

import type { ReportStatus } from "@/lib/types";
import { cn, statusColor, statusLabel } from "@/lib/utils";

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        statusColor(status),
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "DRAFT" && "bg-red-500",
          status === "PUBLISHED" && "bg-green-500",
          status === "ARCHIVED" && "bg-gray-400"
        )}
      />
      {statusLabel(status)}
    </span>
  );
}
