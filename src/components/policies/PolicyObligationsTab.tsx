"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Policy, PolicyObligation } from "@/lib/types";
import ObligationFormDialog from "./ObligationFormDialog";

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
        <p className="text-sm text-gray-500">{obligations.length} obligation{obligations.length !== 1 ? "s" : ""} across {grouped.length} categor{grouped.length !== 1 ? "ies" : "y"}</p>
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
          {grouped.map(([category, obls]) => {
            const isExpanded = expandedCategories.has(category);
            return (
              <div key={category} className="rounded-lg border border-gray-200 bg-white">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  <span className="text-sm font-semibold text-gray-800">{category}</span>
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{obls.length}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {obls.map((obl) => (
                      <div key={obl.id} className="px-4 py-3">
                        <div className="flex items-start gap-2">
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
                          <div className="flex flex-wrap gap-1 mt-2 pl-14">
                            {obl.regulationRefs.map((ref) => (
                              <span key={ref} className="rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-[10px] font-medium">{ref}</span>
                            ))}
                            {obl.controlRefs.map((ref) => (
                              <span key={ref} className="rounded-full bg-purple-50 text-purple-600 px-2 py-0.5 text-[10px] font-medium">{ref}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
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
