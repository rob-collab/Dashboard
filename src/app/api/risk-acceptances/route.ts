import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody, validateQuery, generateReference } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const querySchema = z.object({
  status: z.enum(["PROPOSED", "CCRO_REVIEW", "AWAITING_APPROVAL", "APPROVED", "REJECTED", "RETURNED", "EXPIRED"]).optional(),
  source: z.enum(["RISK_REGISTER", "CONTROL_TESTING", "INCIDENT", "AD_HOC"]).optional(),
});

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  source: z.enum(["RISK_REGISTER", "CONTROL_TESTING", "INCIDENT", "AD_HOC"]),
  riskId: z.string().optional().nullable(),
  proposedRationale: z.string().min(1),
  proposedConditions: z.string().optional().nullable(),
  consumerDutyOutcomeId: z.string().optional().nullable(),
  linkedControlId: z.string().optional().nullable(),
  reviewDate: z.string().optional().nullable(),
  approverId: z.string().optional().nullable(),
  linkedActionIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const result = validateQuery(querySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;
    const { status, source } = result.data;

    const acceptances = await prisma.riskAcceptance.findMany({
      where: {
        ...(status && { status }),
        ...(source && { source }),
      },
      include: {
        risk: {
          include: {
            controls: { orderBy: { sortOrder: "asc" } },
            mitigations: { orderBy: { createdAt: "asc" } },
          },
        },
        proposer: true,
        approver: true,
        consumerDutyOutcome: true,
        linkedControl: true,
        comments: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
        history: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(serialiseDates(acceptances));
  } catch (err) {
    console.error("[GET /api/risk-acceptances]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    // Generate next reference number (collision-safe)
    const reference = await generateReference("RA-", "riskAcceptance");

    const acceptance = await prisma.riskAcceptance.create({
      data: {
        reference,
        title: data.title,
        description: data.description,
        source: data.source,
        status: "PROPOSED",
        riskId: data.riskId ?? null,
        proposerId: userId,
        approverId: data.approverId ?? null,
        proposedRationale: data.proposedRationale,
        proposedConditions: data.proposedConditions ?? null,
        consumerDutyOutcomeId: data.consumerDutyOutcomeId ?? null,
        linkedControlId: data.linkedControlId ?? null,
        reviewDate: data.reviewDate ? new Date(data.reviewDate) : null,
        linkedActionIds: data.linkedActionIds ?? [],
      },
      include: {
        risk: {
          include: {
            controls: { orderBy: { sortOrder: "asc" } },
            mitigations: { orderBy: { createdAt: "asc" } },
          },
        },
        proposer: true,
        approver: true,
        consumerDutyOutcome: true,
        linkedControl: true,
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
        history: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
    });

    // Create initial history record
    await prisma.riskAcceptanceHistory.create({
      data: {
        acceptanceId: acceptance.id,
        userId,
        action: "CREATED",
        fromStatus: null,
        toStatus: "PROPOSED",
        details: `Risk acceptance ${reference} proposed: ${data.title}`,
      },
    });

    // Audit log
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    await prisma.auditLog.create({
      data: {
        userId,
        userRole: user?.role ?? "CCRO_TEAM",
        action: "create_risk_acceptance",
        entityType: "risk_acceptance",
        entityId: acceptance.id,
        changes: { title: data.title, reference, source: data.source },
      },
    }).catch((e) => console.error("[audit]", e));

    // Re-fetch with history
    const full = await prisma.riskAcceptance.findUnique({
      where: { id: acceptance.id },
      include: {
        risk: {
          include: {
            controls: { orderBy: { sortOrder: "asc" } },
            mitigations: { orderBy: { createdAt: "asc" } },
          },
        },
        proposer: true,
        approver: true,
        consumerDutyOutcome: true,
        linkedControl: true,
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
        history: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
    });

    return jsonResponse(serialiseDates(full), 201);
  } catch (err) {
    console.error("[POST /api/risk-acceptances]", err);
    return errorResponse("Internal server error", 500);
  }
}
