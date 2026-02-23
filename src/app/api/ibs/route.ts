import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, generateReference } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const IBS_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  processLinks: {
    include: {
      process: { select: { id: true, reference: true, name: true, maturityScore: true, criticality: true } },
    },
  },
};

export async function GET() {
  try {
    const items = await prisma.importantBusinessService.findMany({
      include: IBS_INCLUDE,
      orderBy: { reference: "asc" },
    });
    return jsonResponse(serialiseDates(items));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch IBS records", 500);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  impactToleranceStatement: z.string().optional(),
  maxTolerableDisruptionHours: z.number().int().positive().optional().nullable(),
  rtoHours: z.number().int().positive().optional().nullable(),
  rpoHours: z.number().int().positive().optional().nullable(),
  smfAccountable: z.string().optional(),
  ownerId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "UNDER_REVIEW", "RETIRED"]).optional(),
});

export async function POST(request: Request) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const validated = validateBody(createSchema, body);
  if ("error" in validated) return validated.error;

  try {
    const reference = await generateReference("IBS-", "importantBusinessService");
    const item = await prisma.importantBusinessService.create({
      data: {
        reference,
        name: validated.data.name,
        description: validated.data.description ?? null,
        impactToleranceStatement: validated.data.impactToleranceStatement ?? null,
        maxTolerableDisruptionHours: validated.data.maxTolerableDisruptionHours ?? null,
        rtoHours: validated.data.rtoHours ?? null,
        rpoHours: validated.data.rpoHours ?? null,
        smfAccountable: validated.data.smfAccountable ?? null,
        ownerId: validated.data.ownerId ?? null,
        status: validated.data.status ?? "ACTIVE",
      },
      include: IBS_INCLUDE,
    });
    return jsonResponse(serialiseDates(item), 201);
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to create IBS record", 500);
  }
}
