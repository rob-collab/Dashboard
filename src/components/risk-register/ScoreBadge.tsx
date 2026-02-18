"use client";

import { getRiskScore, getRiskLevel } from "@/lib/risk-categories";

interface ScoreBadgeProps {
  likelihood: number;
  impact: number;
  size?: "sm" | "md" | "lg";
}

export default function ScoreBadge({ likelihood, impact, size = "md" }: ScoreBadgeProps) {
  const score = getRiskScore(likelihood, impact);
  const level = getRiskLevel(score);

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-md ${sizeClasses[size]}`}
      style={{ backgroundColor: level.colour, color: "#fff" }}
    >
      <span>{score}</span>
      <span className="font-normal text-[0.85em] opacity-90">{level.level}</span>
    </span>
  );
}
