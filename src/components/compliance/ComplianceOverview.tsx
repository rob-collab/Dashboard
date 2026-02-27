"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLOURS,
  type Regulation,
  type ComplianceStatus,
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

      // Owner name and id
      const resolvedOwner = policy.owner ?? users.find((u) => u.id === policy.ownerId);
      const ownerName = resolvedOwner?.name ?? "—";
      const ownerId = policy.ownerId ?? null;

      return {
        id: policy.id,
        reference: policy.reference,
        name: policy.name,
        status: policy.status,
        ownerName,
        ownerId,
        nextReviewDate: policy.nextReviewDate ?? null,
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

  // Group policyBreakdown by owner
  const policyByOwner = useMemo(() => {
    const map = new Map<string, { ownerName: string; ownerId: string | null; items: typeof policyBreakdown }>();
    for (const p of policyBreakdown) {
      const key = p.ownerId ?? "__unassigned__";
      if (!map.has(key)) {
        map.set(key, { ownerName: p.ownerName, ownerId: p.ownerId, items: [] });
      }
      map.get(key)!.items.push(p);
    }
    // Sort: assigned owners by name, then unassigned last
    return Array.from(map.entries())
      .sort(([ka], [kb]) => {
        if (ka === "__unassigned__") return 1;
        if (kb === "__unassigned__") return -1;
        return map.get(ka)!.ownerName.localeCompare(map.get(kb)!.ownerName);
      })
      .map(([, v]) => v);
  }, [policyBreakdown]);

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

      {/* Compliance by Policy Owner */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-updraft-deep font-poppins">Compliance by Policy Owner</h2>
            <p className="text-xs text-gray-500 mt-0.5">Control test status grouped by policy owner — based on each control&apos;s most recent test result</p>
          </div>
          <button
            onClick={() => onNavigate("policies")}
            className="text-xs text-updraft-bright-purple hover:underline flex items-center gap-1"
          >
            View Policies <ArrowRight size={12} />
          </button>
        </div>

        {policyByOwner.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No policies configured yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {policyByOwner.map((group) => {
              const now = new Date();
              const overdueCount = group.items.filter(
                (p) => p.nextReviewDate && new Date(p.nextReviewDate) < now
              ).length;
              const totalPass = group.items.reduce((s, p) => s + p.pass, 0);
              const totalFail = group.items.reduce((s, p) => s + p.fail, 0);
              const totalPartial = group.items.reduce((s, p) => s + p.partial, 0);
              const totalNotTested = group.items.reduce((s, p) => s + p.notTested, 0);
              const keyGap = group.items.find((p) => p.fail > 0)?.name
                ?? group.items.find((p) => p.partial > 0)?.name
                ?? null;
              const isUnassigned = group.ownerId === null;
              const initials = isUnassigned ? "?" : group.ownerName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

              return (
                <button
                  key={group.ownerId ?? "__unassigned__"}
                  type="button"
                  onClick={() => onNavigate("policies")}
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-updraft-light-purple hover:shadow-sm transition-all group"
                >
                  {/* Owner header */}
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      isUnassigned ? "bg-gray-100 text-gray-400" : "bg-updraft-pale-purple/40 text-updraft-bar"
                    )}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-updraft-deep truncate">
                        {isUnassigned ? "No Owner Assigned" : group.ownerName}
                      </p>
                      <p className="text-xs text-gray-500">{group.items.length} polic{group.items.length === 1 ? "y" : "ies"}</p>
                    </div>
                    <MiniDonut pass={totalPass} partial={totalPartial} fail={totalFail} notTested={totalNotTested} />
                  </div>

                  {/* Key gap */}
                  {keyGap && (
                    <div className="flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1.5">
                      <XCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-red-700 line-clamp-1">Key gap: {keyGap}</p>
                    </div>
                  )}

                  {/* Status row */}
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                    {totalPass > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{totalPass} pass</span>}
                    {totalPartial > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{totalPartial} partial</span>}
                    {totalFail > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{totalFail} fail</span>}
                    {totalNotTested > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />{totalNotTested} untested</span>}
                    {totalPass === 0 && totalFail === 0 && totalPartial === 0 && totalNotTested === 0 && (
                      <span className="flex items-center gap-1 text-gray-400"><MinusCircle size={10} /> No controls linked</span>
                    )}
                  </div>

                  {/* Overdue review flag */}
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5">
                      <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                      <p className="text-[11px] text-amber-700">{overdueCount} polic{overdueCount === 1 ? "y" : "ies"} overdue for review</p>
                    </div>
                  )}
                </button>
              );
            })}
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
              <AnimatedNumber value={cdHealth.good} className="text-3xl font-bold font-poppins text-green-700" />
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-xs text-green-700 font-medium">Green</p>
              </div>
            </Link>
            <Link href="/consumer-duty?rag=WARNING" className="text-center p-4 rounded-xl bg-amber-50 border border-amber-100 hover:border-amber-300 hover:-translate-y-0.5 transition-all">
              <AnimatedNumber value={cdHealth.warning} className="text-3xl font-bold font-poppins text-amber-700" />
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <p className="text-xs text-amber-700 font-medium">Amber</p>
              </div>
            </Link>
            <Link href="/consumer-duty?rag=HARM" className={cn("text-center p-4 rounded-xl border hover:-translate-y-0.5 transition-all", cdHealth.harm > 0 ? "bg-red-50 border-red-100 hover:border-red-300" : "bg-gray-50 border-gray-100 hover:border-gray-300")}>
              <AnimatedNumber value={cdHealth.harm} className={cn("text-3xl font-bold font-poppins", cdHealth.harm > 0 ? "text-red-700" : "text-gray-400")} />
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
      {typeof value === "number"
        ? <AnimatedNumber value={value} className={cn("text-2xl font-bold font-poppins", colourClass)} />
        : <p className={cn("text-2xl font-bold font-poppins", colourClass)}>{value}</p>
      }
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
      <AnimatedNumber value={value} className={cn("text-xl font-bold font-poppins", colourClass)} />
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </Wrapper>
  );
}

// ── Mini Donut Chart ───────────────────────────────────────────────

function MiniDonut({ pass, partial, fail, notTested }: { pass: number; partial: number; fail: number; notTested: number }) {
  const total = pass + partial + fail + notTested;
  const r = 18;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
      </svg>
    );
  }

  // Segment colours
  const segments: { count: number; colour: string }[] = [
    { count: pass, colour: "#22c55e" },
    { count: partial, colour: "#f59e0b" },
    { count: fail, colour: "#ef4444" },
    { count: notTested, colour: "#d1d5db" },
  ];

  let offset = 0;
  const circles = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const arc = (s.count / total) * circumference;
      const el = (
        <circle
          key={s.colour}
          cx="22" cy="22" r={r}
          fill="none"
          stroke={s.colour}
          strokeWidth="7"
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeDashoffset={-offset}
          transform="rotate(-90 22 22)"
        />
      );
      offset += arc;
      return el;
    });

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
      {circles}
    </svg>
  );
}

