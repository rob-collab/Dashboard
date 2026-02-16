import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const action = await prisma.action.findUnique({
    where: { id },
    include: {
      assignee: true,
      creator: true,
      report: true,
      changes: {
        include: { proposer: true, reviewer: true },
        orderBy: { proposedAt: "desc" },
      },
    },
  });
  if (!action) return errorResponse("Action not found", 404);
  return jsonResponse(serialiseDates(action));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);

  const existing = await prisma.action.findUnique({ where: { id } });
  if (!existing) return errorResponse("Action not found", 404);

  const body = await request.json();
  const { title, description, status, assignedTo, dueDate, sectionId, sectionTitle } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (status !== undefined) {
    data.status = status;
    if (status === "COMPLETED") data.completedAt = new Date();
  }
  if (assignedTo !== undefined) data.assignedTo = assignedTo;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (sectionId !== undefined) data.sectionId = sectionId;
  if (sectionTitle !== undefined) data.sectionTitle = sectionTitle;

  const updated = await prisma.action.update({
    where: { id },
    data,
    include: { assignee: true, creator: true, changes: { orderBy: { proposedAt: "desc" } } },
  });

  // Audit log (non-blocking)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  prisma.auditLog.create({
    data: {
      userId,
      userRole: user?.role ?? "VIEWER",
      action: status === "COMPLETED" ? "complete_action" : "update_action",
      entityType: "action",
      entityId: id,
      reportId: existing.reportId,
      changes: body,
    },
  }).catch((err) => console.warn("[audit] update_action failed:", err));

  return jsonResponse(serialiseDates(updated));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);

  const existing = await prisma.action.findUnique({ where: { id } });
  if (!existing) return errorResponse("Action not found", 404);

  await prisma.action.delete({ where: { id } });

  // Audit log (non-blocking)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  prisma.auditLog.create({
    data: {
      userId,
      userRole: user?.role ?? "VIEWER",
      action: "delete_action",
      entityType: "action",
      entityId: id,
      reportId: existing.reportId,
    },
  }).catch((err) => console.warn("[audit] delete_action failed:", err));

  return new Response(null, { status: 204 });
}
