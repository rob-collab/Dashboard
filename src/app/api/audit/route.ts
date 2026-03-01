import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId, getAuthUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { getPaginationParams, paginatedResponse } from "@/lib/schemas/pagination";

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { searchParams } = new URL(request.url);
    const { skip, take, page, limit } = getPaginationParams(searchParams);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { user: true },
        orderBy: { timestamp: "desc" },
        skip,
        take,
      }),
      prisma.auditLog.count(),
    ]);

    return jsonResponse(paginatedResponse(serialiseDates(logs), total, page, limit));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

// Audit logs are immutable — deletion is not permitted
export async function DELETE() {
  return errorResponse("Audit logs are immutable and cannot be deleted", 405);
}

export async function PUT() {
  return errorResponse("Audit logs are immutable and cannot be modified", 405);
}

export async function PATCH() {
  return errorResponse("Audit logs are immutable and cannot be modified", 405);
}

export async function POST(request: NextRequest) {
  try {
    // Derive userId from session headers — never trust client-supplied identity
    const authUserId = getAuthUserId(request);
    const userId = authUserId || getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    // Look up the user's actual role
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    const body = await request.json();
    const { action, entityType } = body;
    if (!action || !entityType) {
      return errorResponse("action and entityType are required", 400);
    }

    const log = await prisma.auditLog.create({
      data: {
        id: body.id || undefined,
        userId,
        userRole: user?.role ?? "VIEWER",
        action,
        entityType,
        entityId: body.entityId ?? null,
        changes: body.changes ?? null,
        reportId: body.reportId ?? null,
        ipAddress: body.ipAddress ?? null,
        userAgent: body.userAgent ?? null,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      },
    });
    return jsonResponse(serialiseDates(log), 201);
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
