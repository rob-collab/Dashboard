import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole, validateBody, auditLog } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { UpdateTemplateSchema } from "@/lib/schemas/templates";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const template = await prisma.template.findUnique({
      where: { id },
      include: { creator: true },
    });
    if (!template) return errorResponse("Template not found", 404);
    return jsonResponse(serialiseDates(template));
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
    const validation = validateBody(UpdateTemplateSchema, body);
    if ('error' in validation) return validation.error;
    const data = validation.data;

    const template = await prisma.template.update({
      where: { id },
      data,
      include: { creator: true },
    });
    auditLog({ userId: authResult.userId, action: "update_template", entityType: "template", entityId: id, changes: data as Record<string, unknown> });
    return jsonResponse(serialiseDates(template));
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
    await prisma.template.delete({ where: { id } });
    auditLog({ userId: authResult.userId, action: "delete_template", entityType: "template", entityId: id });
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
