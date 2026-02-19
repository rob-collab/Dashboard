import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateBody, auditLog, checkPermission } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createSchema = z.object({
  controlId: z.string().min(1),
  notes: z.string().nullable().optional(),
});

const deleteSchema = z.object({
  controlId: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkPermission(request, "edit:compliance");
    if (!auth.granted) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;

    const link = await prisma.regulationControlLink.create({
      data: {
        regulationId: id,
        controlId: result.data.controlId,
        notes: result.data.notes ?? null,
        linkedBy: auth.userId,
      },
      include: {
        control: {
          select: { id: true, controlRef: true, controlName: true, businessArea: true },
        },
      },
    });

    auditLog({ userId: auth.userId, action: "link_regulation_control", entityType: "regulation", entityId: id, changes: { controlId: result.data.controlId } });
    return jsonResponse(serialiseDates(link), 201);
  } catch (err) {
    console.error("[POST /api/compliance/regulations/:id/control-links]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkPermission(request, "edit:compliance");
    if (!auth.granted) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const result = validateBody(deleteSchema, body);
    if ("error" in result) return result.error;

    await prisma.regulationControlLink.delete({
      where: {
        regulationId_controlId: {
          regulationId: id,
          controlId: result.data.controlId,
        },
      },
    });

    auditLog({ userId: auth.userId, action: "unlink_regulation_control", entityType: "regulation", entityId: id, changes: { controlId: result.data.controlId } });
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/compliance/regulations/:id/control-links]", err);
    return errorResponse("Internal server error", 500);
  }
}
