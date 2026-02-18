"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Policy, PolicyObligation } from "@/lib/types";
import { cn } from "@/lib/utils";
import ObligationFormDialog from "./ObligationFormDialog";

const CATEGORY_COLOURS: string[] = [
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-green-500",
  "border-l-amber-500",
  "border-l-red-500",
  "border-l-teal-500",
  "border-l-indigo-500",
  "border-l-rose-500",
];

const CATEGORY_BG: string[] = [
  "bg-blue-50",
  "bg-purple-50",
  "bg-green-50",
  "bg-amber-50",
  "bg-red-50",
  "bg-teal-50",
  "bg-indigo-50",
  "bg-rose-50",
];

interface Props {
  policy: Policy;
  onUpdate: (policy: Policy) => void;
}

export default function PolicyObligationsTab({ policy, onUpdate }: Props) {
  const currentUser = useAppStore((s) => s.currentUser);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [showForm, setShowForm] = useState(false);
  const [editObl, setEditObl] = useState<PolicyObligation | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group by category
  const obligations = useMemo(() => policy.obligations ?? [], [policy.obligations]);
  const grouped = useMemo(() => {
    const map = new Map<string, PolicyObligation[]>();
    for (const obl of obligations) {
      const cat = obl.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(obl);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [obligations]);

  // Coverage stats
  const coverageStats = useMemo(() => {
    let withControls = 0;
    let withoutControls = 0;
    for (const obl of obligations) {
      if (obl.controlRefs.length > 0) withControls++;
      else withoutControls++;
    }
    return { withControls, withoutControls, total: obligations.length };
  }, [obligations]);

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function handleSave(data: Omit<PolicyObligation, "id" | "reference" | "policyId" | "createdAt" | "updatedAt">) {
    try {
      if (editObl) {
        // Update
        const updated = await api<PolicyObligation>(`/api/policies/${policy.id}/obligations/${editObl.id}`, {
          method: "PATCH",
          body: data,
        });
        onUpdate({
          ...policy,
          obligations: obligations.map((o) => (o.id === editObl.id ? { ...o, ...updated } : o)),
        });
        toast.success("Obligation updated");
      } else {
        // Create
        const created = await api<PolicyObligation>(`/api/policies/${policy.id}/obligations`, {
          method: "POST",
          body: data,
        });
        onUpdate({
          ...policy,
          obligations: [...obligations, created],
        });
        toast.success("Obligation added");
      }
    } catch {
      toast.error("Failed to save obligation");
    }
    setEditObl(null);
  }

  async function handleDelete(oblId: string) {
    try {
      await api(`/api/policies/${policy.id}/obligations/${oblId}`, { method: "DELETE" });
      onUpdate({
        ...policy,
        obligations: obligations.filter((o) => o.id !== oblId),
      });
      toast.success("Obligation removed");
    } catch {
      toast.error("Failed to delete obligation");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">{obligations.length} obligation{obligations.length !== 1 ? "s" : ""} across {grouped.length} categor{grouped.length !== 1 ? "ies" : "y"}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] text-green-600">
              <CheckCircle2 size={10} />
              {coverageStats.withControls} with controls
            </span>
            {coverageStats.withoutControls > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                <AlertCircle size={10} />
                {coverageStats.withoutControls} without controls
              </span>
            )}
          </div>
        </div>
        {isCCRO && (
          <button onClick={() => { setEditObl(null); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-deep text-white px-3 py-1.5 text-xs font-medium hover:bg-updraft-bar transition-colors">
            <Plus size={12} /> Add Obligation
          </button>
        )}
      </div>

      {/* Grouped List */}
      {grouped.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No obligations added yet</p>
      ) : (
        <div className="space-y-2">
          {grouped.map(([category, obls], catIndex) => {
            const isExpanded = expandedCategories.has(category);
            const borderColour = CATEGORY_COLOURS[catIndex % CATEGORY_COLOURS.length];
            const headerBg = CATEGORY_BG[catIndex % CATEGORY_BG.length];
            const categoryControlled = obls.filter(o => o.controlRefs.length > 0).length;

            return (
              <div key={category} className={cn("rounded-xl border border-gray-200 bg-white overflow-hidden border-l-4", borderColour)}>
                <button
                  onClick={() => toggleCategory(category)}
                  className={cn("flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors", isExpanded && headerBg)}
                >
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  <span className="text-sm font-semibold text-gray-800">{category}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {/* Coverage indicator */}
                    {categoryControlled === obls.length ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600">
                        <CheckCircle2 size={10} /> all mapped
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                        {categoryControlled}/{obls.length} mapped
                      </span>
                    )}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{obls.length}</span>
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {obls.map((obl) => {
                      const hasControls = obl.controlRefs.length > 0;
                      return (
                        <div key={obl.id} className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            {/* Coverage indicator dot */}
                            <span className={cn(
                              "mt-1 w-2 h-2 rounded-full shrink-0",
                              hasControls ? "bg-green-500" : "bg-amber-400"
                            )} />
                            <span className="font-mono text-[10px] font-bold text-updraft-deep mt-0.5 shrink-0">{obl.reference}</span>
                            <p className="flex-1 text-xs text-gray-700">{obl.description}</p>
                            {isCCRO && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => { setEditObl(obl); setShowForm(true); }}
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() => handleDelete(obl.id)}
                                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Regulation & Control chips */}
                          {(obl.regulationRefs.length > 0 || obl.controlRefs.length > 0) && (
                            <div className="flex flex-wrap gap-1 mt-2 pl-6">
                              {obl.regulationRefs.map((ref) => (
                                <span key={ref} className="rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-[10px] font-medium border border-blue-100">{ref}</span>
                              ))}
                              {obl.controlRefs.map((ref) => (
                                <span key={ref} className="rounded-full bg-purple-50 text-purple-600 px-2 py-0.5 text-[10px] font-medium border border-purple-100">{ref}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ObligationFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditObl(null); }}
        onSave={handleSave}
        policy={policy}
        editObligation={editObl}
      />
    </div>
  );
}
