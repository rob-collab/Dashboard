import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  shortName: z.string().optional().nullable(),
  body: z.string().optional(),
  type: z.enum(["HANDBOOK_RULE", "PRINCIPLE", "LEGISLATION", "STATUTORY_INSTRUMENT", "GUIDANCE", "INDUSTRY_CODE"]).optional(),
  provisions: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    const regulation = await prisma.regulation.findUnique({
      where: { id },
      include: { policyLinks: { include: { policy: true } } },
    });

    if (!regulation) return errorResponse("Regulation not found", 404);
    return jsonResponse(serialiseDates(regulation));
  } catch (err) {
    console.error("[GET /api/regulations/[id]]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const existing = await prisma.regulation.findUnique({ where: { id } });
    if (!existing) return errorResponse("Regulation not found", 404);

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;

    const updated = await prisma.regulation.update({
      where: { id },
      data: result.data,
      include: { _count: { select: { policyLinks: true } } },
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/regulations/[id]]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const existing = await prisma.regulation.findUnique({ where: { id } });
    if (!existing) return errorResponse("Regulation not found", 404);

    // Check if linked to any policies
    const linkCount = await prisma.policyRegulatoryLink.count({ where: { regulationId: id } });
    if (linkCount > 0) {
      return errorResponse(`Cannot delete regulation linked to ${linkCount} policies. Unlink first.`, 400);
    }

    await prisma.regulation.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/regulations/[id]]", err);
    return errorResponse("Internal server error", 500);
  }
}
