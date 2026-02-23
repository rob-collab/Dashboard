import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

/** GET /api/ibs/scenarios — all scenarios across all IBS (used for store hydration) */
export async function GET() {
  try {
    const scenarios = await prisma.resilienceScenario.findMany({
      include: {
        ibs: { select: { id: true, reference: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(serialiseDates(scenarios));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch scenarios", 500);
  }
}
