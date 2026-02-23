import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, generateReference } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const scenarios = await prisma.resilienceScenario.findMany({
      where: { ibsId: id },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(serialiseDates(scenarios));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch scenarios", 500);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  scenarioType: z.enum(["CYBER_ATTACK", "SYSTEM_OUTAGE", "THIRD_PARTY_FAILURE", "PANDEMIC", "BUILDING_LOSS", "DATA_CORRUPTION", "KEY_PERSON_LOSS", "REGULATORY_CHANGE"]),
  testedAt: z.string().datetime().optional().nullable(),
  nextTestDate: z.string().datetime().optional().nullable(),
  conductedBy: z.string().optional().nullable(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETE"]).optional(),
  outcome: z.enum(["WITHIN_TOLERANCE", "BREACH", "NOT_TESTED"]).optional(),
  findings: z.string().optional().nullable(),
  remediationRequired: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const validated = validateBody(createSchema, body);
  if ("error" in validated) return validated.error;

  try {
    const reference = await generateReference("SCN-", "resilienceScenario");
    const scenario = await prisma.resilienceScenario.create({
      data: {
        reference,
        ibsId: id,
        name: validated.data.name,
        description: validated.data.description ?? null,
        scenarioType: validated.data.scenarioType,
        testedAt: validated.data.testedAt ? new Date(validated.data.testedAt) : null,
        nextTestDate: validated.data.nextTestDate ? new Date(validated.data.nextTestDate) : null,
        conductedBy: validated.data.conductedBy ?? null,
        status: validated.data.status ?? "PLANNED",
        outcome: validated.data.outcome ?? "NOT_TESTED",
        findings: validated.data.findings ?? null,
        remediationRequired: validated.data.remediationRequired ?? false,
      },
    });
    return jsonResponse(serialiseDates(scenario), 201);
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to create scenario", 500);
  }
}
