"use client";

import { useState, useEffect } from "react";
import type { Risk, RiskControl, RiskMitigation, ControlEffectiveness, RiskAppetite, DirectionOfTravel, MitigationStatus } from "@/lib/types";
import {
  RISK_CATEGORIES,
  getL2Categories,
  LIKELIHOOD_SCALE,
  IMPACT_SCALE,
  EFFECTIVENESS_DISPLAY,
  APPETITE_DISPLAY,
  DIRECTION_DISPLAY,
} from "@/lib/risk-categories";
import ScoreBadge from "./ScoreBadge";
import { X, Plus, Trash2, AlertTriangle, ChevronRight } from "lucide-react";

interface RiskDetailPanelProps {
  risk: Risk | null;
  isNew: boolean;
  onSave: (data: Partial<Risk> & { controls?: Partial<RiskControl>[]; mitigations?: Partial<RiskMitigation>[] }) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

interface FormControl {
  id?: string;
  description: string;
  controlOwner: string;
}

interface FormMitigation {
  id?: string;
  action: string;
  owner: string;
  deadline: string;
  status: MitigationStatus;
}

export default function RiskDetailPanel({ risk, isNew, onSave, onClose, onDelete }: RiskDetailPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryL1, setCategoryL1] = useState("");
  const [categoryL2, setCategoryL2] = useState("");
  const [owner, setOwner] = useState("");
  const [inherentLikelihood, setInherentLikelihood] = useState(3);
  const [inherentImpact, setInherentImpact] = useState(3);
  const [residualLikelihood, setResidualLikelihood] = useState(2);
  const [residualImpact, setResidualImpact] = useState(2);
  const [controlEffectiveness, setControlEffectiveness] = useState<ControlEffectiveness | "">("");
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite | "">("");
  const [directionOfTravel, setDirectionOfTravel] = useState<DirectionOfTravel>("STABLE");
  const [lastReviewed, setLastReviewed] = useState(new Date().toISOString().split("T")[0]);
  const [controls, setControls] = useState<FormControl[]>([]);
  const [mitigations, setMitigations] = useState<FormMitigation[]>([]);

  // Populate form when risk changes
  useEffect(() => {
    if (risk && !isNew) {
      setName(risk.name);
      setDescription(risk.description);
      setCategoryL1(risk.categoryL1);
      setCategoryL2(risk.categoryL2);
      setOwner(risk.owner);
      setInherentLikelihood(risk.inherentLikelihood);
      setInherentImpact(risk.inherentImpact);
      setResidualLikelihood(risk.residualLikelihood);
      setResidualImpact(risk.residualImpact);
      setControlEffectiveness(risk.controlEffectiveness ?? "");
      setRiskAppetite(risk.riskAppetite ?? "");
      setDirectionOfTravel(risk.directionOfTravel);
      setLastReviewed(risk.lastReviewed.split("T")[0]);
      setControls(risk.controls?.map((c) => ({ id: c.id, description: c.description, controlOwner: c.controlOwner ?? "" })) ?? []);
      setMitigations(risk.mitigations?.map((m) => ({
        id: m.id, action: m.action, owner: m.owner ?? "",
        deadline: m.deadline ? m.deadline.split("T")[0] : "", status: m.status,
      })) ?? []);
    }
  }, [risk, isNew]);

  const l2Options = getL2Categories(categoryL1);
  const residualWarning = residualLikelihood > inherentLikelihood || residualImpact > inherentImpact;

  function handleSave() {
    const data: Record<string, unknown> = {
      name, description, categoryL1, categoryL2, owner,
      inherentLikelihood, inherentImpact, residualLikelihood, residualImpact,
      directionOfTravel, lastReviewed,
      controlEffectiveness: controlEffectiveness || null,
      riskAppetite: riskAppetite || null,
      controls: controls.filter((c) => c.description.trim()).map((c, i) => ({
        description: c.description, controlOwner: c.controlOwner || null, sortOrder: i,
      })),
      mitigations: mitigations.filter((m) => m.action.trim()).map((m) => ({
        action: m.action, owner: m.owner || null,
        deadline: m.deadline || null, status: m.status,
      })),
    };
    onSave(data as Partial<Risk> & { controls?: Partial<RiskControl>[]; mitigations?: Partial<RiskMitigation>[] });
  }

  const canSave = name.trim() && description.trim() && categoryL1 && categoryL2 && owner.trim();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-poppins font-semibold text-gray-900">
              {isNew ? "Add New Risk" : `Edit ${risk?.reference}`}
            </h2>
            {risk && !isNew && (
              <p className="text-xs text-gray-400 mt-0.5">
                Last updated {new Date(risk.updatedAt).toLocaleDateString("en-GB")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-updraft-deep text-white flex items-center justify-center text-xs">1</span>
              Risk Details
            </h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Risk Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Short risk title"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed risk description — cause, event, potential impact"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">L1 Category *</label>
                <select
                  value={categoryL1}
                  onChange={(e) => { setCategoryL1(e.target.value); setCategoryL2(""); }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">Select category...</option>
                  {RISK_CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">L2 Sub-Category *</label>
                <select
                  value={categoryL2}
                  onChange={(e) => setCategoryL2(e.target.value)}
                  disabled={!categoryL1}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Select sub-category...</option>
                  {l2Options.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Risk Owner *</label>
                <input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="Name or role"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Last Reviewed</label>
                <input
                  type="date"
                  value={lastReviewed}
                  onChange={(e) => setLastReviewed(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* Inherent Assessment */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs">2</span>
              Inherent Risk Assessment
              <span className="text-[10px] text-gray-400 font-normal">(before controls)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <ScoreSelector
                label="Likelihood"
                value={inherentLikelihood}
                onChange={setInherentLikelihood}
                options={LIKELIHOOD_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.description }))}
              />
              <ScoreSelector
                label="Impact"
                value={inherentImpact}
                onChange={setInherentImpact}
                options={IMPACT_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.financial }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Inherent Score:</span>
              <ScoreBadge likelihood={inherentLikelihood} impact={inherentImpact} size="md" />
            </div>
          </section>

          {/* Controls */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">3</span>
              Controls
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-400 font-normal">bridging inherent → residual</span>
            </h3>
            {controls.map((ctrl, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={ctrl.description}
                  onChange={(e) => {
                    const next = [...controls];
                    next[i] = { ...next[i], description: e.target.value };
                    setControls(next);
                  }}
                  placeholder="Control description"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
                />
                <input
                  value={ctrl.controlOwner}
                  onChange={(e) => {
                    const next = [...controls];
                    next[i] = { ...next[i], controlOwner: e.target.value };
                    setControls(next);
                  }}
                  placeholder="Owner"
                  className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
                />
                <button
                  onClick={() => setControls(controls.filter((_, j) => j !== i))}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setControls([...controls, { description: "", controlOwner: "" }])}
              className="flex items-center gap-1.5 text-sm text-updraft-bright-purple hover:text-updraft-deep transition-colors"
            >
              <Plus className="w-4 h-4" /> Add control
            </button>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Control Effectiveness</label>
              <select
                value={controlEffectiveness}
                onChange={(e) => setControlEffectiveness(e.target.value as ControlEffectiveness | "")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Not assessed</option>
                {(Object.keys(EFFECTIVENESS_DISPLAY) as ControlEffectiveness[]).map((k) => (
                  <option key={k} value={k}>{EFFECTIVENESS_DISPLAY[k].label}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Residual Assessment */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">4</span>
              Residual Risk Assessment
              <span className="text-[10px] text-gray-400 font-normal">(after controls)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <ScoreSelector
                label="Likelihood"
                value={residualLikelihood}
                onChange={setResidualLikelihood}
                options={LIKELIHOOD_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.description }))}
              />
              <ScoreSelector
                label="Impact"
                value={residualImpact}
                onChange={setResidualImpact}
                options={IMPACT_SCALE.map((s) => ({ value: s.score, label: s.label, description: s.financial }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Residual Score:</span>
              <ScoreBadge likelihood={residualLikelihood} impact={residualImpact} size="md" />
            </div>
            {residualWarning && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-700">
                  Residual score exceeds inherent score on one or more axes. Controls typically reduce risk — please verify.
                </span>
              </div>
            )}
          </section>

          {/* Inherent → Residual Visual */}
          <section className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">Inherent</div>
                <ScoreBadge likelihood={inherentLikelihood} impact={inherentImpact} size="lg" />
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[10px] text-gray-400 mb-0.5">{controls.filter((c) => c.description.trim()).length} controls</div>
                <div className="w-16 h-0.5 bg-gray-300 relative">
                  <div className="absolute -right-1 -top-1 text-gray-400">→</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">Residual</div>
                <ScoreBadge likelihood={residualLikelihood} impact={residualImpact} size="lg" />
              </div>
            </div>
          </section>

          {/* Direction & Appetite */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs">5</span>
              Additional
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Direction of Travel</label>
                <select
                  value={directionOfTravel}
                  onChange={(e) => setDirectionOfTravel(e.target.value as DirectionOfTravel)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  {(Object.keys(DIRECTION_DISPLAY) as DirectionOfTravel[]).map((k) => (
                    <option key={k} value={k}>{DIRECTION_DISPLAY[k].icon} {DIRECTION_DISPLAY[k].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Risk Appetite</label>
                <select
                  value={riskAppetite}
                  onChange={(e) => setRiskAppetite(e.target.value as RiskAppetite | "")}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">Not set</option>
                  {(Object.keys(APPETITE_DISPLAY) as RiskAppetite[]).map((k) => (
                    <option key={k} value={k}>{APPETITE_DISPLAY[k]}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Mitigations */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">6</span>
              Mitigation Actions
              <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
            </h3>
            {mitigations.map((mit, i) => (
              <div key={i} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex gap-2">
                  <input
                    value={mit.action}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...next[i], action: e.target.value };
                      setMitigations(next);
                    }}
                    placeholder="Action description"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
                  />
                  <button
                    onClick={() => setMitigations(mitigations.filter((_, j) => j !== i))}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={mit.owner}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...next[i], owner: e.target.value };
                      setMitigations(next);
                    }}
                    placeholder="Owner"
                    className="w-28 px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                  <input
                    type="date"
                    value={mit.deadline}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...next[i], deadline: e.target.value };
                      setMitigations(next);
                    }}
                    className="w-36 px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                  <select
                    value={mit.status}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...next[i], status: e.target.value as MitigationStatus };
                      setMitigations(next);
                    }}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETE">Complete</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              onClick={() => setMitigations([...mitigations, { action: "", owner: "", deadline: "", status: "OPEN" }])}
              className="flex items-center gap-1.5 text-sm text-updraft-bright-purple hover:text-updraft-deep transition-colors"
            >
              <Plus className="w-4 h-4" /> Add mitigation action
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            {!isNew && onDelete && (
              <button
                onClick={() => { if (risk && confirm("Delete this risk? This cannot be undone.")) onDelete(risk.id); }}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Delete risk
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 text-sm font-medium text-white bg-updraft-deep rounded-lg hover:bg-updraft-bar disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isNew ? "Create Risk" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Score Selector Sub-Component ──────────────────────────────────────────

function ScoreSelector({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string; description: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="space-y-1">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-updraft-bright-purple bg-updraft-pale-purple/20 ring-1 ring-updraft-bright-purple/30"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span
                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                  isSelected ? "bg-updraft-deep text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {opt.value}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                <span className="text-[10px] text-gray-400 ml-1 truncate">{opt.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
