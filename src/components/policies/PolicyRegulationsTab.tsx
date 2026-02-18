"use client";

import { useState, useMemo } from "react";
import { ExternalLink, Link2, Plus, Search, Unlink } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Policy, Regulation, PolicyRegulatoryLink } from "@/lib/types";
import { REGULATION_TYPE_LABELS, REGULATION_TYPE_COLOURS } from "@/lib/types";
import { cn } from "@/lib/utils";
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
  const addRegulation = useAppStore((s) => s.addRegulation);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [showRegForm, setShowRegForm] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

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

      {/* Linked Regulations Table */}
      {linked.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No regulations linked yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs">Reference</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs">Name</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs">Body</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs">Type</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs">Provisions</th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {linked.map((link) => {
                const reg = link.regulation;
                if (!reg) return null;
                const bc = getBodyColour(reg.body);
                return (
                  <tr key={link.id} className="border-b border-gray-100 hover:bg-updraft-pale-purple/10 transition-colors">
                    <td className="py-2.5 px-2 font-mono text-xs font-bold text-updraft-deep">{reg.reference}</td>
                    <td className="py-2.5 px-2 text-xs text-gray-800 max-w-[180px]">{reg.shortName ?? reg.name}</td>
                    <td className="py-2.5 px-2">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border", bc.bg, bc.text, bc.border)}>
                        {reg.body}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", REGULATION_TYPE_COLOURS[reg.type].bg, REGULATION_TYPE_COLOURS[reg.type].text)}>
                        {REGULATION_TYPE_LABELS[reg.type]}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-gray-500 max-w-[140px] truncate">{reg.provisions ?? "—"}</td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
