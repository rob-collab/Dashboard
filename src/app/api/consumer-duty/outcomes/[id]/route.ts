import { NextRequest, NextResponse } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { UpdateOutcomeSchema } from "@/lib/schemas/consumer-duty";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireCCRORole(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;
    const body = await request.json();
    const validation = validateBody(UpdateOutcomeSchema, body);
    if ('error' in validation) return validation.error;
    const data = validation.data;

    const existing = await prisma.consumerDutyOutcome.findUnique({ where: { id } });
    if (!existing) return errorResponse("Outcome not found", 404);

    const updated = await prisma.consumerDutyOutcome.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.shortDesc !== undefined && { shortDesc: data.shortDesc }),
        ...(data.detailedDescription !== undefined && { detailedDescription: data.detailedDescription }),
        ...(data.previousRAG !== undefined && { previousRAG: data.previousRAG }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.ragStatus !== undefined && { ragStatus: data.ragStatus }),
        ...(data.position !== undefined && { position: data.position }),
      },
      include: {
        measures: { orderBy: { position: "asc" }, include: { metrics: true } },
      },
    });

    return jsonResponse(serialiseDates(updated));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireCCRORole(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;

    const existing = await prisma.consumerDutyOutcome.findUnique({ where: { id } });
    if (!existing) return errorResponse("Outcome not found", 404);

    await prisma.consumerDutyOutcome.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
