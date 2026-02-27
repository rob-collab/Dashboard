"use client";

/**
 * ScrollReveal — re-fires its entrance animation every time the element
 * scrolls into the viewport (both directions: scrolling down into view
 * and scrolling back up into view).
 *
 * Uses a native IntersectionObserver (threshold 5%, 30px bottom margin)
 * so shallow sections at the bottom of the viewport trigger correctly.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Delay before the enter animation starts (ms). Default 0. */
  delay?: number;
}

export default function ScrollReveal({ children, className, delay = 0 }: Props) {
  const ref      = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.05, rootMargin: "0px 0px -30px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out will-change-[opacity,transform]",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
