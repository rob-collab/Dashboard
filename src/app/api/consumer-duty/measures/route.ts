import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Bulk import: array of measures
  if (Array.isArray(body)) {
    const created = await prisma.$transaction(
      body.map((m) =>
        prisma.consumerDutyMeasure.create({
          data: {
            id: m.id || undefined,
            outcomeId: m.outcomeId,
            measureId: m.measureId,
            name: m.name,
            owner: m.owner ?? null,
            summary: m.summary ?? "",
            ragStatus: m.ragStatus || "GOOD",
            position: m.position ?? 0,
            lastUpdatedAt: m.lastUpdatedAt ? new Date(m.lastUpdatedAt) : null,
          },
          include: { metrics: true },
        })
      )
    );
    return jsonResponse(serialiseDates(created), 201);
  }

  // Single measure
  const { outcomeId, measureId, name } = body;
  if (!outcomeId || !measureId || !name) {
    return errorResponse("outcomeId, measureId, and name are required");
  }

  const measure = await prisma.consumerDutyMeasure.create({
    data: {
      id: body.id || undefined,
      outcomeId,
      measureId,
      name,
      owner: body.owner ?? null,
      summary: body.summary ?? "",
      ragStatus: body.ragStatus || "GOOD",
      position: body.position ?? 0,
      lastUpdatedAt: body.lastUpdatedAt ? new Date(body.lastUpdatedAt) : null,
    },
    include: { metrics: true },
  });
  return jsonResponse(serialiseDates(measure), 201);
}
