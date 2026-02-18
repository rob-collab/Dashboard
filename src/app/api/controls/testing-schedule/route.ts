import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(request: NextRequest) {
  try {
    const includeResults = request.nextUrl.searchParams.get("includeResults") === "true";
    const assignedTesterId = request.nextUrl.searchParams.get("assignedTesterId");

    const entries = await prisma.testingScheduleEntry.findMany({
      where: {
        isActive: true,
        ...(assignedTesterId && { assignedTesterId }),
      },
      include: {
        control: {
          include: {
            businessArea: true,
            controlOwner: true,
            attestations: {
              include: { attestedBy: true, ccroReviewedBy: true },
            },
          },
        },
        assignedTester: true,
        ...(includeResults && {
          testResults: { orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }] },
        }),
      },
      orderBy: { control: { controlRef: "asc" } },
    });

    return jsonResponse(serialiseDates(entries));
  } catch (err) {
    console.error("[GET /api/controls/testing-schedule]", err);
    return errorResponse("Internal server error", 500);
  }
}

const addSchema = z.object({
  controlIds: z.array(z.string().min(1)).min(1),
  testingFrequency: z.enum(["MONTHLY", "QUARTERLY", "BI_ANNUAL", "ANNUAL"]),
  assignedTesterId: z.string().min(1),
  summaryOfTest: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const result = validateBody(addSchema, body);
    if ("error" in result) return result.error;
    const { controlIds, testingFrequency, assignedTesterId, summaryOfTest } = result.data;

    const created = [];
    for (const controlId of controlIds) {
      // Check not already on schedule
      const existing = await prisma.testingScheduleEntry.findUnique({ where: { controlId } });
      if (existing) {
        if (existing.isActive) continue; // Already active
        // Re-activate
        const reactivated = await prisma.testingScheduleEntry.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            testingFrequency,
            assignedTesterId,
            summaryOfTest,
            removedAt: null,
            removedReason: null,
          },
          include: {
            control: { include: { businessArea: true, controlOwner: true } },
            assignedTester: true,
          },
        });
        created.push(reactivated);
        continue;
      }

      const entry = await prisma.testingScheduleEntry.create({
        data: {
          controlId,
          testingFrequency,
          assignedTesterId,
          summaryOfTest,
          addedById: auth.userId,
        },
        include: {
          control: { include: { businessArea: true, controlOwner: true } },
          assignedTester: true,
        },
      });
      created.push(entry);
    }

    return jsonResponse(serialiseDates(created), 201);
  } catch (err) {
    console.error("[POST /api/controls/testing-schedule]", err);
    return errorResponse("Internal server error", 500);
  }
}
