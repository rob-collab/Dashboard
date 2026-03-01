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
import { cn } from "@/lib/utils";
import { ScrollChart } from "@/components/common/ScrollChart";

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

/* ── Per-policy coverage status for the heatmap ───────────────────── */
type CoverageGrade = "green" | "amber" | "red" | "grey";

interface PolicyCoverageItem {
  reference: string;
  name: string;
  obligations: number;
  withControls: number;
  passingControls: number;
  totalControls: number;
  grade: CoverageGrade;
}

const GRADE_COLOURS: Record<CoverageGrade, { bg: string; text: string; label: string }> = {
  green: { bg: "bg-green-500", text: "text-green-700", label: "Fully Covered" },
  amber: { bg: "bg-amber-500", text: "text-amber-700", label: "Partially Covered" },
  red: { bg: "bg-red-500", text: "text-red-700", label: "Gaps Found" },
  grey: { bg: "bg-gray-400", text: "text-gray-500", label: "No Data" },
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

  // Per-policy coverage heatmap data
  const heatmapData = useMemo(() => {
    return policies
      .filter((p) => p.status !== "ARCHIVED")
      .map((p): PolicyCoverageItem => {
        const obls = p.obligations ?? [];
        const links = p.controlLinks ?? [];
        const withControls = obls.filter((o) => o.controlRefs.length > 0 || (o.sections ?? []).some((s) => s.controlRefs.length > 0)).length;

        let passing = 0;
        for (const link of links) {
          const ctrl = link.control;
          if (!ctrl) continue;
          const results = ctrl.testingSchedule?.testResults ?? [];
          if (results.length === 0) continue;
          const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
          if (sorted[0].result === "PASS") passing++;
        }

        let grade: CoverageGrade;
        if (obls.length === 0 && links.length === 0) {
          grade = "grey";
        } else if (withControls === obls.length && (links.length === 0 || passing === links.length)) {
          grade = "green";
        } else if (withControls < obls.length || (links.length > 0 && passing < links.length * 0.5)) {
          grade = "red";
        } else {
          grade = "amber";
        }

        return {
          reference: p.reference,
          name: p.name,
          obligations: obls.length,
          withControls,
          passingControls: passing,
          totalControls: links.length,
          grade,
        };
      })
      .sort((a, b) => {
        const order: Record<CoverageGrade, number> = { red: 0, amber: 1, green: 2, grey: 3 };
        return order[a.grade] - order[b.grade];
      });
  }, [policies]);

  const totalObligations = coverageData.reduce((s, d) => s + d.value, 0);
  const totalControls = healthData.reduce((s, d) => s + d.value, 0);

  if (totalObligations === 0 && totalControls === 0 && heatmapData.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Obligations Coverage Donut */}
        {totalObligations > 0 && (
          <div className="bento-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Requirements Coverage</h3>
            <p className="text-xs text-gray-400 mb-3">{totalObligations} requirements across all policies</p>
            <div className="flex items-center gap-4">
              <ScrollChart className="w-[140px] h-[140px] shrink-0">
                {(scrollKey) => (
                <ResponsiveContainer key={scrollKey} width="100%" height="100%">
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
                )}
              </ScrollChart>
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
            <ScrollChart className="h-[120px]">
              {(scrollKey) => (
              <ResponsiveContainer key={scrollKey} width="100%" height="100%">
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
              )}
            </ScrollChart>
          </div>
        )}
      </div>

      {/* Policy Coverage Heatmap */}
      {heatmapData.length > 0 && (
        <div className="bento-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Policy Coverage Matrix</h3>
              <p className="text-xs text-gray-400 mt-0.5">Per-policy view of requirement coverage and control test health</p>
            </div>
            <div className="flex items-center gap-3">
              {(["green", "amber", "red", "grey"] as const).map((g) => {
                const count = heatmapData.filter((d) => d.grade === g).length;
                if (count === 0) return null;
                return (
                  <div key={g} className="flex items-center gap-1">
                    <span className={cn("w-2.5 h-2.5 rounded-sm", GRADE_COLOURS[g].bg)} />
                    <span className="text-[10px] text-gray-500">{GRADE_COLOURS[g].label} ({count})</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {heatmapData.map((item) => (
              <div
                key={item.reference}
                className={cn(
                  "rounded-lg border p-2.5 transition-colors",
                  item.grade === "green" ? "border-green-200 bg-green-50/50" :
                  item.grade === "amber" ? "border-amber-200 bg-amber-50/50" :
                  item.grade === "red" ? "border-red-200 bg-red-50/50" :
                  "border-gray-200 bg-gray-50/50"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={cn("w-2 h-2 rounded-sm shrink-0", GRADE_COLOURS[item.grade].bg)} />
                  <span className="text-[10px] font-mono font-bold text-updraft-deep truncate">{item.reference}</span>
                </div>
                <p className="text-[10px] text-gray-700 truncate mb-1.5" title={item.name}>{item.name}</p>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-400">Requirements</span>
                    <span className={cn("text-[9px] font-semibold", item.obligations > 0 ? (item.withControls === item.obligations ? "text-green-600" : "text-amber-600") : "text-gray-400")}>
                      {item.withControls}/{item.obligations}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-400">Controls</span>
                    <span className={cn("text-[9px] font-semibold", item.totalControls > 0 ? (item.passingControls === item.totalControls ? "text-green-600" : "text-amber-600") : "text-gray-400")}>
                      {item.passingControls}/{item.totalControls} pass
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
