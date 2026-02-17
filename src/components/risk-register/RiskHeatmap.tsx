"use client";

import { useState, useMemo } from "react";
import type { Risk } from "@/lib/types";
import {
  getCellRiskLevel,
  getRiskScore,
  getRiskLevel,
  LIKELIHOOD_SCALE,
  IMPACT_SCALE,
  L1_CATEGORY_COLOURS,
} from "@/lib/risk-categories";

type ViewMode = "inherent" | "residual" | "overlay";

interface RiskHeatmapProps {
  risks: Risk[];
  allRisks?: Risk[];
  onRiskClick?: (risk: Risk) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  activeCategoryL1: string | null;
  onCategoryClick: (category: string) => void;
}

export default function RiskHeatmap({
  risks,
  onRiskClick,
  viewMode,
  onViewModeChange,
  activeCategoryL1,
  onCategoryClick,
}: RiskHeatmapProps) {
  const [hoveredRisk, setHoveredRisk] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ l: number; i: number } | null>(null);

  // Build a map of risks by cell position
  const risksByCell = useMemo(() => {
    const map = new Map<string, { risk: Risk; type: "inherent" | "residual" }[]>();
    for (const risk of risks) {
      if (viewMode === "inherent" || viewMode === "overlay") {
        const key = `${risk.inherentLikelihood}-${risk.inherentImpact}`;
        const arr = map.get(key) ?? [];
        arr.push({ risk, type: "inherent" });
        map.set(key, arr);
      }
      if (viewMode === "residual" || viewMode === "overlay") {
        const key = `${risk.residualLikelihood}-${risk.residualImpact}`;
        const arr = map.get(key) ?? [];
        arr.push({ risk, type: "residual" });
        map.set(key, arr);
      }
    }
    return map;
  }, [risks, viewMode]);

  // Risks in selected cell
  const selectedCellRisks = selectedCell
    ? risksByCell.get(`${selectedCell.l}-${selectedCell.i}`) ?? []
    : [];

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">View:</span>
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          {(["inherent", "residual", "overlay"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === mode
                  ? "bg-white text-updraft-deep shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {mode === "overlay" ? "Overlay" : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-6">
        <div className="flex-1">
          <div className="relative">
            {/* Y-axis label */}
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-poppins font-semibold text-gray-500 whitespace-nowrap">
              LIKELIHOOD
            </div>

            <div className="ml-16">
              {/* Grid rows — likelihood 5 at top, 1 at bottom */}
              {[5, 4, 3, 2, 1].map((likelihood) => (
                <div key={likelihood} className="flex items-stretch">
                  {/* Y-axis tick */}
                  <div className="w-16 -ml-16 flex items-center justify-end pr-2">
                    <div className="text-right">
                      <div className="text-sm font-poppins font-bold text-gray-700">{likelihood}</div>
                      <div className="text-[10px] font-poppins text-gray-400 leading-tight">
                        {LIKELIHOOD_SCALE[likelihood - 1].label}
                      </div>
                    </div>
                  </div>

                  {/* Grid cells */}
                  {[1, 2, 3, 4, 5].map((impact) => {
                    const cellLevel = getCellRiskLevel(likelihood, impact);
                    const score = getRiskScore(likelihood, impact);
                    const cellKey = `${likelihood}-${impact}`;
                    const cellRisks = risksByCell.get(cellKey) ?? [];
                    const isSelected = selectedCell?.l === likelihood && selectedCell?.i === impact;

                    return (
                      <button
                        key={impact}
                        onClick={() => setSelectedCell(isSelected ? null : { l: likelihood, i: impact })}
                        className={`relative flex-1 aspect-square min-h-[35px] border border-white/50 flex flex-col items-center justify-center transition-all ${
                          isSelected ? "ring-2 ring-updraft-deep ring-offset-1" : ""
                        }`}
                        style={{ backgroundColor: cellLevel.colour + "30" }}
                      >
                        {/* Score number */}
                        <span className="text-xs font-bold" style={{ color: cellLevel.colour }}>
                          {score}
                        </span>

                        {/* Risk markers */}
                        {cellRisks.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center mt-0.5 max-w-[95%]">
                            {cellRisks.map(({ risk, type }) => {
                              const catColour = L1_CATEGORY_COLOURS[risk.categoryL1];
                              const isHovered = hoveredRisk === risk.id;
                              const isInherentInOverlay = type === "inherent" && viewMode === "overlay";
                              return (
                                <div
                                  key={`${risk.id}-${type}`}
                                  onMouseEnter={() => setHoveredRisk(risk.id)}
                                  onMouseLeave={() => setHoveredRisk(null)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRiskClick?.(risk);
                                  }}
                                  className={`relative w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                                    isHovered ? "scale-125 z-10" : ""
                                  }`}
                                  style={{
                                    backgroundColor: isInherentInOverlay ? "transparent" : (catColour?.fill ?? "#888"),
                                    borderColor: catColour?.stroke ?? "#666",
                                    borderWidth: isInherentInOverlay ? 2 : 2,
                                  }}
                                  title={`${risk.reference}: ${risk.name} (${type})`}
                                >
                                  <span className={`absolute inset-0 flex items-center justify-center text-[7px] font-bold ${
                                    isInherentInOverlay ? "text-gray-600" : "text-white"
                                  }`}>
                                    {risk.reference.replace("R00", "").replace("R0", "")}
                                  </span>

                                  {/* Tooltip */}
                                  {isHovered && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none">
                                      <div className="font-bold">{risk.reference}: {risk.name}</div>
                                      <div className="text-gray-300 mt-0.5">{risk.categoryL1}</div>
                                      <div className="flex justify-between mt-1">
                                        <span>Inherent: {getRiskScore(risk.inherentLikelihood, risk.inherentImpact)}</span>
                                        <span>Residual: {getRiskScore(risk.residualLikelihood, risk.residualImpact)}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}


              {/* X-axis labels */}
              <div className="flex ml-0">
                {[1, 2, 3, 4, 5].map((impact) => (
                  <div key={impact} className="flex-1 text-center pt-1">
                    <div className="text-sm font-poppins font-bold text-gray-700">{impact}</div>
                    <div className="text-[10px] font-poppins text-gray-400">{IMPACT_SCALE[impact - 1].label}</div>
                  </div>
                ))}
              </div>

              {/* X-axis title */}
              <div className="text-center mt-1">
                <span className="text-xs font-poppins font-semibold text-gray-500">IMPACT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend & Details Panel */}
        <div className="w-56 space-y-4">
          {/* Risk Level Legend */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-poppins font-semibold text-gray-500 uppercase tracking-wide">Risk Level</h4>
            {[
              { label: "Very High (20–25)", colour: "#dc2626" },
              { label: "High (10–16)", colour: "#ea580c" },
              { label: "Medium (5–9)", colour: "#eab308" },
              { label: "Low (1–4)", colour: "#22c55e" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.colour + "40", border: `2px solid ${item.colour}` }} />
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Category Legend — clickable */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-poppins font-semibold text-gray-500 uppercase tracking-wide">Category</h4>
            {Object.entries(L1_CATEGORY_COLOURS).map(([name, { fill, label }]) => {
              const isActive = activeCategoryL1 === name;
              const isDimmed = activeCategoryL1 !== null && !isActive;
              return (
                <button
                  key={name}
                  onClick={() => onCategoryClick(name)}
                  className={`flex items-center gap-2 w-full text-left rounded-md px-1 py-0.5 transition-all ${
                    isActive ? "ring-2 ring-updraft-bright-purple/30 bg-updraft-pale-purple/10" : ""
                  } ${isDimmed ? "opacity-40" : ""} hover:bg-gray-50`}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: fill }} />
                  <span className="text-xs text-gray-600">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Overlay legend */}
          {viewMode === "overlay" && (
            <div className="space-y-1">
              <h4 className="text-xs font-poppins font-semibold text-gray-500 uppercase tracking-wide">Overlay</h4>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-gray-500 bg-transparent" />
                <span className="text-xs text-gray-600">Inherent position</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-600" />
                <span className="text-xs text-gray-600">Residual position</span>
              </div>
            </div>
          )}

          {/* Selected cell detail */}
          {selectedCell && selectedCellRisks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Cell ({selectedCell.l}, {selectedCell.i}) — Score {selectedCell.l * selectedCell.i}
              </h4>
              {selectedCellRisks.map(({ risk, type }) => {
                const score = type === "inherent"
                  ? getRiskScore(risk.inherentLikelihood, risk.inherentImpact)
                  : getRiskScore(risk.residualLikelihood, risk.residualImpact);
                const level = getRiskLevel(score);
                return (
                  <button
                    key={`${risk.id}-${type}`}
                    onClick={() => onRiskClick?.(risk)}
                    className="w-full text-left p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold rounded ${level.bgClass} ${level.textClass}`}>
                        {score}
                      </span>
                      <span className="text-xs font-medium text-gray-800 truncate">{risk.reference}</span>
                      <span className="text-[8px] text-gray-400 capitalize">({type})</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5 truncate">{risk.name}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
