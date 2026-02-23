import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export interface RegulationHistoryEvent {
  id: string;
  type: "status_change" | "field_updated" | "control_linked" | "control_unlinked" | "policy_linked" | "policy_unlinked";
  date: string;
  userId: string;
  userName: string;
  field?: string;
  from?: string | null;
  to?: string | null;
  entityRef?: string;
  entityName?: string;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const regulation = await prisma.regulation.findUnique({ where: { id }, select: { id: true } });
    if (!regulation) return errorResponse("Regulation not found", 404);

    const [auditLogs, controlLinks, policyLinks] = await Promise.all([
      prisma.auditLog.findMany({
        where: { entityType: "regulation", entityId: id },
        include: { user: { select: { name: true } } },
        orderBy: { timestamp: "desc" },
        take: 100,
      }),
      prisma.regulationControlLink.findMany({
        where: { regulationId: id },
        include: { control: { select: { controlRef: true, controlName: true } } },
        orderBy: { linkedAt: "desc" },
      }),
      prisma.policyRegulatoryLink.findMany({
        where: { regulationId: id },
        include: { policy: { select: { reference: true, name: true } } },
        orderBy: { linkedAt: "desc" },
      }),
    ]);

    // Batch-load users for linkedBy fields
    const linkedByIds = Array.from(
      new Set([
        ...controlLinks.map((l) => l.linkedBy),
        ...policyLinks.map((l) => l.linkedBy),
      ].filter(Boolean))
    );
    const usersMap = new Map<string, string>();
    if (linkedByIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: linkedByIds } },
        select: { id: true, name: true },
      });
      for (const u of users) usersMap.set(u.id, u.name);
    }

    const events: RegulationHistoryEvent[] = [];

    // Audit log events (status/narrative/field updates)
    for (const log of auditLogs) {
      const changes = log.changes as Record<string, { from?: unknown; to?: unknown }> | null;
      if (!changes) {
        // Legacy audit log entry without field details
        events.push({
          id: log.id,
          type: "field_updated",
          date: log.timestamp.toISOString(),
          userId: log.userId,
          userName: log.user.name,
          field: log.action,
        });
        continue;
      }
      // Emit one event per changed field
      for (const [field, change] of Object.entries(changes)) {
        const { from, to } = change as { from?: unknown; to?: unknown };
        const type = field === "complianceStatus" ? "status_change" : "field_updated";
        events.push({
          id: `${log.id}-${field}`,
          type,
          date: log.timestamp.toISOString(),
          userId: log.userId,
          userName: log.user.name,
          field,
          from: from != null ? String(from) : null,
          to: to != null ? String(to) : null,
        });
      }
    }

    // Control link events
    for (const link of controlLinks) {
      events.push({
        id: `ctrl-link-${link.id}`,
        type: "control_linked",
        date: link.linkedAt.toISOString(),
        userId: link.linkedBy,
        userName: usersMap.get(link.linkedBy) ?? link.linkedBy,
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
        userId: link.linkedBy,
        userName: usersMap.get(link.linkedBy) ?? link.linkedBy,
        entityRef: link.policy?.reference,
        entityName: link.policy?.name,
      });
    }

    // Sort all events newest-first
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return jsonResponse(serialiseDates(events.slice(0, 50)));
  } catch (err) {
    console.error("[GET /api/compliance/regulations/:id/history]", err);
    return errorResponse("Internal server error", 500);
  }
}
