"use client";

import { useEffect, useRef, useState } from "react";

interface Options {
  /**
   * Fraction of the element that must be visible to trigger `inView: true`.
   * Default 0.15 (15%) — balanced between too-early and too-late triggering.
   */
  threshold?: number;
  /**
   * Optional root margin (CSS shorthand). Default `"0px"`.
   * Use `"0px 0px -40px 0px"` to require 40px clearance from the bottom edge
   * before considering something in-view.
   */
  rootMargin?: string;
}

/**
 * useScrollObserver — returns a `{ ref, inView }` pair.
 *
 * `inView` becomes true when the observed element reaches the threshold,
 * and false again when it leaves. Fires bidirectionally: scrolling down
 * into view and scrolling back up into view both trigger re-entry.
 *
 * Usage:
 * ```tsx
 * const { ref, inView } = useScrollObserver();
 * return <div ref={ref}>{inView ? "visible" : "hidden"}</div>;
 * ```
 */
export function useScrollObserver<T extends Element = HTMLDivElement>(
  options: Options = {},
): { ref: React.RefObject<T>; inView: boolean } {
  const { threshold = 0.15, rootMargin = "0px" } = options;
  const ref      = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView };
}
