"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Animates a number from 0 to `target` over `duration` ms using an ease-out cubic curve.
 * Returns the current animated value. Re-triggers whenever `target` changes.
 * Optional `delay` (ms) defers the start — useful when the containing element has an
 * entrance animation (e.g. card-entrance) that would hide the count-up otherwise.
 */
export function useCountUp(target: number, duration = 800, delay = 0): number {
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startRef.current = null;
    setCount(0);

    const startAnimation = () => {
      const animate = (ts: number) => {
        if (!startRef.current) startRef.current = ts;
        const progress = Math.min((ts - startRef.current) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setCount(Math.round(target * ease));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    };

    if (delay > 0) {
      timeoutRef.current = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return count;
}
