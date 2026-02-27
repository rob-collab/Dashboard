"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { ArrowRight } from "lucide-react";
import type { ConsumerDutyOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  outcomes: ConsumerDutyOutcome[];
}

export default function CDRadialRing({ outcomes }: Props) {
  const radarData = useMemo(() => {
    return outcomes.map((outcome) => {
      const measures = outcome.measures ?? [];
      const good = measures.filter((m) => m.ragStatus === "GOOD").length;
      const value = measures.length > 0 ? Math.round((good / measures.length) * 100) : 0;
      const name =
        outcome.name.length > 20 ? outcome.name.slice(0, 20) + "…" : outcome.name;
      return { name, value };
    });
  }, [outcomes]);

  if (outcomes.length === 0) {
    return (
      <div className="bento-card">
        <p className="text-sm text-gray-400 text-center py-8">No outcomes configured yet</p>
      </div>
    );
  }

  return (
    <div className="bento-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-poppins font-semibold text-gray-900">Consumer Duty</h2>
        <Link
          href="/consumer-duty"
          className="text-xs text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1 transition-colors"
        >
          Full dashboard <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Radar chart — % GREEN measures per outcome */}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
          <Radar
            name="Green measures %"
            dataKey="value"
            fill="rgba(123, 31, 162, 0.15)"
            stroke="#7B1FA2"
            strokeWidth={2}
            isAnimationActive
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Compact outcome grid — preserved from original ConsumerDutySummaryWidget */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {outcomes.map((outcome) => {
          const isGood = outcome.ragStatus === "GOOD";
          const isWarn = outcome.ragStatus === "WARNING";
          return (
            <Link
              key={outcome.id}
              href={`/consumer-duty?outcome=${outcome.id}`}
              className={cn(
                "rounded-lg pl-3 pr-2 py-2 hover:shadow-md transition-shadow",
                isGood
                  ? "border-l-[3px] border-green-500 bg-green-50 hover:bg-green-100/60"
                  : isWarn
                  ? "border-l-[3px] border-amber-400 bg-amber-50 hover:bg-amber-100/60"
                  : "border-l-[3px] border-red-500 bg-red-50 hover:bg-red-100/60",
              )}
            >
              <p className="text-xs font-medium text-gray-900 leading-tight truncate">
                {outcome.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    isGood ? "text-green-700" : isWarn ? "text-amber-700" : "text-red-700",
                  )}
                >
                  {isGood ? "Green" : isWarn ? "Amber" : "Red"}
                </span>
                {(outcome.measures ?? []).length > 0 && (
                  <span className="text-[10px] text-gray-400 font-normal">
                    · {(outcome.measures ?? []).length} measures
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
