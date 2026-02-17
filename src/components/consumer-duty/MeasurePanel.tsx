"use client";

import type { ConsumerDutyMeasure } from "@/lib/types";
import { cn, ragBgColor, ragLabelShort } from "@/lib/utils";
import { isMeasureStale } from "@/lib/stale-utils";
import { useAppStore } from "@/lib/store";
import { Activity, AlertTriangle, BarChart3 } from "lucide-react";

function isMeasureOverdue(measure: ConsumerDutyMeasure): boolean {
  if (!measure.lastUpdatedAt) return true;
  const lastUpdate = new Date(measure.lastUpdatedAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return lastUpdate < thirtyDaysAgo;
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */
interface MeasurePanelProps {
  measures: ConsumerDutyMeasure[];
  onMeasureClick: (measure: ConsumerDutyMeasure) => void;
  lastPublishDate?: string | null;
  onEditMeasure?: (measure: ConsumerDutyMeasure) => void;
  onDeleteMeasure?: (measure: ConsumerDutyMeasure) => void;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function MeasurePanel({
  measures,
  onMeasureClick,
  lastPublishDate,
  onEditMeasure,
  onDeleteMeasure,
}: MeasurePanelProps) {
  const users = useAppStore((s) => s.users);

  // Natural sort by measureId (1.1 < 1.2 < 1.10 < 2.1)
  const sortedMeasures = [...measures].sort((a, b) => {
    const aParts = a.measureId.split(".").map(Number);
    const bParts = b.measureId.split(".").map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  if (measures.length === 0) {
    return (
      <div className="animate-slide-up rounded-2xl border border-dashed border-updraft-pale-purple/60 bg-white/30 backdrop-blur-md p-8 text-center text-sm text-gray-400">
        No measures found for this outcome.
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2">
        <Activity size={16} className="text-updraft-bar" />
        <h4 className="font-poppins text-sm font-semibold text-gray-700">
          Measures
        </h4>
        <span className="rounded-full bg-updraft-pale-purple/40 px-2 py-0.5 text-xs font-medium text-updraft-bar">
          {measures.length}
        </span>
      </div>

      {/* Grid of measure cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortedMeasures.map((measure) => (
          <button
            key={measure.id}
            type="button"
            onClick={() => onMeasureClick(measure)}
            className={cn(
              "group relative flex flex-col gap-2 rounded-xl border border-white/40 bg-white/50 backdrop-blur-lg p-4 text-left",
              "shadow-sm transition-all duration-200 ease-out",
              "hover:-translate-y-0.5 hover:border-updraft-bright-purple/40 hover:shadow-md hover:shadow-updraft-bright-purple/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-updraft-bar focus-visible:ring-offset-2"
            )}
          >
            {/* Top row: RAG dot + measure ID + stale/edit/delete */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  ragBgColor(measure.ragStatus),
                  measure.ragStatus === "HARM" && "rag-pulse"
                )}
              />
              <span className="text-xs font-medium text-updraft-bar/70 uppercase tracking-wide">
                {measure.measureId}
              </span>
              {lastPublishDate && isMeasureStale(measure, lastPublishDate) && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                  <AlertTriangle size={9} />
                  Not Updated
                </span>
              )}
              {isMeasureOverdue(measure) && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                  <AlertTriangle size={9} />
                  Overdue
                </span>
              )}
              <span
                className={cn(
                  "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight",
                  measure.ragStatus === "GOOD" &&
                    "bg-risk-green/10 text-risk-green",
                  measure.ragStatus === "WARNING" &&
                    "bg-risk-amber/10 text-risk-amber",
                  measure.ragStatus === "HARM" &&
                    "bg-risk-red/10 text-risk-red"
                )}
              >
                {ragLabelShort(measure.ragStatus)}
              </span>
            </div>

            {/* Name */}
            <h5 className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-updraft-deep transition-colors">
              {measure.name}
            </h5>

            {/* Summary */}
            <p className="text-xs leading-relaxed text-gray-500 line-clamp-2">
              {measure.summary}
            </p>

            {/* Last updated info */}
            {measure.lastUpdatedAt && (
              <p className="text-[10px] text-gray-400 mt-1">
                Updated {daysAgo(measure.lastUpdatedAt)}d ago
                {measure.updatedById && (() => {
                  const updater = users.find((u) => u.id === measure.updatedById);
                  return updater ? ` by ${updater.name}` : "";
                })()}
              </p>
            )}

            {/* Metrics count + 12-month history + edit/delete */}
            <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {measure.metrics && measure.metrics.length > 0 ? (
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    {measure.metrics.length}{" "}
                    {measure.metrics.length === 1 ? "metric" : "metrics"}
                  </span>
                ) : (
                  <span />
                )}
                {measure.metrics && measure.metrics.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-updraft-bar/60">
                    <BarChart3 size={9} />
                    12-month history
                  </span>
                )}
              </div>
              {(onEditMeasure || onDeleteMeasure) && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEditMeasure && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEditMeasure(measure); }}
                      className="text-[10px] font-medium text-updraft-bright-purple hover:underline cursor-pointer"
                      aria-label={`Edit measure ${measure.measureId}`}
                    >
                      Edit
                    </button>
                  )}
                  {onDeleteMeasure && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteMeasure(measure); }}
                      className="text-[10px] font-medium text-red-500 hover:underline cursor-pointer"
                      aria-label={`Delete measure ${measure.measureId}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Hover accent */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-xl bg-gradient-to-r from-updraft-bright-purple to-updraft-light-purple opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}
