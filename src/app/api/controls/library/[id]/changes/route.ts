import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const changes = await prisma.controlChange.findMany({
      where: { controlId: id },
      include: { proposer: true, reviewer: true },
      orderBy: { proposedAt: "desc" },
    });

    return jsonResponse(serialiseDates(changes));
  } catch (err) {
    console.error("[GET /api/controls/library/:id/changes]", err);
    return errorResponse("Internal server error", 500);
  }
}

const createChangeSchema = z.object({
  fieldChanged: z.string().min(1),
  oldValue: z.string().nullable().optional(),
  newValue: z.string().nullable().optional(),
  rationale: z.string().min(1, "Rationale is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);
    const { id } = await params;

    // Verify control exists
    const control = await prisma.control.findUnique({ where: { id } });
    if (!control) return errorResponse("Control not found", 404);

    const body = await request.json();
    const result = validateBody(createChangeSchema, body);
    if ("error" in result) return result.error;

    const change = await prisma.controlChange.create({
      data: {
        controlId: id,
        proposedBy: userId,
        fieldChanged: result.data.fieldChanged,
        oldValue: result.data.oldValue ?? null,
        newValue: result.data.newValue ?? null,
        rationale: result.data.rationale,
      },
      include: { proposer: true },
    });

    return jsonResponse(serialiseDates(change), 201);
  } catch (err) {
    console.error("[POST /api/controls/library/:id/changes]", err);
    return errorResponse("Internal server error", 500);
  }
}
