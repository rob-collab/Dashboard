import type { Process } from "@/lib/types";
import {
  AUTOMATION_LEVEL_LABELS,
  MATURITY_LABELS,
  PROCESS_CATEGORY_LABELS,
  PROCESS_CRITICALITY_LABELS,
  PROCESS_FREQUENCY_LABELS,
  PROCESS_STATUS_LABELS,
  PROCESS_TYPE_LABELS,
  PROCESS_RISK_LINK_TYPE_LABELS,
} from "@/lib/types";

function esc(v: string | null | undefined): string {
  if (!v) return "";
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function badge(text: string, colour: string): string {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:${colour};margin-right:4px">${esc(text)}</span>`;
}

function section(title: string, content: string): string {
  return `
  <div style="margin-top:24px">
    <div style="background:#F5F3FF;border-left:3px solid #4C1D95;padding:8px 14px;border-radius:0 8px 8px 0;margin-bottom:12px">
      <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#4C1D95">${esc(title)}</span>
    </div>
    ${content}
  </div>`;
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return `<p style="font-size:12px;color:#9CA3AF;font-style:italic">None linked.</p>`;
  }
  const ths = headers.map((h) => `<th style="text-align:left;padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;background:#F9FAFB;border-bottom:1px solid #E5E7EB">${esc(h)}</th>`).join("");
  const trs = rows.map(
    (cells) =>
      `<tr>${cells.map((c) => `<td style="padding:7px 10px;font-size:12px;color:#374151;border-bottom:1px solid #F3F4F6;vertical-align:top">${c}</td>`).join("")}</tr>`,
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">${ths}${trs}</table>`;
}

function detail(label: string, value: string): string {
  return `<div style="padding:8px 0;border-bottom:1px solid #F3F4F6">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#9CA3AF;margin-bottom:2px">${esc(label)}</div>
    <div style="font-size:13px;color:#111827">${value || "<span style='color:#D1D5DB'>—</span>"}</div>
  </div>`;
}

export function generateProcessHTML(process: Process): string {
  const now = new Date();
  const exportDate = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  // Maturity colour
  const maturityColours: Record<number, { bg: string; text: string }> = {
    1: { bg: "#FEF2F2", text: "#DC2626" },
    2: { bg: "#FFF7ED", text: "#C2410C" },
    3: { bg: "#FFFBEB", text: "#B45309" },
    4: { bg: "#F0FDF4", text: "#15803D" },
    5: { bg: "#EFF6FF", text: "#1D4ED8" },
  };
  const mc = maturityColours[Math.min(5, Math.max(1, process.maturityScore))] ?? maturityColours[1];

  // Steps section
  const steps = process.steps ?? [];
  const stepsContent = steps.length > 0
    ? table(
        ["#", "Title", "Responsible", "Accountable", "SLA (days)", "Notes"],
        steps.map((s) => [
          String(s.stepOrder),
          esc(s.title),
          esc(s.responsibleRole) || "<span style='color:#D1D5DB'>—</span>",
          esc(s.accountableRole) || "<span style='color:#D1D5DB'>—</span>",
          s.slaDays != null ? String(s.slaDays) : "<span style='color:#D1D5DB'>—</span>",
          esc(s.notes) || "<span style='color:#D1D5DB'>—</span>",
        ]),
      )
    : `<p style="font-size:12px;color:#9CA3AF;font-style:italic">No steps defined.</p>`;

  // Controls section
  const controls = (process.controlLinks ?? []).map((l) => l.control).filter(Boolean);
  const controlsContent = table(
    ["Ref", "Name", "Type", "Frequency"],
    controls.map((c) => [
      `<span style="font-family:monospace;font-weight:700">${esc(c!.controlRef)}</span>`,
      esc(c!.controlName),
      esc(c!.controlType ?? "—"),
      esc(c!.controlFrequency),
    ]),
  );

  // Policies section
  const policies = (process.policyLinks ?? []).map((l) => l.policy).filter(Boolean);
  const policiesContent = table(
    ["Ref", "Name", "Status", "Version"],
    policies.map((p) => [
      `<span style="font-family:monospace;font-weight:700">${esc(p!.reference)}</span>`,
      esc(p!.name),
      esc(p!.status),
      esc(p!.version),
    ]),
  );

  // Regulations section
  const regulations = (process.regulationLinks ?? []).map((l) => l.regulation).filter(Boolean);
  const regulationsContent = table(
    ["Ref", "Name", "Body", "Compliance Status"],
    regulations.map((r) => [
      `<span style="font-family:monospace;font-weight:700">${esc(r!.reference)}</span>`,
      esc(r!.shortName ?? r!.name),
      esc(r!.body),
      esc(r!.complianceStatus),
    ]),
  );

  // Risks section
  const riskLinks = process.riskLinks ?? [];
  const risksContent = table(
    ["Ref", "Name", "Link Type", "Residual Score"],
    riskLinks.map((l) => {
      const r = l.risk;
      const residual = r ? r.residualLikelihood * r.residualImpact : null;
      return [
        `<span style="font-family:monospace;font-weight:700">${esc(r?.reference)}</span>`,
        esc(r?.name),
        esc(PROCESS_RISK_LINK_TYPE_LABELS[l.linkType]),
        residual != null ? String(residual) : "—",
      ];
    }),
  );

  // IBS section
  const ibsLinks = (process.ibsLinks ?? []).map((l) => l.ibs).filter(Boolean);
  const ibsContent = table(
    ["Ref", "Name", "MTD (hrs)", "RTO (hrs)", "SMF Accountable"],
    ibsLinks.map((ibs) => [
      `<span style="font-family:monospace;font-weight:700">${esc(ibs!.reference)}</span>`,
      esc(ibs!.name),
      ibs!.maxTolerableDisruptionHours != null ? String(ibs!.maxTolerableDisruptionHours) : "—",
      ibs!.rtoHours != null ? String(ibs!.rtoHours) : "—",
      esc(ibs!.smfAccountable) || "—",
    ]),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(process.reference)} — ${esc(process.name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#F5F3FF;color:#374151;padding:32px 16px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .container{max-width:960px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden}
    .header{background:#1B1464;padding:28px 32px;color:#fff}
    .header-ref{font-family:monospace;font-size:12px;font-weight:700;background:rgba(255,255,255,.15);padding:3px 10px;border-radius:4px;display:inline-block;margin-bottom:10px;letter-spacing:.04em}
    .header-title{font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;line-height:1.3;margin-bottom:10px}
    .header-meta{font-size:11px;opacity:.7;margin-top:8px}
    .body{padding:28px 32px}
    .details-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 32px}
    @media(max-width:600px){.details-grid{grid-template-columns:1fr}}
    @media print{body{background:#fff;padding:0}.container{box-shadow:none;border-radius:0}}
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="header-ref">${esc(process.reference)}</div>
    <div class="header-title">${esc(process.name)}</div>
    <div>
      ${badge(MATURITY_LABELS[Math.min(5, Math.max(1, process.maturityScore))], mc.bg).replace('style="', `style="color:${mc.text};`)}
      ${badge(PROCESS_STATUS_LABELS[process.status], "rgba(255,255,255,.15)").replace('style="', 'style="color:#fff;')}
      ${badge(PROCESS_CRITICALITY_LABELS[process.criticality], "rgba(255,255,255,.15)").replace('style="', 'style="color:#fff;')}
    </div>
    <div class="header-meta">Exported ${exportDate} · ${esc(process.reference)}</div>
  </div>

  <div class="body">
    ${section("Process Details", `<div class="details-grid">
      ${detail("Owner", esc(process.owner?.name))}
      ${detail("Category", esc(PROCESS_CATEGORY_LABELS[process.category]))}
      ${detail("Process Type", esc(PROCESS_TYPE_LABELS[process.processType]))}
      ${detail("Criticality", esc(PROCESS_CRITICALITY_LABELS[process.criticality]))}
      ${detail("Status", esc(PROCESS_STATUS_LABELS[process.status]))}
      ${detail("Frequency", esc(PROCESS_FREQUENCY_LABELS[process.frequency]))}
      ${detail("Automation Level", esc(AUTOMATION_LEVEL_LABELS[process.automationLevel]))}
      ${detail("Version", esc(process.version))}
      ${detail("Effective Date", formatDate(process.effectiveDate))}
      ${detail("Next Review", formatDate(process.nextReviewDate))}
      ${detail("End-to-End SLA", process.endToEndSlaDays != null ? `${process.endToEndSlaDays} day${process.endToEndSlaDays !== 1 ? "s" : ""}` : "—")}
      ${detail("SMF Function", esc(process.smfFunction))}
      ${detail("Maturity Score", `<span style="font-weight:700;color:${mc.text}">${process.maturityScore} — ${MATURITY_LABELS[Math.min(5, Math.max(1, process.maturityScore))]}</span>`)}
    </div>`)}

    ${process.purpose || process.description || process.scope ? section("Description & Scope", `
      ${process.purpose ? `<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9CA3AF;margin-bottom:4px">Purpose</div><p style="font-size:13px;color:#374151;line-height:1.6;white-space:pre-line">${esc(process.purpose)}</p></div>` : ""}
      ${process.description ? `<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9CA3AF;margin-bottom:4px">Description</div><p style="font-size:13px;color:#374151;line-height:1.6;white-space:pre-line">${esc(process.description)}</p></div>` : ""}
      ${process.scope ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9CA3AF;margin-bottom:4px">Scope</div><p style="font-size:13px;color:#374151;line-height:1.6;white-space:pre-line">${esc(process.scope)}</p></div>` : ""}
    `) : ""}

    ${section(`Process Steps (${steps.length})`, stepsContent)}
    ${section(`Controls (${controls.length})`, controlsContent)}
    ${section(`Policies (${policies.length})`, policiesContent)}
    ${section(`Regulations (${regulations.length})`, regulationsContent)}
    ${section(`Risks (${riskLinks.length})`, risksContent)}
    ${section(`Important Business Services (${ibsLinks.length})`, ibsContent)}
  </div>
</div>
</body>
</html>`;
}
