"use client";

import ArcGauge from "./ArcGauge";
import type { Risk, Action, ConsumerDutyOutcome } from "@/lib/types";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";

interface ComplianceHealth {
  total: number;
  compliantPct: number;
  gaps: number;
  overdueAssessments: number;
  pendingCerts: number;
}

interface Props {
  risks: Risk[];
  actions: Action[];
  outcomes: ConsumerDutyOutcome[];
  complianceHealth: ComplianceHealth | null;
}

interface ScorecardCardProps {
  gauge: number;
  title: string;
  stat1Label: string;
  stat1Value: number | string;
  stat2Label: string;
  stat2Value: number | string;
  stat2Accent?: string;
}

function ScorecardCard({ gauge, title, stat1Label, stat1Value, stat2Label, stat2Value, stat2Accent }: ScorecardCardProps) {
  return (
    <div className="bento-card flex items-center gap-3">
      <ArcGauge value={gauge} size={72} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">{stat1Label}</span>
            {typeof stat1Value === "number"
              ? <AnimatedNumber value={stat1Value} delay={200} duration={800} className="text-sm font-bold text-updraft-deep" />
              : <span className="text-sm font-bold text-updraft-deep">{stat1Value}</span>}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">{stat2Label}</span>
            {typeof stat2Value === "number"
              ? <AnimatedNumber value={stat2Value} delay={400} duration={800} className={`text-sm font-bold ${stat2Accent ?? "text-updraft-deep"}`} />
              : <span className={`text-sm font-bold ${stat2Accent ?? "text-updraft-deep"}`}>{stat2Value}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DomainScorecardRow({ risks, actions, outcomes, complianceHealth }: Props) {
  // --- Risk Health ---
  const totalRisks = risks.length;
  const highRisks = risks.filter((r) => r.residualLikelihood * r.residualImpact > 12).length;
  const lowResidual = risks.filter((r) => r.residualLikelihood * r.residualImpact <= 4).length;
  const riskHealth = totalRisks > 0 ? Math.round((lowResidual / totalRisks) * 100) : 0;

  // --- Action Health ---
  const openActions = actions.filter((a) => a.status !== "COMPLETED");
  const onTrackActions = openActions.filter((a) => a.status !== "OVERDUE");
  const overdueActions = openActions.filter((a) => a.status === "OVERDUE").length;
  const actionHealth =
    openActions.length > 0 ? Math.round((onTrackActions.length / openActions.length) * 100) : 100;

  // --- Consumer Duty Health ---
  const allMeasures = outcomes.flatMap((o) => o.measures ?? []);
  const goodMeasures = allMeasures.filter((m) => m.ragStatus === "GOOD").length;
  const cdHealth = allMeasures.length > 0 ? Math.round((goodMeasures / allMeasures.length) * 100) : 0;
  const warnMeasures = allMeasures.filter((m) => m.ragStatus === "WARNING").length;
  const harmMeasures = allMeasures.filter((m) => m.ragStatus === "HARM").length;

  // --- Compliance Health ---
  const complianceHealthPct = complianceHealth?.compliantPct ?? 0;
  const complianceGaps = complianceHealth?.gaps ?? 0;
  const complianceTotal = complianceHealth?.total ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <ScorecardCard
        gauge={riskHealth}
        title="Risk Health"
        stat1Label="Total risks"
        stat1Value={totalRisks}
        stat2Label="HIGH"
        stat2Value={highRisks}
        stat2Accent={highRisks > 0 ? "text-red-600" : "text-green-600"}
      />
      <ScorecardCard
        gauge={actionHealth}
        title="Action Health"
        stat1Label="Open"
        stat1Value={openActions.length}
        stat2Label="Overdue"
        stat2Value={overdueActions}
        stat2Accent={overdueActions > 0 ? "text-red-600" : "text-green-600"}
      />
      <ScorecardCard
        gauge={cdHealth}
        title="Consumer Duty"
        stat1Label="Green measures"
        stat1Value={goodMeasures}
        stat2Label="Amber / Red"
        stat2Value={`${warnMeasures} / ${harmMeasures}`}
        stat2Accent={(warnMeasures + harmMeasures) > 0 ? "text-amber-600" : "text-green-600"}
      />
      <ScorecardCard
        gauge={complianceHealthPct}
        title="Compliance"
        stat1Label="Regulations"
        stat1Value={complianceTotal}
        stat2Label="Gaps"
        stat2Value={complianceGaps}
        stat2Accent={complianceGaps > 0 ? "text-red-600" : "text-green-600"}
      />
    </div>
  );
}
