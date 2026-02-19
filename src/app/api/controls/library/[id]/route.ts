import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, auditLog } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const control = await prisma.control.findUnique({
      where: { id },
      include: {
        businessArea: true,
        controlOwner: true,
        testingSchedule: {
          include: {
            assignedTester: true,
            testResults: { orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }] },
            quarterlySummaries: { orderBy: { createdAt: "desc" } },
          },
        },
        attestations: {
          include: { attestedBy: true, ccroReviewedBy: true },
          orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
          take: 24,
        },
        changes: {
          include: { proposer: true, reviewer: true },
          orderBy: { proposedAt: "desc" },
        },
        actions: {
          include: { assignee: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!control) return errorResponse("Control not found", 404);
    return jsonResponse(serialiseDates(control));
  } catch (err) {
    console.error("[GET /api/controls/library/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

const updateSchema = z.object({
  controlName: z.string().min(1).optional(),
  controlDescription: z.string().min(1).optional(),
  businessAreaId: z.string().min(1).optional(),
  controlOwnerId: z.string().min(1).optional(),
  consumerDutyOutcome: z.enum(["PRODUCTS_AND_SERVICES", "CONSUMER_UNDERSTANDING", "CONSUMER_SUPPORT", "GOVERNANCE_CULTURE_OVERSIGHT"]).optional(),
  controlFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "BI_ANNUAL", "ANNUAL", "EVENT_DRIVEN"]).optional(),
  internalOrThirdParty: z.enum(["INTERNAL", "THIRD_PARTY"]).optional(),
  controlType: z.enum(["PREVENTATIVE", "DETECTIVE", "CORRECTIVE", "DIRECTIVE"]).nullable().optional(),
  standingComments: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;

    // Handle archive/restore
    const data: Record<string, unknown> = { ...result.data };
    if (result.data.isActive === false && !("archivedAt" in data)) {
      data.archivedAt = new Date();
    } else if (result.data.isActive === true) {
      data.archivedAt = null;
    }

    const control = await prisma.control.update({
      where: { id },
      data,
      include: {
        businessArea: true,
        controlOwner: true,
        testingSchedule: {
          include: { assignedTester: true },
        },
      },
    });

    auditLog({ userId: auth.userId, action: "update_control", entityType: "control", entityId: id, changes: result.data as Record<string, unknown> });
    return jsonResponse(serialiseDates(control));
  } catch (err) {
    console.error("[PATCH /api/controls/library/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    // Don't hard-delete — archive instead
    const control = await prisma.control.update({
      where: { id },
      data: { isActive: false, archivedAt: new Date() },
    });

    auditLog({ userId: auth.userId, action: "archive_control", entityType: "control", entityId: id });
    return jsonResponse(serialiseDates(control));
  } catch (err) {
    console.error("[DELETE /api/controls/library/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
