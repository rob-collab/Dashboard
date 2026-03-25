"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { WidgetShell, WidgetLabel, WidgetInsight, em, WidgetFooter, DataSourceTag } from "./WidgetShell";
import { StatusChip } from "./StatusChip";

export function ApprovalQueueWidget() {
  const riskAcceptances = useAppStore((s) => s.riskAcceptances);
  const risks = useAppStore((s) => s.risks);
  const actions = useAppStore((s) => s.actions);

  const { items, total, escalating } = useMemo(() => {
    const acceptancePending = (riskAcceptances ?? [])
      .filter((ra) => ra.status === "CCRO_REVIEW" || ra.status === "AWAITING_APPROVAL")
      .map((ra) => ({
        id: ra.id,
        title: ra.riskId ? `Risk acceptance — ${ra.riskId}` : "Risk acceptance",
        type: "acceptance" as const,
        createdAt: new Date(ra.createdAt),
        escalating: ra.status === "CCRO_REVIEW",
      }));

    const risksPending = risks
      .filter((r) => r.approvalStatus === "PENDING_APPROVAL")
      .map((r) => ({
        id: r.id,
        title: r.name ?? "Unnamed risk",
        type: "risk" as const,
        createdAt: new Date(r.updatedAt ?? r.createdAt ?? Date.now()),
        escalating: false,
      }));

    const actionsPending = actions
      .filter((a) => a.approvalStatus === "PENDING_APPROVAL")
      .map((a) => ({
        id: a.id,
        title: a.title ?? "Unnamed action",
        type: "action" as const,
        createdAt: new Date(a.updatedAt ?? a.createdAt ?? Date.now()),
        escalating: false,
      }));

    const all = [...acceptancePending, ...risksPending, ...actionsPending]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      items: all,
      total: all.length,
      escalating: all.filter((i) => i.escalating).length,
    };
  }, [riskAcceptances, risks, actions]);

  return (
    <WidgetShell>
      <WidgetLabel>Approval Queue</WidgetLabel>
      <WidgetInsight>
        {total === 0
          ? <>{em.good("Queue clear")} — no pending approvals.</>
          : <>{em.num(total.toString())} item{total !== 1 ? "s" : ""} awaiting sign-off{escalating > 0 ? <>, {em.bad(escalating.toString())} escalating</> : ""}.</>}
      </WidgetInsight>

      <div className="mt-3 space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#E8E6E1] bg-[#F8F7F4] px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="shrink-0 rounded px-1.5 py-0.5"
                style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                  background: item.type === "acceptance" ? "#f5f3ff" : item.type === "risk" ? "#fef2f2" : "#fffbeb",
                  color: item.type === "acceptance" ? "#7c3aed" : item.type === "risk" ? "#dc2626" : "#d97706" }}
              >
                {item.type}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A2E" }} className="truncate">
                {item.title}
              </span>
            </div>
            {item.escalating && <StatusChip variant="red">Escalating</StatusChip>}
          </div>
        ))}
        {total === 0 && (
          <p style={{ fontSize: 12, color: "#94a3b8" }}>Nothing pending.</p>
        )}
      </div>

      <WidgetFooter>
        <DataSourceTag>riskAcceptances · risks · actions with pending approval</DataSourceTag>
      </WidgetFooter>
    </WidgetShell>
  );
}
