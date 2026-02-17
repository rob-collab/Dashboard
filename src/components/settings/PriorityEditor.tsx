"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { PriorityDefinition } from "@/lib/types";
import { toast } from "sonner";

const PRIORITY_COLOURS: Record<string, string> = {
  P1: "border-l-red-500 bg-red-50/50",
  P2: "border-l-amber-500 bg-amber-50/50",
  P3: "border-l-slate-400 bg-slate-50/50",
};

export default function PriorityEditor() {
  const priorityDefinitions = useAppStore((s) => s.priorityDefinitions);
  const setPriorityDefinitions = useAppStore((s) => s.setPriorityDefinitions);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(def: PriorityDefinition) {
    setEditingCode(def.code);
    setEditLabel(def.label);
    setEditDescription(def.description ?? "");
  }

  function cancelEdit() {
    setEditingCode(null);
    setEditLabel("");
    setEditDescription("");
  }

  async function saveEdit(code: string) {
    if (!editLabel.trim()) return;
    setSaving(true);
    try {
      await api("/api/priority-definitions", {
        method: "PUT",
        body: { code, label: editLabel.trim(), description: editDescription.trim() || null },
      });
      setPriorityDefinitions(
        priorityDefinitions.map((d) =>
          d.code === code
            ? { ...d, label: editLabel.trim(), description: editDescription.trim() || null }
            : d
        )
      );
      toast.success("Priority definition updated");
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update priority definition");
    } finally {
      setSaving(false);
    }
  }

  if (priorityDefinitions.length === 0) {
    return (
      <div className="bento-card text-center py-8 text-gray-500">
        <p className="text-sm">No priority definitions found. Run the database seed to populate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-updraft-deep font-poppins">Action Priorities</h2>
        <p className="text-sm text-gray-500 mt-1">
          Edit the label and description for each action priority level. Changes are saved to the database.
        </p>
      </div>

      <div className="space-y-3">
        {priorityDefinitions.map((def) => (
          <div
            key={def.code}
            className={`bento-card border-l-4 ${PRIORITY_COLOURS[def.code] ?? "border-l-gray-300"}`}
          >
            {editingCode === def.code ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-800 shrink-0 w-8">{def.code}</span>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Label (e.g. Critical)"
                    className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-medium focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
                    autoFocus
                  />
                </div>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(def.code)}
                    disabled={saving || !editLabel.trim()}
                    className="inline-flex items-center gap-1 rounded-md bg-updraft-bright-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50"
                  >
                    <Save size={12} /> Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(def)}
                className="flex w-full items-start gap-3 text-left group"
              >
                <span className="text-sm font-bold text-gray-800 shrink-0 w-8">{def.code}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-updraft-bright-purple transition-colors">
                    {def.label}
                  </p>
                  {def.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{def.description}</p>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
