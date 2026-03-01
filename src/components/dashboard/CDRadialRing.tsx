"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ConsumerDutyOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  outcomes: ConsumerDutyOutcome[];
}

const TICK_MS  = 2800;
const FADE_MS  = 260;

export default function CDRadialRing({ outcomes }: Props) {
  const stats = useMemo(() => {
    const totalMeasures = outcomes.reduce((s, o) => s + (o.measures?.length ?? 0), 0);
    const green = outcomes.filter((o) => o.ragStatus === "GOOD").length;
    const amber = outcomes.filter((o) => o.ragStatus === "WARNING").length;
    const red   = outcomes.filter((o) => o.ragStatus === "HARM").length;
    return { totalMeasures, green, amber, red };
  }, [outcomes]);

  const ticks = useMemo(() => [
    {
      label: "Outcomes",
      value: outcomes.length,
      colour: "text-updraft-bright-purple",
      bg:    "bg-updraft-pale-purple/50",
      href:  "/consumer-duty",
    },
    {
      label: "Measures",
      value: stats.totalMeasures,
      colour: "text-updraft-deep",
      bg:    "bg-gray-50",
      href:  "/consumer-duty",
    },
    {
      label: "Green",
      value: stats.green,
      colour: "text-green-700",
      bg:    "bg-green-50",
      href:  "/consumer-duty",
    },
    {
      label: "Amber",
      value: stats.amber,
      colour: "text-amber-700",
      bg:    "bg-amber-50",
      href:  "/consumer-duty",
    },
    {
      label: "Red",
      value: stats.red,
      colour: "text-red-700",
      bg:    "bg-red-50",
      href:  "/consumer-duty",
    },
  ], [outcomes.length, stats]);

  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused,  setPaused]  = useState(false);
  const innerTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (paused || ticks.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      innerTimerRef.current = setTimeout(() => {
        setIdx((i) => (i + 1) % ticks.length);
        setVisible(true);
      }, FADE_MS);
    }, TICK_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(innerTimerRef.current);
    };
  }, [paused, ticks.length]);

  if (outcomes.length === 0) {
    return (
      <div className="bento-card">
        <p className="text-sm text-gray-400 text-center py-8">No outcomes configured yet</p>
      </div>
    );
  }

  const current = ticks[idx];

  return (
    <div className="bento-card flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-poppins font-semibold text-gray-900">Consumer Duty</h2>
        <Link
          href="/consumer-duty"
          className="text-xs text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1 transition-colors"
        >
          Full dashboard <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Rolling ticker */}
      <Link
        href={current.href}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className={cn(
          "rounded-xl px-4 py-3 flex items-center justify-between transition-colors duration-300",
          current.bg,
        )}
      >
        {/* Animated stat value */}
        <span
          className={cn(
            "text-4xl font-bold font-poppins transition-opacity duration-[260ms]",
            current.colour,
            visible ? "opacity-100" : "opacity-0",
          )}
        >
          {current.value}
        </span>

        <div className="flex flex-col items-end gap-2">
          {/* Animated label */}
          <span
            className={cn(
              "text-sm font-semibold transition-opacity duration-[260ms]",
              current.colour,
              visible ? "opacity-100" : "opacity-0",
            )}
          >
            {current.label}
          </span>

          {/* Dot pager — click to jump */}
          <div className="flex items-center gap-1">
            {ticks.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setIdx(i); }}
                aria-label={`Show ${ticks[i].label}`}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === idx
                    ? "w-4 h-1.5 bg-updraft-bright-purple"
                    : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400",
                )}
              />
            ))}
          </div>
        </div>
      </Link>

      {/* Outcome grid */}
      <div className="grid grid-cols-2 gap-2">
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
