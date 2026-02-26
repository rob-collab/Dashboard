import { NextRequest } from "next/server";
import { prisma, getUserId, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // CCRO_TEAM and CEO may change which item is in focus
    const userId = getUserId(req);
    if (!userId) return errorResponse("Unauthorised", 401);

    const caller = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!caller || (caller.role !== "CCRO_TEAM" && caller.role !== "CEO")) {
      return errorResponse("Forbidden — CCRO Team or CEO access required", 403);
    }

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
