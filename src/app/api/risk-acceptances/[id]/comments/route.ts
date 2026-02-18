import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createSchema = z.object({
  content: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);
    const { id } = await params;

    const acceptance = await prisma.riskAcceptance.findUnique({ where: { id } });
    if (!acceptance) return errorResponse("Risk acceptance not found", 404);

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;

    const comment = await prisma.riskAcceptanceComment.create({
      data: {
        acceptanceId: id,
        userId,
        content: result.data.content,
      },
      include: { user: true },
    });

    // History record
    await prisma.riskAcceptanceHistory.create({
      data: {
        acceptanceId: id,
        userId,
        action: "COMMENT_ADDED",
        fromStatus: acceptance.status,
        toStatus: acceptance.status,
        details: result.data.content.length > 100
          ? result.data.content.substring(0, 100) + "..."
          : result.data.content,
      },
    });

    // Audit log
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    await prisma.auditLog.create({
      data: {
        userId,
        userRole: user?.role ?? "VIEWER",
        action: "risk_acceptance_comment",
        entityType: "risk_acceptance",
        entityId: id,
        changes: { comment: result.data.content.substring(0, 200) },
      },
    }).catch((e) => console.error("[audit]", e));

    return jsonResponse(serialiseDates(comment), 201);
  } catch (err) {
    console.error("[POST /api/risk-acceptances/:id/comments]", err);
    return errorResponse("Internal server error", 500);
  }
}
