import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authResult = await requireCCRORole(request);
    if ('error' in authResult) return authResult.error;
    const body = await request.json();
    const mi = await prisma.consumerDutyMI.update({ where: { id }, data: body });
    return jsonResponse(serialiseDates(mi));
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
    await prisma.consumerDutyMI.delete({ where: { id } });
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
