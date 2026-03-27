"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { WidgetShell, WidgetLabel, WidgetInsight, em, WidgetFooter, DataSourceTag } from "./WidgetShell";
import { Sparkline } from "./Sparkline";
import { StatusChip } from "./StatusChip";

const CATEGORY_COLOURS: Record<string, string> = {
  Operational: "#7c3aed",
  Financial:   "#2563eb",
  Compliance:  "#dc2626",
  Reputational: "#d97706",
  Strategic:   "#16a34a",
};

interface RiskPostureWidgetProps {
  simplified?: boolean; // CEO mode: top 3 categories only
}

export function RiskPostureWidget({ simplified = false }: RiskPostureWidgetProps) {
  const risks = useAppStore((s) => s.risks);
  const router = useRouter();

  const { categories, aboveAppetiteMonths, worstCategory } = useMemo(() => {
    // Group snapshot scores by categoryL1 (category is on the risk, not the snapshot)
    const snapMap: Record<string, number[]> = {};
    for (const risk of risks) {
      const cat = risk.categoryL1 ?? "Other";
      for (const snap of risk.snapshots ?? []) {
        if (!snapMap[cat]) snapMap[cat] = [];
        snapMap[cat].push((snap.residualLikelihood ?? 1) * (snap.residualImpact ?? 1));
      }
    }

    const categories = Object.entries(snapMap)
      .map(([name, scores]) => ({ name, scores, colour: CATEGORY_COLOURS[name] ?? "#94a3b8" }))
      .sort((a, b) => (b.scores[b.scores.length - 1] ?? 0) - (a.scores[a.scores.length - 1] ?? 0));

    const appetite = 15; // default appetite threshold
    const aboveAppetiteMonths = categories.length > 0
      ? Math.round((categories[0].scores.filter((s) => s > appetite).length / Math.max(categories[0].scores.length, 1)) * 12)
      : 0;

    return {
      categories: simplified ? categories.slice(0, 3) : categories,
      aboveAppetiteMonths,
      worstCategory: categories[0]?.name ?? "No data",
    };
  }, [risks, simplified]);

  return (
    <WidgetShell>
      <WidgetLabel>Risk Posture</WidgetLabel>
      <WidgetInsight>
        {aboveAppetiteMonths > 0
          ? <>{em.bad(worstCategory)} above appetite {em.num(`${aboveAppetiteMonths}mo`)}.</>
          : <>{em.good("All categories")} within appetite.</>}
      </WidgetInsight>

      <div className="mt-3 space-y-1">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => router.push(`/risk-register?cat=${encodeURIComponent(cat.name)}`)}
            className="w-full rounded-lg px-2 py-1 -mx-2 text-left transition-colors hover:bg-updraft-pale-purple/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-updraft-bar"
            aria-label={`View ${cat.name} risks in risk register`}
          >
            <div className="mb-0.5 flex items-center justify-between">
              <span style={{ fontSize: 11, fontWeight: 500, color: "#1A1A2E" }}>{cat.name}</span>
              <StatusChip variant={cat.scores[cat.scores.length - 1] > 15 ? "red" : "green"}>
                {cat.scores[cat.scores.length - 1] ?? 0}
              </StatusChip>
            </div>
            <Sparkline
              values={cat.scores}
              colour={cat.colour}
              appetiteThreshold={15}
              width={200}
              height={22}
              ariaLabel={`${cat.name} risk score over time`}
            />
          </button>
        ))}
      </div>

      <WidgetFooter>
        <DataSourceTag>risk.snapshots · aggregated monthly</DataSourceTag>
      </WidgetFooter>
    </WidgetShell>
  );
}
