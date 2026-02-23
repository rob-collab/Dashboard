"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { ImportantBusinessService } from "@/lib/types";
import { IBS_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import IBSDetailPanel from "./IBSDetailPanel";

export default function IBSRegistryTab({ isCCRO }: { isCCRO: boolean }) {
  const ibs = useAppStore((s) => s.ibs);
  const updateIbs = useAppStore((s) => s.updateIbs);
  const addIbs = useAppStore((s) => s.addIbs);
  const [selected, setSelected] = useState<ImportantBusinessService | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  // Sync selected from store
  const syncedSelected = selected ? (ibs.find((i) => i.id === selected.id) ?? selected) : null;

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await api<ImportantBusinessService>("/api/ibs", {
        method: "POST",
        body: { name: newName.trim() },
      });
      addIbs(created);
      setShowCreate(false);
      setNewName("");
      setSelected(created);
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  }

  function handleUpdate(updated: ImportantBusinessService) {
    updateIbs(updated.id, updated);
    setSelected(updated);
  }

  const activeIbs = ibs.filter((i) => i.status !== "RETIRED");

  return (
    <div className="flex h-full min-h-0">
      {/* List */}
      <div className={cn("flex-1 overflow-y-auto p-6 transition-all", syncedSelected ? "hidden lg:block lg:max-w-sm" : "")}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-poppins font-semibold text-gray-900 text-sm">{activeIbs.length} Active IBS Records</h2>
          {isCCRO && (
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 text-xs bg-updraft-deep text-white px-3 py-1.5 rounded-lg hover:bg-updraft-bar">
              <Plus size={12} /> New IBS
            </button>
          )}
        </div>

        {showCreate && (
          <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50 space-y-3">
            <p className="text-sm font-medium text-gray-900">Create IBS Record</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
              placeholder="IBS name (e.g. Retail Payments)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating || !newName.trim()} className="px-3 py-1.5 text-xs bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">
                {creating ? "Creating…" : "Create"}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}

        {ibs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No IBS records yet. Create your first above.</div>
        ) : (
          <div className="space-y-2">
            {ibs.map((item) => {
              const isRetired = item.status === "RETIRED";
              const processCount = item.processLinks?.length ?? 0;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={cn(
                    "w-full text-left border rounded-xl p-3 hover:shadow-sm transition-all",
                    syncedSelected?.id === item.id ? "border-updraft-bright-purple bg-updraft-pale-purple/10" : "border-gray-200 hover:border-gray-300",
                    isRetired && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-gray-400">{item.reference}</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{item.name}</p>
                      {item.smfAccountable && <p className="text-xs text-gray-400 mt-0.5">{item.smfAccountable}</p>}
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                      item.status === "ACTIVE" ? "bg-green-100 text-green-700" : item.status === "UNDER_REVIEW" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {IBS_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    {item.maxTolerableDisruptionHours != null && <span>MTD: {item.maxTolerableDisruptionHours}h</span>}
                    <span>{processCount} process{processCount !== 1 ? "es" : ""}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {syncedSelected && (
        <div className="w-full lg:w-[520px] shrink-0 border-l border-gray-200 overflow-y-auto bg-white">
          <IBSDetailPanel
            ibs={syncedSelected}
            onUpdate={handleUpdate}
            onClose={() => setSelected(null)}
            isCCRO={isCCRO}
          />
        </div>
      )}
    </div>
  );
}
