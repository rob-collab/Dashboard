"use client";

/**
 * ScrollReveal — re-fires its entrance animation every time the element
 * scrolls into the viewport (both directions: scrolling down into view
 * and scrolling back up into view).
 *
 * Uses a native IntersectionObserver scoped to the nearest scrollable
 * ancestor (not the document viewport). This is required because the
 * app shell uses <main overflow-y-auto> as the scroll container rather
 * than <body>, so root:null would always report all elements as
 * intersecting and no scroll animation would fire.
 *
 * threshold 5%, 40px bottom margin so shallow sections trigger correctly.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Delay before the enter animation starts (ms). Default 0. */
  delay?: number;
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

export default function ScrollReveal({ children, className, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Use the nearest scrolling ancestor as the IO root so that animations
    // fire correctly when <main> (not <body>) is the scroll container.
    const scrollRoot = findScrollParent(el);

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      {
        root: scrollRoot,
        threshold: 0.05,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
