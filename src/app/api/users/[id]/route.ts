import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return errorResponse("User not found", 404);
  return jsonResponse(serialiseDates(user));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const user = await prisma.user.update({ where: { id }, data: body });
  return jsonResponse(serialiseDates(user));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return jsonResponse({ deleted: true });
}
