"use client";

import { useState } from "react";
import { ExternalLink, Zap, Clock, ArrowRight, ChevronDown } from "lucide-react";
import type { HorizonItem } from "@/lib/types";
import { HORIZON_CATEGORY_LABELS, HORIZON_STATUS_LABELS, HORIZON_STATUS_COLOURS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  item: HorizonItem;
  canManage: boolean;
  onViewDetail: (item: HorizonItem) => void;
  onChangeFocus: () => void;
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function HorizonInFocusSpotlight({ item, canManage, onViewDetail, onChangeFocus }: Props) {
  const [expanded, setExpanded] = useState(false);
  const days = daysUntil(item.deadline);
  const statusColour = HORIZON_STATUS_COLOURS[item.status];

  const urgencyBorder =
    item.urgency === "HIGH"   ? "border-red-400/60" :
    item.urgency === "MEDIUM" ? "border-amber-400/60" :
                                "border-emerald-400/60";

  const urgencyDot =
    item.urgency === "HIGH"   ? "bg-red-400" :
    item.urgency === "MEDIUM" ? "bg-amber-400" :
                                "bg-emerald-400";

  const deadlineColour =
    days !== null && days < 0  ? "text-red-300" :
    days !== null && days <= 14 ? "text-amber-300" :
                                  "text-slate-300";

  return (
    <div className={cn(
      "relative rounded-2xl border overflow-hidden",
      "bg-gradient-to-br from-updraft-deep via-[#1e1b4b] to-updraft-bar",
      "shadow-xl",
      urgencyBorder,
      "border"
    )}>
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

      <div className="relative px-6 pt-5 pb-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={cn("inline-block w-2 h-2 rounded-full animate-pulse", urgencyDot)} />
            <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">In Focus</span>
          </div>
          {canManage && (
            <button
              onClick={onChangeFocus}
              className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Change focus
            </button>
          )}
        </div>

        {/* Header row */}
        <div className="flex flex-wrap items-start gap-2 mb-3">
          <span className="font-mono text-sm font-bold text-white/70 bg-white/10 px-2 py-0.5 rounded">
            {item.reference}
          </span>
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            item.urgency === "HIGH"   ? "bg-red-500/20 text-red-300"    :
            item.urgency === "MEDIUM" ? "bg-amber-500/20 text-amber-300" :
                                        "bg-emerald-500/20 text-emerald-300"
          )}>
            {item.urgency}
          </span>
          <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            {HORIZON_CATEGORY_LABELS[item.category]}
          </span>
          <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            {item.source}
          </span>
        </div>

        {/* Title */}
        <h2 className="font-poppins text-xl font-semibold text-white mb-3 leading-snug">
          {item.title}
        </h2>

        {/* Why it matters — collapsed by default on long text */}
        <div className="mb-4">
          <p className={cn(
            "text-sm text-slate-300 leading-relaxed",
            !expanded && "line-clamp-3"
          )}>
            {item.whyItMatters}
          </p>
          {item.whyItMatters.length > 220 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5">
          {days !== null && (
            <div className={cn("flex items-center gap-1.5 text-sm font-medium", deadlineColour)}>
              <Clock className="w-4 h-4" />
              {days < 0
                ? `Overdue by ${Math.abs(days)} days`
                : days === 0
                ? "Due today"
                : `${days} days to deadline`}
              {item.deadline && (
                <span className="text-slate-500 font-normal ml-1">
                  ({new Date(item.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})
                </span>
              )}
            </div>
          )}
          <span className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            statusColour.bg.replace("bg-", "bg-").replace("100", "500/20"),
            "text-slate-300"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusColour.bg.replace("100", "400"))} />
            {HORIZON_STATUS_LABELS[item.status]}
          </span>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewDetail(item)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-updraft-deep font-semibold text-sm rounded-lg hover:bg-slate-100 transition-colors"
          >
            View Full Briefing
            <ArrowRight className="w-4 h-4" />
          </button>
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-white/20 text-slate-300 text-sm rounded-lg hover:border-white/40 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Source
            </a>
          )}
          {item.actionLinks && item.actionLinks.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {item.actionLinks.length} linked action{item.actionLinks.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
