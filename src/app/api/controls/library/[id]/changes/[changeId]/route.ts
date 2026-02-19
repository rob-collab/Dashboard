import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, checkPermission, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
});

/** Map fieldChanged values to the Prisma field name on the Control model */
const FIELD_TO_PRISMA: Record<string, string> = {
  controlName: "controlName",
  controlDescription: "controlDescription",
  controlOwnerId: "controlOwnerId",
  consumerDutyOutcome: "consumerDutyOutcome",
  controlFrequency: "controlFrequency",
  controlType: "controlType",
  internalOrThirdParty: "internalOrThirdParty",
  standingComments: "standingComments",
  businessAreaId: "businessAreaId",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; changeId: string }> },
) {
  try {
    const auth = await checkPermission(request, "can:approve-entities");
    if (!auth.granted) return auth.error;
    const { id, changeId } = await params;

    const body = await request.json();
    const result = validateBody(reviewSchema, body);
    if ("error" in result) return result.error;

    // Verify change exists and belongs to this control
    const existing = await prisma.controlChange.findUnique({ where: { id: changeId } });
    if (!existing || existing.controlId !== id) {
      return errorResponse("Change not found", 404);
    }
    if (existing.status !== "PENDING") {
      return errorResponse("Change has already been reviewed", 400);
    }

    // Update the change record
    const updated = await prisma.controlChange.update({
      where: { id: changeId },
      data: {
        status: result.data.status,
        reviewedBy: auth.userId,
        reviewedAt: new Date(),
        reviewNote: result.data.reviewNote ?? null,
      },
      include: { proposer: true, reviewer: true },
    });

    // If APPROVED, apply the field change to the Control record
    if (result.data.status === "APPROVED") {
      const prismaField = FIELD_TO_PRISMA[existing.fieldChanged];
      if (prismaField && existing.newValue !== null) {
        await prisma.control.update({
          where: { id },
          data: { [prismaField]: existing.newValue },
        });
      }
    }

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/controls/library/:id/changes/:changeId]", err);
    return errorResponse("Internal server error", 500);
  }
}
