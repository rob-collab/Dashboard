import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const linkSchema = z.object({ riskId: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    const rawBody = await req.json();
    const validation = validateBody(linkSchema, rawBody);
    if ("error" in validation) return validation.error;
    const body = validation.data;

    // Upsert to avoid duplicate link error
    await prisma.horizonRiskLink.upsert({
      where: { horizonItemId_riskId: { horizonItemId: id, riskId: body.riskId } },
      create: { horizonItemId: id, riskId: body.riskId, linkedBy: userId },
      update: {},
    });

    const updated = await prisma.horizonItem.findUnique({
      where: { id },
      include: {
        actionLinks: {
          include: {
            action: { select: { id: true, reference: true, title: true, status: true } },
          },
        },
        riskLinks: {
          include: {
            risk: { select: { id: true, reference: true, name: true } },
          },
        },
      },
    });

    return jsonResponse(serialiseDates(updated));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const riskId = searchParams.get("riskId");
    if (!riskId) return errorResponse("riskId required", 400);

    await prisma.horizonRiskLink.deleteMany({
      where: { horizonItemId: id, riskId },
    });

    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
