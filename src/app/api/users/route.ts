import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { CreateUserSchema } from "@/lib/schemas/users";

export async function GET() {
  try {
    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    return jsonResponse(serialiseDates(users));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateBody(CreateUserSchema, body);
    if ('error' in validation) return validation.error;
    const data = validation.data;

    const user = await prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        assignedMeasures: data.assignedMeasures,
        isActive: data.isActive,
      },
    });
    return jsonResponse(serialiseDates(user), 201);
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
