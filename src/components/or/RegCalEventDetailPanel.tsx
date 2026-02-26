"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, Edit3, Save, Trash2, ListChecks, Bell, User2, Calendar } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { RegulatoryEvent, RegCalEventType } from "@/lib/types";
import { REG_CAL_TYPE_LABELS, REG_CAL_TYPE_COLOURS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const EVENT_TYPES: RegCalEventType[] = ["DEADLINE", "SUBMISSION", "REVIEW", "CONSULTATION", "INTERNAL_DEADLINE"];
const SOURCES = ["FCA", "PRA", "DORA", "INTERNAL", "OTHER"];

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ragForDays(days: number) {
  if (days < 0)   return { textClass: "text-gray-400", label: "Passed", pillClass: "bg-gray-100 text-gray-500" };
  if (days <= 14) return { textClass: "text-red-600",   label: `${days}d`, pillClass: "bg-red-100 text-red-700" };
  if (days <= 30) return { textClass: "text-amber-600", label: `${days}d`, pillClass: "bg-amber-100 text-amber-700" };
  return            { textClass: "text-green-600", label: `${days}d`, pillClass: "bg-green-100 text-green-700" };
}

const EMPTY_FORM = {
  title: "",
  description: "",
  eventDate: "",
  type: "DEADLINE" as RegCalEventType,
  source: "FCA",
  url: "",
  alertDays: 30,
  owner: "",
};

interface RegCalEventDetailPanelProps {
  event: RegulatoryEvent | null;
  onClose: () => void;
}

export default function RegCalEventDetailPanel({ event, onClose }: RegCalEventDetailPanelProps) {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const updateRegulatoryEvent = useAppStore((s) => s.updateRegulatoryEvent);
  const deleteRegulatoryEvent = useAppStore((s) => s.deleteRegulatoryEvent);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset when event changes
  useEffect(() => {
    setEditing(false);
  }, [event?.id]);

  if (!event) return null;

  const days = daysUntil(event.eventDate);
  const rag = ragForDays(days);
  const tc = REG_CAL_TYPE_COLOURS[event.type];

  function startEdit() {
    setEditForm({
      title: event!.title,
      description: event!.description ?? "",
      eventDate: event!.eventDate.split("T")[0],
      type: event!.type,
      source: event!.source,
      url: event!.url ?? "",
      alertDays: event!.alertDays,
      owner: event!.owner ?? "",
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api<RegulatoryEvent>(`/api/or/regulatory-calendar/${event!.id}`, {
        method: "PATCH",
        body: {
          title: editForm.title,
          description: editForm.description || null,
          eventDate: editForm.eventDate,
          type: editForm.type,
          source: editForm.source,
          url: editForm.url || null,
          alertDays: editForm.alertDays,
          owner: editForm.owner || null,
        },
      });
      updateRegulatoryEvent(event!.id, updated);
      setEditing(false);
      toast.success("Event updated");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this regulatory event?")) return;
    setDeleting(true);
    try {
      await api(`/api/or/regulatory-calendar/${event!.id}`, { method: "DELETE" });
      deleteRegulatoryEvent(event!.id);
      onClose();
      toast.success("Event removed");
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setDeleting(false);
    }
  }

  const set = (patch: Partial<typeof EMPTY_FORM>) => setEditForm((f) => ({ ...f, ...patch }));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl sm:w-[480px]">
        {/* Purple gradient header */}
        <div className="bg-gradient-to-r from-updraft-deep to-updraft-bar px-6 py-4 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", tc.bg, tc.text)}>
                  {REG_CAL_TYPE_LABELS[event.type]}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/20 text-white">
                  {rag.label}
                </span>
                <span className="text-[10px] font-mono text-white/60">{event.source}</span>
              </div>
              <h2 className="font-poppins text-lg font-semibold text-white leading-tight">{event.title}</h2>
              <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                <Calendar size={11} />
                {new Date(event.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close panel">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {editing ? (
            /* Edit form */
            <div className="space-y-3">
              <p className="text-sm font-semibold text-updraft-deep">Edit Event</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Title *</label>
                  <input required value={editForm.title} onChange={(e) => set({ title: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Date *</label>
                  <input required type="date" value={editForm.eventDate} onChange={(e) => set({ eventDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                  <select value={editForm.type} onChange={(e) => set({ type: e.target.value as RegCalEventType })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30">
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{REG_CAL_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Source</label>
                  <select value={editForm.source} onChange={(e) => set({ source: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30">
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Owner</label>
                  <input value={editForm.owner} onChange={(e) => set({ owner: e.target.value })} placeholder="e.g. Sarah Chen"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Alert (days before)</label>
                  <input type="number" min={1} max={365} value={editForm.alertDays} onChange={(e) => set({ alertDays: parseInt(e.target.value) || 30 })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">URL (optional)</label>
                  <input type="url" value={editForm.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                  <textarea rows={3} value={editForm.description} onChange={(e) => set({ description: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={handleSave} disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">
                  <Save size={11} /> {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Read view */
            <div className="space-y-4">
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Full Date</span>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(event.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Days Remaining</span>
                  <p className={cn("text-sm font-bold", rag.textClass)}>{rag.label}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Alert Window</span>
                  <div className="flex items-center gap-1">
                    <Bell size={11} className="text-amber-500" />
                    <p className="text-sm font-medium text-gray-800">{event.alertDays} days before</p>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Source</span>
                  <p className="text-sm font-medium text-gray-800 font-mono">{event.source}</p>
                </div>
                {event.owner && (
                  <div className="col-span-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Owner</span>
                    <div className="flex items-center gap-1.5">
                      <User2 size={13} className="text-gray-400" />
                      <p className="text-sm font-medium text-gray-800">{event.owner}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{event.description}</p>
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                {event.url && (
                  <a href={event.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-updraft-deep border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                    <ExternalLink size={11} /> View source
                  </a>
                )}
                <button type="button" onClick={() => router.push("/actions")}
                  className="inline-flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                  <ListChecks size={11} /> View Actions
                </button>
                {isCCRO && (
                  <>
                    <button type="button" onClick={() => router.push(`/actions?newAction=true&metricName=${encodeURIComponent(event.title)}`)}
                      className="inline-flex items-center gap-1 text-xs text-updraft-bright-purple border border-updraft-bright-purple/30 rounded-lg px-3 py-1.5 hover:bg-updraft-pale-purple/10 transition-colors">
                      <ListChecks size={11} /> Create Action
                    </button>
                    <button type="button" onClick={startEdit}
                      className="inline-flex items-center gap-1 text-xs text-updraft-deep border border-updraft-bright-purple/20 rounded-lg px-3 py-1.5 hover:bg-updraft-pale-purple/10 transition-colors">
                      <Edit3 size={11} /> Edit
                    </button>
                    <button type="button" onClick={handleDelete} disabled={deleting}
                      className="inline-flex items-center gap-1 text-xs text-red-500 border border-red-100 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors ml-auto disabled:opacity-50">
                      <Trash2 size={11} /> {deleting ? "Removing..." : "Delete"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
