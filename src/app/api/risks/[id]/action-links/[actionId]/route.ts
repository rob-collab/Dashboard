import { NextRequest } from "next/server";
import { prisma, requireCCRORole, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const auth = await requireCCRORole(req);
    if ("error" in auth) return auth.error;

    const { id: riskId, actionId } = await params;

    await prisma.riskActionLink.deleteMany({
      where: { riskId, actionId },
    });

    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
