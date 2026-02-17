"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type {
  ControlRecord,
  ConsumerDutyOutcomeType,
  ControlFrequency,
  InternalOrThirdParty,
} from "@/lib/types";
import {
  CD_OUTCOME_LABELS,
  CONTROL_FREQUENCY_LABELS,
} from "@/lib/types";
import { api } from "@/lib/api-client";

// ── Helpers ────────────────────────────────────────────────────────────────────

function deriveTestingStatus(control: ControlRecord): {
  label: string;
  colour: string;
  bgColour: string;
  dotColour: string;
} {
  if (!control.testingSchedule) {
    return {
      label: "Not Scheduled",
      colour: "text-gray-500",
      bgColour: "bg-gray-100",
      dotColour: "bg-gray-400",
    };
  }
  if (!control.testingSchedule.isActive) {
    return {
      label: "Removed",
      colour: "text-orange-600",
      bgColour: "bg-orange-100",
      dotColour: "bg-orange-400",
    };
  }
  const results = control.testingSchedule.testResults ?? [];
  if (results.length === 0) {
    return {
      label: "Awaiting Test",
      colour: "text-blue-600",
      bgColour: "bg-blue-100",
      dotColour: "bg-blue-400",
    };
  }
  const latest = results[0];
  switch (latest.result) {
    case "PASS":
      return {
        label: "Pass",
        colour: "text-green-700",
        bgColour: "bg-green-100",
        dotColour: "bg-green-500",
      };
    case "FAIL":
      return {
        label: "Fail",
        colour: "text-red-700",
        bgColour: "bg-red-100",
        dotColour: "bg-red-500",
      };
    case "PARTIALLY":
      return {
        label: "Partial",
        colour: "text-amber-700",
        bgColour: "bg-amber-100",
        dotColour: "bg-amber-500",
      };
    default:
      return {
        label: "Not Tested",
        colour: "text-gray-600",
        bgColour: "bg-gray-100",
        dotColour: "bg-gray-400",
      };
  }
}

const INTERNAL_THIRD_PARTY_LABELS: Record<InternalOrThirdParty, string> = {
  INTERNAL: "Internal",
  THIRD_PARTY: "Third Party",
};

// ── Form state ─────────────────────────────────────────────────────────────────

interface ControlFormData {
  controlName: string;
  controlDescription: string;
  businessAreaId: string;
  controlOwnerId: string;
  consumerDutyOutcome: ConsumerDutyOutcomeType;
  controlFrequency: ControlFrequency;
  internalOrThirdParty: InternalOrThirdParty;
  standingComments: string;
}

const EMPTY_FORM: ControlFormData = {
  controlName: "",
  controlDescription: "",
  businessAreaId: "",
  controlOwnerId: "",
  consumerDutyOutcome: "PRODUCTS_AND_SERVICES",
  controlFrequency: "MONTHLY",
  internalOrThirdParty: "INTERNAL",
  standingComments: "",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function ControlsLibraryTab() {
  const controls = useAppStore((s) => s.controls);
  const controlBusinessAreas = useAppStore((s) => s.controlBusinessAreas);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const addControl = useAppStore((s) => s.addControl);
  const updateControl = useAppStore((s) => s.updateControl);

  const isCCRO = currentUser?.role === "CCRO_TEAM";

  // ── Filters ────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // ── Dialog state ───────────────────────────────────────────
  const [showDialog, setShowDialog] = useState(false);
  const [editingControl, setEditingControl] = useState<ControlRecord | null>(null);
  const [form, setForm] = useState<ControlFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (showDialog) {
      if (editingControl) {
        setForm({
          controlName: editingControl.controlName,
          controlDescription: editingControl.controlDescription,
          businessAreaId: editingControl.businessAreaId,
          controlOwnerId: editingControl.controlOwnerId,
          consumerDutyOutcome: editingControl.consumerDutyOutcome,
          controlFrequency: editingControl.controlFrequency,
          internalOrThirdParty: editingControl.internalOrThirdParty,
          standingComments: editingControl.standingComments ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      setSaving(false);
    }
  }, [showDialog, editingControl]);

  // ── Filtered list ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return controls.filter((c) => {
      // Active / archived toggle
      if (showArchived ? c.isActive : !c.isActive) return false;

      if (
        searchLower &&
        !c.controlRef.toLowerCase().includes(searchLower) &&
        !c.controlName.toLowerCase().includes(searchLower) &&
        !(c.controlOwner?.name ?? "").toLowerCase().includes(searchLower)
      ) {
        return false;
      }
      if (areaFilter && c.businessAreaId !== areaFilter) return false;
      if (outcomeFilter && c.consumerDutyOutcome !== outcomeFilter) return false;
      return true;
    });
  }, [controls, search, areaFilter, outcomeFilter, showArchived]);

  // ── Lookup helpers ─────────────────────────────────────────
  function areaName(id: string): string {
    return controlBusinessAreas.find((a) => a.id === id)?.name ?? "—";
  }

  function ownerName(id: string): string {
    return users.find((u) => u.id === id)?.name ?? "—";
  }

  // ── Validation ─────────────────────────────────────────────
  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.controlName.trim()) next.controlName = "Control name is required";
    if (!form.controlDescription.trim()) next.controlDescription = "Description is required";
    if (!form.businessAreaId) next.businessAreaId = "Business area is required";
    if (!form.controlOwnerId) next.controlOwnerId = "Owner is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    try {
      if (editingControl) {
        // PATCH existing
        const updated = await api<ControlRecord>(
          `/api/controls/library/${editingControl.id}`,
          {
            method: "PATCH",
            body: {
              controlName: form.controlName.trim(),
              controlDescription: form.controlDescription.trim(),
              businessAreaId: form.businessAreaId,
              controlOwnerId: form.controlOwnerId,
              consumerDutyOutcome: form.consumerDutyOutcome,
              controlFrequency: form.controlFrequency,
              internalOrThirdParty: form.internalOrThirdParty,
              standingComments: form.standingComments.trim() || null,
            },
          }
        );
        updateControl(editingControl.id, updated);
      } else {
        // POST new
        const created = await api<ControlRecord>("/api/controls/library", {
          method: "POST",
          body: {
            controlName: form.controlName.trim(),
            controlDescription: form.controlDescription.trim(),
            businessAreaId: form.businessAreaId,
            controlOwnerId: form.controlOwnerId,
            consumerDutyOutcome: form.consumerDutyOutcome,
            controlFrequency: form.controlFrequency,
            internalOrThirdParty: form.internalOrThirdParty,
            standingComments: form.standingComments.trim() || null,
          },
        });
        addControl(created);
      }
      setShowDialog(false);
      setEditingControl(null);
    } catch (err) {
      console.error("[ControlsLibraryTab] save failed:", err);
      setErrors({ _form: err instanceof Error ? err.message : "Failed to save control" });
    } finally {
      setSaving(false);
    }
  }

  // ── Archive / Restore ──────────────────────────────────────
  async function handleToggleArchive(control: ControlRecord) {
    const newActive = !control.isActive;
    try {
      const updated = await api<ControlRecord>(
        `/api/controls/library/${control.id}`,
        {
          method: "PATCH",
          body: { isActive: newActive },
        }
      );
      updateControl(control.id, updated);
    } catch (err) {
      console.error("[ControlsLibraryTab] archive toggle failed:", err);
    }
  }

  // ── Shared classes ─────────────────────────────────────────
  const inputClasses =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colours";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "text-xs text-red-500 mt-1";

  // ── Active areas for the filter ────────────────────────────
  const activeAreas = controlBusinessAreas.filter((a) => a.isActive);

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-semibold font-poppins text-updraft-deep">
          Controls Library
        </h2>
        {isCCRO && (
          <button
            onClick={() => {
              setEditingControl(null);
              setShowDialog(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colours"
          >
            <Plus className="h-4 w-4" />
            Add Control
          </button>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="bento-card p-4">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ref, name, or owner..."
                className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colours"
              />
            </div>
          </div>

          {/* Business Area */}
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Business Area
            </label>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className={inputClasses}
            >
              <option value="">All Areas</option>
              {activeAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* CD Outcome */}
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              CD Outcome
            </label>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className={inputClasses}
            >
              <option value="">All Outcomes</option>
              {(
                Object.entries(CD_OUTCOME_LABELS) as [
                  ConsumerDutyOutcomeType,
                  string,
                ][]
              ).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Active / Archived toggle */}
          <div className="flex items-center gap-2 pb-0.5">
            <button
              onClick={() => setShowArchived(false)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colours ${
                !showArchived
                  ? "bg-updraft-pale-purple text-updraft-deep"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colours ${
                showArchived
                  ? "bg-orange-100 text-orange-700"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Archived
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Ref
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Control Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Business Area
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Owner
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  CD Outcome
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Frequency
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Testing Status
                </th>
                {isCCRO && (
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={isCCRO ? 9 : 8}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    {showArchived
                      ? "No archived controls found."
                      : "No controls match the current filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((control) => {
                  const testing = deriveTestingStatus(control);
                  return (
                    <tr
                      key={control.id}
                      className="hover:bg-gray-50/50 transition-colours"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-updraft-deep font-semibold whitespace-nowrap">
                        {control.controlRef}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[240px] truncate">
                        {control.controlName}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {control.businessArea?.name ?? areaName(control.businessAreaId)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {control.controlOwner?.name ?? ownerName(control.controlOwnerId)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-updraft-pale-purple px-2.5 py-0.5 text-xs font-medium text-updraft-deep whitespace-nowrap">
                          {CD_OUTCOME_LABELS[control.consumerDutyOutcome]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {CONTROL_FREQUENCY_LABELS[control.controlFrequency]}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {INTERNAL_THIRD_PARTY_LABELS[control.internalOrThirdParty]}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${testing.bgColour} ${testing.colour}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${testing.dotColour}`}
                          />
                          {testing.label}
                        </span>
                      </td>
                      {isCCRO && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingControl(control);
                                setShowDialog(true);
                              }}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-updraft-pale-purple hover:text-updraft-deep transition-colours"
                              title="Edit control"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleArchive(control)}
                              className={`rounded-lg p-1.5 transition-colours ${
                                control.isActive
                                  ? "text-gray-400 hover:bg-orange-100 hover:text-orange-600"
                                  : "text-gray-400 hover:bg-green-100 hover:text-green-600"
                              }`}
                              title={control.isActive ? "Archive control" : "Restore control"}
                            >
                              {control.isActive ? (
                                <Archive className="h-4 w-4" />
                              ) : (
                                <ArchiveRestore className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary bar */}
        <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-2.5 text-xs text-gray-500 flex items-center gap-4">
          <span>
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span>{" "}
            of <span className="font-semibold text-gray-700">{controls.filter((c) => (showArchived ? !c.isActive : c.isActive)).length}</span>{" "}
            {showArchived ? "archived" : "active"} controls
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            {controls.filter((c) => c.isActive && c.testingSchedule?.isActive).length} in testing
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            {controls.filter((c) => {
              if (!c.isActive || !c.testingSchedule?.isActive) return false;
              const results = c.testingSchedule.testResults ?? [];
              return results.length > 0 && results[0].result === "FAIL";
            }).length} failing
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            {controls.filter((c) => {
              if (!c.isActive) return false;
              if (!c.testingSchedule || !c.testingSchedule.isActive) return false;
              return (c.testingSchedule.testResults ?? []).length === 0;
            }).length} awaiting test
          </span>
        </div>
      </div>

      {/* ── Add / Edit Dialog ───────────────────────────────── */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            {/* Dialog header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold font-poppins text-updraft-deep">
                {editingControl ? "Edit Control" : "Add Control"}
              </h3>
              <button
                onClick={() => {
                  setShowDialog(false);
                  setEditingControl(null);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colours"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form error */}
            {errors._form && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors._form}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Control Name */}
              <div>
                <label htmlFor="ctrl-name" className={labelClasses}>
                  Control Name
                </label>
                <input
                  id="ctrl-name"
                  type="text"
                  value={form.controlName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, controlName: e.target.value }))
                  }
                  placeholder="e.g. Monthly reconciliation review"
                  className={inputClasses}
                />
                {errors.controlName && (
                  <p className={errorClasses}>{errors.controlName}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="ctrl-desc" className={labelClasses}>
                  Description
                </label>
                <textarea
                  id="ctrl-desc"
                  rows={3}
                  value={form.controlDescription}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      controlDescription: e.target.value,
                    }))
                  }
                  placeholder="Describe what this control does..."
                  className={inputClasses}
                />
                {errors.controlDescription && (
                  <p className={errorClasses}>{errors.controlDescription}</p>
                )}
              </div>

              {/* Two-column row: Business Area + Owner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ctrl-area" className={labelClasses}>
                    Business Area
                  </label>
                  <select
                    id="ctrl-area"
                    value={form.businessAreaId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        businessAreaId: e.target.value,
                      }))
                    }
                    className={inputClasses}
                  >
                    <option value="">Select business area...</option>
                    {activeAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {errors.businessAreaId && (
                    <p className={errorClasses}>{errors.businessAreaId}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ctrl-owner" className={labelClasses}>
                    Owner
                  </label>
                  <select
                    id="ctrl-owner"
                    value={form.controlOwnerId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        controlOwnerId: e.target.value,
                      }))
                    }
                    className={inputClasses}
                  >
                    <option value="">Select owner...</option>
                    {users
                      .filter((u) => u.isActive)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                  {errors.controlOwnerId && (
                    <p className={errorClasses}>{errors.controlOwnerId}</p>
                  )}
                </div>
              </div>

              {/* CD Outcome */}
              <div>
                <label htmlFor="ctrl-outcome" className={labelClasses}>
                  Consumer Duty Outcome
                </label>
                <select
                  id="ctrl-outcome"
                  value={form.consumerDutyOutcome}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      consumerDutyOutcome:
                        e.target.value as ConsumerDutyOutcomeType,
                    }))
                  }
                  className={inputClasses}
                >
                  {(
                    Object.entries(CD_OUTCOME_LABELS) as [
                      ConsumerDutyOutcomeType,
                      string,
                    ][]
                  ).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Two-column row: Frequency + Internal/Third Party */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ctrl-freq" className={labelClasses}>
                    Control Frequency
                  </label>
                  <select
                    id="ctrl-freq"
                    value={form.controlFrequency}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        controlFrequency: e.target.value as ControlFrequency,
                      }))
                    }
                    className={inputClasses}
                  >
                    {(
                      Object.entries(CONTROL_FREQUENCY_LABELS) as [
                        ControlFrequency,
                        string,
                      ][]
                    ).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ctrl-type" className={labelClasses}>
                    Internal / Third Party
                  </label>
                  <select
                    id="ctrl-type"
                    value={form.internalOrThirdParty}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        internalOrThirdParty:
                          e.target.value as InternalOrThirdParty,
                      }))
                    }
                    className={inputClasses}
                  >
                    {(
                      Object.entries(INTERNAL_THIRD_PARTY_LABELS) as [
                        InternalOrThirdParty,
                        string,
                      ][]
                    ).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Standing Comments */}
              <div>
                <label htmlFor="ctrl-comments" className={labelClasses}>
                  Standing Comments
                </label>
                <textarea
                  id="ctrl-comments"
                  rows={2}
                  value={form.standingComments}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      standingComments: e.target.value,
                    }))
                  }
                  placeholder="Optional standing comments..."
                  className={inputClasses}
                />
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingControl(null);
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colours"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colours disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? "Saving..."
                    : editingControl
                      ? "Save Changes"
                      : "Add Control"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
