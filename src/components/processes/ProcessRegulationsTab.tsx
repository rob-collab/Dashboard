"use client";

import { useState, useMemo } from "react";
import { BookOpen, Link2, Search, Unlink } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Process, ProcessRegulationLink } from "@/lib/types";
import {
  COMPLIANCE_STATUS_COLOURS,
  COMPLIANCE_STATUS_LABELS,
} from "@/lib/types";
import EntityLink from "@/components/common/EntityLink";

interface Props {
  process: Process;
  onUpdate: (p: Process) => void;
  isCCRO: boolean;
}

export default function ProcessRegulationsTab({ process, onUpdate, isCCRO }: Props) {
  const regulations = useAppStore((s) => s.regulations);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const linked = useMemo(() => process.regulationLinks ?? [], [process.regulationLinks]);
  const linkedIds = new Set(linked.map((l) => l.regulationId));
  const unlinked = regulations.filter((r) => !linkedIds.has(r.id));
  const filteredUnlinked = pickerSearch
    ? unlinked.filter(
        (r) =>
          r.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
          r.reference.toLowerCase().includes(pickerSearch.toLowerCase()),
      )
    : unlinked;

  async function handleLink(regulationId: string) {
    setLinking(regulationId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/regulation-links`, {
        method: "POST",
        body: { regulationId },
      });
      onUpdate(result);
      toast.success("Regulation linked");
    } catch {
      toast.error("Failed to link regulation");
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlink(regulationId: string) {
    setUnlinking(regulationId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/regulation-links`, {
        method: "DELETE",
        body: { regulationId },
      });
      onUpdate(result);
      toast.success("Regulation unlinked");
    } catch {
      toast.error("Failed to unlink regulation");
    } finally {
      setUnlinking(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {linked.length} linked regulation{linked.length !== 1 ? "s" : ""}
        </p>
        {isCCRO && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Link2 size={12} /> Link Regulation
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
              placeholder="Search unlinked regulations…"
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUnlinked.length === 0 && (
              <p className="text-xs text-gray-400 py-2 text-center">
                No unlinked regulations found
              </p>
            )}
            {filteredUnlinked.map((reg) => (
              <button
                key={reg.id}
                onClick={() => handleLink(reg.id)}
                disabled={linking === reg.id}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-white transition-colors disabled:opacity-50"
              >
                <div>
                  <span className="font-mono font-bold text-updraft-deep">{reg.reference}</span>
                  <span className="ml-2 text-gray-700">{reg.shortName ?? reg.name}</span>
                </div>
                <span className="text-gray-400 text-[10px] shrink-0">{reg.body}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Linked list */}
      {linked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <BookOpen size={36} className="text-gray-200" />
          <p className="text-sm font-medium text-gray-500">
            No regulations linked — regulatory obligations are not evidenced for this process.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {linked.map((link: ProcessRegulationLink) => {
            const reg = link.regulation;
            if (!reg) return null;
            const cc = COMPLIANCE_STATUS_COLOURS[reg.complianceStatus];
            return (
              <div
                key={link.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 transition-colors"
              >
                {/* Compliance dot */}
                <span
                  className={cn("h-2.5 w-2.5 rounded-full shrink-0", cc?.dot ?? "bg-gray-300")}
                />
                <EntityLink type="regulation" id={reg.id} reference={reg.reference} />
                <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">
                  {reg.shortName ?? reg.name}
                </span>
                {/* Compliance status badge */}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                    cc?.bg,
                    cc?.text,
                  )}
                >
                  {COMPLIANCE_STATUS_LABELS[reg.complianceStatus]}
                </span>
                {/* Unlink */}
                {isCCRO && (
                  <button
                    onClick={() => handleUnlink(reg.id)}
                    disabled={unlinking === reg.id}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50"
                    title="Unlink regulation"
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
