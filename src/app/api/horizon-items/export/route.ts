import { NextRequest } from "next/server";
import { prisma, getUserId, errorResponse } from "@/lib/api-helpers";

function csvEscape(val: string | null | undefined): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CATEGORY_LABELS: Record<string, string> = {
  FCA_REGULATORY: "FCA Regulatory",
  LEGISLATIVE: "Legislative",
  ECONOMIC: "Economic",
  DATA_TECHNOLOGY: "Data & Technology",
  EMPLOYMENT: "Employment Law",
  PAYMENTS_REGULATORY: "Payments & PSR",
  COMPETITIVE: "Competitive",
};

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return errorResponse("Unauthorised", 401);

    const items = await prisma.horizonItem.findMany({
      orderBy: [{ urgency: "asc" }, { deadline: "asc" }],
      include: { addedBy: { select: { name: true } } },
    });

    const headers = [
      "Reference", "Title", "Category", "Source", "Urgency", "Status",
      "Deadline", "Summary", "Why It Matters", "Recommended Actions",
      "Source URL", "Month Added", "In Focus", "Added By", "Created", "Last Updated",
    ];

    const rows = items.map((item) => [
      csvEscape(item.reference),
      csvEscape(item.title),
      csvEscape(CATEGORY_LABELS[item.category] ?? item.category),
      csvEscape(item.source),
      csvEscape(item.urgency),
      csvEscape(item.status),
      csvEscape(item.deadline ? new Date(item.deadline).toLocaleDateString("en-GB") : ""),
      csvEscape(item.summary),
      csvEscape(item.whyItMatters),
      csvEscape(item.actions),
      csvEscape(item.sourceUrl),
      csvEscape(item.monthAdded),
      csvEscape(item.inFocus ? "Yes" : "No"),
      csvEscape(item.addedBy?.name),
      csvEscape(item.createdAt.toLocaleDateString("en-GB")),
      csvEscape(item.updatedAt.toLocaleDateString("en-GB")),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="horizon-scan-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
