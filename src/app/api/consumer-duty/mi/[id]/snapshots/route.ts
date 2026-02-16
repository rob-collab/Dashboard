import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const snapshots = await prisma.metricSnapshot.findMany({
    where: { miId: id },
    orderBy: { month: "asc" },
    take: 12,
  });

  if (snapshots.length === 0) {
    // Check that the MI exists
    const mi = await prisma.consumerDutyMI.findUnique({ where: { id } });
    if (!mi) return errorResponse("Metric not found", 404);
  }

  return jsonResponse(serialiseDates(snapshots));
}
