import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId, auditLog } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

// Allowed fields for section updates — prevents arbitrary data from reaching Prisma
const ALLOWED_FIELDS = new Set([
  "title", "position", "content", "layoutConfig", "styleConfig",
  "type", "templateId", "componentId",
]);
const VALID_TYPES = new Set([
  "TEXT_BLOCK", "DATA_TABLE", "CONSUMER_DUTY_DASHBOARD", "CHART",
  "CARD_GRID", "IMPORTED_COMPONENT", "TEMPLATE_INSTANCE", "ACCORDION", "IMAGE_BLOCK",
]);

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    const body = await request.json();

    // Whitelist allowed fields
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(key)) data[key] = value;
    }
    if (Object.keys(data).length === 0) return errorResponse("No valid fields to update", 400);
    if (data.type && !VALID_TYPES.has(data.type as string)) return errorResponse("Invalid section type", 400);

    const section = await prisma.section.update({ where: { id }, data });
    auditLog({ userId, action: "update_section", entityType: "section", entityId: id, changes: data });
    return jsonResponse(serialiseDates(section));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    await prisma.section.delete({ where: { id } });
    auditLog({ userId, action: "delete_section", entityType: "section", entityId: id });
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
