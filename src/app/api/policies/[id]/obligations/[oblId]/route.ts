import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  category: z.string().optional(),
  description: z.string().optional(),
  regulationRefs: z.array(z.string()).optional(),
  controlRefs: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; oblId: string }> }
) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { id: policyId, oblId } = await params;

    const existing = await prisma.policyObligation.findUnique({ where: { id: oblId } });
    if (!existing || existing.policyId !== policyId) return errorResponse("Obligation not found", 404);

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    const updated = await prisma.policyObligation.update({
      where: { id: oblId },
      data,
    });

    await prisma.policyAuditLog.create({
      data: {
        policyId,
        userId,
        action: "UPDATED_OBLIGATION",
        details: `Updated obligation ${existing.reference}`,
      },
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/policies/[id]/obligations/[oblId]]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; oblId: string }> }
) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { id: policyId, oblId } = await params;

    const existing = await prisma.policyObligation.findUnique({ where: { id: oblId } });
    if (!existing || existing.policyId !== policyId) return errorResponse("Obligation not found", 404);

    await prisma.policyObligation.delete({ where: { id: oblId } });

    await prisma.policyAuditLog.create({
      data: {
        policyId,
        userId,
        action: "REMOVED_OBLIGATION",
        details: `Removed obligation ${existing.reference}`,
      },
    });

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/policies/[id]/obligations/[oblId]]", err);
    return errorResponse("Internal server error", 500);
  }
}
