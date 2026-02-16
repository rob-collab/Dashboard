import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const component = await prisma.component.findUnique({
      where: { id },
      include: { creator: true },
    });
    if (!component) return errorResponse("Component not found", 404);
    return jsonResponse(serialiseDates(component));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authResult = await requireCCRORole(request);
    if ('error' in authResult) return authResult.error;
    const body = await request.json();
    const component = await prisma.component.update({
      where: { id },
      data: body,
      include: { creator: true },
    });
    return jsonResponse(serialiseDates(component));
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
    await prisma.component.delete({ where: { id } });
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
