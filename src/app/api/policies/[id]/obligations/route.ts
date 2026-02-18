import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  regulationRefs: z.array(z.string()).optional(),
  controlRefs: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
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
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    // Generate obligation reference within policy scope
    const existingCount = await prisma.policyObligation.count({ where: { policyId } });
    const reference = `${policy.reference}-OBL-${String(existingCount + 1).padStart(2, "0")}`;

    const obligation = await prisma.policyObligation.create({
      data: {
        policyId,
        reference,
        category: data.category,
        description: data.description,
        regulationRefs: data.regulationRefs ?? [],
        controlRefs: data.controlRefs ?? [],
        notes: data.notes ?? null,
      },
    });

    await prisma.policyAuditLog.create({
      data: {
        policyId,
        userId,
        action: "ADDED_OBLIGATION",
        details: `Added obligation ${reference}: ${data.description.slice(0, 80)}`,
      },
    });

    return jsonResponse(serialiseDates(obligation), 201);
  } catch (err) {
    console.error("[POST /api/policies/[id]/obligations]", err);
    return errorResponse("Internal server error", 500);
  }
}
