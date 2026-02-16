import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      creator: true,
      sections: { orderBy: { position: "asc" } },
      outcomes: {
        orderBy: { position: "asc" },
        include: {
          measures: {
            orderBy: { position: "asc" },
            include: { metrics: true },
          },
        },
      },
      versions: { orderBy: { version: "desc" }, include: { publisher: true } },
    },
  });
  if (!report) return errorResponse("Report not found", 404);
  return jsonResponse(serialiseDates(report));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const report = await prisma.report.update({
    where: { id },
    data: body,
    include: { creator: true },
  });
  return jsonResponse(serialiseDates(report));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.report.delete({ where: { id } });
  return jsonResponse({ deleted: true });
}
