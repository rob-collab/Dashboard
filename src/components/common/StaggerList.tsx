"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  /** Each element in this array becomes a stagger-item with its own delay. */
  children: React.ReactNode[];
  /** CSS class(es) on the outer container div. */
  className?: string;
  /** Delay increment between items in ms. Default 60. */
  itemDelay?: number;
}

/**
 * StaggerList — wraps a list of items and slides them in one-by-one
 * each time the container scrolls into the viewport.
 *
 * Works with the `.stagger-item` / `.stagger-visible` CSS classes defined
 * in globals.css. Re-fires on every subsequent scroll entry.
 *
 * Respects `prefers-reduced-motion` — items appear instantly when preferred.
 *
 * Usage:
 * ```tsx
 * <StaggerList className="space-y-2">
 *   {items.map(item => (
 *     <Link key={item.id} ...>...</Link>
 *   ))}
 * </StaggerList>
 * ```
 */
export function StaggerList({ children, className, itemDelay = 60 }: Props) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const wasInView    = useRef(false);
  // Increment on each scroll entry to force re-animation via `key`
  const [staggerKey, setStaggerKey] = useState(0);

  useEffect(() => {
    if (prefersReduced) {
      setStaggerKey(1); // show items immediately without animation
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !wasInView.current) {
          wasInView.current = true;
          setStaggerKey((k) => k + 1);
        } else if (!entry.isIntersecting) {
          wasInView.current = false;
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  return (
    <div
      ref={containerRef}
      key={staggerKey}
      className={cn(className, staggerKey > 0 && "stagger-visible")}
    >
      {children.map((child, i) => (
        <div
          key={i}
          className="stagger-item"
          style={{ "--stagger-delay": `${i * itemDelay}ms` } as React.CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
