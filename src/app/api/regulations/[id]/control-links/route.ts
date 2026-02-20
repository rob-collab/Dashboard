import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const bodySchema = z.object({ controlId: z.string().min(1) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const { id: regulationId } = await params;
    const body = await request.json();
    const result = validateBody(bodySchema, body);
    if ("error" in result) return result.error;

    const { controlId } = result.data;

    const regulation = await prisma.regulation.findUnique({ where: { id: regulationId } });
    if (!regulation) return errorResponse("Regulation not found", 404);

    const control = await prisma.control.findUnique({ where: { id: controlId } });
    if (!control) return errorResponse("Control not found", 404);

    const link = await prisma.regulationControlLink.upsert({
      where: { regulationId_controlId: { regulationId, controlId } },
      update: {},
      create: { regulationId, controlId, linkedBy: auth.userId },
      include: { control: { select: { id: true, controlRef: true, controlName: true } } },
    });

    return jsonResponse(serialiseDates(link), 201);
  } catch (err) {
    console.error("[POST /api/regulations/[id]/control-links]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const { id: regulationId } = await params;
    const body = await request.json();
    const result = validateBody(bodySchema, body);
    if ("error" in result) return result.error;

    const { controlId } = result.data;

    await prisma.regulationControlLink.deleteMany({ where: { regulationId, controlId } });
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/regulations/[id]/control-links]", err);
    return errorResponse("Internal server error", 500);
  }
}
