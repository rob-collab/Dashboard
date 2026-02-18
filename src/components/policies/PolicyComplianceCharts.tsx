"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Policy } from "@/lib/types";

interface Props {
  policies: Policy[];
}

const COVERAGE_COLOURS = {
  mapped: "#22c55e",
  unmapped: "#f59e0b",
};

const HEALTH_COLOURS = {
  Pass: "#22c55e",
  Fail: "#ef4444",
  Partial: "#f59e0b",
  "Not Tested": "#d1d5db",
};

export default function PolicyComplianceCharts({ policies }: Props) {
  // Obligations coverage — across all policies
  const coverageData = useMemo(() => {
    let mapped = 0;
    let unmapped = 0;
    for (const p of policies) {
      for (const obl of p.obligations ?? []) {
        if (obl.controlRefs.length > 0) mapped++;
        else unmapped++;
      }
    }
    return [
      { name: "With Controls", value: mapped, colour: COVERAGE_COLOURS.mapped },
      { name: "Without Controls", value: unmapped, colour: COVERAGE_COLOURS.unmapped },
    ];
  }, [policies]);

  // Control test health — across all policies
  const healthData = useMemo(() => {
    let pass = 0, fail = 0, partial = 0, notTested = 0;
    const seen = new Set<string>();
    for (const p of policies) {
      for (const link of p.controlLinks ?? []) {
        const ctrl = link.control;
        if (!ctrl || seen.has(ctrl.id)) continue;
        seen.add(ctrl.id);
        const results = ctrl.testingSchedule?.testResults ?? [];
        if (results.length === 0) { notTested++; continue; }
        const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
        const latest = sorted[0].result;
        if (latest === "PASS") pass++;
        else if (latest === "FAIL") fail++;
        else if (latest === "PARTIALLY") partial++;
        else notTested++;
      }
    }
    return [
      { name: "Pass", value: pass, colour: HEALTH_COLOURS.Pass },
      { name: "Fail", value: fail, colour: HEALTH_COLOURS.Fail },
      { name: "Partial", value: partial, colour: HEALTH_COLOURS.Partial },
      { name: "Not Tested", value: notTested, colour: HEALTH_COLOURS["Not Tested"] },
    ];
  }, [policies]);

  const totalObligations = coverageData.reduce((s, d) => s + d.value, 0);
  const totalControls = healthData.reduce((s, d) => s + d.value, 0);

  if (totalObligations === 0 && totalControls === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Obligations Coverage Donut */}
      {totalObligations > 0 && (
        <div className="bento-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Obligations Coverage</h3>
          <p className="text-xs text-gray-400 mb-3">{totalObligations} obligations across all policies</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={coverageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {coverageData.map((d, i) => (
                    <Cell key={i} fill={d.colour} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}`]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {coverageData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.colour }} />
                  <span className="text-xs text-gray-600">{d.name}</span>
                  <span className="text-xs font-bold text-gray-800">{d.value}</span>
                  <span className="text-[10px] text-gray-400">({totalObligations > 0 ? Math.round((d.value / totalObligations) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Control Test Health Bar */}
      {totalControls > 0 && (
        <div className="bento-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Control Test Health</h3>
          <p className="text-xs text-gray-400 mb-3">{totalControls} controls linked to policies</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={[{
                name: "Controls",
                Pass: healthData[0].value,
                Fail: healthData[1].value,
                Partial: healthData[2].value,
                "Not Tested": healthData[3].value,
              }]}
              layout="vertical"
              barSize={28}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="Pass" stackId="a" fill={HEALTH_COLOURS.Pass} radius={[4, 0, 0, 4]} />
              <Bar dataKey="Fail" stackId="a" fill={HEALTH_COLOURS.Fail} />
              <Bar dataKey="Partial" stackId="a" fill={HEALTH_COLOURS.Partial} />
              <Bar dataKey="Not Tested" stackId="a" fill={HEALTH_COLOURS["Not Tested"]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
