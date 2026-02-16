import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { timestamp: "desc" },
      take: 500,
    });
    return jsonResponse(serialiseDates(logs));
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
