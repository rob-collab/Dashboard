import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { UpdateUserSchema } from "@/lib/schemas/users";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorResponse("User not found", 404);
    return jsonResponse(serialiseDates(user));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateBody(UpdateUserSchema, body);
    if ('error' in validation) return validation.error;
    const data = validation.data;

    const user = await prisma.user.update({ where: { id }, data });
    return jsonResponse(serialiseDates(user));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
