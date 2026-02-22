"use client";

/**
 * GlossaryTooltip — underlined term with a tooltip definition on hover.
 * Uses pure CSS/Tailwind; no JS tooltip library required.
 *
 * Usage:
 *   <GlossaryTooltip term="RAG" />
 *   <GlossaryTooltip term="Residual Risk">Residual Risk</GlossaryTooltip>
 */

import { type ReactNode } from "react";

const DEFINITIONS: Record<string, string> = {
  RAG: "Red / Amber / Green — a traffic-light status system. Red (Harm/High) = immediate attention needed; Amber (Warning/Medium) = monitor closely; Green (Good/Low) = within acceptable limits.",
  "Residual Risk":
    "The risk that remains after controls and mitigations have been applied. Residual = Inherent risk − effect of controls.",
  "Inherent Risk":
    "The raw level of risk before any controls or mitigations are applied. Represents the worst-case exposure.",
  "Consumer Duty":
    "FCA regulation requiring firms to deliver good outcomes for retail customers across four areas: Products & Services, Price & Value, Consumer Understanding, and Consumer Support.",
  "2LOD":
    "Second Line of Defence — an independent oversight function (e.g. Risk, Compliance, Legal) that monitors and challenges the first line (business operations).",
  CCRO: "Chief Customer & Risk Officer — the senior executive accountable for customer outcomes, risk oversight, and regulatory compliance.",
  Appetite:
    "Risk Appetite — the level of risk an organisation is willing to accept in pursuit of its objectives. Expressed as a threshold (e.g. ≥ 95%) or qualitative band.",
  MI: "Management Information — quantitative metrics used to monitor performance, risk exposure, or regulatory compliance on a regular basis.",
  "SM&CR":
    "Senior Managers & Certification Regime — FCA/PRA framework requiring firms to assign personal accountability for regulated activities to named Senior Managers.",
  "Control Effectiveness":
    "An assessment of how well a control reduces the likelihood or impact of a risk. Typically rated Strong / Moderate / Weak / Ineffective.",
};

interface GlossaryTooltipProps {
  /** The term key — must match a key in DEFINITIONS */
  term: keyof typeof DEFINITIONS;
  /** Optional custom label; defaults to the term itself */
  children?: ReactNode;
  /** Extra className on the wrapper span */
  className?: string;
}

export default function GlossaryTooltip({
  term,
  children,
  className = "",
}: GlossaryTooltipProps) {
  const definition = DEFINITIONS[term];
  if (!definition) return <span className={className}>{children ?? term}</span>;

  return (
    <span className={`relative group inline-block ${className}`}>
      {/* The term — dotted underline signals it has a tooltip */}
      <span className="cursor-help border-b border-dotted border-gray-400 text-inherit">
        {children ?? term}
      </span>
      {/* Tooltip bubble */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-updraft-deep px-3 py-2 text-[11px] leading-relaxed text-white shadow-xl
          opacity-0 scale-95 transition-all duration-150
          group-hover:opacity-100 group-hover:scale-100"
      >
        <span className="font-semibold">{term}</span>
        <br />
        {definition}
        {/* Arrow */}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-updraft-deep" />
      </span>
    </span>
  );
}

/** Convenience export of the definitions map for programmatic use */
export { DEFINITIONS as GLOSSARY };
