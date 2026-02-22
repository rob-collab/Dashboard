"use client";

import { useMemo, useState } from "react";
import type { ConsumerDutyOutcome } from "@/lib/types";
import { cn, ragBgColor } from "@/lib/utils";
import {
  ShieldCheck,
  HeartPulse,
  MessageSquare,
  HandCoins,
  Scale,
  HelpCircle,
  AlertTriangle,
  Pencil,
  Clock,
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
  onViewDetails?: (outcome: ConsumerDutyOutcome) => void;
  hasStaleData?: boolean;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
/** Format relative time for last-updated label */
function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function OutcomeCard({
  outcome,
  selected,
  onClick,
  onViewDetails,
  hasStaleData,
}: OutcomeCardProps) {
  const Icon = useMemo(() => resolveIcon(outcome.icon), [outcome.icon]);
  const measureCount = outcome.measures?.length ?? 0;
  const [showRagTooltip, setShowRagTooltip] = useState(false);

  // RAG breakdown for tooltip
  const ragBreakdown = useMemo(() => {
    const measures = outcome.measures ?? [];
    return {
      good: measures.filter((m) => m.ragStatus === "GOOD").length,
      warning: measures.filter((m) => m.ragStatus === "WARNING").length,
      harm: measures.filter((m) => m.ragStatus === "HARM").length,
    };
  }, [outcome.measures]);

  // Detect CCRO manual override: computed worst-of-measures vs actual ragStatus
  const computedRag = useMemo(() => {
    const measures = outcome.measures ?? [];
    if (measures.length === 0) return outcome.ragStatus;
    if (measures.some((m) => m.ragStatus === "HARM")) return "HARM";
    if (measures.some((m) => m.ragStatus === "WARNING")) return "WARNING";
    return "GOOD";
  }, [outcome.measures, outcome.ragStatus]);
  const isCCROOverride = computedRag !== outcome.ragStatus && measureCount > 0;

  // Last-updated time: take most recent measure.lastUpdatedAt, fallback to outcome.updatedAt
  const lastUpdated = useMemo(() => {
    const measures = outcome.measures ?? [];
    const times = measures
      .map((m) => m.lastUpdatedAt)
      .filter(Boolean)
      .map((t) => new Date(t!).getTime());
    if (times.length > 0) return new Date(Math.max(...times)).toISOString();
    return outcome.updatedAt ?? null;
  }, [outcome.measures, outcome.updatedAt]);
  const lastUpdatedLabel = relativeTime(lastUpdated);

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

        {/* RAG status dot + stale/override badges */}
        <div className="flex items-center gap-2">
          {hasStaleData && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              <AlertTriangle size={10} />
              Stale
            </span>
          )}
          {isCCROOverride && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 cursor-help"
              title={`CCRO override: computed status was ${computedRag}, manually set to ${outcome.ragStatus}`}
            >
              <Pencil size={9} />
              Override
            </span>
          )}
          <div
            className="relative"
            onMouseEnter={() => setShowRagTooltip(true)}
            onMouseLeave={() => setShowRagTooltip(false)}
          >
            <span
              className={cn(
                "block h-3.5 w-3.5 rounded-full border-2 border-white/80 shadow-sm cursor-help",
                ragBgColor(outcome.ragStatus),
                outcome.ragStatus === "HARM" && "rag-pulse",
                outcome.ragStatus === "GOOD" && "rag-glow"
              )}
            />
            {showRagTooltip && measureCount > 0 && (
              <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-lg bg-gray-900 p-3 text-white shadow-xl pointer-events-none">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">RAG Breakdown</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Good</span>
                    <span className="font-bold">{ragBreakdown.good}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Warning</span>
                    <span className="font-bold">{ragBreakdown.warning}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Harm</span>
                    <span className="font-bold">{ragBreakdown.harm}</span>
                  </div>
                </div>
                {isCCROOverride ? (
                  <p className="text-[10px] text-purple-300 mt-2 border-t border-white/10 pt-2">
                    CCRO override active — computed {computedRag}, shown as {outcome.ragStatus}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 mt-2 border-t border-white/10 pt-2">Status set by worst-performing measure</p>
                )}
                {outcome.previousRAG && outcome.previousRAG !== outcome.ragStatus && (
                  <p className="text-[10px] text-gray-400 mt-1">Changed from {outcome.previousRAG}</p>
                )}
              </div>
            )}
          </div>
        </div>
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

      {/* Measure count badge and details button */}
      <div className="mt-auto flex items-center justify-between gap-2 w-full">
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
        {onViewDetails && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(outcome);
            }}
            className="text-xs text-updraft-bright-purple hover:text-updraft-deep font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          >
            View Details
          </button>
        )}
      </div>

      {/* Last updated time */}
      {lastUpdatedLabel && (
        <div className="flex items-center gap-1 text-[10px] text-gray-400 -mt-2">
          <Clock size={9} />
          <span>Updated {lastUpdatedLabel}</span>
        </div>
      )}

      {/* RAG-coloured top accent border */}
      <div
        className={cn(
          "absolute top-0 left-0 h-[2px] w-full rounded-t-3xl",
          outcome.ragStatus === "GOOD" && "bg-risk-green",
          outcome.ragStatus === "WARNING" && "bg-risk-amber",
          outcome.ragStatus === "HARM" && "bg-risk-red"
        )}
      />

      {/* Bottom RAG-coloured accent bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-1 w-full rounded-b-3xl transition-all duration-300",
          outcome.ragStatus === "GOOD" && (selected ? "bg-risk-green opacity-100" : "bg-risk-green opacity-0 group-hover:opacity-60"),
          outcome.ragStatus === "WARNING" && (selected ? "bg-risk-amber opacity-100" : "bg-risk-amber opacity-0 group-hover:opacity-60"),
          outcome.ragStatus === "HARM" && (selected ? "bg-risk-red opacity-100" : "bg-risk-red opacity-0 group-hover:opacity-60")
        )}
      />
    </button>
  );
}
