"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, Link2, Search, Unlink } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Process, ProcessRiskLink, ProcessRiskLinkType } from "@/lib/types";
import {
  PROCESS_RISK_LINK_TYPE_COLOURS,
  PROCESS_RISK_LINK_TYPE_LABELS,
} from "@/lib/types";
import EntityLink from "@/components/common/EntityLink";
import { getRiskScore, getRiskLevel } from "@/lib/risk-categories";

interface Props {
  process: Process;
  onUpdate: (p: Process) => void;
  isCCRO: boolean;
}

const LINK_TYPE_OPTIONS: ProcessRiskLinkType[] = ["CREATES", "MITIGATES", "AFFECTS"];

export default function ProcessRisksTab({ process, onUpdate, isCCRO }: Props) {
  const risks = useAppStore((s) => s.risks);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selectedLinkType, setSelectedLinkType] = useState<ProcessRiskLinkType>("AFFECTS");
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const linked = useMemo(() => process.riskLinks ?? [], [process.riskLinks]);
  const linkedIds = new Set(linked.map((l) => l.riskId));
  const unlinked = risks.filter((r) => !linkedIds.has(r.id));
  const filteredUnlinked = pickerSearch
    ? unlinked.filter(
        (r) =>
          r.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
          r.reference.toLowerCase().includes(pickerSearch.toLowerCase()),
      )
    : unlinked;

  async function handleLink(riskId: string) {
    setLinking(riskId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/risk-links`, {
        method: "POST",
        body: { riskId, linkType: selectedLinkType },
      });
      onUpdate(result);
      toast.success("Risk linked");
    } catch {
      toast.error("Failed to link risk");
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlink(riskId: string) {
    setUnlinking(riskId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/risk-links`, {
        method: "DELETE",
        body: { riskId },
      });
      onUpdate(result);
      toast.success("Risk unlinked");
    } catch {
      toast.error("Failed to unlink risk");
    } finally {
      setUnlinking(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {linked.length} linked risk{linked.length !== 1 ? "s" : ""}
        </p>
        {isCCRO && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Link2 size={12} /> Link Risk
          </button>
        )}
      </div>

      {/* Picker */}
      {showPicker && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          {/* Link type selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider shrink-0">
              Link type:
            </span>
            <div className="flex gap-1">
              {LINK_TYPE_OPTIONS.map((lt) => (
                <button
                  key={lt}
                  onClick={() => setSelectedLinkType(lt)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                    selectedLinkType === lt
                      ? cn(
                          PROCESS_RISK_LINK_TYPE_COLOURS[lt].bg,
                          PROCESS_RISK_LINK_TYPE_COLOURS[lt].text,
                          "ring-1 ring-inset ring-current",
                        )
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                  )}
                >
                  {PROCESS_RISK_LINK_TYPE_LABELS[lt]}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search unlinked risks…"
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUnlinked.length === 0 && (
              <p className="text-xs text-gray-400 py-2 text-center">No unlinked risks found</p>
            )}
            {filteredUnlinked.map((risk) => {
              const score = getRiskScore(risk.residualLikelihood, risk.residualImpact);
              const level = getRiskLevel(score);
              return (
                <button
                  key={risk.id}
                  onClick={() => handleLink(risk.id)}
                  disabled={linking === risk.id}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-white transition-colors disabled:opacity-50"
                >
                  <div>
                    <span className="font-mono font-bold text-updraft-deep">{risk.reference}</span>
                    <span className="ml-2 text-gray-700">{risk.name}</span>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 text-white",
                      level.bgClass,
                    )}
                  >
                    {score}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Linked list */}
      {linked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <AlertTriangle size={36} className="text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No risks linked.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {linked.map((link: ProcessRiskLink) => {
            const risk = link.risk;
            if (!risk) return null;
            const score = getRiskScore(risk.residualLikelihood, risk.residualImpact);
            const level = getRiskLevel(score);
            const ltc = PROCESS_RISK_LINK_TYPE_COLOURS[link.linkType];
            return (
              <div
                key={link.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 transition-colors"
              >
                <EntityLink type="risk" id={risk.id} reference={risk.reference} />
                <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">{risk.name}</span>
                {/* Link type pill */}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                    ltc.bg,
                    ltc.text,
                  )}
                >
                  {PROCESS_RISK_LINK_TYPE_LABELS[link.linkType]}
                </span>
                {/* Residual score badge */}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 text-white",
                    level.bgClass,
                  )}
                >
                  {score}
                </span>
                {/* Unlink */}
                {isCCRO && (
                  <button
                    onClick={() => handleUnlink(risk.id)}
                    disabled={unlinking === risk.id}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50"
                    title="Unlink risk"
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
