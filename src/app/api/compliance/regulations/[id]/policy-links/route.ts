import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateBody, auditLog, checkPermission } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createSchema = z.object({
  policyId: z.string().min(1),
  policySections: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const deleteSchema = z.object({
  policyId: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkPermission(request, "edit:compliance");
    if (!auth.granted) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;

    const link = await prisma.policyRegulatoryLink.create({
      data: {
        regulationId: id,
        policyId: result.data.policyId,
        policySections: result.data.policySections ?? null,
        notes: result.data.notes ?? null,
        linkedBy: auth.userId,
      },
      include: {
        policy: true,
      },
    });

    auditLog({ userId: auth.userId, action: "link_regulation_policy", entityType: "regulation", entityId: id, changes: { policyId: result.data.policyId } });
    return jsonResponse(serialiseDates(link), 201);
  } catch (err) {
    console.error("[POST /api/compliance/regulations/:id/policy-links]", err);
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

    await prisma.policyRegulatoryLink.delete({
      where: {
        policyId_regulationId: {
          policyId: result.data.policyId,
          regulationId: id,
        },
      },
    });

    auditLog({ userId: auth.userId, action: "unlink_regulation_policy", entityType: "regulation", entityId: id, changes: { policyId: result.data.policyId } });
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/compliance/regulations/:id/policy-links]", err);
    return errorResponse("Internal server error", 500);
  }
}
