"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Risk } from "@/lib/types";

interface Props {
  risks: Risk[];
  onNavigate: (id: string) => void;
}

const CELL_SIZE = 40;
const GRID_OFFSET_X = 36;
const GRID_OFFSET_Y = 8;
const GRID_W = 200; // 5 * CELL_SIZE
const GRID_H = 200; // 5 * CELL_SIZE
const SVG_W = 260;
const SVG_H = 252;

/** Compute cell fill based on L×I zone */
function zoneColour(l: number, i: number): string {
  const score = l * i;
  if (score <= 4) return "#f0fdf4";   // green-50
  if (score <= 12) return "#fffbeb";  // amber-50
  return "#fef2f2";                   // red-50
}

/** SVG cx for a given likelihood value (1-5) */
function dotCx(likelihood: number): number {
  return GRID_OFFSET_X + (likelihood - 1) * CELL_SIZE + CELL_SIZE / 2;
}

/** SVG cy for a given impact value (1-5). Impact 1 = bottom row. */
function dotCy(impact: number): number {
  return GRID_OFFSET_Y + GRID_H - impact * CELL_SIZE + CELL_SIZE / 2;
}

/** Colour of a residual risk dot based on direction of travel */
function dotColour(dir: Risk["directionOfTravel"]): string {
  if (dir === "IMPROVING") return "#16a34a";      // green-600
  if (dir === "DETERIORATING") return "#dc2626";  // red-600
  return "#d97706";                               // amber-600 (STABLE)
}

export default function RiskMatrix({ risks, onNavigate }: Props) {
  const prefersReduced = useReducedMotion();

  // Centre of the 5×5 grid — animation start point
  const centreCx = dotCx(3);
  const centreCy = dotCy(3);

  // Build grid cells
  const cells: React.ReactNode[] = [];
  for (let l = 1; l <= 5; l++) {
    for (let i = 1; i <= 5; i++) {
      cells.push(
        <rect
          key={`cell-${l}-${i}`}
          x={GRID_OFFSET_X + (l - 1) * CELL_SIZE}
          y={GRID_OFFSET_Y + GRID_H - i * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill={zoneColour(l, i)}
          stroke="#d1d5db"
          strokeWidth={0.5}
        />,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-auto"
      style={{ maxHeight: 240 }}
      role="img"
      aria-label="Risk landscape matrix"
    >
      {/* Zone cells */}
      {cells}

      {/* Grid border */}
      <rect
        x={GRID_OFFSET_X}
        y={GRID_OFFSET_Y}
        width={GRID_W}
        height={GRID_H}
        fill="none"
        stroke="#9ca3af"
        strokeWidth={1}
      />

      {/* Likelihood labels (x-axis, bottom) */}
      {[1, 2, 3, 4, 5].map((l) => (
        <text
          key={`lbl-l-${l}`}
          x={dotCx(l)}
          y={GRID_OFFSET_Y + GRID_H + 16}
          textAnchor="middle"
          fontSize={10}
          fill="#9ca3af"
        >
          {l}
        </text>
      ))}
      <text
        x={GRID_OFFSET_X + GRID_W / 2}
        y={GRID_OFFSET_Y + GRID_H + 30}
        textAnchor="middle"
        fontSize={9}
        fill="#6b7280"
        fontStyle="italic"
      >
        Likelihood →
      </text>

      {/* Impact labels (y-axis, left) */}
      {[1, 2, 3, 4, 5].map((i) => (
        <text
          key={`lbl-i-${i}`}
          x={GRID_OFFSET_X - 8}
          y={dotCy(i) + 4}
          textAnchor="end"
          fontSize={10}
          fill="#9ca3af"
        >
          {i}
        </text>
      ))}
      <text
        x={12}
        y={GRID_OFFSET_Y + GRID_H / 2}
        textAnchor="middle"
        fontSize={9}
        fill="#6b7280"
        fontStyle="italic"
        transform={`rotate(-90, 12, ${GRID_OFFSET_Y + GRID_H / 2})`}
      >
        Impact ↑
      </text>

      {/* Risk dots */}
      {risks.map((risk) => {
        const rx = dotCx(risk.residualLikelihood);
        const ry = dotCy(risk.residualImpact);
        const gx = dotCx(risk.inherentLikelihood);
        const gy = dotCy(risk.inherentImpact);
        const colour = dotColour(risk.directionOfTravel);
        // Offset from centre to actual position (for spring animation)
        const offsetX = prefersReduced ? 0 : centreCx - rx;
        const offsetY = prefersReduced ? 0 : centreCy - ry;

        return (
          <g key={risk.id}>
            {/* Ghost circle: inherent position */}
            <circle
              cx={gx}
              cy={gy}
              r={13}
              fill={colour}
              fillOpacity={0.12}
              stroke={colour}
              strokeOpacity={0.25}
              strokeWidth={1}
            />

            {/* Animated residual dot */}
            <motion.circle
              cx={rx}
              cy={ry}
              r={8}
              fill={colour}
              fillOpacity={0.85}
              initial={{ x: offsetX, y: offsetY }}
              animate={{ x: 0, y: 0 }}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 80, damping: 12, mass: 0.8 }
              }
            />

            {/* inFocus star overlay */}
            {risk.inFocus && (
              <motion.text
                x={rx + 7}
                y={ry - 7}
                fontSize={9}
                fill="#7B1FA2"
                textAnchor="middle"
                initial={{ opacity: prefersReduced ? 1 : 0 }}
                animate={{ opacity: 1 }}
                transition={prefersReduced ? { duration: 0 } : { delay: 0.5 }}
              >
                ★
              </motion.text>
            )}

            {/* Transparent hover/click target with SVG tooltip */}
            <circle
              cx={rx}
              cy={ry}
              r={12}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate(risk.id)}
            >
              <title>
                {risk.reference}: {risk.name}
              </title>
            </circle>
          </g>
        );
      })}

      {/* Legend */}
      {[
        { colour: "#16a34a", label: "Improving" },
        { colour: "#d97706", label: "Stable" },
        { colour: "#dc2626", label: "Deteriorating" },
      ].map(({ colour, label }, i) => (
        <g key={label} transform={`translate(${GRID_OFFSET_X + i * 72}, ${GRID_OFFSET_Y + GRID_H + 46})`}>
          <circle r={4} fill={colour} fillOpacity={0.85} />
          <text x={8} y={4} fontSize={9} fill="#6b7280">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}
