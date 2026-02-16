import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const component = await prisma.component.findUnique({
    where: { id },
    include: { creator: true },
  });
  if (!component) return errorResponse("Component not found", 404);
  return jsonResponse(serialiseDates(component));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const component = await prisma.component.update({
    where: { id },
    data: body,
    include: { creator: true },
  });
  return jsonResponse(serialiseDates(component));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.component.delete({ where: { id } });
  return jsonResponse({ deleted: true });
}
