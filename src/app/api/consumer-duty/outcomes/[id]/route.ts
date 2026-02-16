import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.consumerDutyOutcome.findUnique({ where: { id } });
    if (!existing) return errorResponse("Outcome not found", 404);

    const { name, shortDesc, icon, ragStatus, position } = body;

    const updated = await prisma.consumerDutyOutcome.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(shortDesc !== undefined && { shortDesc }),
        ...(icon !== undefined && { icon }),
        ...(ragStatus !== undefined && { ragStatus }),
        ...(position !== undefined && { position }),
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
