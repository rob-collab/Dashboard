"use client";

import { cn } from "@/lib/utils";

interface WidgetShellProps {
  children: React.ReactNode;
  className?: string;
  /** Used in edit mode to show drag cursor */
  isDragging?: boolean;
}

export function WidgetShell({ children, className, isDragging }: WidgetShellProps) {
  return (
    <div
      className={cn(
        // Base shell — matches spec exactly
        "relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#E8E6E1] bg-white p-5",
        "shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
        "transition-all duration-200 ease-out",
        // Hover glow
        "hover:shadow-[0_4px_20px_rgba(123,31,162,0.1)] hover:-translate-y-px",
        // Noise texture via pseudo-element
        "widget-shell",
        isDragging && "cursor-grabbing scale-[1.02] shadow-[0_8px_32px_rgba(123,31,162,0.18)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** 10px uppercase context label */
export function WidgetLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8" }}
    >
      {children}
    </p>
  );
}

/** 14px DM Sans narrative insight sentence */
export function WidgetInsight({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn("mt-1 leading-[1.55]", className)}
      style={{ fontSize: 14, fontWeight: 500, color: "#1A1A2E" }}
    >
      {children}
    </p>
  );
}

/** Coloured emphasis spans for use inside WidgetInsight */
export const em = {
  bad:  (text: string | number) => <strong style={{ color: "#dc2626", fontWeight: 700 }}>{text}</strong>,
  good: (text: string | number) => <strong style={{ color: "#16a34a", fontWeight: 700 }}>{text}</strong>,
  warn: (text: string | number) => <strong style={{ color: "#d97706", fontWeight: 700 }}>{text}</strong>,
  num:  (text: string | number) => <strong style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>{text}</strong>,
};

/** Delta footer row */
export function WidgetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-auto pt-3" style={{ fontSize: 11, color: "#94a3b8" }}>
      {children}
    </div>
  );
}

/** 9px data source tag */
export function DataSourceTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 9, color: "#c4c0bb", letterSpacing: "0.04em" }}>
      {children}
    </span>
  );
}
