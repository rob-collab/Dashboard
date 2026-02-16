import { NextRequest } from "next/server";
import { prisma, jsonResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const mi = await prisma.consumerDutyMI.update({ where: { id }, data: body });
  return jsonResponse(serialiseDates(mi));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.consumerDutyMI.delete({ where: { id } });
  return jsonResponse({ deleted: true });
}
