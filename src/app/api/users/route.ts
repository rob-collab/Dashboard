import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return jsonResponse(serialiseDates(users));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, name, role, assignedMeasures, isActive } = body;
  if (!email || !name) return errorResponse("email and name are required");

  const user = await prisma.user.create({
    data: {
      id: body.id || undefined,
      email,
      name,
      role: role || "VIEWER",
      assignedMeasures: assignedMeasures || [],
      isActive: isActive ?? true,
    },
  });
  return jsonResponse(serialiseDates(user), 201);
}
