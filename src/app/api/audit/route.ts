import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { getPaginationParams, paginatedResponse } from "@/lib/schemas/pagination";

export async function GET(request: NextRequest) {
  try {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userRole, action, entityType } = body;
    if (!userId || !action || !entityType) {
      return errorResponse("userId, action, and entityType are required");
    }

    const log = await prisma.auditLog.create({
      data: {
        id: body.id || undefined,
        userId,
        userRole: userRole || "VIEWER",
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
