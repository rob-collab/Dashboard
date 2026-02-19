import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const definitions = await prisma.priorityDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return jsonResponse(serialiseDates(definitions));
  } catch (error) {
    console.error("[GET /api/priority-definitions]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch priority definitions",
      500,
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { code, label, description } = body;

    if (!code) {
      return errorResponse("code is required", 400);
    }

    // Check record exists before attempting update
    const existing = await prisma.priorityDefinition.findUnique({ where: { code } });
    if (!existing) {
      return errorResponse(`Priority definition '${code}' not found`, 404);
    }

    const updated = await prisma.priorityDefinition.update({
      where: { code },
      data: {
        ...(label !== undefined && { label }),
        ...(description !== undefined && { description }),
      },
    });

    return jsonResponse(serialiseDates(updated));
  } catch (error) {
    console.error("[PUT /api/priority-definitions]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update priority definition",
      500,
    );
  }
}
