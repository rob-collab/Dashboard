"use client";

import { useAppStore } from "@/lib/store";
import type { ImportantBusinessService } from "@/lib/types";
import { MATURITY_LABELS, MATURITY_COLOURS, PROCESS_CRITICALITY_LABELS, PROCESS_CRITICALITY_COLOURS } from "@/lib/types";
import EntityLink from "@/components/common/EntityLink";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { cn } from "@/lib/utils";

export default function IBSProcessesTab({ ibs }: { ibs: ImportantBusinessService }) {
  const allProcesses = useAppStore((s) => s.processes);

  const linkedProcessIds = new Set((ibs.processLinks ?? []).map((l) => l.processId));
  const processes = allProcesses.filter((p) => linkedProcessIds.has(p.id));

  if (processes.length === 0) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Not mapped to any processes</p>
          <p className="mt-1 text-xs">FCA PS21/3 requires firms to document the processes supporting each Important Business Service. Link processes from the Process Library → IBS tab.</p>
        </div>
      </div>
    );
  }

  const avgMaturity = Math.round(processes.reduce((s, p) => s + p.maturityScore, 0) / processes.length);
  const criticalCount = processes.filter((p) => p.criticality === "CRITICAL").length;
  const lowMaturityCritical = processes.filter((p) => p.criticality === "CRITICAL" && p.maturityScore <= 2).length;

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bento-card text-center">
          <p className="text-xs text-gray-400 mb-1">Processes</p>
          <p className="text-2xl font-bold font-poppins text-gray-900"><AnimatedNumber value={processes.length} /></p>
        </div>
        <div className="bento-card text-center">
          <p className="text-xs text-gray-400 mb-1">Avg Maturity</p>
          <p className="text-2xl font-bold font-poppins text-gray-900"><AnimatedNumber value={avgMaturity} /></p>
        </div>
        <div className={cn("bento-card text-center", lowMaturityCritical > 0 ? "bg-red-50 border-red-200" : "")}>
          <p className="text-xs text-gray-400 mb-1">Critical Low-Maturity</p>
          <p className={cn("text-2xl font-bold font-poppins", lowMaturityCritical > 0 ? "text-red-600" : "text-gray-900")}><AnimatedNumber value={lowMaturityCritical} /></p>
        </div>
      </div>

      {lowMaturityCritical > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
          {lowMaturityCritical} critical process{lowMaturityCritical !== 1 ? "es are" : " is"} at maturity ≤2 — operational resilience risk.
        </div>
      )}

      <div className="space-y-2">
        {processes.map((p) => {
          const mc = MATURITY_COLOURS[p.maturityScore] ?? MATURITY_COLOURS[1];
          const cc = PROCESS_CRITICALITY_COLOURS[p.criticality];
          return (
            <div key={p.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3 hover:bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <EntityLink type="process" id={p.id} label={p.reference} className="text-xs font-mono text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cc.bg, cc.text)}>{PROCESS_CRITICALITY_LABELS[p.criticality]}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", mc.bg, mc.text)}>L{p.maturityScore} {MATURITY_LABELS[p.maturityScore]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {criticalCount > 0 && (
        <p className="text-xs text-gray-400">{criticalCount} critical process{criticalCount !== 1 ? "es" : ""} supporting this IBS · avg maturity {avgMaturity}</p>
      )}
    </div>
  );
}
