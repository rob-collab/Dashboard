import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole, validateBody, auditLog } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { CreateTemplateSchema } from "@/lib/schemas/templates";

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      include: { creator: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(serialiseDates(templates));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireCCRORole(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.userId;
    if (!userId) return errorResponse("Unauthorised", 401);

    const body = await request.json();
    const validation = validateBody(CreateTemplateSchema, body);
    if ('error' in validation) return validation.error;
    const data = validation.data;

    const template = await prisma.template.create({
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        category: data.category,
        thumbnailUrl: data.thumbnailUrl,
        layoutConfig: data.layoutConfig,
        styleConfig: data.styleConfig,
        contentSchema: data.contentSchema,
        sectionType: data.sectionType,
        createdBy: userId,
        isGlobal: data.isGlobal,
        version: data.version,
      },
      include: { creator: true },
    });
    auditLog({ userId, action: "create_template", entityType: "template", entityId: template.id, changes: { name: data.name } });
    return jsonResponse(serialiseDates(template), 201);
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
