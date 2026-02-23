import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const IBS_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  processLinks: {
    include: {
      process: { select: { id: true, reference: true, name: true, maturityScore: true, criticality: true } },
    },
  },
  resourceMaps: true,
  scenarios: { orderBy: { createdAt: "desc" as const } },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const item = await prisma.importantBusinessService.findUnique({
      where: { id },
      include: IBS_INCLUDE,
    });
    if (!item) return errorResponse("IBS record not found", 404);
    return jsonResponse(serialiseDates(item));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch IBS record", 500);
  }
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  impactToleranceStatement: z.string().optional().nullable(),
  maxTolerableDisruptionHours: z.number().int().positive().optional().nullable(),
  rtoHours: z.number().int().positive().optional().nullable(),
  rpoHours: z.number().int().positive().optional().nullable(),
  smfAccountable: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "UNDER_REVIEW", "RETIRED"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const validated = validateBody(patchSchema, body);
  if ("error" in validated) return validated.error;

  try {
    const item = await prisma.importantBusinessService.update({
      where: { id },
      data: validated.data,
      include: IBS_INCLUDE,
    });
    return jsonResponse(serialiseDates(item));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to update IBS record", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    await prisma.importantBusinessService.update({
      where: { id },
      data: { status: "RETIRED" },
    });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to retire IBS record", 500);
  }
}
