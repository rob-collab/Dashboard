import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: reportId } = await params;
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    // Verify the user is the report creator or CCRO
    const [report, user] = await Promise.all([
      prisma.report.findUnique({ where: { id: reportId }, select: { createdBy: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);
    if (!report) return errorResponse("Report not found", 404);
    if (report.createdBy !== userId && user?.role !== "CCRO_TEAM") {
      return errorResponse("Only the report creator or CCRO team can publish", 403);
    }

    const body = await request.json().catch(() => ({}));
    const publishNote = body.publishNote || null;

    const result = await prisma.$transaction(async (tx) => {
      const latest = await tx.reportVersion.findFirst({
        where: { reportId },
        orderBy: { version: "desc" },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      const fullReport = await tx.report.findUnique({
        where: { id: reportId },
        include: {
          sections: { orderBy: { position: "asc" } },
          outcomes: {
            include: { measures: { include: { metrics: true } } },
          },
        },
      });
      if (!fullReport) throw new Error("Report not found");

      const version = await tx.reportVersion.create({
        data: {
          reportId,
          version: nextVersion,
          snapshotData: JSON.parse(JSON.stringify(fullReport)),
          publishedBy: userId,
          publishNote,
        },
      });

      await tx.report.update({
        where: { id: reportId },
        data: { status: "PUBLISHED" },
      });

      return version;
    });

    return jsonResponse(serialiseDates(result), 201);
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
