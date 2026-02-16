import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { sendActionReminder } from "@/lib/email";

export async function POST(request: NextRequest) {
  // Allow cron calls (no auth) or authenticated CCRO users
  const userId = getUserId(request);
  const cronSecret = request.headers.get("Authorization");
  const isCron = cronSecret === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron && !userId) {
    return errorResponse("Unauthorised", 401);
  }

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const actions = await prisma.action.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      dueDate: { lte: thirtyDaysFromNow },
    },
    include: { assignee: true, report: true },
  });

  const results: Array<{
    actionId: string;
    assignee: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const action of actions) {
    if (!action.assignee) continue;

    const result = await sendActionReminder(
      {
        actionTitle: action.title,
        actionDescription: action.description,
        reportTitle: action.report?.title ?? null,
        reportPeriod: action.report?.period ?? null,
        sectionTitle: action.sectionTitle,
        dueDate: action.dueDate?.toISOString() ?? null,
        actionId: action.id,
      },
      { name: action.assignee.name, email: action.assignee.email }
    );

    results.push({
      actionId: action.id,
      assignee: action.assignee.email,
      success: result.success,
      error: result.error,
    });
  }

  // Also mark overdue actions
  const now = new Date();
  await prisma.action.updateMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });

  // Audit log
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.auditLog.create({
      data: {
        userId,
        userRole: user?.role ?? "VIEWER",
        action: "send_reminder",
        entityType: "action",
        changes: { sent: results.filter((r) => r.success).length, total: results.length },
      },
    });
  }

  return jsonResponse({
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}
