import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { CreateReportSchema } from "@/lib/schemas/reports";

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const reports = await prisma.report.findMany({
      include: { creator: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(serialiseDates(reports));
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
    const validation = validateBody(CreateReportSchema, body);
    if ('error' in validation) return validation.error;
    const data = validation.data;

    const report = await prisma.report.create({
      data: {
        id: data.id,
        title: data.title,
        period: data.period,
        status: data.status,
        createdBy: userId,
      },
      include: { creator: true },
    });
    return jsonResponse(serialiseDates(report), 201);
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
