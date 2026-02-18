import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, validateBody, requireCCRORole, getAuthUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { UpdateUserSchema } from "@/lib/schemas/users";
import { Prisma } from "@/generated/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorResponse("User not found", 404);
    return jsonResponse(serialiseDates(user));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateBody(UpdateUserSchema, body);
    if ('error' in validation) return validation.error;
    const data = validation.data;

    const user = await prisma.user.update({ where: { id }, data });
    return jsonResponse(serialiseDates(user));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

// All FK relations that reference User and need reassignment before deletion
const REASSIGNMENT_MAP: Array<{
  model: string;
  field: string;
  update: (tx: Prisma.TransactionClient, userId: string, targetId: string) => Promise<{ count: number }>;
}> = [
  { model: "Action", field: "assignedTo", update: (tx, uid, tid) => tx.action.updateMany({ where: { assignedTo: uid }, data: { assignedTo: tid } }) },
  { model: "Action", field: "createdBy", update: (tx, uid, tid) => tx.action.updateMany({ where: { createdBy: uid }, data: { createdBy: tid } }) },
  { model: "ActionChange", field: "proposedBy", update: (tx, uid, tid) => tx.actionChange.updateMany({ where: { proposedBy: uid }, data: { proposedBy: tid } }) },
  { model: "ActionChange", field: "reviewedBy", update: (tx, uid, tid) => tx.actionChange.updateMany({ where: { reviewedBy: uid }, data: { reviewedBy: tid } }) },
  { model: "Risk", field: "ownerId", update: (tx, uid, tid) => tx.risk.updateMany({ where: { ownerId: uid }, data: { ownerId: tid } }) },
  { model: "Risk", field: "createdBy", update: (tx, uid, tid) => tx.risk.updateMany({ where: { createdBy: uid }, data: { createdBy: tid } }) },
  { model: "Risk", field: "updatedBy", update: (tx, uid, tid) => tx.risk.updateMany({ where: { updatedBy: uid }, data: { updatedBy: tid } }) },
  { model: "Control", field: "controlOwnerId", update: (tx, uid, tid) => tx.control.updateMany({ where: { controlOwnerId: uid }, data: { controlOwnerId: tid } }) },
  { model: "Control", field: "createdById", update: (tx, uid, tid) => tx.control.updateMany({ where: { createdById: uid }, data: { createdById: tid } }) },
  { model: "ControlAttestation", field: "attestedById", update: (tx, uid, tid) => tx.controlAttestation.updateMany({ where: { attestedById: uid }, data: { attestedById: tid } }) },
  { model: "ControlAttestation", field: "ccroReviewedById", update: (tx, uid, tid) => tx.controlAttestation.updateMany({ where: { ccroReviewedById: uid }, data: { ccroReviewedById: tid } }) },
  { model: "ControlChange", field: "proposedBy", update: (tx, uid, tid) => tx.controlChange.updateMany({ where: { proposedBy: uid }, data: { proposedBy: tid } }) },
  { model: "ControlChange", field: "reviewedBy", update: (tx, uid, tid) => tx.controlChange.updateMany({ where: { reviewedBy: uid }, data: { reviewedBy: tid } }) },
  { model: "TestingScheduleEntry", field: "assignedTesterId", update: (tx, uid, tid) => tx.testingScheduleEntry.updateMany({ where: { assignedTesterId: uid }, data: { assignedTesterId: tid } }) },
  { model: "TestingScheduleEntry", field: "addedById", update: (tx, uid, tid) => tx.testingScheduleEntry.updateMany({ where: { addedById: uid }, data: { addedById: tid } }) },
  { model: "ControlTestResult", field: "testedById", update: (tx, uid, tid) => tx.controlTestResult.updateMany({ where: { testedById: uid }, data: { testedById: tid } }) },
  { model: "ControlTestResult", field: "updatedById", update: (tx, uid, tid) => tx.controlTestResult.updateMany({ where: { updatedById: uid }, data: { updatedById: tid } }) },
  { model: "Report", field: "createdBy", update: (tx, uid, tid) => tx.report.updateMany({ where: { createdBy: uid }, data: { createdBy: tid } }) },
  { model: "ReportVersion", field: "publishedBy", update: (tx, uid, tid) => tx.reportVersion.updateMany({ where: { publishedBy: uid }, data: { publishedBy: tid } }) },
  { model: "Template", field: "createdBy", update: (tx, uid, tid) => tx.template.updateMany({ where: { createdBy: uid }, data: { createdBy: tid } }) },
  { model: "Component", field: "createdBy", update: (tx, uid, tid) => tx.component.updateMany({ where: { createdBy: uid }, data: { createdBy: tid } }) },
  { model: "Policy", field: "ownerId", update: (tx, uid, tid) => tx.policy.updateMany({ where: { ownerId: uid }, data: { ownerId: tid } }) },
  { model: "ConsumerDutyMeasure", field: "updatedById", update: (tx, uid, tid) => tx.consumerDutyMeasure.updateMany({ where: { updatedById: uid }, data: { updatedById: tid } }) },
  { model: "RiskAcceptance", field: "proposerId", update: (tx, uid, tid) => tx.riskAcceptance.updateMany({ where: { proposerId: uid }, data: { proposerId: tid } }) },
  { model: "RiskAcceptance", field: "approverId", update: (tx, uid, tid) => tx.riskAcceptance.updateMany({ where: { approverId: uid }, data: { approverId: tid } }) },
  { model: "RiskAcceptanceComment", field: "userId", update: (tx, uid, tid) => tx.riskAcceptanceComment.updateMany({ where: { userId: uid }, data: { userId: tid } }) },
  { model: "RiskAcceptanceHistory", field: "userId", update: (tx, uid, tid) => tx.riskAcceptanceHistory.updateMany({ where: { userId: uid }, data: { userId: tid } }) },
  { model: "QuarterlySummary", field: "authorId", update: (tx, uid, tid) => tx.quarterlySummary.updateMany({ where: { authorId: uid }, data: { authorId: tid } }) },
  { model: "QuarterlySummary", field: "approvedById", update: (tx, uid, tid) => tx.quarterlySummary.updateMany({ where: { approvedById: uid }, data: { approvedById: tid } }) },
  { model: "ExcoViewConfig", field: "configuredById", update: (tx, uid, tid) => tx.excoViewConfig.updateMany({ where: { configuredById: uid }, data: { configuredById: tid } }) },
  { model: "AuditLog", field: "userId", update: (tx, uid, tid) => tx.auditLog.updateMany({ where: { userId: uid }, data: { userId: tid } }) },
];

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authResult = await requireCCRORole(request);
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const { reassignTo, reassignments } = body as {
      reassignTo: string;
      reassignments?: Record<string, string>;
    };

    if (!reassignTo) return errorResponse("reassignTo is required", 400);

    // Verify both users exist
    const [targetUser, deletingUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: reassignTo } }),
      prisma.user.findUnique({ where: { id } }),
    ]);

    if (!targetUser) return errorResponse("Target reassignment user not found", 404);
    if (!deletingUser) return errorResponse("User to delete not found", 404);
    if (id === reassignTo) return errorResponse("Cannot reassign to the same user being deleted", 400);

    const actorId = getAuthUserId(request) || authResult.userId;
    const reassigned: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {
      // Reassign all FK references
      for (const entry of REASSIGNMENT_MAP) {
        const key = `${entry.model}.${entry.field}`;
        const targetId = reassignments?.[key] || reassignTo;
        const result = await entry.update(tx, id, targetId);
        if (result.count > 0) {
          reassigned[key] = result.count;
        }
      }

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: actorId,
          userRole: "CCRO_TEAM",
          action: "bulk_reassignment_and_delete",
          entityType: "user",
          entityId: id,
          changes: {
            deletedUser: { id: deletingUser.id, name: deletingUser.name, email: deletingUser.email },
            defaultReassignTo: { id: targetUser.id, name: targetUser.name },
            reassigned,
            customReassignments: reassignments || {},
          },
        },
      });

      // Delete the user
      await tx.user.delete({ where: { id } });
    });

    return jsonResponse({ deleted: true, reassigned });
  } catch (error) {
    console.error("[API Error]", error);
    return errorResponse(error instanceof Error ? error.message : "Operation failed", 500);
  }
}
