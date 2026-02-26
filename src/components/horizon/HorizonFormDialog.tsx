"use client";

import { useState } from "react";
import { X, Loader2, Radar } from "lucide-react";
import { toast } from "sonner";
import type { HorizonItem, HorizonCategory, HorizonUrgency } from "@/lib/types";
import { HORIZON_CATEGORY_LABELS } from "@/lib/types";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onCreated: (item: HorizonItem) => void;
}

const inputCls = "w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 bg-white";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-slate-600 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export function HorizonFormDialog({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<HorizonCategory>("FCA_REGULATORY");
  const [source, setSource] = useState("");
  const [urgency, setUrgency] = useState<HorizonUrgency>("MEDIUM");
  const [summary, setSummary] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [actions, setActions] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isValid = title.trim().length > 0 && source.trim().length > 0 && summary.trim().length > 0 && whyItMatters.trim().length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setSaving(true);
    try {
      const item = await api<HorizonItem>("/api/horizon-items", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          category,
          source: source.trim(),
          urgency,
          summary: summary.trim(),
          whyItMatters: whyItMatters.trim(),
          deadline: deadline || null,
          sourceUrl: sourceUrl.trim() || null,
          actions: actions.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      toast.success(`Horizon item ${item.reference} created`);
      onCreated(item);
    } catch {
      toast.error("Failed to create item — please try again");
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-8 overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 rounded-t-2xl shrink-0">
            <div className="flex items-center gap-2">
              <Radar className="w-5 h-5 text-updraft-bright-purple" />
              <h2 className="font-poppins font-semibold text-updraft-deep">New Horizon Item</h2>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[calc(100vh-14rem)]">

            {/* Title */}
            <div>
              <Label required>Title</Label>
              <input
                className={inputCls}
                placeholder="e.g. FCA CP26/7 — Consumer Duty implementation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Row: category + source */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Category</Label>
                <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as HorizonCategory)}>
                  {(Object.keys(HORIZON_CATEGORY_LABELS) as HorizonCategory[]).map((c) => (
                    <option key={c} value={c}>{HORIZON_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label required>Source</Label>
                <input
                  className={inputCls}
                  placeholder="e.g. FCA, PRA, HM Treasury"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>
            </div>

            {/* Row: urgency + deadline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Urgency</Label>
                <select className={inputCls} value={urgency} onChange={(e) => setUrgency(e.target.value as HorizonUrgency)}>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <Label>Deadline</Label>
                <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>

            {/* Summary */}
            <div>
              <Label required>Summary</Label>
              <textarea
                className={cn(inputCls, "h-24 resize-none")}
                placeholder="Brief description of the regulatory or business environment development…"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            {/* Why it matters */}
            <div>
              <Label required>Why It Matters to Updraft</Label>
              <textarea
                className={cn(inputCls, "h-28 resize-none")}
                placeholder="What is the specific impact or risk for Updraft?…"
                value={whyItMatters}
                onChange={(e) => setWhyItMatters(e.target.value)}
              />
            </div>

            {/* Recommended actions */}
            <div>
              <Label>Recommended Actions</Label>
              <textarea
                className={cn(inputCls, "h-20 resize-none")}
                placeholder="Describe any recommended actions for the team…"
                value={actions}
                onChange={(e) => setActions(e.target.value)}
              />
            </div>

            {/* Source URL */}
            <div>
              <Label>Source URL</Label>
              <input
                className={inputCls}
                type="url"
                placeholder="https://…"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <Label>Internal Notes <span className="text-slate-400 font-normal">(CCRO Team only)</span></Label>
              <textarea
                className={cn(inputCls, "h-16 resize-none")}
                placeholder="Any internal notes or context…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-slate-50 rounded-b-2xl shrink-0 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !isValid}
              className="flex items-center gap-2 px-4 py-2 bg-updraft-bright-purple text-white text-sm font-semibold rounded-lg hover:bg-updraft-light-purple disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
              {saving ? "Creating…" : "Create Item"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
