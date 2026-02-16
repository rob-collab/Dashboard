import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  const outcomes = await prisma.consumerDutyOutcome.findMany({
    orderBy: { position: "asc" },
    include: {
      measures: {
        orderBy: { position: "asc" },
        include: { metrics: true },
      },
    },
  });
  return jsonResponse(serialiseDates(outcomes));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { outcomeId, name, shortDesc } = body;
  if (!outcomeId || !name || !shortDesc) {
    return errorResponse("outcomeId, name, and shortDesc are required");
  }

  const outcome = await prisma.consumerDutyOutcome.create({
    data: {
      id: body.id || undefined,
      reportId: body.reportId || null,
      outcomeId,
      name,
      shortDesc,
      icon: body.icon ?? null,
      ragStatus: body.ragStatus || "GOOD",
      position: body.position ?? 0,
    },
    include: {
      measures: { include: { metrics: true } },
    },
  });
  return jsonResponse(serialiseDates(outcome), 201);
}
