import { NextRequest } from "next/server";
import { prisma, requireCCRORole, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const now = new Date();

    // Find all APPROVED acceptances where reviewDate has passed
    const expired = await prisma.riskAcceptance.findMany({
      where: {
        status: "APPROVED",
        reviewDate: { lt: now },
      },
    });

    let count = 0;
    for (const acceptance of expired) {
      await prisma.riskAcceptance.update({
        where: { id: acceptance.id },
        data: {
          status: "EXPIRED",
          expiredAt: now,
        },
      });

      await prisma.riskAcceptanceHistory.create({
        data: {
          acceptanceId: acceptance.id,
          userId,
          action: "EXPIRE",
          fromStatus: "APPROVED",
          toStatus: "EXPIRED",
          details: `Review date ${acceptance.reviewDate?.toISOString().split("T")[0]} has passed. Acceptance expired automatically.`,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          userRole: "CCRO_TEAM",
          action: "risk_acceptance_expire",
          entityType: "risk_acceptance",
          entityId: acceptance.id,
          changes: { reference: acceptance.reference, expiredAt: now.toISOString() },
        },
      }).catch((e) => console.error("[audit]", e));

      count++;
    }

    return jsonResponse({ expired: count });
  } catch (err) {
    console.error("[POST /api/risk-acceptances/expiry-check]", err);
    return errorResponse("Internal server error", 500);
  }
}
