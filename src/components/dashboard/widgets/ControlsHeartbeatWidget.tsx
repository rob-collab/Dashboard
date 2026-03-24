"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { WidgetShell, WidgetLabel, WidgetInsight, em, WidgetFooter, DataSourceTag } from "./WidgetShell";
import { WaffleGrid, WaffleResult } from "./WaffleGrid";
import { StatusChip } from "./StatusChip";

export function ControlsHeartbeatWidget() {
  const controls = useAppStore((s) => s.controls);

  const { cells, passRate, failCluster } = useMemo(() => {
    const active = controls.filter((c) => c.isActive);

    const cells = active.map((ctrl) => {
      const results = ctrl.testingSchedule?.testResults ?? [];
      if (!results.length) return { result: "untested" as WaffleResult, title: ctrl.controlName };
      const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
      const r = sorted[0].result;
      return {
        result: (r === "PASS" ? "pass" : r === "PARTIALLY" ? "partial" : "fail") as WaffleResult,
        title: ctrl.controlName,
      };
    });

    const total = cells.length;
    const passing = cells.filter((c) => c.result === "pass").length;
    const failing = cells.filter((c) => c.result === "fail");
    const passRate = total > 0 ? Math.round((passing / total) * 100) : 100;

    // Detect a failing cluster by checking if any category has disproportionate failures
    const failCluster = failing.length >= 3 ? `${failing.length} controls failing` : null;

    return { cells, passRate, failCluster };
  }, [controls]);

  return (
    <WidgetShell>
      <WidgetLabel>Controls Heartbeat</WidgetLabel>
      <WidgetInsight>
        {passRate >= 80
          ? <>{em.good(`${passRate}%`)} passing.{failCluster ? ` ${em.warn(failCluster)}.` : ""}</>
          : <>{em.bad(`${passRate}%`)} passing — {failCluster ?? "failures detected"}.</>}
      </WidgetInsight>

      <div className="mt-3 flex gap-2">
        <StatusChip variant={passRate >= 80 ? "green" : passRate >= 60 ? "amber" : "red"}>
          {passRate}% Pass
        </StatusChip>
        {cells.filter((c) => c.result === "fail").length > 0 && (
          <StatusChip variant="red">{cells.filter((c) => c.result === "fail").length} Fail</StatusChip>
        )}
      </div>

      <div className="mt-3">
        <WaffleGrid cells={cells} />
        <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>
          Each square = 1 control · coloured by last test result
        </p>
      </div>

      <WidgetFooter>
        <DataSourceTag>testingSchedule · latest result per control</DataSourceTag>
      </WidgetFooter>
    </WidgetShell>
  );
}
