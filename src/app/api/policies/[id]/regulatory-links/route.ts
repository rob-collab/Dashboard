import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const linkSchema = z.object({
  regulationId: z.string().min(1),
  policySections: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const unlinkSchema = z.object({
  regulationId: z.string().min(1),
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

    const regulation = await prisma.regulation.findUnique({ where: { id: data.regulationId } });
    if (!regulation) return errorResponse("Regulation not found", 404);

    const link = await prisma.policyRegulatoryLink.create({
      data: {
        policyId,
        regulationId: data.regulationId,
        policySections: data.policySections ?? null,
        notes: data.notes ?? null,
        linkedBy: userId,
      },
      include: { regulation: true },
    });

    await prisma.policyAuditLog.create({
      data: {
        policyId,
        userId,
        action: "LINKED_REGULATION",
        details: `Linked regulation ${regulation.reference}: ${regulation.name}`,
      },
    });

    return jsonResponse(serialiseDates(link), 201);
  } catch (err) {
    console.error("[POST /api/policies/[id]/regulatory-links]", err);
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
    const { regulationId } = result.data;

    const link = await prisma.policyRegulatoryLink.findUnique({
      where: { policyId_regulationId: { policyId, regulationId } },
      include: { regulation: true },
    });
    if (!link) return errorResponse("Link not found", 404);

    await prisma.policyRegulatoryLink.delete({
      where: { policyId_regulationId: { policyId, regulationId } },
    });

    await prisma.policyAuditLog.create({
      data: {
        policyId,
        userId,
        action: "UNLINKED_REGULATION",
        details: `Unlinked regulation ${link.regulation.reference}: ${link.regulation.name}`,
      },
    });

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/policies/[id]/regulatory-links]", err);
    return errorResponse("Internal server error", 500);
  }
}
