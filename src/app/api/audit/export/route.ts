import { prisma, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { timestamp: "desc" },
    });

    const header = "Timestamp,User,Role,Action,Entity Type,Entity ID,Report ID,Changes,IP Address\n";
    const rows = logs.map((l) => {
      const changes = l.changes ? JSON.stringify(l.changes).replace(/"/g, '""') : "";
      return [
        l.timestamp.toISOString(),
        l.user.name,
        l.userRole,
        l.action,
        l.entityType,
        l.entityId ?? "",
        l.reportId ?? "",
        `"${changes}"`,
        l.ipAddress ?? "",
      ].join(",");
    });

    const csv = header + rows.join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return errorResponse("Failed to export audit logs", 500);
  }
}
