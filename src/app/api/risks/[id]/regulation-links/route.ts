import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const { id: riskId } = await params;
    const links = await prisma.riskRegulationLink.findMany({
      where: { riskId },
      include: {
        regulation: {
          select: { id: true, reference: true, name: true, type: true, complianceStatus: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(serialiseDates(links));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

const createSchema = z.object({
  regulationId: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: Params
) {
  try {
    const auth = await requireCCRORole(req);
    if ("error" in auth) return auth.error;

    const { id: riskId } = await params;

    const risk = await prisma.risk.findUnique({ where: { id: riskId } });
    if (!risk) return errorResponse("Risk not found", 404);

    const rawBody = await req.json();
    const validation = validateBody(createSchema, rawBody);
    if ("error" in validation) return validation.error;
    const { regulationId, notes } = validation.data;

    const regulation = await prisma.regulation.findUnique({ where: { id: regulationId } });
    if (!regulation) return errorResponse("Regulation not found", 404);

    const link = await prisma.riskRegulationLink.upsert({
      where: { riskId_regulationId: { riskId, regulationId } },
      create: { riskId, regulationId, notes: notes ?? null },
      update: { notes: notes ?? null },
      include: {
        regulation: {
          select: { id: true, reference: true, name: true, type: true, complianceStatus: true },
        },
      },
    });

    return jsonResponse(serialiseDates(link), 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

const deleteSchema = z.object({
  regulationId: z.string().min(1),
});

export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    const auth = await requireCCRORole(req);
    if ("error" in auth) return auth.error;

    const { id: riskId } = await params;
    const rawBody = await req.json();
    const validation = validateBody(deleteSchema, rawBody);
    if ("error" in validation) return validation.error;
    const { regulationId } = validation.data;

    await prisma.riskRegulationLink.deleteMany({
      where: { riskId, regulationId },
    });

    return jsonResponse({ deleted: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
