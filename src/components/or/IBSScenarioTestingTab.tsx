"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import type { ResilienceScenario, ScenarioType, ScenarioStatus, ScenarioOutcome } from "@/lib/types";
import { SCENARIO_TYPE_LABELS, SCENARIO_STATUS_LABELS, SCENARIO_STATUS_COLOURS, SCENARIO_OUTCOME_LABELS, SCENARIO_OUTCOME_COLOURS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

const SCENARIO_TYPES: ScenarioType[] = [
  "CYBER_ATTACK", "SYSTEM_OUTAGE", "THIRD_PARTY_FAILURE", "PANDEMIC",
  "BUILDING_LOSS", "DATA_CORRUPTION", "KEY_PERSON_LOSS", "REGULATORY_CHANGE",
];

export default function IBSScenarioTestingTab({ ibsId, isCCRO }: { ibsId: string; isCCRO: boolean }) {
  const [scenarios, setScenarios] = useState<ResilienceScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", scenarioType: "CYBER_ATTACK" as ScenarioType,
    testedAt: "", nextTestDate: "", conductedBy: "",
    status: "PLANNED" as ScenarioStatus, outcome: "NOT_TESTED" as ScenarioOutcome,
    findings: "", remediationRequired: false,
  });

  useEffect(() => {
    api<ResilienceScenario[]>(`/api/ibs/${ibsId}/scenarios`)
      .then(setScenarios)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ibsId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api<ResilienceScenario>(`/api/ibs/${ibsId}/scenarios`, {
        method: "POST",
        body: {
          ...form,
          testedAt: form.testedAt ? new Date(form.testedAt).toISOString() : null,
          nextTestDate: form.nextTestDate ? new Date(form.nextTestDate).toISOString() : null,
          description: form.description || null,
          conductedBy: form.conductedBy || null,
          findings: form.findings || null,
        },
      });
      setScenarios((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ name: "", description: "", scenarioType: "CYBER_ATTACK", testedAt: "", nextTestDate: "", conductedBy: "", status: "PLANNED", outcome: "NOT_TESTED", findings: "", remediationRequired: false });
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-5 text-sm text-gray-400">Loading scenarios…</div>;

  const breachCount = scenarios.filter((s) => s.outcome === "BREACH").length;
  const testedCount = scenarios.filter((s) => s.status === "COMPLETE").length;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""} logged</p>
          <p className="text-xs text-gray-400">{testedCount} complete · {breachCount} tolerance breach{breachCount !== 1 ? "es" : ""}</p>
        </div>
        {isCCRO && (
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-xs bg-updraft-deep text-white px-3 py-1.5 rounded-lg hover:bg-updraft-bar">
            <Plus size={12} /> Log Test
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Log Scenario Test</h3>
            <button type="button" onClick={() => setShowForm(false)}><X size={14} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Scenario Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Scenario Type *</label>
              <select value={form.scenarioType} onChange={(e) => setForm({ ...form, scenarioType: e.target.value as ScenarioType })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {SCENARIO_TYPES.map((t) => <option key={t} value={t}>{SCENARIO_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ScenarioStatus })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETE">Complete</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Outcome</label>
              <select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value as ScenarioOutcome })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="NOT_TESTED">Not Tested</option>
                <option value="WITHIN_TOLERANCE">Within Tolerance</option>
                <option value="BREACH">Tolerance Breach</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Date Tested</label>
              <input type="date" value={form.testedAt} onChange={(e) => setForm({ ...form, testedAt: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Next Test Date</label>
              <input type="date" value={form.nextTestDate} onChange={(e) => setForm({ ...form, nextTestDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Conducted By</label>
              <input value={form.conductedBy} onChange={(e) => setForm({ ...form, conductedBy: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Findings</label>
              <textarea rows={3} value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="remediation" checked={form.remediationRequired} onChange={(e) => setForm({ ...form, remediationRequired: e.target.checked })} />
              <label htmlFor="remediation" className="text-sm text-gray-700">Remediation required</label>
            </div>
          </div>
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
            return (
              <div key={s.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-gray-400">{s.reference}</p>
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{SCENARIO_TYPE_LABELS[s.scenarioType]}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sc.bg, sc.text)}>{SCENARIO_STATUS_LABELS[s.status]}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", oc.bg, oc.text)}>{SCENARIO_OUTCOME_LABELS[s.outcome]}</span>
                  </div>
                </div>
                {(s.testedAt || s.conductedBy) && (
                  <p className="text-xs text-gray-400 mt-2">
                    {s.testedAt && <>Tested: {new Date(s.testedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>}
                    {s.conductedBy && <> · {s.conductedBy}</>}
                  </p>
                )}
                {s.findings && <p className="text-sm text-gray-700 mt-2 leading-relaxed">{s.findings}</p>}
                {s.remediationRequired && (
                  <p className="text-xs text-red-600 font-medium mt-2">⚠ Remediation required</p>
                )}
                {s.nextTestDate && (
                  <p className="text-xs text-gray-400 mt-1">Next test: {new Date(s.nextTestDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
