"use client";

import { useCountUp } from "@/hooks/useCountUp";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
}

/**
 * Renders a number that counts up from 0 to `value` on mount.
 * Safe to use inside .map() as it is a full React component.
 */
export function AnimatedNumber({ value, duration = 800, className }: AnimatedNumberProps) {
  const animated = useCountUp(value, duration);
  return <span className={className}>{animated}</span>;
}
