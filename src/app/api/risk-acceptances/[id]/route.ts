import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, getAuthUserId, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const includeAll = {
  risk: {
    include: {
      controls: { orderBy: { sortOrder: "asc" as const } },
      mitigations: { orderBy: { createdAt: "asc" as const } },
      riskOwner: true,
    },
  },
  proposer: true,
  approver: true,
  consumerDutyOutcome: true,
  linkedControl: true,
  comments: { include: { user: true }, orderBy: { createdAt: "asc" as const } },
  history: { include: { user: true }, orderBy: { createdAt: "asc" as const } },
};

const updateSchema = z.object({
  // Workflow transitions
  action: z.enum([
    "SUBMIT_FOR_REVIEW",     // PROPOSED → CCRO_REVIEW
    "ROUTE_TO_APPROVER",     // CCRO_REVIEW → AWAITING_APPROVAL
    "RETURN",                // CCRO_REVIEW → RETURNED
    "RESUBMIT",              // RETURNED → CCRO_REVIEW
    "APPROVE",               // AWAITING_APPROVAL → APPROVED
    "REJECT",                // AWAITING_APPROVAL → REJECTED
    "EXPIRE",                // APPROVED → EXPIRED
  ]).optional(),
  // Field edits
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  proposedRationale: z.string().optional(),
  proposedConditions: z.string().optional().nullable(),
  approverRationale: z.string().optional(),
  ccroNote: z.string().optional().nullable(),
  approverId: z.string().optional().nullable(),
  reviewDate: z.string().optional().nullable(),
  consumerDutyOutcomeId: z.string().optional().nullable(),
  linkedControlId: z.string().optional().nullable(),
  linkedActionIds: z.array(z.string()).optional(),
  comment: z.string().optional(),
});

// Valid status transitions
const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  SUBMIT_FOR_REVIEW:  { from: ["PROPOSED"], to: "CCRO_REVIEW" },
  ROUTE_TO_APPROVER:  { from: ["CCRO_REVIEW"], to: "AWAITING_APPROVAL" },
  RETURN:             { from: ["CCRO_REVIEW"], to: "RETURNED" },
  RESUBMIT:           { from: ["RETURNED"], to: "CCRO_REVIEW" },
  APPROVE:            { from: ["AWAITING_APPROVAL"], to: "APPROVED" },
  REJECT:             { from: ["AWAITING_APPROVAL"], to: "REJECTED" },
  EXPIRE:             { from: ["APPROVED"], to: "EXPIRED" },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const acceptance = await prisma.riskAcceptance.findUnique({
      where: { id },
      include: includeAll,
    });

    if (!acceptance) return errorResponse("Risk acceptance not found", 404);
    return jsonResponse(serialiseDates(acceptance));
  } catch (err) {
    console.error("[GET /api/risk-acceptances/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserId(request);
    const authUserId = getAuthUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);
    const { id } = await params;

    const existing = await prisma.riskAcceptance.findUnique({ where: { id } });
    if (!existing) return errorResponse("Risk acceptance not found", 404);

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;
    const { action: transition, comment, ...fieldUpdates } = result.data;

    const updateData: Record<string, unknown> = {};

    // Handle workflow transition
    if (transition) {
      const rule = TRANSITIONS[transition];
      if (!rule) return errorResponse("Invalid transition action", 400);
      if (!rule.from.includes(existing.status)) {
        return errorResponse(`Cannot ${transition} from status ${existing.status}`, 400);
      }

      // Permission checks
      const user = await prisma.user.findUnique({ where: { id: authUserId ?? userId }, select: { role: true } });
      const isCCRO = user?.role === "CCRO_TEAM";
      const isApprover = existing.approverId === userId || existing.approverId === authUserId;

      if (["SUBMIT_FOR_REVIEW", "ROUTE_TO_APPROVER", "RETURN", "RESUBMIT", "EXPIRE"].includes(transition) && !isCCRO) {
        return errorResponse("Only CCRO team can perform this action", 403);
      }
      if (["APPROVE", "REJECT"].includes(transition) && !isApprover && !isCCRO) {
        return errorResponse("Only the assigned approver can approve/reject", 403);
      }

      updateData.status = rule.to;

      // Transition-specific updates
      if (transition === "ROUTE_TO_APPROVER") {
        if (!fieldUpdates.approverId) return errorResponse("approverId is required to route to approver", 400);
        updateData.approverId = fieldUpdates.approverId;
        if (fieldUpdates.ccroNote !== undefined) updateData.ccroNote = fieldUpdates.ccroNote;
        if (fieldUpdates.reviewDate) updateData.reviewDate = new Date(fieldUpdates.reviewDate);
      }

      if (transition === "APPROVE") {
        updateData.approvedAt = new Date();
        if (fieldUpdates.approverRationale) updateData.approverRationale = fieldUpdates.approverRationale;
        if (fieldUpdates.reviewDate) updateData.reviewDate = new Date(fieldUpdates.reviewDate);
      }

      if (transition === "REJECT") {
        updateData.rejectedAt = new Date();
        if (fieldUpdates.approverRationale) updateData.approverRationale = fieldUpdates.approverRationale;
      }

      if (transition === "EXPIRE") {
        updateData.expiredAt = new Date();
      }

      // Create history record
      await prisma.riskAcceptanceHistory.create({
        data: {
          acceptanceId: id,
          userId,
          action: transition,
          fromStatus: existing.status,
          toStatus: rule.to,
          details: comment ?? `Status changed from ${existing.status} to ${rule.to}`,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          userRole: user?.role ?? "VIEWER",
          action: `risk_acceptance_${transition.toLowerCase()}`,
          entityType: "risk_acceptance",
          entityId: id,
          changes: { fromStatus: existing.status, toStatus: rule.to },
        },
      }).catch((e) => console.error("[audit]", e));
    }

    // Handle field edits (non-transition) — require authorisation
    const hasFieldEdits = Object.keys(fieldUpdates).some(
      (k) => fieldUpdates[k as keyof typeof fieldUpdates] !== undefined
    );
    if (hasFieldEdits && !transition) {
      const editUser = await prisma.user.findUnique({ where: { id: authUserId ?? userId }, select: { role: true } });
      const isEditCCRO = editUser?.role === "CCRO_TEAM";
      const isProposer = existing.proposerId === (authUserId ?? userId);
      const editableStatuses = ["PROPOSED", "RETURNED"];

      if (!isEditCCRO && !(isProposer && editableStatuses.includes(existing.status))) {
        return errorResponse("Only CCRO or the original proposer (in PROPOSED/RETURNED status) can edit fields", 403);
      }
    }

    if (fieldUpdates.title !== undefined) updateData.title = fieldUpdates.title;
    if (fieldUpdates.description !== undefined) updateData.description = fieldUpdates.description;
    if (fieldUpdates.proposedRationale !== undefined) updateData.proposedRationale = fieldUpdates.proposedRationale;
    if (fieldUpdates.proposedConditions !== undefined) updateData.proposedConditions = fieldUpdates.proposedConditions;
    if (fieldUpdates.consumerDutyOutcomeId !== undefined) updateData.consumerDutyOutcomeId = fieldUpdates.consumerDutyOutcomeId;
    if (fieldUpdates.linkedControlId !== undefined) updateData.linkedControlId = fieldUpdates.linkedControlId;
    if (fieldUpdates.linkedActionIds !== undefined) updateData.linkedActionIds = fieldUpdates.linkedActionIds;
    if (!transition && fieldUpdates.approverId !== undefined) updateData.approverId = fieldUpdates.approverId;
    if (!transition && fieldUpdates.reviewDate !== undefined) {
      updateData.reviewDate = fieldUpdates.reviewDate ? new Date(fieldUpdates.reviewDate) : null;
    }
    if (!transition && fieldUpdates.ccroNote !== undefined) updateData.ccroNote = fieldUpdates.ccroNote;
    if (!transition && fieldUpdates.approverRationale !== undefined) updateData.approverRationale = fieldUpdates.approverRationale;

    const updated = await prisma.riskAcceptance.update({
      where: { id },
      data: updateData,
      include: includeAll,
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/risk-acceptances/:id]", err);
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
    const { userId } = auth;
    const { id } = await params;

    const existing = await prisma.riskAcceptance.findUnique({ where: { id } });
    if (!existing) return errorResponse("Risk acceptance not found", 404);

    if (!["PROPOSED", "RETURNED"].includes(existing.status)) {
      return errorResponse("Can only delete acceptances in PROPOSED or RETURNED status", 400);
    }

    await prisma.riskAcceptance.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        userRole: "CCRO_TEAM",
        action: "delete_risk_acceptance",
        entityType: "risk_acceptance",
        entityId: id,
        changes: { reference: existing.reference, title: existing.title },
      },
    }).catch((e) => console.error("[audit]", e));

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/risk-acceptances/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
