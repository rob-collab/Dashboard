"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Scale,
  Shield,
  ExternalLink,
  BookOpen,
  FileUp,
  Layers,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Policy, PolicyObligation, PolicyObligationSection, Regulation, ControlRecord } from "@/lib/types";
import {
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLOURS,
  type ComplianceStatus,
} from "@/lib/types";
import { cn, formatDateShort } from "@/lib/utils";
import EntityLink from "@/components/common/EntityLink";
import ObligationFormDialog from "./ObligationFormDialog";
import RequirementsCSVUploadDialog from "./RequirementsCSVUploadDialog";

const CATEGORY_COLOURS: string[] = [
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-green-500",
  "border-l-amber-500",
  "border-l-red-500",
  "border-l-teal-500",
  "border-l-indigo-500",
  "border-l-rose-500",
];

const CATEGORY_BG: string[] = [
  "bg-blue-50",
  "bg-purple-50",
  "bg-green-50",
  "bg-amber-50",
  "bg-red-50",
  "bg-teal-50",
  "bg-indigo-50",
  "bg-rose-50",
];

interface Props {
  policy: Policy;
  onUpdate: (policy: Policy) => void;
}

// ── Effectiveness helper ──────────────────────────────────
type EffectivenessRating = "Effective" | "Mostly Effective" | "Partially Effective" | "Ineffective" | "Not Assessed";

const EFFECTIVENESS_STYLES: Record<EffectivenessRating, { bg: string; text: string; dot: string }> = {
  "Effective": { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  "Mostly Effective": { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Partially Effective": { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  "Ineffective": { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  "Not Assessed": { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
};

function calcEffectiveness(ctrl: ControlRecord): EffectivenessRating {
  const results = ctrl.testingSchedule?.testResults ?? [];
  if (results.length === 0) return "Not Assessed";
  const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
  const latest = sorted[0].result;
  if (latest === "FAIL") return "Ineffective";
  if (latest === "PARTIALLY") return "Partially Effective";
  if (latest === "PASS") {
    const hasPastFails = sorted.slice(1).some((r) => r.result === "FAIL");
    return hasPastFails ? "Mostly Effective" : "Effective";
  }
  return "Not Assessed";
}

function ragDot(result: string): string {
  if (result === "PASS") return "bg-green-500";
  if (result === "FAIL") return "bg-red-500";
  if (result === "PARTIALLY") return "bg-amber-500";
  return "bg-gray-400";
}

// ── Reusable sub-components ─────────────────────────────

function RegulationsList({ refs, regByRef }: { refs: string[]; regByRef: Map<string, Regulation> }) {
  const resolved = refs.map((ref) => regByRef.get(ref)).filter((r): r is Regulation => !!r);
  if (resolved.length > 0) {
    return (
      <div className="space-y-1.5">
        {resolved.map((reg) => {
          const status = (reg.complianceStatus ?? "NOT_ASSESSED") as ComplianceStatus;
          const statusStyle = COMPLIANCE_STATUS_COLOURS[status];
          return (
            <div key={reg.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
              <div className={cn("w-2 h-2 rounded-full shrink-0", statusStyle.dot)} />
              <EntityLink type="regulation" id={reg.id} reference={reg.reference} label={reg.shortName ?? reg.name} />
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", statusStyle.bg, statusStyle.text)}>
                {COMPLIANCE_STATUS_LABELS[status]}
              </span>
              {reg.url && (
                <a href={reg.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-updraft-bright-purple">
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  if (refs.length > 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {refs.map((ref) => (
          <span key={ref} className="rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-[10px] font-medium border border-blue-100">{ref}</span>
        ))}
      </div>
    );
  }
  return <p className="text-xs text-gray-400 italic">No regulations linked</p>;
}

function ControlsList({ refs, ctrlByRef }: { refs: string[]; ctrlByRef: Map<string, ControlRecord> }) {
  const resolved = refs.map((ref) => ctrlByRef.get(ref)).filter((c): c is ControlRecord => !!c);
  if (resolved.length > 0) {
    return (
      <div className="space-y-1.5">
        {resolved.map((ctrl) => {
          const effectiveness = calcEffectiveness(ctrl);
          const effStyle = EFFECTIVENESS_STYLES[effectiveness];
          const results = ctrl.testingSchedule?.testResults ?? [];
          const latestResult = results.length > 0
            ? [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime())[0]
            : null;

          return (
            <div key={ctrl.id} className="rounded-lg border border-gray-100 bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full shrink-0", effStyle.dot)} />
                <EntityLink type="control" id={ctrl.id} reference={ctrl.controlRef} label={ctrl.controlName} />
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0", effStyle.bg, effStyle.text)}>
                  {effectiveness}
                </span>
              </div>
              {latestResult && (
                <div className="flex items-center gap-2 mt-1.5 pl-4">
                  <span className={cn("w-1.5 h-1.5 rounded-full", ragDot(latestResult.result))} />
                  <span className="text-[10px] text-gray-500">
                    Latest test: <span className="font-medium">{latestResult.result}</span>
                    {" on "}
                    {formatDateShort(latestResult.testedDate)}
                  </span>
                  {latestResult.notes && (
                    <span className="text-[10px] text-gray-400 truncate max-w-[200px]">— {latestResult.notes}</span>
                  )}
                </div>
              )}
              {!latestResult && (
                <p className="text-[10px] text-gray-400 mt-1 pl-4 italic">No test results recorded</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  if (refs.length > 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {refs.map((ref) => (
          <span key={ref} className="rounded-full bg-purple-50 text-purple-600 px-2 py-0.5 text-[10px] font-medium border border-purple-100">{ref}</span>
        ))}
      </div>
    );
  }
  return <p className="text-xs text-gray-400 italic">No controls linked</p>;
}

// ── Main Component ───────────────────────────────────────

export default function PolicyObligationsTab({ policy, onUpdate }: Props) {
  const currentUser = useAppStore((s) => s.currentUser);
  const regulations = useAppStore((s) => s.regulations);
  const controls = useAppStore((s) => s.controls);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editObl, setEditObl] = useState<PolicyObligation | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedObls, setExpandedObls] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Lookup maps for resolving refs → objects
  const regByRef = useMemo(() => {
    const map = new Map<string, Regulation>();
    for (const r of regulations) map.set(r.reference, r);
    return map;
  }, [regulations]);

  const ctrlByRef = useMemo(() => {
    const map = new Map<string, ControlRecord>();
    for (const c of controls) map.set(c.controlRef, c);
    return map;
  }, [controls]);

  // Group by category
  const obligations = useMemo(() => policy.obligations ?? [], [policy.obligations]);
  const grouped = useMemo(() => {
    const map = new Map<string, PolicyObligation[]>();
    for (const obl of obligations) {
      const cat = obl.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(obl);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [obligations]);

  // Coverage stats
  const coverageStats = useMemo(() => {
    let withControls = 0;
    let withoutControls = 0;
    let withRegs = 0;
    let withSections = 0;
    for (const obl of obligations) {
      if (obl.controlRefs.length > 0) withControls++;
      else withoutControls++;
      if (obl.regulationRefs.length > 0) withRegs++;
      if (obl.sections && obl.sections.length > 0) withSections++;
    }
    return { withControls, withoutControls, withRegs, withSections, total: obligations.length };
  }, [obligations]);

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function toggleObl(id: string) {
    setExpandedObls((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave(data: Omit<PolicyObligation, "id" | "reference" | "policyId" | "createdAt" | "updatedAt">) {
    try {
      if (editObl) {
        const updated = await api<PolicyObligation>(`/api/policies/${policy.id}/obligations/${editObl.id}`, {
          method: "PATCH",
          body: data,
        });
        onUpdate({
          ...policy,
          obligations: obligations.map((o) => (o.id === editObl.id ? { ...o, ...updated } : o)),
        });
        toast.success("Requirement updated");
      } else {
        const created = await api<PolicyObligation>(`/api/policies/${policy.id}/obligations`, {
          method: "POST",
          body: data,
        });
        onUpdate({
          ...policy,
          obligations: [...obligations, created],
        });
        toast.success("Requirement added");
      }
    } catch {
      toast.error("Failed to save requirement");
    }
    setEditObl(null);
  }

  async function handleDelete(oblId: string) {
    try {
      await api(`/api/policies/${policy.id}/obligations/${oblId}`, { method: "DELETE" });
      onUpdate({
        ...policy,
        obligations: obligations.filter((o) => o.id !== oblId),
      });
      toast.success("Requirement removed");
    } catch {
      toast.error("Failed to delete requirement");
    }
  }

  async function handleImported() {
    try {
      const fresh = await api<Policy>(`/api/policies/${policy.id}`);
      onUpdate(fresh);
    } catch {
      toast.error("Failed to refresh after import");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">
            {obligations.length} requirement{obligations.length !== 1 ? "s" : ""} across {grouped.length} categor{grouped.length !== 1 ? "ies" : "y"}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] text-green-600">
              <CheckCircle2 size={10} />
              {coverageStats.withControls} with controls
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600">
              <Scale size={10} />
              {coverageStats.withRegs} with regulations
            </span>
            {coverageStats.withSections > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-purple-600">
                <Layers size={10} />
                {coverageStats.withSections} with sections
              </span>
            )}
            {coverageStats.withoutControls > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                <AlertCircle size={10} />
                {coverageStats.withoutControls} without controls
              </span>
            )}
          </div>
        </div>
        {isCCRO && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <FileUp size={12} /> Upload CSV
            </button>
            <button
              onClick={() => { setEditObl(null); setShowForm(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-deep text-white px-3 py-1.5 text-xs font-medium hover:bg-updraft-bar transition-colors"
            >
              <Plus size={12} /> Add Requirement
            </button>
          </div>
        )}
      </div>

      {/* Grouped List — Level 1: Categories */}
      {grouped.length === 0 ? (
        <div className="text-center py-10">
          <BookOpen size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">No requirements added yet</p>
          <p className="text-xs text-gray-400 mt-1">Use the CSV template to bulk-import, or add requirements manually</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(([category, obls], catIndex) => {
            const isExpanded = expandedCategories.has(category);
            const borderColour = CATEGORY_COLOURS[catIndex % CATEGORY_COLOURS.length];
            const headerBg = CATEGORY_BG[catIndex % CATEGORY_BG.length];
            const categoryControlled = obls.filter((o) => o.controlRefs.length > 0).length;

            return (
              <div key={category} className={cn("rounded-xl border border-gray-200 bg-white overflow-hidden border-l-4", borderColour)}>
                <button
                  onClick={() => toggleCategory(category)}
                  className={cn("flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors", isExpanded && headerBg)}
                >
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  <span className="text-sm font-semibold text-gray-800">{category}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {categoryControlled === obls.length ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600">
                        <CheckCircle2 size={10} /> all mapped
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                        {categoryControlled}/{obls.length} mapped
                      </span>
                    )}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{obls.length}</span>
                  </span>
                </button>

                {/* Level 2: Requirements */}
                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {obls.map((obl) => {
                      const hasControls = obl.controlRefs.length > 0;
                      const hasRegs = obl.regulationRefs.length > 0;
                      const isOblExpanded = expandedObls.has(obl.id);
                      const sections: PolicyObligationSection[] = obl.sections ?? [];
                      const hasSections = sections.length > 0;

                      return (
                        <div key={obl.id} className="group">
                          {/* Requirement summary row */}
                          <div
                            className={cn(
                              "px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors",
                              isOblExpanded && "bg-gray-50/60"
                            )}
                            onClick={() => toggleObl(obl.id)}
                          >
                            <div className="flex items-start gap-2">
                              <button className="mt-0.5 shrink-0 p-0.5 rounded hover:bg-gray-200">
                                {isOblExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                              </button>
                              <span
                                className={cn(
                                  "mt-1.5 w-2 h-2 rounded-full shrink-0",
                                  hasControls && hasRegs ? "bg-green-500" : hasControls || hasRegs ? "bg-amber-400" : "bg-red-400"
                                )}
                              />
                              <span className="font-mono text-[10px] font-bold text-updraft-deep mt-0.5 shrink-0">{obl.reference}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 line-clamp-2">{obl.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {hasRegs && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600">
                                      <Scale size={9} /> {obl.regulationRefs.length} reg{obl.regulationRefs.length !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {hasControls && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-600">
                                      <Shield size={9} /> {obl.controlRefs.length} ctrl{obl.controlRefs.length !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {hasSections && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-teal-600">
                                      <Layers size={9} /> {sections.length} section{sections.length !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isCCRO && (
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditObl(obl); setShowForm(true); }}
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(obl.id); }}
                                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Expanded Level 2: Requirement details ── */}
                          {isOblExpanded && (
                            <div className="px-4 pb-4 pt-1 pl-12 animate-fade-in space-y-3">
                              {/* Notes */}
                              {obl.notes && (
                                <div className="rounded-lg bg-gray-50 p-3">
                                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">Notes</p>
                                  <p className="text-xs text-gray-600">{obl.notes}</p>
                                </div>
                              )}

                              {/* ── Level 3: Sections ── */}
                              {hasSections ? (
                                <div className="space-y-2">
                                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium flex items-center gap-1">
                                    <Layers size={10} />
                                    Policy Sections ({sections.length})
                                  </p>
                                  {sections.map((section, sIdx) => {
                                    const sKey = `${obl.id}-s-${sIdx}`;
                                    const isSectionExpanded = expandedSections.has(sKey);

                                    return (
                                      <div key={sKey} className="rounded-lg border border-gray-100 bg-white overflow-hidden">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleSection(sKey); }}
                                          className={cn(
                                            "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors",
                                            isSectionExpanded && "bg-gray-50"
                                          )}
                                        >
                                          {isSectionExpanded ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                                          <span className="text-xs font-medium text-gray-700">{section.name}</span>
                                          <span className="ml-auto flex items-center gap-1.5">
                                            {section.regulationRefs.length > 0 && (
                                              <span className="text-[10px] text-blue-500">{section.regulationRefs.length} reg{section.regulationRefs.length !== 1 ? "s" : ""}</span>
                                            )}
                                            {section.controlRefs.length > 0 && (
                                              <span className="text-[10px] text-purple-500">{section.controlRefs.length} ctrl{section.controlRefs.length !== 1 ? "s" : ""}</span>
                                            )}
                                          </span>
                                        </button>

                                        {/* Expanded section → linked regs + controls */}
                                        {isSectionExpanded && (
                                          <div className="px-3 pb-3 pt-1 pl-8 space-y-3 border-t border-gray-50">
                                            {/* Section Regulations */}
                                            <div>
                                              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5 flex items-center gap-1">
                                                <Scale size={9} />
                                                Regulations ({section.regulationRefs.length})
                                              </p>
                                              <RegulationsList refs={section.regulationRefs} regByRef={regByRef} />
                                            </div>
                                            {/* Section Controls */}
                                            <div>
                                              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5 flex items-center gap-1">
                                                <Shield size={9} />
                                                Controls ({section.controlRefs.length})
                                              </p>
                                              <ControlsList refs={section.controlRefs} ctrlByRef={ctrlByRef} />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Aggregate coverage summary */}
                                  <div className="rounded-lg bg-gradient-to-r from-gray-50 to-white p-2.5 border border-gray-100">
                                    <p className="text-[10px] font-medium text-gray-500">
                                      Aggregate: {obl.regulationRefs.length} regulation{obl.regulationRefs.length !== 1 ? "s" : ""}, {obl.controlRefs.length} control{obl.controlRefs.length !== 1 ? "s" : ""} across {sections.length} section{sections.length !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Fallback: flat reg/ctrl lists (no sections) */}
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-2 flex items-center gap-1">
                                      <Scale size={10} />
                                      Linked Regulations ({obl.regulationRefs.length})
                                    </p>
                                    <RegulationsList refs={obl.regulationRefs} regByRef={regByRef} />
                                  </div>

                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-2 flex items-center gap-1">
                                      <Shield size={10} />
                                      Linked Controls ({obl.controlRefs.length})
                                    </p>
                                    <ControlsList refs={obl.controlRefs} ctrlByRef={ctrlByRef} />
                                  </div>

                                  <div className="rounded-lg bg-gradient-to-r from-gray-50 to-white p-2.5 border border-gray-100">
                                    <p className="text-[10px] font-medium text-gray-500">
                                      Coverage: {obl.regulationRefs.length} regulation{obl.regulationRefs.length !== 1 ? "s" : ""}, {obl.controlRefs.length} control{obl.controlRefs.length !== 1 ? "s" : ""}
                                      {(() => {
                                        const resolvedCtrls = obl.controlRefs.map((ref) => ctrlByRef.get(ref)).filter((c): c is ControlRecord => !!c);
                                        if (resolvedCtrls.length > 0) {
                                          const effective = resolvedCtrls.filter((c) => {
                                            const e = calcEffectiveness(c);
                                            return e === "Effective" || e === "Mostly Effective";
                                          }).length;
                                          return (
                                            <span className={cn("ml-1", effective === resolvedCtrls.length ? "text-green-600" : "text-amber-600")}>
                                              ({effective}/{resolvedCtrls.length} effective)
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </p>
                                  </div>
                                </>
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
          })}
        </div>
      )}

      <ObligationFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditObl(null); }}
        onSave={handleSave}
        policy={policy}
        editObligation={editObl}
      />

      <RequirementsCSVUploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onImported={handleImported}
        policyId={policy.id}
        policyReference={policy.reference}
      />
    </div>
  );
}
