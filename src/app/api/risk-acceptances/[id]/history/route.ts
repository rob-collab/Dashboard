import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const acceptance = await prisma.riskAcceptance.findUnique({ where: { id } });
    if (!acceptance) return errorResponse("Risk acceptance not found", 404);

    const history = await prisma.riskAcceptanceHistory.findMany({
      where: { acceptanceId: id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return jsonResponse(serialiseDates(history));
  } catch (err) {
    console.error("[GET /api/risk-acceptances/:id/history]", err);
    return errorResponse("Internal server error", 500);
  }
}
