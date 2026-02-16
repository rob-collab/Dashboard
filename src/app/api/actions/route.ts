import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId, validateQuery, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { sendActionAssigned } from "@/lib/email";
import { ActionQuerySchema, CreateActionSchema } from "@/lib/schemas/actions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const validation = validateQuery(ActionQuerySchema, searchParams);
  if ('error' in validation) return validation.error;
  const { reportId, assignedTo, status } = validation.data;

  const where: Record<string, unknown> = {};
  if (reportId) where.reportId = reportId;
  if (assignedTo) where.assignedTo = assignedTo;
  if (status) where.status = status;

  const actions = await prisma.action.findMany({
    where,
    include: { assignee: true, creator: true, changes: { orderBy: { proposedAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  return jsonResponse(serialiseDates(actions));
}

export async function POST(request: NextRequest) {
  try {
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);

  const body = await request.json();
  const validation = validateBody(CreateActionSchema, body);
  if ('error' in validation) return validation.error;
  const data = validation.data;

  // Snapshot report period
  const report = await prisma.report.findUnique({ where: { id: data.reportId } });
  if (!report) return errorResponse(`Report not found: ${data.reportId}`, 404);

  // Verify assignee exists
  const assignee = await prisma.user.findUnique({ where: { id: data.assignedTo } });
  if (!assignee) return errorResponse(`Assigned user not found: ${data.assignedTo}`, 404);

  // Verify creator exists
  const creator = await prisma.user.findUnique({ where: { id: userId } });
  if (!creator) return errorResponse(`Current user not found in DB: ${userId}`, 404);

  const action = await prisma.action.create({
    data: {
      id: data.id,
      reportId: data.reportId,
      reportPeriod: `${report.title} — ${report.period}`,
      sectionId: data.sectionId,
      sectionTitle: data.sectionTitle,
      title: data.title,
      description: data.description,
      assignedTo: data.assignedTo,
      createdBy: userId,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    include: { assignee: true, creator: true },
  });

  // Send assignment email (fire-and-forget)
  if (action.assignee) {
    sendActionAssigned(
      {
        actionTitle: action.title,
        actionDescription: action.description,
        reportTitle: report.title,
        reportPeriod: report.period,
        sectionTitle: action.sectionTitle,
        dueDate: action.dueDate?.toISOString() ?? null,
        actionId: action.id,
      },
      { name: action.assignee.name, email: action.assignee.email }
    ).catch((err) => console.warn("[actions] email send failed:", err));
  }

  // Log audit (non-blocking — don't let audit failure break the response)
  prisma.auditLog.create({
    data: {
      userId,
      userRole: (await prisma.user.findUnique({ where: { id: userId } }))?.role ?? "VIEWER",
      action: "create_action",
      entityType: "action",
      entityId: action.id,
      reportId: data.reportId,
      changes: { title: data.title, assignedTo: data.assignedTo, dueDate: data.dueDate },
    },
  }).catch((err) => console.warn("[audit] create_action failed:", err));

  return jsonResponse(serialiseDates(action), 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/actions]", message);
    return errorResponse(`Server error: ${message}`, 500);
  }
}
