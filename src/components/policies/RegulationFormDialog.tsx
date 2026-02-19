"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Regulation, RegulationType } from "@/lib/types";
import { REGULATION_TYPE_LABELS } from "@/lib/types";

const TYPE_OPTIONS: RegulationType[] = ["HANDBOOK_RULE", "PRINCIPLE", "LEGISLATION", "STATUTORY_INSTRUMENT", "GUIDANCE", "INDUSTRY_CODE"];
const BODY_OPTIONS = ["FCA", "ICO", "ASA", "Ofcom", "Parliament", "PRA", "Other"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (regulation: Regulation) => void;
}

export default function RegulationFormDialog({ open, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [body, setBody] = useState("FCA");
  const [type, setType] = useState<RegulationType>("HANDBOOK_RULE");
  const [provisions, setProvisions] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const regulation: Regulation = {
      id: `temp-${Date.now()}`,
      reference: "REG-???",
      name,
      shortName: shortName || null,
      body,
      type,
      provisions: provisions || null,
      url: url || null,
      description: description || null,
      parentId: null,
      level: 2,
      regulatoryBody: body,
      applicability: "ASSESS",
      applicabilityNotes: null,
      isApplicable: true,
      isActive: true,
      primarySMF: null,
      secondarySMF: null,
      smfNotes: null,
      complianceStatus: "NOT_ASSESSED",
      lastAssessedAt: null,
      nextReviewDate: null,
      assessmentNotes: null,
      createdAt: now,
      updatedAt: now,
    };
    onSave(regulation);
    onClose();
    // Reset
    setName("");
    setShortName("");
    setBody("FCA");
    setType("HANDBOOK_RULE");
    setProvisions("");
    setUrl("");
    setDescription("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">New Regulation</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Short Name</label>
            <input type="text" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="e.g. CONC" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Regulatory Body *</label>
              <select required value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {BODY_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select required value={type} onChange={(e) => setType(e.target.value as RegulationType)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{REGULATION_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Provisions / Sections</label>
            <input type="text" value={provisions} onChange={(e) => setProvisions(e.target.value)} placeholder="e.g. Chapter 3" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="rounded-lg bg-updraft-deep px-4 py-2 text-sm font-medium text-white hover:bg-updraft-bar transition-colors">Add Regulation</button>
          </div>
        </form>
      </div>
    </div>
  );
}
