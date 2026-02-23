"use client";

import { useState, useMemo } from "react";
import { FileText, Link2, Search, Unlink } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Process, ProcessPolicyLink } from "@/lib/types";
import { POLICY_STATUS_COLOURS, POLICY_STATUS_LABELS } from "@/lib/types";
import EntityLink from "@/components/common/EntityLink";

interface Props {
  process: Process;
  onUpdate: (p: Process) => void;
  isCCRO: boolean;
}

export default function ProcessPoliciesTab({ process, onUpdate, isCCRO }: Props) {
  const policies = useAppStore((s) => s.policies);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const linked = useMemo(() => process.policyLinks ?? [], [process.policyLinks]);
  const linkedIds = new Set(linked.map((l) => l.policyId));
  const unlinked = policies.filter((p) => !linkedIds.has(p.id));
  const filteredUnlinked = pickerSearch
    ? unlinked.filter(
        (p) =>
          p.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
          p.reference.toLowerCase().includes(pickerSearch.toLowerCase()),
      )
    : unlinked;

  async function handleLink(policyId: string) {
    setLinking(policyId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/policy-links`, {
        method: "POST",
        body: { policyId },
      });
      onUpdate(result);
      toast.success("Policy linked");
    } catch {
      toast.error("Failed to link policy");
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlink(policyId: string) {
    setUnlinking(policyId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/policy-links`, {
        method: "DELETE",
        body: { policyId },
      });
      onUpdate(result);
      toast.success("Policy unlinked");
    } catch {
      toast.error("Failed to unlink policy");
    } finally {
      setUnlinking(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {linked.length} linked polic{linked.length !== 1 ? "ies" : "y"}
        </p>
        {isCCRO && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Link2 size={12} /> Link Policy
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
              placeholder="Search unlinked policies…"
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUnlinked.length === 0 && (
              <p className="text-xs text-gray-400 py-2 text-center">No unlinked policies found</p>
            )}
            {filteredUnlinked.map((pol) => (
              <button
                key={pol.id}
                onClick={() => handleLink(pol.id)}
                disabled={linking === pol.id}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-white transition-colors disabled:opacity-50"
              >
                <div>
                  <span className="font-mono font-bold text-updraft-deep">{pol.reference}</span>
                  <span className="ml-2 text-gray-700">{pol.name}</span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                    POLICY_STATUS_COLOURS[pol.status].bg,
                    POLICY_STATUS_COLOURS[pol.status].text,
                  )}
                >
                  {POLICY_STATUS_LABELS[pol.status]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Linked list */}
      {linked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <FileText size={36} className="text-gray-200" />
          <p className="text-sm font-medium text-gray-500">
            No policies linked — this process has no governance mandate.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {linked.map((link: ProcessPolicyLink) => {
            const pol = link.policy;
            if (!pol) return null;
            return (
              <div
                key={link.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 transition-colors"
              >
                <EntityLink type="policy" id={pol.id} reference={pol.reference} />
                <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">{pol.name}</span>
                {/* Status badge */}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                    POLICY_STATUS_COLOURS[pol.status].bg,
                    POLICY_STATUS_COLOURS[pol.status].text,
                  )}
                >
                  {POLICY_STATUS_LABELS[pol.status]}
                </span>
                {/* Version pill */}
                <span className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-[10px] font-medium shrink-0">
                  v{pol.version}
                </span>
                {/* Unlink */}
                {isCCRO && (
                  <button
                    onClick={() => handleUnlink(pol.id)}
                    disabled={unlinking === pol.id}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50"
                    title="Unlink policy"
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
