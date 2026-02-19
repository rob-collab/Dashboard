"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Layers } from "lucide-react";
import type { Policy, PolicyObligation, PolicyObligationSection } from "@/lib/types";

const CATEGORY_OPTIONS = [
  "Regulatory Compliance",
  "Promotions Approval",
  "Content Standards",
  "Record Keeping",
  "Monitoring & Oversight",
  "Training & Competence",
  "Reporting",
  "Data Protection",
  "Consumer Duty",
  "Other",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (obligation: Omit<PolicyObligation, "id" | "reference" | "policyId" | "createdAt" | "updatedAt">) => void;
  policy: Policy;
  editObligation?: PolicyObligation | null;
}

export default function ObligationFormDialog({ open, onClose, onSave, policy, editObligation }: Props) {
  const [category, setCategory] = useState("Regulatory Compliance");
  const [description, setDescription] = useState("");
  const [regulationRefs, setRegulationRefs] = useState<string[]>([]);
  const [controlRefs, setControlRefs] = useState<string[]>([]);
  const [sections, setSections] = useState<PolicyObligationSection[]>([]);
  const [notes, setNotes] = useState("");

  // Available refs from linked regulations and controls
  const availableRegRefs = (policy.regulatoryLinks ?? []).map((l) => l.regulation?.reference ?? l.regulationId);
  const availableCtrlRefs = (policy.controlLinks ?? []).map((l) => l.control?.controlRef ?? l.controlId);

  useEffect(() => {
    if (editObligation) {
      setCategory(editObligation.category);
      setDescription(editObligation.description);
      setRegulationRefs(editObligation.regulationRefs);
      setControlRefs(editObligation.controlRefs);
      setSections(editObligation.sections ?? []);
      setNotes(editObligation.notes ?? "");
    } else {
      setCategory("Regulatory Compliance");
      setDescription("");
      setRegulationRefs([]);
      setControlRefs([]);
      setSections([]);
      setNotes("");
    }
  }, [editObligation, open]);

  if (!open) return null;

  function toggleRef(ref: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(ref) ? current.filter((r) => r !== ref) : [...current, ref]);
  }

  function addSection() {
    setSections([...sections, { name: "", regulationRefs: [], controlRefs: [] }]);
  }

  function removeSection(idx: number) {
    setSections(sections.filter((_, i) => i !== idx));
  }

  function updateSection(idx: number, field: keyof PolicyObligationSection, value: string | string[]) {
    setSections(sections.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function toggleSectionRef(sIdx: number, ref: string, field: "regulationRefs" | "controlRefs") {
    const section = sections[sIdx];
    const current = section[field];
    const updated = current.includes(ref) ? current.filter((r) => r !== ref) : [...current, ref];
    updateSection(sIdx, field, updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Auto-compute top-level refs as union of all section refs
    let finalRegRefs = regulationRefs;
    let finalCtrlRefs = controlRefs;
    if (sections.length > 0) {
      const allRegRefs = new Set<string>(regulationRefs);
      const allCtrlRefs = new Set<string>(controlRefs);
      for (const s of sections) {
        for (const r of s.regulationRefs) allRegRefs.add(r);
        for (const c of s.controlRefs) allCtrlRefs.add(c);
      }
      finalRegRefs = Array.from(allRegRefs);
      finalCtrlRefs = Array.from(allCtrlRefs);
    }

    onSave({
      category,
      description,
      regulationRefs: finalRegRefs,
      controlRefs: finalCtrlRefs,
      sections: sections.filter((s) => s.name.trim()),
      notes: notes || null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">
            {editObligation ? "Edit Requirement" : "New Requirement"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
            <select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
          </div>

          {/* Regulation refs (top-level) */}
          {availableRegRefs.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Linked Regulations</label>
              <div className="flex flex-wrap gap-1.5">
                {availableRegRefs.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => toggleRef(ref, regulationRefs, setRegulationRefs)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      regulationRefs.includes(ref)
                        ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {ref}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Control refs (top-level) */}
          {availableCtrlRefs.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Linked Controls</label>
              <div className="flex flex-wrap gap-1.5">
                {availableCtrlRefs.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => toggleRef(ref, controlRefs, setControlRefs)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      controlRefs.includes(ref)
                        ? "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {ref}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Sections Editor ── */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <Layers size={12} />
                Policy Sections
              </label>
              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center gap-1 text-xs text-updraft-bright-purple hover:text-updraft-deep font-medium transition-colors"
              >
                <Plus size={12} /> Add Section
              </button>
            </div>

            {sections.length === 0 && (
              <p className="text-[10px] text-gray-400 italic">
                No sections. Regulation and control mappings will apply to the whole requirement.
              </p>
            )}

            {sections.map((section, sIdx) => (
              <div key={sIdx} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={section.name}
                    onChange={(e) => updateSection(sIdx, "name", e.target.value)}
                    placeholder="Section name (e.g. Section 7 — Record Keeping)"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeSection(sIdx)}
                    className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Section-level regulation refs */}
                {availableRegRefs.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Regulations</p>
                    <div className="flex flex-wrap gap-1">
                      {availableRegRefs.map((ref) => (
                        <button
                          key={ref}
                          type="button"
                          onClick={() => toggleSectionRef(sIdx, ref, "regulationRefs")}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            section.regulationRefs.includes(ref)
                              ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                              : "bg-white text-gray-400 hover:bg-gray-100 border border-gray-200"
                          }`}
                        >
                          {ref}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section-level control refs */}
                {availableCtrlRefs.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Controls</p>
                    <div className="flex flex-wrap gap-1">
                      {availableCtrlRefs.map((ref) => (
                        <button
                          key={ref}
                          type="button"
                          onClick={() => toggleSectionRef(sIdx, ref, "controlRefs")}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            section.controlRefs.includes(ref)
                              ? "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                              : "bg-white text-gray-400 hover:bg-gray-100 border border-gray-200"
                          }`}
                        >
                          {ref}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="rounded-lg bg-updraft-deep px-4 py-2 text-sm font-medium text-white hover:bg-updraft-bar transition-colors">
              {editObligation ? "Save Changes" : "Add Requirement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
