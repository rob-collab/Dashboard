import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createSchema = z.object({
  fieldChanged: z.string().min(1),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
});

const createManySchema = z.array(createSchema);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const changes = await prisma.riskChange.findMany({
      where: { riskId: id },
      include: { proposer: true, reviewer: true },
      orderBy: { proposedAt: "desc" },
    });
    return jsonResponse(changes.map(serialiseDates));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;

    // Verify risk exists
    const risk = await prisma.risk.findUnique({ where: { id } });
    if (!risk) return errorResponse("Risk not found", 404);

    const body = await request.json();

    // Support both single change and array of changes
    if (Array.isArray(body)) {
      const result = createManySchema.safeParse(body);
      if (!result.success) return errorResponse("Invalid input", 400);

      const created = await prisma.$transaction(
        result.data.map((change) =>
          prisma.riskChange.create({
            data: {
              riskId: id,
              fieldChanged: change.fieldChanged,
              oldValue: change.oldValue,
              newValue: change.newValue,
              proposedBy: userId,
            },
            include: { proposer: true },
          })
        )
      );

      return jsonResponse(created.map(serialiseDates), 201);
    }

    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;

    const created = await prisma.riskChange.create({
      data: {
        riskId: id,
        fieldChanged: result.data.fieldChanged,
        oldValue: result.data.oldValue,
        newValue: result.data.newValue,
        proposedBy: userId,
      },
      include: { proposer: true },
    });

    return jsonResponse(serialiseDates(created), 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
