"use client";

import { useReducedMotion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
}

/**
 * Renders a number that counts up from 0 to `value` on mount.
 * Safe to use inside .map() as it is a full React component.
 * Respects prefers-reduced-motion — shows final value immediately when on.
 * aria-label always reports the final value so screen readers are not
 * confused by intermediate counting values.
 */
export function AnimatedNumber({ value, duration = 800, className }: AnimatedNumberProps) {
  const prefersReduced = useReducedMotion();
  const animated = useCountUp(value, prefersReduced ? 0 : duration);
  return (
    <span className={className} aria-label={String(value)}>
      {animated}
    </span>
  );
}
