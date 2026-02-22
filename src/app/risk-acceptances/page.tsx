"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import { getRiskScore, calculateBreach } from "@/lib/risk-categories";
import { ChevronRight, Download, Plus, Search, ShieldQuestion, AlertTriangle, Clock, Check, ShieldOff, MessageSquare, Info, X as XIcon } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import ScoreBadge from "@/components/risk-register/ScoreBadge";
import RiskAcceptanceFormDialog from "@/components/risk-acceptances/RiskAcceptanceFormDialog";
import RiskAcceptanceDetailPanel from "@/components/risk-acceptances/RiskAcceptanceDetailPanel";
import type { RiskAcceptance, RiskAcceptanceStatus, RiskAcceptanceSource } from "@/lib/types";
import { RISK_ACCEPTANCE_STATUS_LABELS, RISK_ACCEPTANCE_STATUS_COLOURS, RISK_ACCEPTANCE_SOURCE_LABELS } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";

const ALL_STATUSES: RiskAcceptanceStatus[] = ["PROPOSED", "CCRO_REVIEW", "AWAITING_APPROVAL", "APPROVED", "REJECTED", "RETURNED", "EXPIRED"];
const ALL_SOURCES: RiskAcceptanceSource[] = ["RISK_REGISTER", "CONTROL_TESTING", "INCIDENT", "AD_HOC"];

type TabKey = "all" | "needs_action" | "active" | "audit";

export default function RiskAcceptancesPage() {
  usePageTitle("Risk Acceptances");
  const hydrated = useAppStore((s) => s._hydrated);
  const riskAcceptances = useAppStore((s) => s.riskAcceptances);
  const updateRiskAcceptance = useAppStore((s) => s.updateRiskAcceptance);
  const addRiskAcceptance = useAppStore((s) => s.addRiskAcceptance);
  const risks = useAppStore((s) => s.risks);
  const users = useAppStore((s) => s.users);

  const searchParams = useSearchParams();
  const router = useRouter();

  const [showWorkflowBanner, setShowWorkflowBanner] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [prefillSource, setPrefillSource] = useState<RiskAcceptanceSource | undefined>();
  const [prefillRiskId, setPrefillRiskId] = useState<string | undefined>();
  const [prefillControlId, setPrefillControlId] = useState<string | undefined>();

  // Handle URL params for prefill (from Risk Register or Controls Testing)
  useEffect(() => {
    const newFrom = searchParams.get("newFrom");
    if (newFrom === "risk") {
      const rId = searchParams.get("riskId");
      if (rId) {
        setPrefillSource("RISK_REGISTER");
        setPrefillRiskId(rId);
        setShowForm(true);
        router.replace("/risk-acceptances");
      }
    } else if (newFrom === "control") {
      const cId = searchParams.get("controlId");
      if (cId) {
        setPrefillSource("CONTROL_TESTING");
        setPrefillControlId(cId);
        setShowForm(true);
        router.replace("/risk-acceptances");
      }
    }
    // Deep-link to specific acceptance
    const acceptanceId = searchParams.get("acceptance");
    if (acceptanceId) {
      const ra = riskAcceptances.find((r) => r.id === acceptanceId);
      if (ra) setSelectedAcceptance(ra);
    }
  }, [searchParams, router, riskAcceptances]);
  const [selectedAcceptance, setSelectedAcceptance] = useState<RiskAcceptance | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [statusFilter, setStatusFilter] = useState<RiskAcceptanceStatus | "">("");
  const [sourceFilter, setSourceFilter] = useState<RiskAcceptanceSource | "">("");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  // Summary stats
  const stats = useMemo(() => {
    const aboveAppetite = riskAcceptances.filter((ra) => {
      if (!ra.riskId) return false;
      const risk = ra.risk ?? risks.find((r) => r.id === ra.riskId);
      if (!risk || !risk.riskAppetite) return false;
      const score = getRiskScore(risk.residualLikelihood, risk.residualImpact);
      return calculateBreach(score, risk.riskAppetite).breached;
    }).length;

    return {
      aboveAppetite,
      proposed: riskAcceptances.filter((ra) => ra.status === "PROPOSED" || ra.status === "CCRO_REVIEW").length,
      awaiting: riskAcceptances.filter((ra) => ra.status === "AWAITING_APPROVAL").length,
      accepted: riskAcceptances.filter((ra) => ra.status === "APPROVED").length,
      expired: riskAcceptances.filter((ra) => ra.status === "EXPIRED").length,
    };
  }, [riskAcceptances, risks]);

  // Filtered list
  const filtered = useMemo(() => {
    let items = [...riskAcceptances];

    // Tab filters
    if (tab === "needs_action") {
      items = items.filter((ra) => ["PROPOSED", "CCRO_REVIEW", "AWAITING_APPROVAL", "EXPIRED"].includes(ra.status));
    } else if (tab === "active") {
      items = items.filter((ra) => ra.status === "APPROVED");
    } else if (tab === "audit") {
      return items; // handled separately
    }

    // Dropdown filters
    if (statusFilter) items = items.filter((ra) => ra.status === statusFilter);
    if (sourceFilter) items = items.filter((ra) => ra.source === sourceFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((ra) =>
        ra.reference.toLowerCase().includes(q) ||
        ra.title.toLowerCase().includes(q) ||
        (ra.proposer?.name ?? "").toLowerCase().includes(q) ||
        (ra.approver?.name ?? "").toLowerCase().includes(q)
      );
    }

    return items;
  }, [riskAcceptances, tab, statusFilter, sourceFilter, search]);

  // All history entries for audit trail tab
  const allHistory = useMemo(() => {
    if (tab !== "audit") return [];
    return riskAcceptances
      .flatMap((ra) => (ra.history ?? []).map((h) => ({ ...h, acceptance: ra })))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [riskAcceptances, tab]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/risk-acceptances/export${statusFilter ? `?status=${statusFilter}` : ""}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `risk-acceptances-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }

  function handleAcceptanceUpdate(updated: RiskAcceptance) {
    updateRiskAcceptance(updated.id, updated);
    setSelectedAcceptance(updated);
  }

  function handleStatClick(filterStatus: RiskAcceptanceStatus | "") {
    setStatusFilter(filterStatus);
    setTab("all");
  }

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-updraft-bright-purple border-t-transparent" />
          <p className="text-sm text-gray-500">Loading risk acceptances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Risk Acceptances</h1>
          <p className="text-sm text-gray-500 mt-1">Formal risk acceptance workflow</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-updraft-deep text-white px-4 py-2 text-sm font-medium hover:bg-updraft-bar transition-colors"
          >
            <Plus size={14} />
            Propose Acceptance
          </button>
        </div>
      </div>

      {/* Workflow Process Banner */}
      {showWorkflowBanner && (
        <div className="rounded-xl border border-updraft-light-purple/40 bg-updraft-pale-purple/20 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <Info size={14} className="text-updraft-bar shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-updraft-deep mb-2">How Risk Acceptances Work</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                  {[
                    { label: "1. Propose", desc: "Submit a formal acceptance request with rationale" },
                    { label: "2. CCRO Review", desc: "CCRO team reviews and routes to an approver" },
                    { label: "3. Awaiting Approval", desc: "Designated approver accepts or rejects" },
                    { label: "4. Decision", desc: "Approved acceptance is active until review date" },
                  ].map((step, i, arr) => (
                    <span key={step.label} className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center rounded-md bg-white border border-updraft-light-purple/30 px-2 py-0.5 text-[11px] font-medium text-updraft-deep"
                        title={step.desc}
                      >
                        {step.label}
                      </span>
                      {i < arr.length - 1 && <ChevronRight size={12} className="text-gray-400 shrink-0" />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowWorkflowBanner(false)}
              className="shrink-0 rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
              title="Dismiss"
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button onClick={() => handleStatClick("")} className="rounded-xl border border-red-200 bg-red-50 p-3 text-left hover:border-red-400 transition-colors">
          <p className="text-xs text-gray-500">Above Appetite</p>
          <p className="text-2xl font-bold font-poppins text-red-700">{stats.aboveAppetite}</p>
        </button>
        <button onClick={() => { setStatusFilter(""); setTab("needs_action"); }} className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-left hover:border-blue-400 transition-colors">
          <p className="text-xs text-gray-500">Proposed</p>
          <p className="text-2xl font-bold font-poppins text-blue-700">{stats.proposed}</p>
        </button>
        <button onClick={() => handleStatClick("AWAITING_APPROVAL")} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left hover:border-amber-400 transition-colors">
          <p className="text-xs text-gray-500">Awaiting Approval</p>
          <p className="text-2xl font-bold font-poppins text-amber-700">{stats.awaiting}</p>
        </button>
        <button onClick={() => handleStatClick("APPROVED")} className="rounded-xl border border-green-200 bg-green-50 p-3 text-left hover:border-green-400 transition-colors">
          <p className="text-xs text-gray-500">Accepted</p>
          <p className="text-2xl font-bold font-poppins text-green-700">{stats.accepted}</p>
        </button>
        <button onClick={() => handleStatClick("EXPIRED")} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-left hover:border-gray-400 transition-colors">
          <p className="text-xs text-gray-500">Expired</p>
          <p className="text-2xl font-bold font-poppins text-gray-600">{stats.expired}</p>
        </button>
      </div>

      {/* Workflow Diagram */}
      <div className="bento-card">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Workflow</p>
        <div className="flex items-center justify-between gap-2">
          {[
            { label: "Proposed", icon: <ShieldQuestion size={16} />, colour: "bg-blue-100 text-blue-700" },
            { label: "CCRO Review", icon: <Search size={16} />, colour: "bg-purple-100 text-purple-700" },
            { label: "Awaiting Approval", icon: <Clock size={16} />, colour: "bg-amber-100 text-amber-700" },
            { label: "Approved", icon: <Check size={16} />, colour: "bg-green-100 text-green-700" },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium w-full justify-center", step.colour)}>
                {step.icon}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < 3 && <ChevronRight size={16} className="text-gray-300 shrink-0 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {([
          { key: "all" as TabKey, label: "All Acceptances" },
          { key: "needs_action" as TabKey, label: "Needs Action" },
          { key: "active" as TabKey, label: "Active" },
          { key: "audit" as TabKey, label: "Audit Trail" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key ? "border-updraft-bright-purple text-updraft-deep" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab !== "audit" && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, title, user..."
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RiskAcceptanceStatus | "")}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{RISK_ACCEPTANCE_STATUS_LABELS[s]}</option>)}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as RiskAcceptanceSource | "")}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">All Sources</option>
            {ALL_SOURCES.map((s) => <option key={s} value={s}>{RISK_ACCEPTANCE_SOURCE_LABELS[s]}</option>)}
          </select>
        </div>
      )}

      {/* Table or Audit Trail */}
      {tab === "audit" ? (
        <div className="bento-card">
          <div className="relative pl-6 space-y-3">
            <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />
            {allHistory.length === 0 && <p className="text-sm text-gray-400">No history entries</p>}
            {allHistory.map((h) => {
              const historyUser = h.user ?? users.find((u) => u.id === h.userId);
              const dotColour = h.action === "CREATED" ? "bg-blue-500"
                : h.action === "APPROVE" ? "bg-green-500"
                : h.action === "REJECT" ? "bg-red-500"
                : h.action === "RETURN" ? "bg-orange-500"
                : h.action === "EXPIRE" ? "bg-gray-400"
                : h.action === "COMMENT_ADDED" ? "bg-purple-400"
                : "bg-updraft-bright-purple";
              return (
                <div key={h.id} className="relative">
                  <div className={cn("absolute -left-[18px] top-1 h-3 w-3 rounded-full border-2 border-white", dotColour)} />
                  <div className="text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-updraft-deep">{(h as { acceptance: RiskAcceptance }).acceptance.reference}</span>
                      <span className="font-medium text-gray-700">{h.action.replace(/_/g, " ")}</span>
                      {h.fromStatus && h.toStatus && <span className="text-gray-400">{h.fromStatus} → {h.toStatus}</span>}
                    </div>
                    <p className="text-gray-500 mt-0.5">{h.details}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{historyUser?.name ?? "System"} · {formatDate(h.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bento-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-500">Reference / Title</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Source</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Score</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Breach</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Proposer</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Approver</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Review Due</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={<ShieldOff className="h-7 w-7" />}
                      heading={riskAcceptances.length === 0 ? "No risk acceptances" : "No acceptances match your filters"}
                      description={riskAcceptances.length === 0 ? "Propose a risk acceptance to begin the approval workflow." : "Try adjusting the search or status filter."}
                    />
                  </td>
                </tr>
              )}
              {filtered.map((ra) => {
                const risk = ra.risk ?? risks.find((r) => r.id === ra.riskId);
                const residualScore = risk ? getRiskScore(risk.residualLikelihood, risk.residualImpact) : null;
                const breach = risk && risk.riskAppetite ? calculateBreach(residualScore!, risk.riskAppetite) : null;
                const sc = RISK_ACCEPTANCE_STATUS_COLOURS[ra.status];
                const reviewDays = ra.reviewDate ? Math.ceil((new Date(ra.reviewDate).getTime() - Date.now()) / 86400000) : null;

                return (
                  <tr
                    key={ra.id}
                    onClick={() => setSelectedAcceptance(ra)}
                    className={cn(
                      "border-b border-gray-100 cursor-pointer transition-colors",
                      breach?.breached
                        ? "border-l-[3px] border-l-red-500 bg-red-50/30 hover:bg-red-50/60"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="inline-flex items-center rounded bg-updraft-pale-purple/30 px-1.5 py-0.5 font-mono text-xs font-bold text-updraft-deep">{ra.reference}</span>
                        {(ra.comments?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500" title={`${ra.comments!.length} comment${ra.comments!.length !== 1 ? "s" : ""}`}>
                            <MessageSquare size={9} />
                            {ra.comments!.length}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 truncate max-w-[200px]">{ra.title}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{RISK_ACCEPTANCE_SOURCE_LABELS[ra.source]}</span>
                    </td>
                    <td className="py-3 px-3">
                      {risk ? <ScoreBadge likelihood={risk.residualLikelihood} impact={risk.residualImpact} size="sm" /> : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-3">
                      {breach ? (
                        breach.breached ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"><AlertTriangle size={12} /> +{breach.difference}</span>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">No</span>
                        )
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", sc.bg, sc.text)}>
                        {RISK_ACCEPTANCE_STATUS_LABELS[ra.status]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-600">{ra.proposer?.name ?? users.find((u) => u.id === ra.proposerId)?.name ?? "—"}</td>
                    <td className="py-3 px-3 text-xs text-gray-600">{ra.approver?.name ?? (ra.approverId ? users.find((u) => u.id === ra.approverId)?.name : "—") ?? "—"}</td>
                    <td className="py-3 px-3">
                      {ra.reviewDate ? (
                        <span className={cn("text-xs font-medium",
                          reviewDays !== null && reviewDays < 0 ? "text-red-600" :
                          reviewDays !== null && reviewDays <= 30 ? "text-amber-600" :
                          "text-gray-500"
                        )}>
                          {new Date(ra.reviewDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <ChevronRight size={14} className="text-gray-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Dialog */}
      <RiskAcceptanceFormDialog
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setPrefillSource(undefined);
          setPrefillRiskId(undefined);
          setPrefillControlId(undefined);
        }}
        onSave={(acceptance) => addRiskAcceptance(acceptance)}
        prefillSource={prefillSource}
        prefillRiskId={prefillRiskId}
        prefillControlId={prefillControlId}
      />

      {/* Detail Panel */}
      {selectedAcceptance && (
        <RiskAcceptanceDetailPanel
          acceptance={selectedAcceptance}
          onClose={() => setSelectedAcceptance(null)}
          onUpdate={handleAcceptanceUpdate}
        />
      )}
    </div>
  );
}
