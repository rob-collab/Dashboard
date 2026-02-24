"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { RegulatoryEvent, RegCalEventType } from "@/lib/types";
import { REG_CAL_TYPE_LABELS, REG_CAL_TYPE_COLOURS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Calendar, Plus, X, ExternalLink, Trash2 } from "lucide-react";

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ragColour(days: number): { dot: string; row: string; label: string } {
  if (days < 0) return { dot: "bg-gray-400", row: "border-gray-200", label: "Passed" };
  if (days <= 14) return { dot: "bg-red-500", row: "border-red-200 bg-red-50/40", label: `${days}d` };
  if (days <= 30) return { dot: "bg-amber-400", row: "border-amber-200 bg-amber-50/30", label: `${days}d` };
  return { dot: "bg-green-500", row: "border-gray-100", label: `${days}d` };
}

const EVENT_TYPES: RegCalEventType[] = ["DEADLINE", "SUBMISSION", "REVIEW", "CONSULTATION", "INTERNAL_DEADLINE"];
const SOURCES = ["FCA", "PRA", "DORA", "INTERNAL", "OTHER"];

export default function RegulatoryCalendarWidget() {
  const regulatoryEvents = useAppStore((s) => s.regulatoryEvents);
  const addRegulatoryEvent = useAppStore((s) => s.addRegulatoryEvent);
  const updateRegulatoryEvent = useAppStore((s) => s.updateRegulatoryEvent);
  const deleteRegulatoryEvent = useAppStore((s) => s.deleteRegulatoryEvent);
  const currentUser = useAppStore((s) => s.currentUser);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    type: "DEADLINE" as RegCalEventType,
    source: "FCA",
    url: "",
    alertDays: 30,
  });

  // Show next 8 events, sorted by date
  const upcoming = [...regulatoryEvents]
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 8);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api<RegulatoryEvent>("/api/or/regulatory-calendar", {
        method: "POST",
        body: {
          ...form,
          description: form.description || null,
          url: form.url || null,
        },
      });
      addRegulatoryEvent(created);
      setShowForm(false);
      setForm({ title: "", description: "", eventDate: "", type: "DEADLINE", source: "FCA", url: "", alertDays: 30 });
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api(`/api/or/regulatory-calendar/${id}`, { method: "DELETE" });
      deleteRegulatoryEvent(id);
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  }

  void updateRegulatoryEvent; // available for future inline editing

  return (
    <div className="bento-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-updraft-bright-purple" />
          <h3 className="font-poppins font-semibold text-gray-900 text-sm">Regulatory Calendar</h3>
        </div>
        {isCCRO && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-updraft-deep hover:text-updraft-bar"
          >
            {showForm ? <X size={12} /> : <Plus size={12} />}
            {showForm ? "Cancel" : "Add"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Date *</label>
              <input required type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RegCalEventType })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{REG_CAL_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Source</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Alert (days before)</label>
              <input type="number" min={1} max={365} value={form.alertDays} onChange={(e) => setForm({ ...form, alertDays: parseInt(e.target.value) || 30 })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">URL (optional)</label>
              <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">{saving ? "Saving…" : "Add Event"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      {upcoming.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No regulatory events in calendar.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((ev) => {
            const days = daysUntil(ev.eventDate);
            const rag = ragColour(days);
            const tc = REG_CAL_TYPE_COLOURS[ev.type];
            return (
              <div key={ev.id} className={cn("flex items-center gap-3 p-3 rounded-xl border", rag.row)}>
                <span className={cn("w-2 h-2 rounded-full shrink-0", rag.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">{ev.title}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", tc.bg, tc.text)}>
                      {REG_CAL_TYPE_LABELS[ev.type]}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0 font-mono">{ev.source}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(ev.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {days >= 0 && (
                      <span className={cn("ml-2 font-medium", days <= 14 ? "text-red-600" : days <= 30 ? "text-amber-600" : "text-green-600")}>
                        {rag.label}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {ev.url && (
                    <a href={ev.url} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-updraft-deep">
                      <ExternalLink size={12} />
                    </a>
                  )}
                  {isCCRO && (
                    <button
                      onClick={() => handleDelete(ev.id)}
                      disabled={deletingId === ev.id}
                      className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
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
