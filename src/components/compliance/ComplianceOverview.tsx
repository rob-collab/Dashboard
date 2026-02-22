"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLOURS,
  type Regulation,
  type ComplianceStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Clock, FileText, ArrowRight } from "lucide-react";

interface Props {
  onNavigate: (tab: "regulatory-universe" | "smcr" | "policies") => void;
}

export default function ComplianceOverview({ onNavigate }: Props) {
  const regulations = useAppStore((s) => s.regulations);
  const policies = useAppStore((s) => s.policies);
  const smfRoles = useAppStore((s) => s.smfRoles);
  const certifiedPersons = useAppStore((s) => s.certifiedPersons);
  const conductRuleBreaches = useAppStore((s) => s.conductRuleBreaches);
  const smcrDocuments = useAppStore((s) => s.smcrDocuments);
  const controls = useAppStore((s) => s.controls);

  const applicable = useMemo(() => regulations.filter((r) => r.isApplicable), [regulations]);

  // Compliance posture
  const statusCounts = useMemo(() => {
    const counts: Record<ComplianceStatus, number> = {
      COMPLIANT: 0,
      PARTIALLY_COMPLIANT: 0,
      NON_COMPLIANT: 0,
      NOT_ASSESSED: 0,
      GAP_IDENTIFIED: 0,
    };
    for (const r of applicable) {
      const s = (r.complianceStatus ?? "NOT_ASSESSED") as ComplianceStatus;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [applicable]);

  const totalApplicable = applicable.length;
  const compliantPct = totalApplicable > 0 ? Math.round((statusCounts.COMPLIANT / totalApplicable) * 100) : 0;

  // Domain breakdown
  const domains = useMemo(() => {
    const topLevel = regulations.filter((r) => !r.parentId && r.isApplicable);
    return topLevel.map((domain) => {
      const children = applicable.filter((r) => r.parentId === domain.id || r.id === domain.id);
      const worstStatus = getWorstStatus(children);
      return { ...domain, childCount: children.length, worstStatus };
    });
  }, [regulations, applicable]);

  // Gap analysis
  const gaps = useMemo(() => {
    const noControls = applicable.filter(
      (r) => r.level && r.level > 1 && (!r.controlLinks || r.controlLinks.length === 0)
    ).length;
    const noPolicies = applicable.filter(
      (r) => r.level && r.level > 1 && (!r.policyLinks || r.policyLinks.length === 0)
    ).length;
    const nonCompliant = statusCounts.NON_COMPLIANT + statusCounts.GAP_IDENTIFIED;
    return { noControls, noPolicies, nonCompliant };
  }, [applicable, statusCounts]);

  // SM&CR health
  const smcrHealth = useMemo(() => {
    const filledRoles = smfRoles.filter((r) => r.status === "ACTIVE").length;
    const vacantRoles = smfRoles.filter((r) => r.status === "VACANT").length;
    const currentCerts = certifiedPersons.filter((c) => c.status === "CURRENT").length;
    const dueCerts = certifiedPersons.filter((c) => c.status === "DUE" || c.status === "OVERDUE").length;
    const openBreaches = conductRuleBreaches.filter(
      (b) => b.status === "IDENTIFIED" || b.status === "UNDER_INVESTIGATION"
    ).length;
    const overdueDocuments = smcrDocuments.filter((d) => d.status === "DOC_OVERDUE").length;
    return { filledRoles, vacantRoles, currentCerts, dueCerts, openBreaches, overdueDocuments };
  }, [smfRoles, certifiedPersons, conductRuleBreaches, smcrDocuments]);

  // Assessment pipeline
  const assessmentPipeline = useMemo(() => {
    const now = new Date();
    const overdue = applicable.filter((r) => r.nextReviewDate && new Date(r.nextReviewDate) < now).length;
    const dueSoon = applicable.filter((r) => {
      if (!r.nextReviewDate) return false;
      const d = new Date(r.nextReviewDate);
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return d >= now && d <= in30Days;
    }).length;
    const notAssessed = statusCounts.NOT_ASSESSED;
    return { overdue, dueSoon, notAssessed };
  }, [applicable, statusCounts]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricTile label="Applicable Regulations" value={totalApplicable} onClick={() => onNavigate("regulatory-universe")} />
        <MetricTile label="Compliance Rate" value={`${compliantPct}%`} colour={compliantPct >= 80 ? "green" : compliantPct >= 50 ? "amber" : "red"} onClick={() => onNavigate("regulatory-universe")} />
        <MetricTile label="Open Gaps" value={gaps.nonCompliant} colour={gaps.nonCompliant > 0 ? "red" : "green"} onClick={() => onNavigate("regulatory-universe")} />
        <MetricTile label="Policies" value={policies.length} onClick={() => onNavigate("policies")} />
        <MetricTile label="Active Controls" value={controls.filter((c) => c.isActive).length} />
        <MetricTile label="SMF Roles Filled" value={`${smcrHealth.filledRoles}/${smfRoles.length}`} colour={smcrHealth.vacantRoles > 0 ? "amber" : "green"} onClick={() => onNavigate("smcr")} />
      </div>

      {/* Compliance Posture + Gap Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Posture Score */}
        <div className="bento-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-updraft-deep font-poppins">Compliance Posture</h2>
            <button
              onClick={() => onNavigate("regulatory-universe")}
              className="text-xs text-updraft-bright-purple hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {(Object.entries(statusCounts) as [ComplianceStatus, number][]).map(([status, count]) => {
              const pct = totalApplicable > 0 ? (count / totalApplicable) * 100 : 0;
              const colours = COMPLIANCE_STATUS_COLOURS[status];
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colours.dot)} />
                  <span className="text-sm text-gray-600 w-36 shrink-0">{COMPLIANCE_STATUS_LABELS[status]}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", colours.dot)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gap Analysis */}
        <div className="bento-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-updraft-deep font-poppins">Gap Analysis</h2>
            <button
              onClick={() => onNavigate("regulatory-universe")}
              className="text-xs text-updraft-bright-purple hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-1">
            <GapRow icon={ShieldAlert} label="Non-compliant / Gap identified" count={gaps.nonCompliant} colour="red" onClick={() => onNavigate("regulatory-universe")} />
            <GapRow icon={FileText} label="Regulations without linked policies" count={gaps.noPolicies} colour="amber" onClick={() => onNavigate("regulatory-universe")} />
            <GapRow icon={ShieldCheck} label="Regulations without linked controls" count={gaps.noControls} colour="amber" onClick={() => onNavigate("regulatory-universe")} />
            <GapRow icon={Clock} label="Assessments overdue" count={assessmentPipeline.overdue} colour="red" onClick={() => onNavigate("regulatory-universe")} />
            <GapRow icon={AlertTriangle} label="Assessments due within 30 days" count={assessmentPipeline.dueSoon} colour="amber" onClick={() => onNavigate("regulatory-universe")} />
            <GapRow icon={CheckCircle2} label="Not yet assessed" count={assessmentPipeline.notAssessed} colour="gray" onClick={() => onNavigate("regulatory-universe")} />
          </div>
        </div>
      </div>

      {/* RAG by Domain */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-updraft-deep font-poppins">RAG by Domain</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {domains.map((d) => (
            <button
              key={d.id}
              onClick={() => onNavigate("regulatory-universe")}
              className="text-left p-3 rounded-lg border border-gray-200 hover:border-updraft-light-purple hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("w-2 h-2 rounded-full", getStatusDot(d.worstStatus))} />
                <span className="text-xs font-semibold text-gray-500">{d.shortName || d.reference}</span>
              </div>
              <p className="text-xs text-gray-700 line-clamp-2">{d.name}</p>
              <p className="text-[10px] text-gray-400 mt-1">{d.childCount} items{d.primarySMF ? ` · ${d.primarySMF}` : ""}</p>
            </button>
          ))}
        </div>
      </div>

      {/* SM&CR Health */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-updraft-deep font-poppins">SM&amp;CR Health</h2>
          <button
            onClick={() => onNavigate("smcr")}
            className="text-xs text-updraft-bright-purple hover:underline flex items-center gap-1"
          >
            View SM&amp;CR <ArrowRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SmcrTile label="Filled Roles" value={smcrHealth.filledRoles} colour="green" />
          <SmcrTile label="Vacant Roles" value={smcrHealth.vacantRoles} colour={smcrHealth.vacantRoles > 0 ? "red" : "green"} />
          <SmcrTile label="Current Certs" value={smcrHealth.currentCerts} colour="green" />
          <SmcrTile label="Due/Overdue Certs" value={smcrHealth.dueCerts} colour={smcrHealth.dueCerts > 0 ? "amber" : "green"} />
          <SmcrTile label="Open Breaches" value={smcrHealth.openBreaches} colour={smcrHealth.openBreaches > 0 ? "red" : "green"} />
          <SmcrTile label="Overdue Documents" value={smcrHealth.overdueDocuments} colour={smcrHealth.overdueDocuments > 0 ? "red" : "green"} />
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function getWorstStatus(regs: Regulation[]): ComplianceStatus {
  const priority: ComplianceStatus[] = ["NON_COMPLIANT", "GAP_IDENTIFIED", "PARTIALLY_COMPLIANT", "NOT_ASSESSED", "COMPLIANT"];
  for (const s of priority) {
    if (regs.some((r) => r.complianceStatus === s)) return s;
  }
  return "NOT_ASSESSED";
}

function getStatusDot(status: ComplianceStatus): string {
  return COMPLIANCE_STATUS_COLOURS[status]?.dot ?? "bg-gray-400";
}

function MetricTile({ label, value, colour, onClick }: { label: string; value: string | number; colour?: "green" | "amber" | "red"; onClick?: () => void }) {
  const colourClass = colour === "green" ? "text-green-600" : colour === "amber" ? "text-amber-600" : colour === "red" ? "text-red-600" : "text-updraft-deep";
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className={cn("bento-card p-4 text-center w-full", onClick && "hover:border-updraft-light-purple hover:shadow-sm transition-all cursor-pointer")}
    >
      <p className={cn("text-2xl font-bold font-poppins", colourClass)}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </Wrapper>
  );
}

function GapRow({ icon: Icon, label, count, colour, onClick }: { icon: typeof ShieldAlert; label: string; count: number; colour: "red" | "amber" | "gray"; onClick?: () => void }) {
  const dotColour = colour === "red" ? "bg-red-500" : colour === "amber" ? "bg-amber-500" : "bg-gray-400";
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className={cn(
        "flex items-center gap-3 w-full rounded-lg px-2 py-2",
        onClick && "hover:bg-gray-50 transition-colors cursor-pointer text-left"
      )}
    >
      <Icon size={16} className="text-gray-400 shrink-0" />
      <span className="text-sm text-gray-600 flex-1">{label}</span>
      <div className="flex items-center gap-2">
        {count > 0 && <div className={cn("w-2 h-2 rounded-full", dotColour)} />}
        <span className={cn("text-sm font-semibold", count > 0 ? "text-gray-700" : "text-gray-400")}>{count}</span>
        {onClick && count > 0 && <ArrowRight size={12} className="text-gray-300" />}
      </div>
    </Wrapper>
  );
}

function SmcrTile({ label, value, colour }: { label: string; value: number; colour: "green" | "amber" | "red" }) {
  const colourClass = colour === "green" ? "text-green-600" : colour === "amber" ? "text-amber-600" : "text-red-600";
  return (
    <div className="text-center p-3 rounded-lg bg-gray-50">
      <p className={cn("text-xl font-bold font-poppins", colourClass)}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
