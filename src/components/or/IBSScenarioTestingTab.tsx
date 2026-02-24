"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import type { ResilienceScenario, ScenarioType, ScenarioStatus, ScenarioOutcome } from "@/lib/types";
import { SCENARIO_TYPE_LABELS, SCENARIO_STATUS_LABELS, SCENARIO_STATUS_COLOURS, SCENARIO_OUTCOME_LABELS, SCENARIO_OUTCOME_COLOURS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, X, Edit2, ChevronDown, ChevronUp } from "lucide-react";

const SCENARIO_TYPES: ScenarioType[] = [
  "CYBER_ATTACK", "SYSTEM_OUTAGE", "THIRD_PARTY_FAILURE", "PANDEMIC",
  "BUILDING_LOSS", "DATA_CORRUPTION", "KEY_PERSON_LOSS", "REGULATORY_CHANGE",
];

type ScenarioForm = {
  name: string;
  description: string;
  scenarioType: ScenarioType;
  testedAt: string;
  nextTestDate: string;
  conductedBy: string;
  status: ScenarioStatus;
  outcome: ScenarioOutcome;
  findings: string;
  remediationRequired: boolean;
};

const EMPTY_FORM: ScenarioForm = {
  name: "", description: "", scenarioType: "CYBER_ATTACK", testedAt: "", nextTestDate: "",
  conductedBy: "", status: "PLANNED", outcome: "NOT_TESTED", findings: "", remediationRequired: false,
};

function toFormValues(s: ResilienceScenario): ScenarioForm {
  return {
    name: s.name,
    description: s.description ?? "",
    scenarioType: s.scenarioType,
    testedAt: s.testedAt ? s.testedAt.split("T")[0] : "",
    nextTestDate: s.nextTestDate ? s.nextTestDate.split("T")[0] : "",
    conductedBy: s.conductedBy ?? "",
    status: s.status,
    outcome: s.outcome,
    findings: s.findings ?? "",
    remediationRequired: s.remediationRequired,
  };
}

export default function IBSScenarioTestingTab({ ibsId, isCCRO }: { ibsId: string; isCCRO: boolean }) {
  const [scenarios, setScenarios] = useState<ResilienceScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ScenarioForm>(EMPTY_FORM);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<ScenarioForm>(EMPTY_FORM);

  useEffect(() => {
    api<ResilienceScenario[]>(`/api/ibs/${ibsId}/scenarios`)
      .then(setScenarios)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ibsId]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function startEdit(s: ResilienceScenario) {
    setEditForm(toFormValues(s));
    setEditingId(s.id);
    setShowForm(false);
  }

  function buildBody(f: ScenarioForm) {
    return {
      ...f,
      testedAt: f.testedAt ? new Date(f.testedAt).toISOString() : null,
      nextTestDate: f.nextTestDate ? new Date(f.nextTestDate).toISOString() : null,
      description: f.description || null,
      conductedBy: f.conductedBy || null,
      findings: f.findings || null,
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api<ResilienceScenario>(`/api/ibs/${ibsId}/scenarios`, {
        method: "POST",
        body: buildBody(form),
      });
      setScenarios((prev) => [created, ...prev]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const updated = await api<ResilienceScenario>(`/api/ibs/${ibsId}/scenarios/${editingId}`, {
        method: "PATCH",
        body: buildBody(editForm),
      });
      setScenarios((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      setEditingId(null);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-5 text-sm text-gray-400">Loading scenarios…</div>;

  const breachCount = scenarios.filter((s) => s.outcome === "BREACH").length;
  const testedCount = scenarios.filter((s) => s.status === "COMPLETE").length;

  const FormFields = ({ f, onChange }: { f: ScenarioForm; onChange: (next: ScenarioForm) => void }) => (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Scenario Name *</label>
        <input required value={f.name} onChange={(e) => onChange({ ...f, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Scenario Type *</label>
        <select value={f.scenarioType} onChange={(e) => onChange({ ...f, scenarioType: e.target.value as ScenarioType })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          {SCENARIO_TYPES.map((t) => <option key={t} value={t}>{SCENARIO_TYPE_LABELS[t]}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
        <select value={f.status} onChange={(e) => onChange({ ...f, status: e.target.value as ScenarioStatus })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETE">Complete</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Outcome</label>
        <select value={f.outcome} onChange={(e) => onChange({ ...f, outcome: e.target.value as ScenarioOutcome })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="NOT_TESTED">Not Tested</option>
          <option value="WITHIN_TOLERANCE">Within Tolerance</option>
          <option value="BREACH">Tolerance Breach</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Date Tested</label>
        <input type="date" value={f.testedAt} onChange={(e) => onChange({ ...f, testedAt: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Next Test Date</label>
        <input type="date" value={f.nextTestDate} onChange={(e) => onChange({ ...f, nextTestDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium text-gray-600 block mb-1">Conducted By</label>
        <input value={f.conductedBy} onChange={(e) => onChange({ ...f, conductedBy: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium text-gray-600 block mb-1">Findings</label>
        <textarea rows={3} value={f.findings} onChange={(e) => onChange({ ...f, findings: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>
      <div className="col-span-2 flex items-center gap-2">
        <input type="checkbox" id={`remediation-${f.name}`} checked={f.remediationRequired} onChange={(e) => onChange({ ...f, remediationRequired: e.target.checked })} />
        <label htmlFor={`remediation-${f.name}`} className="text-sm text-gray-700">Remediation required</label>
      </div>
    </div>
  );

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""} logged</p>
          <p className="text-xs text-gray-400">{testedCount} complete · {breachCount} tolerance breach{breachCount !== 1 ? "es" : ""}</p>
        </div>
        {isCCRO && (
          <button onClick={() => { setShowForm(true); setEditingId(null); }} className="inline-flex items-center gap-1.5 text-xs bg-updraft-deep text-white px-3 py-1.5 rounded-lg hover:bg-updraft-bar">
            <Plus size={12} /> Log Test
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Log Scenario Test</h3>
            <button type="button" onClick={() => setShowForm(false)}><X size={14} className="text-gray-400" /></button>
          </div>
          <FormFields f={form} onChange={setForm} />
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      {scenarios.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">No scenario tests logged</p>
          <p className="mt-1 text-xs">FCA PS21/3 requires firms to test severe but plausible scenarios annually for each IBS. Log your first test above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map((s) => {
            const sc = SCENARIO_STATUS_COLOURS[s.status];
            const oc = SCENARIO_OUTCOME_COLOURS[s.outcome];
            const isEditing = editingId === s.id;
            const isExpanded = expandedIds.has(s.id);
            return (
              <div key={s.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Row header — click to expand findings */}
                <button
                  type="button"
                  className="w-full text-left p-4 hover:bg-gray-50/50 transition-colors"
                  onClick={() => !isEditing && toggleExpand(s.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-gray-400">{s.reference}</p>
                      <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{SCENARIO_TYPE_LABELS[s.scenarioType]}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sc.bg, sc.text)}>{SCENARIO_STATUS_LABELS[s.status]}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", oc.bg, oc.text)}>{SCENARIO_OUTCOME_LABELS[s.outcome]}</span>
                      {isCCRO && !isEditing && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startEdit(s); }}
                          className="p-1 text-gray-400 hover:text-updraft-deep"
                          title="Edit scenario"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      {!isEditing && (
                        <span className="text-gray-300">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      )}
                    </div>
                  </div>
                  {(s.testedAt || s.conductedBy) && (
                    <p className="text-xs text-gray-400 mt-2">
                      {s.testedAt && <>Tested: {new Date(s.testedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>}
                      {s.conductedBy && <> · {s.conductedBy}</>}
                    </p>
                  )}
                  {s.remediationRequired && (
                    <p className="text-xs text-red-600 font-medium mt-1">⚠ Remediation required</p>
                  )}
                  {s.nextTestDate && (
                    <p className="text-xs text-gray-400 mt-1">Next test: {new Date(s.nextTestDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  )}
                </button>

                {/* Expanded findings (read-only) */}
                {isExpanded && !isEditing && s.findings && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/50">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Findings</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{s.findings}</p>
                  </div>
                )}
                {isExpanded && !isEditing && !s.findings && (
                  <div className="border-t border-gray-100 px-4 pb-3 pt-3 bg-gray-50/50">
                    <p className="text-xs text-gray-400 italic">No findings recorded.</p>
                  </div>
                )}

                {/* Inline edit form */}
                {isEditing && (
                  <form onSubmit={handleEdit} className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-semibold text-gray-700">Edit Scenario</h4>
                      <button type="button" onClick={() => setEditingId(null)}><X size={13} className="text-gray-400" /></button>
                    </div>
                    <FormFields f={editForm} onChange={setEditForm} />
                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">{saving ? "Saving…" : "Save Changes"}</button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
