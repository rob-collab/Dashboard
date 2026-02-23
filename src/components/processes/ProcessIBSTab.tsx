"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, Building2, Link2, Search, Unlink } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Process, ProcessIBSLink } from "@/lib/types";
interface Props {
  process: Process;
  onUpdate: (p: Process) => void;
  isCCRO: boolean;
}

export default function ProcessIBSTab({ process, onUpdate, isCCRO }: Props) {
  const ibs = useAppStore((s) => s.ibs);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const linked = useMemo(() => process.ibsLinks ?? [], [process.ibsLinks]);
  const linkedIds = new Set(linked.map((l) => l.ibsId));
  const unlinked = ibs.filter((i) => !linkedIds.has(i.id));
  const filteredUnlinked = pickerSearch
    ? unlinked.filter(
        (i) =>
          i.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
          i.reference.toLowerCase().includes(pickerSearch.toLowerCase()),
      )
    : unlinked;

  async function handleLink(ibsId: string) {
    setLinking(ibsId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/ibs-links`, {
        method: "POST",
        body: { ibsId },
      });
      onUpdate(result);
      toast.success("IBS linked");
    } catch {
      toast.error("Failed to link IBS");
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlink(ibsId: string) {
    setUnlinking(ibsId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/ibs-links`, {
        method: "DELETE",
        body: { ibsId },
      });
      onUpdate(result);
      toast.success("IBS unlinked");
    } catch {
      toast.error("Failed to unlink IBS");
    } finally {
      setUnlinking(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {linked.length} linked Important Business Service{linked.length !== 1 ? "s" : ""}
        </p>
        {isCCRO && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Link2 size={12} /> Link IBS
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
              placeholder="Search Important Business Services…"
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUnlinked.length === 0 && (
              <p className="text-xs text-gray-400 py-2 text-center">
                No unlinked IBS records found
              </p>
            )}
            {filteredUnlinked.map((item) => (
              <button
                key={item.id}
                onClick={() => handleLink(item.id)}
                disabled={linking === item.id}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-white transition-colors disabled:opacity-50"
              >
                <div>
                  <span className="font-mono font-bold text-updraft-deep">{item.reference}</span>
                  <span className="ml-2 text-gray-700">{item.name}</span>
                </div>
                {item.maxTolerableDisruptionHours != null && (
                  <span className="rounded-full bg-updraft-pale-purple/30 text-updraft-deep px-2 py-0.5 text-[10px] font-medium shrink-0">
                    MTD: {item.maxTolerableDisruptionHours}h
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zero state (amber) */}
      {linked.length === 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-800 leading-relaxed">
            This process is not mapped to any Important Business Service. Under FCA PS21/3
            (Operational Resilience), CRITICAL and IMPORTANT processes supporting IBSs must be
            documented. Link this process to the relevant IBS.
          </p>
        </div>
      )}

      {/* Linked cards */}
      {linked.length > 0 && (
        <div className="space-y-2">
          {linked.map((link: ProcessIBSLink) => {
            const ibsRecord = link.ibs;
            if (!ibsRecord) return null;
            return (
              <div
                key={link.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <Building2 size={16} className="mt-0.5 shrink-0 text-updraft-bright-purple" />
                  <div className="flex-1 min-w-0">
                    {/* Reference + name */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-updraft-deep">
                        {ibsRecord.reference}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {ibsRecord.name}
                      </span>
                    </div>
                    {/* Metadata row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      <span className="text-[10px] text-gray-500">
                        <span className="font-semibold text-gray-600">MTD:</span>{" "}
                        {ibsRecord.maxTolerableDisruptionHours != null
                          ? `${ibsRecord.maxTolerableDisruptionHours}h`
                          : "—"}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        <span className="font-semibold text-gray-600">RTO:</span>{" "}
                        {ibsRecord.rtoHours != null ? `${ibsRecord.rtoHours}h` : "—"}
                      </span>
                      {ibsRecord.smfAccountable && (
                        <span className="text-[10px] text-gray-500">
                          <span className="font-semibold text-gray-600">SMF Accountable:</span>{" "}
                          {ibsRecord.smfAccountable}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Unlink */}
                  {isCCRO && (
                    <button
                      onClick={() => handleUnlink(ibsRecord.id)}
                      disabled={unlinking === ibsRecord.id}
                      className={cn(
                        "rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0",
                        unlinking === ibsRecord.id && "opacity-50",
                      )}
                      title="Unlink IBS"
                    >
                      <Unlink size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
