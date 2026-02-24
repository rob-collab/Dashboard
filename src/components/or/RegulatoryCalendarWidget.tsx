"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { RegulatoryEvent, RegCalEventType } from "@/lib/types";
import { REG_CAL_TYPE_LABELS, REG_CAL_TYPE_COLOURS } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Plus,
  X,
  ExternalLink,
  Trash2,
  ChevronDown,
  User2,
  Edit3,
  Save,
  ListChecks,
  Bell,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

// ── helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ragForDays(days: number) {
  if (days < 0)   return { dot: "bg-gray-300",  ring: "ring-gray-100",  textClass: "text-gray-400",  label: "Passed" };
  if (days <= 14) return { dot: "bg-red-500",   ring: "ring-red-200",   textClass: "text-red-600",   label: `${days}d` };
  if (days <= 30) return { dot: "bg-amber-400", ring: "ring-amber-200", textClass: "text-amber-600", label: `${days}d` };
  return            { dot: "bg-green-500",  ring: "ring-green-200", textClass: "text-green-600", label: `${days}d` };
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

const EVENT_TYPES: RegCalEventType[] = ["DEADLINE", "SUBMISSION", "REVIEW", "CONSULTATION", "INTERNAL_DEADLINE"];
const SOURCES = ["FCA", "PRA", "DORA", "INTERNAL", "OTHER"];

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

// ── main component ────────────────────────────────────────────────────────────

export default function RegulatoryCalendarWidget() {
  const router = useRouter();
  const regulatoryEvents = useAppStore((s) => s.regulatoryEvents);
  const addRegulatoryEvent = useAppStore((s) => s.addRegulatoryEvent);
  const updateRegulatoryEvent = useAppStore((s) => s.updateRegulatoryEvent);
  const deleteRegulatoryEvent = useAppStore((s) => s.deleteRegulatoryEvent);
  const currentUser = useAppStore((s) => s.currentUser);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const sorted = useMemo(
    () => [...regulatoryEvents].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()),
    [regulatoryEvents]
  );

  const upcoming = sorted.filter((e) => daysUntil(e.eventDate) >= 0);
  const past     = sorted.filter((e) => daysUntil(e.eventDate) < 0).reverse();

  const groupedUpcoming = useMemo(() => {
    const groups = new Map<string, RegulatoryEvent[]>();
    for (const ev of upcoming) {
      const key = monthKey(ev.eventDate);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ev);
    }
    return Array.from(groups.entries());
  }, [upcoming]);

  // Month chips for the header
  const monthChips = useMemo(() => {
    return groupedUpcoming.map(([key, events]) => {
      const minDays = Math.min(...events.map((e) => daysUntil(e.eventDate)));
      const rag = ragForDays(minDays);
      return { key, label: monthLabel(key).split(" ")[0] + " '" + monthLabel(key).split(" ")[1].slice(2), count: events.length, dot: rag.dot };
    });
  }, [groupedUpcoming]);

  // ── handlers ──────────────────────────────────────────────────────────────

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); setEditingId(null); }
    else { setExpandedId(id); setEditingId(null); }
  }

  function startEdit(ev: RegulatoryEvent) {
    setEditForm({
      title: ev.title,
      description: ev.description ?? "",
      eventDate: ev.eventDate.split("T")[0],
      type: ev.type,
      source: ev.source,
      url: ev.url ?? "",
      alertDays: ev.alertDays,
      owner: ev.owner ?? "",
    });
    setEditingId(ev.id);
  }

  async function handleSave(id: string) {
    setSaving(true);
    try {
      const updated = await api<RegulatoryEvent>(`/api/or/regulatory-calendar/${id}`, {
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
      updateRegulatoryEvent(id, updated);
      setEditingId(null);
      toast.success("Event updated");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api(`/api/or/regulatory-calendar/${id}`, { method: "DELETE" });
      deleteRegulatoryEvent(id);
      if (expandedId === id) setExpandedId(null);
      toast.success("Event removed");
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const created = await api<RegulatoryEvent>("/api/or/regulatory-calendar", {
        method: "POST",
        body: {
          title: addForm.title,
          description: addForm.description || null,
          eventDate: addForm.eventDate,
          type: addForm.type,
          source: addForm.source,
          url: addForm.url || null,
          alertDays: addForm.alertDays,
          owner: addForm.owner || null,
        },
      });
      addRegulatoryEvent(created);
      setShowAddForm(false);
      setAddForm(EMPTY_FORM);
      toast.success("Event added");
    } catch {
      toast.error("Failed to add event");
    } finally {
      setAdding(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-updraft-bright-purple" />
          <h3 className="font-poppins font-semibold text-gray-900 text-base">Regulatory Calendar</h3>
          {upcoming.length > 0 && (
            <span className="text-xs bg-updraft-pale-purple/30 text-updraft-deep px-2 py-0.5 rounded-full font-medium">
              {upcoming.length} upcoming
            </span>
          )}
        </div>
        {isCCRO && (
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs bg-updraft-deep text-white px-3 py-1.5 rounded-lg hover:bg-updraft-bar transition-colors"
          >
            {showAddForm ? <X size={12} /> : <Plus size={12} />}
            {showAddForm ? "Cancel" : "Add Event"}
          </button>
        )}
      </div>

      {/* Month summary chips */}
      {monthChips.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {monthChips.map(({ key, label, count, dot }) => (
            <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-sm">
              <span className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
              {label}
              <span className="bg-gray-100 text-gray-500 rounded-full px-1.5 py-px text-[10px] font-semibold">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Add Event Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="border border-updraft-bright-purple/20 rounded-xl p-4 bg-updraft-pale-purple/10 space-y-3">
          <p className="text-sm font-semibold text-updraft-deep">New Regulatory Event</p>
          <EventFormFields form={addForm} onChange={setAddForm} />
          <div className="flex gap-2">
            <button type="submit" disabled={adding} className="px-3 py-1.5 text-xs bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">
              {adding ? "Adding…" : "Add Event"}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      {/* Upcoming events — vertical timeline grouped by month */}
      {upcoming.length === 0 && !showAddForm ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          <Calendar size={32} className="mx-auto mb-3 text-gray-200" />
          <p>No upcoming regulatory events.</p>
          {isCCRO && <p className="text-xs mt-1">Use &ldquo;Add Event&rdquo; to create the first one.</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedUpcoming.map(([key, events]) => (
            <div key={key}>
              {/* Month divider */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-updraft-bright-purple/20 to-transparent" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-updraft-bright-purple/60 px-2">
                  {monthLabel(key).toUpperCase()}
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-updraft-bright-purple/20 to-transparent" />
              </div>

              {/* Timeline events */}
              <div className="relative pl-6 space-y-3">
                {/* Spine */}
                <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gradient-to-b from-updraft-bright-purple/30 to-updraft-pale-purple/10" />

                {events.map((ev) => {
                  const days = daysUntil(ev.eventDate);
                  const rag = ragForDays(days);
                  const tc = REG_CAL_TYPE_COLOURS[ev.type];
                  const isExpanded = expandedId === ev.id;
                  const isEditing = editingId === ev.id;

                  return (
                    <div key={ev.id} className="relative">
                      {/* Node dot */}
                      <div className={cn(
                        "absolute -left-6 top-3.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ring-2",
                        rag.dot, rag.ring
                      )} />

                      {/* Card */}
                      <div className={cn(
                        "rounded-xl border transition-all duration-200",
                        isExpanded ? "border-updraft-bright-purple/40 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      )}>
                        {/* Header row */}
                        <button type="button" onClick={() => toggleExpand(ev.id)} className="w-full flex items-center gap-3 p-3 text-left">
                          {/* Date block */}
                          <div className="shrink-0 text-center w-10">
                            <p className="text-[10px] text-gray-400 leading-none">
                              {new Date(ev.eventDate).toLocaleDateString("en-GB", { month: "short" })}
                            </p>
                            <p className="text-xl font-bold text-gray-900 leading-tight font-poppins">
                              {new Date(ev.eventDate).getDate()}
                            </p>
                          </div>
                          <div className="w-px h-9 bg-gray-100 shrink-0" />
                          {/* Title + meta */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", tc.bg, tc.text)}>
                                {REG_CAL_TYPE_LABELS[ev.type]}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">{ev.source}</span>
                              {ev.owner && (
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                  <User2 size={9} /> {ev.owner}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Days remaining */}
                          <div className="shrink-0 flex items-center gap-2">
                            <span className={cn("text-xs font-bold tabular-nums", rag.textClass)}>{rag.label}</span>
                            <ChevronDown size={14} className={cn("text-gray-400 transition-transform duration-200", isExpanded && "rotate-180")} />
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-updraft-bright-purple/10 pt-3 space-y-3">
                            {isEditing ? (
                              <>
                                <EventFormFields form={editForm} onChange={setEditForm} />
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => handleSave(ev.id)} disabled={saving}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">
                                    <Save size={11} /> {saving ? "Saving…" : "Save Changes"}
                                  </button>
                                  <button type="button" onClick={() => setEditingId(null)}
                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                                    Cancel
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Full Date</p>
                                    <p className="text-gray-800 font-medium">
                                      {new Date(ev.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Alert Window</p>
                                    <div className="flex items-center gap-1">
                                      <Bell size={11} className="text-amber-500" />
                                      <p className="text-gray-800 font-medium">{ev.alertDays} days before</p>
                                    </div>
                                  </div>
                                  {ev.owner && (
                                    <div>
                                      <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Owner</p>
                                      <div className="flex items-center gap-1">
                                        <User2 size={11} className="text-gray-400" />
                                        <p className="text-gray-800 font-medium">{ev.owner}</p>
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Source</p>
                                    <p className="text-gray-800 font-medium font-mono">{ev.source}</p>
                                  </div>
                                </div>

                                {ev.description && (
                                  <div>
                                    <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Description</p>
                                    <p className="text-sm text-gray-700 leading-relaxed">{ev.description}</p>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
                                  {ev.url && (
                                    <a href={ev.url} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-updraft-deep hover:underline">
                                      <ExternalLink size={11} /> View source
                                    </a>
                                  )}
                                  <button type="button" onClick={() => router.push("/actions")}
                                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-updraft-deep border border-gray-200 rounded-lg px-2 py-1 hover:border-updraft-bright-purple/30 transition-colors">
                                    <ListChecks size={11} /> View Actions
                                  </button>
                                  {isCCRO && (
                                    <>
                                      <button type="button" onClick={() => startEdit(ev)}
                                        className="inline-flex items-center gap-1 text-xs text-updraft-deep border border-updraft-bright-purple/20 rounded-lg px-2 py-1 hover:bg-updraft-pale-purple/10 transition-colors">
                                        <Edit3 size={11} /> Edit
                                      </button>
                                      <button type="button" onClick={() => handleDelete(ev.id)} disabled={deletingId === ev.id}
                                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-100 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors ml-auto disabled:opacity-50">
                                        <Trash2 size={11} /> {deletingId === ev.id ? "Removing…" : "Delete"}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past events (collapsible) */}
      {past.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2">
            <Clock size={12} />
            {showPast ? "Hide" : "Show"} past events ({past.length})
            <ChevronDown size={12} className={cn("transition-transform", showPast && "rotate-180")} />
          </button>

          {showPast && (
            <div className="mt-3 relative pl-6 space-y-2">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-100" />
              {past.map((ev) => {
                const tc = REG_CAL_TYPE_COLOURS[ev.type];
                const isExpanded = expandedId === ev.id;
                return (
                  <div key={ev.id} className="relative">
                    <div className="absolute -left-6 top-3.5 w-3 h-3 rounded-full bg-gray-200 border-2 border-white shadow-sm" />
                    <div className={cn("rounded-xl border transition-all",
                      isExpanded ? "border-gray-300 shadow-sm bg-white" : "border-gray-100 bg-gray-50/50")}>
                      <button type="button" onClick={() => toggleExpand(ev.id)}
                        className="w-full flex items-center gap-3 p-3 text-left opacity-60 hover:opacity-80">
                        <div className="shrink-0 text-center w-10">
                          <p className="text-[10px] text-gray-400">{new Date(ev.eventDate).toLocaleDateString("en-GB", { month: "short" })}</p>
                          <p className="text-base font-bold text-gray-500">{new Date(ev.eventDate).getDate()}</p>
                        </div>
                        <div className="w-px h-6 bg-gray-200 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 truncate">{ev.title}</p>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", tc.bg, tc.text)}>
                            {REG_CAL_TYPE_LABELS[ev.type]}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(ev.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <ChevronDown size={13} className={cn("text-gray-300 transition-transform shrink-0", isExpanded && "rotate-180")} />
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-3 border-t border-gray-100 pt-2 space-y-2">
                          {ev.description && <p className="text-xs text-gray-600">{ev.description}</p>}
                          {ev.owner && <p className="text-xs text-gray-500 flex items-center gap-1"><User2 size={10} /> {ev.owner}</p>}
                          <div className="flex items-center gap-2">
                            {ev.url && (
                              <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-xs text-updraft-deep hover:underline flex items-center gap-1">
                                <ExternalLink size={10} /> Source
                              </a>
                            )}
                            {isCCRO && (
                              <button type="button" onClick={() => handleDelete(ev.id)} disabled={deletingId === ev.id}
                                className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 ml-auto">
                                <Trash2 size={10} /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable form fields component ───────────────────────────────────────────

function EventFormFields({
  form,
  onChange,
}: {
  form: typeof EMPTY_FORM;
  onChange: (f: typeof EMPTY_FORM) => void;
}) {
  const set = (patch: Partial<typeof EMPTY_FORM>) => onChange({ ...form, ...patch });
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="text-xs font-medium text-gray-600 block mb-1">Title *</label>
        <input required value={form.title} onChange={(e) => set({ title: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Date *</label>
        <input required type="date" value={form.eventDate} onChange={(e) => set({ eventDate: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
        <select value={form.type} onChange={(e) => set({ type: e.target.value as RegCalEventType })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30">
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{REG_CAL_TYPE_LABELS[t]}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Source</label>
        <select value={form.source} onChange={(e) => set({ source: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30">
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Owner</label>
        <input value={form.owner} onChange={(e) => set({ owner: e.target.value })}
          placeholder="e.g. Sarah Chen"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Alert (days before)</label>
        <input type="number" min={1} max={365} value={form.alertDays} onChange={(e) => set({ alertDays: parseInt(e.target.value) || 30 })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium text-gray-600 block mb-1">URL (optional)</label>
        <input type="url" value={form.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
        <textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })}
          placeholder="What does this deadline require? What are the implications?"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30" />
      </div>
    </div>
  );
}
