import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, auditLog } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  scenarioType: z.enum(["CYBER_ATTACK", "SYSTEM_OUTAGE", "THIRD_PARTY_FAILURE", "PANDEMIC", "BUILDING_LOSS", "DATA_CORRUPTION", "KEY_PERSON_LOSS", "REGULATORY_CHANGE"]).optional(),
  testedAt: z.string().datetime().optional().nullable(),
  nextTestDate: z.string().datetime().optional().nullable(),
  conductedBy: z.string().optional().nullable(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETE"]).optional(),
  outcome: z.enum(["WITHIN_TOLERANCE", "BREACH", "NOT_TESTED"]).optional(),
  findings: z.string().optional().nullable(),
  remediationRequired: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; scId: string }> }
) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const { scId } = await params;
  const body = await request.json().catch(() => ({}));
  const validated = validateBody(patchSchema, body);
  if ("error" in validated) return validated.error;

  const data: Record<string, unknown> = { ...validated.data };
  if (validated.data.testedAt !== undefined) {
    data.testedAt = validated.data.testedAt ? new Date(validated.data.testedAt) : null;
  }
  if (validated.data.nextTestDate !== undefined) {
    data.nextTestDate = validated.data.nextTestDate ? new Date(validated.data.nextTestDate) : null;
  }

  try {
    const scenario = await prisma.resilienceScenario.update({
      where: { id: scId },
      data,
    });
    auditLog({ userId: auth.userId, userRole: "CCRO_TEAM", action: "update_scenario", entityType: "scenario", entityId: scId, changes: validated.data as Record<string, unknown> });
    return jsonResponse(serialiseDates(scenario));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to update scenario", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; scId: string }> }
) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const { scId } = await params;
  try {
    await prisma.resilienceScenario.delete({ where: { id: scId } });
    auditLog({ userId: auth.userId, userRole: "CCRO_TEAM", action: "delete_scenario", entityType: "scenario", entityId: scId });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to delete scenario", 500);
  }
}
