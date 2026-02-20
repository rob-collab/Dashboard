"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Link2, Search, Unlink, ShieldCheck, BookOpen } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Policy, PolicyControlLink, ControlRecord, TestResultValue, ControlTestResult } from "@/lib/types";
import { TEST_RESULT_COLOURS, TEST_RESULT_LABELS, CONTROL_FREQUENCY_LABELS } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import EntityLink from "@/components/common/EntityLink";

const DONUT_COLOURS: Record<string, string> = {
  Pass: "#22c55e",
  Fail: "#ef4444",
  Partial: "#f59e0b",
  "Not Tested": "#d1d5db",
};

type EffectivenessRating = "Effective" | "Mostly Effective" | "Partially Effective" | "Ineffective" | "Not Assessed";

const EFFECTIVENESS_STYLES: Record<EffectivenessRating, { bg: string; text: string }> = {
  "Effective":           { bg: "bg-green-100",  text: "text-green-700" },
  "Mostly Effective":    { bg: "bg-emerald-100", text: "text-emerald-700" },
  "Partially Effective": { bg: "bg-amber-100",  text: "text-amber-700" },
  "Ineffective":         { bg: "bg-red-100",    text: "text-red-700" },
  "Not Assessed":        { bg: "bg-gray-100",   text: "text-gray-500" },
};

function calcEffectiveness(ctrl: ControlRecord): EffectivenessRating {
  const results = ctrl.testingSchedule?.testResults;
  if (!results || results.length === 0) return "Not Assessed";
  const sorted = [...results].sort(
    (a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime(),
  );
  const latest = sorted[0].result;
  if (latest === "FAIL") return "Ineffective";
  if (latest === "PARTIALLY") return "Partially Effective";
  if (latest === "PASS") {
    const hasHistoricalFail = sorted.slice(1).some((r) => r.result === "FAIL");
    return hasHistoricalFail ? "Mostly Effective" : "Effective";
  }
  return "Not Assessed";
}

function getTestHistory(ctrl: ControlRecord, count = 3): ControlTestResult[] {
  const results = ctrl.testingSchedule?.testResults;
  if (!results || results.length === 0) return [];
  return [...results]
    .sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime())
    .slice(0, count);
}

interface Props {
  policy: Policy;
  onUpdate: (policy: Policy) => void;
}

export default function PolicyControlsTab({ policy, onUpdate }: Props) {
  const currentUser = useAppStore((s) => s.currentUser);
  const controls = useAppStore((s) => s.controls);
  const regulations = useAppStore((s) => s.regulations);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  const linked = policy.controlLinks ?? [];
  const linkedIds = new Set(linked.map((l) => l.controlId));
  const unlinked = controls.filter((c) => c.isActive && !linkedIds.has(c.id));
  const filteredUnlinked = pickerSearch
    ? unlinked.filter((c) => c.controlName.toLowerCase().includes(pickerSearch.toLowerCase()) || c.controlRef.toLowerCase().includes(pickerSearch.toLowerCase()))
    : unlinked;

  // Build a lookup: controlId → regulation references this control addresses
  // We check both the control's own regulationLinks AND the policy's regulatoryLinks
  const regulationsByControl = useMemo(() => {
    const map = new Map<string, { id: string; reference: string; name: string; type?: string }[]>();

    for (const link of linked) {
      const ctrl = link.control;
      if (!ctrl) continue;
      const regs: { id: string; reference: string; name: string; type?: string }[] = [];
      const seenIds = new Set<string>();

      // From the control's own regulationLinks
      for (const rl of ctrl.regulationLinks ?? []) {
        const reg = rl.regulation ?? regulations.find((r) => r.id === rl.regulationId);
        if (reg && !seenIds.has(reg.id)) {
          seenIds.add(reg.id);
          regs.push({ id: reg.id, reference: reg.reference, name: reg.shortName ?? reg.name, type: reg.type });
        }
      }

      // Also include policy-level regulations that are shared (policy regs where this control is relevant)
      for (const prl of policy.regulatoryLinks ?? []) {
        if (!seenIds.has(prl.regulationId)) {
          const reg = prl.regulation ?? regulations.find((r) => r.id === prl.regulationId);
          if (reg) {
            // Check if the regulation also links to this control
            const regLinksToControl = (reg.controlLinks ?? []).some((cl) => cl.controlId === ctrl.id);
            if (regLinksToControl) {
              seenIds.add(reg.id);
              regs.push({ id: reg.id, reference: reg.reference, name: reg.shortName ?? reg.name, type: reg.type });
            }
          }
        }
      }

      map.set(ctrl.id, regs);
    }
    return map;
  }, [linked, regulations, policy.regulatoryLinks]);

  // Mini donut data
  const healthStats = useMemo(() => {
    let pass = 0, fail = 0, partial = 0, notTested = 0;
    for (const link of linked) {
      const ctrl = link.control;
      if (!ctrl) continue;
      const results = ctrl.testingSchedule?.testResults ?? [];
      if (results.length === 0) { notTested++; continue; }
      const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
      const r = sorted[0].result;
      if (r === "PASS") pass++;
      else if (r === "FAIL") fail++;
      else if (r === "PARTIALLY") partial++;
      else notTested++;
    }
    return { pass, fail, partial, notTested, total: linked.length };
  }, [linked]);

  const donutData = useMemo(() => [
    { name: "Pass", value: healthStats.pass, colour: DONUT_COLOURS.Pass },
    { name: "Fail", value: healthStats.fail, colour: DONUT_COLOURS.Fail },
    { name: "Partial", value: healthStats.partial, colour: DONUT_COLOURS.Partial },
    { name: "Not Tested", value: healthStats.notTested, colour: DONUT_COLOURS["Not Tested"] },
  ].filter(d => d.value > 0), [healthStats]);

  function getLatestResult(ctrl: ControlRecord): { result: TestResultValue; date: string } | null {
    const schedule = ctrl.testingSchedule;
    if (!schedule?.testResults?.length) return null;
    const sorted = [...schedule.testResults].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
    return { result: sorted[0].result, date: sorted[0].testedDate };
  }

  function ragDot(result: TestResultValue | null) {
    if (!result) return "bg-gray-300";
    if (result === "PASS") return "bg-green-500";
    if (result === "FAIL") return "bg-red-500";
    if (result === "PARTIALLY") return "bg-amber-500";
    return "bg-gray-300";
  }

  async function handleLink(controlId: string) {
    setLinking(controlId);
    try {
      const link = await api<PolicyControlLink>(`/api/policies/${policy.id}/control-links`, {
        method: "POST",
        body: { controlId },
      });
      onUpdate({
        ...policy,
        controlLinks: [...linked, link],
      });
      toast.success("Control linked");
    } catch {
      toast.error("Failed to link control");
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlink(controlId: string) {
    try {
      await api(`/api/policies/${policy.id}/control-links`, {
        method: "DELETE",
        body: { controlId },
      });
      onUpdate({
        ...policy,
        controlLinks: linked.filter((l) => l.controlId !== controlId),
      });
      toast.success("Control unlinked");
    } catch {
      toast.error("Failed to unlink control");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with mini donut */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {healthStats.total > 0 && (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={48} height={48}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={14}
                    outerRadius={22}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((d, i) => (
                      <Cell key={i} fill={d.colour} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <p className="text-sm font-semibold text-gray-700">{linked.length} controls</p>
                <p className="text-[10px] text-gray-400">
                  {healthStats.pass} pass · {healthStats.fail} fail · {healthStats.partial} partial
                </p>
              </div>
            </div>
          )}
          {healthStats.total === 0 && (
            <p className="text-sm text-gray-500">{linked.length} linked control{linked.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        {isCCRO && (
          <button onClick={() => setShowPicker(!showPicker)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Link2 size={12} /> Link Control
          </button>
        )}
      </div>

      {/* Picker */}
      {showPicker && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search controls..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUnlinked.length === 0 && <p className="text-xs text-gray-400 py-2 text-center">No unlinked controls found</p>}
            {filteredUnlinked.map((ctrl) => (
              <button
                key={ctrl.id}
                onClick={() => handleLink(ctrl.id)}
                disabled={linking === ctrl.id}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-white transition-colors disabled:opacity-50"
              >
                <div>
                  <span className="font-mono font-bold text-updraft-deep">{ctrl.controlRef}</span>
                  <span className="ml-2 text-gray-700">{ctrl.controlName}</span>
                </div>
                <span className="text-gray-400">{ctrl.businessArea?.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls List */}
      {linked.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No controls linked yet</p>
      ) : (
        <div className="space-y-2">
          {linked.map((link) => {
            const ctrl = link.control;
            if (!ctrl) return null;
            const latest = getLatestResult(ctrl);
            const isExpanded = expandedId === link.id;
            const rc = latest ? TEST_RESULT_COLOURS[latest.result] : null;
            const effectiveness = calcEffectiveness(ctrl);
            const effStyle = EFFECTIVENESS_STYLES[effectiveness];
            const ctrlRegs = regulationsByControl.get(ctrl.id) ?? [];
            const testHistory = getTestHistory(ctrl, 3);

            return (
              <div key={link.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 transition-colors">
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : link.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50/50 transition-colors"
                >
                  {/* RAG dot */}
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", ragDot(latest?.result ?? null))} />
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                  <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <EntityLink type="control" id={ctrl.id} reference={ctrl.controlRef} />
                  </span>
                  {/* Name + regulation count */}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-800 truncate block">{ctrl.controlName}</span>
                    {ctrlRegs.length > 0 && (
                      <span className="flex items-center gap-1 mt-0.5">
                        <BookOpen size={10} className="text-gray-400 shrink-0" />
                        <span className="text-[10px] text-gray-400 truncate">
                          {ctrlRegs.length === 1
                            ? ctrlRegs[0].reference
                            : `${ctrlRegs[0].reference} +${ctrlRegs.length - 1} more`}
                        </span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{CONTROL_FREQUENCY_LABELS[ctrl.controlFrequency]}</span>
                  {/* Effectiveness badge */}
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0", effStyle.bg, effStyle.text)}>
                    {effectiveness}
                  </span>
                  {/* Test result badge */}
                  {latest && rc && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", rc.bg, rc.text)}>
                      {TEST_RESULT_LABELS[latest.result]}
                    </span>
                  )}
                  {!latest && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 bg-gray-100 text-gray-400">Not Tested</span>
                  )}
                  {isCCRO && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUnlink(ctrl.id); }}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                      title="Unlink"
                    >
                      <Unlink size={12} />
                    </button>
                  )}
                </button>

                {/* Expanded Details — Card Layout */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-3">
                    {/* Overall Effectiveness Banner */}
                    <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2", effStyle.bg)}>
                      <ShieldCheck size={14} className={effStyle.text} />
                      <span className={cn("text-xs font-semibold", effStyle.text)}>
                        Overall Effectiveness: {effectiveness}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Owner</span>
                        <span className="text-gray-700 font-medium">{ctrl.controlOwner?.name ?? "—"}</span>
                      </div>
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Business Area</span>
                        <span className="text-gray-700 font-medium">{ctrl.businessArea?.name ?? "—"}</span>
                      </div>
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Last Tested</span>
                        <span className="text-gray-700 font-medium">{latest ? formatDate(latest.date) : "Not tested"}</span>
                      </div>
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Type</span>
                        <span className="text-gray-700 font-medium">{ctrl.controlType ?? "—"}</span>
                      </div>
                    </div>

                    {ctrl.controlDescription && (
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Description</span>
                        <span className="text-gray-600 text-xs leading-relaxed">{ctrl.controlDescription}</span>
                      </div>
                    )}

                    {/* Regulations Addressed */}
                    {ctrlRegs.length > 0 && (
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-1.5">Regulations Addressed</span>
                        <div className="flex flex-wrap gap-1.5">
                          {ctrlRegs.map((reg) => (
                            <EntityLink
                              key={reg.id}
                              type="regulation"
                              id={reg.id}
                              reference={reg.reference}
                              label={reg.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Test History (last 3) */}
                    {testHistory.length > 0 && (
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-1.5">Test History</span>
                        <div className="space-y-1">
                          {testHistory.map((tr, i) => {
                            const trc = TEST_RESULT_COLOURS[tr.result];
                            return (
                              <div key={tr.id ?? i} className="flex items-center gap-2 text-xs">
                                <span className={cn("w-2 h-2 rounded-full shrink-0", trc.dot)} />
                                <span className="text-gray-500 font-mono text-[10px] w-20 shrink-0">{formatDate(tr.testedDate)}</span>
                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", trc.bg, trc.text)}>
                                  {TEST_RESULT_LABELS[tr.result]}
                                </span>
                                {tr.notes && <span className="text-gray-400 text-[10px] truncate flex-1" title={tr.notes}>{tr.notes}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {testHistory.length === 0 && (
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Test History</span>
                        <span className="text-gray-400 text-xs">No test results recorded</span>
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
