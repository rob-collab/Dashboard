"use client";

import { useState, useEffect, useCallback, type RefObject } from "react";
import type { Risk } from "@/lib/types";
import { L1_CATEGORY_COLOURS } from "@/lib/risk-categories";

interface RiskHeatmapOverlayProps {
  risks: Risk[];
  gridRef: RefObject<HTMLDivElement | null>;
}

interface GridDimensions {
  width: number;
  height: number;
  cellW: number;
  cellH: number;
  offsetTop: number;
}

export default function RiskHeatmapOverlay({ risks, gridRef }: RiskHeatmapOverlayProps) {
  const [dims, setDims] = useState<GridDimensions | null>(null);

  const measure = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;

    // The grid has 5 rows of cells. Find the first cell button to measure.
    const cells = el.querySelectorAll("button");
    if (cells.length < 25) return;

    const gridRect = el.getBoundingClientRect();
    const firstCell = cells[0].getBoundingClientRect();
    const lastCell = cells[24].getBoundingClientRect();

    const gridW = lastCell.right - firstCell.left;
    const gridH = lastCell.bottom - firstCell.top;
    const cellW = gridW / 5;
    const cellH = gridH / 5;
    const offsetTop = firstCell.top - gridRect.top;

    setDims({ width: gridW, height: gridH, cellW, cellH, offsetTop });
  }, [gridRef]);

  useEffect(() => {
    measure();

    const el = gridRef.current;
    if (!el) return;

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [gridRef, measure]);

  if (!dims) return null;

  // Filter to risks where inherent != residual position
  const arrowRisks = risks.filter(
    (r) =>
      r.inherentLikelihood !== r.residualLikelihood ||
      r.inherentImpact !== r.residualImpact
  );

  // Calculate cell centre coordinates
  // Grid: impact on x-axis (1-5, left to right), likelihood on y-axis (5 at top, 1 at bottom)
  function cellCentre(likelihood: number, impact: number) {
    const x = (impact - 0.5) * dims!.cellW;
    const y = (5 - likelihood + 0.5) * dims!.cellH;
    return { x, y };
  }

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: dims.offsetTop,
        width: dims.width,
        height: dims.height,
      }}
      viewBox={`0 0 ${dims.width} ${dims.height}`}
    >
      <defs>
        {arrowRisks.map((risk) => {
          const catColour = L1_CATEGORY_COLOURS[risk.categoryL1];
          const colour = catColour?.fill ?? "#888";
          return (
            <marker
              key={`marker-${risk.id}`}
              id={`arrowhead-${risk.id}`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill={colour} />
            </marker>
          );
        })}
      </defs>

      {arrowRisks.map((risk, idx) => {
        const catColour = L1_CATEGORY_COLOURS[risk.categoryL1];
        const colour = catColour?.fill ?? "#888";
        const from = cellCentre(risk.inherentLikelihood, risk.inherentImpact);
        const to = cellCentre(risk.residualLikelihood, risk.residualImpact);

        // Quadratic Bezier control point — offset perpendicular to the line
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        // Curve offset perpendicular to the line direction
        const offset = Math.min(len * 0.3, 30);
        const cpX = midX + (-dy / len) * offset;
        const cpY = midY + (dx / len) * offset;

        const pathD = `M${from.x},${from.y} Q${cpX},${cpY} ${to.x},${to.y}`;

        // Approximate path length for animation
        const pathLen = len * 1.2;

        // Label position at midpoint of curve
        const labelX = (from.x + 2 * cpX + to.x) / 4;
        const labelY = (from.y + 2 * cpY + to.y) / 4;

        return (
          <g key={risk.id}>
            <path
              d={pathD}
              fill="none"
              stroke={colour}
              strokeWidth={2}
              strokeLinecap="round"
              markerEnd={`url(#arrowhead-${risk.id})`}
              opacity={0.8}
              style={{
                strokeDasharray: pathLen,
                strokeDashoffset: pathLen,
                animation: `draw-arrow 0.6s ease-out ${idx * 0.15}s forwards`,
              }}
            />
            <text
              x={labelX}
              y={labelY - 6}
              textAnchor="middle"
              fill={colour}
              fontSize="9"
              fontWeight="bold"
              opacity={0}
              style={{
                animation: `fade-in-svg 0.3s ease-out ${idx * 0.15 + 0.4}s forwards`,
              }}
            >
              {risk.reference}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
