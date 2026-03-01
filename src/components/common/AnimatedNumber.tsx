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
 * Renders a number that counts up from 0 to `value` every time the element
 * scrolls into view — NOT just the first time. Re-animates on each scroll-in.
 *
 * Uses IntersectionObserver scoped to the nearest scrollable ancestor (same
 * approach as ScrollReveal) so it works correctly with <main overflow-y-auto>.
 *
 * Does NOT disconnect after first fire — re-triggers on every entry.
 * Shows 0 while off-screen (invisible), counts up each time it enters view.
 *
 * Respects prefers-reduced-motion — shows final value immediately.
 */
export function AnimatedNumber({ value, duration = 800, delay = 0, className }: AnimatedNumberProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inViewRef = useRef(false);
  const [displayTarget, setDisplayTarget] = useState(0);

  // IO: watches every intersection change — re-fires count-up on each entry
  useEffect(() => {
    if (prefersReduced) {
      setDisplayTarget(value);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const scrollRoot = findScrollParent(el);
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nowIn = entry.isIntersecting;
        if (nowIn && !inViewRef.current) {
          // Just entered viewport: reset to 0, then count up to current value
          setDisplayTarget(0);
          requestAnimationFrame(() => setDisplayTarget(value));
        }
        inViewRef.current = nowIn;
      },
      { root: scrollRoot, threshold: 0.1 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      inViewRef.current = false;
    };
  // value excluded intentionally — handled by the effect below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReduced]);

  // Re-animate when value changes while in view (e.g. after store hydration)
  useEffect(() => {
    if (prefersReduced) {
      setDisplayTarget(value);
      return;
    }
    if (inViewRef.current) {
      setDisplayTarget(0);
      const id = requestAnimationFrame(() => setDisplayTarget(value));
      return () => cancelAnimationFrame(id);
    }
  }, [value, prefersReduced]);

  const animated = useCountUp(
    displayTarget,
    prefersReduced ? 0 : duration,
    prefersReduced ? 0 : delay,
  );

  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      {animated}
    </span>
  );
}
