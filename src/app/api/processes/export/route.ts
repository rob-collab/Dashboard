import { NextRequest } from "next/server";
import { prisma, getUserId, errorResponse } from "@/lib/api-helpers";

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const PROCESS_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  UNDER_REVIEW: "Under Review",
  RETIRED: "Retired",
};

const PROCESS_CATEGORY_LABELS: Record<string, string> = {
  CUSTOMER_ONBOARDING: "Customer Onboarding",
  PAYMENTS: "Payments",
  LENDING: "Lending",
  COMPLIANCE: "Compliance",
  RISK_MANAGEMENT: "Risk Management",
  FINANCE: "Finance",
  TECHNOLOGY: "Technology",
  PEOPLE: "People",
  GOVERNANCE: "Governance",
  OTHER: "Other",
};

const PROCESS_TYPE_LABELS: Record<string, string> = {
  CORE: "Core",
  SUPPORT: "Support",
  MANAGEMENT: "Management",
  GOVERNANCE: "Governance",
};

const PROCESS_CRITICALITY_LABELS: Record<string, string> = {
  CRITICAL: "Critical",
  IMPORTANT: "Important",
  STANDARD: "Standard",
};

const PROCESS_FREQUENCY_LABELS: Record<string, string> = {
  AD_HOC: "Ad Hoc",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually",
  CONTINUOUS: "Continuous",
};

const AUTOMATION_LEVEL_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  PARTIALLY_AUTOMATED: "Partially Automated",
  FULLY_AUTOMATED: "Fully Automated",
};

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const statusFilter = request.nextUrl.searchParams.get("status");

    const rows = await prisma.process.findMany({
      include: { owner: true },
      orderBy: [{ reference: "asc" }],
      where: statusFilter ? { status: statusFilter as never } : undefined,
    });

    const headers = [
      "Reference",
      "Name",
      "Status",
      "Category",
      "Process Type",
      "Criticality",
      "Frequency",
      "Automation Level",
      "Owner",
      "Version",
      "Effective Date",
      "Next Review Date",
      "SLA Days",
      "SMF Function",
      "Maturity Score",
      "Prescribed Responsibilities",
    ];

    const csvRows = rows.map((p) => [
      p.reference,
      p.name,
      PROCESS_STATUS_LABELS[p.status] ?? p.status,
      PROCESS_CATEGORY_LABELS[p.category] ?? p.category,
      PROCESS_TYPE_LABELS[p.processType] ?? p.processType,
      PROCESS_CRITICALITY_LABELS[p.criticality] ?? p.criticality,
      PROCESS_FREQUENCY_LABELS[p.frequency] ?? p.frequency,
      AUTOMATION_LEVEL_LABELS[p.automationLevel] ?? p.automationLevel,
      p.owner?.name ?? "",
      p.version,
      p.effectiveDate ? new Date(p.effectiveDate).toISOString().split("T")[0] : "",
      p.nextReviewDate ? new Date(p.nextReviewDate).toISOString().split("T")[0] : "",
      p.endToEndSlaDays != null ? String(p.endToEndSlaDays) : "",
      p.smfFunction ?? "",
      String(p.maturityScore),
      (p.prescribedResponsibilities ?? []).join(" | "),
    ].map(escapeCSV));

    const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
    const date = new Date().toISOString().split("T")[0];

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="processes-${date}.csv"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/processes/export]", err);
    return errorResponse("Internal server error", 500);
  }
}
