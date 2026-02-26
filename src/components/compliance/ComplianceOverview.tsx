"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLOURS,
  POLICY_STATUS_LABELS,
  POLICY_STATUS_COLOURS,
  type Regulation,
  type ComplianceStatus,
  type PolicyStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Clock, FileText, ArrowRight, XCircle, MinusCircle } from "lucide-react";

interface Props {
  onNavigate: (tab: "regulatory-universe" | "smcr" | "policies") => void;
}

export default function ComplianceOverview({ onNavigate }: Props) {
  const router = useRouter();
  const regulations = useAppStore((s) => s.regulations);
  const policies = useAppStore((s) => s.policies);
  const smfRoles = useAppStore((s) => s.smfRoles);
  const certifiedPersons = useAppStore((s) => s.certifiedPersons);
  const conductRuleBreaches = useAppStore((s) => s.conductRuleBreaches);
  const smcrDocuments = useAppStore((s) => s.smcrDocuments);
  const controls = useAppStore((s) => s.controls);
  const outcomes = useAppStore((s) => s.outcomes);
  const users = useAppStore((s) => s.users);

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

  // Consumer Duty summary
  const cdHealth = useMemo(() => {
    const good = outcomes.filter((o) => o.ragStatus === "GOOD").length;
    const warning = outcomes.filter((o) => o.ragStatus === "WARNING").length;
    const harm = outcomes.filter((o) => o.ragStatus === "HARM").length;
    const totalMeasures = outcomes.reduce((n, o) => n + (o.measures?.length ?? 0), 0);
    return { good, warning, harm, total: outcomes.length, totalMeasures };
  }, [outcomes]);

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

  // Policy control breakdown
  const policyBreakdown = useMemo(() => {
    return policies.map((policy) => {
      const links = policy.controlLinks ?? [];
      // Resolve each linked control — prefer the embedded object, fall back to controls store
      const linkedControls = links
        .map((l) => l.control ?? controls.find((c) => c.id === l.controlId))
        .filter(Boolean) as typeof controls;
      const activeControls = linkedControls.filter((c) => c.isActive);

      // Derive each active control's most-recent test result
      let pass = 0, fail = 0, partial = 0, notTested = 0;
      let latestDate: string | null = null;

      for (const ctrl of activeControls) {
        const results = (ctrl.testingSchedule?.testResults ?? [])
          .slice()
          .sort((a, b) => b.testedDate.localeCompare(a.testedDate));
        const latest = results[0];
        if (!latest) {
          notTested++;
        } else {
          if (latest.result === "PASS") pass++;
          else if (latest.result === "FAIL") fail++;
          else if (latest.result === "PARTIALLY") partial++;
          else notTested++;
          // Track most recent test date across all controls
          if (!latestDate || latest.testedDate > latestDate) latestDate = latest.testedDate;
        }
      }

      // Owner name
      const ownerName = policy.owner?.name ?? users.find((u) => u.id === policy.ownerId)?.name ?? "—";

      return {
        id: policy.id,
        reference: policy.reference,
        name: policy.name,
        status: policy.status,
        ownerName,
        totalControls: linkedControls.length,
        activeControls: activeControls.length,
        pass,
        fail,
        partial,
        notTested,
        lastTested: latestDate,
      };
    });
  }, [policies, controls, users]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricTile label="Applicable Regulations" value={totalApplicable} onClick={() => onNavigate("regulatory-universe")} />
        <MetricTile label="Compliance Rate" value={`${compliantPct}%`} colour={compliantPct >= 80 ? "green" : compliantPct >= 50 ? "amber" : "red"} onClick={() => onNavigate("regulatory-universe")} />
        <MetricTile label="Open Gaps" value={gaps.nonCompliant} colour={gaps.nonCompliant > 0 ? "red" : "green"} onClick={() => onNavigate("regulatory-universe")} />
        <MetricTile label="Policies" value={policies.length} onClick={() => onNavigate("policies")} />
        <MetricTile label="Active Controls" value={controls.filter((c) => c.isActive).length} onClick={() => router.push("/controls?tab=library")} />
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

      {/* Compliance by Policy */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-updraft-deep font-poppins">Compliance by Policy</h2>
            <p className="text-xs text-gray-500 mt-0.5">Control test status per policy — based on each control&apos;s most recent test result</p>
          </div>
          <button
            onClick={() => onNavigate("policies")}
            className="text-xs text-updraft-bright-purple hover:underline flex items-center gap-1"
          >
            View Policies <ArrowRight size={12} />
          </button>
        </div>

        {policyBreakdown.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No policies configured yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Policy</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Owner</th>
                  <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Controls</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Test Status</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">Last Tested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {policyBreakdown.map((p) => (
                  <PolicyRow
                    key={p.id}
                    policy={p}
                    onClick={() => router.push(`/compliance?tab=policies&policy=${p.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              onClick={() => router.push(`/compliance?tab=regulatory-universe&domain=${encodeURIComponent(d.regulatoryBody ?? d.name)}`)}
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
          <SmcrTile label="Filled Roles" value={smcrHealth.filledRoles} colour="green" onClick={() => onNavigate("smcr")} />
          <SmcrTile label="Vacant Roles" value={smcrHealth.vacantRoles} colour={smcrHealth.vacantRoles > 0 ? "red" : "green"} onClick={() => onNavigate("smcr")} />
          <SmcrTile label="Current Certs" value={smcrHealth.currentCerts} colour="green" onClick={() => onNavigate("smcr")} />
          <SmcrTile label="Due/Overdue Certs" value={smcrHealth.dueCerts} colour={smcrHealth.dueCerts > 0 ? "amber" : "green"} onClick={() => onNavigate("smcr")} />
          <SmcrTile label="Open Breaches" value={smcrHealth.openBreaches} colour={smcrHealth.openBreaches > 0 ? "red" : "green"} onClick={() => onNavigate("smcr")} />
          <SmcrTile label="Overdue Documents" value={smcrHealth.overdueDocuments} colour={smcrHealth.overdueDocuments > 0 ? "red" : "green"} onClick={() => onNavigate("smcr")} />
        </div>
      </div>

      {/* Consumer Duty Summary */}
      {cdHealth.total > 0 && (
        <div className="bento-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-updraft-deep font-poppins">Consumer Duty</h2>
              <p className="text-xs text-gray-500 mt-0.5">{cdHealth.total} outcomes · {cdHealth.totalMeasures} measures</p>
            </div>
            <Link
              href="/consumer-duty"
              className="text-xs text-updraft-bright-purple hover:underline flex items-center gap-1"
            >
              View Consumer Duty <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Link href="/consumer-duty?rag=GOOD" className="text-center p-4 rounded-xl bg-green-50 border border-green-100 hover:border-green-300 hover:-translate-y-0.5 transition-all">
              <p className="text-3xl font-bold font-poppins text-green-700">{cdHealth.good}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-xs text-green-700 font-medium">Green</p>
              </div>
            </Link>
            <Link href="/consumer-duty?rag=WARNING" className="text-center p-4 rounded-xl bg-amber-50 border border-amber-100 hover:border-amber-300 hover:-translate-y-0.5 transition-all">
              <p className="text-3xl font-bold font-poppins text-amber-700">{cdHealth.warning}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <p className="text-xs text-amber-700 font-medium">Amber</p>
              </div>
            </Link>
            <Link href="/consumer-duty?rag=HARM" className={cn("text-center p-4 rounded-xl border hover:-translate-y-0.5 transition-all", cdHealth.harm > 0 ? "bg-red-50 border-red-100 hover:border-red-300" : "bg-gray-50 border-gray-100 hover:border-gray-300")}>
              <p className={cn("text-3xl font-bold font-poppins", cdHealth.harm > 0 ? "text-red-700" : "text-gray-400")}>{cdHealth.harm}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className={cn("w-2 h-2 rounded-full", cdHealth.harm > 0 ? "bg-red-500" : "bg-gray-300")} />
                <p className={cn("text-xs font-medium", cdHealth.harm > 0 ? "text-red-700" : "text-gray-400")}>Red</p>
              </div>
            </Link>
          </div>
          {cdHealth.harm > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-700">
                <strong>{cdHealth.harm}</strong> outcome{cdHealth.harm !== 1 ? "s" : ""} at Red — immediate attention required.
              </p>
              <Link href="/consumer-duty?rag=HARM" className="ml-auto text-xs font-medium text-red-600 hover:underline flex items-center gap-0.5 shrink-0">
                Review <ArrowRight size={10} />
              </Link>
            </div>
          )}
          {cdHealth.warning > 0 && cdHealth.harm === 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <AlertTriangle size={13} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>{cdHealth.warning}</strong> outcome{cdHealth.warning !== 1 ? "s" : ""} at Amber — monitor closely.
              </p>
              <Link href="/consumer-duty?rag=WARNING" className="ml-auto text-xs font-medium text-amber-600 hover:underline flex items-center gap-0.5 shrink-0">
                Review <ArrowRight size={10} />
              </Link>
            </div>
          )}
        </div>
      )}
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

function SmcrTile({ label, value, colour, onClick }: { label: string; value: number; colour: "green" | "amber" | "red"; onClick?: () => void }) {
  const colourClass = colour === "green" ? "text-green-600" : colour === "amber" ? "text-amber-600" : "text-red-600";
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className={cn("text-center p-3 rounded-lg bg-gray-50 w-full", onClick && "hover:bg-gray-100 transition-colors cursor-pointer")}
    >
      <p className={cn("text-xl font-bold font-poppins", colourClass)}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </Wrapper>
  );
}

interface PolicyBreakdownRow {
  id: string;
  reference: string;
  name: string;
  status: PolicyStatus;
  ownerName: string;
  totalControls: number;
  activeControls: number;
  pass: number;
  fail: number;
  partial: number;
  notTested: number;
  lastTested: string | null;
}

function PolicyRow({ policy: p, onClick }: { policy: PolicyBreakdownRow; onClick: () => void }) {
  const statusColours = POLICY_STATUS_COLOURS[p.status];
  const hasIssues = p.fail > 0;
  const allGood = p.activeControls > 0 && p.fail === 0 && p.notTested === 0 && p.partial === 0;
  const total = p.pass + p.fail + p.partial + p.notTested;

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-gray-50 transition-colors group"
    >
      {/* Policy name */}
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0", statusColours.bg, statusColours.text)}>
            {p.reference}
          </span>
          <span className="text-sm text-gray-700 font-medium group-hover:text-updraft-deep transition-colors line-clamp-1">{p.name}</span>
          <span className={cn("hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0", statusColours.bg, statusColours.text)}>
            {POLICY_STATUS_LABELS[p.status]}
          </span>
        </div>
      </td>

      {/* Owner */}
      <td className="py-2.5 pr-4">
        <span className="text-xs text-gray-500 whitespace-nowrap">{p.ownerName}</span>
      </td>

      {/* Control count */}
      <td className="py-2.5 pr-4 text-center">
        {p.totalControls === 0 ? (
          <span className="text-xs text-gray-400">—</span>
        ) : (
          <span className="text-xs font-semibold text-gray-600">{p.activeControls}<span className="text-gray-400 font-normal">/{p.totalControls}</span></span>
        )}
      </td>

      {/* Test status */}
      <td className="py-2.5 pr-4">
        {p.activeControls === 0 ? (
          <span className="text-xs text-gray-400 italic">No active controls</span>
        ) : (
          <div className="flex items-center gap-2.5">
            {/* Progress bar */}
            {total > 0 && (
              <div className="hidden md:flex w-20 h-1.5 rounded-full overflow-hidden bg-gray-100 shrink-0">
                {p.pass > 0 && <div className="bg-green-500 h-full" style={{ width: `${(p.pass / total) * 100}%` }} />}
                {p.partial > 0 && <div className="bg-amber-400 h-full" style={{ width: `${(p.partial / total) * 100}%` }} />}
                {p.fail > 0 && <div className="bg-red-500 h-full" style={{ width: `${(p.fail / total) * 100}%` }} />}
                {p.notTested > 0 && <div className="bg-gray-300 h-full" style={{ width: `${(p.notTested / total) * 100}%` }} />}
              </div>
            )}
            {/* Counts */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {p.pass > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-green-700">
                  <CheckCircle2 size={11} className="shrink-0" />{p.pass}
                </span>
              )}
              {p.fail > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-red-600 font-semibold">
                  <XCircle size={11} className="shrink-0" />{p.fail}
                </span>
              )}
              {p.partial > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-600">
                  <AlertTriangle size={11} className="shrink-0" />{p.partial}
                </span>
              )}
              {p.notTested > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
                  <MinusCircle size={11} className="shrink-0" />{p.notTested}
                </span>
              )}
              {allGood && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-green-600">
                  <CheckCircle2 size={11} className="shrink-0" /> All passing
                </span>
              )}
            </div>
          </div>
        )}
      </td>

      {/* Last tested */}
      <td className="py-2.5 text-right">
        {p.lastTested ? (
          <span className={cn("text-xs whitespace-nowrap", hasIssues ? "text-red-600 font-medium" : "text-gray-500")}>
            {new Date(p.lastTested).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Not tested</span>
        )}
      </td>
    </tr>
  );
}
