import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateBody, auditLog, checkPermission } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  assignedSMFId: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkPermission(request, "manage:smcr");
    if (!auth.granted) return auth.error;

    const { id } = await params;
    const existing = await prisma.prescribedResponsibility.findUnique({ where: { id } });
    if (!existing) return errorResponse("Prescribed responsibility not found", 404);

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    const updated = await prisma.prescribedResponsibility.update({
      where: { id },
      data: {
        ...(data.assignedSMFId !== undefined && { assignedSMFId: data.assignedSMFId }),
      },
      include: {
        assignedSMF: {
          include: {
            currentHolder: true,
          },
        },
      },
    });

    auditLog({
      userId: auth.userId,
      action: "update_prescribed_responsibility",
      entityType: "prescribed_responsibility",
      entityId: id,
      changes: data as Record<string, unknown>,
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/compliance/smcr/responsibilities/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
