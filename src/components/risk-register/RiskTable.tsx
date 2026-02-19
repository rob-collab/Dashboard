"use client";

import { useState, useMemo } from "react";
import type { Risk } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { L1_CATEGORY_COLOURS, L1_CATEGORIES as FALLBACK_L1, getRiskScore } from "@/lib/risk-categories";
import ScoreBadge from "./ScoreBadge";
import DirectionArrow from "./DirectionArrow";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDateShort } from "@/lib/utils";
import { ChevronUp, ChevronDown, Search, Filter, ShieldAlert, Star } from "lucide-react";
import { useHasPermission } from "@/lib/usePermission";

type SortField = "reference" | "name" | "categoryL1" | "owner" | "inherent" | "residual" | "direction" | "lastReviewed";
type SortDir = "asc" | "desc";

interface RiskTableProps {
  risks: Risk[];
  onRiskClick: (risk: Risk) => void;
}

export default function RiskTable({ risks, onRiskClick }: RiskTableProps) {
  const storeUsers = useAppStore((s) => s.users);
  const storeCategories = useAppStore((s) => s.riskCategories);
  const toggleRiskInFocus = useAppStore((s) => s.toggleRiskInFocus);
  const canToggleFocus = useHasPermission("can:toggle-risk-focus");
  const L1_CATEGORIES = storeCategories.length > 0 ? storeCategories.map((c) => c.name) : FALLBACK_L1;
  const getOwnerName = (risk: Risk) => risk.riskOwner?.name ?? storeUsers.find(u => u.id === risk.ownerId)?.name ?? "Unknown";
  const [sortField, setSortField] = useState<SortField>("reference");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [filterL1, setFilterL1] = useState<string>("");
  const [filterOwner, setFilterOwner] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const owners = useMemo(() => {
    const ownerMap = new Map<string, string>();
    risks.forEach((r) => {
      const name = getOwnerName(r);
      ownerMap.set(r.ownerId, name);
    });
    return Array.from(ownerMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [risks]);

  const filtered = useMemo(() => {
    let result = risks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.reference.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || getOwnerName(r).toLowerCase().includes(q)
      );
    }
    if (filterL1) result = result.filter((r) => r.categoryL1 === filterL1);
    if (filterOwner) result = result.filter((r) => r.ownerId === filterOwner);
    return result;
  }, [risks, search, filterL1, filterOwner]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "reference": cmp = a.reference.localeCompare(b.reference); break;
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "categoryL1": cmp = a.categoryL1.localeCompare(b.categoryL1); break;
        case "owner": cmp = getOwnerName(a).localeCompare(getOwnerName(b)); break;
        case "inherent": cmp = getRiskScore(a.inherentLikelihood, a.inherentImpact) - getRiskScore(b.inherentLikelihood, b.inherentImpact); break;
        case "residual": cmp = getRiskScore(a.residualLikelihood, a.residualImpact) - getRiskScore(b.residualLikelihood, b.residualImpact); break;
        case "direction": cmp = a.directionOfTravel.localeCompare(b.directionOfTravel); break;
        case "lastReviewed": cmp = a.lastReviewed.localeCompare(b.lastReviewed); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-updraft-deep" /> : <ChevronDown className="w-3 h-3 text-updraft-deep" />;
  }

  return (
    <div className="space-y-3">
      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search risks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
            showFilters || filterL1 || filterOwner
              ? "bg-updraft-pale-purple/30 border-updraft-bright-purple/30 text-updraft-deep"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filterL1 || filterOwner) && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-updraft-bright-purple text-white rounded-full">
              {(filterL1 ? 1 : 0) + (filterOwner ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
          <select
            value={filterL1}
            onChange={(e) => setFilterL1(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">All Categories</option>
            {L1_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">All Owners</option>
            {owners.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          {(filterL1 || filterOwner) && (
            <button
              onClick={() => { setFilterL1(""); setFilterOwner(""); }}
              className="text-xs text-updraft-bright-purple hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-2 py-2.5 w-8" />
              {[
                { field: "reference" as SortField, label: "Ref", width: "w-16" },
                { field: "name" as SortField, label: "Risk Name", width: "" },
                { field: "categoryL1" as SortField, label: "Category", width: "w-44" },
                { field: "owner" as SortField, label: "Owner", width: "w-24" },
                { field: "inherent" as SortField, label: "Inherent", width: "w-28" },
                { field: "residual" as SortField, label: "Residual", width: "w-28" },
                { field: "direction" as SortField, label: "Direction", width: "w-24" },
                { field: "lastReviewed" as SortField, label: "Last Reviewed", width: "w-28" },
              ].map(({ field, label, width }) => (
                <th
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none ${width}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <SortIcon field={field} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((risk) => {
              const catColour = L1_CATEGORY_COLOURS[risk.categoryL1];
              return (
                <tr
                  key={risk.id}
                  onClick={() => onRiskClick(risk)}
                  className="hover:bg-updraft-pale-purple/10 cursor-pointer transition-colors"
                >
                  <td className="px-2 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canToggleFocus) toggleRiskInFocus(risk.id, !risk.inFocus);
                      }}
                      className={`transition-colors ${canToggleFocus ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
                      title={canToggleFocus ? (risk.inFocus ? "Remove from Focus" : "Mark as Risk in Focus") : "Risk in Focus"}
                      aria-label={risk.inFocus ? "Remove from Focus" : "Mark as Risk in Focus"}
                    >
                      <Star
                        className={`w-4 h-4 ${risk.inFocus ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center rounded bg-updraft-pale-purple/30 px-1.5 py-0.5 font-mono text-xs font-bold text-updraft-deep">
                      {risk.reference}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-800">
                    <span className="inline-flex items-center gap-1.5">
                      {risk.name}
                      {risk.approvalStatus === "PENDING_APPROVAL" && (
                        <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[9px] font-semibold shrink-0">Pending</span>
                      )}
                      {risk.approvalStatus === "REJECTED" && (
                        <span className="rounded-full bg-red-100 text-red-700 px-1.5 py-0.5 text-[9px] font-semibold shrink-0">Rejected</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: catColour?.fill ?? "#888" }}
                    >
                      {catColour?.label ?? risk.categoryL1}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{getOwnerName(risk)}</td>
                  <td className="px-3 py-3">
                    <ScoreBadge likelihood={risk.inherentLikelihood} impact={risk.inherentImpact} size="sm" />
                  </td>
                  <td className="px-3 py-3">
                    <ScoreBadge likelihood={risk.residualLikelihood} impact={risk.residualImpact} size="sm" />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <DirectionArrow direction={risk.directionOfTravel} />
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs">
                    {formatDateShort(risk.lastReviewed)}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon={<ShieldAlert className="h-7 w-7" />}
                    heading={risks.length === 0 ? "No risks registered" : "No risks match the current filters"}
                    description={risks.length === 0 ? "Add your first risk to begin building the risk register." : "Try adjusting the search or filter criteria."}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-400">
        Showing {sorted.length} of {risks.length} risks
      </div>
    </div>
  );
}
