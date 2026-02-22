import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const snapshots = await prisma.riskSnapshot.findMany({
      where: { riskId: id },
      orderBy: { month: "asc" },
      take: 12,
    });

    if (snapshots.length === 0) {
      const risk = await prisma.risk.findUnique({ where: { id } });
      if (!risk) return errorResponse("Risk not found", 404);
    }

    return jsonResponse(serialiseDates(snapshots));
  } catch (error) {
    console.error("[GET /api/risks/[id]/snapshots]", error);
    return errorResponse("Failed to fetch snapshots", 500);
  }
}
