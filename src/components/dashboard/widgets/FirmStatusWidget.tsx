"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { WidgetShell, WidgetLabel, WidgetInsight, em, WidgetFooter, DataSourceTag } from "./WidgetShell";

type RAG = "red" | "amber" | "green";

interface Indicator {
  label: string;
  value: number; // 0–100
  status: RAG;
  description: string;
}

export function FirmStatusWidget() {
  const controls = useAppStore((s) => s.controls);
  const actions = useAppStore((s) => s.actions);
  const outcomes = useAppStore((s) => s.outcomes);

  const indicators: Indicator[] = useMemo(() => {
    // Controls: % active controls with latest PASS
    const activeControls = controls.filter((c) => c.isActive);
    const passing = activeControls.filter((c) => {
      const results = c.testingSchedule?.testResults ?? [];
      if (!results.length) return false;
      const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
      return sorted[0].result === "PASS";
    }).length;
    const controlsPct = activeControls.length > 0 ? Math.round((passing / activeControls.length) * 100) : 100;
    const controlsStatus: RAG = controlsPct >= 70 ? "green" : controlsPct >= 50 ? "amber" : "red";

    // Actions: count overdue P1 actions (COMPLETED / PROPOSED_CLOSED are terminal states)
    const overdueP1 = actions.filter((a) => {
      if (a.priority !== "P1" || a.status === "COMPLETED" || a.status === "PROPOSED_CLOSED") return false;
      return a.dueDate && new Date(a.dueDate) < new Date();
    }).length;
    const actionsStatus: RAG = overdueP1 === 0 ? "green" : overdueP1 <= 2 ? "amber" : "red";
    const actionsPct = Math.max(0, 100 - overdueP1 * 20);

    // Compliance (CD): % outcomes GREEN
    const total = outcomes.length;
    // RAGStatus uses GOOD/WARNING/HARM (not GREEN/AMBER/RED)
    const greenOutcomes = outcomes.filter((o) => !o.ragStatus || o.ragStatus === "GOOD").length;
    const compliancePct = total > 0 ? Math.round((greenOutcomes / total) * 100) : 100;
    const complianceStatus: RAG = compliancePct >= 80 ? "green" : compliancePct >= 60 ? "amber" : "red";

    // CD: any HARM/WARNING outcomes?
    const hasRed = outcomes.some((o) => o.ragStatus === "HARM");
    const hasAmber = outcomes.some((o) => o.ragStatus === "WARNING");
    const cdStatus: RAG = hasRed ? "red" : hasAmber ? "amber" : "green";
    const cdPct = compliancePct;

    return [
      { label: "Controls",      value: controlsPct,  status: controlsStatus,   description: `${controlsPct}% passing` },
      { label: "Actions",       value: actionsPct,   status: actionsStatus,    description: `${overdueP1} P1 overdue` },
      { label: "Compliance",    value: compliancePct, status: complianceStatus, description: `${compliancePct}% green` },
      { label: "Consumer Duty", value: cdPct,        status: cdStatus,         description: hasRed ? "Red outcome" : hasAmber ? "Amber outcome" : "All green" },
    ];
  }, [controls, actions, outcomes]);

  const critical = indicators.filter((i) => i.status === "red").length;
  const amber = indicators.filter((i) => i.status === "amber").length;

  return (
    <WidgetShell>
      <WidgetLabel>Firm Status</WidgetLabel>
      <WidgetInsight>
        {critical > 0
          ? <>{em.bad(critical.toString())} domain{critical !== 1 ? "s" : ""} critical — review required.</>
          : amber > 0
          ? <>{em.warn(amber.toString())} domain{amber !== 1 ? "s" : ""} amber — monitor closely.</>
          : <>{em.good("All domains")} within acceptable thresholds.</>}
      </WidgetInsight>

      <div className="mt-3 space-y-3">
        {indicators.map((ind) => (
          <div key={ind.label}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A2E" }}>{ind.label}</span>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: "#64748b" }}>{ind.description}</span>
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    background: ind.status === "green" ? "#22c55e" : ind.status === "amber" ? "#f59e0b" : "#ef4444"
                  }}
                />
              </div>
            </div>
            <div className="h-1 w-full rounded-full bg-[#F0EEE9] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${ind.value}%`,
                  background: ind.status === "green" ? "#22c55e" : ind.status === "amber" ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <WidgetFooter>
        <DataSourceTag>controls · actions · outcomes · independent thresholds</DataSourceTag>
      </WidgetFooter>
    </WidgetShell>
  );
}
