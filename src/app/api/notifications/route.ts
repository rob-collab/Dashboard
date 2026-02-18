import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createSchema = z.object({
  message: z.string().min(1),
  type: z.enum(["info", "warning", "urgent"]).default("info"),
  active: z.boolean().default(true),
  targetRoles: z.array(z.string()).default([]),
  expiresAt: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const notifications = await prisma.dashboardNotification.findMany({
      include: { creator: true },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(notifications.map(serialiseDates));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;

    const notification = await prisma.dashboardNotification.create({
      data: {
        message: result.data.message,
        type: result.data.type,
        active: result.data.active,
        targetRoles: result.data.targetRoles,
        createdBy: userId,
        expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null,
      },
      include: { creator: true },
    });

    return jsonResponse(serialiseDates(notification), 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
