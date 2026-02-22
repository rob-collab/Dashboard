import { NextRequest } from "next/server";
import { prisma, getUserId, errorResponse } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        creator: true,
        sections: { orderBy: { position: "asc" } },
        outcomes: {
          orderBy: { position: "asc" },
          include: {
            measures: {
              orderBy: { position: "asc" },
              include: { metrics: true },
            },
          },
        },
      },
    });
    if (!report) return errorResponse("Report not found", 404);

    const safeTitle = escapeHtml(report.title);
    const safePeriod = escapeHtml(report.period);
    const safeStatus = escapeHtml(report.status);

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${safeTitle} — ${safePeriod}</title>
<style>body{font-family:Inter,sans-serif;max-width:900px;margin:0 auto;padding:2rem}h1{color:#311B92}table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style>
</head><body>
<h1>${safeTitle}</h1>
<p><strong>Period:</strong> ${safePeriod} | <strong>Status:</strong> ${safeStatus}</p>
${report.sections.map((s) => `<section><h2>${escapeHtml(s.title ?? "")}</h2><pre>${escapeHtml(JSON.stringify(s.content, null, 2))}</pre></section>`).join("\n")}
</body></html>`;

    const filenameBase = `${report.title}-${report.period}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.html"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/[id]/export]", error);
    return errorResponse("Failed to export report", 500);
  }
}
