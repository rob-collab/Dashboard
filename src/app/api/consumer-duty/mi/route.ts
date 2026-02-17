import { NextRequest } from "next/server";
import { prisma, getAuthUserId, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

function monthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { measureId, metrics, month: monthParam } = body;
  if (!measureId || !Array.isArray(metrics)) {
    return errorResponse("measureId and metrics[] are required");
  }

  const userId = getAuthUserId(request);

  // Allow optional month override for historical imports
  const month = monthParam ? new Date(monthParam) : monthStart();

  await prisma.$transaction(async (tx) => {
    await tx.consumerDutyMI.deleteMany({ where: { measureId } });
    for (const m of metrics) {
      const mi = await tx.consumerDutyMI.create({
        data: {
          id: m.id || undefined,
          measureId,
          metric: m.metric,
          current: m.current ?? "",
          previous: m.previous ?? "",
          change: m.change ?? "",
          ragStatus: m.ragStatus || "GOOD",
          appetite: m.appetite ?? null,
          appetiteOperator: m.appetiteOperator ?? null,
        },
      });
      // Auto-upsert snapshot for the current month
      if (mi.current) {
        await tx.metricSnapshot.upsert({
          where: { miId_month: { miId: mi.id, month } },
          update: { value: mi.current, ragStatus: mi.ragStatus },
          create: { miId: mi.id, month, value: mi.current, ragStatus: mi.ragStatus },
        });
      }
    }
    await tx.consumerDutyMeasure.update({
      where: { id: measureId },
      data: {
        lastUpdatedAt: new Date(),
        ...(userId && { updatedById: userId }),
      },
    });
  });

  const updated = await prisma.consumerDutyMI.findMany({ where: { measureId }, orderBy: { metric: "asc" } });
  return jsonResponse(serialiseDates(updated));
}
