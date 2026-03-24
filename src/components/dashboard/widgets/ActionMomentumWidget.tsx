"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { WidgetShell, WidgetLabel, WidgetInsight, em, WidgetFooter, DataSourceTag } from "./WidgetShell";
import { StatusChip } from "./StatusChip";

interface MonthData {
  month: string;
  P1: number;
  P2: number;
  P3: number;
}

export function ActionMomentumWidget() {
  const actions = useAppStore((s) => s.actions);

  const { chartData, latestMonth, trend } = useMemo(() => {
    const monthMap: Record<string, MonthData> = {};

    for (const action of actions) {
      const date = new Date(action.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleString("en-GB", { month: "short", year: "2-digit" });
      if (!monthMap[key]) monthMap[key] = { month: label, P1: 0, P2: 0, P3: 0 };

      const p = action.priority as string;
      if (p === "P1") monthMap[key].P1++;
      else if (p === "P2") monthMap[key].P2++;
      else monthMap[key].P3++;
    }

    const chartData = Object.keys(monthMap)
      .sort()
      .slice(-6)
      .map((k) => monthMap[k]);

    const lastTwo = chartData.slice(-2);
    const prev = lastTwo[0]?.P1 ?? 0;
    const curr = lastTwo[1]?.P1 ?? 0;
    const trend = curr > prev ? "growing" : curr < prev ? "shrinking" : "stable";

    return { chartData, latestMonth: chartData[chartData.length - 1], trend };
  }, [actions]);

  const p1Total = latestMonth?.P1 ?? 0;
  const closedThisWeek = actions.filter((a) => {
    if (a.status !== "COMPLETED" && a.status !== "PROPOSED_CLOSED") return false;
    const closed = new Date(a.updatedAt);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    return closed >= weekAgo;
  }).length;

  return (
    <WidgetShell>
      <WidgetLabel>Action Momentum</WidgetLabel>
      <WidgetInsight>
        {trend === "growing"
          ? <>P1 backlog {em.bad("growing")} — {em.num(closedThisWeek.toString())} closed this week.</>
          : trend === "shrinking"
          ? <>P1 backlog {em.good("shrinking")} — good momentum.</>
          : <>P1 backlog {em.warn("stable")} — {em.num(p1Total.toString())} open.</>}
      </WidgetInsight>

      <div className="mt-2 flex gap-2">
        <StatusChip variant={p1Total > 3 ? "red" : p1Total > 0 ? "amber" : "green"}>
          {p1Total} P1
        </StatusChip>
        {closedThisWeek > 0 && (
          <StatusChip variant="green">{closedThisWeek} closed this week</StatusChip>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="mt-3" style={{ height: 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E8E6E1" }}
              />
              <Area type="monotone" dataKey="P1" stackId="1" stroke="#dc2626" fill="#fef2f2" strokeWidth={1.5} />
              <Area type="monotone" dataKey="P2" stackId="1" stroke="#d97706" fill="#fffbeb" strokeWidth={1.5} />
              <Area type="monotone" dataKey="P3" stackId="1" stroke="#94a3b8" fill="#f8fafc" strokeWidth={1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <WidgetFooter>
        <DataSourceTag>actions · grouped by createdAt month</DataSourceTag>
      </WidgetFooter>
    </WidgetShell>
  );
}
