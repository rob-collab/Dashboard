"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Risk } from "@/lib/types";

interface Props {
  risks: Risk[];
}

const BRAND_PURPLE = "#7B1FA2";
const CATEGORY_COLOURS = [
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

export default function RiskTrendChart({ risks }: Props) {
  const { data, categories, hasData } = useMemo(() => {
    // Collect all snapshots across all risks
    const allSnaps: Array<{ month: string; score: number; category: string }> = [];
    for (const risk of risks) {
      for (const snap of risk.snapshots ?? []) {
        allSnaps.push({
          month: snap.month,
          score: snap.residualLikelihood * snap.residualImpact,
          category: risk.categoryL1,
        });
      }
    }

    if (allSnaps.length === 0) return { data: [], categories: [], hasData: false };

    // Group by month
    const monthMap = new Map<string, Record<string, number[]>>();
    for (const snap of allSnaps) {
      if (!monthMap.has(snap.month)) monthMap.set(snap.month, { _overall: [] });
      const entry = monthMap.get(snap.month)!;
      if (!entry[snap.category]) entry[snap.category] = [];
      entry[snap.category].push(snap.score);
      entry["_overall"].push(snap.score);
    }

    // Sorted months
    const months = Array.from(monthMap.keys()).sort();

    // Unique categories (for per-category lines)
    const categories = Array.from(new Set(allSnaps.map((s) => s.category)));

    // Build chart data array
    const data = months.map((month) => {
      const entry = monthMap.get(month)!;
      const row: Record<string, number | string> = { month };
      for (const cat of categories) {
        const scores = entry[cat] ?? [];
        row[cat] =
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : 0;
      }
      const overall = entry["_overall"];
      row["Overall"] =
        overall.length > 0
          ? Math.round((overall.reduce((a, b) => a + b, 0) / overall.length) * 10) / 10
          : 0;
      return row;
    });

    return { data, categories, hasData: true };
  }, [risks]);

  if (!hasData) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No trend data yet — scores will appear after monthly updates
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 9 }} domain={[0, 25]} />
        <Tooltip
          contentStyle={{ fontSize: 11, padding: "4px 8px" }}
          wrapperStyle={{ zIndex: 50 }}
        />
        <Legend wrapperStyle={{ fontSize: 9 }} />
        {categories.map((cat, i) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={CATEGORY_COLOURS[i % CATEGORY_COLOURS.length]}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive
          />
        ))}
        <Line
          type="monotone"
          dataKey="Overall"
          stroke={BRAND_PURPLE}
          strokeWidth={2.5}
          dot={false}
          isAnimationActive
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
