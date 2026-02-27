"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Save, Pencil, X } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { RiskCategoryDB } from "@/lib/types";
import { toast } from "sonner";

export default function CategoryEditor() {
  const riskCategories = useAppStore((s) => s.riskCategories);
  const setRiskCategories = useAppStore((s) => s.setRiskCategories);
  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [addingToL1, setAddingToL1] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteSubcatConfirmOpen, setDeleteSubcatConfirmOpen] = useState(false);
  const [pendingDeleteSubcatId, setPendingDeleteSubcatId] = useState<string | null>(null);

  function toggleL1(id: string) {
    setExpandedL1((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEdit(cat: RiskCategoryDB) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDefinition(cat.definition);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDefinition("");
  }

  async function saveEdit(cat: RiskCategoryDB) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await api("/api/risk-categories", {
        method: "PUT",
        body: { id: cat.id, name: editName.trim(), definition: editDefinition.trim() },
      });
      // Update local state
      setRiskCategories(
        riskCategories.map((l1) => {
          if (l1.id === cat.id) return { ...l1, name: editName.trim(), definition: editDefinition.trim() };
          return {
            ...l1,
            children: l1.children?.map((l2) =>
              l2.id === cat.id ? { ...l2, name: editName.trim(), definition: editDefinition.trim() } : l2
            ),
          };
        })
      );
      toast.success("Category updated");
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  async function addSubcategory(parentId: string) {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await api<RiskCategoryDB>("/api/risk-categories", {
        method: "POST",
        body: { parentId, name: newName.trim(), definition: newDefinition.trim() },
      });
      setRiskCategories(
        riskCategories.map((l1) =>
          l1.id === parentId
            ? { ...l1, children: [...(l1.children ?? []), created] }
            : l1
        )
      );
      toast.success("Subcategory added");
      setAddingToL1(null);
      setNewName("");
      setNewDefinition("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add subcategory");
    } finally {
      setSaving(false);
    }
  }

  function deleteSubcategory(id: string) {
    setPendingDeleteSubcatId(id);
    setDeleteSubcatConfirmOpen(true);
  }

  async function deleteSubcategoryConfirmed() {
    if (!pendingDeleteSubcatId) return;
    setDeleteSubcatConfirmOpen(false);
    const id = pendingDeleteSubcatId;
    setPendingDeleteSubcatId(null);
    setSaving(true);
    try {
      await api(`/api/risk-categories?id=${id}`, { method: "DELETE" });
      setRiskCategories(
        riskCategories.map((l1) => ({
          ...l1,
          children: l1.children?.filter((l2) => l2.id !== id),
        }))
      );
      toast.success("Subcategory deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete subcategory");
    } finally {
      setSaving(false);
    }
  }

  if (riskCategories.length === 0) {
    return (
      <div className="bento-card text-center py-8 text-gray-500">
        <p className="text-sm">No risk categories found. Run the database seed to populate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-updraft-deep font-poppins">Risk Categories</h2>
        <p className="text-sm text-gray-500 mt-1">
          Edit Level 1 and Level 2 risk category names and definitions. Changes are saved to the database.
        </p>
      </div>

      <div className="space-y-2">
        {riskCategories.map((l1) => (
          <div key={l1.id} className="bento-card overflow-hidden">
            {/* L1 Header */}
            <button
              type="button"
              onClick={() => toggleL1(l1.id)}
              className="flex w-full items-center gap-3 text-left"
            >
              {expandedL1.has(l1.id) ? (
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              ) : (
                <ChevronRight size={16} className="text-gray-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {editingId === l1.id ? (
                  <div onClick={(e) => e.stopPropagation()} className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-semibold focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
                    />
                    <textarea
                      value={editDefinition}
                      onChange={(e) => setEditDefinition(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(l1)}
                        disabled={saving}
                        className="inline-flex items-center gap-1 rounded-md bg-updraft-bright-purple px-2.5 py-1 text-xs font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50"
                      >
                        <Save size={12} /> Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-gray-900">{l1.name}</span>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{l1.definition}</p>
                  </>
                )}
              </div>
              {editingId !== l1.id && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); startEdit(l1); }}
                  className="shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit category"
                >
                  <Pencil size={14} />
                </button>
              )}
              <span className="shrink-0 text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {l1.children?.length ?? 0} sub
              </span>
            </button>

            {/* L2 Children */}
            {expandedL1.has(l1.id) && (
              <div className="mt-3 ml-6 space-y-2 border-l-2 border-updraft-pale-purple/40 pl-4">
                {l1.children?.map((l2) => (
                  <div key={l2.id} className="group">
                    {editingId === l2.id ? (
                      <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
                        />
                        <textarea
                          value={editDefinition}
                          onChange={(e) => setEditDefinition(e.target.value)}
                          rows={2}
                          className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(l2)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded-md bg-updraft-bright-purple px-2.5 py-1 text-xs font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50"
                          >
                            <Save size={12} /> Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <X size={12} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{l2.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{l2.definition}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(l2)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSubcategory(l2.id)}
                            disabled={saving}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add subcategory form */}
                {addingToL1 === l1.id ? (
                  <div className="space-y-2 bg-updraft-pale-purple/10 rounded-lg p-3">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Subcategory name"
                      className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
                      autoFocus
                    />
                    <textarea
                      value={newDefinition}
                      onChange={(e) => setNewDefinition(e.target.value)}
                      placeholder="Definition (optional)"
                      rows={2}
                      className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addSubcategory(l1.id)}
                        disabled={saving || !newName.trim()}
                        className="inline-flex items-center gap-1 rounded-md bg-updraft-bright-purple px-2.5 py-1 text-xs font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50"
                      >
                        <Plus size={12} /> Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingToL1(null); setNewName(""); setNewDefinition(""); }}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingToL1(l1.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-updraft-bright-purple hover:text-updraft-deep transition-colors mt-1"
                  >
                    <Plus size={13} /> Add subcategory
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={deleteSubcatConfirmOpen}
        onClose={() => setDeleteSubcatConfirmOpen(false)}
        onConfirm={deleteSubcategoryConfirmed}
        title="Delete subcategory"
        message="Are you sure you want to delete this subcategory? This action cannot be undone."
        confirmLabel="Delete"
        loading={saving}
      />
    </div>
  );
}
