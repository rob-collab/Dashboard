import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireCCRORole(request);
    if ('error' in authResult) return authResult.error;
    const body = await request.json();
    const { outcomeIds, measures } = body;

    if (!Array.isArray(outcomeIds) || !Array.isArray(measures)) {
      return errorResponse("outcomeIds[] and measures[] are required");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing measures under the specified outcomes (cascades to MI + snapshots)
      await tx.consumerDutyMeasure.deleteMany({
        where: { outcomeId: { in: outcomeIds } },
      });

      // Create new measures
      const created = [];
      for (const m of measures) {
        const measure = await tx.consumerDutyMeasure.create({
          data: {
            id: m.id || undefined,
            outcomeId: m.outcomeId,
            measureId: m.measureId,
            name: m.name,
            ownerId: m.ownerId ?? null,
            summary: m.summary ?? "",
            ragStatus: m.ragStatus || "GOOD",
            position: m.position ?? 0,
            lastUpdatedAt: new Date(),
          },
        });
        created.push(measure);
      }

      return created;
    });

    return jsonResponse(serialiseDates(result), 201);
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
