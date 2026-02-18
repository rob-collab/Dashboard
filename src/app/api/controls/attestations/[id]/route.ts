import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const reviewSchema = z.object({
  ccroAgreement: z.boolean(),
  ccroComments: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const result = validateBody(reviewSchema, body);
    if ("error" in result) return result.error;

    // Check attestation exists
    const existing = await prisma.controlAttestation.findUnique({ where: { id } });
    if (!existing) return errorResponse("Attestation not found", 404);

    const updated = await prisma.controlAttestation.update({
      where: { id },
      data: {
        ccroReviewedById: auth.userId,
        ccroReviewedAt: new Date(),
        ccroAgreement: result.data.ccroAgreement,
        ccroComments: result.data.ccroComments ?? null,
      },
      include: {
        attestedBy: true,
        ccroReviewedBy: true,
        control: { include: { businessArea: true } },
      },
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/controls/attestations/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
