import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { measureId, metrics } = body;
  if (!measureId || !Array.isArray(metrics)) {
    return errorResponse("measureId and metrics[] are required");
  }

  await prisma.$transaction(async (tx) => {
    await tx.consumerDutyMI.deleteMany({ where: { measureId } });
    for (const m of metrics) {
      await tx.consumerDutyMI.create({
        data: {
          id: m.id || undefined,
          measureId,
          metric: m.metric,
          current: m.current ?? "",
          previous: m.previous ?? "",
          change: m.change ?? "",
          ragStatus: m.ragStatus || "GOOD",
        },
      });
    }
    await tx.consumerDutyMeasure.update({
      where: { id: measureId },
      data: { lastUpdatedAt: new Date() },
    });
  });

  const updated = await prisma.consumerDutyMI.findMany({ where: { measureId } });
  return jsonResponse(serialiseDates(updated));
}
