import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody, auditLog } from "@/lib/api-helpers";

const patchSchema = z.object({
  action: z.enum(["approve", "deny", "cancel"]),
  reviewNote: z.string().max(2000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const body = await request.json();
    const validation = validateBody(patchSchema, body);
    if ("error" in validation) return validation.error;
    const { action, reviewNote } = validation.data;

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id },
    });
    if (!accessRequest) return errorResponse("Access request not found", 404);

    // Cancel — only the requester can cancel their own pending request
    if (action === "cancel") {
      if (accessRequest.requesterId !== userId) {
        return errorResponse("You can only cancel your own requests", 403);
      }
      if (accessRequest.status !== "PENDING") {
        return errorResponse("Only pending requests can be cancelled", 400);
      }

      const updated = await prisma.accessRequest.update({
        where: { id },
        data: { status: "CANCELLED", updatedAt: new Date() },
        include: {
          requester: { select: { id: true, name: true, email: true, role: true } },
          reviewedBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      auditLog({
        userId,
        action: "access_request_cancel",
        entityType: "access_request",
        entityId: id,
      });

      return jsonResponse(updated);
    }

    // Approve/Deny — only CCRO_TEAM
    const reviewer = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!reviewer || reviewer.role !== "CCRO_TEAM") {
      return errorResponse("Only CCRO team can approve or deny requests", 403);
    }

    if (accessRequest.status !== "PENDING") {
      return errorResponse("Only pending requests can be reviewed", 400);
    }

    const now = new Date();

    if (action === "approve") {
      const grantedUntil = new Date(now.getTime() + accessRequest.durationHours * 60 * 60 * 1000);

      // Create or update the UserPermission grant
      await prisma.userPermission.upsert({
        where: {
          userId_permission: {
            userId: accessRequest.requesterId,
            permission: accessRequest.permission,
          },
        },
        create: {
          userId: accessRequest.requesterId,
          permission: accessRequest.permission,
          granted: true,
        },
        update: {
          granted: true,
        },
      });

      const updated = await prisma.accessRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedById: userId,
          reviewedAt: now,
          reviewNote: reviewNote ?? null,
          grantedUntil,
        },
        include: {
          requester: { select: { id: true, name: true, email: true, role: true } },
          reviewedBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      auditLog({
        userId,
        action: "access_request_approve",
        entityType: "access_request",
        entityId: id,
        changes: {
          permission: accessRequest.permission,
          grantedUntil: grantedUntil.toISOString(),
          requesterId: accessRequest.requesterId,
        },
      });

      return jsonResponse(updated);
    }

    // Deny
    const updated = await prisma.accessRequest.update({
      where: { id },
      data: {
        status: "DENIED",
        reviewedById: userId,
        reviewedAt: now,
        reviewNote: reviewNote ?? null,
      },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        reviewedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    auditLog({
      userId,
      action: "access_request_deny",
      entityType: "access_request",
      entityId: id,
      changes: { permission: accessRequest.permission, requesterId: accessRequest.requesterId },
    });

    return jsonResponse(updated);
  } catch (err) {
    console.error("[PATCH /api/access-requests/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
