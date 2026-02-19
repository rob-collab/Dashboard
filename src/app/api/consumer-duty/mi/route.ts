import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getAuthUserId, validateBody, jsonResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const metricSchema = z.object({
  id: z.string().optional(),
  metric: z.string().min(1),
  current: z.string().default(""),
  previous: z.string().default(""),
  change: z.string().default(""),
  ragStatus: z.enum(["GOOD", "WARNING", "HARM"]).default("GOOD"),
  appetite: z.string().nullable().default(null),
  appetiteOperator: z.string().nullable().default(null),
});

const putSchema = z.object({
  measureId: z.string().min(1),
  metrics: z.array(metricSchema).min(1),
  month: z.string().optional(),
});

function monthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const result = validateBody(putSchema, body);
  if ("error" in result) return result.error;
  const { measureId, metrics, month: monthParam } = result.data;

  const userId = getAuthUserId(request);

  // Allow optional month override for historical imports
  const month = monthParam ? new Date(monthParam) : monthStart();

  await prisma.$transaction(async (tx) => {
    await tx.consumerDutyMI.deleteMany({ where: { measureId } });
    for (const m of metrics) {
      const mi = await tx.consumerDutyMI.create({
        data: {
          ...(m.id && { id: m.id }),
          measureId,
          metric: m.metric,
          current: m.current,
          previous: m.previous,
          change: m.change,
          ragStatus: m.ragStatus,
          appetite: m.appetite,
          appetiteOperator: m.appetiteOperator,
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
