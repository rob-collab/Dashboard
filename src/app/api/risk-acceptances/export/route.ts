import { NextRequest } from "next/server";
import { prisma, getUserId, errorResponse } from "@/lib/api-helpers";
import { getRiskScore, calculateBreach, APPETITE_DISPLAY } from "@/lib/risk-categories";

function escapeCSV(value: string | null | undefined): string {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const statusFilter = request.nextUrl.searchParams.get("status");

    const acceptances = await prisma.riskAcceptance.findMany({
      where: statusFilter ? { status: statusFilter as never } : undefined,
      include: {
        risk: { include: { riskOwner: true } },
        proposer: true,
        approver: true,
        consumerDutyOutcome: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Reference",
      "Title",
      "Source",
      "Status",
      "Proposer",
      "Approver",
      "Risk Reference",
      "Residual Score",
      "Appetite",
      "Breach",
      "CD Outcome",
      "Review Date",
      "Conditions",
      "Proposed Date",
      "Approved Date",
      "Expired Date",
    ];

    const rows = acceptances.map((a) => {
      const risk = a.risk;
      const residualScore = risk ? getRiskScore(risk.residualLikelihood, risk.residualImpact) : null;
      const appetite = risk?.riskAppetite;
      const breach = risk && appetite ? calculateBreach(residualScore!, appetite) : null;
      const appetiteLabel = appetite ? APPETITE_DISPLAY[appetite] : "";

      return [
        a.reference,
        a.title,
        a.source,
        a.status,
        a.proposer?.name ?? "",
        a.approver?.name ?? "",
        risk?.reference ?? "",
        residualScore !== null ? String(residualScore) : "",
        appetiteLabel,
        breach ? (breach.breached ? `Yes (+${breach.difference})` : "No") : "",
        a.consumerDutyOutcome?.name ?? "",
        a.reviewDate ? new Date(a.reviewDate).toISOString().split("T")[0] : "",
        a.proposedConditions ?? "",
        a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : "",
        a.approvedAt ? new Date(a.approvedAt).toISOString().split("T")[0] : "",
        a.expiredAt ? new Date(a.expiredAt).toISOString().split("T")[0] : "",
      ].map(escapeCSV);
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="risk-acceptances-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/risk-acceptances/export]", err);
    return errorResponse("Internal server error", 500);
  }
}
