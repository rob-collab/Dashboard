import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const links = await prisma.riskControlLink.findMany({
      where: { riskId: id },
      include: {
        control: {
          select: { id: true, controlRef: true, controlName: true, businessArea: true },
        },
      },
      orderBy: { linkedAt: "desc" },
    });

    return jsonResponse(serialiseDates(links));
  } catch (error) {
    console.error("[GET /api/risks/[id]/control-links]", error);
    return errorResponse("Failed to fetch control links", 500);
  }
}

const createSchema = z.object({
  controlId: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);

  const { id: riskId } = await params;
  const body = await request.json();
  const result = validateBody(createSchema, body);
  if ("error" in result) return result.error;

  // Check risk exists
  const risk = await prisma.risk.findUnique({ where: { id: riskId } });
  if (!risk) return errorResponse("Risk not found", 404);

  // Check control exists
  const control = await prisma.control.findUnique({ where: { id: result.data.controlId } });
  if (!control) return errorResponse("Control not found", 404);

  const link = await prisma.riskControlLink.create({
    data: {
      riskId,
      controlId: result.data.controlId,
      linkedBy: userId,
      notes: result.data.notes ?? null,
    },
    include: {
      control: {
        select: { id: true, controlRef: true, controlName: true, businessArea: true },
      },
    },
  });

  return jsonResponse(serialiseDates(link), 201);
}

const deleteSchema = z.object({
  controlId: z.string().min(1),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);

  const { id: riskId } = await params;
  const body = await request.json();
  const result = validateBody(deleteSchema, body);
  if ("error" in result) return result.error;

  await prisma.riskControlLink.deleteMany({
    where: { riskId, controlId: result.data.controlId },
  });

  return jsonResponse({ ok: true });
}
