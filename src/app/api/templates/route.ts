import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  const templates = await prisma.template.findMany({
    include: { creator: true },
    orderBy: { createdAt: "desc" },
  });
  return jsonResponse(serialiseDates(templates));
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);
  const body = await request.json();
  const { name } = body;
  if (!name) return errorResponse("name is required");

  const template = await prisma.template.create({
    data: {
      id: body.id || undefined,
      name,
      description: body.description ?? "",
      category: body.category ?? "General",
      thumbnailUrl: body.thumbnailUrl ?? null,
      layoutConfig: body.layoutConfig ?? {},
      styleConfig: body.styleConfig ?? {},
      contentSchema: body.contentSchema ?? [],
      sectionType: body.sectionType || "TEXT_BLOCK",
      createdBy: userId,
      isGlobal: body.isGlobal ?? false,
      version: body.version ?? 1,
    },
    include: { creator: true },
  });
  return jsonResponse(serialiseDates(template), 201);
}
