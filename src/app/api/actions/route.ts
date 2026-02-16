import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { sendActionAssigned } from "@/lib/email";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId");
  const assignedTo = searchParams.get("assignedTo");
  const status = searchParams.get("status");

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
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);

  const body = await request.json();
  const { reportId, sectionId, sectionTitle, title, description, assignedTo, dueDate } = body;

  if (!reportId || !title || !assignedTo) {
    return errorResponse("reportId, title, and assignedTo are required");
  }

  // Snapshot report period
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) return errorResponse("Report not found", 404);

  const action = await prisma.action.create({
    data: {
      id: body.id || undefined,
      reportId,
      reportPeriod: `${report.title} — ${report.period}`,
      sectionId: sectionId || null,
      sectionTitle: sectionTitle || null,
      title,
      description: description || "",
      assignedTo,
      createdBy: userId,
      dueDate: dueDate ? new Date(dueDate) : null,
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
      reportId,
      changes: { title, assignedTo, dueDate },
    },
  }).catch((err) => console.warn("[audit] create_action failed:", err));

  return jsonResponse(serialiseDates(action), 201);
}
