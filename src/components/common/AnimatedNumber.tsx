"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  /** Delay in ms before count-up starts. */
  delay?: number;
  className?: string;
  /**
   * When true (the default), the count-up fires only when the element scrolls
   * into the viewport and re-fires every time it re-enters view.
   * Set to false to revert to the original mount-triggered behaviour.
   */
  scrollTrigger?: boolean;
}

/**
 * Inner component — mounts fresh on each scroll entry, which restarts
 * the count from 0 via `useCountUp`.
 */
function AnimatedCore({
  value,
  duration,
  delay,
  className,
}: Omit<AnimatedNumberProps, "scrollTrigger">) {
  const prefersReduced = useReducedMotion();
  const animated = useCountUp(
    value,
    prefersReduced ? 0 : (duration ?? 800),
    prefersReduced ? 0 : (delay ?? 0),
  );
  return (
    <span className={className} aria-label={String(value)}>
      {animated}
    </span>
  );
}

/**
 * Renders a number that counts up from 0 to `value` whenever it enters
 * the viewport (default). Re-fires on every subsequent scroll entry.
 *
 * Safe to use inside .map() as it is a full React component.
 * Respects prefers-reduced-motion — shows the final value immediately when on.
 * aria-label always reports the final value so screen readers are not
 * confused by intermediate counting values.
 *
 * Set `scrollTrigger={false}` to revert to the original on-mount behaviour.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  delay = 0,
  className,
  scrollTrigger = true,
}: AnimatedNumberProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  // animKey increments each time the element enters view.
  // A new key forces AnimatedCore to remount → restarts count from 0.
  const [animKey, setAnimKey] = useState(0);
  // wasInView tracks whether the element is currently intersecting, so we only
  // fire on the leading edge (enter) not on every observer callback.
  const wasInView = useRef(false);

  useEffect(() => {
    // Without scroll trigger, or with reduced motion, skip the observer.
    if (!scrollTrigger || prefersReduced) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !wasInView.current) {
          // Leading edge — element just entered view
          wasInView.current = true;
          setAnimKey((k) => k + 1);
        } else if (!entry.isIntersecting) {
          // Trailing edge — element left view; next entry will re-fire
          wasInView.current = false;
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollTrigger, prefersReduced]);

  // ── Non-scroll-trigger path ──────────────────────────────────────────────
  if (!scrollTrigger) {
    return (
      <AnimatedCore
        value={value}
        duration={prefersReduced ? 0 : duration}
        delay={prefersReduced ? 0 : delay}
        className={className}
      />
    );
  }

  // ── Reduced motion path — static value, no animation ────────────────────
  if (prefersReduced) {
    return (
      <span className={className} aria-label={String(value)}>
        {value}
      </span>
    );
  }

  // ── Scroll-trigger path ──────────────────────────────────────────────────
  // Show the static final value until the first scroll entry (animKey === 0).
  // Once animKey > 0, render AnimatedCore keyed by animKey so it remounts and
  // replays the count-up on every subsequent entry.
  return (
    <span ref={ref}>
      {animKey === 0 ? (
        <span className={className} aria-label={String(value)}>
          {value}
        </span>
      ) : (
        <AnimatedCore
          key={animKey}
          value={value}
          duration={duration}
          delay={delay}
          className={className}
        />
      )}
    </span>
  );
}
