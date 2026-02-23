"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Filter,
  Loader2,
  History,
  ShieldCheck,
  FileText,
  Link2,
  Settings2,
} from "lucide-react";
import EntityLink from "@/components/common/EntityLink";
import type { ComplianceHistoryMonth, ComplianceHistoryEvent } from "@/app/api/compliance/history/route";

type EventTypeFilter = "all" | "status_change" | "field_updated" | "control_linked" | "policy_linked" | "control_tested";

const TYPE_LABELS: Record<EventTypeFilter, string> = {
  all: "All events",
  status_change: "Status changes",
  field_updated: "Field updates",
  control_linked: "Controls linked",
  policy_linked: "Policies linked",
  control_tested: "Controls tested",
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  status_change: <ShieldCheck size={12} className="text-blue-500" />,
  field_updated: <Settings2 size={12} className="text-gray-500" />,
  control_linked: <ShieldCheck size={12} className="text-green-600" />,
  policy_linked: <FileText size={12} className="text-purple-600" />,
  control_tested: <Link2 size={12} className="text-amber-600" />,
};

const EVENT_DOT: Record<string, string> = {
  status_change: "bg-blue-500",
  field_updated: "bg-gray-400",
  control_linked: "bg-green-500",
  policy_linked: "bg-purple-500",
  control_tested: "bg-amber-500",
};

const FIELD_LABELS: Record<string, string> = {
  complianceStatus: "Compliance Status",
  assessmentNotes: "Assessment Notes",
  applicability: "Applicability",
  applicabilityNotes: "Applicability Notes",
  primarySMF: "Primary SMF",
  secondarySMF: "Secondary SMF",
  smfNotes: "SMF Notes",
  description: "Description",
  provisions: "Provisions",
  nextReviewDate: "Next Review Date",
};

export default function ComplianceHistoryTab() {
  const [months, setMonths] = useState<ComplianceHistoryMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api<ComplianceHistoryMonth[]>("/api/compliance/history?months=12")
      .then((data) => {
        setMonths(data);
        // Auto-expand the most recent month that has events
        const firstWithEvents = data.find((m) => m.events.length > 0);
        if (firstWithEvents) {
          setExpandedMonths(new Set([firstWithEvents.yearMonth]));
        }
      })
      .catch((e) => console.error("[ComplianceHistoryTab]", e))
      .finally(() => setLoading(false));
  }, []);

  const filteredMonths = useMemo(() => {
    return months.map((m) => {
      let events = m.events;
      if (typeFilter !== "all") {
        events = events.filter((e) => e.type === typeFilter);
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        events = events.filter(
          (e) =>
            e.userName.toLowerCase().includes(q) ||
            (e.regulationName ?? "").toLowerCase().includes(q) ||
            (e.regulationRef ?? "").toLowerCase().includes(q) ||
            (e.entityName ?? "").toLowerCase().includes(q) ||
            (e.entityRef ?? "").toLowerCase().includes(q)
        );
      }
      return { ...m, events };
    });
  }, [months, typeFilter, search]);

  const totalEvents = filteredMonths.reduce((n, m) => n + m.events.length, 0);

  function toggleMonth(ym: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(ym)) next.delete(ym); else next.add(ym);
      return next;
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Compliance Change History</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Month-by-month audit trail of status updates, linked controls and policies across the regulatory universe.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-gray-400" />
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(Object.keys(TYPE_LABELS) as EventTypeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-200",
                  typeFilter === f
                    ? "bg-updraft-bright-purple text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {TYPE_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        <span className="ml-auto text-xs text-gray-400">
          {totalEvents} event{totalEvents !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : totalEvents === 0 && !loading ? (
        <div className="py-16 text-center">
          <History size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No compliance events found for this period.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMonths.filter((m) => m.events.length > 0 || (typeFilter === "all" && !search)).map((m) => {
            const isExpanded = expandedMonths.has(m.yearMonth);
            return (
              <div key={m.yearMonth} className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleMonth(m.yearMonth)}
                  className="flex w-full items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  {isExpanded
                    ? <ChevronDown size={15} className="shrink-0 text-gray-400" />
                    : <ChevronRight size={15} className="shrink-0 text-gray-400" />
                  }
                  <span className="text-sm font-semibold text-gray-800">{m.label}</span>
                  {m.events.length > 0 ? (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-updraft-pale-purple px-2 py-0.5 text-xs font-medium text-updraft-deep">
                      {m.events.length} event{m.events.length !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="ml-auto text-xs text-gray-300">No events</span>
                  )}
                </button>

                {isExpanded && m.events.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3 space-y-2">
                    {m.events.map((ev) => (
                      <EventCard key={ev.id} event={ev} />
                    ))}
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

function EventCard({ event }: { event: ComplianceHistoryEvent }) {
  const dot = EVENT_DOT[event.type] ?? "bg-gray-400";
  const icon = EVENT_ICONS[event.type];
  const dateStr = new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const timeStr = new Date(event.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-start gap-3 rounded-lg bg-white border border-gray-100 px-3 py-2.5">
      {/* dot */}
      <div className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", dot)} />

      {/* content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {icon}
          <span className="text-xs font-medium text-gray-700">
            {event.type === "status_change" && "Status updated"}
            {event.type === "field_updated" && `${FIELD_LABELS[event.field ?? ""] ?? event.field ?? "Field"} updated`}
            {event.type === "control_linked" && "Control linked"}
            {event.type === "policy_linked" && "Policy linked"}
            {event.type === "control_tested" && "Control tested"}
          </span>
          {event.regulationRef && event.regulationId && (
            <EntityLink
              type="regulation"
              id={event.regulationId}
              reference={event.regulationRef}
              label={event.regulationName}
            />
          )}
        </div>

        {event.type === "status_change" && event.from != null && event.to != null && (
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="line-through text-gray-400">{event.from}</span>
            {" → "}
            <span className="font-medium text-updraft-deep">{event.to}</span>
          </p>
        )}

        {event.type === "control_linked" && event.entityRef && (
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="font-mono font-bold text-green-700">{event.entityRef}</span>
            {event.entityName && <span className="text-gray-400"> — {event.entityName}</span>}
          </p>
        )}

        {event.type === "control_tested" && (
          <p className="text-xs text-gray-500 mt-0.5">
            {event.entityRef && <span className="font-mono font-bold text-gray-700">{event.entityRef}</span>}
            {event.entityName && <span className="text-gray-400"> — {event.entityName}</span>}
            {event.testResult && (
              <span className={cn(
                "ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                event.testResult === "PASS" ? "bg-green-100 text-green-700" :
                event.testResult === "FAIL" ? "bg-red-100 text-red-700" :
                "bg-amber-100 text-amber-700"
              )}>
                {event.testResult.replace(/_/g, " ")}
              </span>
            )}
          </p>
        )}

        {event.type === "policy_linked" && event.entityRef && (
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="font-mono font-bold text-purple-700">{event.entityRef}</span>
            {event.entityName && <span className="text-gray-400"> — {event.entityName}</span>}
          </p>
        )}

        <div className="mt-0.5 text-[11px] text-gray-400">
          {dateStr} at {timeStr} · {event.userName}
        </div>
      </div>
    </div>
  );
}
