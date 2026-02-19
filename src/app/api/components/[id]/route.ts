import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole, auditLog } from "@/lib/api-helpers";
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

const ALLOWED_COMPONENT_FIELDS = new Set([
  "name", "description", "category", "htmlContent", "cssContent",
  "jsContent", "version", "sanitized",
]);

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authResult = await requireCCRORole(request);
    if ('error' in authResult) return authResult.error;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_COMPONENT_FIELDS.has(key)) data[key] = value;
    }
    if (Object.keys(data).length === 0) return errorResponse("No valid fields to update", 400);

    const component = await prisma.component.update({
      where: { id },
      data,
      include: { creator: true },
    });
    auditLog({ userId: authResult.userId, action: "update_component", entityType: "component", entityId: id, changes: data });
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
    auditLog({ userId: authResult.userId, action: "delete_component", entityType: "component", entityId: id });
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
