import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const POLICY_INCLUDE = {
  owner: true,
  regulatoryLinks: { include: { regulation: true }, orderBy: { linkedAt: "asc" as const } },
  controlLinks: { include: { control: { include: { businessArea: true, controlOwner: true, testingSchedule: { include: { testResults: true } } } } }, orderBy: { linkedAt: "asc" as const } },
  obligations: { orderBy: { category: "asc" as const, reference: "asc" as const } },
  auditTrail: { orderBy: { changedAt: "desc" as const } },
};

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(["CURRENT", "OVERDUE", "UNDER_REVIEW", "ARCHIVED"]).optional(),
  version: z.string().optional(),
  ownerId: z.string().optional(),
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
  consumerDutyOutcomes: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: POLICY_INCLUDE,
    });

    if (!policy) return errorResponse("Policy not found", 404);
    return jsonResponse(serialiseDates(policy));
  } catch (err) {
    console.error("[GET /api/policies/[id]]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { id } = await params;
    const existing = await prisma.policy.findUnique({ where: { id } });
    if (!existing) return errorResponse("Policy not found", 404);

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    // Build update data and audit entries
    const updateData: Record<string, unknown> = {};
    const auditEntries: { fieldChanged: string; oldValue: string; newValue: string }[] = [];

    const dateFields = ["lastReviewedDate", "nextReviewDate", "effectiveDate"];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const oldVal = (existing as Record<string, unknown>)[key];
      const newVal = dateFields.includes(key) && value ? new Date(value as string) : value;
      updateData[key] = newVal;

      const oldStr = oldVal instanceof Date ? oldVal.toISOString() : String(oldVal ?? "");
      const newStr = newVal instanceof Date ? newVal.toISOString() : String(newVal ?? "");
      if (oldStr !== newStr) {
        auditEntries.push({ fieldChanged: key, oldValue: oldStr, newValue: newStr });
      }
    }

    await prisma.policy.update({
      where: { id },
      data: updateData,
    });

    // Create audit entries
    if (auditEntries.length > 0) {
      await prisma.policyAuditLog.createMany({
        data: auditEntries.map((e) => ({
          policyId: id,
          userId,
          action: "UPDATED_FIELD",
          fieldChanged: e.fieldChanged,
          oldValue: e.oldValue,
          newValue: e.newValue,
          details: `Updated ${e.fieldChanged}`,
        })),
      });
    }

    // Re-fetch with full audit trail
    const full = await prisma.policy.findUnique({
      where: { id },
      include: POLICY_INCLUDE,
    });

    return jsonResponse(serialiseDates(full));
  } catch (err) {
    console.error("[PATCH /api/policies/[id]]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const existing = await prisma.policy.findUnique({ where: { id } });
    if (!existing) return errorResponse("Policy not found", 404);

    await prisma.policy.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/policies/[id]]", err);
    return errorResponse("Internal server error", 500);
  }
}
