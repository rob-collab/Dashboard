import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody, validateQuery } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const querySchema = z.object({
  periodYear: z.string().optional(),
  periodMonth: z.string().optional(),
  scheduleEntryId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const result = validateQuery(querySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;
    const { periodYear, periodMonth, scheduleEntryId } = result.data;

    const results = await prisma.controlTestResult.findMany({
      where: {
        ...(periodYear && { periodYear: parseInt(periodYear) }),
        ...(periodMonth && { periodMonth: parseInt(periodMonth) }),
        ...(scheduleEntryId && { scheduleEntryId }),
      },
      include: {
        testedBy: true,
        scheduleEntry: {
          include: {
            control: { include: { businessArea: true, controlOwner: true } },
            assignedTester: true,
          },
        },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    return jsonResponse(serialiseDates(results));
  } catch (err) {
    console.error("[GET /api/controls/test-results]", err);
    return errorResponse("Internal server error", 500);
  }
}

const resultSchema = z.object({
  scheduleEntryId: z.string().min(1),
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  result: z.enum(["PASS", "FAIL", "PARTIALLY", "NOT_TESTED", "NOT_DUE"]),
  notes: z.string().nullable().optional(),
  evidenceLinks: z.array(z.string()).optional(),
  effectiveDate: z.string().nullable().optional(),
});

const bulkSchema = z.object({
  results: z.array(resultSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const body = await request.json();
    const result = validateBody(bulkSchema, body);
    if ("error" in result) return result.error;
    const { results: entries } = result.data;

    // Determine if backdated
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const upserted = [];
    for (const entry of entries) {
      const isBackdated = entry.periodYear < currentYear ||
        (entry.periodYear === currentYear && entry.periodMonth < currentMonth);

      // Validate: Fail and Partially require notes
      if ((entry.result === "FAIL" || entry.result === "PARTIALLY") && !entry.notes?.trim()) {
        return errorResponse(
          `Notes are required for ${entry.result} results (schedule entry ${entry.scheduleEntryId}, ${entry.periodYear}-${entry.periodMonth})`,
          400
        );
      }

      const record = await prisma.controlTestResult.upsert({
        where: {
          scheduleEntryId_periodYear_periodMonth: {
            scheduleEntryId: entry.scheduleEntryId,
            periodYear: entry.periodYear,
            periodMonth: entry.periodMonth,
          },
        },
        update: {
          result: entry.result,
          notes: entry.notes ?? null,
          evidenceLinks: entry.evidenceLinks ?? [],
          effectiveDate: entry.effectiveDate ? new Date(entry.effectiveDate) : null,
          isBackdated,
          updatedById: userId,
        },
        create: {
          scheduleEntryId: entry.scheduleEntryId,
          periodYear: entry.periodYear,
          periodMonth: entry.periodMonth,
          result: entry.result,
          notes: entry.notes ?? null,
          evidenceLinks: entry.evidenceLinks ?? [],
          effectiveDate: entry.effectiveDate ? new Date(entry.effectiveDate) : null,
          isBackdated,
          testedById: userId,
        },
        include: {
          testedBy: true,
        },
      });
      upserted.push(record);
    }

    return jsonResponse(serialiseDates(upserted), 201);
  } catch (err) {
    console.error("[POST /api/controls/test-results]", err);
    return errorResponse("Internal server error", 500);
  }
}
