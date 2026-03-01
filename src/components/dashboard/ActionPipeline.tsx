"use client";

import { useEffect, useRef, useState } from "react";
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
import { ScrollChart } from "@/components/common/ScrollChart";
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

/** Spring easing — bars overshoot very slightly then snap back. Pure fun. */
const SPRING_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export default function ActionPipeline({ actions, priorityStats }: Props) {
  const router = useRouter();
  const prefersReduced = useReducedMotion();

  // Scroll trigger for stacked bars
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView]       = useState(false);
  const wasInView = useRef(false);

  useEffect(() => {
    if (prefersReduced) {
      setInView(true); // show bars immediately for reduced motion
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !wasInView.current) {
          wasInView.current = true;
          setInView(true);
        } else if (!entry.isIntersecting) {
          wasInView.current = false;
          setInView(false); // reset so bars re-animate on re-entry
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

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
    <div ref={containerRef} className="bento-card space-y-4">
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
          // Spring-animated widths — grow from 0 when inView becomes true
          const segWidths: Record<TrackableStatus, string> = {
            OPEN:        inView ? `${(openCount / base) * 100}%` : "0%",
            IN_PROGRESS: inView ? `${(inProgressCount / base) * 100}%` : "0%",
            OVERDUE:     inView ? `${(overdueCount / base) * 100}%` : "0%",
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

              {/* Stacked bar — spring easing on width growth */}
              <div className="flex-1 flex h-6 rounded-full overflow-hidden bg-gray-100">
                {STATUS_SEGMENTS.map(({ status, colour }) => {
                  const width = segWidths[status as TrackableStatus];
                  return (
                    <button
                      key={status}
                      className={`h-full ${colour} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1`}
                      style={{
                        width,
                        transitionProperty: prefersReduced ? "none" : "width",
                        transitionDuration: prefersReduced ? "0ms" : "700ms",
                        transitionTimingFunction: prefersReduced ? "linear" : SPRING_EASING,
                      }}
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

      {/* Recharts bar chart — scroll-triggered via ScrollChart wrapper */}
      <ScrollChart className="h-[100px]">
        {(scrollKey) => (
          <ResponsiveContainer key={scrollKey} width="100%" height="100%">
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
        )}
      </ScrollChart>
    </div>
  );
}
