import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  message: z.string().min(1).optional(),
  type: z.enum(["info", "warning", "urgent"]).optional(),
  active: z.boolean().optional(),
  targetRoles: z.array(z.string()).optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;

    const data: Record<string, unknown> = { ...result.data };
    if (data.expiresAt) data.expiresAt = new Date(data.expiresAt as string);
    else if (data.expiresAt === null) data.expiresAt = null;

    const notification = await prisma.dashboardNotification.update({
      where: { id },
      data,
      include: { creator: true },
    });

    return jsonResponse(serialiseDates(notification));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    await prisma.dashboardNotification.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
