import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
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
    const { title, period, status } = body;
    if (!title || !period) return errorResponse("title and period are required");

    const report = await prisma.report.create({
      data: {
        id: body.id || undefined,
        title,
        period,
        status: status || "DRAFT",
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
