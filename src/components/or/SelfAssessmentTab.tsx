"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { SelfAssessment, AssessmentStatus } from "@/lib/types";
import { ASSESSMENT_STATUS_LABELS, ASSESSMENT_STATUS_COLOURS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, FileText, ExternalLink, CheckCircle2, Circle, ArrowUpRight } from "lucide-react";

export default function SelfAssessmentTab({ isCCRO }: { isCCRO: boolean }) {
  const router = useRouter();
  const selfAssessments = useAppStore((s) => s.selfAssessments);
  const addSelfAssessment = useAppStore((s) => s.addSelfAssessment);
  const updateSelfAssessment = useAppStore((s) => s.updateSelfAssessment);
  const ibs = useAppStore((s) => s.ibs);
  const scenarios = useAppStore((s) => s.scenarios);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [editing, setEditing] = useState<SelfAssessment | null>(null);
  const [editForm, setEditForm] = useState<Partial<SelfAssessment>>({});
  const [saving, setSaving] = useState(false);

  // Readiness checklist data
  const totalIBS = ibs.filter((i) => i.status === "ACTIVE" || i.status === "UNDER_REVIEW").length;
  const ibsWithFullMaps = ibs.filter((i) => (i.categoriesFilled ?? 0) >= 4).length;
  const ibsMapsComplete = totalIBS > 0 && ibsWithFullMaps === totalIBS;

  const overdueScenarios = scenarios.filter(
    (s) => s.nextTestDate && new Date(s.nextTestDate) < new Date() && s.status !== "COMPLETE"
  ).length;
  const scenariosUpToDate = overdueScenarios === 0 && scenarios.length > 0;

  async function handleCreate() {
    setCreating(true);
    try {
      const created = await api<SelfAssessment>("/api/self-assessments", {
        method: "POST",
        body: { year: parseInt(newYear) },
      });
      addSelfAssessment(created);
      setShowCreate(false);
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  }

  function startEdit(sa: SelfAssessment) {
    setEditForm({
      executiveSummary: sa.executiveSummary ?? "",
      vulnerabilitiesCount: sa.vulnerabilitiesCount,
      openRemediations: sa.openRemediations,
      documentUrl: sa.documentUrl ?? "",
    });
    setEditing(sa);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await api<SelfAssessment>(`/api/self-assessments/${editing.id}`, {
        method: "PATCH",
        body: editForm,
      });
      updateSelfAssessment(updated.id, updated);
      setEditing(null);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(sa: SelfAssessment, status: AssessmentStatus) {
    try {
      const body: Record<string, unknown> = { status };
      if (status === "SUBMITTED") body.submittedAt = new Date().toISOString();
      if (status === "APPROVED") {
        body.boardApprovalDate = new Date().toISOString();
        body.approvedBy = "Board";
      }
      const updated = await api<SelfAssessment>(`/api/self-assessments/${sa.id}`, { method: "PATCH", body });
      updateSelfAssessment(updated.id, updated);
    } catch {
      // silently fail
    }
  }

  const sorted = [...selfAssessments].sort((a, b) => b.year - a.year);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-poppins font-semibold text-gray-900 text-sm">Annual Self-Assessments</h2>
          <p className="text-xs text-gray-400 mt-0.5">FCA/PRA PS21/3 requires an annual self-assessment of operational resilience.</p>
        </div>
        {isCCRO && (
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 text-xs bg-updraft-deep text-white px-3 py-1.5 rounded-lg hover:bg-updraft-bar">
            <Plus size={12} /> New Year
          </button>
        )}
      </div>

      {/* Readiness Checklist */}
      <div className="bento-card bg-gray-50/60 border border-gray-100">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Assessment Readiness</p>
        <div className="space-y-2">
          <ReadinessItem
            label={`IBS resource maps complete (${ibsWithFullMaps}/${totalIBS} IBS with ≥4 categories)`}
            done={ibsMapsComplete}
            href="/operational-resilience?tab=ibs"
            onNavigate={() => router.push("/operational-resilience?tab=ibs")}
          />
          <ReadinessItem
            label={`Scenario tests up to date (${overdueScenarios === 0 ? "none" : overdueScenarios} overdue)`}
            done={scenariosUpToDate}
            onNavigate={() => router.push("/operational-resilience?tab=ibs")}
          />
          <ReadinessItem
            label={`Open remediations resolved (tracked in Actions)`}
            done={(sorted[0]?.openRemediations ?? 1) === 0}
            onNavigate={() => router.push("/actions")}
          />
        </div>
      </div>

      {showCreate && (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
          <p className="text-sm font-medium text-gray-900">Start {newYear} Self-Assessment</p>
          <input type="number" value={newYear} onChange={(e) => setNewYear(e.target.value)} className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm" min={2020} max={2050} />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating} className="px-3 py-1.5 text-xs bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">{creating ? "Creating…" : "Create"}</button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          <FileText size={32} className="mx-auto mb-3 text-gray-200" />
          <p>No self-assessments created yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((sa) => {
            const sc = ASSESSMENT_STATUS_COLOURS[sa.status];
            const isEditing = editing?.id === sa.id;
            return (
              <div key={sa.id} className="bento-card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-poppins font-semibold text-gray-900 text-base">{sa.year} Assessment</h3>
                    {sa.submittedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Submitted {new Date(sa.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                    {sa.boardApprovalDate && (
                      <p className="text-xs text-gray-400">
                        Board approved {new Date(sa.boardApprovalDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sc.bg, sc.text)}>{ASSESSMENT_STATUS_LABELS[sa.status]}</span>
                    {isCCRO && !isEditing && (
                      <button onClick={() => startEdit(sa)} className="text-xs text-updraft-deep hover:underline">Edit</button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => router.push("/risk-register")}
                    className="text-center bento-card bg-gray-50 hover:bg-amber-50 hover:border-amber-200 border border-transparent transition-colors group"
                  >
                    <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                      Vulnerabilities
                      <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                    </p>
                    <p className={cn("text-2xl font-bold font-poppins", sa.vulnerabilitiesCount > 0 ? "text-amber-600" : "text-gray-900")}>{sa.vulnerabilitiesCount}</p>
                    <p className="text-xs text-gray-400 mt-1">View in Risk Register</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/actions")}
                    className="text-center bento-card bg-gray-50 hover:bg-red-50 hover:border-red-200 border border-transparent transition-colors group"
                  >
                    <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                      Open Remediations
                      <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                    </p>
                    <p className={cn("text-2xl font-bold font-poppins", sa.openRemediations > 0 ? "text-red-600" : "text-gray-900")}>{sa.openRemediations}</p>
                    <p className="text-xs text-gray-400 mt-1">View in Actions</p>
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Executive Summary</label>
                      <textarea rows={6} value={(editForm.executiveSummary as string) ?? ""} onChange={(e) => setEditForm({ ...editForm, executiveSummary: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Provide a narrative summary of the firm's operational resilience posture for the year…" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Vulnerabilities Count</label>
                        <input type="number" min={0} value={editForm.vulnerabilitiesCount ?? 0} onChange={(e) => setEditForm({ ...editForm, vulnerabilitiesCount: parseInt(e.target.value) || 0 })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Open Remediations</label>
                        <input type="number" min={0} value={editForm.openRemediations ?? 0} onChange={(e) => setEditForm({ ...editForm, openRemediations: parseInt(e.target.value) || 0 })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Document URL</label>
                      <input value={(editForm.documentUrl as string) ?? ""} onChange={(e) => setEditForm({ ...editForm, documentUrl: e.target.value })} placeholder="https://…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    {sa.status === "SUBMITTED" && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Board Approval Date</label>
                        <input
                          type="date"
                          value={editForm.boardApprovalDate ? (editForm.boardApprovalDate as string).split("T")[0] : ""}
                          onChange={(e) => setEditForm({ ...editForm, boardApprovalDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs bg-updraft-deep text-white rounded-lg hover:bg-updraft-bar disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
                      <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {sa.executiveSummary && (
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Executive Summary</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{sa.executiveSummary}</p>
                      </div>
                    )}
                    {sa.documentUrl && (
                      <a href={sa.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-updraft-deep hover:underline mt-2">
                        <FileText size={12} /> View document <ExternalLink size={10} />
                      </a>
                    )}
                    {isCCRO && sa.status === "DRAFT" && (
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <button onClick={() => handleStatusChange(sa, "SUBMITTED")} className="text-xs text-updraft-deep border border-updraft-bright-purple/30 px-3 py-1.5 rounded-lg hover:bg-updraft-pale-purple/20">
                          Submit for Board Approval
                        </button>
                      </div>
                    )}
                    {isCCRO && sa.status === "SUBMITTED" && (
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <button onClick={() => handleStatusChange(sa, "APPROVED")} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                          Mark Board Approved
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReadinessItem({ label, done, onNavigate }: { label: string; done: boolean; href?: string; onNavigate?: () => void }) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full flex items-center gap-2 text-left group hover:bg-white/60 rounded-lg px-1 py-0.5 -mx-1 transition-colors"
    >
      {done ? (
        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
      ) : (
        <Circle size={14} className="text-gray-300 shrink-0" />
      )}
      <span className={cn("text-xs flex-1", done ? "text-gray-700" : "text-gray-400")}>{label}</span>
      <ArrowUpRight size={10} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}
