"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface Props {
  /**
   * Render-prop children. Receives a `key` number that increments each time
   * the chart enters the viewport — pass it as `key` to your `ResponsiveContainer`
   * so Recharts replays its entrance animation on every scroll entry.
   *
   * Example:
   * ```tsx
   * <ScrollChart>
   *   {(key) => (
   *     <ResponsiveContainer key={key} width="100%" height="100%">
   *       <AreaChart data={...}>...</AreaChart>
   *     </ResponsiveContainer>
   *   )}
   * </ScrollChart>
   * ```
   */
  children: (scrollKey: number) => React.ReactNode;
  className?: string;
  /** IntersectionObserver threshold. Default 0.1 (10%). */
  threshold?: number;
}

/**
 * ScrollChart — wraps a Recharts chart and re-triggers its entrance animation
 * each time it scrolls into the viewport.
 *
 * Recharts plays its entrance animation when the chart component first mounts.
 * By keying the `ResponsiveContainer` (or the chart root) with the `scrollKey`
 * provided by this wrapper, we force a remount — and thus a re-animation — on
 * every scroll entry.
 *
 * Respects `prefers-reduced-motion`: when the user prefers no motion, the key
 * never changes (chart mounts once, no replay).
 */
export function ScrollChart({ children, className, threshold = 0.1 }: Props) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [scrollKey, setScrollKey] = useState(0);
  const wasInView = useRef(false);

  useEffect(() => {
    if (prefersReduced) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !wasInView.current) {
          wasInView.current = true;
          setScrollKey((k) => k + 1);
        } else if (!entry.isIntersecting) {
          wasInView.current = false;
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced, threshold]);

  return (
    <div ref={ref} className={className}>
      {children(scrollKey)}
    </div>
  );
}
