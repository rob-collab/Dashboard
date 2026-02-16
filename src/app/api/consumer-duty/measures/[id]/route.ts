import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { UpdateMeasureSchema } from "@/lib/schemas/consumer-duty";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authResult = await requireCCRORole(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const validation = validateBody(UpdateMeasureSchema, body);
    if ('error' in validation) return validation.error;
    const data = validation.data;

    if (data.lastUpdatedAt) {
      (data as Record<string, unknown>).lastUpdatedAt = new Date(data.lastUpdatedAt);
    }

    const measure = await prisma.consumerDutyMeasure.update({
      where: { id },
      data,
      include: { metrics: true },
    });
    return jsonResponse(serialiseDates(measure));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authResult = await requireCCRORole(_req);
    if ('error' in authResult) return authResult.error;
    await prisma.consumerDutyMeasure.delete({ where: { id } });
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
