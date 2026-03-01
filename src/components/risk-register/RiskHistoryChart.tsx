"use client";

import { useState, useEffect } from "react";
import type { Risk, RiskSnapshot } from "@/lib/types";
import { getRiskScore, getRiskLevel } from "@/lib/risk-categories";
import { api } from "@/lib/api-client";
import Modal from "@/components/common/Modal";
import ScoreBadge from "./ScoreBadge";
import DirectionArrow from "./DirectionArrow";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";

interface RiskHistoryChartProps {
  risk: Risk;
  onClose: () => void;
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export default function RiskHistoryChart({ risk, onClose }: RiskHistoryChartProps) {
  const [snapshots, setSnapshots] = useState<RiskSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<RiskSnapshot[]>(`/api/risks/${risk.id}/snapshots`)
      .then(setSnapshots)
      .catch((e) => console.error("[RiskHistoryChart]", e))
      .finally(() => setLoading(false));
  }, [risk.id]);

  const chartData = snapshots.map((s) => ({
    month: formatMonth(s.month),
    residual: getRiskScore(s.residualLikelihood, s.residualImpact),
    inherent: getRiskScore(s.inherentLikelihood, s.inherentImpact),
    direction: s.directionOfTravel,
  }));

  return (
    <Modal open={true} onClose={onClose} title={`${risk.reference} — Risk History`} size="xl">
      {/* Current score summary */}
      <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-700">{risk.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">{risk.categoryL1} / {risk.categoryL2}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-400 uppercase">Inherent</div>
            <ScoreBadge likelihood={risk.inherentLikelihood} impact={risk.inherentImpact} size="md" />
          </div>
          <div className="text-gray-300">→</div>
          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-400 uppercase">Residual</div>
            <ScoreBadge likelihood={risk.residualLikelihood} impact={risk.residualImpact} size="md" />
          </div>
          <div className="ml-2">
            <DirectionArrow direction={risk.directionOfTravel} showLabel />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-sm text-gray-400">
          Loading history...
        </div>
      ) : snapshots.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-gray-400">
          No historical snapshots found for this risk.
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis domain={[0, 25]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-xs">
                        <div className="font-semibold text-gray-700 mb-1">{label}</div>
                        {payload.map((entry) => {
                          const val = entry.value as number;
                          const level = getRiskLevel(val);
                          const name = entry.dataKey === "residual" ? "Residual" : "Inherent";
                          return (
                            <div key={entry.dataKey} className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-gray-600">{name}:</span>
                              <span className="font-bold">{val}</span>
                              <span className="text-gray-400">({level.level})</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={30}
                  formatter={(value: string) => (
                    <span className="text-xs text-gray-600">
                      {value === "residual" ? "Residual Score" : "Inherent Score"}
                    </span>
                  )}
                />

                {/* Reference lines at risk level boundaries */}
                <ReferenceLine y={5} stroke="#eab308" strokeDasharray="4 4" label={{ value: "Medium", position: "right", fontSize: 10, fill: "#eab308" }} />
                <ReferenceLine y={10} stroke="#ea580c" strokeDasharray="4 4" label={{ value: "High", position: "right", fontSize: 10, fill: "#ea580c" }} />
                <ReferenceLine y={20} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "Very High", position: "right", fontSize: 10, fill: "#dc2626" }} />

                {/* Inherent line — dashed orange */}
                <Line
                  type="monotone"
                  dataKey="inherent"
                  stroke="#F57C00"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ fill: "#F57C00", r: 3 }}
                  activeDot={{ r: 5 }}
                />

                {/* Residual line — solid purple */}
                <Line
                  type="monotone"
                  dataKey="residual"
                  stroke="#7B1FA2"
                  strokeWidth={2.5}
                  dot={{ fill: "#7B1FA2", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly data table */}
          <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Month</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-500">Inherent Score</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-500">Residual Score</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-500">Level</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-500">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snapshots.map((s) => {
                  const rScore = getRiskScore(s.residualLikelihood, s.residualImpact);
                  const iScore = getRiskScore(s.inherentLikelihood, s.inherentImpact);
                  const level = getRiskLevel(rScore);
                  return (
                    <tr key={s.id}>
                      <td className="px-3 py-2 text-gray-700 font-medium">{formatMonth(s.month)}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{iScore}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded" style={{ backgroundColor: level.colour, color: "white" }}>
                          {rScore}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{level.level}</td>
                      <td className="px-3 py-2 text-center">
                        <DirectionArrow direction={s.directionOfTravel} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
