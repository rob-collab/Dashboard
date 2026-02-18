"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Link2, Search, Unlink } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Policy, PolicyControlLink, ControlRecord, TestResultValue } from "@/lib/types";
import { TEST_RESULT_COLOURS, TEST_RESULT_LABELS, CONTROL_FREQUENCY_LABELS } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const DONUT_COLOURS: Record<string, string> = {
  Pass: "#22c55e",
  Fail: "#ef4444",
  Partial: "#f59e0b",
  "Not Tested": "#d1d5db",
};

interface Props {
  policy: Policy;
  onUpdate: (policy: Policy) => void;
}

export default function PolicyControlsTab({ policy, onUpdate }: Props) {
  const currentUser = useAppStore((s) => s.currentUser);
  const controls = useAppStore((s) => s.controls);
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
                  <span className="font-mono text-xs font-bold text-updraft-deep w-20 shrink-0">{ctrl.controlRef}</span>
                  <span className="flex-1 text-xs text-gray-800 truncate">{ctrl.controlName}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{CONTROL_FREQUENCY_LABELS[ctrl.controlFrequency]}</span>
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
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
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
                      <div className="mt-2.5 rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Description</span>
                        <span className="text-gray-600 text-xs leading-relaxed">{ctrl.controlDescription}</span>
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
