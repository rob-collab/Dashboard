"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: ReactNode;
  showRadialGradient?: boolean;
  /** When true: renders as a fixed full-viewport layer behind all content, no children */
  overlay?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  overlay = false,
  ...props
}: AuroraBackgroundProps) => {
  const auroraLayer = (
    <div
      className={cn(
        // Base gradients — white bands create the shimmer effect over the aurora
        `[--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
        [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]`,
        // Aurora: Updraft brand purples — pale → light → medium → deep cycling
        `[--aurora:repeating-linear-gradient(100deg,var(--updraft-pale-purple)_10%,var(--updraft-light-purple)_15%,var(--updraft-medium-purple)_20%,var(--updraft-bar)_25%,var(--updraft-pale-purple)_30%)]`,
        // Background composition
        `[background-image:var(--white-gradient),var(--aurora)]
        dark:[background-image:var(--dark-gradient),var(--aurora)]
        [background-size:300%,_200%]
        [background-position:50%_50%,50%_50%]
        filter blur-[10px]`,
        // After pseudo-element: animated layer
        `after:content-[""] after:absolute after:inset-0
        after:[background-image:var(--white-gradient),var(--aurora)]
        after:dark:[background-image:var(--dark-gradient),var(--aurora)]
        after:[background-size:200%,_100%]
        after:animate-aurora after:[background-attachment:fixed]
        after:mix-blend-multiply after:dark:mix-blend-difference`,
        `pointer-events-none absolute -inset-[10px] will-change-transform`,
        // Opacity: slightly more visible in wrap mode, very subtle as overlay
        overlay ? "opacity-[0.18]" : "opacity-[0.35]",
        showRadialGradient &&
          `[mask-image:radial-gradient(ellipse_at_60%_0%,black_20%,var(--transparent)_80%)]`
      )}
    />
  );

  // Overlay mode: fixed layer behind the entire app, no content wrapper
  if (overlay) {
    return (
      <div
        className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {auroraLayer}
      </div>
    );
  }

  // Wrap mode: full-height section wrapping children
  return (
    <main>
      <div
        className={cn(
          "relative flex flex-col h-[100vh] items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-slate-950 transition-bg",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 overflow-hidden">
          {auroraLayer}
        </div>
        {children}
      </div>
    </main>
  );
};
