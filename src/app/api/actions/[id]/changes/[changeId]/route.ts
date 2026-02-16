import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; changeId: string }> }
) {
  try {
    const { id, changeId } = await params;
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

  // Only CCRO_TEAM can approve/reject
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "CCRO_TEAM") {
    return errorResponse("Only CCRO Team members can approve or reject changes", 403);
  }

  const change = await prisma.actionChange.findUnique({ where: { id: changeId } });
  if (!change || change.actionId !== id) {
    return errorResponse("Change not found", 404);
  }
  if (change.status !== "PENDING") {
    return errorResponse("Change has already been reviewed");
  }

  const body = await request.json();
  const { status, reviewNote } = body;
  if (!status || !["APPROVED", "REJECTED"].includes(status)) {
    return errorResponse("status must be APPROVED or REJECTED");
  }

  // Update the change record
  const updated = await prisma.actionChange.update({
    where: { id: changeId },
    data: {
      status,
      reviewedBy: userId,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    },
    include: { proposer: true, reviewer: true },
  });

  // If approved, apply the change to the action
  if (status === "APPROVED" && change.newValue !== null) {
    const field = change.fieldChanged;
    const updateData: Record<string, unknown> = {};

    if (field === "dueDate") {
      updateData[field] = new Date(change.newValue);
    } else if (field === "status") {
      updateData[field] = change.newValue;
      if (change.newValue === "COMPLETED") updateData.completedAt = new Date();
    } else {
      updateData[field] = change.newValue;
    }

    await prisma.action.update({
      where: { id },
      data: updateData,
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      userRole: user.role,
      action: status === "APPROVED" ? "approve_change" : "reject_change",
      entityType: "action_change",
      entityId: changeId,
      reportId: (await prisma.action.findUnique({ where: { id } }))?.reportId ?? null,
      changes: { fieldChanged: change.fieldChanged, status, reviewNote },
    },
  });

  return jsonResponse(serialiseDates(updated));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
