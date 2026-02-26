"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { TestingScheduleEntry } from "@/lib/types";
import { Archive, UserPlus, X, AlertTriangle, CheckCircle2 } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface BulkScheduleActionsProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  entries: TestingScheduleEntry[];
}

type BulkMode = "idle" | "reassign" | "archive";

interface ProgressState {
  total: number;
  completed: number;
  failed: number;
}

/* ─── Style constants (matching TestingScheduleTab) ──────────────────────── */

const inputClasses =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors";

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function BulkScheduleActions({
  selectedIds,
  onClearSelection,
  entries,
}: BulkScheduleActionsProps) {
  const users = useAppStore((s) => s.users);
  const updateTestingScheduleEntry = useAppStore(
    (s) => s.updateTestingScheduleEntry
  );

  const ccroUsers = useMemo(
    () => users.filter((u) => u.role === "CCRO_TEAM" && u.isActive),
    [users]
  );

  const [mode, setMode] = useState<BulkMode>("idle");
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [resultMessage, setResultMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Reassign state
  const [reassignDropdownOpen, setReassignDropdownOpen] = useState(false);
  const reassignRef = useRef<HTMLDivElement>(null);

  // Archive state
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const selectedEntries = useMemo(
    () => entries.filter((e) => selectedIds.has(e.id)),
    [entries, selectedIds]
  );

  // Close reassign dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        reassignRef.current &&
        !reassignRef.current.contains(e.target as Node)
      ) {
        setReassignDropdownOpen(false);
      }
    }
    if (reassignDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [reassignDropdownOpen]);

  // Auto-clear result message after 4 seconds
  useEffect(() => {
    if (resultMessage) {
      const timer = setTimeout(() => setResultMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [resultMessage]);

  // Hide when nothing is selected and no active operation
  if (selectedIds.size === 0 && !progress && !resultMessage) {
    return null;
  }

  /* ── Reassign handler ────────────────────────────────────────────────── */

  async function handleReassign(newTesterId: string) {
    setReassignDropdownOpen(false);
    setMode("reassign");
    setResultMessage(null);

    const total = selectedEntries.length;
    const tracker: ProgressState = { total, completed: 0, failed: 0 };
    setProgress({ ...tracker });

    for (const entry of selectedEntries) {
      try {
        const updated = await api<TestingScheduleEntry>(
          `/api/controls/testing-schedule/${entry.id}`,
          {
            method: "PATCH",
            body: { assignedTesterId: newTesterId },
          }
        );
        updateTestingScheduleEntry(entry.id, updated);
        tracker.completed++;
      } catch {
        tracker.failed++;
      }
      setProgress({ ...tracker });
    }

    const testerName =
      ccroUsers.find((u) => u.id === newTesterId)?.name ?? "selected tester";

    if (tracker.failed === 0) {
      setResultMessage({
        type: "success",
        text: `Successfully reassigned ${tracker.completed} control${tracker.completed !== 1 ? "s" : ""} to ${testerName}.`,
      });
      onClearSelection();
    } else {
      setResultMessage({
        type: "error",
        text: `Reassigned ${tracker.completed} of ${total}. ${tracker.failed} failed.`,
      });
    }

    setProgress(null);
    setMode("idle");
  }

  /* ── Archive handler ─────────────────────────────────────────────────── */

  async function handleArchive() {
    if (!archiveReason.trim()) {
      setArchiveError("Please provide a reason for archiving.");
      return;
    }

    setArchiveConfirmOpen(false);
    setArchiveError(null);
    setMode("archive");
    setResultMessage(null);

    const total = selectedEntries.length;
    const tracker: ProgressState = { total, completed: 0, failed: 0 };
    setProgress({ ...tracker });

    for (const entry of selectedEntries) {
      try {
        const updated = await api<TestingScheduleEntry>(
          `/api/controls/testing-schedule/${entry.id}`,
          {
            method: "PATCH",
            body: {
              isActive: false,
              removedReason: archiveReason.trim(),
            },
          }
        );
        updateTestingScheduleEntry(entry.id, updated);
        tracker.completed++;
      } catch {
        tracker.failed++;
      }
      setProgress({ ...tracker });
    }

    if (tracker.failed === 0) {
      setResultMessage({
        type: "success",
        text: `Successfully archived ${tracker.completed} control${tracker.completed !== 1 ? "s" : ""} from the schedule.`,
      });
      onClearSelection();
    } else {
      setResultMessage({
        type: "error",
        text: `Archived ${tracker.completed} of ${total}. ${tracker.failed} failed.`,
      });
    }

    setArchiveReason("");
    setProgress(null);
    setMode("idle");
  }

  const isProcessing = mode !== "idle" && progress !== null;

  return (
    <>
      {/* ── Sticky bottom action bar ──────────────────────────────────────── */}
      <div className="sticky bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          {/* Left: selection count & progress */}
          <div className="flex items-center gap-3">
            {progress ? (
              <div className="flex items-center gap-2">
                {/* Spinner */}
                <svg
                  className="w-4 h-4 animate-spin text-updraft-bright-purple"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 font-poppins">
                  {mode === "reassign" ? "Reassigning" : "Archiving"}{" "}
                  {progress.completed + progress.failed} of {progress.total}
                  {progress.failed > 0 && (
                    <span className="text-red-500 ml-1">
                      ({progress.failed} failed)
                    </span>
                  )}
                </span>
              </div>
            ) : resultMessage ? (
              <div
                className={`flex items-center gap-2 text-sm font-medium ${
                  resultMessage.type === "success"
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {resultMessage.type === "success" ? (
                  <CheckCircle2 size={16} className="shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="shrink-0" />
                )}
                <span>{resultMessage.text}</span>
              </div>
            ) : (
              <span className="text-sm font-medium text-gray-700 font-poppins">
                {selectedIds.size} control{selectedIds.size !== 1 ? "s" : ""}{" "}
                selected
              </span>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2">
            {/* Reassign Tester */}
            <div className="relative" ref={reassignRef}>
              <button
                onClick={() => setReassignDropdownOpen(!reassignDropdownOpen)}
                disabled={isProcessing || selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus size={16} />
                Reassign Tester
              </button>

              {/* Dropdown */}
              {reassignDropdownOpen && (
                <div className="absolute bottom-full mb-2 right-0 w-64 rounded-lg bg-white border border-gray-200 shadow-xl overflow-hidden animate-fade-in z-50">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide font-poppins">
                      Select New Tester
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {ccroUsers.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-400 text-center">
                        No CCRO team members available.
                      </div>
                    ) : (
                      ccroUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleReassign(user.id)}
                          className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-updraft-pale-purple/20 hover:text-updraft-deep transition-colors border-b border-gray-50 last:border-b-0"
                        >
                          <span className="font-medium">{user.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Archive Selected */}
            <button
              onClick={() => {
                setArchiveConfirmOpen(true);
                setArchiveError(null);
                setArchiveReason("");
              }}
              disabled={isProcessing || selectedIds.size === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Archive size={16} />
              Archive Selected
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => {
                onClearSelection();
                setResultMessage(null);
              }}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Archive Confirmation Dialog ───────────────────────────────────── */}
      {archiveConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setArchiveConfirmOpen(false);
          }}
        >
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 font-poppins">
                Archive Selected Controls
              </h2>
              <button
                onClick={() => setArchiveConfirmOpen(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle
                  size={18}
                  className="text-amber-600 shrink-0 mt-0.5"
                />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">
                    Are you sure you want to remove{" "}
                    {selectedIds.size} control{selectedIds.size !== 1 ? "s" : ""}{" "}
                    from the testing schedule?
                  </p>
                  <p className="mt-1 text-amber-700">
                    This will mark them as inactive. Historical test results will
                    be preserved.
                  </p>
                </div>
              </div>

              {/* Selected controls summary */}
              <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                {selectedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 last:border-b-0"
                  >
                    <span className="font-mono text-xs font-bold text-updraft-deep">
                      {entry.control?.controlRef ?? "-"}
                    </span>
                    <span className="text-xs text-gray-600 truncate">
                      {entry.control?.controlName ?? "-"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Reason textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Removal <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={archiveReason}
                  onChange={(e) => {
                    setArchiveReason(e.target.value);
                    if (archiveError) setArchiveError(null);
                  }}
                  rows={3}
                  placeholder="e.g. Controls retired following quarterly review, transferred to another team, etc."
                  className={inputClasses}
                />
              </div>

              {archiveError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertTriangle size={16} className="shrink-0" />
                  {archiveError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setArchiveConfirmOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={!archiveReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Archive size={16} />
                Archive {selectedIds.size} Control
                {selectedIds.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
