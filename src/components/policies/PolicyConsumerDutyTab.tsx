"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useHasPermission } from "@/lib/usePermission";
import { CONSUMER_DUTY_OUTCOME_LABELS, CONSUMER_DUTY_OUTCOME_COLOURS } from "@/lib/types";
import type { Policy } from "@/lib/types";
import { ShieldCheck, Package, PoundSterling, BookOpen, Headphones, Check, Plus, Loader2, Link2 } from "lucide-react";

/* ── Outcome metadata ──────────────────────────────────────────────────────── */

const OUTCOME_IDS = ["products-services", "price-value", "consumer-understanding", "consumer-support"] as const;

const OUTCOME_ICONS: Record<string, typeof Package> = {
  "products-services": Package,
  "price-value": PoundSterling,
  "consumer-understanding": BookOpen,
  "consumer-support": Headphones,
};

/** Reference patterns in regulations that indicate Consumer Duty relevance */
const CD_REG_PATTERNS: Record<string, RegExp[]> = {
  "products-services": [/PRIN\s*2A/i, /PROD/i, /product\s+governance/i],
  "price-value": [/PRIN\s*2A/i, /FEES/i, /price.*value/i, /fair.*value/i],
  "consumer-understanding": [/PRIN\s*2A/i, /COBS/i, /consumer.*understand/i, /financial\s+promotion/i],
  "consumer-support": [/PRIN\s*2A/i, /DISP/i, /consumer.*support/i, /vulnerability/i],
};

/* ── Props ─────────────────────────────────────────────────────────────────── */

interface Props {
  policy: Policy;
  onUpdate: (policy: Policy) => void;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function PolicyConsumerDutyTab({ policy, onUpdate }: Props) {
  const canEdit = useHasPermission("edit:compliance");
  const regulations = useAppStore((s) => s.regulations);
  const [saving, setSaving] = useState<string | null>(null);

  const mapped = new Set(policy.consumerDutyOutcomes ?? []);
  const mappedCount = mapped.size;
  const coveragePct = Math.round((mappedCount / 4) * 100);

  /* ── Toggle handler ────────────────────────────────────────────────────── */

  async function toggleOutcome(outcomeId: string) {
    setSaving(outcomeId);
    try {
      const current = new Set(policy.consumerDutyOutcomes ?? []);
      if (current.has(outcomeId)) {
        current.delete(outcomeId);
      } else {
        current.add(outcomeId);
      }
      const newOutcomes = Array.from(current);

      const updated = await api<Policy>(`/api/policies/${policy.id}`, {
        method: "PATCH",
        body: { consumerDutyOutcomes: newOutcomes },
      });

      onUpdate(updated);
      toast.success(
        current.has(outcomeId)
          ? `Mapped to ${CONSUMER_DUTY_OUTCOME_LABELS[outcomeId]}`
          : `Removed ${CONSUMER_DUTY_OUTCOME_LABELS[outcomeId]} mapping`,
      );
    } catch (err) {
      toast.error("Failed to update Consumer Duty mapping");
      console.error(err);
    } finally {
      setSaving(null);
    }
  }

  /* ── Regulation alignment analysis ─────────────────────────────────────── */

  const regulatoryAlignment = useMemo(() => {
    const linkedRegIds = new Set(
      (policy.regulatoryLinks ?? []).map((rl) => rl.regulationId),
    );
    const linkedRegs = regulations.filter((r) => linkedRegIds.has(r.id));

    const alignmentByOutcome: Record<string, { regulationId: string; reference: string; name: string }[]> = {};

    for (const outcomeId of OUTCOME_IDS) {
      const patterns = CD_REG_PATTERNS[outcomeId];
      const matches: { regulationId: string; reference: string; name: string }[] = [];

      for (const reg of linkedRegs) {
        const text = `${reg.reference} ${reg.name} ${reg.description ?? ""} ${reg.provisions ?? ""}`;
        if (patterns.some((p) => p.test(text))) {
          matches.push({ regulationId: reg.id, reference: reg.reference, name: reg.name });
        }
      }

      alignmentByOutcome[outcomeId] = matches;
    }

    return alignmentByOutcome;
  }, [policy.regulatoryLinks, regulations]);

  const hasAnyAlignment = Object.values(regulatoryAlignment).some((arr) => arr.length > 0);

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ── Coverage Summary ───────────────────────────────────────────────── */}
      <div className="bento-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-lg bg-gradient-to-br from-updraft-bright-purple to-updraft-bar p-2">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-updraft-deep font-poppins">
              Consumer Duty Coverage
            </h3>
            <p className="text-xs text-gray-500">
              {mappedCount} of 4 Consumer Duty outcomes mapped
            </p>
          </div>
          <span className="ml-auto text-lg font-bold text-updraft-deep font-poppins">
            {coveragePct}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              coveragePct === 100
                ? "bg-gradient-to-r from-green-400 to-green-500"
                : coveragePct >= 50
                  ? "bg-gradient-to-r from-updraft-bright-purple to-updraft-bar"
                  : "bg-gradient-to-r from-amber-400 to-amber-500",
            )}
            style={{ width: `${coveragePct}%` }}
          />
        </div>
      </div>

      {/* ── Outcome Cards (2x2) ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {OUTCOME_IDS.map((outcomeId) => {
          const isMapped = mapped.has(outcomeId);
          const colours = CONSUMER_DUTY_OUTCOME_COLOURS[outcomeId];
          const Icon = OUTCOME_ICONS[outcomeId];
          const isSaving = saving === outcomeId;
          const alignedRegs = regulatoryAlignment[outcomeId] ?? [];

          return (
            <div
              key={outcomeId}
              className={cn(
                "bento-card group relative overflow-hidden transition-all duration-200",
                isMapped
                  ? `ring-2 ring-offset-1 ${colours.text.replace("text-", "ring-")}/30`
                  : "hover:shadow-md",
              )}
            >
              {/* Decorative background icon */}
              <div className="absolute -right-3 -top-3 opacity-[0.06]">
                <Icon size={64} />
              </div>

              <div className="relative space-y-3">
                {/* Icon + Name */}
                <div className="flex items-start gap-2.5">
                  <div className={cn("rounded-lg p-2", colours.bg)}>
                    <Icon size={16} className={colours.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 font-poppins leading-tight">
                      {CONSUMER_DUTY_OUTCOME_LABELS[outcomeId]}
                    </h4>
                    <p className={cn(
                      "text-xs mt-0.5 font-medium",
                      isMapped ? "text-green-600" : "text-gray-400",
                    )}>
                      {isMapped ? "Mapped" : "Not mapped"}
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isMapped ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        <Check size={10} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        Inactive
                      </span>
                    )}
                    {alignedRegs.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                        <Link2 size={9} /> {alignedRegs.length} reg{alignedRegs.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Toggle button */}
                  {canEdit && (
                    <button
                      onClick={() => toggleOutcome(outcomeId)}
                      disabled={isSaving}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all duration-200",
                        isSaving && "opacity-50 cursor-not-allowed",
                        isMapped
                          ? "border border-red-200 text-red-600 hover:bg-red-50"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300",
                      )}
                    >
                      {isSaving ? (
                        <Loader2 size={12} className="animate-spin mx-1" />
                      ) : isMapped ? (
                        "Remove"
                      ) : (
                        <span className="inline-flex items-center gap-0.5">
                          <Plus size={10} /> Add
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Regulatory Alignment ──────────────────────────────────────────── */}
      {hasAnyAlignment && (
        <div className="bento-card">
          <h3 className="text-sm font-semibold text-updraft-deep font-poppins mb-3">
            Consumer Duty Alignment
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Linked regulations that align with Consumer Duty outcomes based on
            reference patterns and content analysis.
          </p>

          <div className="space-y-3">
            {OUTCOME_IDS.map((outcomeId) => {
              const regs = regulatoryAlignment[outcomeId];
              if (!regs || regs.length === 0) return null;

              const colours = CONSUMER_DUTY_OUTCOME_COLOURS[outcomeId];
              const Icon = OUTCOME_ICONS[outcomeId];

              return (
                <div key={outcomeId} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("rounded p-1", colours.bg)}>
                      <Icon size={12} className={colours.icon} />
                    </div>
                    <span className={cn("text-xs font-semibold", colours.text)}>
                      {CONSUMER_DUTY_OUTCOME_LABELS[outcomeId]}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {regs.map((reg) => (
                      <div
                        key={reg.regulationId}
                        className="flex items-center gap-2 text-xs text-gray-600"
                      >
                        <span className="font-mono text-[10px] font-bold rounded bg-white border border-gray-200 px-1.5 py-0.5 text-gray-500">
                          {reg.reference}
                        </span>
                        <span className="truncate">{reg.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No alignment notice */}
      {!hasAnyAlignment && (policy.regulatoryLinks?.length ?? 0) > 0 && (
        <div className="bento-card text-center py-6">
          <ShieldCheck size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">
            No linked regulations match Consumer Duty reference patterns.
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Link regulations containing PRIN 2A, PROD, COBS, or DISP references to see alignment.
          </p>
        </div>
      )}

      {(policy.regulatoryLinks?.length ?? 0) === 0 && (
        <div className="bento-card text-center py-6">
          <Link2 size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">
            No regulations linked to this policy yet.
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Link regulations in the Regulatory Mapping tab to see Consumer Duty alignment analysis.
          </p>
        </div>
      )}
    </div>
  );
}
