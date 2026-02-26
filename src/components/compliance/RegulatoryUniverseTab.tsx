"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  APPLICABILITY_LABELS,
  APPLICABILITY_COLOURS,
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLOURS,
  type Regulation,
  type ComplianceStatus,
  type Applicability,
  type Policy,
  type ControlRecord,
} from "@/lib/types";
import { cn, naturalCompare } from "@/lib/utils";
import { useHasPermission } from "@/lib/usePermission";
import RequestEditAccessButton from "@/components/common/RequestEditAccessButton";
import RegulationDetailPanel from "./RegulationDetailPanel";
import RegulationCSVDialog from "./RegulationCSVDialog";
import { api } from "@/lib/api-client";
import { ChevronRight, ChevronDown, Search, X, Download, Upload, AlertTriangle } from "lucide-react";

export default function RegulatoryUniverseTab({ initialRegulationId, initialDomainFilter }: { initialRegulationId?: string | null; initialDomainFilter?: string | null } = {}) {
  const regulations = useAppStore((s) => s.regulations);
  const policies = useAppStore((s) => s.policies);
  const controls = useAppStore((s) => s.controls);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | "">("");
  const [smfFilter, setSmfFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>(initialDomainFilter ?? "");
  const [applicableOnly, setApplicableOnly] = useState(true);
  const [gapsOnly, setGapsOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [detailReg, setDetailReg] = useState<Regulation | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const canEditCompliance = useHasPermission("edit:compliance");

  useEffect(() => {
    if (initialRegulationId) setSelectedId(initialRegulationId);
  }, [initialRegulationId]);

  // Write ?regulation=<id> to URL when panel opens; clear when it closes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedId) {
      if (params.get("regulation") !== selectedId) {
        params.set("regulation", selectedId);
        params.set("tab", "regulatory-universe");
        router.replace(`/compliance?${params.toString()}`, { scroll: false });
      }
    } else {
      if (params.has("regulation")) {
        params.delete("regulation");
        router.replace(`/compliance?${params.toString()}`, { scroll: false });
      }
    }
  // searchParams deliberately excluded — read once per panel state change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const full = await api<Regulation>(`/api/compliance/regulations/${id}`);
      setDetailReg(full);
    } catch {
      // Fallback to store version if fetch fails
      setDetailReg(regulations.find((r) => r.id === id) ?? null);
    } finally {
      setDetailLoading(false);
    }
  }, [regulations]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetailReg(null);
    }
  }, [selectedId, loadDetail]);

  // Build hierarchy
  const tree = useMemo(() => {
    let filtered = regulations;
    if (applicableOnly) filtered = filtered.filter((r) => r.isApplicable);
    if (statusFilter) filtered = filtered.filter((r) => r.complianceStatus === statusFilter);
    if (smfFilter) filtered = filtered.filter((r) => r.primarySMF === smfFilter || r.secondarySMF === smfFilter);
    if (domainFilter) filtered = filtered.filter((r) => r.regulatoryBody === domainFilter);
    if (gapsOnly) filtered = filtered.filter((r) => r.complianceStatus === "NON_COMPLIANT" || r.complianceStatus === "GAP_IDENTIFIED" || r.complianceStatus === "NOT_ASSESSED");
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.reference.toLowerCase().includes(s) ||
          r.shortName?.toLowerCase().includes(s) ||
          r.description?.toLowerCase().includes(s)
      );
    }
    // If filtering, ensure parent nodes are included
    const ids = new Set(filtered.map((r) => r.id));
    for (const r of filtered) {
      if (r.parentId && !ids.has(r.parentId)) {
        const parent = regulations.find((p) => p.id === r.parentId);
        if (parent) ids.add(parent.id);
      }
    }
    return regulations.filter((r) => ids.has(r.id));
  }, [regulations, search, statusFilter, smfFilter, domainFilter, applicableOnly, gapsOnly]);

  const topLevel = tree.filter((r) => !r.parentId);
  const childrenOf = (parentId: string) => tree.filter((r) => r.parentId === parentId);

  // Unique SMFs for filter
  const uniqueSMFs = useMemo(() => {
    const set = new Set<string>();
    for (const r of regulations) {
      if (r.primarySMF) set.add(r.primarySMF);
      if (r.secondarySMF) set.add(r.secondarySMF);
    }
    return Array.from(set).sort(naturalCompare);
  }, [regulations]);

  // Unique regulatory bodies for domain filter
  const uniqueRegulatoryBodies = useMemo(() => {
    const set = new Set<string>();
    for (const r of regulations) {
      if (r.regulatoryBody) set.add(r.regulatoryBody);
    }
    return Array.from(set).sort(naturalCompare);
  }, [regulations]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(regulations.map((r) => r.id)));
  const collapseAll = () => setExpanded(new Set());

  const selectedReg = selectedId ? regulations.find((r) => r.id === selectedId) ?? null : null;

  // Build a quick parentRef lookup for CSV export
  const parentRefMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of regulations) map.set(r.id, r.reference);
    return map;
  }, [regulations]);

  function downloadCSV() {
    const headers = [
      "id", "reference", "parentReference", "level", "name", "shortName",
      "regulatoryBody", "type", "description", "provisions", "url",
      "applicability", "applicabilityNotes", "isApplicable", "isActive",
      "primarySMF", "secondarySMF", "smfNotes",
      "complianceStatus", "assessmentNotes",
    ];

    const escapeCSV = (val: string | null | undefined | boolean): string => {
      if (val === null || val === undefined) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    // Sort all regulations by natural reference order
    const sorted = [...regulations].sort((a, b) => naturalCompare(a.reference, b.reference));

    const rows = sorted.map((r) => [
      escapeCSV(r.id),
      escapeCSV(r.reference),
      escapeCSV(r.parentId ? parentRefMap.get(r.parentId) ?? "" : ""),
      escapeCSV(String(r.level)),
      escapeCSV(r.name),
      escapeCSV(r.shortName),
      escapeCSV(r.regulatoryBody),
      escapeCSV(r.type),
      escapeCSV(r.description),
      escapeCSV(r.provisions),
      escapeCSV(r.url),
      escapeCSV(r.applicability),
      escapeCSV(r.applicabilityNotes),
      escapeCSV(r.isApplicable),
      escapeCSV(r.isActive),
      escapeCSV(r.primarySMF),
      escapeCSV(r.secondarySMF),
      escapeCSV(r.smfNotes),
      escapeCSV(r.complianceStatus),
      escapeCSV(r.assessmentNotes),
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `regulatory-universe-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleCSVImported() {
    // Re-hydrate regulations from API
    const { hydrate } = useAppStore.getState();
    hydrate();
  }

  return (
    <div className="flex gap-6">
      {/* Main table area */}
      <div className={cn("min-w-0 flex-1", selectedReg && "max-w-[60%]")}>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search regulations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-updraft-bright-purple/30 focus:border-updraft-bright-purple"
              aria-label="Search regulations"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ComplianceStatus | "")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2"
            aria-label="Filter by compliance status"
          >
            <option value="">All Statuses</option>
            {(Object.entries(COMPLIANCE_STATUS_LABELS) as [ComplianceStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={smfFilter}
            onChange={(e) => setSmfFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2"
            aria-label="Filter by SMF"
          >
            <option value="">All SMFs</option>
            {uniqueSMFs.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2"
            aria-label="Filter by regulatory body"
          >
            <option value="">All Bodies</option>
            {uniqueRegulatoryBodies.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={applicableOnly} onChange={(e) => setApplicableOnly(e.target.checked)} className="rounded text-updraft-bright-purple" />
            Applicable only
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={gapsOnly} onChange={(e) => setGapsOnly(e.target.checked)} className="rounded text-updraft-bright-purple" />
            Gaps only
          </label>
          <button onClick={expandAll} className="text-xs text-updraft-bright-purple hover:underline">Expand all</button>
          <button onClick={collapseAll} className="text-xs text-gray-500 hover:underline">Collapse all</button>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={downloadCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={13} />
              Download CSV
            </button>
            {canEditCompliance ? (
              <button
                onClick={() => setCsvDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-updraft-deep transition-colors"
              >
                <Upload size={13} />
                Upload CSV
              </button>
            ) : (
              <RequestEditAccessButton permission="edit:compliance" />
            )}
          </div>
        </div>

        {/* Count */}
        <p className="text-xs text-gray-400 mb-2">{tree.length} of {regulations.length} regulations shown</p>

        {/* Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 font-medium text-gray-600 w-[30%]">Reference / Name</th>
                <th className="px-3 py-2 font-medium text-gray-600">Applicability</th>
                <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                <th className="px-3 py-2 font-medium text-gray-600">SMF</th>
                <th className="px-3 py-2 font-medium text-gray-600 text-center">Policies</th>
                <th className="px-3 py-2 font-medium text-gray-600 text-center">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topLevel.map((reg) => (
                <RegulationRow
                  key={reg.id}
                  reg={reg}
                  depth={0}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  childrenOf={childrenOf}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  allPolicies={policies}
                  allControls={controls}
                />
              ))}
              {topLevel.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">No regulations match your filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedId && (
        <RegulationDetailPanel
          regulation={detailReg ?? (regulations.find((r) => r.id === selectedId) ?? null)}
          loading={detailLoading}
          onClose={() => setSelectedId(null)}
          onRefresh={() => loadDetail(selectedId)}
        />
      )}

      {/* CSV Import Dialog */}
      <RegulationCSVDialog
        open={csvDialogOpen}
        onClose={() => setCsvDialogOpen(false)}
        regulations={regulations}
        onImported={handleCSVImported}
      />
    </div>
  );
}

// ── Tree Row ────────────────────────────────────────────────────

function RegulationRow({
  reg,
  depth,
  expanded,
  toggleExpand,
  childrenOf,
  selectedId,
  onSelect,
  allPolicies,
  allControls,
}: {
  reg: Regulation;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  childrenOf: (parentId: string) => Regulation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  allPolicies: Policy[];
  allControls: ControlRecord[];
}) {
  const children = childrenOf(reg.id);
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(reg.id);
  const isSelected = reg.id === selectedId;
  const status = (reg.complianceStatus ?? "NOT_ASSESSED") as ComplianceStatus;
  const applicability = (reg.applicability ?? "ASSESS") as Applicability;
  const statusColours = COMPLIANCE_STATUS_COLOURS[status];
  const appColours = APPLICABILITY_COLOURS[applicability];
  const policyCount = reg.policyLinks?.length ?? 0;
  const controlCount = reg.controlLinks?.length ?? 0;

  // Compute failing indicators
  const failingPolicies = (reg.policyLinks ?? []).filter((pl) => {
    const policy = allPolicies.find((p) => p.id === pl.policyId);
    return policy?.status === "OVERDUE" || policy?.status === "ARCHIVED";
  }).length;
  const failingControls = (reg.controlLinks ?? []).filter((cl) => {
    const ctrl = allControls.find((c) => c.id === cl.controlId);
    if (!ctrl) return false;
    if (ctrl.approvalStatus === "REJECTED") return true;
    const results = ctrl.testingSchedule?.testResults ?? [];
    if (results.length === 0) return false;
    const latest = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime())[0];
    return latest.result === "FAIL";
  }).length;

  return (
    <>
      <tr
        className={cn(
          "hover:bg-gray-50 cursor-pointer transition-colors",
          isSelected && "bg-updraft-pale-purple/20"
        )}
        onClick={() => onSelect(reg.id)}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpand(reg.id); }}
                className="p-0.5 hover:bg-gray-200 rounded shrink-0"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <div className="min-w-0">
              <span className="text-xs font-mono text-gray-400 mr-1.5">{reg.reference}</span>
              <span className={cn("text-sm", depth === 0 ? "font-semibold text-updraft-deep" : "text-gray-700")}>
                {reg.shortName || reg.name}
              </span>
            </div>
          </div>
        </td>
        <td className="px-3 py-2">
          <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold", appColours.bg, appColours.text)}>
            {APPLICABILITY_LABELS[applicability]}
          </span>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full shrink-0", statusColours.dot)} />
            <span className="text-xs text-gray-600">{COMPLIANCE_STATUS_LABELS[status]}</span>
          </div>
        </td>
        <td className="px-3 py-2">
          {reg.primarySMF && (
            <span className="text-xs font-medium text-gray-600">{reg.primarySMF}</span>
          )}
        </td>
        <td className="px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <span className={cn("text-xs", policyCount > 0 ? "text-gray-700 font-medium" : "text-gray-300")}>{policyCount}</span>
            {failingPolicies > 0 && (
              <span title={`${failingPolicies} policy overdue`}>
                <AlertTriangle size={11} className="text-amber-500" />
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <span className={cn("text-xs", controlCount > 0 ? "text-gray-700 font-medium" : "text-gray-300")}>{controlCount}</span>
            {failingControls > 0 && (
              <span title={`${failingControls} control failing`}>
                <AlertTriangle size={11} className="text-red-500" />
              </span>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && children.map((child) => (
        <RegulationRow
          key={child.id}
          reg={child}
          depth={depth + 1}
          expanded={expanded}
          toggleExpand={toggleExpand}
          childrenOf={childrenOf}
          selectedId={selectedId}
          onSelect={onSelect}
          allPolicies={allPolicies}
          allControls={allControls}
        />
      ))}
    </>
  );
}
