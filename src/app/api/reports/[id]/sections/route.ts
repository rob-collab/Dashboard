import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const sections = await prisma.section.findMany({
      where: { reportId: id },
      orderBy: { position: "asc" },
    });
    return jsonResponse(serialiseDates(sections));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id: reportId } = await params;
    const sections = await request.json();
    if (!Array.isArray(sections)) return errorResponse("Expected array of sections");

    await prisma.$transaction(async (tx) => {
      await tx.section.deleteMany({ where: { reportId } });
      for (const s of sections) {
        await tx.section.create({
          data: {
            id: s.id,
            reportId,
            type: s.type,
            position: s.position,
            title: s.title ?? null,
            content: s.content ?? {},
            layoutConfig: s.layoutConfig ?? {},
            styleConfig: s.styleConfig ?? {},
            templateId: s.templateId ?? null,
            componentId: s.componentId ?? null,
          },
        });
      }
    });

    const saved = await prisma.section.findMany({
      where: { reportId },
      orderBy: { position: "asc" },
    });
    return jsonResponse(serialiseDates(saved));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
