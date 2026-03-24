"use client";

import * as React from "react";
import { useRef, useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface GlowMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon | React.FC<{ size?: number; className?: string }>;
  badge?: number;
  disabled?: boolean;
}

export interface GlowMenuProps {
  items: GlowMenuItem[];
  activeId: string;
  onSelect: (id: string) => void;
  size?: "sm" | "md";
  menuId?: string;
  className?: string;
}

const BRAND_GRADIENT =
  "radial-gradient(circle, rgba(123,31,162,0.15) 0%, rgba(103,58,183,0.06) 50%, transparent 100%)";

const itemVariants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
};

const backVariants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
};

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
      scale: { duration: 0.5, type: "spring" as const, stiffness: 300, damping: 25 },
    },
  },
};

const navGlowVariants = {
  initial: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    },
  },
};

const sharedTransition = {
  type: "spring" as const,
  stiffness: 100,
  damping: 20,
  duration: 0.5,
};

export function GlowMenu({
  items,
  activeId,
  onSelect,
  size = "md",
  // menuId is accepted for future layoutId scoping
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  menuId: _menuId = "menu",
  className,
}: GlowMenuProps) {
  const prefersReduced = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    function update() {
      if (!el) return;
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const isMd = size === "md";
  const padClass = isMd ? "px-4 py-2" : "px-3 py-1.5";
  const textClass = isMd ? "text-sm" : "text-xs";
  const iconSize = isMd ? 16 : 12;

  // ── Reduced motion: plain static underline tabs ──────────────────────────
  if (prefersReduced) {
    return (
      <div className="relative">
        <nav
          ref={navRef}
          role="tablist"
          className={cn(
            "flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-none",
            className,
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                disabled={item.disabled}
                onClick={() => !item.disabled && onSelect(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0",
                  padClass,
                  textClass,
                  isActive
                    ? "border-updraft-bright-purple text-updraft-deep"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                  item.disabled ? "opacity-50 cursor-not-allowed" : "",
                )}
              >
                {Icon && <Icon size={iconSize} />}
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]",
                      isActive
                        ? "bg-updraft-deep text-white"
                        : "bg-gray-200 text-gray-600",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {/* Right-edge scroll fade — opacity transitions in/out as tabs overflow */}
        <div
          className={cn(
            "pointer-events-none absolute right-0 top-0 bottom-[1px] w-12 bg-gradient-to-l from-white to-transparent transition-opacity duration-200",
            showRightFade ? "opacity-100" : "opacity-0",
          )}
          aria-hidden="true"
        />
      </div>
    );
  }

  // ── Full animated version ────────────────────────────────────────────────
  return (
    <div className="relative">
    <motion.nav
      ref={navRef}
      role="tablist"
      className={cn(
        "flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-none relative",
        className,
      )}
      initial="initial"
      whileHover="hover"
    >
      {/* Nav-level gradient glow on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0 rounded-t-lg"
        style={{ background: BRAND_GRADIENT }}
        variants={navGlowVariants}
      />

      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeId;

        return (
          <motion.div
            key={item.id}
            className={cn(
              "relative shrink-0 border-b-2 -mb-px",
              isActive ? "border-updraft-bright-purple" : "border-transparent",
            )}
            whileHover="hover"
            initial="initial"
          >
            <button
              role="tab"
              aria-selected={isActive}
              disabled={item.disabled}
              onClick={() => !item.disabled && onSelect(item.id)}
              className={cn(
                "block",
                item.disabled ? "opacity-50 cursor-not-allowed" : "",
              )}
            >
              {/* Perspective container */}
              <div
                style={{ perspective: "600px" }}
                className="relative overflow-visible"
              >
                {/* Radial glow — permanent on active, on hover for inactive */}
                <motion.div
                  className="absolute inset-0 z-0 pointer-events-none rounded-lg"
                  variants={glowVariants}
                  animate={isActive ? "hover" : "initial"}
                  style={{ background: BRAND_GRADIENT }}
                />

                {/* Front face (visible at rest, flips away on hover) */}
                <motion.div
                  className={cn(
                    "inline-flex items-center gap-1.5 font-medium relative z-10 whitespace-nowrap",
                    padClass,
                    textClass,
                    isActive ? "text-updraft-deep" : "text-gray-500",
                  )}
                  variants={itemVariants}
                  transition={sharedTransition}
                  style={{
                    transformStyle: "preserve-3d",
                    transformOrigin: "center bottom",
                  }}
                >
                  {Icon && <Icon size={iconSize} />}
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]",
                        isActive
                          ? "bg-updraft-deep text-white"
                          : "bg-gray-200 text-gray-600",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </motion.div>

                {/* Back face (flips in on hover, always shows active colours) */}
                <motion.div
                  className={cn(
                    "flex items-center gap-1.5 font-medium absolute inset-0 z-10 whitespace-nowrap text-updraft-deep",
                    padClass,
                    textClass,
                  )}
                  variants={backVariants}
                  transition={sharedTransition}
                  style={{
                    transformStyle: "preserve-3d",
                    transformOrigin: "center top",
                  }}
                >
                  {Icon && <Icon size={iconSize} />}
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] bg-updraft-deep text-white">
                      {item.badge}
                    </span>
                  )}
                </motion.div>
              </div>
            </button>
          </motion.div>
        );
      })}
    </motion.nav>
    {/* Right-edge scroll fade — opacity transitions in/out as tabs overflow */}
    <div
      className={cn(
        "pointer-events-none absolute right-0 top-0 bottom-[1px] w-12 bg-gradient-to-l from-white to-transparent transition-opacity duration-200",
        showRightFade ? "opacity-100" : "opacity-0",
      )}
      aria-hidden="true"
    />
    </div>
  );
}
