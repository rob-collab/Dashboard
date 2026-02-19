"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type {
  TestingScheduleEntry,
  ControlRecord,
  TestingFrequency,
  ConsumerDutyOutcomeType,
} from "@/lib/types";
import { TESTING_FREQUENCY_LABELS, CD_OUTCOME_LABELS } from "@/lib/types";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  AlertCircle,
} from "lucide-react";
import { naturalCompare } from "@/lib/utils";
import BulkScheduleActions from "./BulkScheduleActions";

/* ─── Reusable style constants ────────────────────────────────────────────── */

const inputClasses =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors";
const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors";
const btnDanger =
  "inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors";
const btnIcon =
  "rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function groupByBusinessArea(
  entries: TestingScheduleEntry[]
): Map<string, TestingScheduleEntry[]> {
  const groups = new Map<string, TestingScheduleEntry[]>();
  for (const entry of entries) {
    const areaName = entry.control?.businessArea?.name ?? "Unassigned";
    const list = groups.get(areaName) ?? [];
    list.push(entry);
    groups.set(areaName, list);
  }
  // Sort group keys alphabetically
  return new Map(
    Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function TestingScheduleTab() {
  const testingSchedule = useAppStore((s) => s.testingSchedule);
  const controls = useAppStore((s) => s.controls);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const addTestingScheduleEntries = useAppStore((s) => s.addTestingScheduleEntries);
  const updateTestingScheduleEntry = useAppStore((s) => s.updateTestingScheduleEntry);

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TestingScheduleEntry | null>(null);
  const [removingEntry, setRemovingEntry] = useState<TestingScheduleEntry | null>(null);

  const ccroUsers = useMemo(
    () => users.filter((u) => u.role === "CCRO_TEAM" && u.isActive),
    [users]
  );

  // Filter schedule entries
  const filteredEntries = useMemo(() => {
    let entries = testingSchedule;
    if (!showInactive) {
      entries = entries.filter((e) => e.isActive);
    }
    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.control?.controlRef?.toLowerCase().includes(q) ||
          e.control?.controlName?.toLowerCase().includes(q) ||
          e.control?.businessArea?.name?.toLowerCase().includes(q) ||
          e.assignedTester?.name?.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [testingSchedule, search, showInactive]);

  const grouped = useMemo(() => groupByBusinessArea(filteredEntries), [filteredEntries]);

  const toggleArea = useCallback((area: string) => {
    setCollapsedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectArea = useCallback((entries: TestingScheduleEntry[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const areaIds = entries.filter((e) => e.isActive).map((e) => e.id);
      const allSelected = areaIds.every((id) => next.has(id));
      if (allSelected) {
        areaIds.forEach((id) => next.delete(id));
      } else {
        areaIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const activeIds = filteredEntries.filter((e) => e.isActive).map((e) => e.id);
      const allSelected = activeIds.every((id) => prev.has(id));
      return allSelected ? new Set<string>() : new Set(activeIds);
    });
  }, [filteredEntries]);

  function handleEdit(entry: TestingScheduleEntry) {
    setEditingEntry(entry);
    setEditDialogOpen(true);
  }

  function handleRemove(entry: TestingScheduleEntry) {
    setRemovingEntry(entry);
    setRemoveDialogOpen(true);
  }

  const activeCount = testingSchedule.filter((e) => e.isActive).length;
  const totalCount = testingSchedule.length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search schedule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bright-purple"
            />
            Show removed
          </label>
        </div>
        {currentUser?.role === "CCRO_TEAM" && (
          <button className={btnPrimary} onClick={() => setAddDialogOpen(true)}>
            <Plus size={16} />
            Add to Schedule
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {currentUser?.role === "CCRO_TEAM" && filteredEntries.some((e) => e.isActive) && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-600">
            <input
              type="checkbox"
              checked={
                filteredEntries.filter((e) => e.isActive).length > 0 &&
                filteredEntries
                  .filter((e) => e.isActive)
                  .every((e) => selectedIds.has(e.id))
              }
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bright-purple"
            />
            Select all
          </label>
        )}
        <span>
          {activeCount} active entr{activeCount === 1 ? "y" : "ies"}
          {showInactive && totalCount > activeCount && (
            <> ({totalCount - activeCount} removed)</>
          )}
          {search && <> &middot; {filteredEntries.length} matching</>}
          {selectedIds.size > 0 && (
            <> &middot; <strong className="text-updraft-deep">{selectedIds.size} selected</strong></>
          )}
        </span>
      </div>

      {/* Empty state */}
      {filteredEntries.length === 0 && (
        <div className="bento-card text-center py-12">
          <FlaskConical className="mx-auto w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            {search
              ? "No schedule entries match your search."
              : "No controls on the testing schedule yet."}
          </p>
          {!search && currentUser?.role === "CCRO_TEAM" && (
            <button
              className={`${btnPrimary} mt-4`}
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus size={16} />
              Add Controls
            </button>
          )}
        </div>
      )}

      {/* Grouped table */}
      {filteredEntries.length > 0 && (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([area, entries]) => {
            const isCollapsed = collapsedAreas.has(area);
            return (
              <div key={area} className="bento-card overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-2 w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                  {currentUser?.role === "CCRO_TEAM" && (
                    <input
                      type="checkbox"
                      checked={entries.filter((e) => e.isActive).every((e) => selectedIds.has(e.id)) && entries.some((e) => e.isActive)}
                      onChange={() => toggleSelectArea(entries)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bright-purple"
                    />
                  )}
                  <button
                    onClick={() => toggleArea(area)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-semibold font-poppins text-gray-800">
                      {area}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({entries.length})
                    </span>
                  </button>
                </div>

                {/* Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/50">
                          {currentUser?.role === "CCRO_TEAM" && (
                            <th className="px-2 py-2.5 w-10" />
                          )}
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                            Ref
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Control Name
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">
                            CD Outcome
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">
                            Frequency
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">
                            Assigned Tester
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                            Status
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {entries.map((entry) => {
                          const cdLabel =
                            CD_OUTCOME_LABELS[
                              entry.control?.consumerDutyOutcome as ConsumerDutyOutcomeType
                            ] ?? entry.control?.consumerDutyOutcome ?? "-";
                          const freqLabel =
                            TESTING_FREQUENCY_LABELS[entry.testingFrequency] ??
                            entry.testingFrequency;
                          const testerName =
                            entry.assignedTester?.name ??
                            users.find((u) => u.id === entry.assignedTesterId)?.name ??
                            "Unassigned";

                          return (
                            <tr
                              key={entry.id}
                              className={`transition-colors ${
                                entry.isActive
                                  ? "hover:bg-updraft-pale-purple/10"
                                  : "opacity-50 bg-gray-50"
                              } ${selectedIds.has(entry.id) ? "bg-updraft-pale-purple/15" : ""}`}
                            >
                              {currentUser?.role === "CCRO_TEAM" && (
                                <td className="px-2 py-3">
                                  {entry.isActive && (
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.has(entry.id)}
                                      onChange={() => toggleSelect(entry.id)}
                                      className="rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bright-purple"
                                    />
                                  )}
                                </td>
                              )}
                              <td className="px-4 py-3 font-mono font-bold text-updraft-deep text-xs">
                                {entry.control?.controlRef ?? "-"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-800">
                                  {entry.control?.controlName ?? "-"}
                                </div>
                                {entry.summaryOfTest && (
                                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                                    {entry.summaryOfTest}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {cdLabel}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-updraft-pale-purple/30 text-updraft-deep">
                                  {freqLabel}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {testerName}
                              </td>
                              <td className="px-4 py-3">
                                {entry.isActive ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                    Removed
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {entry.isActive && currentUser?.role === "CCRO_TEAM" && (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() => handleEdit(entry)}
                                      className={btnIcon}
                                      title="Edit entry"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleRemove(entry)}
                                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                      title="Remove from schedule"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk schedule actions (floating bar) */}
      {currentUser?.role === "CCRO_TEAM" && (
        <BulkScheduleActions
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
          entries={filteredEntries}
        />
      )}

      {/* ── Add to Schedule Dialog ──────────────────────────────────────────── */}
      {addDialogOpen && (
        <AddToScheduleDialog
          controls={controls}
          testingSchedule={testingSchedule}
          ccroUsers={ccroUsers}
          onAdd={addTestingScheduleEntries}
          onClose={() => setAddDialogOpen(false)}
        />
      )}

      {/* ── Edit Dialog ────────────────────────────────────────────────────── */}
      {editDialogOpen && editingEntry && (
        <EditScheduleDialog
          entry={editingEntry}
          ccroUsers={ccroUsers}
          onSave={updateTestingScheduleEntry}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingEntry(null);
          }}
        />
      )}

      {/* ── Remove Dialog ──────────────────────────────────────────────────── */}
      {removeDialogOpen && removingEntry && (
        <RemoveFromScheduleDialog
          entry={removingEntry}
          onConfirm={updateTestingScheduleEntry}
          onClose={() => {
            setRemoveDialogOpen(false);
            setRemovingEntry(null);
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── Add to Schedule Dialog                                               ── */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface AddDialogProps {
  controls: ControlRecord[];
  testingSchedule: TestingScheduleEntry[];
  ccroUsers: { id: string; name: string }[];
  onAdd: (entries: TestingScheduleEntry[]) => void;
  onClose: () => void;
}

function AddToScheduleDialog({
  controls,
  testingSchedule,
  ccroUsers,
  onAdd,
  onClose,
}: AddDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [frequency, setFrequency] = useState<TestingFrequency>("QUARTERLY");
  const [testerId, setTesterId] = useState(ccroUsers[0]?.id ?? "");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controls not already on the active schedule
  const scheduledControlIds = useMemo(
    () => new Set(testingSchedule.filter((e) => e.isActive).map((e) => e.controlId)),
    [testingSchedule]
  );

  const unscheduledControls = useMemo(() => {
    let list = controls.filter(
      (c) => c.isActive && !scheduledControlIds.has(c.id)
    );
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.controlRef.toLowerCase().includes(q) ||
          c.controlName.toLowerCase().includes(q) ||
          c.businessArea?.name?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => naturalCompare(a.controlRef, b.controlRef));
  }, [controls, scheduledControlIds, search]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === unscheduledControls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unscheduledControls.map((c) => c.id)));
    }
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) return;
    if (!testerId) {
      setError("Please select an assigned tester.");
      return;
    }
    if (!summary.trim()) {
      setError("Please provide a summary of the test.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await api<TestingScheduleEntry[]>(
        "/api/controls/testing-schedule",
        {
          method: "POST",
          body: {
            controlIds: Array.from(selectedIds),
            testingFrequency: frequency,
            assignedTesterId: testerId,
            summaryOfTest: summary.trim(),
          },
        }
      );
      onAdd(created);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add controls to schedule."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-xl animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 font-poppins">
            Add Controls to Testing Schedule
          </h2>
          <button onClick={onClose} className={btnIcon} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Search unscheduled controls */}
          <div>
            <label className={labelClasses}>
              Select Controls from Library
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search unscheduled controls..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
              />
            </div>

            {/* Controls list */}
            <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto">
              {unscheduledControls.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  {search
                    ? "No matching unscheduled controls found."
                    : "All active controls are already on the schedule."}
                </div>
              ) : (
                <>
                  {/* Select all */}
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50 sticky top-0">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === unscheduledControls.length &&
                        unscheduledControls.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bright-purple"
                    />
                    <span className="text-xs font-medium text-gray-500">
                      Select all ({unscheduledControls.length})
                    </span>
                  </div>
                  {unscheduledControls.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-updraft-pale-purple/10 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bright-purple"
                      />
                      <span className="font-mono text-xs font-bold text-updraft-deep w-20 shrink-0">
                        {c.controlRef}
                      </span>
                      <span className="text-sm text-gray-800 truncate flex-1">
                        {c.controlName}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {c.businessArea?.name ?? "-"}
                      </span>
                    </label>
                  ))}
                </>
              )}
            </div>
            {selectedIds.size > 0 && (
              <p className="text-xs text-updraft-deep mt-1 font-medium">
                {selectedIds.size} control{selectedIds.size !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Testing frequency */}
          <div>
            <label className={labelClasses}>Testing Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as TestingFrequency)}
              className={inputClasses}
            >
              {Object.entries(TESTING_FREQUENCY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned tester */}
          <div>
            <label className={labelClasses}>Assigned Tester</label>
            <select
              value={testerId}
              onChange={(e) => setTesterId(e.target.value)}
              className={inputClasses}
            >
              <option value="">-- Select tester --</option>
              {ccroUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Summary of test */}
          <div>
            <label className={labelClasses}>Summary of Test</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Describe the testing approach, what evidence to collect, etc."
              className={inputClasses}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-xl shrink-0">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || submitting}
            className={btnPrimary}
          >
            {submitting ? (
              "Adding..."
            ) : (
              <>
                <Check size={16} />
                Add {selectedIds.size > 0 ? selectedIds.size : ""} to Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── Edit Schedule Entry Dialog                                           ── */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface EditDialogProps {
  entry: TestingScheduleEntry;
  ccroUsers: { id: string; name: string }[];
  onSave: (id: string, data: Partial<TestingScheduleEntry>) => void;
  onClose: () => void;
}

function EditScheduleDialog({ entry, ccroUsers, onSave, onClose }: EditDialogProps) {
  const [frequency, setFrequency] = useState<TestingFrequency>(entry.testingFrequency);
  const [testerId, setTesterId] = useState(entry.assignedTesterId);
  const [summary, setSummary] = useState(entry.summaryOfTest);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) {
      setError("Summary of test is required.");
      return;
    }
    if (!testerId) {
      setError("Please select a tester.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const updates: Partial<TestingScheduleEntry> = {};
    if (frequency !== entry.testingFrequency) updates.testingFrequency = frequency;
    if (testerId !== entry.assignedTesterId) updates.assignedTesterId = testerId;
    if (summary.trim() !== entry.summaryOfTest) updates.summaryOfTest = summary.trim();

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    try {
      const updated = await api<TestingScheduleEntry>(
        `/api/controls/testing-schedule/${entry.id}`,
        { method: "PATCH", body: updates }
      );
      onSave(entry.id, updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update entry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 font-poppins">
            Edit Schedule Entry
          </h2>
          <button onClick={onClose} className={btnIcon} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Control info (read-only) */}
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-0.5">Control</p>
            <p className="text-sm font-medium text-gray-800">
              <span className="font-mono font-bold text-updraft-deep mr-2">
                {entry.control?.controlRef}
              </span>
              {entry.control?.controlName}
            </p>
          </div>

          {/* Testing frequency */}
          <div>
            <label className={labelClasses}>Testing Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as TestingFrequency)}
              className={inputClasses}
            >
              {Object.entries(TESTING_FREQUENCY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned tester */}
          <div>
            <label className={labelClasses}>Assigned Tester</label>
            <select
              value={testerId}
              onChange={(e) => setTesterId(e.target.value)}
              className={inputClasses}
            >
              <option value="">-- Select tester --</option>
              {ccroUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Summary of test */}
          <div>
            <label className={labelClasses}>Summary of Test</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className={inputClasses}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── Remove from Schedule Dialog                                          ── */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface RemoveDialogProps {
  entry: TestingScheduleEntry;
  onConfirm: (id: string, data: Partial<TestingScheduleEntry>) => void;
  onClose: () => void;
}

function RemoveFromScheduleDialog({ entry, onConfirm, onClose }: RemoveDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError("Please provide a reason for removing this control from the schedule.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updated = await api<TestingScheduleEntry>(
        `/api/controls/testing-schedule/${entry.id}`,
        {
          method: "PATCH",
          body: {
            isActive: false,
            removedReason: reason.trim(),
          },
        }
      );
      onConfirm(entry.id, updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove entry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 font-poppins">
            Remove from Schedule
          </h2>
          <button onClick={onClose} className={btnIcon} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-sm text-red-800">
              You are about to remove{" "}
              <span className="font-bold">
                {entry.control?.controlRef} &ndash; {entry.control?.controlName}
              </span>{" "}
              from the 2LOD testing schedule. This will not delete historical test
              results.
            </p>
          </div>

          <div>
            <label className={labelClasses}>Reason for Removal</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Control has been retired, transferred to another team, etc."
              className={inputClasses}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-xl">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !reason.trim()}
            className={btnDanger + " !px-4 !py-2 !text-sm"}
          >
            {submitting ? "Removing..." : "Remove from Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
