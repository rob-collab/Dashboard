"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import type { ImportantBusinessService } from "@/lib/types";
import { IBS_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/common/ConfirmDialog";

const CATEGORIES = ["PEOPLE", "PROCESSES", "TECHNOLOGY", "FACILITIES", "INFORMATION"] as const;

function maturityColor(score: number) {
  if (score === 0) return "bg-gray-100 text-gray-400";
  if (score <= 2) return "bg-red-100 text-red-700";
  if (score === 3) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}

export default function IBSOverviewTab({
  ibs,
  onUpdate,
  isCCRO,
}: {
  ibs: ImportantBusinessService;
  onUpdate: (updated: ImportantBusinessService) => void;
  isCCRO: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [form, setForm] = useState({
    name: ibs.name,
    description: ibs.description ?? "",
    impactToleranceStatement: ibs.impactToleranceStatement ?? "",
    maxTolerableDisruptionHours: ibs.maxTolerableDisruptionHours?.toString() ?? "",
    rtoHours: ibs.rtoHours?.toString() ?? "",
    rpoHours: ibs.rpoHours?.toString() ?? "",
    smfAccountable: ibs.smfAccountable ?? "",
    status: ibs.status,
  });

  // Reset form when IBS changes (e.g. navigating between IBS records)
  useEffect(() => {
    setForm({
      name: ibs.name,
      description: ibs.description ?? "",
      impactToleranceStatement: ibs.impactToleranceStatement ?? "",
      maxTolerableDisruptionHours: ibs.maxTolerableDisruptionHours?.toString() ?? "",
      rtoHours: ibs.rtoHours?.toString() ?? "",
      rpoHours: ibs.rpoHours?.toString() ?? "",
      smfAccountable: ibs.smfAccountable ?? "",
      status: ibs.status,
    });
    setEditing(false);
  }, [ibs.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty =
    form.name !== ibs.name ||
    form.description !== (ibs.description ?? "") ||
    form.impactToleranceStatement !== (ibs.impactToleranceStatement ?? "") ||
    form.maxTolerableDisruptionHours !== (ibs.maxTolerableDisruptionHours?.toString() ?? "") ||
    form.rtoHours !== (ibs.rtoHours?.toString() ?? "") ||
    form.rpoHours !== (ibs.rpoHours?.toString() ?? "") ||
    form.smfAccountable !== (ibs.smfAccountable ?? "") ||
    form.status !== ibs.status;

  function handleCancelEdit() {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      setEditing(false);
    }
  }

  const processCount = ibs.processLinks?.length ?? 0;
  const avgMaturity = processCount > 0
    ? Math.round((ibs.processLinks ?? []).reduce((s, l) => s + (l.process?.maturityScore ?? 1), 0) / processCount)
    : 0;
  const categoriesFilled = new Set(
    (ibs.resourceMaps ?? []).filter((m) => Object.keys(m.content as object).length > 0).map((m) => m.category)
  ).size;

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api<ImportantBusinessService>(`/api/ibs/${ibs.id}`, {
        method: "PATCH",
        body: {
          name: form.name,
          description: form.description || null,
          impactToleranceStatement: form.impactToleranceStatement || null,
          maxTolerableDisruptionHours: form.maxTolerableDisruptionHours ? parseInt(form.maxTolerableDisruptionHours) : null,
          rtoHours: form.rtoHours ? parseInt(form.rtoHours) : null,
          rpoHours: form.rpoHours ? parseInt(form.rpoHours) : null,
          smfAccountable: form.smfAccountable || null,
          status: form.status,
        },
      });
      onUpdate(updated);
      setEditing(false);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 space-y-5">
      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); setEditing(false); }}
        title="Unsaved changes"
        message="You have unsaved changes. Discard them and close?"
        confirmLabel="Discard changes"
        variant="warning"
      />
      {/* Header actions */}
      {isCCRO && !editing && (
        <div className="flex justify-end">
          <button onClick={() => setEditing(true)} className="text-xs text-updraft-deep border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
            Edit
          </button>
        </div>
      )}

      {/* Readiness summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bento-card text-center">
          <p className="text-xs text-gray-400 mb-1">Processes</p>
          <p className="text-2xl font-poppins font-bold text-gray-900">{processCount}</p>
        </div>
        <div className={cn("bento-card text-center", maturityColor(avgMaturity))}>
          <p className="text-xs mb-1">Avg Maturity</p>
          <p className="text-2xl font-poppins font-bold">{avgMaturity || "—"}</p>
        </div>
        <div className="bento-card text-center">
          <p className="text-xs text-gray-400 mb-1">Categories</p>
          <p className="text-2xl font-poppins font-bold text-gray-900">{categoriesFilled}/5</p>
        </div>
      </div>

      {/* 5-category checklist */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">PS21/3 Resource Categories</p>
        <div className="grid grid-cols-5 gap-2">
          {CATEGORIES.map((cat) => {
            const filled = (ibs.resourceMaps ?? []).some(
              (m) => m.category === cat && Object.keys(m.content as object).length > 0
            );
            return (
              <div key={cat} className={cn("rounded-lg p-2 text-center text-xs font-medium border", filled ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-400")}>
                <span className="block text-base mb-0.5">{filled ? "✓" : "○"}</span>
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
              </div>
            );
          })}
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} multiline />
          <Field label="Impact Tolerance Statement" value={form.impactToleranceStatement} onChange={(v) => setForm({ ...form, impactToleranceStatement: v })} multiline />
          <div className="grid grid-cols-3 gap-3">
            <Field label="MTD (hours)" value={form.maxTolerableDisruptionHours} onChange={(v) => setForm({ ...form, maxTolerableDisruptionHours: v })} type="number" />
            <Field label="RTO (hours)" value={form.rtoHours} onChange={(v) => setForm({ ...form, rtoHours: v })} type="number" />
            <Field label="RPO (hours)" value={form.rpoHours} onChange={(v) => setForm({ ...form, rpoHours: v })} type="number" />
          </div>
          <Field label="SMF Accountable" value={form.smfAccountable} onChange={(v) => setForm({ ...form, smfAccountable: v })} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="ACTIVE">Active</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={handleCancelEdit} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <InfoRow label="Status" value={IBS_STATUS_LABELS[ibs.status]} />
          <InfoRow label="SMF Accountable" value={ibs.smfAccountable} />
          <InfoRow label="MTD" value={ibs.maxTolerableDisruptionHours != null ? `${ibs.maxTolerableDisruptionHours} hours` : null} />
          <InfoRow label="RTO" value={ibs.rtoHours != null ? `${ibs.rtoHours} hours` : null} />
          <InfoRow label="RPO" value={ibs.rpoHours != null ? `${ibs.rpoHours} hours` : null} />
          {ibs.description && <InfoRow label="Description" value={ibs.description} />}
          {ibs.impactToleranceStatement && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Impact Tolerance Statement</p>
              <p className="text-sm text-gray-700 leading-relaxed">{ibs.impactToleranceStatement}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-4">
      <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, multiline, type }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
      ) : (
        <input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      )}
    </div>
  );
}
