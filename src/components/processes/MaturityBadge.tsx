"use client";

import { MATURITY_LABELS, MATURITY_COLOURS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function MaturityBadge({ score, showLabel = true, size = "md" }: Props) {
  const s = Math.min(5, Math.max(1, score));
  const colours = MATURITY_COLOURS[s];
  const label = MATURITY_LABELS[s];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-semibold",
      size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
      colours.bg, colours.text,
    )}>
      <span className={cn("rounded-full shrink-0", size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2", colours.bar)} />
      {showLabel ? `L${s} ${label}` : `L${s}`}
    </span>
  );
}

/** A 5-segment progress bar showing maturity score */
export function MaturityBar({ score }: { score: number }) {
  const s = Math.min(5, Math.max(1, score));
  const colours = MATURITY_COLOURS[s];
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((level) => (
        <div
          key={level}
          className={cn("h-1.5 flex-1 rounded-full", level <= s ? colours.bar : "bg-gray-200")}
        />
      ))}
    </div>
  );
}
