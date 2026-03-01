"use client";

import { useEffect, useRef, useState } from "react";

interface ChartRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Skeleton placeholder shown until the chart is in view. Defaults to an empty div. */
  skeleton?: React.ReactNode;
}

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
 * Defers mounting its children until the wrapper scrolls into view.
 * Uses IntersectionObserver with the nearest scrollable ancestor as root
 * (matches the pattern used by ScrollReveal). Fires once, then disconnects.
 */
export default function ChartReveal({ children, className, skeleton }: ChartRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scrollRoot = findScrollParent(el);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { root: scrollRoot, threshold: 0.1, rootMargin: "0px 0px -20px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {mounted ? children : (skeleton ?? <div className="h-full w-full" />)}
    </div>
  );
}
