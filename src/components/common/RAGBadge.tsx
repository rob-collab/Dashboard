"use client";

import type { RAGStatus } from "@/lib/types";
import { cn, ragColor, ragBgColor, ragLabel, ragLabelShort } from "@/lib/utils";

type BadgeSize = "sm" | "md" | "lg";

interface RAGBadgeProps {
  status: RAGStatus;
  size?: BadgeSize;
  pulse?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<BadgeSize, { dot: string; text: string; wrapper: string }> = {
  sm: {
    dot: "h-1.5 w-1.5",
    text: "text-[10px]",
    wrapper: "gap-1 px-1.5 py-0.5",
  },
  md: {
    dot: "h-2 w-2",
    text: "text-xs",
    wrapper: "gap-1.5 px-2 py-0.5",
  },
  lg: {
    dot: "h-2.5 w-2.5",
    text: "text-sm",
    wrapper: "gap-2 px-2.5 py-1",
  },
};

const BG_WRAPPER: Record<RAGStatus, string> = {
  GOOD: "bg-green-50",
  WARNING: "bg-amber-50",
  HARM: "bg-red-50",
};

export default function RAGBadge({
  status,
  size = "md",
  pulse = false,
  className,
}: RAGBadgeProps) {
  const sizeConfig = SIZE_CLASSES[size];

  return (
    <span
      title={ragLabel(status)}
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        sizeConfig.wrapper,
        BG_WRAPPER[status],
        ragColor(status),
        className
      )}
    >
      <span className="relative flex shrink-0">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              ragBgColor(status)
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex rounded-full",
            sizeConfig.dot,
            ragBgColor(status)
          )}
        />
      </span>
      <span className={sizeConfig.text}>{ragLabelShort(status)}</span>
    </span>
  );
}
