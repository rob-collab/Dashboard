import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, auditLog } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { PROCESS_INCLUDE, computeMaturity } from "../route";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const process = await prisma.process.findUnique({ where: { id }, include: PROCESS_INCLUDE });
    if (!process) return errorResponse("Process not found", 404);
    return jsonResponse(serialiseDates(process));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch process", 500);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  category: z.enum(["CUSTOMER_ONBOARDING","PAYMENTS","LENDING","COMPLIANCE","RISK_MANAGEMENT","FINANCE","TECHNOLOGY","PEOPLE","GOVERNANCE","OTHER"]).optional(),
  processType: z.enum(["CORE","SUPPORT","MANAGEMENT","GOVERNANCE"]).optional(),
  status: z.enum(["DRAFT","ACTIVE","UNDER_REVIEW","RETIRED"]).optional(),
  version: z.string().optional(),
  frequency: z.enum(["AD_HOC","DAILY","WEEKLY","MONTHLY","QUARTERLY","ANNUALLY","CONTINUOUS"]).optional(),
  automationLevel: z.enum(["MANUAL","PARTIALLY_AUTOMATED","FULLY_AUTOMATED"]).optional(),
  criticality: z.enum(["CRITICAL","IMPORTANT","STANDARD"]).optional(),
  triggerDescription: z.string().optional().nullable(),
  inputs: z.string().optional().nullable(),
  outputs: z.string().optional().nullable(),
  escalationPath: z.string().optional().nullable(),
  exceptions: z.string().optional().nullable(),
  endToEndSlaDays: z.number().int().positive().optional().nullable(),
  reviewFrequencyDays: z.number().int().positive().optional(),
  effectiveDate: z.string().optional().nullable(),
  nextReviewDate: z.string().optional().nullable(),
  smfFunction: z.string().optional().nullable(),
  prescribedResponsibilities: z.array(z.string()).optional(),
  ownerId: z.string().optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const validated = validateBody(updateSchema, body);
  if ("error" in validated) return validated.error;

  try {
    const updateData: Record<string, unknown> = { ...validated.data };
    if (validated.data.effectiveDate !== undefined) {
      updateData.effectiveDate = validated.data.effectiveDate ? new Date(validated.data.effectiveDate) : null;
    }
    if (validated.data.nextReviewDate !== undefined) {
      updateData.nextReviewDate = validated.data.nextReviewDate ? new Date(validated.data.nextReviewDate) : null;
    }

    // Update the record first
    await prisma.process.update({ where: { id }, data: updateData as never });

    // Re-fetch with full includes to compute maturity
    const fresh = await prisma.process.findUnique({ where: { id }, include: PROCESS_INCLUDE });
    if (!fresh) return errorResponse("Process not found", 404);

    const maturityScore = computeMaturity(fresh as Parameters<typeof computeMaturity>[0]);
    const result = await prisma.process.update({
      where: { id },
      data: { maturityScore },
      include: PROCESS_INCLUDE,
    });

    auditLog({ userId: auth.userId, userRole: "CCRO_TEAM", action: "update_process", entityType: "process", entityId: id, changes: validated.data as Record<string, unknown> });
    return jsonResponse(serialiseDates(result));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to update process", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireCCRORole(_req);
  if ("error" in auth) return auth.error;

  try {
    await prisma.process.update({ where: { id }, data: { status: "RETIRED" } });
    auditLog({ userId: auth.userId, userRole: "CCRO_TEAM", action: "retire_process", entityType: "process", entityId: id });
    return jsonResponse({ success: true });
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to retire process", 500);
  }
}
