"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  COMPLIANCE_STATUS_COLOURS,
  COMPLIANCE_STATUS_LABELS,
  type Regulation,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Scale,
  Search,
  X,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CalendarClock,
  Filter,
} from "lucide-react";
import Link from "next/link";

type ChangeFilter = "all" | "recent" | "status_change" | "no_assessment";

interface AssessmentEntry {
  reg: Regulation;
  daysSinceAssessed: number | null;
  isGap: boolean;
  isRecentlyAssessed: boolean;
  isOverdue: boolean;
}

const TODAY = new Date();

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = daysBetween(d, TODAY);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

const STATUS_FILTER_LABELS: Record<ChangeFilter, string> = {
  all: "All applicable",
  recent: "Recently assessed (90d)",
  status_change: "Gaps & non-compliant",
  no_assessment: "Not yet assessed",
};

export default function RegulatoryChangeLogTab() {
  const regulations = useAppStore((s) => s.regulations);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChangeFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const entries = useMemo((): AssessmentEntry[] => {
    const applicable = regulations.filter((r) => r.isApplicable && r.isActive);

    return applicable.map((reg): AssessmentEntry => {
      const daysSince = reg.lastAssessedAt
        ? daysBetween(new Date(reg.lastAssessedAt), TODAY)
        : null;
      const isGap =
        reg.complianceStatus === "NON_COMPLIANT" ||
        reg.complianceStatus === "GAP_IDENTIFIED" ||
        reg.complianceStatus === "PARTIALLY_COMPLIANT";
      const isRecentlyAssessed = daysSince !== null && daysSince <= 90;
      const isOverdue = reg.nextReviewDate
        ? new Date(reg.nextReviewDate) < TODAY
        : daysSince !== null && daysSince > 365;

      return { reg, daysSinceAssessed: daysSince, isGap, isRecentlyAssessed, isOverdue };
    });
  }, [regulations]);

  const filtered = useMemo(() => {
    let out = entries;

    switch (filter) {
      case "recent":
        out = out.filter((e) => e.isRecentlyAssessed);
        break;
      case "status_change":
        out = out.filter((e) => e.isGap);
        break;
      case "no_assessment":
        out = out.filter((e) => e.daysSinceAssessed === null || e.reg.complianceStatus === "NOT_ASSESSED");
        break;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (e) =>
          e.reg.name.toLowerCase().includes(q) ||
          e.reg.reference.toLowerCase().includes(q) ||
          (e.reg.shortName ?? "").toLowerCase().includes(q)
      );
    }

    // Sort: overdue first, then by lastAssessedAt descending (most recent first), then never assessed
    return out.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isGap && !b.isGap) return -1;
      if (!a.isGap && b.isGap) return 1;
      // Most recently assessed first
      if (a.reg.lastAssessedAt && b.reg.lastAssessedAt) {
        return b.reg.lastAssessedAt.localeCompare(a.reg.lastAssessedAt);
      }
      if (a.reg.lastAssessedAt) return -1;
      if (b.reg.lastAssessedAt) return 1;
      return a.reg.reference.localeCompare(b.reg.reference);
    });
  }, [entries, filter, search]);

  const counts = useMemo(() => ({
    total: entries.length,
    gaps: entries.filter((e) => e.isGap).length,
    overdue: entries.filter((e) => e.isOverdue).length,
    notAssessed: entries.filter((e) => e.daysSinceAssessed === null || e.reg.complianceStatus === "NOT_ASSESSED").length,
  }), [entries]);

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Regulatory Assessment Log</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Track compliance assessment activity across all applicable regulations. Identify overdue assessments and compliance gaps.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Applicable", value: counts.total, colour: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" },
          { label: "Gaps / Non-Compliant", value: counts.gaps, colour: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
          { label: "Overdue Reviews", value: counts.overdue, colour: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
          { label: "Not Assessed", value: counts.notAssessed, colour: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-xl border px-4 py-3", s.bg, s.border)}>
            <p className={cn("text-2xl font-bold tabular-nums font-poppins", s.colour)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search regulations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Filter size={13} className="text-gray-400" />
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["all", "recent", "status_change", "no_assessment"] as ChangeFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-200",
                  filter === f
                    ? "bg-updraft-bright-purple text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {STATUS_FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Log entries */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <FileText size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No regulations match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ reg, daysSinceAssessed, isGap, isOverdue }) => {
            const isExpanded = expanded.has(reg.id);
            const cfg = COMPLIANCE_STATUS_COLOURS[reg.complianceStatus];

            return (
              <div
                key={reg.id}
                className={cn(
                  "rounded-xl border overflow-hidden transition-colors",
                  isOverdue ? "border-amber-200" : isGap ? "border-red-200" : "border-gray-200"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(reg.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown size={15} className="shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight size={15} className="shrink-0 text-gray-400" />
                  )}
                  <Scale size={15} className="shrink-0 text-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{reg.reference}</span>
                      <span className="text-sm font-medium text-gray-900">{reg.shortName ?? reg.name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                      {reg.lastAssessedAt ? (
                        <span className="flex items-center gap-1">
                          <CalendarClock size={10} />
                          Last assessed {relativeDate(reg.lastAssessedAt)} · {new Date(reg.lastAssessedAt).toLocaleDateString("en-GB")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400">
                          <CalendarClock size={10} />
                          Never assessed
                        </span>
                      )}
                      {reg.nextReviewDate && (
                        <span className={cn(
                          "flex items-center gap-1",
                          new Date(reg.nextReviewDate) < TODAY ? "text-red-500 font-medium" : ""
                        )}>
                          · Next review: {new Date(reg.nextReviewDate).toLocaleDateString("en-GB")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isOverdue && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <AlertTriangle size={10} /> Overdue
                      </span>
                    )}
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", cfg?.bg, cfg?.text)}>
                      {COMPLIANCE_STATUS_LABELS[reg.complianceStatus]}
                    </span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3 space-y-3">
                    {/* Assessment notes */}
                    {reg.assessmentNotes ? (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Assessment Notes</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{reg.assessmentNotes}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No assessment notes recorded.</p>
                    )}

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {reg.body && (
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Regulatory Body</p>
                          <p className="text-xs font-medium text-gray-700">{reg.body}</p>
                        </div>
                      )}
                      {reg.primarySMF && (
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">SMF Accountable</p>
                          <p className="text-xs font-medium text-gray-700">{reg.primarySMF}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Linked Policies</p>
                        <p className="text-xs font-medium text-gray-700">{(reg.policyLinks ?? []).length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Linked Controls</p>
                        <p className="text-xs font-medium text-gray-700">{(reg.controlLinks ?? []).length}</p>
                      </div>
                      {daysSinceAssessed !== null && (
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Days Since Assessment</p>
                          <p className={cn("text-xs font-medium", daysSinceAssessed > 365 ? "text-red-600" : daysSinceAssessed > 180 ? "text-amber-600" : "text-green-600")}>
                            {daysSinceAssessed}d
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/compliance?tab=regulatory-universe&regulation=${reg.id}`}
                        className="flex items-center gap-1.5 text-xs text-updraft-bright-purple hover:underline"
                      >
                        <ExternalLink size={12} />
                        View in Regulatory Universe
                      </Link>
                      {reg.url && (
                        <a
                          href={reg.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 hover:underline"
                        >
                          <ExternalLink size={12} />
                          Official source
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
