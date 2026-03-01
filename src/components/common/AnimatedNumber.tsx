"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  /** Delay in ms after becoming visible before count-up starts. */
  delay?: number;
  className?: string;
}

/** Walk up the DOM and return the nearest scrollable ancestor element. */
function findScrollParent(el: HTMLElement): Element | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Renders a number that counts up from 0 to `value` the FIRST TIME the element
 * scrolls into view — NOT on mount. This ensures numbers below the fold don't
 * silently animate before the user can see them.
 *
 * Uses IntersectionObserver scoped to the nearest scrollable ancestor (same
 * approach as ScrollReveal) so it works correctly with <main overflow-y-auto>.
 *
 * Fires once then disconnects — re-triggers if `value` changes (e.g. after
 * store hydration).
 *
 * Respects prefers-reduced-motion — shows final value immediately.
 */
export function AnimatedNumber({ value, duration = 800, delay = 0, className }: AnimatedNumberProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    // Reduced motion: skip IO, show final value at once
    if (prefersReduced) {
      setTriggered(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const scrollRoot = findScrollParent(el);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { root: scrollRoot, threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  // Re-run if `value` changes so a store hydration re-triggers the count-up
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReduced]);

  // Reset trigger when value changes so count-up replays after data refresh
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (prevValueRef.current !== value && triggered) {
      // Keep triggered=true but useCountUp will re-fire its own animation
      prevValueRef.current = value;
    }
  }, [value, triggered]);

  const animated = useCountUp(
    triggered ? value : 0,
    prefersReduced ? 0 : duration,
    prefersReduced ? 0 : delay,
  );

  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      {animated}
    </span>
  );
}
