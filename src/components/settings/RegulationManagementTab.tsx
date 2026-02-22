"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { usePermissionSet } from "@/lib/usePermission";
import {
  REGULATION_TYPE_LABELS,
  REGULATION_TYPE_COLOURS,
  type Regulation,
  type RegulationType,
} from "@/lib/types";
import { cn, naturalCompare } from "@/lib/utils";
import {
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  Filter,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

export default function RegulationManagementTab() {
  const regulations = useAppStore((s) => s.regulations);
  const toggleRegulationApplicability = useAppStore(
    (s) => s.toggleRegulationApplicability
  );
  const permissionSet = usePermissionSet();
  const canManage = permissionSet.has("manage:regulations");

  const [search, setSearch] = useState("");
  const [bodyFilter, setBodyFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Unique regulatory bodies for the filter dropdown
  const regulatoryBodies = useMemo(() => {
    const bodies = new Set<string>();
    for (const r of regulations) {
      if (r.regulatoryBody) bodies.add(r.regulatoryBody);
      if (r.body) bodies.add(r.body);
    }
    return Array.from(bodies).sort(naturalCompare);
  }, [regulations]);

  // Build filtered list
  const filteredTree = useMemo(() => {
    let filtered = regulations;

    if (bodyFilter) {
      filtered = filtered.filter(
        (r) => r.regulatoryBody === bodyFilter || r.body === bodyFilter
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.reference.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.shortName?.toLowerCase().includes(q) ||
          r.body?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
      );
    }

    // When filtering, ensure parent nodes are included so tree structure is preserved
    const ids = new Set(filtered.map((r) => r.id));
    for (const r of filtered) {
      if (r.parentId && !ids.has(r.parentId)) {
        const parent = regulations.find((p) => p.id === r.parentId);
        if (parent) ids.add(parent.id);
      }
    }

    return regulations.filter((r) => ids.has(r.id));
  }, [regulations, search, bodyFilter]);

  const topLevel = useMemo(
    () => filteredTree.filter((r) => !r.parentId),
    [filteredTree]
  );

  const childrenOf = useCallback(
    (parentId: string) => filteredTree.filter((r) => r.parentId === parentId),
    [filteredTree]
  );

  // Summary stats
  const applicableCount = useMemo(
    () => regulations.filter((r) => r.isApplicable).length,
    [regulations]
  );

  // Toggle individual regulation
  const handleToggle = useCallback(
    (id: string, currentValue: boolean) => {
      if (!canManage) return;
      toggleRegulationApplicability(id, !currentValue);
    },
    [canManage, toggleRegulationApplicability]
  );

  // Cascade toggle: toggle parent and all its descendants
  const handleCascadeToggle = useCallback(
    (reg: Regulation, newValue: boolean) => {
      if (!canManage) return;

      // Toggle this regulation
      toggleRegulationApplicability(reg.id, newValue);

      // Find all descendants recursively
      const getAllDescendants = (parentId: string): string[] => {
        const children = regulations.filter((r) => r.parentId === parentId);
        const result: string[] = [];
        for (const child of children) {
          result.push(child.id);
          result.push(...getAllDescendants(child.id));
        }
        return result;
      };

      const descendantIds = getAllDescendants(reg.id);
      for (const did of descendantIds) {
        toggleRegulationApplicability(did, newValue);
      }
    },
    [canManage, regulations, toggleRegulationApplicability]
  );

  // Expand/collapse
  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(regulations.map((r) => r.id)));
  }, [regulations]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-green-600" />
            <span className="text-sm font-semibold text-gray-700">
              {applicableCount} of {regulations.length} regulations applicable
            </span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <ShieldOff size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">
              {regulations.length - applicableCount} not applicable
            </span>
          </div>
        </div>
        {!canManage && (
          <span className="text-xs text-gray-400 italic">
            Read-only — you do not have permission to manage regulations
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{
            width: `${
              regulations.length > 0
                ? (applicableCount / regulations.length) * 100
                : 0
            }%`,
          }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search regulations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-updraft-bright-purple/30 focus:border-updraft-bright-purple"
            aria-label="Search regulations"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Filter size={14} className="text-gray-400" />
          <select
            value={bodyFilter}
            onChange={(e) => setBodyFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2"
            aria-label="Filter by regulatory body"
          >
            <option value="">All Bodies</option>
            {regulatoryBodies.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={expandAll}
            className="text-xs text-updraft-bright-purple hover:underline"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-500 hover:underline"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400">
        {filteredTree.length} of {regulations.length} regulations shown
      </p>

      {/* Tree Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-3 py-2 font-medium text-gray-600 w-8">
                {canManage && (
                  <span className="text-[10px] text-gray-400">On/Off</span>
                )}
              </th>
              <th className="px-3 py-2 font-medium text-gray-600 w-[35%]">
                Reference / Name
              </th>
              <th className="px-3 py-2 font-medium text-gray-600">Body</th>
              <th className="px-3 py-2 font-medium text-gray-600">Type</th>
              <th className="px-3 py-2 font-medium text-gray-600">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topLevel.map((reg) => (
              <RegulationTreeRow
                key={reg.id}
                reg={reg}
                depth={0}
                expanded={expanded}
                toggleExpand={toggleExpand}
                childrenOf={childrenOf}
                canManage={canManage}
                onToggle={handleToggle}
                onCascadeToggle={handleCascadeToggle}
              />
            ))}
            {topLevel.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No regulations match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tree Row ────────────────────────────────────────────────────────

function RegulationTreeRow({
  reg,
  depth,
  expanded,
  toggleExpand,
  childrenOf,
  canManage,
  onToggle,
  onCascadeToggle,
}: {
  reg: Regulation;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  childrenOf: (parentId: string) => Regulation[];
  canManage: boolean;
  onToggle: (id: string, currentValue: boolean) => void;
  onCascadeToggle: (reg: Regulation, newValue: boolean) => void;
}) {
  const children = childrenOf(reg.id);
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(reg.id);
  const regType = reg.type as RegulationType;
  const typeColours = REGULATION_TYPE_COLOURS[regType];
  const truncatedDesc =
    reg.description && reg.description.length > 80
      ? reg.description.substring(0, 80) + "..."
      : reg.description;

  return (
    <>
      <tr
        className={cn(
          "hover:bg-gray-50 transition-colors",
          !reg.isApplicable && "opacity-50"
        )}
      >
        {/* Applicability Checkbox */}
        <td className="px-3 py-2">
          <div className="flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) {
                  onCascadeToggle(reg, !reg.isApplicable);
                } else {
                  onToggle(reg.id, reg.isApplicable);
                }
              }}
              disabled={!canManage}
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                reg.isApplicable
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-white border-gray-300",
                canManage
                  ? "cursor-pointer hover:border-green-400"
                  : "cursor-not-allowed opacity-60"
              )}
              title={
                hasChildren
                  ? reg.isApplicable
                    ? "Uncheck this and all children"
                    : "Check this and all children"
                  : reg.isApplicable
                  ? "Mark as not applicable"
                  : "Mark as applicable"
              }
              aria-label={`Toggle applicability for ${reg.reference}`}
            >
              {reg.isApplicable && <Check size={12} strokeWidth={3} />}
            </button>
          </div>
        </td>

        {/* Reference / Name */}
        <td className="px-3 py-2">
          <div
            className="flex items-center gap-1"
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(reg.id);
                }}
                className="p-0.5 hover:bg-gray-200 rounded shrink-0"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <div className="min-w-0">
              <span className="text-xs font-mono text-gray-400 mr-1.5">
                {reg.reference}
              </span>
              <span
                className={cn(
                  "text-sm",
                  depth === 0
                    ? "font-semibold text-updraft-deep"
                    : "text-gray-700"
                )}
              >
                {reg.shortName || reg.name}
              </span>
              {hasChildren && (
                <span className="ml-1.5 text-[10px] text-gray-400">
                  ({children.length})
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Body */}
        <td className="px-3 py-2">
          <span className="text-xs text-gray-600">
            {reg.regulatoryBody || reg.body || "\u2014"}
          </span>
        </td>

        {/* Type */}
        <td className="px-3 py-2">
          {typeColours && (
            <span
              className={cn(
                "inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold",
                typeColours.bg,
                typeColours.text
              )}
            >
              {REGULATION_TYPE_LABELS[regType]}
            </span>
          )}
        </td>

        {/* Summary */}
        <td className="px-3 py-2">
          <span className="text-xs text-gray-500 line-clamp-1">
            {truncatedDesc || "\u2014"}
          </span>
        </td>
      </tr>
      {isExpanded &&
        children.map((child) => (
          <RegulationTreeRow
            key={child.id}
            reg={child}
            depth={depth + 1}
            expanded={expanded}
            toggleExpand={toggleExpand}
            childrenOf={childrenOf}
            canManage={canManage}
            onToggle={onToggle}
            onCascadeToggle={onCascadeToggle}
          />
        ))}
    </>
  );
}
