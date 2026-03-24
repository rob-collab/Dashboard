"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { WidgetShell, WidgetLabel, WidgetInsight, em, WidgetFooter, DataSourceTag } from "./WidgetShell";
import { WaffleGrid, WaffleResult } from "./WaffleGrid";
import { StatusChip, ragToChip } from "./StatusChip";

export function MyPortfolioWidget() {
  const currentUser = useAppStore((s) => s.currentUser);
  const risks = useAppStore((s) => s.risks);
  const controls = useAppStore((s) => s.controls);
  const outcomes = useAppStore((s) => s.outcomes);

  const { riskCounts, controlCells, cdMeasures } = useMemo(() => {
    if (!currentUser) return {
      riskCounts: { critical: 0, high: 0, medium: 0, low: 0 },
      controlCells: [] as { result: WaffleResult; title: string }[],
      cdMeasures: [] as { id: string; outcome: string; rag: string }[],
    };

    const myRisks = risks.filter((r) => r.ownerId === currentUser.id);
    const riskCounts = {
      critical: myRisks.filter((r) => r.residualLikelihood * r.residualImpact >= 20).length,
      high:     myRisks.filter((r) => { const s = r.residualLikelihood * r.residualImpact; return s >= 12 && s < 20; }).length,
      medium:   myRisks.filter((r) => { const s = r.residualLikelihood * r.residualImpact; return s >= 6 && s < 12; }).length,
      low:      myRisks.filter((r) => r.residualLikelihood * r.residualImpact < 6).length,
    };

    // ControlRecord uses `controlOwnerId` and `controlName`
    const myControls = controls.filter((c) => c.controlOwnerId === currentUser.id && c.isActive);
    const controlCells: { result: WaffleResult; title: string }[] = myControls.map((ctrl) => {
      const results = ctrl.testingSchedule?.testResults ?? [];
      if (!results.length) return { result: "untested" as WaffleResult, title: ctrl.controlName };
      const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
      const r = sorted[0].result;
      return { result: (r === "PASS" ? "pass" : r === "PARTIALLY" ? "partial" : "fail") as WaffleResult, title: ctrl.controlName };
    });

    // User.assignedMeasures is string[] of measureIds; ConsumerDutyMeasure.measureId is the match key
    const cdMeasures = outcomes.flatMap((o) =>
      (o.measures ?? [])
        .filter((m) => currentUser.assignedMeasures?.includes(m.measureId))
        .map((m) => ({ id: m.measureId, outcome: o.name, rag: o.ragStatus ?? "GREEN" }))
    );

    return { riskCounts, controlCells, cdMeasures };
  }, [currentUser, risks, controls, outcomes]);

  return (
    <WidgetShell>
      <WidgetLabel>My Portfolio</WidgetLabel>
      <WidgetInsight>
        {riskCounts.critical > 0
          ? <>{em.bad(riskCounts.critical.toString())} critical risk{riskCounts.critical !== 1 ? "s" : ""} owned.</>
          : riskCounts.high > 0
          ? <>{em.warn(riskCounts.high.toString())} high risk{riskCounts.high !== 1 ? "s" : ""} owned.</>
          : <>{em.good("No critical")} risks in your portfolio.</>}
      </WidgetInsight>

      <div className="mt-2 flex gap-1.5 flex-wrap">
        {riskCounts.critical > 0 && <StatusChip variant="red">{riskCounts.critical} Critical</StatusChip>}
        {riskCounts.high > 0     && <StatusChip variant="amber">{riskCounts.high} High</StatusChip>}
        {riskCounts.medium > 0   && <StatusChip variant="gray">{riskCounts.medium} Med</StatusChip>}
      </div>

      {controlCells.length > 0 && (
        <div className="mt-3">
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>
            My Controls
          </p>
          <WaffleGrid cells={controlCells.slice(0, 30)} />
        </div>
      )}

      {cdMeasures.length > 0 && (
        <div className="mt-3">
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>
            CD Measures
          </p>
          <div className="flex gap-1 flex-wrap">
            {cdMeasures.slice(0, 6).map((m) => (
              <StatusChip key={m.id} variant={ragToChip(m.rag as "RED" | "AMBER" | "GREEN")}>{m.id}</StatusChip>
            ))}
          </div>
        </div>
      )}

      <WidgetFooter>
        <DataSourceTag>risks · controls · outcomes · assigned to me</DataSourceTag>
      </WidgetFooter>
    </WidgetShell>
  );
}
