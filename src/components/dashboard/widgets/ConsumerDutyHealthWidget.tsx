"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { WidgetShell, WidgetLabel, WidgetInsight, em, WidgetFooter, DataSourceTag } from "./WidgetShell";
import { CDRing } from "./CDRing";
import { StatusChip, ragToChip } from "./StatusChip";

// CDRing uses "GREEN"/"AMBER"/"RED" internally; RAGStatus is "GOOD"/"WARNING"/"HARM"
function ragToCDRing(rag: string | null | undefined): "GREEN" | "AMBER" | "RED" {
  if (!rag) return "GREEN";
  const r = rag.toUpperCase();
  if (r === "HARM" || r === "RED") return "RED";
  if (r === "WARNING" || r === "AMBER") return "AMBER";
  return "GREEN";
}

export function ConsumerDutyHealthWidget() {
  const outcomes = useAppStore((s) => s.outcomes);
  const horizonItems = useAppStore((s) => s.horizonItems);

  const { ringSegments, ringOutcomes, worstOutcome, boardReportDays } = useMemo(() => {
    const ringSegments = outcomes.map((o) => ({
      label: o.name,
      value: o.measures?.length ?? 1,
      rag: ragToCDRing(o.ragStatus),
    }));

    const ringOutcomes = outcomes.map((o) => ({
      id: o.id,
      name: o.name,
      rag: o.ragStatus ?? "GOOD",
    }));

    const worst = outcomes
      .filter((o) => o.ragStatus === "HARM" || o.ragStatus === "WARNING")
      .sort((a, b) => (a.ragStatus === "HARM" ? -1 : 1) - (b.ragStatus === "HARM" ? -1 : 1))[0];

    // Find board report horizon item — uses `deadline` field (not dueDate)
    const boardReport = horizonItems.find((h) =>
      h.title?.toLowerCase().includes("board report")
    );
    const boardReportDays = boardReport?.deadline
      ? Math.ceil((new Date(boardReport.deadline).getTime() - Date.now()) / 86400000)
      : null;

    return { ringSegments, ringOutcomes, worstOutcome: worst, boardReportDays };
  }, [outcomes, horizonItems]);

  const worstLabel = worstOutcome?.ragStatus === "HARM" ? "harm" : "warning";

  return (
    <WidgetShell>
      <WidgetLabel>Consumer Duty Health</WidgetLabel>
      <WidgetInsight>
        {worstOutcome
          ? <>{em.warn(worstOutcome.name)} {worstLabel} outcome.{boardReportDays !== null ? <> Board report {em.num(`${boardReportDays}d`)}.</> : ""}</>
          : <>{em.good("All outcomes")} good.{boardReportDays !== null ? <> Board report {em.num(`${boardReportDays}d`)}.</> : ""}</>}
      </WidgetInsight>

      <div className="mt-3 flex gap-4 items-start">
        <CDRing segments={ringSegments} size={80} />
        <div className="flex-1 space-y-1.5">
          {ringOutcomes.map((o) => (
            <div key={o.id} className="flex items-center justify-between">
              <span style={{ fontSize: 11, color: "#1A1A2E" }} className="truncate mr-2">{o.name}</span>
              <StatusChip variant={ragToChip(o.rag)}>{o.rag}</StatusChip>
            </div>
          ))}
        </div>
      </div>

      <WidgetFooter>
        <DataSourceTag>outcomes · measures · horizon deadlines</DataSourceTag>
      </WidgetFooter>
    </WidgetShell>
  );
}
