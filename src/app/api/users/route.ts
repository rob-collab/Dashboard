import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, validateBody, requireCCRORole } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { CreateUserSchema } from "@/lib/schemas/users";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const users = await prisma.user.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: "asc" },
    });
    return jsonResponse(serialiseDates(users));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const validation = validateBody(CreateUserSchema, body);
    if ('error' in validation) return validation.error;
    const data = validation.data;

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return errorResponse(`A user with email ${data.email} already exists`, 409);
    }

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
