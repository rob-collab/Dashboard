import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  const reports = await prisma.report.findMany({
    include: { creator: true },
    orderBy: { createdAt: "desc" },
  });
  return jsonResponse(serialiseDates(reports));
}

export async function POST(request: NextRequest) {
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
}
