import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, validateBody, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { UpdateReportSchema } from "@/lib/schemas/reports";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
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
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    const body = await request.json();
    const validation = validateBody(UpdateReportSchema, body);
    if ('error' in validation) return validation.error;
    const data = validation.data;

    const report = await prisma.report.update({
      where: { id },
      data,
      include: { creator: true },
    });
    return jsonResponse(serialiseDates(report));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    await prisma.report.delete({ where: { id } });
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
