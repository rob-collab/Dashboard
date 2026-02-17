import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const areas = await prisma.controlBusinessArea.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return jsonResponse(serialiseDates(areas));
  } catch (err) {
    console.error("[GET /api/controls/business-areas]", err);
    return errorResponse("Internal server error", 500);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;

    const existing = await prisma.controlBusinessArea.findUnique({ where: { name: result.data.name } });
    if (existing) return errorResponse("Business area already exists", 409);

    const area = await prisma.controlBusinessArea.create({
      data: {
        name: result.data.name,
        sortOrder: result.data.sortOrder ?? 0,
      },
    });

    return jsonResponse(serialiseDates(area), 201);
  } catch (err) {
    console.error("[POST /api/controls/business-areas]", err);
    return errorResponse("Internal server error", 500);
  }
}
