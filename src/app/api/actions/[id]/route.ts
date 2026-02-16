import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { UpdateActionSchema } from "@/lib/schemas/actions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const existing = await prisma.action.findUnique({ where: { id } });
    if (!existing) return errorResponse("Action not found", 404);

    const body = await request.json();
    const validation = validateBody(UpdateActionSchema, body);
    if ('error' in validation) return validation.error;
    const validatedData = validation.data;

    const data: Record<string, unknown> = {};
    if (validatedData.title !== undefined) data.title = validatedData.title;
    if (validatedData.description !== undefined) data.description = validatedData.description;
    if (validatedData.status !== undefined) {
      data.status = validatedData.status;
      if (validatedData.status === "COMPLETED") data.completedAt = new Date();
    }
    if (validatedData.assignedTo !== undefined) data.assignedTo = validatedData.assignedTo;
    if (validatedData.dueDate !== undefined) data.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    if (validatedData.sectionId !== undefined) data.sectionId = validatedData.sectionId;
    if (validatedData.sectionTitle !== undefined) data.sectionTitle = validatedData.sectionTitle;

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
        action: validatedData.status === "COMPLETED" ? "complete_action" : "update_action",
        entityType: "action",
        entityId: id,
        reportId: existing.reportId,
        changes: validatedData,
      },
    }).catch((err) => console.warn("[audit] update_action failed:", err));

    return jsonResponse(serialiseDates(updated));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
