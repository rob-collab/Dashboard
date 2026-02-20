import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody, auditLog } from "@/lib/api-helpers";

const createSchema = z.object({
  permission: z.string().min(1),
  reason: z.string().min(1).max(2000),
  durationHours: z.number().int().min(1).max(168), // max 1 week
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  entityName: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return errorResponse("User not found", 404);

    // CCRO_TEAM sees all requests; others see only their own
    const where = user.role === "CCRO_TEAM" ? {} : { requesterId: userId };

    const requests = await prisma.accessRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        reviewedBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return jsonResponse(requests);
  } catch (err) {
    console.error("[GET /api/access-requests]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const body = await request.json();
    const validation = validateBody(createSchema, body);
    if ("error" in validation) return validation.error;
    const { permission, reason, durationHours, entityType, entityId, entityName } = validation.data;

    // Check for existing pending request for same permission + entity combo
    const existing = await prisma.accessRequest.findFirst({
      where: {
        requesterId: userId,
        permission,
        status: "PENDING",
        entityId: entityId ?? null,
      },
    });
    if (existing) {
      return errorResponse("You already have a pending request for this permission", 409);
    }

    const created = await prisma.accessRequest.create({
      data: {
        requesterId: userId,
        permission,
        reason,
        durationHours,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        entityName: entityName ?? null,
      },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    auditLog({
      userId,
      action: "access_request_create",
      entityType: "access_request",
      entityId: created.id,
      changes: { permission, durationHours },
    });

    return jsonResponse(created, 201);
  } catch (err) {
    console.error("[POST /api/access-requests]", err);
    return errorResponse("Internal server error", 500);
  }
}
