import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      include: { creator: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(serialiseDates(templates));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
