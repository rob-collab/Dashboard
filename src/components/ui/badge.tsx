import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "critical" | "high" | "medium" | "low" | "outline" | "muted";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "bg-updraft-bar/10 text-updraft-bar dark:bg-updraft-bar/20",
        variant === "critical" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        variant === "high" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        variant === "medium" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        variant === "low" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        variant === "outline" && "border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400",
        variant === "muted" && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
export type { BadgeProps };
