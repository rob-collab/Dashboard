"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { usePermissionSet } from "@/lib/usePermission";
import {
  BREACH_STATUS_LABELS,
  BREACH_STATUS_COLOURS,
  type ConductRuleBreach,
  type BreachStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils";
import { generateId } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Scale,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function ConductRulesPanel() {
  const conductRules = useAppStore((s) => s.conductRules);
  const conductRuleBreaches = useAppStore((s) => s.conductRuleBreaches);
  const users = useAppStore((s) => s.users);
  const addConductRuleBreach = useAppStore((s) => s.addConductRuleBreach);
  const updateConductRuleBreach = useAppStore((s) => s.updateConductRuleBreach);
  const currentUser = useAppStore((s) => s.currentUser);
  const permissionSet = usePermissionSet();
  const canManage = permissionSet.has("manage:smcr");

  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [showNewBreach, setShowNewBreach] = useState(false);
  const [editingBreachId, setEditingBreachId] = useState<string | null>(null);
  const [editBreachStatus, setEditBreachStatus] = useState<BreachStatus>("IDENTIFIED");

  // New breach form
  const [newRuleId, setNewRuleId] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const toggleRule = (id: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllRules = () => setExpandedRules(new Set(conductRules.map((r) => r.id)));
  const collapseAllRules = () => setExpandedRules(new Set());

  const getUserName = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user?.name ?? "Unknown User";
  };

  const getRuleName = (breach: ConductRuleBreach): string => {
    if (breach.conductRule) return `${breach.conductRule.ruleId} - ${breach.conductRule.title}`;
    const rule = conductRules.find((r) => r.id === breach.conductRuleId);
    return rule ? `${rule.ruleId} - ${rule.title}` : breach.conductRuleId;
  };

  const openBreaches = useMemo(
    () => conductRuleBreaches.filter((b) => b.status === "IDENTIFIED" || b.status === "UNDER_INVESTIGATION").length,
    [conductRuleBreaches],
  );

  const handleCreateBreach = () => {
    if (!newRuleId || !newUserId || !newDescription.trim()) return;
    const now = new Date().toISOString();
    const reference = `BR-${String(conductRuleBreaches.length + 1).padStart(3, "0")}`;
    addConductRuleBreach({
      id: generateId(),
      reference,
      conductRuleId: newRuleId,
      userId: newUserId,
      dateIdentified: now,
      description: newDescription.trim(),
      investigationNotes: null,
      status: "IDENTIFIED",
      outcome: null,
      disciplinaryAction: null,
      reportedToFCA: false,
      fcaReportDate: null,
      reportedById: currentUser?.id ?? null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    setNewRuleId("");
    setNewUserId("");
    setNewDescription("");
    setShowNewBreach(false);
  };

  const startEditBreach = (breach: ConductRuleBreach) => {
    setEditingBreachId(breach.id);
    setEditBreachStatus(breach.status);
  };

  const saveBreachStatus = (breachId: string) => {
    const update: Partial<ConductRuleBreach> = { status: editBreachStatus };
    if (editBreachStatus === "CLOSED_NO_ACTION" || editBreachStatus === "CLOSED_DISCIPLINARY") {
      update.closedAt = new Date().toISOString();
    }
    updateConductRuleBreach(breachId, update);
    setEditingBreachId(null);
  };

  return (
    <div className="space-y-8">
      {/* ── Section 1: Conduct Rules Reference ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-updraft-deep font-poppins">Conduct Rules Reference</h2>
          <div className="flex items-center gap-3">
            <button onClick={expandAllRules} className="text-xs text-updraft-bright-purple hover:underline">
              Expand All
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={collapseAllRules} className="text-xs text-updraft-bright-purple hover:underline">
              Collapse All
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {conductRules.map((rule) => {
            const isExpanded = expandedRules.has(rule.id);

            return (
              <div key={rule.id} className="bento-card overflow-hidden">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400 shrink-0" />
                  )}
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-updraft-pale-purple text-updraft-deep text-xs font-bold font-mono shrink-0">
                    {rule.ruleId}
                  </span>
                  <span className="text-sm font-medium text-updraft-deep flex-1 truncate">{rule.title}</span>
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {rule.appliesTo}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                    <p className="text-sm text-gray-600">{rule.description}</p>
                    {rule.examples && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Examples</p>
                        <p className="text-xs text-gray-500">{rule.examples}</p>
                      </div>
                    )}
                    {rule.reference && (
                      <p className="text-xs text-gray-400">Ref: {rule.reference}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {conductRules.length === 0 && (
            <div className="bento-card p-12 text-center">
              <Scale size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">No conduct rules configured yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Breach Register ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-updraft-deep font-poppins">Breach Register</h2>
            {openBreaches > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">
                <AlertTriangle size={12} /> {openBreaches} open
              </span>
            )}
          </div>
          {canManage && (
            <button
              onClick={() => setShowNewBreach(!showNewBreach)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-updraft-bright-purple hover:bg-updraft-bar rounded-lg px-3 py-2 transition-colors"
            >
              {showNewBreach ? <X size={14} /> : <Plus size={14} />}
              {showNewBreach ? "Cancel" : "New Breach"}
            </button>
          )}
        </div>

        {/* New breach form */}
        {showNewBreach && canManage && (
          <div className="bento-card p-5 mb-4 space-y-3">
            <h3 className="text-sm font-semibold text-updraft-deep font-poppins">Record New Breach</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Conduct Rule</label>
                <div className="relative">
                  <select
                    value={newRuleId}
                    onChange={(e) => setNewRuleId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-updraft-light-purple"
                  >
                    <option value="">Select rule...</option>
                    {conductRules.map((r) => (
                      <option key={r.id} value={r.id}>{r.ruleId} - {r.title}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject (Person)</label>
                <div className="relative">
                  <select
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-updraft-light-purple"
                  >
                    <option value="">Select person...</option>
                    {users.filter((u) => u.isActive).map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                placeholder="Describe the breach..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-updraft-light-purple resize-none"
              />
            </div>
            <button
              onClick={handleCreateBreach}
              disabled={!newRuleId || !newUserId || !newDescription.trim()}
              className="text-xs font-medium text-white bg-updraft-bright-purple hover:bg-updraft-bar disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 transition-colors"
            >
              Record Breach
            </button>
          </div>
        )}

        {/* Breaches table */}
        <div className="bento-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Ref</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Rule</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">FCA</th>
                  {canManage && (
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider w-28">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conductRuleBreaches.map((breach) => {
                  const statusColours = BREACH_STATUS_COLOURS[breach.status];
                  const isEditing = editingBreachId === breach.id;

                  return (
                    <tr key={breach.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-updraft-deep">{breach.reference}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{getRuleName(breach)}</td>
                      <td className="px-4 py-3 text-gray-700">{getUserName(breach.userId)}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{formatDateShort(breach.dateIdentified)}</td>
                      <td className="px-4 py-3">
                        {isEditing && canManage ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <select
                                value={editBreachStatus}
                                onChange={(e) => setEditBreachStatus(e.target.value as BreachStatus)}
                                className="text-xs border border-gray-200 rounded-md px-2 py-1.5 pr-6 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-updraft-light-purple"
                              >
                                {(Object.entries(BREACH_STATUS_LABELS) as [BreachStatus, string][]).map(([val, label]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>
                              <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <button
                              onClick={() => saveBreachStatus(breach.id)}
                              className="text-[10px] font-medium text-white bg-updraft-bright-purple hover:bg-updraft-bar rounded px-2 py-1 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingBreachId(null)}
                              className="text-[10px] font-medium text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", statusColours.bg, statusColours.text)}>
                            {BREACH_STATUS_LABELS[breach.status]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {breach.reportedToFCA ? (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-700">
                            <CheckCircle2 size={12} /> Yes
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          {!isEditing && (
                            <button
                              onClick={() => startEditBreach(breach)}
                              className="text-xs text-updraft-bright-purple hover:underline"
                            >
                              Update Status
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {conductRuleBreaches.length === 0 && (
            <div className="p-12 text-center">
              <CheckCircle2 size={32} className="mx-auto text-green-300 mb-3" />
              <p className="text-sm text-gray-400">No conduct rule breaches recorded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
