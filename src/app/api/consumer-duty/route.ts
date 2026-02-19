import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, naturalCompare, jsonResponse, errorResponse, validateBody, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createOutcomeSchema = z.object({
  id: z.string().optional(),
  reportId: z.string().nullable().optional(),
  outcomeId: z.string().min(1),
  name: z.string().min(1),
  shortDesc: z.string().min(1),
  detailedDescription: z.string().nullable().optional(),
  previousRAG: z.string().nullable().optional(),
  monthlySummary: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  ragStatus: z.string().optional(),
  position: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const includeSnapshots = request.nextUrl.searchParams.get("includeSnapshots") === "true";

  const outcomes = await prisma.consumerDutyOutcome.findMany({
    orderBy: { position: "asc" },
    include: {
      measures: {
        orderBy: { position: "asc" },
        include: {
          metrics: {
            orderBy: { metric: "asc" },
            include: includeSnapshots ? { snapshots: { orderBy: { month: "asc" } } } : undefined,
          },
        },
      },
    },
  });
  // Secondary sort: within each outcome, sort measures by position then measureId naturally
  for (const o of outcomes) {
    if (o.measures) {
      o.measures.sort((a, b) => a.position - b.position || naturalCompare(a.measureId, b.measureId));
    }
  }
  return jsonResponse(serialiseDates(outcomes));
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const body = await request.json();
    const result = validateBody(createOutcomeSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    const outcome = await prisma.consumerDutyOutcome.create({
      data: {
        id: data.id || undefined,
        reportId: data.reportId || null,
        outcomeId: data.outcomeId,
        name: data.name,
        shortDesc: data.shortDesc,
        detailedDescription: data.detailedDescription ?? null,
        previousRAG: (data.previousRAG ?? null) as never,
        monthlySummary: data.monthlySummary ?? null,
        icon: data.icon ?? null,
        ragStatus: (data.ragStatus || "GOOD") as never,
        position: data.position ?? 0,
      },
      include: {
        measures: { include: { metrics: true } },
      },
    });
    return jsonResponse(serialiseDates(outcome), 201);
  } catch (error) {
    console.error("[POST /api/consumer-duty]", error);
    return errorResponse(error instanceof Error ? error.message : "Operation failed", 500);
  }
}
