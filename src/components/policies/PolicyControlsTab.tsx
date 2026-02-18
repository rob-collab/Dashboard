"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Link2, Search, Unlink } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Policy, PolicyControlLink, ControlRecord, TestResultValue } from "@/lib/types";
import { TEST_RESULT_COLOURS, TEST_RESULT_LABELS, CONTROL_FREQUENCY_LABELS } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

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

  function getLatestResult(ctrl: ControlRecord): { result: TestResultValue; date: string } | null {
    const schedule = ctrl.testingSchedule;
    if (!schedule?.testResults?.length) return null;
    const sorted = [...schedule.testResults].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
    return { result: sorted[0].result, date: sorted[0].testedDate };
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{linked.length} linked control{linked.length !== 1 ? "s" : ""}</p>
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
        <div className="space-y-1">
          {linked.map((link) => {
            const ctrl = link.control;
            if (!ctrl) return null;
            const latest = getLatestResult(ctrl);
            const isExpanded = expandedId === link.id;
            const rc = latest ? TEST_RESULT_COLOURS[latest.result] : null;

            return (
              <div key={link.id} className="rounded-lg border border-gray-200 bg-white">
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : link.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
                >
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                  <span className="font-mono text-xs font-bold text-updraft-deep w-20 shrink-0">{ctrl.controlRef}</span>
                  <span className="flex-1 text-xs text-gray-800 truncate">{ctrl.controlName}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{CONTROL_FREQUENCY_LABELS[ctrl.controlFrequency]}</span>
                  {latest && rc && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", rc.bg, rc.text)}>
                      {TEST_RESULT_LABELS[latest.result]}
                    </span>
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

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Owner</span>
                      <span className="text-gray-700">{ctrl.controlOwner?.name ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Business Area</span>
                      <span className="text-gray-700">{ctrl.businessArea?.name ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Last Tested</span>
                      <span className="text-gray-700">{latest ? formatDate(latest.date) : "Not tested"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Type</span>
                      <span className="text-gray-700">{ctrl.controlType ?? "—"}</span>
                    </div>
                    {ctrl.standingComments && (
                      <div className="col-span-2">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Comments</span>
                        <span className="text-gray-700">{ctrl.standingComments}</span>
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
