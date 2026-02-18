import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const linkSchema = z.object({
  controlId: z.string().min(1),
  notes: z.string().optional().nullable(),
});

const unlinkSchema = z.object({
  controlId: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { id: policyId } = await params;
    const policy = await prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) return errorResponse("Policy not found", 404);

    const body = await request.json();
    const result = validateBody(linkSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    const control = await prisma.control.findUnique({ where: { id: data.controlId } });
    if (!control) return errorResponse("Control not found", 404);

    const link = await prisma.policyControlLink.create({
      data: {
        policyId,
        controlId: data.controlId,
        notes: data.notes ?? null,
        linkedBy: userId,
      },
      include: {
        control: {
          include: { businessArea: true, controlOwner: true, testingSchedule: { include: { testResults: true } } },
        },
      },
    });

    await prisma.policyAuditLog.create({
      data: {
        policyId,
        userId,
        action: "LINKED_CONTROL",
        details: `Linked control ${control.controlRef}: ${control.controlName}`,
      },
    });

    return jsonResponse(serialiseDates(link), 201);
  } catch (err) {
    console.error("[POST /api/policies/[id]/control-links]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { id: policyId } = await params;

    const body = await request.json();
    const result = validateBody(unlinkSchema, body);
    if ("error" in result) return result.error;
    const { controlId } = result.data;

    const link = await prisma.policyControlLink.findUnique({
      where: { policyId_controlId: { policyId, controlId } },
      include: { control: true },
    });
    if (!link) return errorResponse("Link not found", 404);

    await prisma.policyControlLink.delete({
      where: { policyId_controlId: { policyId, controlId } },
    });

    await prisma.policyAuditLog.create({
      data: {
        policyId,
        userId,
        action: "UNLINKED_CONTROL",
        details: `Unlinked control ${link.control.controlRef}: ${link.control.controlName}`,
      },
    });

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/policies/[id]/control-links]", err);
    return errorResponse("Internal server error", 500);
  }
}
