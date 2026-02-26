"use client";

import { ExternalLink, Clock, Zap, Network } from "lucide-react";
import type { HorizonItem } from "@/lib/types";
import {
  HORIZON_CATEGORY_LABELS,
  HORIZON_URGENCY_COLOURS,
  HORIZON_STATUS_LABELS,
  HORIZON_STATUS_COLOURS,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  item: HorizonItem;
  onClick: (item: HorizonItem) => void;
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function HorizonItemCard({ item, onClick }: Props) {
  const urgency = HORIZON_URGENCY_COLOURS[item.urgency];
  const status = HORIZON_STATUS_COLOURS[item.status];
  const days = daysUntil(item.deadline);

  const isCompleted = item.status === "COMPLETED" || item.status === "DISMISSED";

  const deadlineColour =
    days !== null && days < 0   ? "text-red-600"   :
    days !== null && days <= 7  ? "text-red-500"   :
    days !== null && days <= 30 ? "text-amber-600" :
                                   "text-slate-500";

  return (
    <button
      onClick={() => onClick(item)}
      className={cn(
        "w-full text-left bento-card p-4 hover:shadow-md transition-all duration-150 group",
        "border-l-4",
        urgency.border,
        isCompleted && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: content */}
        <div className="flex-1 min-w-0">
          {/* Top badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className="font-mono text-xs font-bold text-slate-500">{item.reference}</span>
            <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", urgency.bg, urgency.text)}>
              {item.urgency}
            </span>
            <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {HORIZON_CATEGORY_LABELS[item.category]}
            </span>
            <span className="text-xs text-slate-400">{item.source}</span>
          </div>

          {/* Title */}
          <h3 className="font-poppins font-semibold text-sm text-slate-800 group-hover:text-updraft-bright-purple transition-colors line-clamp-2 mb-1.5">
            {item.title}
          </h3>

          {/* Summary excerpt */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
            {item.summary}
          </p>

          {/* Footer row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {days !== null && (
              <span className={cn("flex items-center gap-1 text-xs font-medium", deadlineColour)}>
                <Clock className="w-3 h-3" />
                {days < 0
                  ? `${Math.abs(days)}d overdue`
                  : days === 0
                  ? "Due today"
                  : `${days}d to deadline`}
              </span>
            )}
            {item.actionLinks && item.actionLinks.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <Zap className="w-3 h-3" />
                {item.actionLinks.length} action{item.actionLinks.length !== 1 ? "s" : ""}
              </span>
            )}
            {item.riskLinks && item.riskLinks.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-blue-600">
                <Network className="w-3 h-3" />
                {item.riskLinks.length} risk{item.riskLinks.length !== 1 ? "s" : ""}
              </span>
            )}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-updraft-bright-purple transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Source
              </a>
            )}
          </div>
        </div>

        {/* Right: status badge */}
        <div className="shrink-0 pt-0.5">
          <span className={cn("text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", status.bg, status.text)}>
            {HORIZON_STATUS_LABELS[item.status]}
          </span>
        </div>
      </div>
    </button>
  );
}
