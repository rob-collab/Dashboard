"use client";

import { useState } from "react";
import Modal from "@/components/common/Modal";
import { api } from "@/lib/api-client";
import type { TestingScheduleEntry, TestResultValue } from "@/lib/types";
import { TEST_RESULT_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const RESULT_BUTTONS: { value: TestResultValue; label: string; classes: string; activeClasses: string }[] = [
  { value: "PASS", label: "Pass", classes: "border-green-200 text-green-700 hover:bg-green-50", activeClasses: "bg-green-600 border-green-600 text-white" },
  { value: "PARTIALLY", label: "Partial", classes: "border-amber-200 text-amber-700 hover:bg-amber-50", activeClasses: "bg-amber-500 border-amber-500 text-white" },
  { value: "FAIL", label: "Fail", classes: "border-red-200 text-red-700 hover:bg-red-50", activeClasses: "bg-red-600 border-red-600 text-white" },
  { value: "NOT_TESTED", label: "Not Tested", classes: "border-gray-200 text-gray-600 hover:bg-gray-50", activeClasses: "bg-gray-500 border-gray-500 text-white" },
  { value: "NOT_DUE", label: "Not Due", classes: "border-gray-100 text-gray-400 hover:bg-gray-50", activeClasses: "bg-gray-300 border-gray-300 text-white" },
];

interface Props {
  entry: TestingScheduleEntry | null;
  year: number;
  month: number;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function TestResultRecordModal({ entry, year, month, open, onClose, onSaved }: Props) {
  const [result, setResult] = useState<TestResultValue | "">("");
  const [notes, setNotes] = useState("");
  const [evidenceLinks, setEvidenceLinks] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens for a new entry
  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setResult("");
      setNotes("");
      setEvidenceLinks("");
    } else {
      onClose();
    }
  }

  const requiresNotes = result === "FAIL" || result === "PARTIALLY";
  const canSave = !!result && !(requiresNotes && !notes.trim());

  async function handleSave() {
    if (!entry || !result) return;
    setSaving(true);
    try {
      const links = evidenceLinks
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await api("/api/controls/test-results", {
        method: "POST",
        body: {
          results: [
            {
              scheduleEntryId: entry.id,
              periodYear: year,
              periodMonth: month,
              result,
              notes: notes.trim() || null,
              evidenceLinks: links,
            },
          ],
        },
      });
      toast.success("Result recorded successfully");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save result");
    } finally {
      setSaving(false);
    }
  }

  if (!entry) return null;

  const periodLabel = `${LONG_MONTHS[month - 1]} ${year}`;

  return (
    <Modal
      open={open}
      onClose={() => handleOpenChange(false)}
      title={`${entry.control?.controlRef ?? ""} — ${entry.control?.controlName ?? "Record Result"}`}
      size="xl"
      footer={
        <>
          <button
            onClick={() => handleOpenChange(false)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-updraft-bright-purple px-5 py-2 text-sm font-medium text-white hover:bg-updraft-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Result"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Period */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Period:</span>
          <span className="inline-flex items-center rounded-full bg-updraft-pale-purple px-3 py-1 text-xs font-semibold text-updraft-deep">
            {periodLabel}
          </span>
        </div>

        {/* Test Description */}
        {entry.summaryOfTest && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Test Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.summaryOfTest}</p>
          </div>
        )}

        {/* Result Selector */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Result</p>
          <div className="flex flex-wrap gap-2">
            {RESULT_BUTTONS.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setResult(btn.value)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  result === btn.value ? btn.activeClasses : btn.classes,
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {result && (
            <p className="mt-1.5 text-xs text-gray-400">Selected: <span className="font-semibold">{TEST_RESULT_LABELS[result as TestResultValue]}</span></p>
          )}
        </div>

        {/* Evidence Links */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Evidence Links <span className="normal-case font-normal text-gray-400">(comma-separated URLs)</span>
          </label>
          <input
            type="text"
            value={evidenceLinks}
            onChange={(e) => setEvidenceLinks(e.target.value)}
            placeholder="https://drive.google.com/..., https://..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
          />
        </div>

        {/* Findings / Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Findings / Notes
            {requiresNotes && <span className="ml-1 text-red-500">*</span>}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Enter testing notes, findings, observations..."
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30 resize-y",
              requiresNotes && !notes.trim() ? "border-amber-300 bg-amber-50" : "border-gray-200",
            )}
          />
          {requiresNotes && !notes.trim() && (
            <p className="mt-1 text-xs text-amber-600">Notes are required for {TEST_RESULT_LABELS[result as TestResultValue]} results.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
