"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Layers } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn, naturalCompare } from "@/lib/utils";
import type { Process, ProcessCategory, ProcessCriticality, ProcessStatus } from "@/lib/types";
import {
  PROCESS_CATEGORY_LABELS,
  PROCESS_CATEGORY_COLOURS,
  PROCESS_CRITICALITY_LABELS,
  PROCESS_CRITICALITY_COLOURS,
  PROCESS_STATUS_LABELS,
  PROCESS_STATUS_COLOURS,
} from "@/lib/types";
import MaturityBadge, { MaturityBar } from "./MaturityBadge";
import { EmptyState } from "@/components/common/EmptyState";

type SortKey = "reference" | "name" | "owner" | "category" | "criticality" | "status" | "maturity" | "controls" | "policies";
type SortDir = "asc" | "desc";

interface Props {
  processes: Process[];
  onProcessClick: (p: Process) => void;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="text-gray-300 ml-0.5" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="text-updraft-deep ml-0.5" />
    : <ChevronDown size={12} className="text-updraft-deep ml-0.5" />;
}

const ALL = "ALL" as const;

export default function ProcessListTable({ processes, onProcessClick }: Props) {
  const users = useAppStore((s) => s.users);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<ProcessCategory | typeof ALL>(ALL);
  const [filterCriticality, setFilterCriticality] = useState<ProcessCriticality | typeof ALL>(ALL);
  const [filterStatus, setFilterStatus] = useState<ProcessStatus | typeof ALL>(ALL);

  const [sortKey, setSortKey] = useState<SortKey>("maturity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir(col === "maturity" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return processes.filter((p) => {
      if (filterCategory !== ALL && p.category !== filterCategory) return false;
      if (filterCriticality !== ALL && p.criticality !== filterCriticality) return false;
      if (filterStatus !== ALL && p.status !== filterStatus) return false;
      if (q) {
        const owner = users.find((u) => u.id === p.ownerId);
        const haystack = [p.reference, p.name, owner?.name ?? ""].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [processes, users, search, filterCategory, filterCriticality, filterStatus]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      const ownerA = users.find((u) => u.id === a.ownerId);
      const ownerB = users.find((u) => u.id === b.ownerId);

      switch (sortKey) {
        case "reference":
          cmp = naturalCompare(a.reference, b.reference);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "owner":
          cmp = (ownerA?.name ?? "").localeCompare(ownerB?.name ?? "");
          break;
        case "category":
          cmp = PROCESS_CATEGORY_LABELS[a.category].localeCompare(PROCESS_CATEGORY_LABELS[b.category]);
          break;
        case "criticality": {
          const order: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1, STANDARD: 2 };
          cmp = (order[a.criticality] ?? 3) - (order[b.criticality] ?? 3);
          break;
        }
        case "status":
          cmp = PROCESS_STATUS_LABELS[a.status].localeCompare(PROCESS_STATUS_LABELS[b.status]);
          break;
        case "maturity":
          cmp = a.maturityScore - b.maturityScore;
          break;
        case "controls":
          cmp = (a.controlLinks?.length ?? 0) - (b.controlLinks?.length ?? 0);
          break;
        case "policies":
          cmp = (a.policyLinks?.length ?? 0) - (b.policyLinks?.length ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, users]);

  const CATEGORIES = Object.keys(PROCESS_CATEGORY_LABELS) as ProcessCategory[];
  const CRITICALITIES = Object.keys(PROCESS_CRITICALITY_LABELS) as ProcessCriticality[];
  const STATUSES = Object.keys(PROCESS_STATUS_LABELS) as ProcessStatus[];

  const thClass = "px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-updraft-deep transition-colors whitespace-nowrap";
  const tdClass = "px-3 py-2.5 text-sm align-middle";

  return (
    <div className="space-y-3">
      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search processes..."
            className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple outline-none"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as ProcessCategory | typeof ALL)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple outline-none"
        >
          <option value={ALL}>All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{PROCESS_CATEGORY_LABELS[c]}</option>
          ))}
        </select>

        <select
          value={filterCriticality}
          onChange={(e) => setFilterCriticality(e.target.value as ProcessCriticality | typeof ALL)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple outline-none"
        >
          <option value={ALL}>All Criticalities</option>
          {CRITICALITIES.map((c) => (
            <option key={c} value={c}>{PROCESS_CRITICALITY_LABELS[c]}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ProcessStatus | typeof ALL)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple outline-none"
        >
          <option value={ALL}>All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{PROCESS_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-700">{sorted.length}</span> of{" "}
        <span className="font-medium text-gray-700">{processes.length}</span> processes
      </p>

      {/* Table */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-7 w-7" />}
          heading="No processes found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {(
                  [
                    ["reference", "Reference"],
                    ["name", "Name"],
                    ["owner", "Owner"],
                    ["category", "Category"],
                    ["criticality", "Criticality"],
                    ["status", "Status"],
                    ["maturity", "Maturity"],
                    ["controls", "Controls"],
                    ["policies", "Policies"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th
                    key={key}
                    className={thClass}
                    onClick={() => handleSort(key)}
                  >
                    <span className="inline-flex items-center">
                      {label}
                      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {sorted.map((p) => {
                const owner = users.find((u) => u.id === p.ownerId);
                const catColours = PROCESS_CATEGORY_COLOURS[p.category];
                const critColours = PROCESS_CRITICALITY_COLOURS[p.criticality];
                const statusColours = PROCESS_STATUS_COLOURS[p.status];
                const controlCount = p.controlLinks?.length ?? 0;
                const policyCount = p.policyLinks?.length ?? 0;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onProcessClick(p)}
                    className="hover:bg-updraft-pale-purple/10 cursor-pointer transition-colors"
                  >
                    {/* Reference */}
                    <td className={tdClass}>
                      <span className="font-mono text-xs font-bold bg-updraft-pale-purple/30 text-updraft-deep px-2 py-0.5 rounded whitespace-nowrap">
                        {p.reference}
                      </span>
                    </td>

                    {/* Name */}
                    <td className={cn(tdClass, "max-w-[220px]")}>
                      <span className="font-medium text-gray-800 line-clamp-2">{p.name}</span>
                    </td>

                    {/* Owner */}
                    <td className={cn(tdClass, "whitespace-nowrap text-gray-600")}>
                      {owner?.name ?? <span className="text-gray-300">—</span>}
                    </td>

                    {/* Category */}
                    <td className={tdClass}>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                        catColours.bg, catColours.text,
                      )}>
                        {PROCESS_CATEGORY_LABELS[p.category]}
                      </span>
                    </td>

                    {/* Criticality */}
                    <td className={tdClass}>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                        critColours.bg, critColours.text,
                      )}>
                        {PROCESS_CRITICALITY_LABELS[p.criticality]}
                      </span>
                    </td>

                    {/* Status */}
                    <td className={tdClass}>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                        statusColours.bg, statusColours.text,
                      )}>
                        {PROCESS_STATUS_LABELS[p.status]}
                      </span>
                    </td>

                    {/* Maturity */}
                    <td className={cn(tdClass, "min-w-[120px]")}>
                      <div className="space-y-1">
                        <MaturityBar score={p.maturityScore} />
                        <MaturityBadge score={p.maturityScore} showLabel={false} size="sm" />
                      </div>
                    </td>

                    {/* Controls # */}
                    <td className={cn(tdClass, "text-center")}>
                      {controlCount > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 min-w-[24px]">
                          {controlCount}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Policies # */}
                    <td className={cn(tdClass, "text-center")}>
                      {policyCount > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 min-w-[24px]">
                          {policyCount}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
