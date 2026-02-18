import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, requireCCRORole, jsonResponse, errorResponse, validateBody, validateQuery } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const POLICY_INCLUDE = {
  owner: true,
  regulatoryLinks: { include: { regulation: true }, orderBy: { linkedAt: "asc" as const } },
  controlLinks: { include: { control: { include: { businessArea: true, controlOwner: true, testingSchedule: { include: { testResults: true } } } } }, orderBy: { linkedAt: "asc" as const } },
  obligations: { orderBy: { category: "asc" as const, reference: "asc" as const } },
  auditTrail: { orderBy: { changedAt: "desc" as const } },
};

const querySchema = z.object({
  status: z.enum(["CURRENT", "OVERDUE", "UNDER_REVIEW", "ARCHIVED"]).optional(),
  search: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["CURRENT", "OVERDUE", "UNDER_REVIEW", "ARCHIVED"]).optional(),
  version: z.string().optional(),
  ownerId: z.string().min(1),
  approvedBy: z.string().optional().nullable(),
  classification: z.string().optional(),
  reviewFrequencyDays: z.number().optional(),
  lastReviewedDate: z.string().optional().nullable(),
  nextReviewDate: z.string().optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  applicability: z.string().optional().nullable(),
  exceptions: z.string().optional().nullable(),
  relatedPolicies: z.array(z.string()).optional(),
  storageUrl: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const result = validateQuery(querySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;
    const { status, search } = result.data;

    const policies = await prisma.policy.findMany({
      where: {
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { reference: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: POLICY_INCLUDE,
      orderBy: { name: "asc" },
    });

    return jsonResponse(serialiseDates(policies));
  } catch (err) {
    console.error("[GET /api/policies]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    // Generate next reference
    const lastPolicy = await prisma.policy.findFirst({ orderBy: { reference: "desc" } });
    const nextNum = lastPolicy
      ? parseInt(lastPolicy.reference.replace("POL-", ""), 10) + 1
      : 1;
    const reference = `POL-${String(nextNum).padStart(3, "0")}`;

    const policy = await prisma.policy.create({
      data: {
        reference,
        name: data.name,
        description: data.description,
        status: data.status ?? "CURRENT",
        version: data.version ?? "1.0",
        ownerId: data.ownerId,
        approvedBy: data.approvedBy ?? null,
        classification: data.classification ?? "Internal Only",
        reviewFrequencyDays: data.reviewFrequencyDays ?? 365,
        lastReviewedDate: data.lastReviewedDate ? new Date(data.lastReviewedDate) : null,
        nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : null,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        scope: data.scope ?? null,
        applicability: data.applicability ?? null,
        exceptions: data.exceptions ?? null,
        relatedPolicies: data.relatedPolicies ?? [],
        storageUrl: data.storageUrl ?? null,
      },
      include: POLICY_INCLUDE,
    });

    // Audit log
    await prisma.policyAuditLog.create({
      data: {
        policyId: policy.id,
        userId,
        action: "CREATED_POLICY",
        details: `Created policy ${reference}: ${data.name}`,
      },
    });

    // Re-fetch with audit trail
    const full = await prisma.policy.findUnique({
      where: { id: policy.id },
      include: POLICY_INCLUDE,
    });

    return jsonResponse(serialiseDates(full), 201);
  } catch (err) {
    console.error("[POST /api/policies]", err);
    return errorResponse("Internal server error", 500);
  }
}
