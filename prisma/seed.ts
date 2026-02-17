import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma } from "../src/generated/prisma";
import type { SectionType, RAGStatus, Role, ReportStatus, ControlEffectiveness, RiskAppetite, DirectionOfTravel, MitigationStatus } from "../src/generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Users ──────────────────────────────────────────────────────────────────
const SEED_USERS: {
  id: string; email: string; name: string; role: Role;
  assignedMeasures: string[]; isActive: boolean;
}[] = [
  { id: "user-rob", email: "rob@updraft.com", name: "Rob", role: "CCRO_TEAM", assignedMeasures: [], isActive: true },
  { id: "user-cath", email: "cath@updraft.com", name: "Cath", role: "CCRO_TEAM", assignedMeasures: ["1.9","4.1","5.1","5.2","5.5","5.8"], isActive: true },
  { id: "user-ash", email: "ash@updraft.com", name: "Ash", role: "METRIC_OWNER", assignedMeasures: ["1.1","1.3","1.4","3.1","3.6","3.7"], isActive: true },
  { id: "user-chris", email: "chris@updraft.com", name: "Chris", role: "METRIC_OWNER", assignedMeasures: ["1.5","1.8","3.3","3.4","3.5","4.2","4.3","4.4","4.5","4.6","4.7","4.8","4.9","4.10"], isActive: true },
  { id: "user-micha", email: "micha@updraft.com", name: "Micha", role: "METRIC_OWNER", assignedMeasures: ["1.2","1.6","1.7","2.1","2.2","2.3","2.4","2.5","2.6","2.7"], isActive: true },
  { id: "user-ceo", email: "ceo@updraft.com", name: "CEO", role: "VIEWER", assignedMeasures: [], isActive: true },
  { id: "user-david", email: "david@updraft.com", name: "David", role: "RISK_OWNER", assignedMeasures: [], isActive: true },
];

// ── Reports ────────────────────────────────────────────────────────────────
const SEED_REPORTS: {
  id: string; title: string; period: string; status: ReportStatus;
  createdBy: string; createdAt: Date; updatedAt: Date;
}[] = [
  { id: "report-feb-2025", title: "CCRO Monthly Report", period: "February 2025", status: "DRAFT", createdBy: "user-rob", createdAt: new Date("2025-02-01T10:00:00Z"), updatedAt: new Date("2025-02-13T14:30:00Z") },
  { id: "report-jan-2025", title: "CCRO Monthly Report", period: "January 2025", status: "PUBLISHED", createdBy: "user-cath", createdAt: new Date("2025-01-02T09:00:00Z"), updatedAt: new Date("2025-01-02T09:15:00Z") },
  { id: "report-dec-2024", title: "CCRO Monthly Report", period: "December 2024", status: "ARCHIVED", createdBy: "user-rob", createdAt: new Date("2024-12-04T14:00:00Z"), updatedAt: new Date("2024-12-04T14:42:00Z") },
];

// ── Sections ───────────────────────────────────────────────────────────────
const SEED_SECTIONS: {
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

// ── Outcomes & Measures ────────────────────────────────────────────────────
interface SeedMI { id: string; measureId: string; metric: string; current: string; previous: string; change: string; ragStatus: RAGStatus; appetite: string | null; appetiteOperator: string | null }
interface SeedMeasure { id: string; outcomeId: string; measureId: string; name: string; owner: string | null; summary: string; ragStatus: RAGStatus; position: number; lastUpdatedAt: Date | null; metrics: SeedMI[] }
interface SeedOutcome { id: string; reportId: string | null; outcomeId: string; name: string; shortDesc: string; icon: string | null; ragStatus: RAGStatus; position: number; measures: SeedMeasure[] }

const SEED_OUTCOMES: SeedOutcome[] = [
  {
    id: "outcome-1", reportId: "report-feb-2025", outcomeId: "o1", name: "Products & Services", shortDesc: "Products designed to meet customer needs", icon: "Package", ragStatus: "GOOD", position: 0,
    measures: [
      { id: "measure-1-1", outcomeId: "outcome-1", measureId: "1.1", name: "Customer Needs Met", owner: "ash@updraft.com", summary: "Products meeting identified customer needs", ragStatus: "GOOD", position: 0, lastUpdatedAt: new Date("2025-02-12T16:45:00Z"), metrics: [
        { id: "mi-1-1-1", measureId: "measure-1-1", metric: "Net Promoter Score", current: "72", previous: "70", change: "+2", ragStatus: "GOOD", appetite: "70", appetiteOperator: ">=" },
        { id: "mi-1-1-2", measureId: "measure-1-1", metric: "TrustPilot Score", current: "4.8", previous: "4.8", change: "0", ragStatus: "GOOD", appetite: "4.5", appetiteOperator: ">=" },
      ]},
      { id: "measure-1-3", outcomeId: "outcome-1", measureId: "1.3", name: "New Credit Applications", owner: "ash@updraft.com", summary: "Quality of new application process", ragStatus: "GOOD", position: 1, lastUpdatedAt: new Date("2024-12-20T10:00:00Z"), metrics: [
        { id: "mi-1-3-1", measureId: "measure-1-3", metric: "Application Approval Rate", current: "68%", previous: "65%", change: "+3%", ragStatus: "GOOD", appetite: null, appetiteOperator: null },
        { id: "mi-1-3-2", measureId: "measure-1-3", metric: "Time to Decision", current: "2.1 days", previous: "2.4 days", change: "-0.3", ragStatus: "GOOD", appetite: "3", appetiteOperator: "<=" },
      ]},
    ],
  },
  {
    id: "outcome-2", reportId: "report-feb-2025", outcomeId: "o2", name: "Price & Value", shortDesc: "Fair pricing and value for money", icon: "DollarSign", ragStatus: "GOOD", position: 1,
    measures: [
      { id: "measure-2-1", outcomeId: "outcome-2", measureId: "2.1", name: "APR Alignment", owner: "micha@updraft.com", summary: "APR rates competitive and fair", ragStatus: "GOOD", position: 0, lastUpdatedAt: new Date("2025-02-10T09:30:00Z"), metrics: [
        { id: "mi-2-1-1", measureId: "measure-2-1", metric: "Average APR", current: "29.9%", previous: "29.9%", change: "0", ragStatus: "GOOD", appetite: null, appetiteOperator: null },
        { id: "mi-2-1-2", measureId: "measure-2-1", metric: "Market Comparison", current: "Below avg", previous: "Below avg", change: "-", ragStatus: "GOOD", appetite: null, appetiteOperator: null },
      ]},
    ],
  },
  {
    id: "outcome-3", reportId: "report-feb-2025", outcomeId: "o3", name: "Customer Understanding", shortDesc: "Clear communication and information", icon: "BookOpen", ragStatus: "WARNING", position: 2,
    measures: [
      { id: "measure-3-1", outcomeId: "outcome-3", measureId: "3.1", name: "Communication Clarity", owner: "ash@updraft.com", summary: "Customer communications clear and timely", ragStatus: "GOOD", position: 0, lastUpdatedAt: new Date("2025-02-08T14:00:00Z"), metrics: [
        { id: "mi-3-1-1", measureId: "measure-3-1", metric: "Readability Score", current: "82", previous: "80", change: "+2", ragStatus: "GOOD", appetite: "75", appetiteOperator: ">=" },
      ]},
      { id: "measure-3-3", outcomeId: "outcome-3", measureId: "3.3", name: "Drop-off Points", owner: "chris@updraft.com", summary: "Customer journey drop-off analysis", ragStatus: "WARNING", position: 1, lastUpdatedAt: new Date("2024-12-15T11:00:00Z"), metrics: [
        { id: "mi-3-3-1", measureId: "measure-3-3", metric: "Pre-contract Drop-off", current: "45%", previous: "40%", change: "+5%", ragStatus: "WARNING", appetite: "40", appetiteOperator: "<=" },
        { id: "mi-3-3-2", measureId: "measure-3-3", metric: "Application Abandonment", current: "22%", previous: "20%", change: "+2%", ragStatus: "WARNING", appetite: "15", appetiteOperator: "<=" },
      ]},
    ],
  },
  {
    id: "outcome-4", reportId: "report-feb-2025", outcomeId: "o4", name: "Customer Support", shortDesc: "Responsive and effective support", icon: "Headphones", ragStatus: "GOOD", position: 3,
    measures: [
      { id: "measure-4-2", outcomeId: "outcome-4", measureId: "4.2", name: "Response Times", owner: "chris@updraft.com", summary: "Customer support response performance", ragStatus: "GOOD", position: 0, lastUpdatedAt: new Date("2025-02-11T10:15:00Z"), metrics: [
        { id: "mi-4-2-1", measureId: "measure-4-2", metric: "Avg Response Time", current: "2.4 hrs", previous: "3.1 hrs", change: "-0.7", ragStatus: "GOOD", appetite: null, appetiteOperator: null },
        { id: "mi-4-2-2", measureId: "measure-4-2", metric: "First Contact Resolution", current: "78%", previous: "75%", change: "+3%", ragStatus: "GOOD", appetite: "70", appetiteOperator: ">=" },
      ]},
      { id: "measure-4-7", outcomeId: "outcome-4", measureId: "4.7", name: "Broken Payment Plans", owner: "chris@updraft.com", summary: "Payment plan adherence tracking", ragStatus: "WARNING", position: 1, lastUpdatedAt: new Date("2024-12-28T16:00:00Z"), metrics: [
        { id: "mi-4-7-1", measureId: "measure-4-7", metric: "Broken Plans Rate", current: "15%", previous: "12%", change: "+3%", ragStatus: "WARNING", appetite: "10", appetiteOperator: "<=" },
      ]},
    ],
  },
  {
    id: "outcome-5", reportId: "report-feb-2025", outcomeId: "g1", name: "Governance & Culture", shortDesc: "Effective governance and consumer-focused culture", icon: "Building", ragStatus: "GOOD", position: 4,
    measures: [
      { id: "measure-5-1", outcomeId: "outcome-5", measureId: "5.1", name: "Board Oversight", owner: "cath@updraft.com", summary: "Board governance and oversight effectiveness", ragStatus: "GOOD", position: 0, lastUpdatedAt: new Date("2025-02-13T09:00:00Z"), metrics: [
        { id: "mi-5-1-1", measureId: "measure-5-1", metric: "Board Attendance", current: "100%", previous: "95%", change: "+5%", ragStatus: "GOOD", appetite: "90", appetiteOperator: ">=" },
        { id: "mi-5-1-2", measureId: "measure-5-1", metric: "Actions Completed", current: "92%", previous: "88%", change: "+4%", ragStatus: "GOOD", appetite: "85", appetiteOperator: ">=" },
      ]},
    ],
  },
];

// ── Versions ───────────────────────────────────────────────────────────────
const SEED_VERSIONS = [
  { id: "version-jan-1", reportId: "report-jan-2025", version: 1, snapshotData: {}, publishedBy: "user-cath", publishedAt: new Date("2025-01-02T09:15:00Z"), publishNote: "January monthly report" },
  { id: "version-dec-1", reportId: "report-dec-2024", version: 1, snapshotData: {}, publishedBy: "user-rob", publishedAt: new Date("2024-12-04T14:42:00Z"), publishNote: "Year-end comprehensive review" },
];

// ── Templates ──────────────────────────────────────────────────────────────
const SEED_TEMPLATES: {
  id: string; name: string; description: string; category: string;
  layoutConfig: object; styleConfig: object; contentSchema: object[];
  sectionType: SectionType; createdBy: string; isGlobal: boolean; version: number;
}[] = [
  { id: "template-1", name: "Risk Analysis Layout", description: "2-column narrative + data table with highlighted call-out box", category: "Analysis", layoutConfig: { layout: "two-col" }, styleConfig: { borderPosition: "left", borderWidth: 4, borderColor: "#7B1FA2" }, contentSchema: [{ key: "title", label: "Section Title", type: "text", required: true }, { key: "narrative", label: "Analysis Narrative", type: "richtext", required: true }], sectionType: "TEXT_BLOCK", createdBy: "user-rob", isGlobal: true, version: 1 },
  { id: "template-2", name: "3-Stat Cards", description: "Three statistic cards in a row", category: "Stats", layoutConfig: { layout: "card-grid" }, styleConfig: {}, contentSchema: [{ key: "card1_title", label: "Card 1 Title", type: "text", required: true }, { key: "card1_value", label: "Card 1 Value", type: "text", required: true }], sectionType: "CARD_GRID", createdBy: "user-rob", isGlobal: true, version: 1 },
];

// ── Components ─────────────────────────────────────────────────────────────
const SEED_COMPONENTS = [
  { id: "component-1", name: "DPO Deep Dive Q1 2025", description: "Data protection compliance review section", category: "Regulatory", htmlContent: `<div class="dpo-section"><h3>Data Protection Overview</h3><p>All data protection obligations met for the quarter.</p></div>`, cssContent: null, jsContent: null, version: "1.0", sanitized: true, createdBy: "user-rob" },
];

// ── Audit Logs ─────────────────────────────────────────────────────────────
const SEED_AUDIT_LOGS: {
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
  for (const u of SEED_USERS) {
    await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  }
  console.log(`  ✓ ${SEED_USERS.length} users`);

  // Reports
  for (const r of SEED_REPORTS) {
    await prisma.report.upsert({ where: { id: r.id }, update: r, create: r });
  }
  console.log(`  ✓ ${SEED_REPORTS.length} reports`);

  // Sections
  for (const s of SEED_SECTIONS) {
    await prisma.section.upsert({ where: { id: s.id }, update: s, create: { ...s, templateId: null, componentId: null } });
  }
  console.log(`  ✓ ${SEED_SECTIONS.length} sections`);

  // Outcomes → Measures → MI
  let measureCount = 0, miCount = 0;
  for (const o of SEED_OUTCOMES) {
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
  console.log(`  ✓ ${SEED_OUTCOMES.length} outcomes, ${measureCount} measures, ${miCount} MI metrics`);

  // Metric Snapshots — 12 months of history for key metrics
  const SNAPSHOT_DATA: { miId: string; months: { month: string; value: string; ragStatus: RAGStatus }[] }[] = [
    { miId: "mi-1-1-1", months: [ // NPS
      { month: "2024-03-01", value: "65", ragStatus: "GOOD" },
      { month: "2024-04-01", value: "66", ragStatus: "GOOD" },
      { month: "2024-05-01", value: "64", ragStatus: "GOOD" },
      { month: "2024-06-01", value: "67", ragStatus: "GOOD" },
      { month: "2024-07-01", value: "68", ragStatus: "GOOD" },
      { month: "2024-08-01", value: "66", ragStatus: "WARNING" },
      { month: "2024-09-01", value: "69", ragStatus: "GOOD" },
      { month: "2024-10-01", value: "70", ragStatus: "GOOD" },
      { month: "2024-11-01", value: "68", ragStatus: "GOOD" },
      { month: "2024-12-01", value: "69", ragStatus: "GOOD" },
      { month: "2025-01-01", value: "70", ragStatus: "GOOD" },
      { month: "2025-02-01", value: "72", ragStatus: "GOOD" },
    ]},
    { miId: "mi-3-3-1", months: [ // Pre-contract Drop-off
      { month: "2024-03-01", value: "35", ragStatus: "GOOD" },
      { month: "2024-04-01", value: "36", ragStatus: "GOOD" },
      { month: "2024-05-01", value: "37", ragStatus: "GOOD" },
      { month: "2024-06-01", value: "38", ragStatus: "GOOD" },
      { month: "2024-07-01", value: "39", ragStatus: "GOOD" },
      { month: "2024-08-01", value: "40", ragStatus: "WARNING" },
      { month: "2024-09-01", value: "41", ragStatus: "WARNING" },
      { month: "2024-10-01", value: "42", ragStatus: "WARNING" },
      { month: "2024-11-01", value: "43", ragStatus: "WARNING" },
      { month: "2024-12-01", value: "40", ragStatus: "WARNING" },
      { month: "2025-01-01", value: "42", ragStatus: "WARNING" },
      { month: "2025-02-01", value: "45", ragStatus: "WARNING" },
    ]},
    { miId: "mi-4-7-1", months: [ // Broken Plans Rate
      { month: "2024-03-01", value: "8", ragStatus: "GOOD" },
      { month: "2024-04-01", value: "7", ragStatus: "GOOD" },
      { month: "2024-05-01", value: "9", ragStatus: "GOOD" },
      { month: "2024-06-01", value: "8", ragStatus: "GOOD" },
      { month: "2024-07-01", value: "10", ragStatus: "WARNING" },
      { month: "2024-08-01", value: "11", ragStatus: "WARNING" },
      { month: "2024-09-01", value: "10", ragStatus: "WARNING" },
      { month: "2024-10-01", value: "12", ragStatus: "WARNING" },
      { month: "2024-11-01", value: "11", ragStatus: "WARNING" },
      { month: "2024-12-01", value: "12", ragStatus: "WARNING" },
      { month: "2025-01-01", value: "13", ragStatus: "WARNING" },
      { month: "2025-02-01", value: "15", ragStatus: "WARNING" },
    ]},
    { miId: "mi-5-1-1", months: [ // Board Attendance
      { month: "2024-03-01", value: "90", ragStatus: "GOOD" },
      { month: "2024-04-01", value: "95", ragStatus: "GOOD" },
      { month: "2024-05-01", value: "85", ragStatus: "WARNING" },
      { month: "2024-06-01", value: "90", ragStatus: "GOOD" },
      { month: "2024-07-01", value: "100", ragStatus: "GOOD" },
      { month: "2024-08-01", value: "95", ragStatus: "GOOD" },
      { month: "2024-09-01", value: "90", ragStatus: "GOOD" },
      { month: "2024-10-01", value: "100", ragStatus: "GOOD" },
      { month: "2024-11-01", value: "95", ragStatus: "GOOD" },
      { month: "2024-12-01", value: "100", ragStatus: "GOOD" },
      { month: "2025-01-01", value: "95", ragStatus: "GOOD" },
      { month: "2025-02-01", value: "100", ragStatus: "GOOD" },
    ]},
  ];

  let snapshotCount = 0;
  for (const s of SNAPSHOT_DATA) {
    for (const m of s.months) {
      const monthDate = new Date(m.month);
      await prisma.metricSnapshot.upsert({
        where: { miId_month: { miId: s.miId, month: monthDate } },
        update: { value: m.value, ragStatus: m.ragStatus },
        create: { miId: s.miId, month: monthDate, value: m.value, ragStatus: m.ragStatus },
      });
      snapshotCount++;
    }
  }
  console.log(`  ✓ ${snapshotCount} metric snapshots`);

  // Versions
  for (const v of SEED_VERSIONS) {
    await prisma.reportVersion.upsert({ where: { id: v.id }, update: v, create: v });
  }
  console.log(`  ✓ ${SEED_VERSIONS.length} versions`);

  // Templates
  for (const t of SEED_TEMPLATES) {
    await prisma.template.upsert({ where: { id: t.id }, update: t, create: t });
  }
  console.log(`  ✓ ${SEED_TEMPLATES.length} templates`);

  // Components
  for (const c of SEED_COMPONENTS) {
    await prisma.component.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log(`  ✓ ${SEED_COMPONENTS.length} components`);

  // Audit Logs
  for (const l of SEED_AUDIT_LOGS) {
    const data = {
      ...l,
      changes: l.changes === null ? Prisma.JsonNull : l.changes,
    };
    await prisma.auditLog.upsert({ where: { id: l.id }, update: data, create: data });
  }
  console.log(`  ✓ ${SEED_AUDIT_LOGS.length} audit logs`);

  // ── Risk Register ──────────────────────────────────────────────────────────

  // Risk categories (L1 + L2)
  const RISK_CATEGORIES: {
    id: string; level: number; parentId: string | null; name: string; definition: string;
  }[] = [
    // L1 categories
    { id: "rcat-conduct", level: 1, parentId: null, name: "Conduct & Compliance Risk", definition: "The risk of customer detriment arising from inappropriate culture, products and processes or the risks of non-compliance with regulation, rules or prescribed industry practices (including data protection)." },
    { id: "rcat-operational", level: 1, parentId: null, name: "Operational Risk", definition: "The risk of loss or damage resulting from inadequate or failed internal processes, people and systems, fraud or external events." },
    { id: "rcat-credit", level: 1, parentId: null, name: "Credit Risk", definition: "The risk that unexpected losses might arise as a result of Updraft's customers failing to meet their obligations to repay." },
    { id: "rcat-financial", level: 1, parentId: null, name: "Financial Risk", definition: "The risk of Updraft having inadequate earnings, cash flow or capital to meet its current or future requirements and expectations." },
    { id: "rcat-strategic", level: 1, parentId: null, name: "Strategic Risk", definition: "The risk of significant loss or damage arising from business decisions that impact the long-term future of Updraft." },
    // L2 — Conduct & Compliance
    { id: "rcat-culture", level: 2, parentId: "rcat-conduct", name: "Culture", definition: "The risk of Updraft's business is not being conducted in line with its core purpose or values." },
    { id: "rcat-products", level: 2, parentId: "rcat-conduct", name: "Products", definition: "The risk of Updraft's design or service of products which result in poor customer outcomes." },
    { id: "rcat-regulations", level: 2, parentId: "rcat-conduct", name: "Regulations", definition: "The risk of Updraft not complying with applicable regulations & codes." },
    // L2 — Operational
    { id: "rcat-people", level: 2, parentId: "rcat-operational", name: "People", definition: "The risk of damage as a result of an inability to recruit, develop, reward or retain appropriate people." },
    { id: "rcat-fraud", level: 2, parentId: "rcat-operational", name: "Fraud", definition: "The risk of damage or loss as a result of an act of dishonesty or false representation." },
    { id: "rcat-service", level: 2, parentId: "rcat-operational", name: "Service Availability & Resilience", definition: "The risk of a failure to maintain suitable technology services to customers." },
    { id: "rcat-processes", level: 2, parentId: "rcat-operational", name: "Processes", definition: "The risk of damage or loss as a result of failure to maintain effective business processes." },
    { id: "rcat-change", level: 2, parentId: "rcat-operational", name: "Change & Transformation", definition: "The risk of damage or loss from poorly managed change or transformation activity." },
    { id: "rcat-third", level: 2, parentId: "rcat-operational", name: "Third Parties", definition: "The risk of failure of a critical third party." },
    { id: "rcat-infosec", level: 2, parentId: "rcat-operational", name: "Information Management & Data Security", definition: "The risk of loss or damage as a result of material errors in critical reporting or failure to secure key data assets." },
    // L2 — Credit
    { id: "rcat-impairments", level: 2, parentId: "rcat-credit", name: "Impairments", definition: "The risk of Updraft being subject to excessive impairment provisions." },
    { id: "rcat-creditstrat", level: 2, parentId: "rcat-credit", name: "Credit Strategy", definition: "The risk Updraft fails to document, review and adhere to appropriate credit strategies." },
    { id: "rcat-creditmodels", level: 2, parentId: "rcat-credit", name: "Credit Models", definition: "The risk of failure of Updraft's key credit decisioning models and processes." },
    // L2 — Financial
    { id: "rcat-liquidity", level: 2, parentId: "rcat-financial", name: "Liquidity & Funding", definition: "The risk of Updraft being unable to meet its liabilities as they become due." },
    { id: "rcat-solvency", level: 2, parentId: "rcat-financial", name: "Solvency", definition: "The risk of Updraft failing to maintain sufficient capital." },
    { id: "rcat-market", level: 2, parentId: "rcat-financial", name: "Market", definition: "The risk that net value of or net income arising from assets and liabilities is impacted by market changes." },
    // L2 — Strategic
    { id: "rcat-bizmodel", level: 2, parentId: "rcat-strategic", name: "Business Model", definition: "The risk of failing to adopt an appropriate business model." },
    { id: "rcat-stratinit", level: 2, parentId: "rcat-strategic", name: "Strategic Initiatives", definition: "The risk of entering into strategic initiatives that undermine the business model." },
    { id: "rcat-reputation", level: 2, parentId: "rcat-strategic", name: "Reputation", definition: "The risk of events impacting Updraft's reputation to an extent it impacts business operations." },
  ];

  // Seed L1 first (no parent), then L2
  for (const c of RISK_CATEGORIES.filter((c) => c.level === 1)) {
    await prisma.riskCategory.upsert({ where: { id: c.id }, update: c, create: c });
  }
  for (const c of RISK_CATEGORIES.filter((c) => c.level === 2)) {
    await prisma.riskCategory.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log(`  ✓ ${RISK_CATEGORIES.length} risk categories`);

  // Risks
  interface SeedRiskControl { id: string; riskId: string; description: string; controlOwner: string | null; sortOrder: number }
  interface SeedRiskMitigation { id: string; riskId: string; action: string; owner: string | null; deadline: Date | null; status: MitigationStatus }
  interface SeedRisk {
    id: string; reference: string; name: string; description: string;
    categoryL1: string; categoryL2: string; ownerId: string;
    inherentLikelihood: number; inherentImpact: number;
    residualLikelihood: number; residualImpact: number;
    controlEffectiveness: ControlEffectiveness | null;
    riskAppetite: RiskAppetite | null;
    directionOfTravel: DirectionOfTravel;
    reviewFrequencyDays: number;
    lastReviewed: Date; createdBy: string; updatedBy: string;
    controls: SeedRiskControl[]; mitigations: SeedRiskMitigation[];
  }

  const SEED_RISKS: SeedRisk[] = [
    {
      id: "risk-001", reference: "R001", name: "Consumer Duty Non-Compliance",
      description: "Risk that Updraft fails to meet FCA Consumer Duty requirements, resulting in poor customer outcomes, regulatory sanctions, and reputational damage.",
      categoryL1: "Conduct & Compliance Risk", categoryL2: "Products", ownerId: "user-cath",
      inherentLikelihood: 3, inherentImpact: 5, residualLikelihood: 2, residualImpact: 4,
      controlEffectiveness: "EFFECTIVE", riskAppetite: "VERY_LOW", directionOfTravel: "IMPROVING",
      reviewFrequencyDays: 90,
      lastReviewed: new Date("2026-02-01"), createdBy: "user-rob", updatedBy: "user-cath",
      controls: [
        { id: "ctrl-001-1", riskId: "risk-001", description: "Consumer Duty monitoring framework with quarterly reporting", controlOwner: "Cath", sortOrder: 0 },
        { id: "ctrl-001-2", riskId: "risk-001", description: "Product governance committee meets monthly to review outcomes", controlOwner: "Rob", sortOrder: 1 },
        { id: "ctrl-001-3", riskId: "risk-001", description: "Customer outcome MI dashboard with automated RAG triggers", controlOwner: "Ash", sortOrder: 2 },
      ],
      mitigations: [
        { id: "mit-001-1", riskId: "risk-001", action: "Implement automated customer outcome testing for all product changes", owner: "Chris", deadline: new Date("2026-03-31"), status: "IN_PROGRESS" },
      ],
    },
    {
      id: "risk-002", reference: "R002", name: "Credit Model Failure",
      description: "Risk that Updraft's credit decisioning models produce inaccurate risk assessments, leading to unexpected losses or inappropriate lending decisions.",
      categoryL1: "Credit Risk", categoryL2: "Credit Models", ownerId: "user-ash",
      inherentLikelihood: 3, inherentImpact: 4, residualLikelihood: 2, residualImpact: 3,
      controlEffectiveness: "EFFECTIVE", riskAppetite: "LOW", directionOfTravel: "STABLE",
      reviewFrequencyDays: 90,
      lastReviewed: new Date("2026-01-15"), createdBy: "user-rob", updatedBy: "user-ash",
      controls: [
        { id: "ctrl-002-1", riskId: "risk-002", description: "Monthly model monitoring and back-testing with tolerance bands", controlOwner: "Ash", sortOrder: 0 },
        { id: "ctrl-002-2", riskId: "risk-002", description: "Independent annual model validation by external party", controlOwner: "Rob", sortOrder: 1 },
        { id: "ctrl-002-3", riskId: "risk-002", description: "Manual override tracking with quarterly review of override rates", controlOwner: "Ash", sortOrder: 2 },
      ],
      mitigations: [],
    },
    {
      id: "risk-003", reference: "R003", name: "Cyber Security Breach",
      description: "Risk of unauthorised access to systems or data resulting from cyber attack, social engineering, or insider threat.",
      categoryL1: "Operational Risk", categoryL2: "Information Management & Data Security", ownerId: "user-chris",
      inherentLikelihood: 4, inherentImpact: 5, residualLikelihood: 2, residualImpact: 4,
      controlEffectiveness: "EFFECTIVE", riskAppetite: "VERY_LOW", directionOfTravel: "STABLE",
      reviewFrequencyDays: 90,
      lastReviewed: new Date("2026-02-10"), createdBy: "user-rob", updatedBy: "user-chris",
      controls: [
        { id: "ctrl-003-1", riskId: "risk-003", description: "MFA enforced on all systems and VPN access", controlOwner: "Chris", sortOrder: 0 },
        { id: "ctrl-003-2", riskId: "risk-003", description: "Quarterly penetration testing by CREST-certified provider", controlOwner: "Chris", sortOrder: 1 },
        { id: "ctrl-003-3", riskId: "risk-003", description: "Mandatory security awareness training for all staff", controlOwner: "Micha", sortOrder: 2 },
        { id: "ctrl-003-4", riskId: "risk-003", description: "24/7 SOC monitoring and incident response plan tested annually", controlOwner: "Chris", sortOrder: 3 },
      ],
      mitigations: [
        { id: "mit-003-1", riskId: "risk-003", action: "Implement zero-trust network architecture", owner: "Chris", deadline: new Date("2026-06-30"), status: "IN_PROGRESS" },
      ],
    },
    {
      id: "risk-004", reference: "R004", name: "Liquidity & Funding Concentration",
      description: "Risk that Updraft is unable to meet its financial obligations as they fall due, or that funding sources become overly concentrated.",
      categoryL1: "Financial Risk", categoryL2: "Liquidity & Funding", ownerId: "user-david",
      inherentLikelihood: 3, inherentImpact: 5, residualLikelihood: 2, residualImpact: 4,
      controlEffectiveness: "EFFECTIVE", riskAppetite: "LOW", directionOfTravel: "IMPROVING",
      reviewFrequencyDays: 90,
      lastReviewed: new Date("2026-01-31"), createdBy: "user-rob", updatedBy: "user-rob",
      controls: [
        { id: "ctrl-004-1", riskId: "risk-004", description: "Monthly cash flow forecasting with 13-week rolling window and stress scenarios", controlOwner: "David", sortOrder: 0 },
        { id: "ctrl-004-2", riskId: "risk-004", description: "Board-approved liquidity buffer of 120% of 90-day outflows", controlOwner: "David", sortOrder: 1 },
        { id: "ctrl-004-3", riskId: "risk-004", description: "Funding diversification strategy with maximum single-source limit of 40%", controlOwner: "David", sortOrder: 2 },
      ],
      mitigations: [],
    },
    {
      id: "risk-005", reference: "R005", name: "Key Person Dependency",
      description: "Risk that critical business knowledge and capability is concentrated in a small number of individuals, creating single points of failure.",
      categoryL1: "Operational Risk", categoryL2: "People", ownerId: "user-chris",
      inherentLikelihood: 4, inherentImpact: 3, residualLikelihood: 3, residualImpact: 2,
      controlEffectiveness: "PARTIALLY_EFFECTIVE", riskAppetite: "LOW_TO_MODERATE", directionOfTravel: "IMPROVING",
      reviewFrequencyDays: 90,
      lastReviewed: new Date("2026-01-20"), createdBy: "user-rob", updatedBy: "user-rob",
      controls: [
        { id: "ctrl-005-1", riskId: "risk-005", description: "Cross-training programme for all critical roles", controlOwner: "Chris", sortOrder: 0 },
        { id: "ctrl-005-2", riskId: "risk-005", description: "Comprehensive process documentation and knowledge base", controlOwner: "Chris", sortOrder: 1 },
        { id: "ctrl-005-3", riskId: "risk-005", description: "Succession planning for all senior and specialist roles", controlOwner: "Chris", sortOrder: 2 },
      ],
      mitigations: [
        { id: "mit-005-1", riskId: "risk-005", action: "Complete succession plans for remaining 3 specialist roles", owner: "Chris", deadline: new Date("2026-04-30"), status: "OPEN" },
      ],
    },
    {
      id: "risk-006", reference: "R006", name: "Regulatory Change (FCA)",
      description: "Risk that changes in FCA regulations or supervisory expectations require significant operational or strategic adjustment that Updraft is slow to identify or implement.",
      categoryL1: "Conduct & Compliance Risk", categoryL2: "Regulations", ownerId: "user-cath",
      inherentLikelihood: 4, inherentImpact: 4, residualLikelihood: 3, residualImpact: 3,
      controlEffectiveness: "EFFECTIVE", riskAppetite: "VERY_LOW", directionOfTravel: "STABLE",
      reviewFrequencyDays: 90,
      lastReviewed: new Date("2026-02-05"), createdBy: "user-rob", updatedBy: "user-cath",
      controls: [
        { id: "ctrl-006-1", riskId: "risk-006", description: "Monthly regulatory horizon scanning and impact assessment", controlOwner: "Cath", sortOrder: 0 },
        { id: "ctrl-006-2", riskId: "risk-006", description: "Compliance calendar with automated deadline tracking", controlOwner: "Cath", sortOrder: 1 },
        { id: "ctrl-006-3", riskId: "risk-006", description: "Proactive FCA relationship management and consultation responses", controlOwner: "Rob", sortOrder: 2 },
      ],
      mitigations: [],
    },
  ];

  // Risk Snapshots — 12 months of history (Mar 2025 → Feb 2026)
  type SnapshotMonth = {
    month: string; rL: number; rI: number; iL: number; iI: number;
    direction: DirectionOfTravel;
  };
  const RISK_SNAPSHOT_DATA: { riskId: string; months: SnapshotMonth[] }[] = [
    { riskId: "risk-001", months: [ // Consumer Duty — improving over time
      { month: "2025-03-01", rL: 3, rI: 5, iL: 3, iI: 5, direction: "STABLE" },
      { month: "2025-04-01", rL: 3, rI: 5, iL: 3, iI: 5, direction: "STABLE" },
      { month: "2025-05-01", rL: 3, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-06-01", rL: 3, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-07-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-08-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-09-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-10-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-11-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-12-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2026-01-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2026-02-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
    ]},
    { riskId: "risk-002", months: [ // Credit Model — stable throughout
      { month: "2025-03-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2025-04-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2025-05-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2025-06-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2025-07-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2025-08-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2025-09-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2025-10-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2025-11-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2025-12-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2026-01-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
      { month: "2026-02-01", rL: 2, rI: 3, iL: 3, iI: 4, direction: "STABLE" },
    ]},
    { riskId: "risk-003", months: [ // Cyber Security — stable
      { month: "2025-03-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2025-04-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2025-05-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2025-06-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2025-07-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2025-08-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2025-09-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2025-10-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2025-11-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2025-12-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2026-01-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
      { month: "2026-02-01", rL: 2, rI: 4, iL: 4, iI: 5, direction: "STABLE" },
    ]},
    { riskId: "risk-004", months: [ // Liquidity — improving
      { month: "2025-03-01", rL: 3, rI: 5, iL: 3, iI: 5, direction: "STABLE" },
      { month: "2025-04-01", rL: 3, rI: 5, iL: 3, iI: 5, direction: "STABLE" },
      { month: "2025-05-01", rL: 3, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-06-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-07-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-08-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-09-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-10-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-11-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2025-12-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2026-01-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
      { month: "2026-02-01", rL: 2, rI: 4, iL: 3, iI: 5, direction: "IMPROVING" },
    ]},
    { riskId: "risk-005", months: [ // Key Person — partially improving
      { month: "2025-03-01", rL: 4, rI: 3, iL: 4, iI: 3, direction: "STABLE" },
      { month: "2025-04-01", rL: 4, rI: 3, iL: 4, iI: 3, direction: "STABLE" },
      { month: "2025-05-01", rL: 4, rI: 3, iL: 4, iI: 3, direction: "STABLE" },
      { month: "2025-06-01", rL: 3, rI: 3, iL: 4, iI: 3, direction: "IMPROVING" },
      { month: "2025-07-01", rL: 3, rI: 3, iL: 4, iI: 3, direction: "IMPROVING" },
      { month: "2025-08-01", rL: 3, rI: 3, iL: 4, iI: 3, direction: "IMPROVING" },
      { month: "2025-09-01", rL: 3, rI: 2, iL: 4, iI: 3, direction: "IMPROVING" },
      { month: "2025-10-01", rL: 3, rI: 2, iL: 4, iI: 3, direction: "IMPROVING" },
      { month: "2025-11-01", rL: 3, rI: 2, iL: 4, iI: 3, direction: "IMPROVING" },
      { month: "2025-12-01", rL: 3, rI: 2, iL: 4, iI: 3, direction: "IMPROVING" },
      { month: "2026-01-01", rL: 3, rI: 2, iL: 4, iI: 3, direction: "IMPROVING" },
      { month: "2026-02-01", rL: 3, rI: 2, iL: 4, iI: 3, direction: "IMPROVING" },
    ]},
    { riskId: "risk-006", months: [ // Regulatory Change — stable
      { month: "2025-03-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2025-04-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2025-05-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2025-06-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2025-07-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2025-08-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2025-09-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2025-10-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2025-11-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2025-12-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2026-01-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
      { month: "2026-02-01", rL: 3, rI: 3, iL: 4, iI: 4, direction: "STABLE" },
    ]},
  ];

  let controlCount = 0, mitigationCount = 0;
  for (const r of SEED_RISKS) {
    const { controls, mitigations, ...riskData } = r;
    await prisma.risk.upsert({ where: { id: r.id }, update: riskData, create: riskData });
    for (const c of controls) {
      await prisma.riskControl.upsert({ where: { id: c.id }, update: c, create: c });
      controlCount++;
    }
    for (const m of mitigations) {
      await prisma.riskMitigation.upsert({ where: { id: m.id }, update: m, create: m });
      mitigationCount++;
    }
  }
  console.log(`  ✓ ${SEED_RISKS.length} risks, ${controlCount} controls, ${mitigationCount} mitigations`);

  // Risk Snapshots
  let riskSnapshotCount = 0;
  for (const s of RISK_SNAPSHOT_DATA) {
    for (const m of s.months) {
      const monthDate = new Date(m.month);
      await prisma.riskSnapshot.upsert({
        where: { riskId_month: { riskId: s.riskId, month: monthDate } },
        update: {
          residualLikelihood: m.rL, residualImpact: m.rI,
          inherentLikelihood: m.iL, inherentImpact: m.iI,
          directionOfTravel: m.direction,
        },
        create: {
          riskId: s.riskId, month: monthDate,
          residualLikelihood: m.rL, residualImpact: m.rI,
          inherentLikelihood: m.iL, inherentImpact: m.iI,
          directionOfTravel: m.direction,
        },
      });
      riskSnapshotCount++;
    }
  }
  console.log(`  ✓ ${riskSnapshotCount} risk snapshots`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
