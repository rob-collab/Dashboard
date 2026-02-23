"use client";

import { useState, useMemo } from "react";
import { Link2, Search, ShieldOff, Unlink } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Process, ProcessControlLink, TestResultValue } from "@/lib/types";
import { CONTROL_TYPE_LABELS } from "@/lib/types";
import EntityLink from "@/components/common/EntityLink";

interface Props {
  process: Process;
  onUpdate: (p: Process) => void;
  isCCRO: boolean;
}

function ragDotClass(result: TestResultValue | null | undefined): string {
  if (!result) return "bg-gray-300";
  if (result === "PASS") return "bg-green-500";
  if (result === "FAIL") return "bg-red-500";
  if (result === "PARTIALLY") return "bg-amber-500";
  return "bg-gray-300";
}

export default function ProcessControlsTab({ process, onUpdate, isCCRO }: Props) {
  const controls = useAppStore((s) => s.controls);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const linked = useMemo(() => process.controlLinks ?? [], [process.controlLinks]);
  const linkedIds = new Set(linked.map((l) => l.controlId));
  const unlinked = controls.filter((c) => c.isActive && !linkedIds.has(c.id));
  const filteredUnlinked = pickerSearch
    ? unlinked.filter(
        (c) =>
          c.controlName.toLowerCase().includes(pickerSearch.toLowerCase()) ||
          c.controlRef.toLowerCase().includes(pickerSearch.toLowerCase()),
      )
    : unlinked;

  async function handleLink(controlId: string) {
    setLinking(controlId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/control-links`, {
        method: "POST",
        body: { controlId },
      });
      onUpdate(result);
      toast.success("Control linked");
    } catch {
      toast.error("Failed to link control");
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlink(controlId: string) {
    setUnlinking(controlId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/control-links`, {
        method: "DELETE",
        body: { controlId },
      });
      onUpdate(result);
      toast.success("Control unlinked");
    } catch {
      toast.error("Failed to unlink control");
    } finally {
      setUnlinking(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {linked.length} linked control{linked.length !== 1 ? "s" : ""}
        </p>
        {isCCRO && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
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
              placeholder="Search unlinked controls…"
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUnlinked.length === 0 && (
              <p className="text-xs text-gray-400 py-2 text-center">No unlinked controls found</p>
            )}
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
                {ctrl.controlType && (
                  <span className="rounded-full bg-updraft-pale-purple/30 text-updraft-deep px-2 py-0.5 text-[10px] font-medium shrink-0">
                    {CONTROL_TYPE_LABELS[ctrl.controlType]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Linked controls list */}
      {linked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <ShieldOff size={36} className="text-gray-200" />
          <p className="text-sm font-medium text-gray-500">
            No controls linked — this process is unverifiable.
          </p>
          <p className="text-xs text-gray-400 max-w-sm">
            Link controls to evidence how this process is governed.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {linked.map((link: ProcessControlLink) => {
            const ctrl = link.control;
            if (!ctrl) return null;

            const results = ctrl.testingSchedule?.testResults ?? [];
            const latestResult =
              results.length > 0
                ? [...results].sort(
                    (a, b) =>
                      new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime(),
                  )[0].result
                : null;

            return (
              <div
                key={link.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 transition-colors"
              >
                {/* RAG dot */}
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full shrink-0",
                    ragDotClass(latestResult),
                  )}
                />
                {/* Entity link */}
                <EntityLink type="control" id={ctrl.id} reference={ctrl.controlRef} />
                {/* Name */}
                <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">
                  {ctrl.controlName}
                </span>
                {/* Control type badge */}
                {ctrl.controlType && (
                  <span className="rounded-full bg-updraft-pale-purple/30 text-updraft-deep px-2 py-0.5 text-[10px] font-medium shrink-0">
                    {CONTROL_TYPE_LABELS[ctrl.controlType]}
                  </span>
                )}
                {/* Unlink */}
                {isCCRO && (
                  <button
                    onClick={() => handleUnlink(ctrl.id)}
                    disabled={unlinking === ctrl.id}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50"
                    title="Unlink control"
                  >
                    <Unlink size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
