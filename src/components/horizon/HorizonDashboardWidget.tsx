"use client";

import Link from "next/link";
import { Radar, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { cn } from "@/lib/utils";

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function HorizonDashboardWidget() {
  const horizonItems = useAppStore((s) => s.horizonItems);

  const active = horizonItems.filter((h) => h.status !== "DISMISSED" && h.status !== "COMPLETED");
  const high   = active.filter((h) => h.urgency === "HIGH").length;
  const medium = active.filter((h) => h.urgency === "MEDIUM").length;
  const low    = active.filter((h) => h.urgency === "LOW").length;

  const inFocus = horizonItems.find((h) => h.inFocus);

  // Nearest deadline item
  const withDeadline = active
    .filter((h) => h.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  const nearest = withDeadline[0];
  const nearestDays = nearest ? daysUntil(nearest.deadline) : null;

  const actionRequired = active.filter((h) => h.status === "ACTION_REQUIRED").length;

  return (
    <div className="bento-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-updraft-bright-purple" />
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">Horizon Scanning</h2>
          <span className="rounded-full bg-updraft-pale-purple text-updraft-deep px-2 py-0.5 text-xs font-bold">
            {active.length}
          </span>
        </div>
        <Link
          href="/horizon-scanning"
          className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Urgency breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-red-50 rounded-lg">
          <div className="text-xl font-bold font-poppins text-red-700"><AnimatedNumber value={high} /></div>
          <div className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mt-0.5">High</div>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded-lg">
          <div className="text-xl font-bold font-poppins text-amber-700"><AnimatedNumber value={medium} /></div>
          <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mt-0.5">Medium</div>
        </div>
        <div className="text-center p-2 bg-emerald-50 rounded-lg">
          <div className="text-xl font-bold font-poppins text-emerald-700"><AnimatedNumber value={low} /></div>
          <div className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mt-0.5">Low</div>
        </div>
      </div>

      {/* Action required alert */}
      {actionRequired > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-700">
            {actionRequired} item{actionRequired !== 1 ? "s" : ""} require action
          </span>
        </div>
      )}

      {/* In Focus item */}
      {inFocus && (
        <Link
          href="/horizon-scanning"
          className="block px-3 py-2.5 rounded-lg bg-gradient-to-r from-updraft-deep/5 to-updraft-bar/5 border border-updraft-light-purple/30 hover:border-updraft-bright-purple/40 transition-colors mb-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-updraft-bright-purple animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-updraft-bright-purple">In Focus</span>
            <span className="font-mono text-[10px] text-slate-400 ml-auto">{inFocus.reference}</span>
          </div>
          <p className="text-xs font-semibold text-updraft-deep line-clamp-2 leading-snug">
            {inFocus.title}
          </p>
        </Link>
      )}

      {/* Nearest deadline */}
      {nearest && nearestDays !== null && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs",
          nearestDays < 0 ? "bg-red-50 border-red-200 text-red-700" :
          nearestDays <= 30 ? "bg-amber-50 border-amber-200 text-amber-700" :
          "bg-slate-50 border-slate-200 text-slate-600"
        )}>
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium truncate flex-1">{nearest.title}</span>
          <span className="shrink-0 font-semibold">
            {nearestDays < 0 ? `${Math.abs(nearestDays)}d overdue` : nearestDays === 0 ? "Today" : `${nearestDays}d`}
          </span>
        </div>
      )}

      {active.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4 italic">No active horizon items</p>
      )}
    </div>
  );
}
