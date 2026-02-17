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

    const change = await prisma.actionChange.findUnique({ where: { id: changeId } });
    if (!change) return errorResponse("Change not found", 404);
    if (change.actionId !== id) return errorResponse("Change does not belong to this action", 400);

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
    if (status === "APPROVED" && !change.isUpdate) {
      const actionUpdate: Record<string, unknown> = {};

      if (change.fieldChanged === "status") {
        if (change.newValue === "PROPOSED_CLOSED" || change.newValue === "COMPLETED") {
          actionUpdate.status = "COMPLETED";
          actionUpdate.completedAt = new Date();
        } else if (change.newValue) {
          actionUpdate.status = change.newValue;
        }
      } else if (change.fieldChanged === "dueDate" && change.newValue) {
        actionUpdate.dueDate = new Date(change.newValue);
      } else if (change.fieldChanged === "assignedTo" && change.newValue) {
        actionUpdate.assignedTo = change.newValue;
      }

      if (Object.keys(actionUpdate).length > 0) {
        const updatedAction = await prisma.action.update({
          where: { id },
          data: actionUpdate,
          include: { linkedMitigation: true },
        });

        // Sync mitigation status if needed
        if (actionUpdate.status && updatedAction.linkedMitigation) {
          const mitStatusMap: Record<string, string> = { COMPLETED: "COMPLETE", IN_PROGRESS: "IN_PROGRESS", OPEN: "OPEN", OVERDUE: "OPEN" };
          const newMitStatus = mitStatusMap[String(actionUpdate.status)] ?? "OPEN";
          if (newMitStatus !== updatedAction.linkedMitigation.status) {
            await prisma.riskMitigation.update({
              where: { id: updatedAction.linkedMitigation.id },
              data: { status: newMitStatus as "OPEN" | "IN_PROGRESS" | "COMPLETE" },
            }).catch((e) => console.error("[change→mitigation sync]", e));
          }
        }
      }
    }

    return jsonResponse(serialiseDates(updated));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
