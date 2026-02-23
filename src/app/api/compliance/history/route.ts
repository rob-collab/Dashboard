import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export interface ComplianceHistoryEvent {
  id: string;
  type: "status_change" | "field_updated" | "control_linked" | "policy_linked" | "control_tested";
  date: string;
  yearMonth: string; // "YYYY-MM"
  userId: string;
  userName: string;
  regulationId?: string;
  regulationRef?: string;
  regulationName?: string;
  field?: string;
  from?: string | null;
  to?: string | null;
  entityRef?: string;
  entityName?: string;
  testResult?: string;
}

export interface ComplianceHistoryMonth {
  yearMonth: string; // "YYYY-MM"
  label: string;    // "Jan 2026"
  events: ComplianceHistoryEvent[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const months = Math.min(parseInt(url.searchParams.get("months") ?? "12"), 24);

    const since = new Date();
    since.setMonth(since.getMonth() - months);

    // Fetch audit logs, recent link events, all regulation-control links (for test result mapping)
    const [auditLogs, recentControlLinks, policyLinks, allRegControlLinks] = await Promise.all([
      prisma.auditLog.findMany({
        where: { entityType: "regulation", timestamp: { gte: since } },
        include: { user: { select: { name: true } } },
        orderBy: { timestamp: "desc" },
        take: 500,
      }),
      prisma.regulationControlLink.findMany({
        where: { linkedAt: { gte: since } },
        include: {
          control: { select: { controlRef: true, controlName: true } },
          regulation: { select: { id: true, reference: true, name: true } },
        },
        orderBy: { linkedAt: "desc" },
      }),
      prisma.policyRegulatoryLink.findMany({
        where: { linkedAt: { gte: since } },
        include: {
          policy: { select: { reference: true, name: true } },
          regulation: { select: { id: true, reference: true, name: true } },
        },
        orderBy: { linkedAt: "desc" },
      }),
      // All links (not just recent) — needed to map test results back to regulations
      prisma.regulationControlLink.findMany({
        select: {
          controlId: true,
          regulationId: true,
          regulation: { select: { id: true, reference: true, name: true } },
        },
      }),
    ]);

    // Build control → regulation map (one control can link to multiple regulations)
    const controlToRegs = new Map<string, Array<{ id: string; reference: string; name: string }>>();
    for (const link of allRegControlLinks) {
      if (!controlToRegs.has(link.controlId)) controlToRegs.set(link.controlId, []);
      if (link.regulation) controlToRegs.get(link.controlId)!.push(link.regulation);
    }

    const allControlIds = Array.from(controlToRegs.keys());

    // Fetch test results for all regulation-linked controls within the period
    const testResults = allControlIds.length > 0
      ? await prisma.controlTestResult.findMany({
          where: {
            testedDate: { gte: since },
            scheduleEntry: { controlId: { in: allControlIds } },
          },
          include: {
            testedBy: { select: { id: true, name: true } },
            scheduleEntry: {
              select: {
                controlId: true,
                control: { select: { controlRef: true, controlName: true } },
              },
            },
          },
          orderBy: { testedDate: "desc" },
          take: 500,
        })
      : [];

    const events: ComplianceHistoryEvent[] = [];

    // Audit log events — batch-load regulation names for entity IDs
    const regulationIdsSet = new Set(auditLogs.map((l) => l.entityId).filter(Boolean) as string[]);
    const regulationIds = Array.from(regulationIdsSet);
    const regulationsMap = new Map<string, { id: string; reference: string; name: string }>();
    if (regulationIds.length > 0) {
      const regs = await prisma.regulation.findMany({
        where: { id: { in: regulationIds } },
        select: { id: true, reference: true, name: true },
      });
      for (const r of regs) regulationsMap.set(r.id, r);
    }

    for (const log of auditLogs) {
      const reg = log.entityId ? regulationsMap.get(log.entityId) : null;
      const changes = log.changes as Record<string, { from?: unknown; to?: unknown }> | null;

      if (!changes) {
        events.push({
          id: log.id,
          type: "field_updated",
          date: log.timestamp.toISOString(),
          yearMonth: toYearMonth(log.timestamp),
          userId: log.userId,
          userName: log.user.name,
          regulationId: reg?.id,
          regulationRef: reg?.reference,
          regulationName: reg?.name,
          field: log.action,
        });
        continue;
      }

      for (const [field, change] of Object.entries(changes)) {
        const { from, to } = change as { from?: unknown; to?: unknown };
        events.push({
          id: `${log.id}-${field}`,
          type: field === "complianceStatus" ? "status_change" : "field_updated",
          date: log.timestamp.toISOString(),
          yearMonth: toYearMonth(log.timestamp),
          userId: log.userId,
          userName: log.user.name,
          regulationId: reg?.id,
          regulationRef: reg?.reference,
          regulationName: reg?.name,
          field,
          from: from != null ? String(from) : null,
          to: to != null ? String(to) : null,
        });
      }
    }

    // Batch-load users for linkedBy fields
    const linkedByUserIds = Array.from(
      new Set([
        ...recentControlLinks.map((l) => l.linkedBy),
        ...policyLinks.map((l) => l.linkedBy),
      ].filter(Boolean))
    );
    const usersMap = new Map<string, string>();
    if (linkedByUserIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: linkedByUserIds } },
        select: { id: true, name: true },
      });
      for (const u of users) usersMap.set(u.id, u.name);
    }

    // Control link events (only recently linked)
    for (const link of recentControlLinks) {
      events.push({
        id: `ctrl-link-${link.id}`,
        type: "control_linked",
        date: link.linkedAt.toISOString(),
        yearMonth: toYearMonth(link.linkedAt),
        userId: link.linkedBy,
        userName: usersMap.get(link.linkedBy) ?? link.linkedBy,
        regulationId: link.regulation?.id,
        regulationRef: link.regulation?.reference,
        regulationName: link.regulation?.name,
        entityRef: link.control?.controlRef,
        entityName: link.control?.controlName,
      });
    }

    // Policy link events
    for (const link of policyLinks) {
      events.push({
        id: `pol-link-${link.id}`,
        type: "policy_linked",
        date: link.linkedAt.toISOString(),
        yearMonth: toYearMonth(link.linkedAt),
        userId: link.linkedBy,
        userName: usersMap.get(link.linkedBy) ?? link.linkedBy,
        regulationId: link.regulation?.id,
        regulationRef: link.regulation?.reference,
        regulationName: link.regulation?.name,
        entityRef: link.policy?.reference,
        entityName: link.policy?.name,
      });
    }

    // Control test result events — emit one event per regulation the control is linked to
    for (const tr of testResults) {
      const controlId = tr.scheduleEntry?.controlId;
      const ctrl = tr.scheduleEntry?.control;
      if (!controlId) continue;
      const regs = controlToRegs.get(controlId) ?? [];
      // If no regulation link, still emit as an unattributed test event (first entry only)
      const regEntries = regs.length > 0 ? regs : [undefined];
      for (const reg of regEntries) {
        events.push({
          id: `test-${tr.id}${reg ? `-${reg.id}` : ""}`,
          type: "control_tested",
          date: tr.testedDate.toISOString(),
          yearMonth: toYearMonth(tr.testedDate),
          userId: tr.testedById,
          userName: tr.testedBy?.name ?? tr.testedById,
          regulationId: reg?.id,
          regulationRef: reg?.reference,
          regulationName: reg?.name,
          entityRef: ctrl?.controlRef,
          entityName: ctrl?.controlName,
          testResult: tr.result,
        });
      }
    }

    // Sort all events newest-first
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Group by year-month
    const monthMap = new Map<string, ComplianceHistoryEvent[]>();
    for (const e of events) {
      if (!monthMap.has(e.yearMonth)) monthMap.set(e.yearMonth, []);
      monthMap.get(e.yearMonth)!.push(e);
    }

    // Build sorted month list (newest first), including empty months within range
    const result: ComplianceHistoryMonth[] = [];
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
    console.error("[GET /api/compliance/history]", err);
    return errorResponse("Internal server error", 500);
  }
}
