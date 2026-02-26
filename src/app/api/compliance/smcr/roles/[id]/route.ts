import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateBody, auditLog, checkPermission } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  currentHolderId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "VACANT", "PENDING_APPROVAL", "NOT_REQUIRED"]).optional(),
  appointmentDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkPermission(request, "manage:smcr");
    if (!auth.granted) return auth.error;

    const { id } = await params;
    const existing = await prisma.sMFRole.findUnique({ where: { id } });
    if (!existing) return errorResponse("SMF role not found", 404);

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    const updateData: Record<string, unknown> = {};

    if (data.currentHolderId !== undefined) {
      updateData.currentHolderId = data.currentHolderId;
      // When a holder is assigned, set status to ACTIVE
      if (data.currentHolderId !== null && data.status === undefined) {
        updateData.status = "ACTIVE";
      }
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.appointmentDate !== undefined) {
      updateData.appointmentDate = data.appointmentDate ? new Date(data.appointmentDate) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.sMFRole.update({
      where: { id },
      data: updateData,
      include: {
        currentHolder: true,
        responsibilities: true,
      },
    });

    auditLog({
      userId: auth.userId,
      action: "update_smf_role",
      entityType: "smf_role",
      entityId: id,
      changes: data as Record<string, unknown>,
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/compliance/smcr/roles/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
