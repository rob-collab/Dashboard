"use client";

import { useAppStore } from "@/lib/store";
import { PROCESS_CRITICALITY_COLOURS, PROCESS_STATUS_LABELS } from "@/lib/types";
import type { Policy } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import EntityLink from "@/components/common/EntityLink";
import MaturityBadge from "@/components/processes/MaturityBadge";

interface Props {
  policy: Policy;
}

export default function PolicyProcessesTab({ policy }: Props) {
  const processes = useAppStore((s) => s.processes);
  const linked = processes.filter((p) =>
    p.policyLinks?.some((l) => l.policyId === policy.id)
  );

  if (linked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 rounded-full bg-teal-50 p-4">
          <Layers size={24} className="text-teal-600" />
        </div>
        <p className="text-sm font-medium text-gray-700">No processes linked</p>
        <p className="mt-1 text-xs text-gray-400 max-w-xs">
          Link this policy to processes in the Process Library to evidence governance coverage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2">
      <p className="text-xs text-gray-400 mb-3">{linked.length} process{linked.length !== 1 ? "es" : ""} linked to this policy</p>
      {linked.map((proc) => {
        const critColours = PROCESS_CRITICALITY_COLOURS[proc.criticality];
        return (
          <div key={proc.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <EntityLink type="process" id={proc.id} reference={proc.reference} label={proc.name} />
                <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", critColours.bg, critColours.text)}>
                  {proc.criticality}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MaturityBadge score={proc.maturityScore} size="sm" />
                <span className="text-[10px] text-gray-400">{PROCESS_STATUS_LABELS[proc.status]}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
