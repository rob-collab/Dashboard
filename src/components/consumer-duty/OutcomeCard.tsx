"use client";

import { useMemo } from "react";
import type { ConsumerDutyOutcome } from "@/lib/types";
import { cn, ragBgColor } from "@/lib/utils";
import {
  ShieldCheck,
  HeartPulse,
  MessageSquare,
  HandCoins,
  Scale,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Dynamic icon lookup from string name stored on the outcome record   */
/* ------------------------------------------------------------------ */
const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck,
  HeartPulse,
  MessageSquare,
  HandCoins,
  Scale,
  HelpCircle,
};

function resolveIcon(name: string | null): LucideIcon {
  if (!name) return ShieldCheck;
  return ICON_MAP[name] ?? ShieldCheck;
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */
interface OutcomeCardProps {
  outcome: ConsumerDutyOutcome;
  selected: boolean;
  onClick: () => void;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function OutcomeCard({
  outcome,
  selected,
  onClick,
}: OutcomeCardProps) {
  const Icon = useMemo(() => resolveIcon(outcome.icon), [outcome.icon]);
  const measureCount = outcome.measures?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        /* Base glass card */
        "glass-card group relative flex flex-col items-start gap-4 text-left w-full cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-updraft-bar focus-visible:ring-offset-2",
        /* Selected state */
        selected &&
          "!bg-white/70 ring-2 ring-updraft-bright-purple/60 shadow-lg shadow-updraft-bright-purple/10"
      )}
      aria-pressed={selected}
    >
      {/* Top row: icon + RAG dot */}
      <div className="flex w-full items-center justify-between">
        {/* Icon container */}
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-300",
            selected
              ? "bg-updraft-bright-purple/15 text-updraft-bright-purple"
              : "bg-updraft-pale-purple/30 text-updraft-bar group-hover:bg-updraft-bright-purple/15 group-hover:text-updraft-bright-purple"
          )}
        >
          <Icon size={22} />
        </div>

        {/* RAG status dot */}
        <span
          className={cn(
            "h-3.5 w-3.5 rounded-full border-2 border-white/80 shadow-sm",
            ragBgColor(outcome.ragStatus),
            outcome.ragStatus === "HARM" && "rag-pulse"
          )}
          title={`Status: ${outcome.ragStatus}`}
        />
      </div>

      {/* Name */}
      <h3
        className={cn(
          "font-poppins text-base font-semibold leading-tight transition-colors",
          selected ? "text-updraft-deep" : "text-gray-800"
        )}
      >
        {outcome.name}
      </h3>

      {/* Short description */}
      <p className="text-sm leading-relaxed text-gray-500 line-clamp-2">
        {outcome.shortDesc}
      </p>

      {/* Measure count badge */}
      <div className="mt-auto flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            selected
              ? "bg-updraft-bright-purple/10 text-updraft-bright-purple"
              : "bg-updraft-pale-purple/40 text-updraft-bar"
          )}
        >
          {measureCount} {measureCount === 1 ? "measure" : "measures"}
        </span>
      </div>

      {/* Bottom accent bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-1 w-full rounded-b-3xl transition-all duration-300",
          selected
            ? "bg-gradient-to-r from-updraft-bright-purple via-updraft-bar to-updraft-light-purple opacity-100"
            : "bg-gradient-to-r from-updraft-bright-purple to-updraft-light-purple opacity-0 group-hover:opacity-60"
        )}
      />
    </button>
  );
}
