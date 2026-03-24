"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { WidgetShell, WidgetLabel, WidgetInsight, em, WidgetFooter, DataSourceTag } from "./WidgetShell";
import { StatusChip } from "./StatusChip";

type ItemType = "action" | "risk" | "control";

interface RunwayItem {
  id: string;
  title: string;
  type: ItemType;
  daysUntil: number; // negative = overdue
}

const TYPE_COLOUR: Record<ItemType, string> = {
  action:  "#ef4444",
  risk:    "#d97706",
  control: "#7c3aed",
};

export function MyRunwayWidget() {
  const currentUser = useAppStore((s) => s.currentUser);
  const actions = useAppStore((s) => s.actions);
  const risks = useAppStore((s) => s.risks);
  const controls = useAppStore((s) => s.controls);

  const { items, overdue } = useMemo(() => {
    if (!currentUser) return { items: [] as RunwayItem[], overdue: 0 };
    const now = new Date();

    // Actions: `assignedTo` is the user ID field on Action; terminal statuses are COMPLETED / PROPOSED_CLOSED
    const myActions: RunwayItem[] = actions
      .filter((a) => a.assignedTo === currentUser.id && a.status !== "COMPLETED" && a.status !== "PROPOSED_CLOSED" && a.dueDate)
      .map((a) => ({
        id: a.id,
        title: a.title ?? "Action",
        type: "action" as ItemType,
        daysUntil: Math.ceil((new Date(a.dueDate!).getTime() - now.getTime()) / 86400000),
      }));

    // Risks: derive next review from lastReviewed + reviewFrequencyDays
    const myRisks: RunwayItem[] = risks
      .filter((r) => r.ownerId === currentUser.id && r.lastReviewed && r.reviewFrequencyDays > 0)
      .map((r) => {
        const nextReview = new Date(new Date(r.lastReviewed).getTime() + r.reviewFrequencyDays * 86400000);
        return {
          id: r.id,
          title: r.name ?? "Risk",
          type: "risk" as ItemType,
          daysUntil: Math.ceil((nextReview.getTime() - now.getTime()) / 86400000),
        };
      });

    // Controls: `controlOwnerId` is the owner field; next test date is not a direct field
    // on TestingScheduleEntry — use effectiveDate from the most recent result as a proxy
    const myControls: RunwayItem[] = controls
      .filter((c) => c.controlOwnerId === currentUser.id && c.isActive)
      .flatMap((c) => {
        const results = c.testingSchedule?.testResults ?? [];
        if (!results.length) return [];
        // Use the latest tested date + 90 days as a rough next-test proxy
        const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
        const lastTested = new Date(sorted[0].testedDate);
        const nextEstimate = new Date(lastTested.getTime() + 90 * 86400000);
        return [{
          id: c.id,
          title: c.controlName ?? "Control",
          type: "control" as ItemType,
          daysUntil: Math.ceil((nextEstimate.getTime() - now.getTime()) / 86400000),
        }];
      });

    const all = [...myActions, ...myRisks, ...myControls]
      .filter((i) => i.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return {
      items: all,
      overdue: all.filter((i) => i.daysUntil < 0).length,
    };
  }, [currentUser, actions, risks, controls]);

  const DAYS = 30;

  return (
    <WidgetShell>
      <WidgetLabel>My 30-Day Runway</WidgetLabel>
      <WidgetInsight>
        {overdue > 0
          ? <>{em.bad(overdue.toString())} item{overdue !== 1 ? "s" : ""} overdue — review urgently.</>
          : items.length > 0
          ? <>{em.num(items.length.toString())} item{items.length !== 1 ? "s" : ""} due in 30 days.</>
          : <>{em.good("Clear runway")} — nothing due in 30 days.</>}
      </WidgetInsight>

      {/* Timeline strip */}
      <div className="mt-3 relative" style={{ height: 40 }}>
        {/* Track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-full rounded-full bg-[#F0EEE9]"
          style={{ height: 4 }}
        />

        {/* Overdue zone (left of today marker) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-l-full"
          style={{ left: 0, width: `${(Math.abs(Math.min(0, items[0]?.daysUntil ?? 0)) / DAYS) * 100}%`, height: 4, background: "rgba(239,68,68,0.15)" }}
        />

        {/* Today line */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: "0%", zIndex: 2 }}
        >
          <div className="w-px h-full bg-[#7c3aed] opacity-60" style={{ width: 1.5 }} />
        </div>

        {/* Item dots */}
        {items.slice(0, 15).map((item) => {
          const pct = Math.max(0, Math.min(100, ((item.daysUntil + 5) / (DAYS + 5)) * 100));
          return (
            <div
              key={item.id}
              title={`${item.title} (${item.daysUntil < 0 ? "overdue" : `+${item.daysUntil}d`})`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full cursor-pointer hover:scale-125 transition-transform"
              style={{
                left: `${pct}%`,
                width: 10,
                height: 10,
                background: TYPE_COLOUR[item.type],
                zIndex: 3,
              }}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="mt-1 flex justify-between" style={{ fontSize: 9, color: "#94a3b8" }}>
        <span>Overdue</span>
        <span>+7d</span>
        <span>+14d</span>
        <span>+21d</span>
        <span>+30d</span>
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-3">
        {(["action", "risk", "control"] as ItemType[]).map((t) => (
          <div key={t} className="flex items-center gap-1">
            <div className="rounded-full" style={{ width: 8, height: 8, background: TYPE_COLOUR[t] }} />
            <span style={{ fontSize: 9, color: "#94a3b8", textTransform: "capitalize" }}>{t}</span>
          </div>
        ))}
      </div>

      <WidgetFooter>
        <DataSourceTag>actions · risks · controls · assigned to me</DataSourceTag>
      </WidgetFooter>
    </WidgetShell>
  );
}
