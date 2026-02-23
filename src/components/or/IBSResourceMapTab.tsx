"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import type { IBSResourceMap, ResourceCategory } from "@/lib/types";
import { RESOURCE_CATEGORY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES: ResourceCategory[] = ["PEOPLE", "PROCESSES", "TECHNOLOGY", "FACILITIES", "INFORMATION"];

const CATEGORY_HINTS: Record<ResourceCategory, string> = {
  PEOPLE: "List roles, teams and named individuals essential to delivering this IBS. Include deputies for key roles.",
  PROCESSES: "The process links in the Process Library tab populate this automatically. Add any manual notes here.",
  TECHNOLOGY: "List systems, platforms and applications. Include criticality ratings and fallback options.",
  FACILITIES: "List primary and fallback locations. Include address, capacity and accessibility requirements.",
  INFORMATION: "List data assets required. Include classification, retention requirements and recovery priorities.",
};

type ResourceMapRow = Omit<IBSResourceMap, "id"> & { id: string | null };

export default function IBSResourceMapTab({ ibsId, isCCRO }: { ibsId: string; isCCRO: boolean }) {
  const [maps, setMaps] = useState<ResourceMapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ResourceCategory | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<IBSResourceMap[]>(`/api/ibs/${ibsId}/resource-map`)
      .then((data) => setMaps(data as ResourceMapRow[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ibsId]);

  function getContent(cat: ResourceCategory): string {
    const m = maps.find((m) => m.category === cat);
    if (!m) return "";
    const c = m.content as { text?: string };
    return c.text ?? "";
  }

  function isFilled(cat: ResourceCategory): boolean {
    return getContent(cat).trim().length > 0;
  }

  function startEdit(cat: ResourceCategory) {
    setEditText(getContent(cat));
    setEditing(cat);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await api<IBSResourceMap>(`/api/ibs/${ibsId}/resource-map`, {
        method: "PATCH",
        body: { category: editing, content: { text: editText } },
      });
      setMaps((prev) =>
        prev.map((m) => (m.category === editing ? { ...m, ...updated, id: updated.id ?? m.id } : m))
      );
      setEditing(null);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-5 text-sm text-gray-400">Loading resource map…</div>;

  const filledCount = CATEGORIES.filter(isFilled).length;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900 text-sm">PS21/3 Resource Categories</h3>
          <p className="text-xs text-gray-400 mt-0.5">{filledCount}/5 categories documented</p>
        </div>
        <div className={cn("text-xs font-medium px-2 py-1 rounded-full", filledCount === 5 ? "bg-green-100 text-green-700" : filledCount >= 3 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600")}>
          {filledCount === 5 ? "Complete" : `${5 - filledCount} remaining`}
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const filled = isFilled(cat);
        const isOpen = editing === cat;
        const text = getContent(cat);

        return (
          <div key={cat} className={cn("border rounded-xl overflow-hidden", filled ? "border-green-200" : "border-gray-200")}>
            <div className={cn("flex items-center justify-between px-4 py-3", filled ? "bg-green-50" : "bg-gray-50")}>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm", filled ? "text-green-600" : "text-gray-400")}>{filled ? "✓" : "○"}</span>
                <span className="text-sm font-medium text-gray-900">{RESOURCE_CATEGORY_LABELS[cat]}</span>
              </div>
              {isCCRO && !isOpen && (
                <button onClick={() => startEdit(cat)} className="text-xs text-updraft-deep hover:underline">{filled ? "Edit" : "Add"}</button>
              )}
            </div>

            {isOpen ? (
              <div className="p-4 space-y-3">
                <p className="text-xs text-gray-400">{CATEGORY_HINTS[cat]}</p>
                <textarea
                  rows={5}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y"
                  placeholder={`Document ${RESOURCE_CATEGORY_LABELS[cat].toLowerCase()} resources…`}
                />
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 text-xs bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            ) : text ? (
              <div className="p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-xs text-gray-400">{CATEGORY_HINTS[cat]}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
