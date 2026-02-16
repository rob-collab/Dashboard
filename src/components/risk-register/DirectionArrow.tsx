"use client";

import { DIRECTION_DISPLAY } from "@/lib/risk-categories";
import type { DirectionOfTravel } from "@/lib/types";

interface DirectionArrowProps {
  direction: DirectionOfTravel;
  showLabel?: boolean;
}

export default function DirectionArrow({ direction, showLabel = false }: DirectionArrowProps) {
  const d = DIRECTION_DISPLAY[direction];
  return (
    <span className={`inline-flex items-center gap-1 ${d.colour}`} title={d.label}>
      <span className="text-lg leading-none">{d.icon}</span>
      {showLabel && <span className="text-xs font-medium">{d.label}</span>}
    </span>
  );
}
