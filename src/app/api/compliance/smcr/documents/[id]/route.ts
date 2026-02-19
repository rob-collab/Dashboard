import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateBody, auditLog, checkPermission } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  status: z.enum(["DOC_CURRENT", "DOC_OVERDUE", "DOC_DRAFT", "DOC_NOT_STARTED"]).optional(),
  lastUpdatedAt: z.string().nullable().optional(),
  nextUpdateDue: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  storageUrl: z.string().nullable().optional(),
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
    const existing = await prisma.sMCRDocument.findUnique({ where: { id } });
    if (!existing) return errorResponse("SM&CR document not found", 404);

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.lastUpdatedAt !== undefined) {
      updateData.lastUpdatedAt = data.lastUpdatedAt ? new Date(data.lastUpdatedAt) : null;
    }
    if (data.nextUpdateDue !== undefined) {
      updateData.nextUpdateDue = data.nextUpdateDue ? new Date(data.nextUpdateDue) : null;
    }
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
    if (data.storageUrl !== undefined) updateData.storageUrl = data.storageUrl;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.sMCRDocument.update({
      where: { id },
      data: updateData,
      include: {
        owner: true,
      },
    });

    auditLog({
      userId: auth.userId,
      action: "update_smcr_document",
      entityType: "smcr_document",
      entityId: id,
      changes: data as Record<string, unknown>,
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/compliance/smcr/documents/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
