/**
 * CCRO Dashboard — Interactive HTML Export Builder
 * Generates fully self-contained HTML packs with inline CSS, inline SVG charts,
 * and optional inline JavaScript for interactive features (expandable rows,
 * live search, TOC scroll-spy, section fold, print mode).
 */

// ── Escape helper ─────────────────────────────────────────────────────────────

export function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExportData {
  firmName?: string;
  risks?: RiskRow[];
  controls?: ControlRow[];
  regulations?: RegRow[];
  outcomes?: OutcomeRow[];
  ibs?: IBSRow[];
  scenarios?: ScenarioRow[];
  selfAssessment?: SARow | null;
  processes?: ProcessRow[];
  actions?: ActionRow[];
  auditLogs?: AuditRow[];
}

export interface ExportOptions {
  sections: SectionKey[];
  firmName?: string;
  watermark?: "NONE" | "CONFIDENTIAL" | "DRAFT";
  packTitle?: string;
  interactive?: boolean;
}

export type SectionKey =
  | "executive_summary"
  | "risk_register"
  | "controls"
  | "compliance"
  | "consumer_duty"
  | "or_resilience"
  | "process_library"
  | "actions"
  | "audit_trail";

// Minimal row types — only the fields we render
export interface RiskRow {
  id: string; reference: string; name: string; description: string;
  categoryL1: string; categoryL2: string;
  inherentLikelihood: number; inherentImpact: number;
  residualLikelihood: number; residualImpact: number;
  directionOfTravel: string; riskAppetite: string | null;
}

export interface ControlRow {
  id: string; controlRef: string; controlName: string; controlDescription: string;
  controlType: string | null; isActive: boolean;
  businessArea?: { name: string } | null;
}

export interface RegRow {
  id: string; reference: string; name: string; shortName: string | null;
  body: string; complianceStatus: string; isApplicable: boolean;
  assessmentNotes: string | null;
}

export interface OutcomeRow {
  id: string; outcomeId: string; name: string; shortDesc: string;
  ragStatus: string; monthlySummary: string | null;
}

export interface IBSRow {
  id: string; reference: string; name: string; smfAccountable: string | null;
  maxTolerableDisruptionHours: number | null; status: string;
  categoriesFilled?: number;
}

export interface ScenarioRow {
  id: string; reference: string; ibsId: string; name: string;
  scenarioType: string; status: string; outcome: string;
  testedAt: string | null; nextTestDate: string | null; findings: string | null;
  remediationRequired: boolean;
}

export interface SARow {
  id: string; year: number; status: string; executiveSummary: string | null;
  vulnerabilitiesCount: number; openRemediations: number; documentUrl: string | null;
}

export interface ProcessRow {
  id: string; reference: string; name: string; category: string;
  criticality: string; maturityScore: number; status: string;
  nextReviewDate: string | null;
}

export interface ActionRow {
  id: string; reference: string; title: string; status: string;
  priority: string | null; assignedTo: string; dueDate: string | null;
  description: string;
}

export interface AuditRow {
  id: string; timestamp: string; action: string; entityType: string;
  userId: string; userRole: string; changes: Record<string, unknown> | null;
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function ragBadge(rag: string): string {
  const colours: Record<string, string> = {
    GOOD: "badge-green", WARNING: "badge-amber", HARM: "badge-red",
    COMPLIANT: "badge-green", PARTIALLY_COMPLIANT: "badge-amber",
    NON_COMPLIANT: "badge-red", NOT_ASSESSED: "badge-gray", GAP_IDENTIFIED: "badge-red",
    WITHIN_TOLERANCE: "badge-green", BREACH: "badge-red", NOT_TESTED: "badge-gray",
    COMPLETE: "badge-green", IN_PROGRESS: "badge-amber", PLANNED: "badge-blue",
    OPEN: "badge-red", COMPLETED: "badge-green", OVERDUE: "badge-red",
    DRAFT: "badge-gray", SUBMITTED: "badge-blue", APPROVED: "badge-green",
    ACTIVE: "badge-green", RETIRED: "badge-gray", UNDER_REVIEW: "badge-amber",
  };
  return colours[rag] ?? "badge-gray";
}

function ragLabel(rag: string): string {
  const labels: Record<string, string> = {
    GOOD: "Good", WARNING: "Warning", HARM: "Harm",
    COMPLIANT: "Compliant", PARTIALLY_COMPLIANT: "Partial", NON_COMPLIANT: "Non-Compliant",
    NOT_ASSESSED: "Not Assessed", GAP_IDENTIFIED: "Gap",
    WITHIN_TOLERANCE: "Within Tolerance", BREACH: "Tolerance Breach", NOT_TESTED: "Not Tested",
    COMPLETE: "Complete", IN_PROGRESS: "In Progress", PLANNED: "Planned",
    OPEN: "Open", COMPLETED: "Completed", OVERDUE: "Overdue",
    DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved",
    ACTIVE: "Active", RETIRED: "Retired", UNDER_REVIEW: "Under Review",
    CRITICAL: "Critical", IMPORTANT: "Important", STANDARD: "Standard",
    P1: "P1 — Critical", P2: "P2 — Important", P3: "P3 — Routine",
    IMPROVING: "↑ Improving", STABLE: "→ Stable", DETERIORATING: "↓ Deteriorating",
    CYBER_ATTACK: "Cyber Attack", SYSTEM_OUTAGE: "System Outage",
    THIRD_PARTY_FAILURE: "Third-Party Failure", PANDEMIC: "Pandemic",
    BUILDING_LOSS: "Building Loss", DATA_CORRUPTION: "Data Corruption",
    KEY_PERSON_LOSS: "Key Person Loss", REGULATORY_CHANGE: "Regulatory Change",
  };
  return labels[rag] ?? rag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function riskScore(l: number, i: number): number { return l * i; }

// ── SVG Charts ────────────────────────────────────────────────────────────────

function svgRiskHeatMap(risks: RiskRow[]): string {
  const cells: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (const r of risks) {
    const row = Math.min(5, Math.max(1, r.residualLikelihood)) - 1;
    const col = Math.min(5, Math.max(1, r.residualImpact)) - 1;
    cells[row][col]++;
  }
  const cellSize = 36;
  const pad = 30;
  const w = 5 * cellSize + pad * 2;
  const h = 5 * cellSize + pad * 2;
  const colourForCell = (row: number, col: number): string => {
    const score = (row + 1) * (col + 1);
    if (score >= 15) return "#fee2e2";
    if (score >= 8) return "#fef3c7";
    return "#dcfce7";
  };
  let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="font-family:system-ui,sans-serif">`;
  svg += `<text x="${w / 2}" y="15" text-anchor="middle" font-size="10" fill="#6b7280">Risk Heat Map (Residual)</text>`;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const x = pad + c * cellSize;
      const y = pad + (4 - r) * cellSize;
      const count = cells[r][c];
      const bg = colourForCell(r, c);
      svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${bg}" stroke="white" stroke-width="1.5"/>`;
      if (count > 0) {
        svg += `<text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="#111">${count}</text>`;
      }
    }
  }
  // Axis labels
  for (let i = 0; i < 5; i++) {
    svg += `<text x="${pad + i * cellSize + cellSize / 2}" y="${pad + 5 * cellSize + 14}" text-anchor="middle" font-size="9" fill="#9ca3af">${i + 1}</text>`;
    svg += `<text x="${pad - 10}" y="${pad + (4 - i) * cellSize + cellSize / 2 + 4}" text-anchor="middle" font-size="9" fill="#9ca3af">${i + 1}</text>`;
  }
  svg += `<text x="${pad + 2.5 * cellSize}" y="${pad + 5 * cellSize + 26}" text-anchor="middle" font-size="9" fill="#9ca3af">Impact →</text>`;
  svg += `<text x="10" y="${pad + 2.5 * cellSize}" text-anchor="middle" font-size="9" fill="#9ca3af" transform="rotate(-90, 10, ${pad + 2.5 * cellSize})">Likelihood →</text>`;
  svg += `</svg>`;
  return svg;
}

function svgComplianceDonut(regs: RegRow[]): string {
  const counts: Record<string, number> = {
    COMPLIANT: 0, PARTIALLY_COMPLIANT: 0, NON_COMPLIANT: 0,
    GAP_IDENTIFIED: 0, NOT_ASSESSED: 0,
  };
  for (const r of regs.filter((r) => r.isApplicable)) {
    const k = r.complianceStatus in counts ? r.complianceStatus : "NOT_ASSESSED";
    counts[k]++;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return `<svg width="180" height="120" xmlns="http://www.w3.org/2000/svg"><text x="90" y="65" text-anchor="middle" font-size="12" fill="#9ca3af">No data</text></svg>`;

  const colours = ["#16a34a", "#d97706", "#dc2626", "#ef4444", "#9ca3af"];
  const labels = ["Compliant", "Partial", "Non-Compliant", "Gap", "Not Assessed"];
  const keys = ["COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT", "GAP_IDENTIFIED", "NOT_ASSESSED"];

  const cx = 60; const cy = 60; const r = 45; const inner = 28;
  let startAngle = -Math.PI / 2;

  let paths = "";
  keys.forEach((k, i) => {
    const count = counts[k];
    if (count === 0) return;
    const angle = (count / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(startAngle + angle);
    const y2 = cy + r * Math.sin(startAngle + angle);
    const ix1 = cx + inner * Math.cos(startAngle);
    const iy1 = cy + inner * Math.sin(startAngle);
    const ix2 = cx + inner * Math.cos(startAngle + angle);
    const iy2 = cy + inner * Math.sin(startAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    paths += `<path d="M${ix1},${iy1} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix2},${iy2} A${inner},${inner} 0 ${large} 0 ${ix1},${iy1} Z" fill="${colours[i]}"/>`;
    startAngle += angle;
  });

  // Legend
  let legend = "";
  let ly = 12;
  keys.forEach((k, i) => {
    const count = counts[k];
    if (count === 0) return;
    legend += `<rect x="126" y="${ly}" width="8" height="8" fill="${colours[i]}" rx="2"/>`;
    legend += `<text x="138" y="${ly + 7}" font-size="9" fill="#374151">${labels[i]} (${count})</text>`;
    ly += 14;
  });

  return `<svg width="240" height="120" xmlns="http://www.w3.org/2000/svg" style="font-family:system-ui,sans-serif">
    <text x="60" y="10" text-anchor="middle" font-size="10" fill="#6b7280">Compliance Status</text>
    ${paths}
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="#111">${total}</text>
    ${legend}
  </svg>`;
}

function svgIBSReadinessBar(ibsList: IBSRow[]): string {
  const green = ibsList.filter((i) => (i.categoriesFilled ?? 0) >= 4).length;
  const amber = ibsList.filter((i) => { const c = i.categoriesFilled ?? 0; return c >= 2 && c < 4; }).length;
  const red = ibsList.filter((i) => (i.categoriesFilled ?? 0) < 2).length;
  const total = ibsList.length;
  if (total === 0) return "";
  const w = 200; const bw = 12;
  const bars = [
    { label: "Ready (≥4 cat.)", count: green, colour: "#16a34a" },
    { label: "Partial (2–3)", count: amber, colour: "#d97706" },
    { label: "Gaps (<2)", count: red, colour: "#dc2626" },
  ];
  let svg = `<svg width="260" height="80" xmlns="http://www.w3.org/2000/svg" style="font-family:system-ui,sans-serif">`;
  svg += `<text x="0" y="12" font-size="10" fill="#6b7280">IBS Readiness</text>`;
  bars.forEach((b, i) => {
    const barWidth = total > 0 ? (b.count / total) * w : 0;
    const y = 18 + i * (bw + 8);
    svg += `<rect x="0" y="${y}" width="${w}" height="${bw}" fill="#f3f4f6" rx="3"/>`;
    if (barWidth > 0) svg += `<rect x="0" y="${y}" width="${barWidth}" height="${bw}" fill="${b.colour}" rx="3"/>`;
    svg += `<text x="${w + 6}" y="${y + 9}" font-size="9" fill="#374151">${b.count} — ${b.label}</text>`;
  });
  svg += `</svg>`;
  return svg;
}

function svgMaturityBar(procs: ProcessRow[]): string {
  const counts = [0, 0, 0, 0, 0];
  for (const p of procs) {
    const m = Math.min(5, Math.max(1, p.maturityScore));
    counts[m - 1]++;
  }
  const total = procs.length;
  if (total === 0) return "";
  const w = 180; const bh = 12;
  const colours = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
  let svg = `<svg width="260" height="90" xmlns="http://www.w3.org/2000/svg" style="font-family:system-ui,sans-serif">`;
  svg += `<text x="0" y="12" font-size="10" fill="#6b7280">Process Maturity Distribution</text>`;
  counts.forEach((c, i) => {
    const bw = total > 0 ? (c / total) * w : 0;
    const y = 18 + i * (bh + 5);
    svg += `<rect x="0" y="${y}" width="${w}" height="${bh}" fill="#f3f4f6" rx="2"/>`;
    if (bw > 0) svg += `<rect x="0" y="${y}" width="${bw}" height="${bh}" fill="${colours[i]}" rx="2"/>`;
    svg += `<text x="${w + 6}" y="${y + 9}" font-size="9" fill="#374151">L${i + 1}: ${c}</text>`;
  });
  svg += `</svg>`;
  return svg;
}

// ── Section Renderers ─────────────────────────────────────────────────────────

function renderExecutiveSummary(data: ExportData): string {
  const risks = data.risks ?? [];
  const controls = data.controls ?? [];
  const regs = data.regulations ?? [];
  const actions = data.actions ?? [];
  const ibs = data.ibs ?? [];

  const openRisks = risks.length;
  const complianceGaps = regs.filter((r) => r.isApplicable && ["NON_COMPLIANT", "GAP_IDENTIFIED"].includes(r.complianceStatus)).length;
  const openActions = actions.filter((a) => a.status !== "COMPLETED").length;
  const orGreen = ibs.filter((i) => (i.categoriesFilled ?? 0) >= 4).length;
  const orPct = ibs.length > 0 ? Math.round((orGreen / ibs.length) * 100) : 0;

  const donut = regs.length > 0 ? svgComplianceDonut(regs) : "";

  return section("executive_summary", "Executive Summary", `
    <div class="kpi-grid">
      ${kpi("Open Risks", openRisks, openRisks > 5 ? "kpi-red" : "kpi-green")}
      ${kpi("Controls Tracked", controls.length, "kpi-blue")}
      ${kpi("Compliance Gaps", complianceGaps, complianceGaps > 0 ? "kpi-red" : "kpi-green")}
      ${kpi("Open Actions", openActions, openActions > 0 ? "kpi-amber" : "kpi-green")}
      ${kpi("OR Readiness", `${orPct}%`, orPct >= 80 ? "kpi-green" : orPct >= 50 ? "kpi-amber" : "kpi-red")}
    </div>
    ${donut ? `<div style="margin-top:1.5rem">${donut}</div>` : ""}
  `);
}

function kpi(label: string, value: string | number, cls: string): string {
  return `<div class="kpi-card ${cls}"><div class="kpi-value">${escapeHtml(String(value))}</div><div class="kpi-label">${escapeHtml(label)}</div></div>`;
}

function renderRiskRegister(risks: RiskRow[]): string {
  const heatMap = risks.length > 0 ? svgRiskHeatMap(risks) : "";
  const rows = risks.map((r) => {
    const score = riskScore(r.residualLikelihood, r.residualImpact);
    const scoreCls = score >= 15 ? "badge-red" : score >= 8 ? "badge-amber" : "badge-green";
    return entityRow(r.id, `
      <div class="row-summary">
        <span class="mono">${escapeHtml(r.reference)}</span>
        <span class="entity-name">${escapeHtml(r.name)}</span>
        <span class="badge ${ragBadge(r.directionOfTravel ?? "STABLE")}">${ragLabel(r.directionOfTravel ?? "STABLE")}</span>
        <span class="badge ${scoreCls}">Score ${score}</span>
      </div>
    `, `
      <div class="detail-body">
        <p><strong>Category:</strong> ${escapeHtml(r.categoryL1)} › ${escapeHtml(r.categoryL2)}</p>
        <p><strong>Description:</strong> ${escapeHtml(r.description)}</p>
        <div class="score-grid">
          <div><span class="label">Inherent</span><span>${r.inherentLikelihood}×${r.inherentImpact} = ${riskScore(r.inherentLikelihood, r.inherentImpact)}</span></div>
          <div><span class="label">Residual</span><span>${r.residualLikelihood}×${r.residualImpact} = ${score}</span></div>
          ${r.riskAppetite ? `<div><span class="label">Appetite</span><span>${ragLabel(r.riskAppetite)}</span></div>` : ""}
        </div>
      </div>
    `);
  });
  return section("risk_register", "Risk Register", `
    ${heatMap ? `<div style="margin-bottom:1.5rem">${heatMap}</div>` : ""}
    <div class="search-bar"><input class="section-search" type="text" placeholder="Search risks…" /></div>
    <div class="entity-list">${rows.join("")}</div>
  `);
}

function renderControlsSection(controls: ControlRow[]): string {
  const rows = controls.map((c) => entityRow(c.id, `
    <div class="row-summary">
      <span class="mono">${escapeHtml(c.controlRef)}</span>
      <span class="entity-name">${escapeHtml(c.controlName)}</span>
      ${c.controlType ? `<span class="badge badge-blue">${ragLabel(c.controlType)}</span>` : ""}
      <span class="badge ${c.isActive ? "badge-green" : "badge-gray"}">${c.isActive ? "Active" : "Inactive"}</span>
    </div>
  `, `
    <div class="detail-body">
      ${c.businessArea ? `<p><strong>Business Area:</strong> ${escapeHtml(c.businessArea.name)}</p>` : ""}
      <p><strong>Description:</strong> ${escapeHtml(c.controlDescription)}</p>
    </div>
  `));
  return section("controls", "Controls Library", `
    <div class="search-bar"><input class="section-search" type="text" placeholder="Search controls…" /></div>
    <div class="entity-list">${rows.join("")}</div>
  `);
}

function renderComplianceSection(regs: RegRow[]): string {
  const rows = regs.filter((r) => r.isApplicable).map((r) => entityRow(r.id, `
    <div class="row-summary">
      <span class="mono">${escapeHtml(r.reference)}</span>
      <span class="entity-name">${escapeHtml(r.shortName ?? r.name)}</span>
      <span class="badge badge-gray">${escapeHtml(r.body)}</span>
      <span class="badge ${ragBadge(r.complianceStatus)}">${ragLabel(r.complianceStatus)}</span>
    </div>
  `, `
    <div class="detail-body">
      <p><strong>Full Name:</strong> ${escapeHtml(r.name)}</p>
      ${r.assessmentNotes ? `<p><strong>Assessment Notes:</strong> ${escapeHtml(r.assessmentNotes)}</p>` : ""}
    </div>
  `));
  return section("compliance", "Compliance Universe", `
    <div class="search-bar"><input class="section-search" type="text" placeholder="Search regulations…" /></div>
    <div class="entity-list">${rows.join("")}</div>
  `);
}

function renderConsumerDutySection(outcomes: OutcomeRow[]): string {
  const rows = outcomes.map((o) => entityRow(o.id, `
    <div class="row-summary">
      <span class="mono">${escapeHtml(o.outcomeId)}</span>
      <span class="entity-name">${escapeHtml(o.name)}</span>
      <span class="badge ${ragBadge(o.ragStatus)}">${ragLabel(o.ragStatus)}</span>
    </div>
  `, `
    <div class="detail-body">
      <p><strong>Description:</strong> ${escapeHtml(o.shortDesc)}</p>
      ${o.monthlySummary ? `<p><strong>Monthly Summary:</strong> ${escapeHtml(o.monthlySummary)}</p>` : ""}
    </div>
  `));
  return section("consumer_duty", "Consumer Duty Dashboard", `
    <div class="search-bar"><input class="section-search" type="text" placeholder="Search outcomes…" /></div>
    <div class="entity-list">${rows.join("")}</div>
  `);
}

function renderORSection(ibsList: IBSRow[], scenarios: ScenarioRow[], sa: SARow | null): string {
  const readinessBar = ibsList.length > 0 ? svgIBSReadinessBar(ibsList) : "";
  const ibsRows = ibsList.map((ibs) => {
    const ibsScenarios = scenarios.filter((s) => s.ibsId === ibs.id);
    const breach = ibsScenarios.filter((s) => s.outcome === "BREACH").length;
    const scenarioHtml = ibsScenarios.length > 0
      ? `<table class="mini-table"><tr><th>Scenario</th><th>Type</th><th>Status</th><th>Outcome</th><th>Tested</th></tr>` +
        ibsScenarios.map((sc) => `<tr>
          <td>${escapeHtml(sc.name)}</td>
          <td>${ragLabel(sc.scenarioType)}</td>
          <td><span class="badge ${ragBadge(sc.status)}">${ragLabel(sc.status)}</span></td>
          <td><span class="badge ${ragBadge(sc.outcome)}">${ragLabel(sc.outcome)}</span></td>
          <td>${fmtDate(sc.testedAt)}</td>
        </tr>`).join("") + `</table>`
      : `<p style="color:#9ca3af;font-size:0.8rem">No scenario tests logged.</p>`;
    return entityRow(ibs.id, `
      <div class="row-summary">
        <span class="mono">${escapeHtml(ibs.reference)}</span>
        <span class="entity-name">${escapeHtml(ibs.name)}</span>
        ${ibs.smfAccountable ? `<span class="badge badge-gray">${escapeHtml(ibs.smfAccountable)}</span>` : ""}
        ${breach > 0 ? `<span class="badge badge-red">${breach} breach${breach > 1 ? "es" : ""}</span>` : ""}
        <span class="badge ${ibs.status === "ACTIVE" ? "badge-green" : "badge-gray"}">${ragLabel(ibs.status)}</span>
      </div>
    `, `
      <div class="detail-body">
        ${ibs.maxTolerableDisruptionHours != null ? `<p><strong>MTD:</strong> ${ibs.maxTolerableDisruptionHours}h</p>` : ""}
        ${ibs.categoriesFilled != null ? `<p><strong>Resource Categories Filled:</strong> ${ibs.categoriesFilled}/5</p>` : ""}
        <p style="margin-top:0.75rem;font-weight:600;font-size:0.8rem">Scenario Tests (${ibsScenarios.length})</p>
        ${scenarioHtml}
      </div>
    `);
  });

  const saHtml = sa ? `
    <div class="info-box" style="margin-top:1.5rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <strong>${sa.year} Self-Assessment</strong>
        <span class="badge ${ragBadge(sa.status)}">${ragLabel(sa.status)}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.75rem">
        <div><span style="color:#6b7280;font-size:0.8rem">Vulnerabilities</span><br><strong style="font-size:1.2rem">${sa.vulnerabilitiesCount}</strong></div>
        <div><span style="color:#6b7280;font-size:0.8rem">Open Remediations</span><br><strong style="font-size:1.2rem">${sa.openRemediations}</strong></div>
      </div>
      ${sa.executiveSummary ? `<p style="font-size:0.85rem;color:#374151">${escapeHtml(sa.executiveSummary)}</p>` : ""}
    </div>` : "";

  return section("or_resilience", "Operational Resilience", `
    ${readinessBar ? `<div style="margin-bottom:1.5rem">${readinessBar}</div>` : ""}
    <div class="search-bar"><input class="section-search" type="text" placeholder="Search IBS…" /></div>
    <div class="entity-list">${ibsRows.join("")}</div>
    ${saHtml}
  `);
}

function renderProcessesSection(processes: ProcessRow[]): string {
  const matBar = processes.length > 0 ? svgMaturityBar(processes) : "";
  const rows = processes.map((p) => entityRow(p.id, `
    <div class="row-summary">
      <span class="mono">${escapeHtml(p.reference)}</span>
      <span class="entity-name">${escapeHtml(p.name)}</span>
      <span class="badge badge-gray">${ragLabel(p.category)}</span>
      <span class="badge ${ragBadge(p.criticality)}">${ragLabel(p.criticality)}</span>
      <span class="badge badge-blue">L${p.maturityScore}</span>
    </div>
  `, `
    <div class="detail-body">
      <p><strong>Status:</strong> ${ragLabel(p.status)}</p>
      ${p.nextReviewDate ? `<p><strong>Next Review:</strong> ${fmtDate(p.nextReviewDate)}</p>` : ""}
    </div>
  `));
  return section("process_library", "Process Library", `
    ${matBar ? `<div style="margin-bottom:1.5rem">${matBar}</div>` : ""}
    <div class="search-bar"><input class="section-search" type="text" placeholder="Search processes…" /></div>
    <div class="entity-list">${rows.join("")}</div>
  `);
}

function renderActionsSection(actions: ActionRow[]): string {
  const rows = actions.map((a) => entityRow(a.id, `
    <div class="row-summary">
      <span class="mono">${escapeHtml(a.reference)}</span>
      <span class="entity-name">${escapeHtml(a.title)}</span>
      ${a.priority ? `<span class="badge badge-gray">${ragLabel(a.priority)}</span>` : ""}
      <span class="badge ${ragBadge(a.status)}">${ragLabel(a.status)}</span>
      ${a.dueDate ? `<span class="badge badge-gray">Due ${fmtDate(a.dueDate)}</span>` : ""}
    </div>
  `, `
    <div class="detail-body">
      <p><strong>Description:</strong> ${escapeHtml(a.description)}</p>
      <p><strong>Assigned To:</strong> ${escapeHtml(a.assignedTo)}</p>
    </div>
  `));
  return section("actions", "Actions Register", `
    <div class="search-bar"><input class="section-search" type="text" placeholder="Search actions…" /></div>
    <div class="entity-list">${rows.join("")}</div>
  `);
}

function renderAuditSection(logs: AuditRow[]): string {
  const items = logs.map((l) => `
    <div class="audit-row entity-row" data-id="${escapeHtml(l.id)}">
      <div class="audit-time">${fmtDate(l.timestamp)}</div>
      <div class="audit-body">
        <span class="badge badge-gray">${escapeHtml(l.entityType)}</span>
        <span class="audit-action">${escapeHtml(l.action)}</span>
        <span class="audit-user">${escapeHtml(l.userId)} (${escapeHtml(l.userRole)})</span>
      </div>
    </div>
  `);
  return section("audit_trail", "Audit Trail", `
    <div class="search-bar"><input class="section-search" type="text" placeholder="Search audit events…" /></div>
    <div class="entity-list">${items.join("")}</div>
  `);
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function section(id: string, title: string, body: string): string {
  return `
    <section class="content-section" id="sec-${id}">
      <div class="section-header">
        <h2 class="section-title fold-trigger" data-target="sec-${id}-body">${escapeHtml(title)}</h2>
        <span class="fold-icon">▾</span>
      </div>
      <div class="section-body" id="sec-${id}-body">
        ${body}
      </div>
    </section>
  `;
}

function entityRow(id: string, summary: string, detail: string): string {
  return `
    <div class="entity-row" data-id="${escapeHtml(id)}">
      <div class="entity-summary expand-trigger">${summary}</div>
      <div class="entity-detail">${detail}</div>
    </div>
  `;
}

// ── Inline CSS ────────────────────────────────────────────────────────────────

function inlineCSS(watermark: string): string {
  const wm = watermark !== "NONE" ? `
    body::before {
      content: "${escapeHtml(watermark)}";
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 6rem;
      font-weight: 900;
      color: rgba(0,0,0,0.04);
      pointer-events: none;
      z-index: 9999;
      white-space: nowrap;
      letter-spacing: 0.2em;
    }
  ` : "";
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 14px; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #111827; background: #f9fafb; display: flex; min-height: 100vh; }
    ${wm}

    /* Layout */
    #sidebar { width: 220px; min-width: 220px; background: #1e1144; color: white; position: fixed; top: 0; left: 0; height: 100vh; overflow-y: auto; padding: 1.5rem 0; z-index: 100; }
    #main { margin-left: 220px; flex: 1; padding: 0 2rem 4rem; }

    /* Header */
    .pack-header { background: linear-gradient(135deg, #311B92, #673AB7); color: white; padding: 3rem 2rem; margin: 0 -2rem 2rem; }
    .pack-header h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 0.25rem; }
    .pack-header .subtitle { font-size: 0.85rem; opacity: 0.8; }

    /* TOC */
    .toc-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.4); padding: 0 1rem 0.5rem; }
    .toc-link { display: block; padding: 0.5rem 1rem; font-size: 0.8rem; color: rgba(255,255,255,0.75); text-decoration: none; transition: background 0.1s; border-left: 3px solid transparent; }
    .toc-link:hover { background: rgba(255,255,255,0.08); color: white; }
    .toc-link.active { background: rgba(255,255,255,0.12); color: white; border-left-color: #a78bfa; }

    /* Sections */
    .content-section { margin-bottom: 2rem; background: white; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.06); border: 1px solid #f0f0f0; overflow: hidden; }
    .section-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; cursor: pointer; position: sticky; top: 0; background: white; z-index: 10; }
    .section-title { font-size: 0.95rem; font-weight: 700; color: #111827; }
    .fold-icon { color: #9ca3af; transition: transform 0.2s; }
    .section-body { padding: 1.25rem; }
    .section-body.folded { display: none; }

    /* Search */
    .search-bar { margin-bottom: 0.75rem; }
    .section-search { width: 100%; max-width: 320px; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.4rem 0.75rem; font-size: 0.8rem; outline: none; }
    .section-search:focus { border-color: #8b5cf6; box-shadow: 0 0 0 2px rgba(139,92,246,0.15); }

    /* Entity rows */
    .entity-list { display: flex; flex-direction: column; gap: 0.4rem; }
    .entity-row { border: 1px solid #e5e7eb; border-radius: 0.6rem; overflow: hidden; }
    .entity-summary { padding: 0.65rem 0.875rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; transition: background 0.1s; }
    .entity-summary:hover { background: #fafafa; }
    .entity-detail { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; border-top: 0 solid #f3f4f6; }
    .entity-row.expanded .entity-detail { max-height: 2000px; border-top-width: 1px; }
    .entity-row.expanded .entity-summary { background: #fafafa; }
    .detail-body { padding: 0.875rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.82rem; color: #374151; }
    .detail-body p { line-height: 1.5; }
    .entity-name { font-weight: 600; color: #111827; flex: 1; min-width: 0; }
    .row-summary { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; width: 100%; }

    /* Badges */
    .badge { display: inline-flex; align-items: center; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-amber { background: #fef3c7; color: #b45309; }
    .badge-red { background: #fee2e2; color: #dc2626; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-gray { background: #f3f4f6; color: #6b7280; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.75rem; color: #9ca3af; }

    /* KPI grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; }
    .kpi-card { padding: 1rem; border-radius: 0.75rem; border: 1px solid; text-align: center; }
    .kpi-value { font-size: 1.5rem; font-weight: 800; }
    .kpi-label { font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.7; }
    .kpi-green { background: #f0fdf4; border-color: #bbf7d0; color: #14532d; }
    .kpi-amber { background: #fffbeb; border-color: #fde68a; color: #78350f; }
    .kpi-red { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .kpi-blue { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }

    /* Score grid */
    .score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; background: #f9fafb; border-radius: 0.5rem; padding: 0.5rem; }
    .score-grid .label { display: block; font-size: 0.7rem; color: #9ca3af; }
    .score-grid span + span { font-weight: 600; }

    /* Mini table */
    .mini-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; margin-top: 0.5rem; }
    .mini-table th { text-align: left; padding: 0.3rem 0.5rem; background: #f3f4f6; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
    .mini-table td { padding: 0.3rem 0.5rem; border-bottom: 1px solid #f3f4f6; color: #374151; }

    /* Info box */
    .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1rem; }

    /* Audit */
    .audit-row { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.6rem 0.875rem; border: 1px solid #f3f4f6; border-radius: 0.5rem; }
    .audit-time { font-size: 0.72rem; color: #9ca3af; min-width: 80px; padding-top: 2px; }
    .audit-body { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .audit-action { font-size: 0.8rem; color: #374151; }
    .audit-user { font-size: 0.75rem; color: #9ca3af; }

    /* Print */
    @media print {
      #sidebar { display: none !important; }
      #main { margin-left: 0; }
      .pack-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section-body.folded { display: block !important; }
      .entity-detail { max-height: none !important; display: block !important; overflow: visible !important; border-top-width: 1px !important; }
      .fold-icon, .expand-trigger > *:last-child { display: none; }
      .section-header { position: static; }
      .search-bar { display: none; }
      .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
}

// ── Inline JS ─────────────────────────────────────────────────────────────────

function inlineJS(): string {
  return `
(function () {
  // 1. Expand / collapse entity rows
  document.querySelectorAll('.expand-trigger').forEach(function (el) {
    el.addEventListener('click', function () {
      el.closest('.entity-row').classList.toggle('expanded');
    });
  });

  // 2. Live search within each section
  document.querySelectorAll('.section-search').forEach(function (input) {
    input.addEventListener('input', function (e) {
      var q = e.target.value.toLowerCase();
      var body = input.closest('.section-body');
      if (!body) return;
      body.querySelectorAll('.entity-row').forEach(function (row) {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  });

  // 3. Section fold / unfold
  document.querySelectorAll('.section-header').forEach(function (header) {
    header.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.section-search')) return;
      var sectionId = header.closest('section').id;
      var bodyId = sectionId + '-body';
      var body = document.getElementById(bodyId);
      var icon = header.querySelector('.fold-icon');
      if (body) {
        body.classList.toggle('folded');
        if (icon) icon.textContent = body.classList.contains('folded') ? '▸' : '▾';
      }
    });
  });

  // 4. TOC scroll spy
  var sections = document.querySelectorAll('.content-section');
  var tocLinks = document.querySelectorAll('.toc-link');
  function updateTOC() {
    var scrollY = window.scrollY + 80;
    var active = null;
    sections.forEach(function (sec) {
      if (sec.offsetTop <= scrollY) active = sec.id;
    });
    tocLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      var secId = href ? href.replace('#', '') : '';
      link.classList.toggle('active', secId === active);
    });
  }
  window.addEventListener('scroll', updateTOC, { passive: true });
  updateTOC();

  // 5. Before print: expand all
  window.addEventListener('beforeprint', function () {
    document.querySelectorAll('.entity-row').forEach(function (r) { r.classList.add('expanded'); });
    document.querySelectorAll('.section-body').forEach(function (b) { b.classList.remove('folded'); });
  });
})();
  `;
}

// ── Main builder ─────────────────────────────────────────────────────────────

export function generateFullHTMLExport(
  opts: ExportOptions,
  data: ExportData
): string {
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const fileDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const firm = opts.firmName ?? "Updraft";
  const title = opts.packTitle ?? "CCRO Board Pack";
  const watermark = opts.watermark ?? "NONE";
  const interactive = opts.interactive !== false;

  const sectionTOCItems: string[] = [];
  const sectionBodies: string[] = [];

  const SECTION_LABELS: Record<SectionKey, string> = {
    executive_summary: "Executive Summary",
    risk_register: "Risk Register",
    controls: "Controls Library",
    compliance: "Compliance Universe",
    consumer_duty: "Consumer Duty",
    or_resilience: "Operational Resilience",
    process_library: "Process Library",
    actions: "Actions Register",
    audit_trail: "Audit Trail",
  };

  for (const key of opts.sections) {
    const label = SECTION_LABELS[key] ?? key;
    sectionTOCItems.push(`<a class="toc-link" href="#sec-${key}">${escapeHtml(label)}</a>`);

    let html = "";
    switch (key) {
      case "executive_summary":
        html = renderExecutiveSummary(data);
        break;
      case "risk_register":
        html = renderRiskRegister(data.risks ?? []);
        break;
      case "controls":
        html = renderControlsSection(data.controls ?? []);
        break;
      case "compliance":
        html = renderComplianceSection(data.regulations ?? []);
        break;
      case "consumer_duty":
        html = renderConsumerDutySection(data.outcomes ?? []);
        break;
      case "or_resilience":
        html = renderORSection(data.ibs ?? [], data.scenarios ?? [], data.selfAssessment ?? null);
        break;
      case "process_library":
        html = renderProcessesSection(data.processes ?? []);
        break;
      case "actions":
        html = renderActionsSection(data.actions ?? []);
        break;
      case "audit_trail":
        html = renderAuditSection(data.auditLogs ?? []);
        break;
    }
    sectionBodies.push(html);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — ${escapeHtml(firm)} — ${fileDate}</title>
  <style>${inlineCSS(watermark)}</style>
</head>
<body>

<nav id="sidebar">
  <div class="toc-title">Contents</div>
  ${sectionTOCItems.join("\n  ")}
  <div style="padding:1rem;font-size:0.7rem;color:rgba(255,255,255,0.3);margin-top:auto;position:absolute;bottom:0;left:0;right:0">
    Generated ${dateLabel}
  </div>
</nav>

<main id="main">
  <div class="pack-header">
    <h1>${escapeHtml(title)}</h1>
    <div class="subtitle">${escapeHtml(firm)} · Generated ${dateLabel}${watermark !== "NONE" ? ` · <strong>${escapeHtml(watermark)}</strong>` : ""}</div>
  </div>

  ${sectionBodies.join("\n  ")}
</main>

${interactive ? `<script>${inlineJS()}</script>` : ""}
</body>
</html>`;
}
