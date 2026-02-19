import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateBody, auditLog, checkPermission } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  lastAssessmentDate: z.string().nullable().optional(),
  assessmentResult: z.string().nullable().optional(),
  status: z.enum(["CURRENT", "DUE", "OVERDUE", "LAPSED", "REVOKED"]).optional(),
  expiryDate: z.string().nullable().optional(),
  assessorId: z.string().nullable().optional(),
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
    const existing = await prisma.certifiedPerson.findUnique({ where: { id } });
    if (!existing) return errorResponse("Certified person not found", 404);

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    const updateData: Record<string, unknown> = {};

    if (data.lastAssessmentDate !== undefined) {
      updateData.lastAssessmentDate = data.lastAssessmentDate ? new Date(data.lastAssessmentDate) : null;
    }
    if (data.assessmentResult !== undefined) updateData.assessmentResult = data.assessmentResult;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.expiryDate !== undefined) {
      updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    }
    if (data.assessorId !== undefined) updateData.assessorId = data.assessorId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.certifiedPerson.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        assessor: true,
        certificationFunction: true,
      },
    });

    auditLog({
      userId: auth.userId,
      action: "update_certified_person",
      entityType: "certified_person",
      entityId: id,
      changes: data as Record<string, unknown>,
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/compliance/smcr/certification/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
