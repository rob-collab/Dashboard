import { NextRequest } from "next/server";
import { prisma, jsonResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const section = await prisma.section.update({ where: { id }, data: body });
  return jsonResponse(serialiseDates(section));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.section.delete({ where: { id } });
  return jsonResponse({ deleted: true });
}
