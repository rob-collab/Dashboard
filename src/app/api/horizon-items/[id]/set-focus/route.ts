import { NextRequest } from "next/server";
import { prisma, getUserId, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;

    // Transaction: clear all in-focus, then set the target
    const [, item] = await prisma.$transaction([
      prisma.horizonItem.updateMany({ where: { inFocus: true }, data: { inFocus: false } }),
      prisma.horizonItem.update({
        where: { id },
        data: { inFocus: true },
        include: {
          actionLinks: {
            include: {
              action: { select: { id: true, reference: true, title: true, status: true } },
            },
          },
          riskLinks: {
            include: {
              risk: { select: { id: true, reference: true, name: true } },
            },
          },
        },
      }),
    ]);

    return jsonResponse(serialiseDates(item));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
