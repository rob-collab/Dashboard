"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { WidgetShell, WidgetLabel, WidgetInsight, em, WidgetFooter, DataSourceTag } from "./WidgetShell";
import { StatusChip } from "./StatusChip";

export function HorizonAlertWidget() {
  const horizonItems = useAppStore((s) => s.horizonItems);

  const { urgent, nextDeadlineDays, nextTitle } = useMemo(() => {
    const urgent = horizonItems
      .filter((h) => h.urgency === "HIGH" && h.status === "ACTION_REQUIRED")
      .map((h) => ({
        id: h.id,
        title: h.title ?? "Untitled",
        // HorizonItem uses `deadline` not `dueDate`
        dueDate: h.deadline ? new Date(h.deadline) : null,
        daysUntil: h.deadline
          ? Math.ceil((new Date(h.deadline).getTime() - Date.now()) / 86400000)
          : null,
      }))
      .sort((a, b) => (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999));

    const next = urgent[0];
    return {
      urgent,
      nextDeadlineDays: next?.daysUntil ?? null,
      nextTitle: next?.title ?? null,
    };
  }, [horizonItems]);

  return (
    <WidgetShell>
      <WidgetLabel>Horizon Alert</WidgetLabel>
      <WidgetInsight>
        {nextTitle
          ? <>{em.warn(nextTitle)} deadline in {em.num(`${nextDeadlineDays}d`)}.</>
          : <>{em.good("No urgent")} FCA deadlines.</>}
      </WidgetInsight>

      <div className="mt-3 space-y-2">
        {urgent.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#E8E6E1] bg-[#F8F7F4] px-3 py-2">
            <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A2E" }} className="truncate mr-2">
              {item.title}
            </span>
            <StatusChip variant={
              item.daysUntil !== null && item.daysUntil <= 14 ? "red" :
              item.daysUntil !== null && item.daysUntil <= 30 ? "amber" : "gray"
            }>
              {item.daysUntil !== null ? `${item.daysUntil}d` : "—"}
            </StatusChip>
          </div>
        ))}
        {urgent.length === 0 && (
          <p style={{ fontSize: 12, color: "#94a3b8" }}>No action-required items.</p>
        )}
      </div>

      <WidgetFooter>
        <DataSourceTag>horizonItems · urgency=HIGH, status=ACTION_REQUIRED</DataSourceTag>
      </WidgetFooter>
    </WidgetShell>
  );
}
