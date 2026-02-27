"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Upload,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import type {
  ControlRecord,
  ConsumerDutyOutcomeType,
  ControlFrequency,
  InternalOrThirdParty,
  ControlType,
} from "@/lib/types";
import {
  CD_OUTCOME_LABELS,
  CONTROL_FREQUENCY_LABELS,
  CONTROL_TYPE_LABELS,
} from "@/lib/types";
import ControlDetailModal from "./ControlDetailModal";
import ControlCSVUploadDialog from "./ControlCSVUploadDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { api } from "@/lib/api-client";
import { deriveTestingStatus } from "@/lib/controls-utils";
import { useHasPermission } from "@/lib/usePermission";

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  controlType: ControlType | "";
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
  controlType: "",
  standingComments: "",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function ControlsLibraryTab({ initialControlId, initialTypeFilter }: { initialControlId?: string | null; initialTypeFilter?: string | null }) {
  const controls = useAppStore((s) => s.controls);
  const controlBusinessAreas = useAppStore((s) => s.controlBusinessAreas);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const policies = useAppStore((s) => s.policies);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Reverse lookup: control ID → number of policies linked
  const policyCountByControl = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of policies) {
      for (const link of p.controlLinks ?? []) {
        counts[link.controlId] = (counts[link.controlId] ?? 0) + 1;
      }
    }
    return counts;
  }, [policies]);
  const addControl = useAppStore((s) => s.addControl);
  const updateControl = useAppStore((s) => s.updateControl);
  const hydrate = useAppStore((s) => s.hydrate);

  const isCCRO = currentUser?.role === "CCRO_TEAM";
  const canCreateControl = useHasPermission("create:control");
  const canBypassApproval = useHasPermission("can:bypass-approval");

  // ── Detail modal state ──────────────────────────────────────
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);

  // ── Deep-link: auto-select control from URL param ─────────
  useEffect(() => {
    if (initialControlId) setSelectedControlId(initialControlId);
  }, [initialControlId]);

  // Write ?control=<id> to URL when panel opens; clear when it closes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedControlId) {
      if (params.get("control") !== selectedControlId) {
        params.set("control", selectedControlId);
        params.set("tab", "library");
        router.replace(`/controls?${params.toString()}`, { scroll: false });
      }
    } else {
      if (params.has("control")) {
        params.delete("control");
        router.replace(`/controls?${params.toString()}`, { scroll: false });
      }
    }
  // searchParams deliberately excluded — read once per panel state change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedControlId]);

  // ── Filters ────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<ControlType | "">(
    (initialTypeFilter as ControlType | "") || ""
  );
  const [showArchived, setShowArchived] = useState(false);
  const [myControlsOnly, setMyControlsOnly] = useState(false);
  const [myControlsInitialized, setMyControlsInitialized] = useState(false);

  // My controls count
  const myControlsCount = useMemo(
    () => controls.filter((c) => c.isActive !== false && c.controlOwnerId === currentUser?.id).length,
    [controls, currentUser],
  );

  // Default to "my controls" if user owns any (runs once after data loads)
  useEffect(() => {
    if (myControlsInitialized || controls.length === 0 || !currentUser?.id) return;
    const owned = controls.filter((c) => c.isActive !== false && c.controlOwnerId === currentUser.id);
    if (owned.length > 0) setMyControlsOnly(true);
    setMyControlsInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.length, currentUser?.id]);

  // ── Import dialog state ────────────────────────────────────
  const [showImportDialog, setShowImportDialog] = useState(false);

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
          controlType: editingControl.controlType ?? "",
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

      // My controls filter
      if (myControlsOnly && c.controlOwnerId !== currentUser?.id) return false;

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
      if (typeFilter && c.controlType !== typeFilter) return false;
      return true;
    });
  }, [controls, search, areaFilter, outcomeFilter, typeFilter, showArchived, myControlsOnly, currentUser?.id]);

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
              controlType: form.controlType || null,
              standingComments: form.standingComments.trim() || null,
            },
          }
        );
        updateControl(editingControl.id, updated);
        toast.success("Control saved");
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
            controlType: form.controlType || null,
            standingComments: form.standingComments.trim() || null,
          },
        });
        addControl(created);
        toast.success("Control created");
      }
      setShowDialog(false);
      setEditingControl(null);
    } catch (err) {
      console.error("[ControlsLibraryTab] save failed:", err);
      toast.error("Failed to save control — please try again");
      setErrors({ _form: err instanceof Error ? err.message : "Failed to save control — please try again" });
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
      toast.success(newActive ? "Control restored" : "Control archived");
    } catch (err) {
      console.error("[ControlsLibraryTab] archive toggle failed:", err);
      toast.error("Failed to save control — please try again");
    }
  }

  // ── Shared classes ─────────────────────────────────────────
  const inputClasses =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colours";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "text-xs text-red-500 mt-1";

  // ── Active areas for the filter ────────────────────────────
  const activeAreas = controlBusinessAreas.filter((a) => a.isActive);

  // ── CSV Export ───────────────────────────────────────────────
  function handleExportCSV() {
    const headers = ["Ref", "Name", "Description", "Business Area", "Owner", "CD Outcome", "Frequency", "Type", "Internal/3rd Party", "Active"];
    const rows = filtered.map((c) => [
      c.controlRef, c.controlName, c.controlDescription,
      areaName(c.businessAreaId), ownerName(c.controlOwnerId),
      CD_OUTCOME_LABELS[c.consumerDutyOutcome] ?? c.consumerDutyOutcome,
      CONTROL_FREQUENCY_LABELS[c.controlFrequency] ?? c.controlFrequency,
      c.controlType ? (CONTROL_TYPE_LABELS[c.controlType] ?? c.controlType) : "",
      c.internalOrThirdParty ?? "", c.isActive ? "Active" : "Archived",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `controls-library-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-semibold font-poppins text-updraft-deep">
          Controls Library
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colours"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          {isCCRO && (
            <button
              onClick={() => setShowImportDialog(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colours"
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </button>
          )}
          {canCreateControl && (
            <button
              onClick={() => {
                setEditingControl(null);
                setShowDialog(true);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colours ${
                !canBypassApproval ? "bg-amber-600 hover:bg-amber-700" : "bg-updraft-bright-purple hover:bg-updraft-deep"
              }`}
            >
              <Plus className="h-4 w-4" />
              {canBypassApproval ? "Add Control" : "Submit Control"}
            </button>
          )}
        </div>
      </div>

      {/* ── My Controls ─────────────────────────────────────── */}
      {currentUser && myControlsCount > 0 && (
        <button
          onClick={() => setMyControlsOnly((v) => !v)}
          className={`w-full text-left bento-card p-4 transition-all border-2 ${
            myControlsOnly
              ? "border-updraft-bright-purple bg-updraft-pale-purple/20"
              : "border-transparent hover:border-updraft-bright-purple/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2.5 ${myControlsOnly ? "bg-updraft-bright-purple" : "bg-updraft-pale-purple"}`}>
                <ShieldCheck className={`h-5 w-5 ${myControlsOnly ? "text-white" : "text-updraft-deep"}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">My Controls</p>
                <p className="text-2xl font-bold text-updraft-deep font-poppins leading-none mt-0.5">{myControlsCount}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                myControlsOnly
                  ? "bg-updraft-bright-purple text-white"
                  : "bg-updraft-pale-purple/40 text-updraft-deep"
              }`}>
                {myControlsOnly ? "Showing mine" : "Click to filter"}
              </span>
              <p className="text-xs text-gray-400 mt-1">Controls you own</p>
            </div>
          </div>
        </button>
      )}

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="bento-card p-4">
        <div className="flex flex-col md:flex-row md:flex-wrap gap-3 items-start md:items-end">
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

          {/* Control Type */}
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Control Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ControlType | "")}
              className={inputClasses}
            >
              <option value="">All Types</option>
              {(Object.entries(CONTROL_TYPE_LABELS) as [ControlType, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
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

      {/* ── Area Quick-Filter Chips ─────────────────────────── */}
      {activeAreas.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          <button
            onClick={() => setAreaFilter("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              !areaFilter
                ? "bg-updraft-deep text-white border-updraft-deep"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            All Areas
          </button>
          {activeAreas.map((area) => (
            <button
              key={area.id}
              onClick={() => setAreaFilter(areaFilter === area.id ? "" : area.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                areaFilter === area.id
                  ? "bg-updraft-deep text-white border-updraft-deep"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="bento-card">
        <div className="overflow-auto overflow-x-auto table-scroll max-h-[520px]">
          <table className="w-full text-sm min-w-[1100px]">
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
                  Int/Ext
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Control Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Testing Status
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Risks
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Policies
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Regulations
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
                  <td colSpan={isCCRO ? 13 : 12}>
                    <EmptyState
                      icon={<ShieldCheck className="h-7 w-7" />}
                      heading={
                        showArchived
                          ? "No archived controls"
                          : controls.length === 0
                          ? "No controls yet"
                          : "No controls match these filters"
                      }
                      description={
                        showArchived
                          ? "Controls removed from the active library will appear here."
                          : controls.length === 0
                          ? "The controls library is empty. Add your first control to begin tracking your 2LOD testing programme."
                          : "Try clearing a filter or broadening your search term."
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((control) => {
                  const testing = deriveTestingStatus(control);
                  return (
                    <tr
                      key={control.id}
                      className="hover:bg-gray-50/50 transition-colours cursor-pointer"
                      onClick={() => setSelectedControlId(control.id)}
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
                        {control.controlType ? (
                          <span className="inline-block rounded-full bg-updraft-pale-purple px-2.5 py-0.5 text-xs font-medium text-updraft-deep whitespace-nowrap">
                            {CONTROL_TYPE_LABELS[control.controlType]}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
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
                      <td className="px-4 py-3 text-center">
                        {(control.riskLinks?.length ?? 0) > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-updraft-pale-purple/40 px-2 py-0.5 text-xs font-semibold text-updraft-deep">
                            {control.riskLinks!.length}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700" title="No risks linked — this control is orphaned">
                            Orphaned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(policyCountByControl[control.id] ?? 0) > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {policyCountByControl[control.id]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(control.regulationLinks?.length ?? 0) > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                            {control.regulationLinks!.length}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">&mdash;</span>
                        )}
                      </td>
                      {isCCRO && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingControl(control);
                                setShowDialog(true);
                              }}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-updraft-pale-purple hover:text-updraft-deep transition-colours"
                              title="Edit control"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleArchive(control); }}
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
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
            {controls.filter((c) => c.isActive && deriveTestingStatus(c).label === "Overdue").length} overdue
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
                aria-label="Close"
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
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      controlDescription: e.target.value,
                    }));
                    // Auto-resize
                    const el = e.target;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                  placeholder="Describe what this control does..."
                  className={`${inputClasses} resize-y`}
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

              {/* Control Type */}
              <div>
                <label htmlFor="ctrl-control-type" className={labelClasses}>
                  Control Type
                </label>
                <select
                  id="ctrl-control-type"
                  value={form.controlType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      controlType: e.target.value as ControlType | "",
                    }))
                  }
                  className={inputClasses}
                >
                  <option value="">Not specified</option>
                  {(
                    Object.entries(CONTROL_TYPE_LABELS) as [
                      ControlType,
                      string,
                    ][]
                  ).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colours disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving
                    ? "Saving…"
                    : editingControl
                      ? "Save Changes"
                      : "Add Control"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Control Detail Modal ──────────────────────────────── */}
      <ControlDetailModal
        controlId={selectedControlId}
        onClose={() => setSelectedControlId(null)}
        onEditControl={isCCRO ? (c) => { setEditingControl(c); setShowDialog(true); } : undefined}
      />

      <ControlCSVUploadDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={() => { setShowImportDialog(false); hydrate(); }}
      />
    </div>
  );
}
