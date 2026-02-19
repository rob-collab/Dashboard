import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, checkPermission, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; changeId: string }> }
) {
  try {
    const auth = await checkPermission(request, "can:approve-entities");
    if (!auth.granted) return auth.error;
    const { userId } = auth;

    const { id, changeId } = await params;

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;

    const change = await prisma.riskChange.findUnique({ where: { id: changeId } });
    if (!change || change.riskId !== id) return errorResponse("Change not found", 404);
    if (change.status !== "PENDING") return errorResponse("Change already reviewed", 400);

    const updated = await prisma.riskChange.update({
      where: { id: changeId },
      data: {
        status: result.data.status,
        reviewedBy: userId,
        reviewNote: result.data.reviewNote ?? null,
      },
      include: { proposer: true, reviewer: true },
    });

    // If approved, apply the change to the risk
    if (result.data.status === "APPROVED") {
      const field = change.fieldChanged;
      const value = change.newValue;

      // Build the update payload — handle numeric and string fields
      const numericFields = ["inherentLikelihood", "inherentImpact", "residualLikelihood", "residualImpact", "reviewFrequencyDays"];
      const updateData: Record<string, unknown> = {};

      if (numericFields.includes(field)) {
        updateData[field] = value ? parseInt(value, 10) : null;
      } else if (field === "reviewRequested") {
        updateData[field] = value === "true";
      } else {
        updateData[field] = value;
      }

      updateData.updatedBy = userId;
      updateData.updatedAt = new Date();

      await prisma.risk.update({
        where: { id },
        data: updateData,
      });
    }

    return jsonResponse(serialiseDates(updated));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
