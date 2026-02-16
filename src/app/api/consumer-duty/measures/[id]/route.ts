import { NextRequest } from "next/server";
import { prisma, jsonResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  if (body.lastUpdatedAt) body.lastUpdatedAt = new Date(body.lastUpdatedAt);
  const measure = await prisma.consumerDutyMeasure.update({
    where: { id },
    data: body,
    include: { metrics: true },
  });
  return jsonResponse(serialiseDates(measure));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.consumerDutyMeasure.delete({ where: { id } });
  return jsonResponse({ deleted: true });
}
