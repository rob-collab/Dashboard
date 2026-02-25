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
  Plus,
  Settings2,
  Archive,
  Activity,
} from "lucide-react";
import EntityLink from "@/components/common/EntityLink";
import type { HistoryEvent, HistoryMonth } from "@/app/api/audit/history/route";

type EventTypeFilter = "all" | "created" | "updated" | "archived" | "other";

const TYPE_LABELS: Record<EventTypeFilter, string> = {
  all: "All events",
  created: "Created",
  updated: "Updated",
  archived: "Archived",
  other: "Other",
};

const ENTITY_LINK_TYPES: Set<string> = new Set(["control", "risk", "action", "process"]);

interface HistoryTabProps {
  entityTypes: string[];
  title: string;
  description: string;
  months?: number;
}

export default function HistoryTab({ entityTypes, title, description, months = 12 }: HistoryTabProps) {
  const [historyMonths, setHistoryMonths] = useState<HistoryMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>("all");
  const [search, setSearch] = useState("");

  const entityTypesKey = entityTypes.join(",");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      entityTypes: entityTypesKey,
      months: String(months),
    });
    api<HistoryMonth[]>(`/api/audit/history?${params.toString()}`)
      .then((data) => {
        setHistoryMonths(data);
        const firstWithEvents = data.find((m) => m.events.length > 0);
        if (firstWithEvents) {
          setExpandedMonths(new Set([firstWithEvents.yearMonth]));
        }
      })
      .catch((e) => console.error("[HistoryTab]", e))
      .finally(() => setLoading(false));
  }, [entityTypesKey, months]);

  const filteredMonths = useMemo(() => {
    return historyMonths.map((m) => {
      let events = m.events;
      if (typeFilter !== "all") {
        events = events.filter((e) => e.type === typeFilter);
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        events = events.filter(
          (e) =>
            (e.entityRef ?? "").toLowerCase().includes(q) ||
            (e.entityName ?? "").toLowerCase().includes(q) ||
            (e.action ?? "").toLowerCase().includes(q) ||
            (e.field ?? "").toLowerCase().includes(q) ||
            (e.from ?? "").toLowerCase().includes(q) ||
            (e.to ?? "").toLowerCase().includes(q) ||
            e.userName.toLowerCase().includes(q)
        );
      }
      return { ...m, events };
    });
  }, [historyMonths, typeFilter, search]);

  const totalEvents = filteredMonths.reduce((n, m) => n + m.events.length, 0);

  function toggleMonth(ym: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(ym)) next.delete(ym);
      else next.add(ym);
      return next;
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
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
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
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
      ) : totalEvents === 0 ? (
        <div className="py-16 text-center">
          <History size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No events found for this period.</p>
          <p className="mt-1 max-w-sm mx-auto text-xs text-gray-400">Events are recorded when entities are created, updated, or deleted.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMonths
            .filter((m) => m.events.length > 0 || (typeFilter === "all" && !search))
            .map((m) => {
              const isExpanded = expandedMonths.has(m.yearMonth);
              return (
                <div key={m.yearMonth} className="rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleMonth(m.yearMonth)}
                    className="flex w-full items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown size={15} className="shrink-0 text-gray-400" />
                    ) : (
                      <ChevronRight size={15} className="shrink-0 text-gray-400" />
                    )}
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

function EventCard({ event }: { event: HistoryEvent }) {
  const dateStr = new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const timeStr = new Date(event.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const configs = {
    created: { dot: "bg-green-500", icon: <Plus size={12} className="text-green-600" />, label: "Created" },
    updated: { dot: "bg-gray-400", icon: <Settings2 size={12} className="text-gray-500" />, label: "Updated" },
    archived: { dot: "bg-red-500", icon: <Archive size={12} className="text-red-500" />, label: "Archived" },
    other: { dot: "bg-gray-400", icon: <Activity size={12} className="text-gray-500" />, label: event.action },
  };

  const c = configs[event.type] ?? configs.other;
  const hasEntityLink = !!(event.entityId && event.entityRef && ENTITY_LINK_TYPES.has(event.entityType));

  return (
    <div className="flex items-start gap-3 rounded-lg bg-white border border-gray-100 px-3 py-2.5">
      <div className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", c.dot)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {c.icon}
          <span className="text-xs font-medium text-gray-700">
            {event.type === "other" ? event.action : c.label}
            {event.field && event.type !== "other" && (
              <span className="font-normal text-gray-500"> — {event.field}</span>
            )}
          </span>
          {hasEntityLink && (
            <EntityLink
              type={event.entityType as "control" | "risk" | "action" | "process"}
              id={event.entityId!}
              reference={event.entityRef!}
              label={event.entityName}
            />
          )}
        </div>

        {event.from != null && event.to != null && (
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="line-through text-gray-400">{event.from}</span>
            {" → "}
            <span className="font-medium text-updraft-deep">{event.to}</span>
          </p>
        )}

        {!hasEntityLink && event.entityRef && (
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="font-mono font-bold text-gray-700">{event.entityRef}</span>
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
