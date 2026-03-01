"use client";

import { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface Props {
  value: number;   // 0–100
  size?: number;
  label?: string;
}

/**
 * SVG arc gauge sweeping 240° (gap centred at 6 o'clock).
 * Uses CSS transition on stroke-dashoffset for a smooth fill animation.
 * No external dependencies — pure SVG + CSS.
 *
 * Scroll-triggered: the arc resets to 0 each time the gauge leaves the
 * viewport and replays its fill animation when it re-enters.
 * Respects prefers-reduced-motion — shows the final value immediately.
 */
export default function ArcGauge({ value, size = 80, label }: Props) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const wasInView    = useRef(false);
  const [displayed, setDisplayed] = useState(prefersReduced ? Math.max(0, Math.min(100, value)) : 0);

  // Scroll-trigger: reset arc to 0 on exit, replay fill on entry
  useEffect(() => {
    if (prefersReduced) {
      setDisplayed(Math.max(0, Math.min(100, value)));
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !wasInView.current) {
          // Entered view — reset to 0, then defer fill so CSS transition fires
          wasInView.current = true;
          setDisplayed(0);
          const t = setTimeout(() => setDisplayed(Math.max(0, Math.min(100, value))), 50);
          return () => clearTimeout(t);
        } else if (!entry.isIntersecting) {
          // Left view — reset arc so it's ready to replay next entry
          wasInView.current = false;
          setDisplayed(0);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, prefersReduced]);

  const r = size * 0.37;
  const strokeWidth = size * 0.1;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  // 240° sweep = arcLength; 120° gap at bottom
  const arcLength = (240 / 360) * circumference;

  // dashoffset: arcLength → 0 as value goes 0% → 100%
  const dashoffset = arcLength * (1 - displayed / 100);

  // Colour thresholds
  const colour = value >= 70 ? "#16a34a" : value >= 40 ? "#f59e0b" : "#dc2626";

  // rotate(150°) centres the 120° gap at the bottom (6 o'clock)
  const rotateTransform = `rotate(150, ${cx}, ${cy})`;

  return (
    <div ref={containerRef} className="flex flex-col items-center" style={{ width: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={label ? `${label}: ${value}%` : `${value}%`}
        role="img"
      >
        {/* Background arc (full 240°) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeLinecap="round"
          transform={rotateTransform}
        />

        {/* Foreground arc (proportional to value) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={rotateTransform}
          style={{
            transition: prefersReduced ? "none" : "stroke-dashoffset 1s ease-out, stroke 0.3s ease",
          }}
        />

        {/* Centre percentage */}
        <text
          x={cx}
          y={label ? cy - 2 : cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.22}
          fontWeight="bold"
          fontFamily='"Plus Jakarta Sans", system-ui, sans-serif'
          fill="#1a1a2e"
        >
          {displayed}%
        </text>

        {/* Sub-label */}
        {label && (
          <text
            x={cx}
            y={cy + size * 0.18}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.1}
            fill="#9ca3af"
            fontFamily='"DM Sans", system-ui, sans-serif'
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}
