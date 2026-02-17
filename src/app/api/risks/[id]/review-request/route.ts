import { NextRequest } from "next/server";
import { prisma, getUserId, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);
    const { id } = await params;

    const risk = await prisma.risk.findUnique({ where: { id } });
    if (!risk) return errorResponse("Risk not found", 404);

    const updated = await prisma.risk.update({
      where: { id },
      data: { reviewRequested: true },
      include: {
        controls: { orderBy: { sortOrder: "asc" } },
        mitigations: { orderBy: { createdAt: "asc" } },
      },
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[POST /api/risks/:id/review-request]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);
    const { id } = await params;

    const risk = await prisma.risk.findUnique({ where: { id } });
    if (!risk) return errorResponse("Risk not found", 404);

    const updated = await prisma.risk.update({
      where: { id },
      data: { reviewRequested: false },
      include: {
        controls: { orderBy: { sortOrder: "asc" } },
        mitigations: { orderBy: { createdAt: "asc" } },
      },
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[DELETE /api/risks/:id/review-request]", err);
    return errorResponse("Internal server error", 500);
  }
}
