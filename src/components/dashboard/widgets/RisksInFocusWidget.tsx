"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useHasPermission } from "@/lib/usePermission";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function riskScore(r: { residualLikelihood: number; residualImpact: number }): number {
  return r.residualLikelihood * r.residualImpact;
}

function riskSeverityLevel(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 20) return "critical";
  if (score >= 12) return "high";
  if (score >= 6) return "medium";
  return "low";
}

export function RisksInFocusWidget() {
  const risks = useAppStore((s) => s.risks);
  const hasRiskPage = useHasPermission("page:risk-register");
  const router = useRouter();

  const focusRisks = useMemo(() => risks.filter((r) => r.inFocus).slice(0, 5), [risks]);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Risks in Focus</CardTitle>
          {focusRisks.length > 0 && (
            <Badge variant="default">{focusRisks.length} starred</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {focusRisks.length === 0 ? (
          <p className="text-xs text-gray-400">
            No risks pinned.{" "}
            <button
              onClick={() => hasRiskPage && router.push("/risk-register")}
              className="text-updraft-bar hover:text-updraft-deep transition-colors"
            >
              Star a risk in the register
            </button>{" "}
            to track it here.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {focusRisks.map((r) => {
              const level = riskSeverityLevel(riskScore(r));
              return (
                <button
                  key={r.id}
                  onClick={() => hasRiskPage && router.push(`/risk-register?risk=${r.id}`)}
                  className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-3 text-left transition-all hover:border-updraft-light-purple/30 hover:shadow-bento dark:border-gray-800 dark:hover:border-updraft-bar/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-gray-400">{r.reference}</span>
                    <Badge variant={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</Badge>
                  </div>
                  <p className="line-clamp-2 text-xs font-medium text-gray-700 dark:text-gray-300 leading-snug">
                    {r.name}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
