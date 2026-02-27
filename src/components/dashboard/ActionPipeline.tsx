"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Action, ActionPriority } from "@/lib/types";

interface PriorityStats {
  P1: Action[];
  P2: Action[];
  P3: Action[];
}

interface Props {
  actions: Action[];
  priorityStats: PriorityStats;
}

const PRIORITY_COLOURS: Record<ActionPriority, string> = {
  P1: "#dc2626",  // red-600
  P2: "#f59e0b",  // amber-500
  P3: "#6b7280",  // gray-500
};

const STATUS_SEGMENTS = [
  { status: "OPEN",        label: "Open",        colour: "bg-blue-500",   textColour: "text-white" },
  { status: "IN_PROGRESS", label: "In Progress", colour: "bg-purple-500", textColour: "text-white" },
  { status: "OVERDUE",     label: "Overdue",     colour: "bg-red-500",    textColour: "text-white" },
] as const;

type TrackableStatus = (typeof STATUS_SEGMENTS)[number]["status"];

export default function ActionPipeline({ actions, priorityStats }: Props) {
  const router = useRouter();
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Total open actions across all priorities (for width proportions)
  const totalOpen = actions.filter(
    (a) => a.status === "OPEN" || a.status === "IN_PROGRESS" || a.status === "OVERDUE",
  ).length;

  // Bar chart data
  const barData: Array<{ priority: string; count: number; fill: string }> = (
    ["P1", "P2", "P3"] as ActionPriority[]
  ).map((p) => ({
    priority: p,
    count: priorityStats[p].length,
    fill: PRIORITY_COLOURS[p],
  }));

  return (
    <div className="bento-card space-y-4">
      {/* Swimlane section */}
      <div className="space-y-2">
        {(["P1", "P2", "P3"] as ActionPriority[]).map((priority) => {
          const pool = priorityStats[priority];
          const openCount = pool.filter((a) => a.status === "OPEN").length;
          const inProgressCount = pool.filter((a) => a.status === "IN_PROGRESS").length;
          const overdueCount = pool.filter((a) => a.status === "OVERDUE").length;
          const total = openCount + inProgressCount + overdueCount;

          // Segment widths proportional to totalOpen (portfolio-wide)
          const base = Math.max(totalOpen, 1);
          // Skip animation if user prefers reduced motion
          const showWidth = mounted || prefersReduced;
          const segWidths: Record<TrackableStatus, string> = {
            OPEN:        showWidth ? `${(openCount / base) * 100}%` : "0%",
            IN_PROGRESS: showWidth ? `${(inProgressCount / base) * 100}%` : "0%",
            OVERDUE:     showWidth ? `${(overdueCount / base) * 100}%` : "0%",
          };

          return (
            <div key={priority} className="flex items-center gap-3">
              {/* Priority label */}
              <span
                className="text-xs font-bold w-8 shrink-0 text-right"
                style={{ color: PRIORITY_COLOURS[priority] }}
              >
                {priority}
              </span>

              {/* Stacked bar */}
              <div className="flex-1 flex h-6 rounded-full overflow-hidden bg-gray-100">
                {STATUS_SEGMENTS.map(({ status, colour }) => {
                  const width = segWidths[status as TrackableStatus];
                  return (
                    <button
                      key={status}
                      className={`h-full ${colour} ${prefersReduced ? "" : "duration-700 ease-out"} hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1`}
                      style={{ width, transitionProperty: prefersReduced ? "none" : "width" }}
                      onClick={() =>
                        router.push(`/actions?priority=${priority}&status=${status}`)
                      }
                      title={`${priority} · ${status}`}
                      disabled={parseInt(width) === 0}
                    />
                  );
                })}
              </div>

              {/* Count badge */}
              <span className="text-xs font-semibold text-gray-600 w-6 shrink-0">{total}</span>
            </div>
          );
        })}
      </div>

      {/* Swimlane legend */}
      <div className="flex items-center gap-4">
        {STATUS_SEGMENTS.map(({ status, label, colour }) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded-sm ${colour}`} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Recharts bar chart — overall count per priority */}
      <ResponsiveContainer width="100%" height={100}>
        <BarChart
          data={barData}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
        >
          <XAxis type="number" tick={{ fontSize: 9 }} />
          <YAxis type="category" dataKey="priority" tick={{ fontSize: 10, fontWeight: 700 }} width={24} />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: "4px 8px" }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="count" name="Actions" radius={[0, 4, 4, 0]} isAnimationActive>
            {barData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
