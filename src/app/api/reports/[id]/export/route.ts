import { NextRequest } from "next/server";
import { prisma, errorResponse } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${report.title} — ${report.period}</title>
<style>body{font-family:Inter,sans-serif;max-width:900px;margin:0 auto;padding:2rem}h1{color:#311B92}table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style>
</head><body>
<h1>${report.title}</h1>
<p><strong>Period:</strong> ${report.period} | <strong>Status:</strong> ${report.status}</p>
${report.sections.map((s) => `<section><h2>${s.title ?? ""}</h2><pre>${JSON.stringify(s.content, null, 2)}</pre></section>`).join("\n")}
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.title}-${report.period}.html"`,
    },
  });
}
