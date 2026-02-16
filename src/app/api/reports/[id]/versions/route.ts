import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return errorResponse("Report not found", 404);

  const versions = await prisma.reportVersion.findMany({
    where: { reportId: id },
    include: { publisher: true },
    orderBy: { version: "desc" },
  });
  return jsonResponse(serialiseDates(versions));
}
