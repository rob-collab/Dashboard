import { NextRequest } from "next/server";
import { prisma } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";
  const status = searchParams.get("status");
  const reportId = searchParams.get("reportId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (reportId) where.reportId = reportId;

  const actions = await prisma.action.findMany({
    where,
    include: { assignee: true, creator: true },
    orderBy: { createdAt: "desc" },
  });

  if (format === "html") {
    const html = buildHTMLExport(actions);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="actions_export.html"`,
      },
    });
  }

  // Default: CSV
  const csv = buildCSVExport(actions);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="actions_export.csv"`,
    },
  });
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface ActionRow {
  id: string;
  title: string;
  description: string;
  reportPeriod: string | null;
  source: string | null;
  sectionTitle: string | null;
  assignee: { name: string } | null;
  dueDate: Date | null;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
}

function buildCSVExport(actions: ActionRow[]): string {
  const headers = [
    "Action ID",
    "Title",
    "Description",
    "Report / Period",
    "Source",
    "Section",
    "Owner",
    "Due Date",
    "Status",
    "Created",
    "Completed Date",
  ];
  const rows = actions.map((a) => [
    a.id,
    a.title,
    a.description,
    a.reportPeriod || "",
    a.source || "",
    a.sectionTitle || "",
    a.assignee?.name || "",
    formatDate(a.dueDate),
    a.status,
    formatDate(a.createdAt),
    formatDate(a.completedAt),
  ]);

  return [headers.map(escapeCSV).join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join(
    "\n"
  );
}

function buildHTMLExport(actions: ActionRow[]): string {
  const rows = actions
    .map(
      (a) => `
    <tr>
      <td>${a.title}</td>
      <td>${a.reportPeriod}</td>
      <td>${a.sectionTitle || "—"}</td>
      <td>${a.assignee?.name || "—"}</td>
      <td>${formatDate(a.dueDate)}</td>
      <td><span class="status-${a.status.toLowerCase()}">${a.status}</span></td>
      <td>${formatDate(a.createdAt)}</td>
      <td>${formatDate(a.completedAt)}</td>
    </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CCRO Actions Export</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 24px; }
    h1 { color: #1a1060; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    .status-open { color: #2563eb; }
    .status-in_progress { color: #d97706; }
    .status-completed { color: #059669; }
    .status-overdue { color: #dc2626; font-weight: 600; }
  </style>
</head>
<body>
  <h1>CCRO Dashboard — Actions</h1>
  <p>Exported ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
  <table>
    <thead>
      <tr>
        <th>Title</th><th>Report / Period</th><th>Section</th><th>Owner</th>
        <th>Due Date</th><th>Status</th><th>Created</th><th>Completed</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
