"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLOURS,
  POLICY_STATUS_LABELS,
  POLICY_STATUS_COLOURS,
  type Regulation,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Scale,
  BookOpen,
  FlaskConical,
  Search,
  X,
  LayoutGrid,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
} from "lucide-react";

type ViewMode = "chain" | "matrix";

function ComplianceDot({ status }: { status: string }) {
  const cfg = COMPLIANCE_STATUS_COLOURS[status as keyof typeof COMPLIANCE_STATUS_COLOURS];
  if (!cfg) return null;
  return <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} title={COMPLIANCE_STATUS_LABELS[status as keyof typeof COMPLIANCE_STATUS_LABELS]} />;
}

// ─── Chain View ────────────────────────────────────────────────────────────
function ChainView() {
  const regulations = useAppStore((s) => s.regulations);
  const policies = useAppStore((s) => s.policies);
  const controls = useAppStore((s) => s.controls);
  const [search, setSearch] = useState("");
  const [expandedRegs, setExpandedRegs] = useState<Set<string>>(new Set());
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
  const [gapsOnly, setGapsOnly] = useState(false);

  const applicable = useMemo(() => {
    let regs = regulations.filter((r) => r.isApplicable && r.isActive);
    if (gapsOnly) regs = regs.filter((r) => (r.policyLinks ?? []).length === 0 || (r.controlLinks ?? []).length === 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      regs = regs.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        (r.shortName ?? "").toLowerCase().includes(q)
      );
    }
    // Sort by reference
    return [...regs].sort((a, b) => a.reference.localeCompare(b.reference));
  }, [regulations, search, gapsOnly]);

  function toggleReg(id: string) {
    setExpandedRegs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function togglePolicy(id: string) {
    setExpandedPolicies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedRegs(new Set(applicable.map((r) => r.id)));
  }

  function collapseAll() {
    setExpandedRegs(new Set());
    setExpandedPolicies(new Set());
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter regulations…"
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
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={gapsOnly}
            onChange={(e) => setGapsOnly(e.target.checked)}
            className="rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bright-purple/30"
          />
          Coverage gaps only
        </label>
        <button type="button" onClick={expandAll} className="text-xs text-gray-500 hover:text-gray-700 underline">Expand all</button>
        <button type="button" onClick={collapseAll} className="text-xs text-gray-500 hover:text-gray-700 underline">Collapse all</button>
        <span className="ml-auto text-xs text-gray-400">{applicable.length} regulation{applicable.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Chain */}
      {applicable.length === 0 ? (
        <div className="py-12 text-center">
          <Scale size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No applicable regulations match your filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {applicable.map((reg) => {
            const isExpanded = expandedRegs.has(reg.id);
            const linkedPolicies = (reg.policyLinks ?? [])
              .map((pl) => policies.find((p) => p.id === pl.policyId))
              .filter(Boolean);
            const directControls = (reg.controlLinks ?? [])
              .map((cl) => controls.find((c) => c.id === cl.controlId))
              .filter(Boolean);
            const hasLinks = linkedPolicies.length > 0 || directControls.length > 0;
            const cfg = COMPLIANCE_STATUS_COLOURS[reg.complianceStatus];

            return (
              <div key={reg.id} className="rounded-xl border border-gray-200 overflow-hidden">
                {/* Regulation header */}
                <button
                  type="button"
                  onClick={() => toggleReg(reg.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} className="shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="shrink-0 text-gray-400" />
                  )}
                  <Scale size={16} className="shrink-0 text-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{reg.reference}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">{reg.name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span>{linkedPolicies.length} polic{linkedPolicies.length !== 1 ? "ies" : "y"}</span>
                      <span>·</span>
                      <span>{directControls.length} direct control{directControls.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!hasLinks && (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        <AlertCircle size={10} /> No coverage
                      </span>
                    )}
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", cfg?.bg, cfg?.text)}>
                      {COMPLIANCE_STATUS_LABELS[reg.complianceStatus] ?? reg.complianceStatus}
                    </span>
                  </div>
                </button>

                {/* Expanded: Policies + Controls */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-3">
                    {/* Linked Policies */}
                    {linkedPolicies.length > 0 && (
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          <BookOpen size={11} /> Policies ({linkedPolicies.length})
                        </p>
                        <div className="space-y-1.5 pl-2 border-l-2 border-blue-200">
                          {linkedPolicies.map((policy) => {
                            if (!policy) return null;
                            const pExpanded = expandedPolicies.has(policy.id);
                            const policyControls = (policy.controlLinks ?? [])
                              .map((cl) => controls.find((c) => c.id === cl.controlId))
                              .filter(Boolean);
                            const pcfg = POLICY_STATUS_COLOURS[policy.status];
                            return (
                              <div key={policy.id} className="rounded-lg border border-blue-100 bg-white overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => togglePolicy(policy.id)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50/50 transition-colors text-left"
                                >
                                  {pExpanded ? <ChevronDown size={13} className="shrink-0 text-gray-400" /> : <ChevronRight size={13} className="shrink-0 text-gray-400" />}
                                  <BookOpen size={13} className="shrink-0 text-blue-500" />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium text-gray-800 truncate">{policy.name}</span>
                                    <span className="ml-2 text-[10px] text-gray-400">{policy.reference}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-gray-400">{policyControls.length} control{policyControls.length !== 1 ? "s" : ""}</span>
                                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", pcfg.bg, pcfg.text)}>
                                      {POLICY_STATUS_LABELS[policy.status]}
                                    </span>
                                  </div>
                                </button>
                                {pExpanded && policyControls.length > 0 && (
                                  <div className="border-t border-blue-100 bg-blue-50/30 px-3 py-2.5 pl-6 border-l-2 border-l-purple-200 ml-3">
                                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                      <FlaskConical size={10} /> Controls ({policyControls.length})
                                    </p>
                                    <div className="space-y-1">
                                      {policyControls.map((ctrl) => {
                                        if (!ctrl) return null;
                                        const passing = (ctrl.attestations ?? []).length === 0
                                          ? null
                                          : (ctrl.attestations ?? []).sort((a, b) => b.attestedAt.localeCompare(a.attestedAt))[0] != null && !(ctrl.attestations ?? []).sort((a, b) => b.attestedAt.localeCompare(a.attestedAt))[0].issuesFlagged;
                                        return (
                                          <div key={ctrl.id} className="flex items-center gap-2 rounded px-2.5 py-1.5 bg-white border border-purple-100 text-xs">
                                            <FlaskConical size={12} className="shrink-0 text-purple-500" />
                                            <span className="font-mono text-[10px] text-gray-400">{ctrl.controlRef}</span>
                                            <span className="flex-1 truncate text-gray-700">{ctrl.controlName}</span>
                                            {passing === true && <CheckCircle2 size={13} className="text-green-500 shrink-0"/>  /* PASS */}
                                            {passing === false && <AlertCircle size={13} className="text-red-500 shrink-0"/> /* FAIL */}
                                            {passing === null && <MinusCircle size={13} className="text-gray-300 shrink-0"/> /* not tested */}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {pExpanded && policyControls.length === 0 && (
                                  <div className="border-t border-blue-100 px-3 py-2 ml-3 text-[11px] text-gray-400 italic">
                                    No controls linked to this policy
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Direct regulation → control links */}
                    {directControls.length > 0 && (
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          <FlaskConical size={11} /> Direct Controls ({directControls.length})
                        </p>
                        <div className="space-y-1 pl-2 border-l-2 border-purple-200">
                          {directControls.map((ctrl) => {
                            if (!ctrl) return null;
                            const passing = (ctrl.attestations ?? []).length === 0
                              ? null
                              : (ctrl.attestations ?? []).sort((a, b) => b.attestedAt.localeCompare(a.attestedAt))[0] != null && !(ctrl.attestations ?? []).sort((a, b) => b.attestedAt.localeCompare(a.attestedAt))[0].issuesFlagged;
                            return (
                              <div key={ctrl.id} className="flex items-center gap-2 rounded-lg border border-purple-100 bg-white px-3 py-2 text-xs">
                                <FlaskConical size={13} className="shrink-0 text-purple-500" />
                                <span className="font-mono text-[10px] text-gray-400">{ctrl.controlRef}</span>
                                <span className="flex-1 truncate text-gray-700">{ctrl.controlName}</span>
                                {passing === true && <CheckCircle2 size={13} className="text-green-500 shrink-0"/>  /* PASS */}
                                {passing === false && <AlertCircle size={13} className="text-red-500 shrink-0"/> /* FAIL */}
                                {passing === null && <MinusCircle size={13} className="text-gray-300 shrink-0"/> /* not tested */}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* No coverage */}
                    {linkedPolicies.length === 0 && directControls.length === 0 && (
                      <div className="py-3 flex items-center gap-2 text-sm text-gray-400">
                        <AlertCircle size={16} className="text-red-400" />
                        No policies or controls linked — coverage gap
                      </div>
                    )}
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

// ─── Matrix View ────────────────────────────────────────────────────────────
function MatrixView() {
  const regulations = useAppStore((s) => s.regulations);
  const policies = useAppStore((s) => s.policies);
  const controls = useAppStore((s) => s.controls);
  const [search, setSearch] = useState("");

  const applicableRegs = useMemo(() => {
    let regs = regulations.filter((r) => r.isApplicable && r.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      regs = regs.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        (r.shortName ?? "").toLowerCase().includes(q)
      );
    }
    return [...regs].sort((a, b) => a.reference.localeCompare(b.reference));
  }, [regulations, search]);

  // Collect policies that are linked to at least one applicable regulation
  const relevantPolicies = useMemo(() => {
    const ids = new Set<string>();
    for (const reg of applicableRegs) {
      for (const pl of reg.policyLinks ?? []) ids.add(pl.policyId);
    }
    return policies.filter((p) => ids.has(p.id)).sort((a, b) => a.reference.localeCompare(b.reference));
  }, [applicableRegs, policies]);

  // Collect controls that are directly linked to at least one applicable regulation
  const relevantControls = useMemo(() => {
    const ids = new Set<string>();
    for (const reg of applicableRegs) {
      for (const cl of reg.controlLinks ?? []) ids.add(cl.controlId);
    }
    return controls.filter((c) => ids.has(c.id)).sort((a, b) => a.controlRef.localeCompare(b.controlRef));
  }, [applicableRegs, controls]);

  // Build lookup sets: reg×policy and reg×control
  const regPolicySet = useMemo(() => {
    const s = new Set<string>();
    for (const reg of applicableRegs) {
      for (const pl of reg.policyLinks ?? []) s.add(`${reg.id}::${pl.policyId}`);
    }
    return s;
  }, [applicableRegs]);

  const regControlSet = useMemo(() => {
    const s = new Set<string>();
    for (const reg of applicableRegs) {
      for (const cl of reg.controlLinks ?? []) s.add(`${reg.id}::${cl.controlId}`);
    }
    return s;
  }, [applicableRegs]);

  const totalCols = relevantPolicies.length + relevantControls.length;

  if (totalCols === 0) {
    return (
      <div className="py-12 text-center">
        <LayoutGrid size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-500">No policy or control links found for applicable regulations.</p>
        <p className="text-xs text-gray-400 mt-1">Link policies and controls to regulations via the Regulatory Universe tab.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter regulations…"
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
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-100 border border-green-300 inline-block" /> Linked</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-gray-50 border border-gray-200 inline-block" /> Not linked</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="text-xs border-collapse w-full min-w-max">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap min-w-[200px]">
                Regulation
              </th>
              {relevantPolicies.length > 0 && (
                <th
                  colSpan={relevantPolicies.length}
                  className="border-b border-r border-gray-200 bg-blue-50 px-2 py-1.5 text-center font-semibold text-blue-700"
                >
                  <span className="flex items-center justify-center gap-1"><BookOpen size={11} /> Policies</span>
                </th>
              )}
              {relevantControls.length > 0 && (
                <th
                  colSpan={relevantControls.length}
                  className="border-b border-gray-200 bg-purple-50 px-2 py-1.5 text-center font-semibold text-purple-700"
                >
                  <span className="flex items-center justify-center gap-1"><FlaskConical size={11} /> Direct Controls</span>
                </th>
              )}
            </tr>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left" />
              {relevantPolicies.map((p) => (
                <th key={p.id} className="border-b border-r border-gray-200 px-1 py-2 bg-blue-50/60">
                  <div className="flex flex-col items-center gap-0.5 w-16">
                    <span className="font-mono text-[9px] text-gray-400">{p.reference}</span>
                    <span
                      className="text-[9px] font-medium text-gray-700 leading-tight text-center"
                      title={p.name}
                    >
                      {p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name}
                    </span>
                  </div>
                </th>
              ))}
              {relevantControls.map((c) => (
                <th key={c.id} className="border-b border-r border-gray-200 px-1 py-2 bg-purple-50/60">
                  <div className="flex flex-col items-center gap-0.5 w-16">
                    <span className="font-mono text-[9px] text-gray-400">{c.controlRef}</span>
                    <span
                      className="text-[9px] font-medium text-gray-700 leading-tight text-center"
                      title={c.controlName}
                    >
                      {c.controlName.length > 20 ? c.controlName.slice(0, 20) + "…" : c.controlName}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {applicableRegs.map((reg, ri) => {
              const cfg = COMPLIANCE_STATUS_COLOURS[reg.complianceStatus];
              return (
                <tr key={reg.id} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="sticky left-0 z-10 border-b border-r border-gray-200 px-3 py-2 bg-inherit min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <ComplianceDot status={reg.complianceStatus} />
                      <div>
                        <p className="font-medium text-gray-800 text-[11px]">{reg.reference}</p>
                        <p className="text-gray-500 text-[10px] leading-tight" title={reg.name}>
                          {reg.name.length > 35 ? reg.name.slice(0, 35) + "…" : reg.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  {relevantPolicies.map((p) => {
                    const linked = regPolicySet.has(`${reg.id}::${p.id}`);
                    return (
                      <td
                        key={p.id}
                        className={cn(
                          "border-b border-r border-gray-200 text-center px-1 py-2",
                          linked ? "bg-green-50" : ""
                        )}
                      >
                        {linked ? (
                          <CheckCircle2 size={14} className="mx-auto text-green-600" />
                        ) : (
                          <span className="text-gray-200">–</span>
                        )}
                      </td>
                    );
                  })}
                  {relevantControls.map((c) => {
                    const linked = regControlSet.has(`${reg.id}::${c.id}`);
                    return (
                      <td
                        key={c.id}
                        className={cn(
                          "border-b border-r border-gray-200 text-center px-1 py-2",
                          linked ? "bg-green-50" : ""
                        )}
                      >
                        {linked ? (
                          <CheckCircle2 size={14} className="mx-auto text-green-600" />
                        ) : (
                          <span className="text-gray-200">–</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-gray-400">
        {applicableRegs.length} regulations · {relevantPolicies.length} linked policies · {relevantControls.length} direct controls
      </p>
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────
export default function CoverageChainTab() {
  const [mode, setMode] = useState<ViewMode>("chain");

  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Coverage Chain</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Trace the chain from each regulation through to the policies and controls that address it.
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("chain")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
              mode === "chain" ? "bg-updraft-bright-purple text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <GitBranch size={13} /> Chain
          </button>
          <button
            type="button"
            onClick={() => setMode("matrix")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-l border-gray-200",
              mode === "matrix" ? "bg-updraft-bright-purple text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <LayoutGrid size={13} /> Matrix
          </button>
        </div>
      </div>

      {mode === "chain" ? <ChainView /> : <MatrixView />}
    </div>
  );
}
