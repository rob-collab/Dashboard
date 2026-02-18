"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Policy, PolicyObligation } from "@/lib/types";

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
      setNotes(editObligation.notes ?? "");
    } else {
      setCategory("Regulatory Compliance");
      setDescription("");
      setRegulationRefs([]);
      setControlRefs([]);
      setNotes("");
    }
  }, [editObligation, open]);

  if (!open) return null;

  function toggleRef(ref: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(ref) ? current.filter((r) => r !== ref) : [...current, ref]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      category,
      description,
      regulationRefs,
      controlRefs,
      notes: notes || null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">
            {editObligation ? "Edit Obligation" : "New Obligation"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {/* Regulation refs */}
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

          {/* Control refs */}
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

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple" />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="rounded-lg bg-updraft-deep px-4 py-2 text-sm font-medium text-white hover:bg-updraft-bar transition-colors">
              {editObligation ? "Save Changes" : "Add Obligation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
