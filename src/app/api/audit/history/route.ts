import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export interface HistoryEvent {
  id: string;
  type: "created" | "updated" | "archived" | "other";
  action: string;
  date: string;
  yearMonth: string;
  userId: string;
  userName: string;
  entityType: string;
  entityId: string | null;
  entityRef?: string;
  entityName?: string;
  field?: string;
  from?: string | null;
  to?: string | null;
  linkType?: string; // "control" | "risk" | "action" | "process" — for EntityLink
}

export interface HistoryMonth {
  yearMonth: string;
  label: string;
  events: HistoryEvent[];
}

const ALLOWED_ENTITY_TYPES = [
  "control",
  "risk",
  "action",
  "consumer_duty_outcome",
  "consumer_duty_measure",
  "consumer_duty_mi",
  "process",
  "regulation",
];

const LINK_TYPE_MAP: Record<string, string> = {
  control: "control",
  risk: "risk",
  action: "action",
  process: "process",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

function classifyAction(action: string): HistoryEvent["type"] {
  const a = action.toLowerCase();
  if (a.startsWith("create_") || a === "create") return "created";
  if (a.startsWith("archive_") || a.startsWith("delete_") || a.startsWith("retire_") || a === "archive" || a === "delete" || a === "retire") return "archived";
  if (a.startsWith("update_") || a === "update" || a.startsWith("update")) return "updated";
  return "other";
}

type EntityRef = { id: string; ref: string; name: string };

async function fetchEntityRefs(entityType: string, ids: string[]): Promise<Map<string, EntityRef>> {
  const map = new Map<string, EntityRef>();
  if (ids.length === 0) return map;

  let rows: EntityRef[] = [];

  switch (entityType) {
    case "control": {
      const data = await prisma.control.findMany({
        where: { id: { in: ids } },
        select: { id: true, controlRef: true, controlName: true },
      });
      rows = data.map((r) => ({ id: r.id, ref: r.controlRef, name: r.controlName }));
      break;
    }
    case "risk": {
      const data = await prisma.risk.findMany({
        where: { id: { in: ids } },
        select: { id: true, reference: true, name: true },
      });
      rows = data.map((r) => ({ id: r.id, ref: r.reference, name: r.name }));
      break;
    }
    case "action": {
      const data = await prisma.action.findMany({
        where: { id: { in: ids } },
        select: { id: true, reference: true, title: true },
      });
      rows = data.map((r) => ({ id: r.id, ref: r.reference, name: r.title }));
      break;
    }
    case "consumer_duty_outcome": {
      const data = await prisma.consumerDutyOutcome.findMany({
        where: { id: { in: ids } },
        select: { id: true, outcomeId: true, name: true },
      });
      rows = data.map((r) => ({ id: r.id, ref: r.outcomeId, name: r.name }));
      break;
    }
    case "consumer_duty_measure": {
      const data = await prisma.consumerDutyMeasure.findMany({
        where: { id: { in: ids } },
        select: { id: true, measureId: true, name: true },
      });
      rows = data.map((r) => ({ id: r.id, ref: r.measureId, name: r.name }));
      break;
    }
    case "consumer_duty_mi": {
      const data = await prisma.consumerDutyMI.findMany({
        where: { id: { in: ids } },
        select: { id: true, metric: true },
      });
      rows = data.map((r) => ({ id: r.id, ref: r.id, name: r.metric }));
      break;
    }
    case "process": {
      const data = await prisma.process.findMany({
        where: { id: { in: ids } },
        select: { id: true, reference: true, name: true },
      });
      rows = data.map((r) => ({ id: r.id, ref: r.reference, name: r.name }));
      break;
    }
    case "regulation": {
      const data = await prisma.regulation.findMany({
        where: { id: { in: ids } },
        select: { id: true, reference: true, name: true },
      });
      rows = data.map((r) => ({ id: r.id, ref: r.reference, name: r.name }));
      break;
    }
  }

  for (const row of rows) map.set(row.id, row);
  return map;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const entityTypesParam = url.searchParams.get("entityTypes") ?? "";
    const months = Math.min(parseInt(url.searchParams.get("months") ?? "12"), 24);

    const requestedTypes = entityTypesParam
      .split(",")
      .map((t) => t.trim())
      .filter((t) => ALLOWED_ENTITY_TYPES.includes(t));

    if (requestedTypes.length === 0) {
      return errorResponse("entityTypes parameter is required", 400);
    }

    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: { in: requestedTypes },
        timestamp: { gte: since },
      },
      include: { user: { select: { name: true } } },
      orderBy: { timestamp: "desc" },
      take: 1000,
    });

    // Group entity IDs by type for batch-loading
    const entityIdsByType = new Map<string, Set<string>>();
    for (const log of auditLogs) {
      if (!log.entityId) continue;
      if (!entityIdsByType.has(log.entityType)) entityIdsByType.set(log.entityType, new Set());
      entityIdsByType.get(log.entityType)!.add(log.entityId);
    }

    // Batch-load entity refs per type in parallel
    const entityRefsByType = new Map<string, Map<string, EntityRef>>();
    await Promise.all(
      Array.from(entityIdsByType.entries()).map(async ([entityType, ids]) => {
        const refMap = await fetchEntityRefs(entityType, Array.from(ids));
        entityRefsByType.set(entityType, refMap);
      })
    );

    const events: HistoryEvent[] = [];

    for (const log of auditLogs) {
      const entityRef = log.entityId
        ? entityRefsByType.get(log.entityType)?.get(log.entityId)
        : null;
      const linkType = LINK_TYPE_MAP[log.entityType];
      const changes = log.changes as Record<string, { from?: unknown; to?: unknown }> | null;
      const eventType = classifyAction(log.action);

      if (!changes || Object.keys(changes).length === 0) {
        events.push({
          id: log.id,
          type: eventType,
          action: log.action,
          date: log.timestamp.toISOString(),
          yearMonth: toYearMonth(log.timestamp),
          userId: log.userId,
          userName: log.user.name,
          entityType: log.entityType,
          entityId: log.entityId ?? null,
          entityRef: entityRef?.ref,
          entityName: entityRef?.name,
          linkType,
        });
      } else {
        for (const [field, change] of Object.entries(changes)) {
          const { from, to } = change as { from?: unknown; to?: unknown };
          events.push({
            id: `${log.id}-${field}`,
            type: eventType,
            action: log.action,
            date: log.timestamp.toISOString(),
            yearMonth: toYearMonth(log.timestamp),
            userId: log.userId,
            userName: log.user.name,
            entityType: log.entityType,
            entityId: log.entityId ?? null,
            entityRef: entityRef?.ref,
            entityName: entityRef?.name,
            field,
            from: from != null ? String(from) : null,
            to: to != null ? String(to) : null,
            linkType,
          });
        }
      }
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthMap = new Map<string, HistoryEvent[]>();
    for (const e of events) {
      if (!monthMap.has(e.yearMonth)) monthMap.set(e.yearMonth, []);
      monthMap.get(e.yearMonth)!.push(e);
    }

    const result: HistoryMonth[] = [];
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = toYearMonth(d);
      result.push({
        yearMonth: ym,
        label: toLabel(ym),
        events: monthMap.get(ym) ?? [],
      });
    }

    return jsonResponse(serialiseDates(result));
  } catch (err) {
    console.error("[GET /api/audit/history]", err);
    return errorResponse("Internal server error", 500);
  }
}
