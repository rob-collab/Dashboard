import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  testingFrequency: z.enum(["MONTHLY", "QUARTERLY", "BI_ANNUAL", "ANNUAL"]).optional(),
  assignedTesterId: z.string().min(1).optional(),
  summaryOfTest: z.string().min(1).optional(),
  standingComments: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  removedReason: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;

    const data: Record<string, unknown> = { ...result.data };
    if (result.data.isActive === false) {
      data.removedAt = new Date();
    }

    const entry = await prisma.testingScheduleEntry.update({
      where: { id },
      data,
      include: {
        control: { include: { businessArea: true, controlOwner: true } },
        assignedTester: true,
        testResults: { orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }] },
      },
    });

    return jsonResponse(serialiseDates(entry));
  } catch (err) {
    console.error("[PATCH /api/controls/testing-schedule/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
