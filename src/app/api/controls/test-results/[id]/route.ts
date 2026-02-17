import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  result: z.enum(["PASS", "FAIL", "PARTIALLY", "NOT_TESTED", "NOT_DUE"]).optional(),
  notes: z.string().nullable().optional(),
  evidenceLinks: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);
    const { id } = await params;

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;

    // Validate: Fail and Partially require notes
    if (result.data.result && (result.data.result === "FAIL" || result.data.result === "PARTIALLY")) {
      if (result.data.notes === null || (result.data.notes !== undefined && !result.data.notes.trim())) {
        return errorResponse(`Notes are required for ${result.data.result} results`, 400);
      }
    }

    const record = await prisma.controlTestResult.update({
      where: { id },
      data: {
        ...result.data,
        updatedById: userId,
      },
      include: { testedBy: true },
    });

    return jsonResponse(serialiseDates(record));
  } catch (err) {
    console.error("[PATCH /api/controls/test-results/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
