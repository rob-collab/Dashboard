"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionGroup {
  icon: React.ReactNode;
  label: string;
  count: number;
  href: string;
  colour: string; // e.g. "text-red-600 bg-red-50 border-red-200"
  items: { label: string; sub?: string; href: string }[];
}

interface Props {
  groups: ActionGroup[];
}

const TICK_MS = 3200;
const FADE_MS = 240;

export default function ActionRequiredSection({ groups }: Props) {
  // Flatten all items from all groups into a single ticker list
  const allItems = useMemo(
    () =>
      groups.flatMap((g) =>
        g.items.map((item) => ({
          ...item,
          groupLabel:  g.label,
          groupColour: g.colour,
        })),
      ),
    [groups],
  );

  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused,  setPaused]  = useState(false);

  const totalCount = groups.reduce((s, g) => s + g.count, 0);

  // Clamp idx when items change
  useEffect(() => {
    if (idx >= allItems.length) setIdx(0);
  }, [allItems.length, idx]);

  useEffect(() => {
    if (paused || allItems.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % allItems.length);
        setVisible(true);
      }, FADE_MS);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused, allItems.length]);

  if (groups.length === 0) return null;

  const current = allItems[idx] ?? allItems[0];
  // Extract text + bg + border colour classes from the colour string
  const colourParts  = current?.groupColour.split(" ") ?? [];
  const textClass    = colourParts.find((c) => c.startsWith("text-")) ?? "text-red-600";
  const bgClass      = colourParts.find((c) => c.startsWith("bg-"))   ?? "bg-red-50";
  const borderClass  = colourParts.find((c) => c.startsWith("border-")) ?? "border-red-200";

  return (
    <div className="bento-card border-l-4 border-l-red-400 flex flex-col gap-3 h-full">
      {/* Header — pulsing icon when items exist */}
      <div className="flex items-center gap-2">
        <AlertTriangle
          className={cn(
            "h-5 w-5 text-red-500",
            totalCount > 0 && "rag-pulse",
          )}
        />
        <h2 className={cn("text-base font-bold text-updraft-deep font-poppins", totalCount > 0 && "rag-pulse")}>
          Action Required
        </h2>
        <span className="ml-auto text-xs text-gray-400">
          {totalCount} item{totalCount !== 1 ? "s" : ""} need attention
        </span>
      </div>

      {/* Rolling ticker */}
      {current && (
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className={cn("rounded-xl border p-3", bgClass, borderClass)}
        >
          {/* Category + position */}
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", textClass)}>
              {current.groupLabel}
            </span>
            {allItems.length > 1 && (
              <span className={cn("text-[10px] tabular-nums", textClass)}>
                {idx + 1}&thinsp;/&thinsp;{allItems.length}
              </span>
            )}
          </div>

          {/* Item — fades in/out */}
          <Link
            href={current.href}
            className={cn(
              "block transition-opacity",
              visible ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDuration: `${FADE_MS}ms` }}
          >
            <p className={cn("text-sm font-medium leading-snug truncate", textClass)}>
              {current.label}
            </p>
            {current.sub && (
              <p className="text-[10px] text-gray-500 mt-0.5">{current.sub}</p>
            )}
          </Link>

          {/* Dot pager */}
          {allItems.length > 1 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {allItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Item ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === idx
                      ? `w-3 h-1.5 ${bgClass.replace("bg-", "bg-").replace("50", "400")}`
                      : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compact group summary — one row per group */}
      <div className="space-y-1.5">
        {groups.map((g) => {
          const gText   = g.colour.split(" ").find((c) => c.startsWith("text-")) ?? "text-gray-600";
          const gBg     = g.colour.split(" ").find((c) => c.startsWith("bg-"))   ?? "bg-gray-50";
          const gBorder = g.colour.split(" ").find((c) => c.startsWith("border-")) ?? "border-gray-200";
          return (
            <Link
              key={g.label}
              href={g.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 hover:opacity-80 transition-opacity",
                gBg,
                "border",
                gBorder,
              )}
            >
              <span className={gText}>{g.icon}</span>
              <span className={cn("text-xs font-medium flex-1 truncate", gText)}>{g.label}</span>
              <span className={cn("text-xs font-bold shrink-0 tabular-nums", gText)}>{g.count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
