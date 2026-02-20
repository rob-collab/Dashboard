import { NextRequest } from "next/server";
import { prisma, getUserId, jsonResponse, errorResponse, auditLog } from "@/lib/api-helpers";

/**
 * POST /api/access-requests/expiry-check
 * Revokes expired access grants. Called during store hydration.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const now = new Date();

    // Find all APPROVED requests where grantedUntil has passed
    const expired = await prisma.accessRequest.findMany({
      where: {
        status: "APPROVED",
        grantedUntil: { lt: now },
      },
    });

    let count = 0;
    for (const req of expired) {
      // Mark access request as expired
      await prisma.accessRequest.update({
        where: { id: req.id },
        data: { status: "EXPIRED" },
      });

      // Revoke the user permission
      await prisma.userPermission.deleteMany({
        where: {
          userId: req.requesterId,
          permission: req.permission,
        },
      });

      auditLog({
        userId,
        action: "access_request_expire",
        entityType: "access_request",
        entityId: req.id,
        changes: {
          permission: req.permission,
          requesterId: req.requesterId,
          grantedUntil: req.grantedUntil?.toISOString(),
        },
      });

      count++;
    }

    return jsonResponse({ expired: count });
  } catch (err) {
    console.error("[POST /api/access-requests/expiry-check]", err);
    return errorResponse("Internal server error", 500);
  }
}
