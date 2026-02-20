"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Link2, Plus, Search, Shield, Unlink } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Policy, Regulation, PolicyRegulatoryLink, ControlRecord, TestResultValue } from "@/lib/types";
import {
  REGULATION_TYPE_LABELS,
  REGULATION_TYPE_COLOURS,
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLOURS,
  TEST_RESULT_LABELS,
  TEST_RESULT_COLOURS,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import EntityLink from "@/components/common/EntityLink";
import RegulationFormDialog from "./RegulationFormDialog";

const BODY_COLOURS: Record<string, { bg: string; text: string; border: string }> = {
  FCA: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  Parliament: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  ICO: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  ASA: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  Ofcom: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  PRA: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
};

const DEFAULT_BODY_COLOUR = { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };

interface Props {
  policy: Policy;
  onUpdate: (policy: Policy) => void;
}

export default function PolicyRegulationsTab({ policy, onUpdate }: Props) {
  const currentUser = useAppStore((s) => s.currentUser);
  const regulations = useAppStore((s) => s.regulations);
  const controls = useAppStore((s) => s.controls);
  const addRegulation = useAppStore((s) => s.addRegulation);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [showRegForm, setShowRegForm] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const linked = policy.regulatoryLinks ?? [];
  const linkedIds = new Set(linked.map((l) => l.regulationId));
  const unlinked = regulations.filter((r) => !linkedIds.has(r.id));
  const filteredUnlinked = pickerSearch
    ? unlinked.filter((r) => r.name.toLowerCase().includes(pickerSearch.toLowerCase()) || r.reference.toLowerCase().includes(pickerSearch.toLowerCase()))
    : unlinked;

  // Count unique regulatory bodies
  const bodyCount = useMemo(() => {
    const bodies = new Set<string>();
    for (const link of linked) {
      if (link.regulation?.body) bodies.add(link.regulation.body);
    }
    return bodies.size;
  }, [linked]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Find controls from the store that have a regulationLink matching a given regulation ID */
  function getLinkedControls(regulationId: string): ControlRecord[] {
    return controls.filter((c) =>
      c.regulationLinks?.some((rl) => rl.regulationId === regulationId)
    );
  }

  /** Get the latest test result for a control */
  function getLatestResult(ctrl: ControlRecord): { result: TestResultValue; date: string } | null {
    const schedule = ctrl.testingSchedule;
    if (!schedule?.testResults?.length) return null;
    const sorted = [...schedule.testResults].sort(
      (a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime()
    );
    return { result: sorted[0].result, date: sorted[0].testedDate };
  }

  function ragDot(result: TestResultValue | null) {
    if (!result) return "bg-gray-300";
    if (result === "PASS") return "bg-green-500";
    if (result === "FAIL") return "bg-red-500";
    if (result === "PARTIALLY") return "bg-amber-500";
    return "bg-gray-300";
  }

  async function handleLink(regulationId: string) {
    setLinking(regulationId);
    try {
      const link = await api<PolicyRegulatoryLink>(`/api/policies/${policy.id}/regulatory-links`, {
        method: "POST",
        body: { regulationId },
      });
      onUpdate({
        ...policy,
        regulatoryLinks: [...linked, link],
      });
      toast.success("Regulation linked");
    } catch {
      toast.error("Failed to link regulation");
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlink(regulationId: string) {
    try {
      await api(`/api/policies/${policy.id}/regulatory-links`, {
        method: "DELETE",
        body: { regulationId },
      });
      onUpdate({
        ...policy,
        regulatoryLinks: linked.filter((l) => l.regulationId !== regulationId),
      });
      toast.success("Regulation unlinked");
    } catch {
      toast.error("Failed to unlink regulation");
    }
  }

  function handleNewRegulation(reg: Regulation) {
    addRegulation(reg);
  }

  function getBodyColour(body: string) {
    return BODY_COLOURS[body] ?? DEFAULT_BODY_COLOUR;
  }

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">{linked.length} regulation{linked.length !== 1 ? "s" : ""}</p>
          {bodyCount > 0 && (
            <p className="text-xs text-gray-400">across {bodyCount} regulatory bod{bodyCount !== 1 ? "ies" : "y"}</p>
          )}
        </div>
        {isCCRO && (
          <div className="flex gap-2">
            <button onClick={() => setShowPicker(!showPicker)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Link2 size={12} /> Link Regulation
            </button>
            <button onClick={() => setShowRegForm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-deep text-white px-3 py-1.5 text-xs font-medium hover:bg-updraft-bar transition-colors">
              <Plus size={12} /> New Regulation
            </button>
          </div>
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
              placeholder="Search unlinked regulations..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUnlinked.length === 0 && <p className="text-xs text-gray-400 py-2 text-center">No unlinked regulations found</p>}
            {filteredUnlinked.map((reg) => (
              <button
                key={reg.id}
                onClick={() => handleLink(reg.id)}
                disabled={linking === reg.id}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-white transition-colors disabled:opacity-50"
              >
                <div>
                  <span className="font-mono font-bold text-updraft-deep">{reg.reference}</span>
                  <span className="ml-2 text-gray-700">{reg.name}</span>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", REGULATION_TYPE_COLOURS[reg.type].bg, REGULATION_TYPE_COLOURS[reg.type].text)}>
                  {REGULATION_TYPE_LABELS[reg.type]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Linked Regulations */}
      {linked.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No regulations linked yet</p>
      ) : (
        <div className="space-y-2">
          {linked.map((link) => {
            const reg = link.regulation;
            if (!reg) return null;
            const bc = getBodyColour(reg.body);
            const isExpanded = expandedIds.has(link.id);
            const linkedCtrls = getLinkedControls(reg.id);
            const cc = COMPLIANCE_STATUS_COLOURS[reg.complianceStatus];

            return (
              <div key={link.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 transition-colors">
                {/* Row header */}
                <button
                  onClick={() => toggleExpanded(link.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50/50 transition-colors"
                >
                  {/* Compliance RAG dot */}
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", cc?.dot ?? "bg-gray-300")} />
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                  <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <EntityLink type="regulation" id={reg.id} reference={reg.reference} />
                  </span>
                  <span className="flex-1 text-xs text-gray-800 truncate">{reg.shortName ?? reg.name}</span>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0", bc.bg, bc.text, bc.border)}>
                    {reg.body}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", REGULATION_TYPE_COLOURS[reg.type].bg, REGULATION_TYPE_COLOURS[reg.type].text)}>
                    {REGULATION_TYPE_LABELS[reg.type]}
                  </span>
                  {linkedCtrls.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-updraft-pale-purple/40 px-2 py-0.5 text-[10px] font-medium text-updraft-deep shrink-0">
                      <Shield size={10} /> {linkedCtrls.length}
                    </span>
                  )}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {reg.url && (
                      <a href={reg.url} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors" title="View source">
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {isCCRO && (
                      <button onClick={() => handleUnlink(reg.id)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Unlink">
                        <Unlink size={12} />
                      </button>
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 animate-fade-in space-y-3">
                    {/* Info cards row */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      {/* Compliance status */}
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Compliance Status</span>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium", cc?.bg, cc?.text)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", cc?.dot)} />
                          {COMPLIANCE_STATUS_LABELS[reg.complianceStatus]}
                        </span>
                      </div>
                      {/* Provisions */}
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Provisions</span>
                        <span className="text-gray-700 font-medium">{reg.provisions ?? "—"}</span>
                      </div>
                      {/* Controls count */}
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Linked Controls</span>
                        <span className="text-gray-700 font-medium">{linkedCtrls.length}</span>
                      </div>
                    </div>

                    {/* Relevant Sections */}
                    {link.policySections && (
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Relevant Sections</span>
                        <span className="text-gray-700 text-xs leading-relaxed">{link.policySections}</span>
                      </div>
                    )}

                    {/* Notes */}
                    {link.notes && (
                      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Notes</span>
                        <span className="text-gray-600 text-xs leading-relaxed">{link.notes}</span>
                      </div>
                    )}

                    {/* Linked Controls subsection */}
                    {linkedCtrls.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase font-semibold text-gray-400">Linked Controls</p>
                        <div className="space-y-1">
                          {linkedCtrls.map((ctrl) => {
                            const latest = getLatestResult(ctrl);
                            const rc = latest ? TEST_RESULT_COLOURS[latest.result] : null;
                            return (
                              <div
                                key={ctrl.id}
                                className="flex items-center gap-2.5 rounded-lg bg-white border border-gray-100 px-3 py-2"
                              >
                                <span className={cn("w-2 h-2 rounded-full shrink-0", ragDot(latest?.result ?? null))} />
                                <EntityLink type="control" id={ctrl.id} reference={ctrl.controlRef} label={ctrl.controlName} />
                                {latest && rc ? (
                                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", rc.bg, rc.text)}>
                                    {TEST_RESULT_LABELS[latest.result]}
                                  </span>
                                ) : (
                                  <span className="rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 bg-gray-100 text-gray-400">Not Tested</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {linkedCtrls.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No controls linked to this regulation</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RegulationFormDialog
        open={showRegForm}
        onClose={() => setShowRegForm(false)}
        onSave={handleNewRegulation}
      />
    </div>
  );
}
