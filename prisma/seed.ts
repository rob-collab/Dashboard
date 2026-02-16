import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma } from "../src/generated/prisma";
import type { SectionType, RAGStatus, Role, ReportStatus } from "../src/generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Demo Users ──────────────────────────────────────────────────────────────────
const DEMO_USERS: {
  id: string; email: string; name: string; role: Role;
  assignedMeasures: string[]; isActive: boolean;
}[] = [
  { id: "user-rob", email: "rob@updraft.com", name: "Rob", role: "CCRO_TEAM", assignedMeasures: [], isActive: true },
  { id: "user-cath", email: "cath@updraft.com", name: "Cath", role: "CCRO_TEAM", assignedMeasures: ["1.9","4.1","5.1","5.2","5.5","5.8"], isActive: true },
  { id: "user-ash", email: "ash@updraft.com", name: "Ash", role: "METRIC_OWNER", assignedMeasures: ["1.1","1.3","1.4","3.1","3.6","3.7"], isActive: true },
  { id: "user-chris", email: "chris@updraft.com", name: "Chris", role: "METRIC_OWNER", assignedMeasures: ["1.5","1.8","3.3","3.4","3.5","4.2","4.3","4.4","4.5","4.6","4.7","4.8","4.9","4.10"], isActive: true },
  { id: "user-micha", email: "micha@updraft.com", name: "Micha", role: "METRIC_OWNER", assignedMeasures: ["1.2","1.6","1.7","2.1","2.2","2.3","2.4","2.5","2.6","2.7"], isActive: true },
  { id: "user-ceo", email: "ceo@updraft.com", name: "CEO", role: "VIEWER", assignedMeasures: [], isActive: true },
];

// ── Demo Reports ────────────────────────────────────────────────────────────────
const DEMO_REPORTS: {
  id: string; title: string; period: string; status: ReportStatus;
  createdBy: string; createdAt: Date; updatedAt: Date;
}[] = [
  { id: "report-feb-2025", title: "CCRO Monthly Report", period: "February 2025", status: "DRAFT", createdBy: "user-rob", createdAt: new Date("2025-02-01T10:00:00Z"), updatedAt: new Date("2025-02-13T14:30:00Z") },
  { id: "report-jan-2025", title: "CCRO Monthly Report", period: "January 2025", status: "PUBLISHED", createdBy: "user-cath", createdAt: new Date("2025-01-02T09:00:00Z"), updatedAt: new Date("2025-01-02T09:15:00Z") },
  { id: "report-dec-2024", title: "CCRO Monthly Report", period: "December 2024", status: "ARCHIVED", createdBy: "user-rob", createdAt: new Date("2024-12-04T14:00:00Z"), updatedAt: new Date("2024-12-04T14:42:00Z") },
];

// ── Demo Sections ───────────────────────────────────────────────────────────────
const DEMO_SECTIONS: {
  id: string; reportId: string; type: SectionType; position: number;
  title: string | null; content: object; layoutConfig: object; styleConfig: object;
}[] = [
  {
    id: "section-1", reportId: "report-feb-2025", type: "TEXT_BLOCK", position: 0,
    title: "Executive Summary",
    content: { html: `<h3>Overall Verdict</h3><p>Updraft continues to demonstrate strong operational performance across key compliance metrics.</p>` },
    layoutConfig: { width: "full", columnSpan: 12 },
    styleConfig: { borderPosition: "left", borderWidth: 4, borderColor: "#7B1FA2", borderStyle: "solid", borderRadius: 16, padding: { top: 24, right: 24, bottom: 24, left: 24 }, margin: { top: 0, right: 0, bottom: 16, left: 0 } },
  },
  {
    id: "section-2", reportId: "report-feb-2025", type: "CARD_GRID", position: 1,
    title: "Key Statistics",
    content: { cards: [{ icon: "TrendingUp", title: "NPS Score", value: "72", subtitle: "+2 from last month" }, { icon: "Shield", title: "Complaints", value: "23", subtitle: "-15% MoM" }, { icon: "CheckCircle", title: "Recovery Rate", value: "98.2%", subtitle: "Record high" }, { icon: "AlertTriangle", title: "Open Risks", value: "3 Red", subtitle: "7 Amber, 12 Green" }] },
    layoutConfig: { width: "full", columnSpan: 12, layout: "card-grid" },
    styleConfig: { borderRadius: 16, padding: { top: 24, right: 24, bottom: 24, left: 24 }, margin: { top: 0, right: 0, bottom: 16, left: 0 } },
  },
  {
    id: "section-3", reportId: "report-feb-2025", type: "DATA_TABLE", position: 2,
    title: "Risk Profile",
    content: { headers: ["Risk","Owner","RAG Status","Trend","Commentary"], rows: [["Credit Risk","Ash","Good","Stable","Collections performing well"],["Operational Risk","Chris","Warning","Improving","New controls being implemented"],["Cyber Risk","Micha","Harm","Worsening","Patching behind schedule"]] },
    layoutConfig: { width: "full", columnSpan: 12 },
    styleConfig: { borderRadius: 16, padding: { top: 24, right: 24, bottom: 24, left: 24 }, margin: { top: 0, right: 0, bottom: 16, left: 0 } },
  },
  {
    id: "section-4", reportId: "report-feb-2025", type: "CONSUMER_DUTY_DASHBOARD", position: 3,
    title: "Consumer Duty Dashboard", content: {}, layoutConfig: { width: "full", columnSpan: 12 }, styleConfig: {},
  },
  {
    id: "section-5", reportId: "report-feb-2025", type: "ACCORDION", position: 4,
    title: "Detailed Analysis",
    content: { items: [{ title: "Working Well", content: "<p>Collections recovery rate at an all-time high.</p>" }, { title: "Challenges", content: "<p>Cyber patching schedule behind by 2 weeks.</p>" }] },
    layoutConfig: { width: "full", columnSpan: 12 },
    styleConfig: { borderRadius: 16, padding: { top: 24, right: 24, bottom: 24, left: 24 }, margin: { top: 0, right: 0, bottom: 16, left: 0 } },
  },
];

// ── Demo Outcomes & Measures ────────────────────────────────────────────────────
interface SeedMI { id: string; measureId: string; metric: string; current: string; previous: string; change: string; ragStatus: RAGStatus }
interface SeedMeasure { id: string; outcomeId: string; measureId: string; name: string; owner: string | null; summary: string; ragStatus: RAGStatus; position: number; lastUpdatedAt: Date | null; metrics: SeedMI[] }
interface SeedOutcome { id: string; reportId: string | null; outcomeId: string; name: string; shortDesc: string; icon: string | null; ragStatus: RAGStatus; position: number; measures: SeedMeasure[] }

const DEMO_OUTCOMES: SeedOutcome[] = [
  {
    id: "outcome-1", reportId: "report-feb-2025", outcomeId: "o1", name: "Products & Services", shortDesc: "Products designed to meet customer needs", icon: "Package", ragStatus: "GOOD", position: 0,
    measures: [
      { id: "measure-1-1", outcomeId: "outcome-1", measureId: "1.1", name: "Customer Needs Met", owner: "ash@updraft.com", summary: "Products meeting identified customer needs", ragStatus: "GOOD", position: 0, lastUpdatedAt: new Date("2025-02-12T16:45:00Z"), metrics: [
        { id: "mi-1-1-1", measureId: "measure-1-1", metric: "Net Promoter Score", current: "72", previous: "70", change: "+2", ragStatus: "GOOD" },
        { id: "mi-1-1-2", measureId: "measure-1-1", metric: "TrustPilot Score", current: "4.8", previous: "4.8", change: "0", ragStatus: "GOOD" },
      ]},
      { id: "measure-1-3", outcomeId: "outcome-1", measureId: "1.3", name: "New Credit Applications", owner: "ash@updraft.com", summary: "Quality of new application process", ragStatus: "GOOD", position: 1, lastUpdatedAt: new Date("2024-12-20T10:00:00Z"), metrics: [
        { id: "mi-1-3-1", measureId: "measure-1-3", metric: "Application Approval Rate", current: "68%", previous: "65%", change: "+3%", ragStatus: "GOOD" },
        { id: "mi-1-3-2", measureId: "measure-1-3", metric: "Time to Decision", current: "2.1 days", previous: "2.4 days", change: "-0.3", ragStatus: "GOOD" },
      ]},
    ],
  },
  {
    id: "outcome-2", reportId: "report-feb-2025", outcomeId: "o2", name: "Price & Value", shortDesc: "Fair pricing and value for money", icon: "DollarSign", ragStatus: "GOOD", position: 1,
    measures: [
      { id: "measure-2-1", outcomeId: "outcome-2", measureId: "2.1", name: "APR Alignment", owner: "micha@updraft.com", summary: "APR rates competitive and fair", ragStatus: "GOOD", position: 0, lastUpdatedAt: new Date("2025-02-10T09:30:00Z"), metrics: [
        { id: "mi-2-1-1", measureId: "measure-2-1", metric: "Average APR", current: "29.9%", previous: "29.9%", change: "0", ragStatus: "GOOD" },
        { id: "mi-2-1-2", measureId: "measure-2-1", metric: "Market Comparison", current: "Below avg", previous: "Below avg", change: "-", ragStatus: "GOOD" },
      ]},
    ],
  },
  {
    id: "outcome-3", reportId: "report-feb-2025", outcomeId: "o3", name: "Customer Understanding", shortDesc: "Clear communication and information", icon: "BookOpen", ragStatus: "WARNING", position: 2,
    measures: [
      { id: "measure-3-1", outcomeId: "outcome-3", measureId: "3.1", name: "Communication Clarity", owner: "ash@updraft.com", summary: "Customer communications clear and timely", ragStatus: "GOOD", position: 0, lastUpdatedAt: new Date("2025-02-08T14:00:00Z"), metrics: [
        { id: "mi-3-1-1", measureId: "measure-3-1", metric: "Readability Score", current: "82", previous: "80", change: "+2", ragStatus: "GOOD" },
      ]},
      { id: "measure-3-3", outcomeId: "outcome-3", measureId: "3.3", name: "Drop-off Points", owner: "chris@updraft.com", summary: "Customer journey drop-off analysis", ragStatus: "WARNING", position: 1, lastUpdatedAt: new Date("2024-12-15T11:00:00Z"), metrics: [
        { id: "mi-3-3-1", measureId: "measure-3-3", metric: "Pre-contract Drop-off", current: "45%", previous: "40%", change: "+5%", ragStatus: "WARNING" },
        { id: "mi-3-3-2", measureId: "measure-3-3", metric: "Application Abandonment", current: "22%", previous: "20%", change: "+2%", ragStatus: "WARNING" },
      ]},
    ],
  },
  {
    id: "outcome-4", reportId: "report-feb-2025", outcomeId: "o4", name: "Customer Support", shortDesc: "Responsive and effective support", icon: "Headphones", ragStatus: "GOOD", position: 3,
    measures: [
      { id: "measure-4-2", outcomeId: "outcome-4", measureId: "4.2", name: "Response Times", owner: "chris@updraft.com", summary: "Customer support response performance", ragStatus: "GOOD", position: 0, lastUpdatedAt: new Date("2025-02-11T10:15:00Z"), metrics: [
        { id: "mi-4-2-1", measureId: "measure-4-2", metric: "Avg Response Time", current: "2.4 hrs", previous: "3.1 hrs", change: "-0.7", ragStatus: "GOOD" },
        { id: "mi-4-2-2", measureId: "measure-4-2", metric: "First Contact Resolution", current: "78%", previous: "75%", change: "+3%", ragStatus: "GOOD" },
      ]},
      { id: "measure-4-7", outcomeId: "outcome-4", measureId: "4.7", name: "Broken Payment Plans", owner: "chris@updraft.com", summary: "Payment plan adherence tracking", ragStatus: "WARNING", position: 1, lastUpdatedAt: new Date("2024-12-28T16:00:00Z"), metrics: [
        { id: "mi-4-7-1", measureId: "measure-4-7", metric: "Broken Plans Rate", current: "15%", previous: "12%", change: "+3%", ragStatus: "WARNING" },
      ]},
    ],
  },
  {
    id: "outcome-5", reportId: "report-feb-2025", outcomeId: "g1", name: "Governance & Culture", shortDesc: "Effective governance and consumer-focused culture", icon: "Building", ragStatus: "GOOD", position: 4,
    measures: [
      { id: "measure-5-1", outcomeId: "outcome-5", measureId: "5.1", name: "Board Oversight", owner: "cath@updraft.com", summary: "Board governance and oversight effectiveness", ragStatus: "GOOD", position: 0, lastUpdatedAt: new Date("2025-02-13T09:00:00Z"), metrics: [
        { id: "mi-5-1-1", measureId: "measure-5-1", metric: "Board Attendance", current: "100%", previous: "95%", change: "+5%", ragStatus: "GOOD" },
        { id: "mi-5-1-2", measureId: "measure-5-1", metric: "Actions Completed", current: "92%", previous: "88%", change: "+4%", ragStatus: "GOOD" },
      ]},
    ],
  },
];

// ── Demo Versions ───────────────────────────────────────────────────────────────
const DEMO_VERSIONS = [
  { id: "version-jan-1", reportId: "report-jan-2025", version: 1, snapshotData: {}, publishedBy: "user-cath", publishedAt: new Date("2025-01-02T09:15:00Z"), publishNote: "January monthly report" },
  { id: "version-dec-1", reportId: "report-dec-2024", version: 1, snapshotData: {}, publishedBy: "user-rob", publishedAt: new Date("2024-12-04T14:42:00Z"), publishNote: "Year-end comprehensive review" },
];

// ── Demo Templates ──────────────────────────────────────────────────────────────
const DEMO_TEMPLATES: {
  id: string; name: string; description: string; category: string;
  layoutConfig: object; styleConfig: object; contentSchema: object[];
  sectionType: SectionType; createdBy: string; isGlobal: boolean; version: number;
}[] = [
  { id: "template-1", name: "Risk Analysis Layout", description: "2-column narrative + data table with highlighted call-out box", category: "Analysis", layoutConfig: { layout: "two-col" }, styleConfig: { borderPosition: "left", borderWidth: 4, borderColor: "#7B1FA2" }, contentSchema: [{ key: "title", label: "Section Title", type: "text", required: true }, { key: "narrative", label: "Analysis Narrative", type: "richtext", required: true }], sectionType: "TEXT_BLOCK", createdBy: "user-rob", isGlobal: true, version: 1 },
  { id: "template-2", name: "3-Stat Cards", description: "Three statistic cards in a row", category: "Stats", layoutConfig: { layout: "card-grid" }, styleConfig: {}, contentSchema: [{ key: "card1_title", label: "Card 1 Title", type: "text", required: true }, { key: "card1_value", label: "Card 1 Value", type: "text", required: true }], sectionType: "CARD_GRID", createdBy: "user-rob", isGlobal: true, version: 1 },
];

// ── Demo Components ─────────────────────────────────────────────────────────────
const DEMO_COMPONENTS = [
  { id: "component-1", name: "DPO Deep Dive Q1 2025", description: "Data protection compliance review section", category: "Regulatory", htmlContent: `<div class="dpo-section"><h3>Data Protection Overview</h3><p>All data protection obligations met for the quarter.</p></div>`, cssContent: null, jsContent: null, version: "1.0", sanitized: true, createdBy: "user-rob" },
];

// ── Demo Audit Logs ─────────────────────────────────────────────────────────────
const DEMO_AUDIT_LOGS: {
  id: string; timestamp: Date; userId: string; userRole: Role;
  action: string; entityType: string; entityId: string | null;
  changes: object | null; reportId: string | null; ipAddress: string | null; userAgent: string | null;
}[] = [
  { id: "log-1", timestamp: new Date("2025-02-13T14:30:00Z"), userId: "user-rob", userRole: "CCRO_TEAM", action: "edit_section", entityType: "section", entityId: "section-1", changes: { field: "content" }, reportId: "report-feb-2025", ipAddress: "10.0.1.45", userAgent: "Mozilla/5.0" },
  { id: "log-2", timestamp: new Date("2025-02-12T16:45:00Z"), userId: "user-ash", userRole: "METRIC_OWNER", action: "update_mi", entityType: "consumer_duty_mi", entityId: "mi-1-1-1", changes: { field: "current_value", old_value: "70", new_value: "72" }, reportId: "report-feb-2025", ipAddress: "10.0.1.50", userAgent: "Mozilla/5.0" },
  { id: "log-3", timestamp: new Date("2025-02-12T14:30:00Z"), userId: "user-chris", userRole: "METRIC_OWNER", action: "update_mi", entityType: "consumer_duty_mi", entityId: "mi-4-7-1", changes: { field: "current_value", old_value: "12%", new_value: "15%" }, reportId: "report-feb-2025", ipAddress: "10.0.1.55", userAgent: "Mozilla/5.0" },
  { id: "log-4", timestamp: new Date("2025-02-12T14:31:00Z"), userId: "user-chris", userRole: "METRIC_OWNER", action: "change_rag", entityType: "consumer_duty_measure", entityId: "measure-4-7", changes: { field: "ragStatus", old_value: "GOOD", new_value: "WARNING" }, reportId: "report-feb-2025", ipAddress: "10.0.1.55", userAgent: "Mozilla/5.0" },
  { id: "log-5", timestamp: new Date("2025-02-10T11:20:00Z"), userId: "user-cath", userRole: "CCRO_TEAM", action: "edit_section", entityType: "section", entityId: "section-1", changes: { field: "content", summary: "Updated executive summary" }, reportId: "report-feb-2025", ipAddress: "10.0.1.42", userAgent: "Mozilla/5.0" },
  { id: "log-6", timestamp: new Date("2025-01-02T09:15:00Z"), userId: "user-cath", userRole: "CCRO_TEAM", action: "publish_report", entityType: "report", entityId: "report-jan-2025", changes: { version: 1 }, reportId: "report-jan-2025", ipAddress: "10.0.1.42", userAgent: "Mozilla/5.0" },
];

// ─────────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Seeding database...");

  // Users
  for (const u of DEMO_USERS) {
    await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  }
  console.log(`  ✓ ${DEMO_USERS.length} users`);

  // Reports
  for (const r of DEMO_REPORTS) {
    await prisma.report.upsert({ where: { id: r.id }, update: r, create: r });
  }
  console.log(`  ✓ ${DEMO_REPORTS.length} reports`);

  // Sections
  for (const s of DEMO_SECTIONS) {
    await prisma.section.upsert({ where: { id: s.id }, update: s, create: { ...s, templateId: null, componentId: null } });
  }
  console.log(`  ✓ ${DEMO_SECTIONS.length} sections`);

  // Outcomes → Measures → MI
  let measureCount = 0, miCount = 0;
  for (const o of DEMO_OUTCOMES) {
    const { measures, ...outcomeData } = o;
    await prisma.consumerDutyOutcome.upsert({ where: { id: o.id }, update: outcomeData, create: outcomeData });
    for (const m of measures) {
      const { metrics, ...measureData } = m;
      await prisma.consumerDutyMeasure.upsert({ where: { id: m.id }, update: measureData, create: measureData });
      measureCount++;
      for (const mi of metrics) {
        await prisma.consumerDutyMI.upsert({ where: { id: mi.id }, update: mi, create: mi });
        miCount++;
      }
    }
  }
  console.log(`  ✓ ${DEMO_OUTCOMES.length} outcomes, ${measureCount} measures, ${miCount} MI metrics`);

  // Versions
  for (const v of DEMO_VERSIONS) {
    await prisma.reportVersion.upsert({ where: { id: v.id }, update: v, create: v });
  }
  console.log(`  ✓ ${DEMO_VERSIONS.length} versions`);

  // Templates
  for (const t of DEMO_TEMPLATES) {
    await prisma.template.upsert({ where: { id: t.id }, update: t, create: t });
  }
  console.log(`  ✓ ${DEMO_TEMPLATES.length} templates`);

  // Components
  for (const c of DEMO_COMPONENTS) {
    await prisma.component.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log(`  ✓ ${DEMO_COMPONENTS.length} components`);

  // Audit Logs
  for (const l of DEMO_AUDIT_LOGS) {
    const data = {
      ...l,
      changes: l.changes === null ? Prisma.JsonNull : l.changes,
    };
    await prisma.auditLog.upsert({ where: { id: l.id }, update: data, create: data });
  }
  console.log(`  ✓ ${DEMO_AUDIT_LOGS.length} audit logs`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
