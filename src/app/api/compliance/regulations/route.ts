import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateQuery } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const querySchema = z.object({
  showAll: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const result = validateQuery(querySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;
    const { showAll } = result.data;

    const regulations = await prisma.regulation.findMany({
      where: {
        ...(showAll !== "true" && { isApplicable: true }),
      },
      include: {
        children: { select: { id: true, reference: true, name: true, level: true, complianceStatus: true } },
        parent: { select: { id: true, reference: true, name: true } },
        _count: { select: { policyLinks: true, controlLinks: true } },
      },
      orderBy: { reference: "asc" },
    });

    return jsonResponse(serialiseDates(regulations));
  } catch (err) {
    console.error("[GET /api/compliance/regulations]", err);
    return errorResponse("Internal server error", 500);
  }
}
