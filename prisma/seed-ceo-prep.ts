/**
 * seed-ceo-prep.ts
 * ─────────────────────────────────────────────────────────────────
 * Comprehensive data population for CEO demo prep.
 * Idempotent — safe to run multiple times (all upserts).
 *
 * Populates:
 *   • 4 Consumer Duty Outcomes + 25 Measures + 48 MI Metrics + 12-month snapshots
 *   • 15 Risks + 12-month RiskSnapshots + inline controls/mitigations
 *   • 12 additional Controls (UW / CS / COL / FIN / IT / HR / WEB / COMP)
 *     with TestingSchedule + 12-month TestResults + QuarterlySummaries + Attestations
 *   • 45 Actions (P1/P2/P3, all statuses)
 *   • RiskControlLinks (each risk → 2-4 controls)
 *   • RiskActionLinks (each risk → 2-4 actions)
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Helpers ────────────────────────────────────────────────────────────────

function monthDate(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

// Generate the 12 months from March 2025 to February 2026
const MONTHS_12 = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 2 + i, 1)); // March 2025 = index 0
  return d;
});

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== CEO Prep Seed: Comprehensive Data Population ===\n");

  // ── 1. Consumer Duty Outcomes ─────────────────────────────────────────────
  console.log("1. Consumer Duty Outcomes...");

  const CD_OUTCOMES = [
    {
      id: "cd-outcome-1",
      outcomeId: "1",
      name: "Products & Services",
      shortDesc: "Products and services designed to meet customer needs",
      detailedDescription:
        "Ensures that all products and services offered by Updraft are appropriately designed to meet the needs, characteristics and objectives of the identified target market. Distribution arrangements are suitable and distribution chains work to deliver good outcomes.",
      riskOwner: "user-ash",
      ragStatus: "GOOD" as const,
      previousRAG: "WARNING" as const,
      monthlySummary:
        "All loan products have been reviewed against target market definitions. Product Committee signed off updated TMD in January 2026. Distribution channel reviews complete.",
      mitigatingActions:
        "Complete annual fair value assessment for all products by end of Q1 2026. Enhance digital product disclosure review process.",
      position: 0,
      consumerDutyOutcome: "PRODUCTS_AND_SERVICES" as const,
    },
    {
      id: "cd-outcome-2",
      outcomeId: "2",
      name: "Consumer Understanding",
      shortDesc: "Communications that customers can understand and act upon",
      detailedDescription:
        "Ensures that all customer communications and information provided by Updraft meet a standard that enables retail customers to make informed financial decisions. Communications are clear, fair and not misleading.",
      riskOwner: "user-micha",
      ragStatus: "WARNING" as const,
      previousRAG: "WARNING" as const,
      monthlySummary:
        "Customer comprehension testing for pre-contractual documents is showing improving results following the Plain English rewrite in Q4 2025. However, digital journey readability scores remain below the GOOD threshold on two measures.",
      mitigatingActions:
        "Complete digital comms Plain English audit by end of February 2026. Implement readability scoring on all new marketing material.",
      position: 1,
      consumerDutyOutcome: "CONSUMER_UNDERSTANDING" as const,
    },
    {
      id: "cd-outcome-3",
      outcomeId: "3",
      name: "Consumer Support",
      shortDesc: "Support that meets customer needs across the lifecycle",
      detailedDescription:
        "Ensures that Updraft provides timely, accessible and effective support to retail customers throughout their relationship with the firm, including when customers are in financial difficulty, experiencing vulnerability, or wishing to complain.",
      riskOwner: "user-ash",
      ragStatus: "GOOD" as const,
      previousRAG: "GOOD" as const,
      monthlySummary:
        "Complaint resolution within FCA timelines at 96% in January. FOS uphold rate down to 18% from 26% peak in Q2 2025. Vulnerable customer identification process embedded following Q3 2025 project.",
      mitigatingActions:
        "Implement structured vulnerability screening at 30-day arrears by April 2026. Improve digital self-service tools.",
      position: 2,
      consumerDutyOutcome: "CONSUMER_SUPPORT" as const,
    },
    {
      id: "cd-outcome-4",
      outcomeId: "4",
      name: "Price & Value",
      shortDesc: "Fair value for money across all products and fees",
      detailedDescription:
        "Ensures that the price customers pay for Updraft's products and services represents fair value. The firm assesses and evidences fair value annually and takes remediation action where gaps are identified.",
      riskOwner: "user-cath",
      ragStatus: "WARNING" as const,
      previousRAG: "HARM" as const,
      monthlySummary:
        "First annual fair value assessment completed November 2025. Main finding: arrangement fees on certain loan tiers require simplification. Remediation plan approved by Product Committee. APR competitiveness remains strong vs sector median.",
      mitigatingActions:
        "Complete fee structure simplification by end of Q2 2026. Commission Product Value Report for board pack.",
      position: 3,
      consumerDutyOutcome: "PRICE_AND_VALUE" as const,
    },
    {
      id: "cd-outcome-5",
      outcomeId: "5",
      name: "Governance, Culture and Oversight",
      shortDesc: "Cross-cutting governance, culture and oversight framework",
      detailedDescription:
        "Cross-cutting theme that underpins all four Consumer Duty outcomes. Ensures that Updraft's governance arrangements, firm culture and senior management oversight are designed to embed fair consumer outcomes across the business. Includes board and senior management accountability, cultural indicators, management information and Consumer Duty Champion oversight.",
      riskOwner: "user-ash",
      ragStatus: "GOOD" as const,
      previousRAG: "GOOD" as const,
      monthlySummary:
        "Consumer Duty governance framework reviewed and signed off by Board in January 2026. Consumer Duty Champion reports reviewed quarterly. Culture survey results show improving awareness of Consumer Duty obligations across front-line teams.",
      mitigatingActions:
        "Embed Consumer Duty considerations into all new product and policy approvals. Ensure quarterly MI packs reach Board Audit & Risk Committee.",
      position: 4,
      consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT" as const,
    },
  ];

  for (const o of CD_OUTCOMES) {
    await prisma.consumerDutyOutcome.upsert({
      where: { id: o.id },
      update: {
        name: o.name,
        shortDesc: o.shortDesc,
        detailedDescription: o.detailedDescription,
        riskOwner: o.riskOwner,
        ragStatus: o.ragStatus,
        previousRAG: o.previousRAG,
        monthlySummary: o.monthlySummary,
        mitigatingActions: o.mitigatingActions,
        position: o.position,
      },
      create: {
        id: o.id,
        outcomeId: o.outcomeId,
        name: o.name,
        shortDesc: o.shortDesc,
        detailedDescription: o.detailedDescription,
        riskOwner: o.riskOwner,
        ragStatus: o.ragStatus,
        previousRAG: o.previousRAG,
        monthlySummary: o.monthlySummary,
        mitigatingActions: o.mitigatingActions,
        position: o.position,
      },
    });
  }
  console.log(`  ✓ ${CD_OUTCOMES.length} outcomes`);

  // ── 2. Consumer Duty Measures ──────────────────────────────────────────────
  console.log("2. Consumer Duty Measures...");

  const CD_MEASURES = [
    // Outcome 1: Products & Services
    { id: "cd-m-1-1", outcomeId: "cd-outcome-1", measureId: "1.1", name: "Target Market Definition Accuracy", owner: "user-ash", ragStatus: "GOOD" as const, summary: "% of products with current, board-approved Target Market Definitions reviewed in the last 12 months", position: 0 },
    { id: "cd-m-1-2", outcomeId: "cd-outcome-1", measureId: "1.2", name: "Affordability Assessment Pass Rate", owner: "user-micha", ragStatus: "GOOD" as const, summary: "% of credit applications that pass the full affordability assessment without manual override", position: 1 },
    { id: "cd-m-1-3", outcomeId: "cd-outcome-1", measureId: "1.3", name: "Product Feature Complaint Rate", owner: "user-ash", ragStatus: "WARNING" as const, summary: "Complaints about product features as % of active customer base — appetite: ≤ 0.5%", position: 2 },
    { id: "cd-m-1-4", outcomeId: "cd-outcome-1", measureId: "1.4", name: "Distribution Suitability Review", owner: "user-ash", ragStatus: "GOOD" as const, summary: "% of active distribution channels reviewed for suitability in the last 12 months", position: 3 },
    { id: "cd-m-1-5", outcomeId: "cd-outcome-1", measureId: "1.5", name: "Product Decline Rate vs Appetite", owner: "user-chris", ragStatus: "GOOD" as const, summary: "Personal loan decline rate for target market customers — appetite: ≤ 35%", position: 4 },
    { id: "cd-m-1-6", outcomeId: "cd-outcome-1", measureId: "1.6", name: "Credit Model Validation Completion", owner: "user-micha", ragStatus: "GOOD" as const, summary: "% of credit scoring models validated in the last 12 months per model validation policy", position: 5 },
    { id: "cd-m-1-7", outcomeId: "cd-outcome-1", measureId: "1.7", name: "Vulnerable Customer Application Rate", owner: "user-micha", ragStatus: "WARNING" as const, summary: "% of applications identified as potentially vulnerable that receive enhanced suitability review — appetite: ≥ 95%", position: 6 },
    { id: "cd-m-1-8", outcomeId: "cd-outcome-1", measureId: "1.8", name: "Third-Party Distribution Oversight", owner: "user-chris", ragStatus: "GOOD" as const, summary: "% of third-party/affiliate distributors with current oversight review completed in last 12 months", position: 7 },
    { id: "cd-m-1-9", outcomeId: "cd-outcome-1", measureId: "1.9", name: "Annual Fair Value Assessment Completion", owner: "user-cath", ragStatus: "GOOD" as const, summary: "Completion of annual fair value assessment for all products — binary: complete or not complete", position: 8 },
    // Outcome 2: Consumer Understanding
    { id: "cd-m-2-1", outcomeId: "cd-outcome-2", measureId: "2.1", name: "Pre-contractual Document Comprehension", owner: "user-micha", ragStatus: "GOOD" as const, summary: "% of tested customers who correctly understood key terms (APR, total repayable, right to cancel) — appetite: ≥ 85%", position: 0 },
    { id: "cd-m-2-2", outcomeId: "cd-outcome-2", measureId: "2.2", name: "Digital Journey Readability Score", owner: "user-micha", ragStatus: "WARNING" as const, summary: "Average Flesch-Kincaid readability score across all in-journey content — appetite: ≥ 60 (plain English equivalent)", position: 1 },
    { id: "cd-m-2-3", outcomeId: "cd-outcome-2", measureId: "2.3", name: "Financial Promotions Clarity Score", owner: "user-ash", ragStatus: "GOOD" as const, summary: "% of financial promotions scoring GREEN on the internal promotions clarity checklist — appetite: ≥ 95%", position: 2 },
    { id: "cd-m-2-4", outcomeId: "cd-outcome-2", measureId: "2.4", name: "Post-Disbursement Customer Understanding", owner: "user-micha", ragStatus: "GOOD" as const, summary: "% of customers passing post-disbursement understanding check (repayment schedule, charges) — appetite: ≥ 90%", position: 3 },
    // Outcome 3: Consumer Support
    { id: "cd-m-3-1", outcomeId: "cd-outcome-3", measureId: "3.1", name: "Complaint Resolution Within FCA Timelines", owner: "user-ash", ragStatus: "GOOD" as const, summary: "% of complaints resolved within FCA DISP timelines (3 days for summary, 8 weeks for final) — appetite: ≥ 95%", position: 0 },
    { id: "cd-m-3-2", outcomeId: "cd-outcome-3", measureId: "3.2", name: "FOS Uphold Rate", owner: "user-ash", ragStatus: "WARNING" as const, summary: "% of FOS-referred complaints upheld against Updraft — appetite: ≤ 20%", position: 1 },
    { id: "cd-m-3-3", outcomeId: "cd-outcome-3", measureId: "3.3", name: "Vulnerable Customer Identification Rate", owner: "user-chris", ragStatus: "WARNING" as const, summary: "% of customers in financial difficulty who are identified as vulnerable before collections contact — appetite: ≥ 90%", position: 2 },
    { id: "cd-m-3-4", outcomeId: "cd-outcome-3", measureId: "3.4", name: "Time to First Response (Support)", owner: "user-chris", ragStatus: "GOOD" as const, summary: "Average hours to first substantive response to customer support contacts — appetite: ≤ 4 hours", position: 3 },
    { id: "cd-m-3-5", outcomeId: "cd-outcome-3", measureId: "3.5", name: "Customer Satisfaction Score (CSAT)", owner: "user-chris", ragStatus: "GOOD" as const, summary: "CSAT score for support interactions — appetite: ≥ 4.0/5.0", position: 4 },
    { id: "cd-m-3-6", outcomeId: "cd-outcome-3", measureId: "3.6", name: "Forbearance Offer Take-Up Rate", owner: "user-ash", ragStatus: "GOOD" as const, summary: "% of eligible customers in arrears who were offered and accepted a forbearance arrangement — appetite: ≥ 80%", position: 5 },
    { id: "cd-m-3-7", outcomeId: "cd-outcome-3", measureId: "3.7", name: "Collections Process Compliance Audit", owner: "user-ash", ragStatus: "GOOD" as const, summary: "% pass rate on the quarterly collections process compliance audit — appetite: ≥ 95%", position: 6 },
    // Outcome 4: Price & Value
    { id: "cd-m-4-1", outcomeId: "cd-outcome-4", measureId: "4.1", name: "Fair Value Assessment Status", owner: "user-cath", ragStatus: "GOOD" as const, summary: "Annual fair value assessment status — binary: COMPLETE / OVERDUE", position: 0 },
    { id: "cd-m-4-2", outcomeId: "cd-outcome-4", measureId: "4.2", name: "APR Competitiveness vs Sector Median", owner: "user-chris", ragStatus: "GOOD" as const, summary: "Updraft representative APR vs sector median for equivalent risk profile — appetite: ≤ sector median + 5%", position: 1 },
    { id: "cd-m-4-3", outcomeId: "cd-outcome-4", measureId: "4.3", name: "Fee Transparency Score", owner: "user-ash", ragStatus: "WARNING" as const, summary: "% of customers who correctly identified all fees prior to completion — appetite: ≥ 90%", position: 2 },
    { id: "cd-m-4-4", outcomeId: "cd-outcome-4", measureId: "4.4", name: "Price & Value Remediation Actions On Track", owner: "user-cath", ragStatus: "WARNING" as const, summary: "% of Price & Value remediation actions on track vs agreed remediation plan — appetite: ≥ 80%", position: 3 },
  ];

  for (const m of CD_MEASURES) {
    await prisma.consumerDutyMeasure.upsert({
      where: { id: m.id },
      update: { name: m.name, owner: m.owner, ragStatus: m.ragStatus, summary: m.summary, position: m.position },
      create: {
        id: m.id,
        outcomeId: m.outcomeId,
        measureId: m.measureId,
        name: m.name,
        owner: m.owner,
        ragStatus: m.ragStatus,
        summary: m.summary,
        position: m.position,
      },
    });
  }
  console.log(`  ✓ ${CD_MEASURES.length} measures`);

  // ── 3. Consumer Duty MI Metrics ─────────────────────────────────────────────
  console.log("3. Consumer Duty MI metrics...");

  type RagStatus = "GOOD" | "WARNING" | "HARM";

  const CD_MI: {
    id: string;
    measureId: string;
    metric: string;
    current: string;
    previous: string;
    change: string;
    ragStatus: RagStatus;
    appetite: string;
    appetiteOperator: string;
    narrative: string;
    // Monthly snapshots: 12 values (oldest first = March 2025)
    monthlyValues: string[];
    monthlyRag: RagStatus[];
  }[] = [
    // ── Measure 1.1 Target Market Definition ──
    {
      id: "cd-mi-1-1-a", measureId: "cd-m-1-1",
      metric: "Products with Current TMD (%)", current: "100%", previous: "87%", change: "+13pp",
      ragStatus: "GOOD", appetite: "100%", appetiteOperator: ">=",
      narrative: "All four active loan products now have board-approved TMDs reviewed in the last 12 months, following the January 2026 Product Committee review.",
      monthlyValues: ["80%","80%","80%","87%","87%","87%","87%","100%","100%","100%","100%","100%"],
      monthlyRag:    ["HARM","HARM","HARM","WARNING","WARNING","WARNING","WARNING","GOOD","GOOD","GOOD","GOOD","GOOD"],
    },
    // ── Measure 1.2 Affordability ──
    {
      id: "cd-mi-1-2-a", measureId: "cd-m-1-2",
      metric: "Affordability Assessment Pass Rate (%)", current: "97.2%", previous: "96.8%", change: "+0.4pp",
      ragStatus: "GOOD", appetite: "95%", appetiteOperator: ">=",
      narrative: "Consistently above appetite. Model recalibration in Q3 2025 improved pass rate accuracy without relaxing underwriting standards.",
      monthlyValues: ["94.5%","94.8%","95.1%","95.6%","95.9%","96.1%","96.4%","96.5%","96.7%","96.8%","96.9%","97.2%"],
      monthlyRag:    ["WARNING","WARNING","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD"],
    },
    {
      id: "cd-mi-1-2-b", measureId: "cd-m-1-2",
      metric: "Manual Override Rate (%)", current: "1.8%", previous: "2.1%", change: "-0.3pp",
      ragStatus: "GOOD", appetite: "3%", appetiteOperator: "<=",
      narrative: "Manual overrides to automated affordability decisions are tracked and reviewed monthly. Current rate is well within appetite.",
      monthlyValues: ["3.1%","3.0%","2.9%","2.7%","2.6%","2.4%","2.3%","2.2%","2.1%","2.0%","1.9%","1.8%"],
      monthlyRag:    ["HARM","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD"],
    },
    // ── Measure 1.3 Product Feature Complaints ──
    {
      id: "cd-mi-1-3-a", measureId: "cd-m-1-3",
      metric: "Product Feature Complaints (% of base)", current: "0.42%", previous: "0.55%", change: "-0.13pp",
      ragStatus: "WARNING", appetite: "0.5%", appetiteOperator: "<=",
      narrative: "Rate is improving following product clarity improvements in Q4 2025 but remains borderline. Main driver: customers questioning the total cost shown at application vs final statement.",
      monthlyValues: ["0.71%","0.68%","0.65%","0.62%","0.59%","0.58%","0.57%","0.55%","0.53%","0.50%","0.47%","0.42%"],
      monthlyRag:    ["HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","GOOD","GOOD","WARNING"],
    },
    // ── Measure 1.7 Vulnerable Customer Applications ──
    {
      id: "cd-mi-1-7-a", measureId: "cd-m-1-7",
      metric: "Vulnerable Customer Enhanced Review Rate (%)", current: "92.1%", previous: "89.4%", change: "+2.7pp",
      ragStatus: "WARNING", appetite: "95%", appetiteOperator: ">=",
      narrative: "Improving trend following vulnerability training roll-out in October 2025. Not yet at appetite. Target: ≥95% by end of Q2 2026.",
      monthlyValues: ["81%","82%","83%","84%","85%","86%","87%","88%","89%","89.4%","91%","92.1%"],
      monthlyRag:    ["HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","WARNING","WARNING","WARNING","WARNING"],
    },
    // ── Measure 2.1 Pre-Contractual Comprehension ──
    {
      id: "cd-mi-2-1-a", measureId: "cd-m-2-1",
      metric: "Customer Document Comprehension Rate (%)", current: "88.3%", previous: "85.1%", change: "+3.2pp",
      ragStatus: "GOOD", appetite: "85%", appetiteOperator: ">=",
      narrative: "Plain English rewrite of pre-contractual information completed Q4 2025 has driven material improvement in comprehension testing scores.",
      monthlyValues: ["76%","77%","78%","79%","80%","81%","82%","83%","84%","85.1%","87%","88.3%"],
      monthlyRag:    ["HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","GOOD","GOOD","GOOD"],
    },
    // ── Measure 2.2 Digital Readability ──
    {
      id: "cd-mi-2-2-a", measureId: "cd-m-2-2",
      metric: "Average Flesch-Kincaid Readability Score", current: "57.2", previous: "54.8", change: "+2.4",
      ragStatus: "WARNING", appetite: "60", appetiteOperator: ">=",
      narrative: "Improving following the content audit in December 2025 but not yet at appetite threshold of 60. Digital journey copy review ongoing — target: complete by March 2026.",
      monthlyValues: ["48.1","49.2","50.3","51.4","52.1","52.8","53.5","54.1","54.8","55.5","56.3","57.2"],
      monthlyRag:    ["HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","WARNING","WARNING","WARNING","WARNING"],
    },
    // ── Measure 2.3 Promotions Clarity ──
    {
      id: "cd-mi-2-3-a", measureId: "cd-m-2-3",
      metric: "Promotions Scoring GREEN on Clarity Checklist (%)", current: "97.1%", previous: "95.3%", change: "+1.8pp",
      ragStatus: "GOOD", appetite: "95%", appetiteOperator: ">=",
      narrative: "Strong and improving. Enhanced review process introduced after the FinProm digital regime update has maintained high clarity standards.",
      monthlyValues: ["89%","91%","92%","93%","94%","94.5%","95.0%","95.3%","95.5%","96.0%","96.5%","97.1%"],
      monthlyRag:    ["HARM","HARM","HARM","HARM","WARNING","WARNING","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD"],
    },
    // ── Measure 3.1 Complaint Resolution ──
    {
      id: "cd-mi-3-1-a", measureId: "cd-m-3-1",
      metric: "Complaints Resolved Within FCA Timeline (%)", current: "96.1%", previous: "95.2%", change: "+0.9pp",
      ragStatus: "GOOD", appetite: "95%", appetiteOperator: ">=",
      narrative: "Consistently above appetite throughout the period. Minor dip in September 2025 due to a technology outage affecting the complaints management system.",
      monthlyValues: ["94.1%","94.5%","94.9%","95.2%","95.6%","96.0%","96.1%","93.4%","95.1%","95.5%","95.8%","96.1%"],
      monthlyRag:    ["WARNING","WARNING","WARNING","GOOD","GOOD","GOOD","GOOD","HARM","GOOD","GOOD","GOOD","GOOD"],
    },
    {
      id: "cd-mi-3-1-b", measureId: "cd-m-3-1",
      metric: "Average Complaint Resolution Time (days)", current: "4.2", previous: "4.8", change: "-0.6",
      ragStatus: "GOOD", appetite: "8", appetiteOperator: "<=",
      narrative: "Well within the 8-day appetite. Improving trend throughout the year.",
      monthlyValues: ["6.1","5.9","5.8","5.6","5.4","5.2","5.0","4.9","4.8","4.6","4.4","4.2"],
      monthlyRag:    ["GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD"],
    },
    // ── Measure 3.2 FOS Uphold Rate ──
    {
      id: "cd-mi-3-2-a", measureId: "cd-m-3-2",
      metric: "FOS Uphold Rate (%)", current: "18%", previous: "22%", change: "-4pp",
      ragStatus: "WARNING", appetite: "20%", appetiteOperator: "<=",
      narrative: "Rate has been declining since Q2 2025 peak following root-cause analysis and remediation of the main complaint category (total cost transparency). Currently borderline — target: ≤15% by Q3 2026.",
      monthlyValues: ["23%","24%","25%","26%","25%","23%","22%","21%","20%","20%","19%","18%"],
      monthlyRag:    ["HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","GOOD","GOOD","WARNING","WARNING"],
    },
    // ── Measure 3.3 Vulnerable Customer Identification ──
    {
      id: "cd-mi-3-3-a", measureId: "cd-m-3-3",
      metric: "Vulnerable Customers Identified Before Collections (%)", current: "84.2%", previous: "80.1%", change: "+4.1pp",
      ragStatus: "WARNING", appetite: "90%", appetiteOperator: ">=",
      narrative: "Improving but not yet at appetite. Manual identification relies on agent discretion. Structured vulnerability screening project (targeting Q2 2026) will deliver systematic identification.",
      monthlyValues: ["70%","71%","72%","74%","75%","76%","77%","78%","80.1%","81%","82.5%","84.2%"],
      monthlyRag:    ["HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","WARNING","WARNING"],
    },
    // ── Measure 3.4 Time to First Response ──
    {
      id: "cd-mi-3-4-a", measureId: "cd-m-3-4",
      metric: "Average Time to First Response (hours)", current: "2.8", previous: "3.1", change: "-0.3",
      ragStatus: "GOOD", appetite: "4", appetiteOperator: "<=",
      narrative: "Consistently within appetite. Customer service team expanded by 2 FTE in September 2025 which improved response times.",
      monthlyValues: ["3.9","3.8","3.7","3.6","3.5","3.4","3.3","3.2","3.1","3.0","2.9","2.8"],
      monthlyRag:    ["GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD"],
    },
    // ── Measure 3.5 CSAT ──
    {
      id: "cd-mi-3-5-a", measureId: "cd-m-3-5",
      metric: "Customer Satisfaction Score (CSAT /5.0)", current: "4.3", previous: "4.1", change: "+0.2",
      ragStatus: "GOOD", appetite: "4.0", appetiteOperator: ">=",
      narrative: "Good and improving. The post-interaction survey was redesigned in June 2025 to increase response rates — data quality is more reliable since then.",
      monthlyValues: ["3.8","3.9","3.9","4.0","4.0","4.1","4.1","4.2","4.1","4.2","4.2","4.3"],
      monthlyRag:    ["HARM","HARM","HARM","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD"],
    },
    // ── Measure 4.1 Fair Value Assessment ──
    {
      id: "cd-mi-4-1-a", measureId: "cd-m-4-1",
      metric: "Annual Fair Value Assessment Completed (Y/N)", current: "Complete", previous: "Overdue", change: "Completed",
      ragStatus: "GOOD", appetite: "Complete", appetiteOperator: "=",
      narrative: "First annual fair value assessment completed November 2025. Next due: Q3 2026.",
      monthlyValues: ["Overdue","Overdue","Overdue","Overdue","Overdue","Overdue","Overdue","Overdue","In Progress","Complete","Complete","Complete"],
      monthlyRag:    ["HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","WARNING","GOOD","GOOD","GOOD"],
    },
    // ── Measure 4.2 APR vs Sector ──
    {
      id: "cd-mi-4-2-a", measureId: "cd-m-4-2",
      metric: "Updraft APR vs Sector Median (+/- pp)", current: "+2.1pp", previous: "+2.4pp", change: "-0.3pp",
      ragStatus: "GOOD", appetite: "+5pp", appetiteOperator: "<=",
      narrative: "Updraft's representative APR is 2.1 percentage points above the sector median for equivalent risk profiles. Well within the ≤5pp appetite. APR competitiveness is monitored quarterly.",
      monthlyValues: ["+3.1pp","+3.0pp","+2.9pp","+2.8pp","+2.7pp","+2.6pp","+2.5pp","+2.5pp","+2.4pp","+2.3pp","+2.2pp","+2.1pp"],
      monthlyRag:    ["GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD"],
    },
    // ── Measure 4.3 Fee Transparency ──
    {
      id: "cd-mi-4-3-a", measureId: "cd-m-4-3",
      metric: "Fee Transparency Score (%)", current: "82.3%", previous: "78.1%", change: "+4.2pp",
      ragStatus: "WARNING", appetite: "90%", appetiteOperator: ">=",
      narrative: "Improving following customer disclosure improvements in Q4 2025 but not yet at appetite. Simplification of fee structure (in progress) expected to drive material improvement.",
      monthlyValues: ["65%","66%","67%","68%","70%","71%","73%","75%","78.1%","79.5%","81%","82.3%"],
      monthlyRag:    ["HARM","HARM","HARM","HARM","HARM","HARM","HARM","HARM","WARNING","WARNING","WARNING","WARNING"],
    },
    // ── Measure 4.4 Remediation On Track ──
    {
      id: "cd-mi-4-4-a", measureId: "cd-m-4-4",
      metric: "Price & Value Remediation Actions On Track (%)", current: "75%", previous: "N/A", change: "New metric",
      ragStatus: "WARNING", appetite: "80%", appetiteOperator: ">=",
      narrative: "New metric established following November 2025 fair value assessment. 3 of 4 remediation actions are on track. One action (fee simplification) has slipped by 4 weeks due to system development constraints.",
      monthlyValues: ["N/A","N/A","N/A","N/A","N/A","N/A","N/A","N/A","N/A","100%","75%","75%"],
      monthlyRag:    ["GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","GOOD","WARNING","WARNING"],
    },
  ];

  for (const mi of CD_MI) {
    await prisma.consumerDutyMI.upsert({
      where: { id: mi.id },
      update: {
        metric: mi.metric, current: mi.current, previous: mi.previous, change: mi.change,
        ragStatus: mi.ragStatus, appetite: mi.appetite, appetiteOperator: mi.appetiteOperator, narrative: mi.narrative,
      },
      create: {
        id: mi.id, measureId: mi.measureId, metric: mi.metric, current: mi.current,
        previous: mi.previous, change: mi.change, ragStatus: mi.ragStatus,
        appetite: mi.appetite, appetiteOperator: mi.appetiteOperator, narrative: mi.narrative,
      },
    });
    // Seed 12-month snapshots
    for (let i = 0; i < 12; i++) {
      const snapId = `${mi.id}-snap-${i}`;
      await prisma.metricSnapshot.upsert({
        where: { id: snapId },
        update: { value: mi.monthlyValues[i], ragStatus: mi.monthlyRag[i] },
        create: {
          id: snapId,
          miId: mi.id,
          month: MONTHS_12[i],
          value: mi.monthlyValues[i],
          ragStatus: mi.monthlyRag[i],
        },
      });
    }
  }
  console.log(`  ✓ ${CD_MI.length} MI metrics + ${CD_MI.length * 12} snapshots`);

  // ── 4. Risks ──────────────────────────────────────────────────────────────
  console.log("4. Risks...");

  type RiskAppetite = "VERY_LOW" | "LOW" | "LOW_TO_MODERATE" | "MODERATE";
  type Direction = "IMPROVING" | "STABLE" | "DETERIORATING";
  type ControlEff = "EFFECTIVE" | "PARTIALLY_EFFECTIVE" | "INEFFECTIVE";

  interface RiskSeed {
    id: string; reference: string; name: string; description: string;
    categoryL1: string; categoryL2: string; ownerId: string;
    iL: number; iI: number; rL: number; rI: number;
    controlEffectiveness: ControlEff; riskAppetite: RiskAppetite;
    directionOfTravel: Direction; inFocus: boolean;
    // 12-month snapshot: [rL, rI, direction] for each month (oldest first)
    snapshots: Array<[number, number, Direction]>;
  }

  const RISKS: RiskSeed[] = [
    {
      id: "risk-001", reference: "RR-001",
      name: "Credit Impairment Risk",
      description: "Risk that the level of credit losses from personal loan defaults exceeds the firm's risk appetite and capital provisioning, driven by deteriorating customer affordability, economic conditions, or weaknesses in underwriting models.",
      categoryL1: "Credit Risk", categoryL2: "Loan Performance",
      ownerId: "user-micha",
      iL: 4, iI: 4, rL: 3, rI: 3,
      controlEffectiveness: "PARTIALLY_EFFECTIVE",
      riskAppetite: "LOW",
      directionOfTravel: "STABLE",
      inFocus: true,
      snapshots: [
        [4,4,"STABLE"],[4,4,"STABLE"],[4,3,"IMPROVING"],[3,4,"STABLE"],
        [3,4,"STABLE"],[3,4,"STABLE"],[3,3,"IMPROVING"],[3,3,"STABLE"],
        [3,3,"STABLE"],[3,3,"STABLE"],[3,3,"STABLE"],[3,3,"STABLE"],
      ],
    },
    {
      id: "risk-002", reference: "RR-002",
      name: "Affordability Assessment Risk",
      description: "Risk that the firm's affordability assessment process fails to identify customers for whom the loan is unaffordable, leading to consumer harm, regulatory censure under CONC 5, and/or increased impairment rates.",
      categoryL1: "Credit Risk", categoryL2: "Creditworthiness",
      ownerId: "user-micha",
      iL: 3, iI: 4, rL: 2, rI: 3,
      controlEffectiveness: "EFFECTIVE",
      riskAppetite: "VERY_LOW",
      directionOfTravel: "IMPROVING",
      inFocus: false,
      snapshots: [
        [3,4,"STABLE"],[3,4,"STABLE"],[3,4,"STABLE"],[3,3,"IMPROVING"],
        [2,3,"IMPROVING"],[2,3,"STABLE"],[2,3,"STABLE"],[2,3,"STABLE"],
        [2,3,"STABLE"],[2,3,"STABLE"],[2,3,"STABLE"],[2,3,"STABLE"],
      ],
    },
    {
      id: "risk-003", reference: "RR-003",
      name: "Credit Concentration Risk",
      description: "Risk of excessive concentration in the loan portfolio by borrower segment, product type, or geographic region, creating correlation of credit losses under stress scenarios.",
      categoryL1: "Credit Risk", categoryL2: "Concentration",
      ownerId: "user-micha",
      iL: 3, iI: 3, rL: 2, rI: 2,
      controlEffectiveness: "EFFECTIVE",
      riskAppetite: "LOW",
      directionOfTravel: "STABLE",
      inFocus: false,
      snapshots: Array.from({ length: 12 }, () => [2, 2, "STABLE"] as [number, number, Direction]),
    },
    {
      id: "risk-004", reference: "RR-004",
      name: "Fraud & Financial Crime Risk",
      description: "Risk of financial loss or regulatory sanction arising from first-party fraud, account takeover fraud, money laundering, or sanctions violations. Includes the risk that fraud detection controls are circumvented or that AML/CTF obligations are not met.",
      categoryL1: "Operational Risk", categoryL2: "Fraud",
      ownerId: "user-chris",
      iL: 4, iI: 4, rL: 3, rI: 3,
      controlEffectiveness: "PARTIALLY_EFFECTIVE",
      riskAppetite: "VERY_LOW",
      directionOfTravel: "STABLE",
      inFocus: true,
      snapshots: [
        [4,4,"STABLE"],[4,4,"STABLE"],[4,4,"DETERIORATING"],[4,4,"STABLE"],
        [4,4,"STABLE"],[3,4,"IMPROVING"],[3,4,"STABLE"],[3,3,"IMPROVING"],
        [3,3,"STABLE"],[3,3,"STABLE"],[3,3,"STABLE"],[3,3,"STABLE"],
      ],
    },
    {
      id: "risk-005", reference: "RR-005",
      name: "Cyber Security Risk",
      description: "Risk of unauthorised access to, disruption of, or theft of customer data or firm systems through cyber attack, including phishing, ransomware, supply-chain compromise, and exploitation of software vulnerabilities.",
      categoryL1: "Operational Risk", categoryL2: "Technology",
      ownerId: "user-graham",
      iL: 3, iI: 5, rL: 2, rI: 4,
      controlEffectiveness: "EFFECTIVE",
      riskAppetite: "VERY_LOW",
      directionOfTravel: "IMPROVING",
      inFocus: false,
      snapshots: [
        [3,5,"STABLE"],[3,5,"STABLE"],[3,5,"STABLE"],[3,4,"IMPROVING"],
        [3,4,"STABLE"],[3,4,"STABLE"],[2,4,"IMPROVING"],[2,4,"STABLE"],
        [2,4,"STABLE"],[2,4,"STABLE"],[2,4,"STABLE"],[2,4,"STABLE"],
      ],
    },
    {
      id: "risk-006", reference: "RR-006",
      name: "IT Resilience & Availability Risk",
      description: "Risk of material service disruption to customer-facing systems, internal operational systems, or data infrastructure, resulting in customer harm, regulatory breach of operational resilience requirements, or financial loss.",
      categoryL1: "Operational Risk", categoryL2: "Technology",
      ownerId: "user-graham",
      iL: 3, iI: 4, rL: 2, rI: 3,
      controlEffectiveness: "EFFECTIVE",
      riskAppetite: "VERY_LOW",
      directionOfTravel: "STABLE",
      inFocus: false,
      snapshots: Array.from({ length: 12 }, () => [2, 3, "STABLE"] as [number, number, Direction]),
    },
    {
      id: "risk-007", reference: "RR-007",
      name: "Data Breach & Privacy Risk",
      description: "Risk of unauthorised disclosure, loss, or corruption of personal data held by the firm, resulting in harm to data subjects, ICO enforcement action, and/or reputational damage.",
      categoryL1: "Operational Risk", categoryL2: "Technology",
      ownerId: "user-graham",
      iL: 3, iI: 4, rL: 2, rI: 3,
      controlEffectiveness: "PARTIALLY_EFFECTIVE",
      riskAppetite: "VERY_LOW",
      directionOfTravel: "STABLE",
      inFocus: false,
      snapshots: [
        [2,3,"STABLE"],[2,3,"STABLE"],[2,3,"STABLE"],[3,4,"DETERIORATING"],
        [3,4,"STABLE"],[3,4,"STABLE"],[3,3,"IMPROVING"],[2,3,"IMPROVING"],
        [2,3,"STABLE"],[2,3,"STABLE"],[2,3,"STABLE"],[2,3,"STABLE"],
      ],
    },
    {
      id: "risk-008", reference: "RR-008",
      name: "Consumer Duty Outcomes Risk",
      description: "Risk that Updraft fails to deliver good outcomes for retail customers across one or more of the four Consumer Duty outcome areas, resulting in FCA supervisory action, consumer redress requirements, or reputational harm.",
      categoryL1: "Conduct Risk", categoryL2: "Consumer Outcomes",
      ownerId: "user-rob",
      iL: 3, iI: 4, rL: 2, rI: 3,
      controlEffectiveness: "PARTIALLY_EFFECTIVE",
      riskAppetite: "VERY_LOW",
      directionOfTravel: "IMPROVING",
      inFocus: true,
      snapshots: [
        [3,4,"STABLE"],[3,4,"STABLE"],[3,4,"STABLE"],[3,3,"IMPROVING"],
        [3,3,"STABLE"],[2,3,"IMPROVING"],[2,3,"STABLE"],[2,3,"STABLE"],
        [2,3,"STABLE"],[2,3,"STABLE"],[2,3,"STABLE"],[2,3,"STABLE"],
      ],
    },
    {
      id: "risk-009", reference: "RR-009",
      name: "Financial Promotions Compliance Risk",
      description: "Risk that the firm's financial promotions and marketing communications fail to meet FCA standards under CONC 3, COBS 4, and the Consumer Duty outcome for Consumer Understanding, resulting in misleading customers, regulatory censure, or financial penalties.",
      categoryL1: "Conduct Risk", categoryL2: "Financial Promotions",
      ownerId: "user-ash",
      iL: 3, iI: 3, rL: 2, rI: 2,
      controlEffectiveness: "EFFECTIVE",
      riskAppetite: "VERY_LOW",
      directionOfTravel: "IMPROVING",
      inFocus: false,
      snapshots: [
        [3,3,"STABLE"],[3,3,"STABLE"],[3,3,"STABLE"],[3,3,"STABLE"],
        [3,3,"STABLE"],[2,3,"IMPROVING"],[2,3,"STABLE"],[2,3,"STABLE"],
        [2,2,"IMPROVING"],[2,2,"STABLE"],[2,2,"STABLE"],[2,2,"STABLE"],
      ],
    },
    {
      id: "risk-010", reference: "RR-010",
      name: "Complaints Handling Risk",
      description: "Risk that the firm fails to handle customer complaints fairly, promptly, and in accordance with FCA DISP rules, leading to FOS referrals, elevated uphold rates, regulatory scrutiny, and reputational damage.",
      categoryL1: "Conduct Risk", categoryL2: "Complaints",
      ownerId: "user-ash",
      iL: 3, iI: 3, rL: 2, rI: 2,
      controlEffectiveness: "EFFECTIVE",
      riskAppetite: "LOW",
      directionOfTravel: "STABLE",
      inFocus: false,
      snapshots: [
        [2,2,"STABLE"],[2,2,"STABLE"],[2,2,"STABLE"],[2,2,"STABLE"],
        [2,2,"STABLE"],[2,2,"STABLE"],[2,2,"STABLE"],[3,2,"DETERIORATING"],
        [3,2,"STABLE"],[2,2,"IMPROVING"],[2,2,"STABLE"],[2,2,"STABLE"],
      ],
    },
    {
      id: "risk-011", reference: "RR-011",
      name: "Vulnerable Customer Risk",
      description: "Risk that the firm fails to identify and appropriately support customers who are vulnerable due to health, life events, resilience, or capability factors, leading to foreseeable harm and breach of the Consumer Duty.",
      categoryL1: "Conduct Risk", categoryL2: "Customer Vulnerability",
      ownerId: "user-ash",
      iL: 3, iI: 4, rL: 2, rI: 3,
      controlEffectiveness: "PARTIALLY_EFFECTIVE",
      riskAppetite: "VERY_LOW",
      directionOfTravel: "STABLE",
      inFocus: false,
      snapshots: Array.from({ length: 12 }, () => [2, 3, "STABLE"] as [number, number, Direction]),
    },
    {
      id: "risk-012", reference: "RR-012",
      name: "Regulatory Change Risk",
      description: "Risk that Updraft fails to identify, assess, and implement changes to its regulatory obligations in a timely manner, resulting in non-compliance, regulatory sanction, or customer harm.",
      categoryL1: "Regulatory Risk", categoryL2: "Regulatory Change",
      ownerId: "user-cath",
      iL: 3, iI: 4, rL: 2, rI: 3,
      controlEffectiveness: "EFFECTIVE",
      riskAppetite: "LOW",
      directionOfTravel: "STABLE",
      inFocus: false,
      snapshots: Array.from({ length: 12 }, () => [2, 3, "STABLE"] as [number, number, Direction]),
    },
    {
      id: "risk-013", reference: "RR-013",
      name: "FCA Supervisory Risk",
      description: "Risk that the firm's relationship with the FCA deteriorates or that FCA supervisory engagement identifies material failings, leading to formal supervisory action, public censure, restriction of permissions, or financial penalty.",
      categoryL1: "Regulatory Risk", categoryL2: "Regulatory Relationship",
      ownerId: "user-cath",
      iL: 2, iI: 5, rL: 1, rI: 4,
      controlEffectiveness: "EFFECTIVE",
      riskAppetite: "VERY_LOW",
      directionOfTravel: "IMPROVING",
      inFocus: false,
      snapshots: [
        [2,5,"STABLE"],[2,5,"STABLE"],[2,5,"STABLE"],[2,4,"IMPROVING"],
        [2,4,"STABLE"],[1,4,"IMPROVING"],[1,4,"STABLE"],[1,4,"STABLE"],
        [1,4,"STABLE"],[1,4,"STABLE"],[1,4,"STABLE"],[1,4,"STABLE"],
      ],
    },
    {
      id: "risk-014", reference: "RR-014",
      name: "Liquidity Risk",
      description: "Risk that the firm is unable to meet its financial obligations as they fall due, or can only do so at excessive cost, due to a funding shortfall, withdrawal of credit facilities, or mis-management of cash flow.",
      categoryL1: "Financial Risk", categoryL2: "Funding / Liquidity",
      ownerId: "user-david",
      iL: 3, iI: 4, rL: 2, rI: 3,
      controlEffectiveness: "EFFECTIVE",
      riskAppetite: "LOW",
      directionOfTravel: "STABLE",
      inFocus: false,
      snapshots: Array.from({ length: 12 }, () => [2, 3, "STABLE"] as [number, number, Direction]),
    },
    {
      id: "risk-015", reference: "RR-015",
      name: "Interest Rate Risk",
      description: "Risk that changes in interest rates adversely affect the firm's net interest income or the value of its financial instruments, including the risk of margin compression if funding costs rise faster than loan yields.",
      categoryL1: "Financial Risk", categoryL2: "Market Risk",
      ownerId: "user-david",
      iL: 2, iI: 3, rL: 1, rI: 2,
      controlEffectiveness: "EFFECTIVE",
      riskAppetite: "MODERATE",
      directionOfTravel: "IMPROVING",
      inFocus: false,
      snapshots: [
        [2,3,"STABLE"],[2,3,"STABLE"],[2,3,"STABLE"],[2,2,"IMPROVING"],
        [1,2,"IMPROVING"],[1,2,"STABLE"],[1,2,"STABLE"],[1,2,"STABLE"],
        [1,2,"STABLE"],[1,2,"STABLE"],[1,2,"STABLE"],[1,2,"STABLE"],
      ],
    },
  ];

  for (const r of RISKS) {
    await prisma.risk.upsert({
      where: { id: r.id },
      update: {
        name: r.name, description: r.description,
        categoryL1: r.categoryL1, categoryL2: r.categoryL2,
        ownerId: r.ownerId,
        inherentLikelihood: r.iL, inherentImpact: r.iI,
        residualLikelihood: r.rL, residualImpact: r.rI,
        controlEffectiveness: r.controlEffectiveness,
        riskAppetite: r.riskAppetite,
        directionOfTravel: r.directionOfTravel,
        inFocus: r.inFocus,
        updatedBy: "user-rob",
      },
      create: {
        id: r.id,
        reference: r.reference,
        name: r.name,
        description: r.description,
        categoryL1: r.categoryL1,
        categoryL2: r.categoryL2,
        ownerId: r.ownerId,
        inherentLikelihood: r.iL,
        inherentImpact: r.iI,
        residualLikelihood: r.rL,
        residualImpact: r.rI,
        controlEffectiveness: r.controlEffectiveness,
        riskAppetite: r.riskAppetite,
        directionOfTravel: r.directionOfTravel,
        inFocus: r.inFocus,
        createdBy: "user-rob",
        updatedBy: "user-rob",
      },
    });
    // Seed 12-month snapshots
    for (let i = 0; i < 12; i++) {
      const [sRL, sRI, sDir] = r.snapshots[i];
      const snapId = `${r.id}-snap-${i}`;
      await prisma.riskSnapshot.upsert({
        where: { id: snapId },
        update: { residualLikelihood: sRL, residualImpact: sRI, directionOfTravel: sDir },
        create: {
          id: snapId,
          riskId: r.id,
          month: MONTHS_12[i],
          residualLikelihood: sRL,
          residualImpact: sRI,
          inherentLikelihood: r.iL,
          inherentImpact: r.iI,
          directionOfTravel: sDir,
        },
      });
    }
    // Seed 2 inline risk controls per risk
    await prisma.riskControl.upsert({
      where: { id: `${r.id}-ctrl-1` },
      update: {},
      create: {
        id: `${r.id}-ctrl-1`,
        riskId: r.id,
        description: `Primary mitigating control for ${r.name}: regular review and monitoring in line with the firm's control framework.`,
        controlOwner: r.ownerId,
        sortOrder: 0,
      },
    });
    await prisma.riskControl.upsert({
      where: { id: `${r.id}-ctrl-2` },
      update: {},
      create: {
        id: `${r.id}-ctrl-2`,
        riskId: r.id,
        description: `Secondary control: escalation procedure and breach reporting to CCRO when risk indicators move outside appetite.`,
        controlOwner: "user-rob",
        sortOrder: 1,
      },
    });
  }
  console.log(`  ✓ ${RISKS.length} risks + ${RISKS.length * 12} snapshots`);

  // ── 5. Additional Controls ─────────────────────────────────────────────────
  console.log("5. Additional Controls (UW / CS / COL / FIN / IT / HR / WEB / COMP)...");

  type CtlFreq = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BI_ANNUAL" | "ANNUAL" | "EVENT_DRIVEN";
  type TestFreq = "MONTHLY" | "QUARTERLY" | "BI_ANNUAL" | "ANNUAL";
  type CDOutcomeType = "PRODUCTS_AND_SERVICES" | "CONSUMER_UNDERSTANDING" | "CONSUMER_SUPPORT" | "GOVERNANCE_CULTURE_OVERSIGHT";
  type CtlType = "PREVENTATIVE" | "DETECTIVE" | "CORRECTIVE" | "DIRECTIVE";

  interface CtlSeed {
    id: string; ref: string; name: string; description: string;
    baId: string; ownerId: string; cdOutcome: CDOutcomeType;
    frequency: CtlFreq; testFreq: TestFreq; controlType: CtlType;
    summaryOfTest: string;
    // 12-month test results (oldest first, March 2025):
    testResults: Array<"PASS" | "FAIL" | "PARTIALLY" | "NOT_TESTED">;
  }

  const CONTROLS: CtlSeed[] = [
    // Underwriting
    {
      id: "ctrl-uw-001", ref: "UW-C001", name: "Creditworthiness Assessment Sign-Off",
      description: "All credit decisions above £10,000 require secondary sign-off by a Senior Underwriter. Decision rationale is documented and filed for audit purposes.",
      baId: "ba-underwriting", ownerId: "user-micha", cdOutcome: "PRODUCTS_AND_SERVICES",
      frequency: "EVENT_DRIVEN", testFreq: "MONTHLY", controlType: "PREVENTATIVE",
      summaryOfTest: "Sample review of 30 applications per month: confirm dual sign-off was obtained, rationale documented, and decision consistent with credit policy.",
      testResults: ["PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS"],
    },
    {
      id: "ctrl-uw-002", ref: "UW-C002", name: "Credit Policy Exception Approval",
      description: "Lending decisions that deviate from the automated credit policy require documented exception approval by Head of Credit, with reasons and conditions recorded.",
      baId: "ba-underwriting", ownerId: "user-micha", cdOutcome: "PRODUCTS_AND_SERVICES",
      frequency: "EVENT_DRIVEN", testFreq: "QUARTERLY", controlType: "PREVENTATIVE",
      summaryOfTest: "Quarterly review of all policy exceptions: confirm approval was obtained, conditions documented, and exception rates are within management tolerance.",
      testResults: ["PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PARTIALLY","PASS","PASS"],
    },
    {
      id: "ctrl-uw-003", ref: "UW-C003", name: "Affordability Model Monthly Performance Review",
      description: "Monthly review of the affordability model's predictive performance against actual default data. Triggers model recalibration if Gini coefficient falls below 0.55.",
      baId: "ba-underwriting", ownerId: "user-micha", cdOutcome: "PRODUCTS_AND_SERVICES",
      frequency: "MONTHLY", testFreq: "QUARTERLY", controlType: "DETECTIVE",
      summaryOfTest: "Quarterly test confirms the monthly review was completed, model performance metrics were within thresholds, and any recalibration was approved.",
      testResults: ["PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS"],
    },
    // Customer Service
    {
      id: "ctrl-cs-001", ref: "CS-C001", name: "Complaint Acknowledgement Within 1 Business Day",
      description: "All formal complaints must be acknowledged within 1 business day of receipt, with a reference number, case handler name, and expected resolution timeframe provided to the customer.",
      baId: "ba-customer-svc", ownerId: "user-ash", cdOutcome: "CONSUMER_SUPPORT",
      frequency: "DAILY", testFreq: "MONTHLY", controlType: "DIRECTIVE",
      summaryOfTest: "Monthly sample review of 20 complaints: confirm acknowledgement was sent within 1 business day and contained required information.",
      testResults: ["PASS","PASS","PASS","PASS","PASS","PASS","PARTIALLY","PASS","FAIL","PASS","PASS","PASS"],
    },
    {
      id: "ctrl-cs-002", ref: "CS-C002", name: "Vulnerable Customer Identification Flag",
      description: "Customer service agents are required to flag customers who disclose or display indicators of vulnerability during service interactions, triggering a review of their account handling approach.",
      baId: "ba-customer-svc", ownerId: "user-ash", cdOutcome: "CONSUMER_SUPPORT",
      frequency: "EVENT_DRIVEN", testFreq: "QUARTERLY", controlType: "DETECTIVE",
      summaryOfTest: "Quarterly call listening exercise: review 15 interactions involving customers in potential vulnerability situations, confirm flags were raised appropriately.",
      testResults: ["FAIL","FAIL","PARTIALLY","PARTIALLY","PARTIALLY","PASS","PASS","PASS","PASS","PASS","PARTIALLY","PASS"],
    },
    {
      id: "ctrl-cs-003", ref: "CS-C003", name: "FCA DISP Breach Reporting",
      description: "Compliance team reviews monthly complaint data against FCA DISP thresholds. Any breach of reportable thresholds triggers an immediate escalation to SMF16 and a regulatory notification assessment.",
      baId: "ba-customer-svc", ownerId: "user-cath", cdOutcome: "CONSUMER_SUPPORT",
      frequency: "MONTHLY", testFreq: "QUARTERLY", controlType: "DETECTIVE",
      summaryOfTest: "Quarterly test reviews the monthly DISP monitoring outputs: confirm review was completed, thresholds checked, and escalations occurred for any near-misses.",
      testResults: ["PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS"],
    },
    // Collections
    {
      id: "ctrl-col-001", ref: "COL-C001", name: "Forbearance Eligibility Assessment",
      description: "All customers entering early arrears (30+ DPD) are reviewed for forbearance eligibility. A structured assessment is completed and the outcome documented in the customer account record.",
      baId: "ba-collections", ownerId: "user-chris", cdOutcome: "CONSUMER_SUPPORT",
      frequency: "EVENT_DRIVEN", testFreq: "MONTHLY", controlType: "PREVENTATIVE",
      summaryOfTest: "Monthly review of 25 early-arrears cases: confirm forbearance eligibility assessment was completed, documented, and customer was offered appropriate support.",
      testResults: ["PASS","PASS","PARTIALLY","PASS","PASS","PASS","PASS","PASS","PARTIALLY","PASS","PASS","PASS"],
    },
    {
      id: "ctrl-col-002", ref: "COL-C002", name: "Collections Contact Compliance Monitoring",
      description: "All collections outbound contact is subject to FCA CONC 7 contact rules (frequency, time-of-day, recorded consent). A weekly sample review confirms compliance.",
      baId: "ba-collections", ownerId: "user-chris", cdOutcome: "CONSUMER_SUPPORT",
      frequency: "WEEKLY", testFreq: "MONTHLY", controlType: "DETECTIVE",
      summaryOfTest: "Monthly review of 20 collections contacts: confirm CONC 7 contact rules were observed, consent recorded, and no prohibited practices used.",
      testResults: ["PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS"],
    },
    // Finance
    {
      id: "ctrl-fin-001", ref: "FIN-C001", name: "Month-End Financial Close Reconciliation",
      description: "A four-eyes reconciliation of all material balance sheet accounts is completed by end of business day 5 of the following month. Unresolved breaks are escalated to CFO.",
      baId: "ba-finance", ownerId: "user-david", cdOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      frequency: "MONTHLY", testFreq: "QUARTERLY", controlType: "DETECTIVE",
      summaryOfTest: "Quarterly test reviews the month-end reconciliation sign-off records for the quarter: confirm four-eyes sign-off was obtained, breaks resolved or escalated.",
      testResults: ["PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS"],
    },
    {
      id: "ctrl-fin-002", ref: "FIN-C002", name: "Regulatory Capital Adequacy Monitoring",
      description: "Monthly monitoring of the firm's regulatory capital position against internal buffers and minimum regulatory capital requirements. Breach of internal buffer triggers escalation to CEO and Board.",
      baId: "ba-finance", ownerId: "user-david", cdOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      frequency: "MONTHLY", testFreq: "QUARTERLY", controlType: "DETECTIVE",
      summaryOfTest: "Quarterly test confirms monthly capital monitoring reports were produced, reviewed by CFO, and no material capital position issues were identified without escalation.",
      testResults: ["PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS"],
    },
    // IT
    {
      id: "ctrl-it-001", ref: "IT-C001", name: "User Access Provisioning and Deprovisioning",
      description: "Access to production systems is granted via a formal request and approval process. Leavers have all access revoked on their last working day. Access reviews are conducted quarterly.",
      baId: "ba-it", ownerId: "user-graham", cdOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      frequency: "EVENT_DRIVEN", testFreq: "QUARTERLY", controlType: "PREVENTATIVE",
      summaryOfTest: "Quarterly test: review all joiners and leavers in the quarter to confirm timely access provisioning and revocation. Check for any orphaned accounts.",
      testResults: ["PASS","PASS","PASS","PARTIALLY","PASS","PASS","PASS","PASS","PASS","PASS","PASS","PASS"],
    },
    // Compliance (general)
    {
      id: "ctrl-comp-001", ref: "COMP-C001", name: "Annual Conduct Rules Training Completion",
      description: "All in-scope staff complete FCA Conduct Rules training annually. Completion is tracked by HR. Non-completions are escalated to the relevant manager and SMF16 at month-end.",
      baId: "ba-compliance", ownerId: "user-cath", cdOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      frequency: "ANNUAL", testFreq: "ANNUAL", controlType: "DIRECTIVE",
      summaryOfTest: "Annual test: confirm 100% completion of Conduct Rules training by deadline, review evidence of escalations for any non-completions, and confirm sign-off by SMF16.",
      testResults: ["NOT_TESTED","NOT_TESTED","NOT_TESTED","NOT_TESTED","NOT_TESTED","NOT_TESTED","NOT_TESTED","NOT_TESTED","NOT_TESTED","NOT_TESTED","PASS","NOT_TESTED"],
    },
  ];

  for (const c of CONTROLS) {
    // Create control
    await prisma.control.upsert({
      where: { controlRef: c.ref },
      update: {
        controlName: c.name,
        controlDescription: c.description,
        controlOwnerId: c.ownerId,
        consumerDutyOutcome: c.cdOutcome,
        controlFrequency: c.frequency,
        controlType: c.controlType,
      },
      create: {
        id: c.id,
        controlRef: c.ref,
        controlName: c.name,
        controlDescription: c.description,
        businessAreaId: c.baId,
        controlOwnerId: c.ownerId,
        consumerDutyOutcome: c.cdOutcome,
        controlFrequency: c.frequency,
        controlType: c.controlType,
        createdById: "user-rob",
      },
    });

    // Get the actual ID (in case control was created with a different ID on first run)
    const ctrl = await prisma.control.findUnique({ where: { controlRef: c.ref } });
    if (!ctrl) continue;

    // Create testing schedule
    const schedId = `sched-${c.id}`;
    await prisma.testingScheduleEntry.upsert({
      where: { controlId: ctrl.id },
      update: { testingFrequency: c.testFreq, summaryOfTest: c.summaryOfTest },
      create: {
        id: schedId,
        controlId: ctrl.id,
        testingFrequency: c.testFreq,
        assignedTesterId: "user-rob",
        summaryOfTest: c.summaryOfTest,
        addedById: "user-rob",
      },
    });

    const sched = await prisma.testingScheduleEntry.findUnique({ where: { controlId: ctrl.id } });
    if (!sched) continue;

    // Seed 12 test results (monthly, March 2025 – Feb 2026)
    for (let i = 0; i < 12; i++) {
      const m = MONTHS_12[i];
      const yr = m.getUTCFullYear();
      const mo = m.getUTCMonth() + 1;
      const resultId = `tr-${ctrl.id}-${yr}-${mo}`;
      const result = c.testResults[i];
      await prisma.controlTestResult.upsert({
        where: { scheduleEntryId_periodYear_periodMonth: { scheduleEntryId: sched.id, periodYear: yr, periodMonth: mo } },
        update: { result, notes: result === "FAIL" ? "Control test failed — see quarterly summary for details." : result === "PARTIALLY" ? "Partially effective — some gaps identified." : null },
        create: {
          id: resultId,
          scheduleEntryId: sched.id,
          periodYear: yr,
          periodMonth: mo,
          result,
          testedById: "user-rob",
          testedDate: new Date(Date.UTC(yr, mo - 1, 15)),
          notes: result === "FAIL" ? "Control test failed — see quarterly summary for details." : result === "PARTIALLY" ? "Partially effective — some gaps identified." : null,
          isBackdated: i < 10,
        },
      });
    }

    // Seed 4 quarterly summaries (Q1-Q4 2025)
    const quarters = [
      { q: "Q1 2025", narrative: `${c.name} — Q1 2025: Control operating as expected. No material issues identified during the quarter. All required reviews completed to schedule.`, status: "APPROVED" as const },
      { q: "Q2 2025", narrative: `${c.name} — Q2 2025: Minor gaps identified in one testing cycle. Control owner reviewed and confirmed corrective steps taken. Overall effectiveness maintained.`, status: "APPROVED" as const },
      { q: "Q3 2025", narrative: `${c.name} — Q3 2025: Control effectiveness assessed as ${c.testResults.slice(6,9).some(r => r === "FAIL") ? "PARTIALLY_EFFECTIVE — one failing test result was identified and remediated within the quarter" : "EFFECTIVE — all testing cycles passed"}. No escalations required.`, status: "APPROVED" as const },
      { q: "Q4 2025", narrative: `${c.name} — Q4 2025: End-of-year review completed. Control design remains appropriate and operating effectively. Recommended for inclusion in next year's testing plan unchanged.`, status: "SUBMITTED" as const },
    ];

    for (const qs of quarters) {
      await prisma.quarterlySummary.upsert({
        where: { id: `qs-${ctrl.id}-${qs.q.replace(" ", "-")}` },
        update: { narrative: qs.narrative, status: qs.status },
        create: {
          id: `qs-${ctrl.id}-${qs.q.replace(" ", "-")}`,
          scheduleEntryId: sched.id,
          quarter: qs.q,
          narrative: qs.narrative,
          authorId: "user-rob",
          status: qs.status,
        },
      });
    }

    // Seed 3 attestations (Oct, Nov, Dec 2025)
    const attestPeriods = [
      { yr: 2025, mo: 10, attested: true, attestedById: c.ownerId, issues: false, comment: "Control operating effectively — no issues to report." },
      { yr: 2025, mo: 11, attested: true, attestedById: c.ownerId, issues: false, comment: "Reviewed and confirmed. All evidence on file." },
      { yr: 2025, mo: 12, attested: true, attestedById: c.ownerId, issues: c.testResults[9] === "FAIL" || c.testResults[9] === "PARTIALLY", comment: c.testResults[9] === "FAIL" ? "Issues identified in this period — remediation plan in place." : "Control operating within expected parameters." },
    ];
    for (const ap of attestPeriods) {
      await prisma.controlAttestation.upsert({
        where: { controlId_periodYear_periodMonth: { controlId: ctrl.id, periodYear: ap.yr, periodMonth: ap.mo } },
        update: {},
        create: {
          controlId: ctrl.id,
          periodYear: ap.yr,
          periodMonth: ap.mo,
          attested: ap.attested,
          attestedById: ap.attestedById,
          comments: ap.comment,
          issuesFlagged: ap.issues,
        },
      });
    }
  }
  console.log(`  ✓ ${CONTROLS.length} controls + testing schedules + 12-month results + quarterly summaries + attestations`);

  // ── 6. Actions ────────────────────────────────────────────────────────────
  console.log("6. Actions...");

  type ActionStatus = "OPEN" | "IN_PROGRESS" | "OVERDUE" | "COMPLETED";
  type ActionPriority = "P1" | "P2" | "P3";

  interface ActionSeed {
    id: string; reference: string; title: string; description: string;
    status: ActionStatus; priority: ActionPriority;
    assignedTo: string; createdBy: string;
    dueDate: Date | null; completedAt: Date | null;
    source: string;
    riskId?: string; controlRef?: string; miId?: string;
  }

  const ACTIONS: ActionSeed[] = [
    // P1 OPEN
    { id: "act-001", reference: "ACT-001", title: "Implement structured vulnerability screening at 30-day arrears", description: "Design and implement a systematic vulnerability screening process to be triggered at 30 days past due, replacing current agent-discretion-only approach. Outcome: all customers entering early arrears are assessed for vulnerability indicators before collections contact.", status: "IN_PROGRESS", priority: "P1", assignedTo: "user-chris", createdBy: "user-rob", dueDate: new Date("2026-04-30"), completedAt: null, source: "Consumer Duty", miId: "cd-mi-3-3-a", riskId: "risk-011" },
    { id: "act-002", reference: "ACT-002", title: "Fee structure simplification — all products", description: "Simplify the fee structure for all personal loan products to improve customer understanding of the total cost of credit. Outcome: one clear arrangement fee or no arrangement fee per product tier, communicated in plain English at point of application.", status: "IN_PROGRESS", priority: "P1", assignedTo: "user-ash", createdBy: "user-cath", dueDate: new Date("2026-06-30"), completedAt: null, source: "Consumer Duty", miId: "cd-mi-4-3-a", riskId: "risk-008" },
    { id: "act-003", reference: "ACT-003", title: "Transaction monitoring platform upgrade", description: "Replace static rules-based transaction monitoring with a dynamic, risk-based ML model. Deliverable: new TM platform live in production with FCA notification as required under SYSC 26.", status: "IN_PROGRESS", priority: "P1", assignedTo: "user-graham", createdBy: "user-cath", dueDate: new Date("2026-06-30"), completedAt: null, source: "Compliance Universe", controlRef: "COMP-C001", riskId: "risk-004" },
    { id: "act-004", reference: "ACT-004", title: "Complete digital journey Plain English rewrite", description: "Rewrite all in-journey digital content (application screens, FAQs, T&Cs summaries) to achieve a minimum Flesch-Kincaid score of 60. Content must be reviewed by Compliance before publication.", status: "OPEN", priority: "P1", assignedTo: "user-ash", createdBy: "user-rob", dueDate: new Date("2026-03-31"), completedAt: null, source: "Consumer Duty", miId: "cd-mi-2-2-a", riskId: "risk-009" },
    { id: "act-005", reference: "ACT-005", title: "ROPA update — reflect all product changes since Dec 2024", description: "Update the Records of Processing Activities (ROPA) to include all new and changed personal data processing activities since the last update in December 2024. Align with current DPIAs. Complete by March 2026 to meet ICO expectations.", status: "OPEN", priority: "P1", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2026-03-31"), completedAt: null, source: "Compliance Universe", riskId: "risk-007" },
    { id: "act-006", reference: "ACT-006", title: "Third-party vendor operational resilience assessments", description: "Complete operational resilience assessments for the three critical third-party technology vendors identified in the January 2026 board submission. Deliver written assessment reports to CCRO and Board.", status: "OVERDUE", priority: "P1", assignedTo: "user-graham", createdBy: "user-rob", dueDate: new Date("2026-02-28"), completedAt: null, source: "Operational Resilience", riskId: "risk-006" },
    { id: "act-007", reference: "ACT-007", title: "FinProm digital affiliate remediation — 3 partners", description: "Implement enhanced approval framework for the 3 affiliate partners identified in the December 2025 digital promotions audit as requiring remediation. All three must be fully compliant before further marketing activity.", status: "OVERDUE", priority: "P1", assignedTo: "user-ash", createdBy: "user-cath", dueDate: new Date("2026-02-28"), completedAt: null, source: "Control Testing", controlRef: "FP-C006", riskId: "risk-009" },
    // P2 IN_PROGRESS
    { id: "act-008", reference: "ACT-008", title: "Credit model validation — stress analysis integration", description: "Integrate longitudinal stress analysis of customer repayment capacity under adverse income scenarios into the credit model validation framework. Deliverable: updated model validation policy and first validation run.", status: "IN_PROGRESS", priority: "P2", assignedTo: "user-micha", createdBy: "user-rob", dueDate: new Date("2026-06-30"), completedAt: null, source: "Risk Register", riskId: "risk-002" },
    { id: "act-009", reference: "ACT-009", title: "Consumer Duty annual board report preparation", description: "Prepare the Consumer Duty annual board report covering all four outcomes for the 2025/26 period. Report must include outcome monitoring data, gap analysis, remediation progress, and board attestation statement. Due for Board sign-off by 31 July 2026.", status: "IN_PROGRESS", priority: "P2", assignedTo: "user-rob", createdBy: "user-rob", dueDate: new Date("2026-07-31"), completedAt: null, source: "Consumer Duty", riskId: "risk-008" },
    { id: "act-010", reference: "ACT-010", title: "Complaint root-cause analysis — total cost transparency", description: "Conduct structured root-cause analysis of the complaint category 'total cost transparency' which drove the elevated FOS uphold rate in H1 2025. Produce a root-cause report and remediation action plan.", status: "COMPLETED", priority: "P2", assignedTo: "user-ash", createdBy: "user-rob", dueDate: new Date("2025-11-30"), completedAt: new Date("2025-11-25"), source: "Consumer Duty", miId: "cd-mi-3-2-a", riskId: "risk-010" },
    { id: "act-011", reference: "ACT-011", title: "Data protection improvement programme — Phase 1 DPIA rollout", description: "Implement the consistent DPIA process across all new products and processing activities, as the first phase of the 12-month data protection improvement programme approved by ExCo in November 2025.", status: "IN_PROGRESS", priority: "P2", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2026-04-30"), completedAt: null, source: "Compliance Universe", riskId: "risk-007" },
    { id: "act-012", reference: "ACT-012", title: "DR testing — third-party cloud provider failover", description: "Complete disaster recovery failover testing for the primary cloud provider, confirming that the RTO of 4 hours is achievable. Document test results for the operational resilience self-assessment.", status: "IN_PROGRESS", priority: "P2", assignedTo: "user-graham", createdBy: "user-rob", dueDate: new Date("2026-03-31"), completedAt: null, source: "Risk Register", riskId: "risk-006" },
    { id: "act-013", reference: "ACT-013", title: "Regulatory change — DORA-UK gap analysis", description: "Commission a gap analysis against the UK DORA (Digital Operational Resilience Act) implementation requirements. Produce a prioritised action plan for Board review.", status: "IN_PROGRESS", priority: "P2", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2026-05-31"), completedAt: null, source: "Horizon Scanning", riskId: "risk-012" },
    { id: "act-014", reference: "ACT-014", title: "Collections vulnerability training — all agents", description: "Deliver structured vulnerability awareness training to all collections agents following the Q1 2026 review recommendation. Minimum 90% completion required before July 2026.", status: "OPEN", priority: "P2", assignedTo: "user-chris", createdBy: "user-rob", dueDate: new Date("2026-07-31"), completedAt: null, source: "Control Testing", controlRef: "CS-C002", riskId: "risk-011" },
    { id: "act-015", reference: "ACT-015", title: "Produce board-level Capital Adequacy Report", description: "Produce a quarterly capital adequacy summary for the Board covering the firm's ICARA output, current capital ratios, and stress test results. First report due for the March 2026 Board meeting.", status: "OPEN", priority: "P2", assignedTo: "user-david", createdBy: "user-rob", dueDate: new Date("2026-03-15"), completedAt: null, source: "Risk Register", riskId: "risk-014" },
    // P2 OVERDUE
    { id: "act-016", reference: "ACT-016", title: "Update credit policy — income verification standards", description: "Update the credit policy to reflect enhanced income verification standards agreed by the Credit Risk Working Group in December 2025. Policy must be approved by CEO before go-live.", status: "OVERDUE", priority: "P2", assignedTo: "user-micha", createdBy: "user-cath", dueDate: new Date("2026-01-31"), completedAt: null, source: "Risk Register", riskId: "risk-002" },
    { id: "act-017", reference: "ACT-017", title: "Conduct Rules breach register — review all UNDER_INVESTIGATION entries", description: "Review all conduct rules breach entries with UNDER_INVESTIGATION status. Confirm each has an active investigation lead assigned and a target resolution date. Escalate any that are stalled.", status: "OVERDUE", priority: "P2", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2026-01-31"), completedAt: null, source: "SM&CR", riskId: "risk-013" },
    { id: "act-018", reference: "ACT-018", title: "SMF3 (COO) role — candidate shortlist to CEO", description: "Prepare a shortlist of candidates for the vacant SMF3 (Chief Operations Function) role for CEO review. Include assessment against fitness and propriety criteria.", status: "OVERDUE", priority: "P2", assignedTo: "user-ceo", createdBy: "user-rob", dueDate: new Date("2026-02-28"), completedAt: null, source: "SM&CR", riskId: "risk-013" },
    // P3 mix
    { id: "act-019", reference: "ACT-019", title: "Refresh complaints MI dashboard with Consumer Duty measures", description: "Update the internal complaints MI dashboard to include Consumer Duty-aligned metrics (root cause categorisation, vulnerable customer breakdown, FOS referral rate). For CCRO monthly pack.", status: "IN_PROGRESS", priority: "P3", assignedTo: "user-ash", createdBy: "user-rob", dueDate: new Date("2026-04-30"), completedAt: null, source: "Consumer Duty", riskId: "risk-010" },
    { id: "act-020", reference: "ACT-020", title: "Horizon scanning — AI regulation response plan", description: "Develop a response plan for the FCA's proposed AI regulation guidance (CP25/5). Include an inventory of all AI/ML models in use and a gap analysis against the proposed requirements.", status: "OPEN", priority: "P3", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2026-05-31"), completedAt: null, source: "Horizon Scanning", riskId: "risk-012" },
    { id: "act-021", reference: "ACT-021", title: "SMCR responsibilities map — annual refresh", description: "Update the SMCR Responsibilities Map for 2026 to reflect any changes to SMF holders, scope of roles, and prescribed responsibilities. Obtain CEO sign-off and file with FCA.", status: "OPEN", priority: "P3", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2026-04-30"), completedAt: null, source: "SM&CR" },
    { id: "act-022", reference: "ACT-022", title: "Process library — complete maturity assessments for PROC-001 to PROC-004", description: "Complete process maturity assessments for the four processes currently rated at maturity level 1 (Staff Onboarding, Office Access Management, Vendor Onboarding, Incident Response). Provide improvement recommendations.", status: "OPEN", priority: "P3", assignedTo: "user-rob", createdBy: "user-rob", dueDate: new Date("2026-06-30"), completedAt: null, source: "Process Library" },
    { id: "act-023", reference: "ACT-023", title: "Conduct Rules training — 2026 annual refresh", description: "Commission and deploy the 2026 annual Conduct Rules training module for all in-scope staff. Target: 100% completion by 30 November 2026 per COMP-C001.", status: "OPEN", priority: "P3", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2026-11-30"), completedAt: null, source: "Control Testing", controlRef: "COMP-C001" },
    { id: "act-024", reference: "ACT-024", title: "Quarterly Board MI Pack — Consumer Duty section redesign", description: "Redesign the Consumer Duty section of the quarterly Board MI pack to include the four outcome RAG heatmap, key metric trends, and a forward-looking remediation status table.", status: "IN_PROGRESS", priority: "P3", assignedTo: "user-rob", createdBy: "user-rob", dueDate: new Date("2026-03-31"), completedAt: null, source: "Consumer Duty", riskId: "risk-008" },
    { id: "act-025", reference: "ACT-025", title: "Horizon item HZ-004 — Open Banking response assessment", description: "Assess the impact of HZ-004 (FCA Open Banking expansion consultation) on Updraft's product roadmap and data-sharing obligations. Produce a one-pager for the Product Committee.", status: "OPEN", priority: "P3", assignedTo: "user-rob", createdBy: "user-rob", dueDate: new Date("2026-04-30"), completedAt: null, source: "Horizon Scanning" },
    // Completed actions (10)
    { id: "act-026", reference: "ACT-026", title: "Plain English rewrite — pre-contractual documents", description: "Rewrite all FCA-required pre-contractual information documents (SECCI, credit agreement summaries) in plain English. Achieved Flesch-Kincaid score ≥ 65. Reviewed and approved by Compliance.", status: "COMPLETED", priority: "P2", assignedTo: "user-ash", createdBy: "user-rob", dueDate: new Date("2025-12-31"), completedAt: new Date("2025-12-20"), source: "Consumer Duty", miId: "cd-mi-2-1-a" },
    { id: "act-027", reference: "ACT-027", title: "Consumer Duty staff training — all business areas", description: "Deliver Consumer Duty awareness and obligations training to all staff in scope. Achieved 100% completion by the FCA deadline of 31 July 2023 (initial), refreshed annually.", status: "COMPLETED", priority: "P1", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2025-11-30"), completedAt: new Date("2025-11-28"), source: "Consumer Duty", riskId: "risk-008" },
    { id: "act-028", reference: "ACT-028", title: "Target Market Definition — all products updated", description: "Review and update Target Market Definitions (TMDs) for all four active loan products to reflect current customer data, outcomes analysis, and Consumer Duty requirements. Board-approved.", status: "COMPLETED", priority: "P1", assignedTo: "user-ash", createdBy: "user-rob", dueDate: new Date("2026-01-31"), completedAt: new Date("2026-01-28"), source: "Consumer Duty", miId: "cd-mi-1-1-a" },
    { id: "act-029", reference: "ACT-029", title: "AML Business-Wide Risk Assessment — 2025 annual update", description: "Complete the annual update of the AML/CTF Business-Wide Risk Assessment. Reviewed by MLRO and approved by Board. Filed with FCA as required.", status: "COMPLETED", priority: "P2", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2025-12-31"), completedAt: new Date("2025-12-10"), source: "Compliance Universe", riskId: "risk-004" },
    { id: "act-030", reference: "ACT-030", title: "Credit impairment provisioning increase — Q3 2025", description: "Increase credit impairment provisions by 15% for the Q3 2025 accounts to reflect elevated macro-economic risk. CFO sign-off obtained. Reflected in management accounts.", status: "COMPLETED", priority: "P1", assignedTo: "user-david", createdBy: "user-rob", dueDate: new Date("2025-09-30"), completedAt: new Date("2025-09-29"), source: "Risk Register", riskId: "risk-001" },
    { id: "act-031", reference: "ACT-031", title: "Cyber security penetration test — annual", description: "Commission and complete annual penetration test of all production systems by an approved third-party. Address all Critical and High findings within 30 days of report issue.", status: "COMPLETED", priority: "P1", assignedTo: "user-graham", createdBy: "user-rob", dueDate: new Date("2025-12-31"), completedAt: new Date("2025-12-15"), source: "Risk Register", riskId: "risk-005" },
    { id: "act-032", reference: "ACT-032", title: "DISP complaints threshold monitoring — automated alerts", description: "Implement automated email alerts when monthly complaint volume exceeds 80% of the FCA reportable threshold, giving compliance 5 working days to assess before month-end close.", status: "COMPLETED", priority: "P2", assignedTo: "user-ash", createdBy: "user-cath", dueDate: new Date("2025-10-31"), completedAt: new Date("2025-10-25"), source: "Control Testing", controlRef: "CS-C003" },
    { id: "act-033", reference: "ACT-033", title: "Fair Value Assessment — first annual completion", description: "Complete the first annual fair value assessment for all Updraft loan products. Assessment to cover total cost of credit, margin analysis, and comparison to sector peers. Submit to Product Committee.", status: "COMPLETED", priority: "P1", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2025-11-30"), completedAt: new Date("2025-11-22"), source: "Consumer Duty", miId: "cd-mi-4-1-a", riskId: "risk-008" },
    { id: "act-034", reference: "ACT-034", title: "Operational resilience — IBS impact tolerance testing (primary DC)", description: "Complete DR testing for the primary data centre scenario for all four Important Business Services. Confirm all four IBS meet their impact tolerances. Document in the self-assessment.", status: "COMPLETED", priority: "P2", assignedTo: "user-graham", createdBy: "user-rob", dueDate: new Date("2025-12-31"), completedAt: new Date("2025-12-30"), source: "Operational Resilience", riskId: "risk-006" },
    { id: "act-035", reference: "ACT-035", title: "Vulnerability policy — embed in collections and onboarding", description: "Update the customer vulnerability policy to include specific triggers and escalation procedures for collections and onboarding journeys. Train all relevant staff. Implement before Q4 2025.", status: "COMPLETED", priority: "P2", assignedTo: "user-ash", createdBy: "user-rob", dueDate: new Date("2025-09-30"), completedAt: new Date("2025-09-28"), source: "Risk Register", riskId: "risk-011" },
    // Additional actions to reach 45
    { id: "act-036", reference: "ACT-036", title: "FinProm register — quarterly completeness audit", description: "Conduct quarterly audit of the Financial Promotions Register to confirm all live promotions are captured, approval records are complete, and withdrawal procedures are documented.", status: "COMPLETED", priority: "P3", assignedTo: "user-ash", createdBy: "user-cath", dueDate: new Date("2025-12-31"), completedAt: new Date("2025-12-29"), source: "Control Testing", controlRef: "FP-C008" },
    { id: "act-037", reference: "ACT-037", title: "Update data retention schedules and implement deletion process", description: "Review and update data retention schedules for all personal data categories. Implement automated suppression/deletion processes to replace current manual approach. Phase 2 of the data protection improvement programme.", status: "OPEN", priority: "P2", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2026-09-30"), completedAt: null, source: "Compliance Universe", riskId: "risk-007" },
    { id: "act-038", reference: "ACT-038", title: "ICARA 2026 — stress testing scenarios design", description: "Design the stress testing scenarios for the 2026 ICARA submission. Scenarios must cover credit impairment, operational disruption, liquidity stress, and a combined severe scenario. Review with Board Risk Committee.", status: "OPEN", priority: "P2", assignedTo: "user-david", createdBy: "user-rob", dueDate: new Date("2026-06-30"), completedAt: null, source: "Risk Register", riskId: "risk-014" },
    { id: "act-039", reference: "ACT-039", title: "Comparison site listings — accuracy audit Q1 2026", description: "Conduct the Q1 2026 accuracy audit of all comparison site product listings (MoneySuperMarket, CompareTheMarket, Uswitch, etc.) to confirm representative APR and product terms are correct.", status: "OPEN", priority: "P3", assignedTo: "user-ash", createdBy: "user-cath", dueDate: new Date("2026-03-31"), completedAt: null, source: "Control Testing", controlRef: "FP-C016" },
    { id: "act-040", reference: "ACT-040", title: "Social media promotions quarterly review — Q1 2026", description: "Conduct the Q1 2026 review of all active social media financial promotions to confirm FCA compliance and Consumer Duty alignment. Any non-compliant posts to be withdrawn within 24 hours.", status: "OPEN", priority: "P3", assignedTo: "user-ash", createdBy: "user-cath", dueDate: new Date("2026-03-31"), completedAt: null, source: "Control Testing", controlRef: "FP-C017" },
    { id: "act-041", reference: "ACT-041", title: "Regulatory capital buffer review — H1 2026 planning", description: "Review the adequacy of the firm's internal capital buffers for H1 2026, taking into account updated stress test results and regulatory expectations post-ICARA 2025. Present findings to CFO and CEO.", status: "IN_PROGRESS", priority: "P2", assignedTo: "user-david", createdBy: "user-rob", dueDate: new Date("2026-03-31"), completedAt: null, source: "Risk Register", riskId: "risk-014" },
    { id: "act-042", reference: "ACT-042", title: "SMF16 — annual regulatory returns review (GABRIEL)", description: "Conduct the annual review of GABRIEL/RegData submission quality for the 2025/26 reporting year. Confirm all submissions were made on time, data was accurate, and any queries from the FCA were resolved.", status: "IN_PROGRESS", priority: "P2", assignedTo: "user-cath", createdBy: "user-rob", dueDate: new Date("2026-04-30"), completedAt: null, source: "Compliance Universe", riskId: "risk-013" },
    { id: "act-043", reference: "ACT-043", title: "Horizon item — AI Act UK implementation response", description: "Following the FCA CP25/5 consultation, assess the applicability of the incoming AI Act requirements to Updraft's credit scoring and fraud detection models. Produce a compliance gap assessment.", status: "OPEN", priority: "P3", assignedTo: "user-graham", createdBy: "user-cath", dueDate: new Date("2026-06-30"), completedAt: null, source: "Horizon Scanning", riskId: "risk-012" },
    { id: "act-044", reference: "ACT-044", title: "Interest rate hedging strategy — board paper", description: "Prepare a board paper on the firm's interest rate risk exposure and hedging strategy for 2026/27, given the evolving base rate environment. Engage treasury adviser as needed.", status: "OPEN", priority: "P2", assignedTo: "user-david", createdBy: "user-rob", dueDate: new Date("2026-05-31"), completedAt: null, source: "Risk Register", riskId: "risk-015" },
    { id: "act-045", reference: "ACT-045", title: "Post-incident review — September 2025 CMS outage", description: "Complete the post-incident review for the September 2025 complaints management system outage that caused a 2.6% complaints SLA breach. Document root cause, corrective actions, and lessons learned.", status: "COMPLETED", priority: "P2", assignedTo: "user-ash", createdBy: "user-rob", dueDate: new Date("2025-10-31"), completedAt: new Date("2025-10-28"), source: "Consumer Duty", miId: "cd-mi-3-1-a", riskId: "risk-010" },
  ];

  for (const a of ACTIONS) {
    // Resolve controlId from controlRef if provided
    let controlId: string | undefined = undefined;
    if (a.controlRef) {
      const ctrl = await prisma.control.findUnique({ where: { controlRef: a.controlRef } });
      controlId = ctrl?.id;
    }

    await prisma.action.upsert({
      where: { reference: a.reference },
      update: {
        title: a.title, description: a.description, status: a.status, priority: a.priority,
        assignedTo: a.assignedTo, dueDate: a.dueDate, completedAt: a.completedAt,
        source: a.source, controlId: controlId ?? null, consumerDutyMIId: a.miId ?? null,
      },
      create: {
        id: a.id,
        reference: a.reference,
        title: a.title,
        description: a.description,
        status: a.status,
        priority: a.priority,
        assignedTo: a.assignedTo,
        createdBy: a.createdBy,
        dueDate: a.dueDate,
        completedAt: a.completedAt,
        source: a.source,
        controlId: controlId ?? null,
        consumerDutyMIId: a.miId ?? null,
      },
    });
  }
  console.log(`  ✓ ${ACTIONS.length} actions`);

  // ── 7. Risk-Control Links ─────────────────────────────────────────────────
  console.log("7. Risk-Control links...");

  // Map risk → control refs to link
  const RISK_CONTROL_LINKS: Array<{ riskId: string; ctlRef: string }> = [
    { riskId: "risk-001", ctlRef: "UW-C001" },
    { riskId: "risk-001", ctlRef: "UW-C003" },
    { riskId: "risk-001", ctlRef: "FIN-C001" },
    { riskId: "risk-002", ctlRef: "UW-C001" },
    { riskId: "risk-002", ctlRef: "UW-C002" },
    { riskId: "risk-002", ctlRef: "UW-C003" },
    { riskId: "risk-003", ctlRef: "UW-C003" },
    { riskId: "risk-004", ctlRef: "FP-C003" },
    { riskId: "risk-004", ctlRef: "COMP-C001" },
    { riskId: "risk-005", ctlRef: "IT-C001" },
    { riskId: "risk-006", ctlRef: "IT-C001" },
    { riskId: "risk-007", ctlRef: "IT-C001" },
    { riskId: "risk-008", ctlRef: "CS-C001" },
    { riskId: "risk-008", ctlRef: "FP-C011" },
    { riskId: "risk-009", ctlRef: "FP-C001" },
    { riskId: "risk-009", ctlRef: "FP-C002" },
    { riskId: "risk-009", ctlRef: "FP-C006" },
    { riskId: "risk-010", ctlRef: "CS-C001" },
    { riskId: "risk-010", ctlRef: "CS-C003" },
    { riskId: "risk-011", ctlRef: "CS-C002" },
    { riskId: "risk-011", ctlRef: "COL-C001" },
    { riskId: "risk-012", ctlRef: "COMP-C001" },
    { riskId: "risk-013", ctlRef: "COMP-C001" },
    { riskId: "risk-014", ctlRef: "FIN-C002" },
    { riskId: "risk-015", ctlRef: "FIN-C002" },
  ];

  let rcLinked = 0;
  for (const link of RISK_CONTROL_LINKS) {
    const ctrl = await prisma.control.findUnique({ where: { controlRef: link.ctlRef } });
    if (!ctrl) { console.warn(`  ⚠ Control not found: ${link.ctlRef}`); continue; }
    try {
      await prisma.riskControlLink.create({
        data: {
          riskId: link.riskId,
          controlId: ctrl.id,
          linkedBy: "user-rob",
          notes: `Linked during CEO prep data population (Feb 2026)`,
        },
      });
      rcLinked++;
    } catch (_) {
      // Already exists — skip silently
    }
  }
  console.log(`  ✓ ${rcLinked} risk-control links created (duplicates skipped)`);

  // ── 8. Risk-Action Links ──────────────────────────────────────────────────
  console.log("8. Risk-Action links...");

  // Use reference strings to look up actual DB IDs (handles cases where
  // actions already existed with cuid IDs from a prior session)
  const RISK_ACTION_LINKS: Array<{ riskId: string; actionRef: string }> = [
    { riskId: "risk-001", actionRef: "ACT-030" },
    { riskId: "risk-001", actionRef: "ACT-038" },
    { riskId: "risk-002", actionRef: "ACT-008" },
    { riskId: "risk-002", actionRef: "ACT-016" },
    { riskId: "risk-004", actionRef: "ACT-003" },
    { riskId: "risk-004", actionRef: "ACT-029" },
    { riskId: "risk-005", actionRef: "ACT-031" },
    { riskId: "risk-006", actionRef: "ACT-006" },
    { riskId: "risk-006", actionRef: "ACT-012" },
    { riskId: "risk-006", actionRef: "ACT-034" },
    { riskId: "risk-007", actionRef: "ACT-005" },
    { riskId: "risk-007", actionRef: "ACT-011" },
    { riskId: "risk-007", actionRef: "ACT-037" },
    { riskId: "risk-008", actionRef: "ACT-009" },
    { riskId: "risk-008", actionRef: "ACT-024" },
    { riskId: "risk-008", actionRef: "ACT-027" },
    { riskId: "risk-008", actionRef: "ACT-033" },
    { riskId: "risk-009", actionRef: "ACT-004" },
    { riskId: "risk-009", actionRef: "ACT-007" },
    { riskId: "risk-010", actionRef: "ACT-010" },
    { riskId: "risk-010", actionRef: "ACT-019" },
    { riskId: "risk-010", actionRef: "ACT-045" },
    { riskId: "risk-011", actionRef: "ACT-001" },
    { riskId: "risk-011", actionRef: "ACT-014" },
    { riskId: "risk-011", actionRef: "ACT-035" },
    { riskId: "risk-012", actionRef: "ACT-013" },
    { riskId: "risk-012", actionRef: "ACT-020" },
    { riskId: "risk-013", actionRef: "ACT-017" },
    { riskId: "risk-013", actionRef: "ACT-018" },
    { riskId: "risk-013", actionRef: "ACT-042" },
    { riskId: "risk-014", actionRef: "ACT-015" },
    { riskId: "risk-014", actionRef: "ACT-041" },
    { riskId: "risk-015", actionRef: "ACT-044" },
  ];

  let raLinked = 0;
  for (const link of RISK_ACTION_LINKS) {
    const action = await prisma.action.findUnique({ where: { reference: link.actionRef } });
    if (!action) { console.warn(`  ⚠ Action not found: ${link.actionRef}`); continue; }
    try {
      await prisma.riskActionLink.create({
        data: { riskId: link.riskId, actionId: action.id, linkedBy: "user-rob" },
      });
      raLinked++;
    } catch (_) {
      // Already exists — skip silently
    }
  }
  console.log(`  ✓ ${raLinked} risk-action links created (duplicates skipped)`);

  // ── 9. Risk Mitigations ────────────────────────────────────────────────────
  console.log("9. Risk Mitigations...");

  // 3 mitigations per risk = 45 total
  // Each mitigation: id, riskId, action (description), owner (userId), deadline, status, priority
  // Note: actionId intentionally omitted here — mitigations stand alone (inline records)
  const RISK_MITIGATIONS: Array<{
    id: string; riskId: string; action: string; owner: string;
    deadline: Date; status: "OPEN" | "IN_PROGRESS" | "COMPLETE"; priority: "P1" | "P2" | "P3";
  }> = [
    // risk-001: Credit Impairment Risk
    { id: "mit-001", riskId: "risk-001", action: "Implement monthly arrears vintage analysis to identify deteriorating loan cohorts early and trigger underwriting policy review.", owner: "user-micha", deadline: new Date("2026-03-31"), status: "IN_PROGRESS", priority: "P1" },
    { id: "mit-002", riskId: "risk-001", action: "Increase loan loss provision coverage ratio by 5% for cohorts with 30+ days past due rates above 4%.", owner: "user-david", deadline: new Date("2026-04-30"), status: "OPEN", priority: "P2" },
    { id: "mit-003", riskId: "risk-001", action: "Conduct quarterly stress test of loan book under adverse economic scenarios (GDP -2%, unemployment +3%) and present findings to board.", owner: "user-micha", deadline: new Date("2025-12-31"), status: "COMPLETE", priority: "P2" },

    // risk-002: Affordability Assessment Risk
    { id: "mit-004", riskId: "risk-002", action: "Review and recalibrate affordability model against 12-month post-origination performance data to close prediction gap for self-employed borrowers.", owner: "user-micha", deadline: new Date("2026-03-31"), status: "IN_PROGRESS", priority: "P1" },
    { id: "mit-005", riskId: "risk-002", action: "Introduce mandatory income verification for loan applications above £5,000 threshold, reducing reliance on declared income.", owner: "user-chris", deadline: new Date("2026-05-31"), status: "OPEN", priority: "P2" },
    { id: "mit-006", riskId: "risk-002", action: "Complete FCA CONC 5 gap analysis against current affordability assessment policy and remediate any identified gaps.", owner: "user-cath", deadline: new Date("2025-10-31"), status: "COMPLETE", priority: "P1" },

    // risk-003: Credit Concentration Risk
    { id: "mit-007", riskId: "risk-003", action: "Set formal portfolio concentration limits by borrower segment and monitor via monthly MI dashboard — alert at 80% of limit.", owner: "user-micha", deadline: new Date("2026-04-30"), status: "IN_PROGRESS", priority: "P2" },
    { id: "mit-008", riskId: "risk-003", action: "Review loan product diversification strategy at quarterly Risk Committee to assess whether product range reduces concentration risk.", owner: "user-david", deadline: new Date("2026-06-30"), status: "OPEN", priority: "P3" },
    { id: "mit-009", riskId: "risk-003", action: "Document and approve concentration risk appetite statement at board level, with clear trigger thresholds for escalation.", owner: "user-rob", deadline: new Date("2025-09-30"), status: "COMPLETE", priority: "P2" },

    // risk-004: Fraud & Financial Crime Risk
    { id: "mit-010", riskId: "risk-004", action: "Deploy enhanced device fingerprinting and behavioural biometrics solution to reduce account takeover fraud at application stage.", owner: "user-graham", deadline: new Date("2026-03-31"), status: "IN_PROGRESS", priority: "P1" },
    { id: "mit-011", riskId: "risk-004", action: "Complete Annual Money Laundering Risk Assessment (MLRA) and update AML/CTF policies to reflect current risk profile.", owner: "user-cath", deadline: new Date("2026-02-28"), status: "COMPLETE", priority: "P1" },
    { id: "mit-012", riskId: "risk-004", action: "Run tabletop fraud scenario exercise with Operations and Tech teams to test incident response playbook adequacy.", owner: "user-chris", deadline: new Date("2026-05-31"), status: "OPEN", priority: "P2" },

    // risk-005: Cyber Security Risk
    { id: "mit-013", riskId: "risk-005", action: "Complete ISO 27001 gap analysis and develop remediation roadmap for any identified control gaps.", owner: "user-graham", deadline: new Date("2026-04-30"), status: "IN_PROGRESS", priority: "P1" },
    { id: "mit-014", riskId: "risk-005", action: "Implement mandatory phishing simulation programme — all staff complete quarterly; track click-rate trend as a KRI.", owner: "user-graham", deadline: new Date("2025-11-30"), status: "COMPLETE", priority: "P2" },
    { id: "mit-015", riskId: "risk-005", action: "Engage external penetration testing firm to conduct annual web application and infrastructure pen test; remediate critical findings within 30 days.", owner: "user-graham", deadline: new Date("2026-06-30"), status: "OPEN", priority: "P1" },

    // risk-006: IT Resilience & Availability Risk
    { id: "mit-016", riskId: "risk-006", action: "Define and document Impact Tolerances for all Important Business Services per PS21/3 and obtain board approval.", owner: "user-graham", deadline: new Date("2025-12-31"), status: "COMPLETE", priority: "P1" },
    { id: "mit-017", riskId: "risk-006", action: "Conduct full IT disaster recovery test covering all 4 IBS and evidence outcomes in board self-assessment submission.", owner: "user-graham", deadline: new Date("2026-05-31"), status: "OPEN", priority: "P1" },
    { id: "mit-018", riskId: "risk-006", action: "Review cloud infrastructure redundancy configuration — confirm failover is tested and meets <1 hour RTO for critical services.", owner: "user-graham", deadline: new Date("2026-03-31"), status: "IN_PROGRESS", priority: "P2" },

    // risk-007: Data Breach & Privacy Risk
    { id: "mit-019", riskId: "risk-007", action: "Complete UK GDPR Article 30 Records of Processing update to reflect all new data flows introduced in the past 12 months.", owner: "user-cath", deadline: new Date("2026-03-31"), status: "IN_PROGRESS", priority: "P2" },
    { id: "mit-020", riskId: "risk-007", action: "Implement Data Loss Prevention (DLP) tooling to detect and block mass personal data exfiltration via email and cloud storage.", owner: "user-graham", deadline: new Date("2026-06-30"), status: "OPEN", priority: "P1" },
    { id: "mit-021", riskId: "risk-007", action: "Run data breach tabletop exercise with CCRO, Tech, and Legal to test 72-hour ICO notification readiness.", owner: "user-rob", deadline: new Date("2025-10-31"), status: "COMPLETE", priority: "P2" },

    // risk-008: Consumer Duty Outcomes Risk
    { id: "mit-022", riskId: "risk-008", action: "Establish monthly Consumer Duty dashboard review at ExCo level — all four outcome RAG statuses reported with supporting MI.", owner: "user-rob", deadline: new Date("2025-09-30"), status: "COMPLETE", priority: "P1" },
    { id: "mit-023", riskId: "risk-008", action: "Commission independent Consumer Duty readiness review to assess gap between current practice and FCA expectation for year 2.", owner: "user-rob", deadline: new Date("2026-04-30"), status: "OPEN", priority: "P1" },
    { id: "mit-024", riskId: "risk-008", action: "Update Consumer Duty annual board assessment and obtain formal board sign-off before FCA filing deadline.", owner: "user-cath", deadline: new Date("2026-07-31"), status: "OPEN", priority: "P1" },

    // risk-009: Financial Promotions Compliance Risk
    { id: "mit-025", riskId: "risk-009", action: "Implement pre-publication financial promotion review workflow requiring CCRO Team sign-off before any digital or print promotion goes live.", owner: "user-ash", deadline: new Date("2025-08-31"), status: "COMPLETE", priority: "P1" },
    { id: "mit-026", riskId: "risk-009", action: "Review and refresh financial promotion approval matrix to ensure clear accountability for all digital channels including social media.", owner: "user-ash", deadline: new Date("2026-04-30"), status: "IN_PROGRESS", priority: "P2" },
    { id: "mit-027", riskId: "risk-009", action: "Conduct retrospective audit of all live financial promotions against CONC 3 and Consumer Understanding outcome — remediate any identified deficiencies.", owner: "user-cath", deadline: new Date("2026-03-31"), status: "IN_PROGRESS", priority: "P2" },

    // risk-010: Complaints Handling Risk
    { id: "mit-028", riskId: "risk-010", action: "Implement root cause analysis process for all uphold complaint categories — produce monthly RCA report for ExCo with remediation actions.", owner: "user-chris", deadline: new Date("2026-03-31"), status: "IN_PROGRESS", priority: "P2" },
    { id: "mit-029", riskId: "risk-010", action: "Review FOS case outcomes for past 12 months and identify systemic issues requiring policy or process change.", owner: "user-cath", deadline: new Date("2025-11-30"), status: "COMPLETE", priority: "P2" },
    { id: "mit-030", riskId: "risk-010", action: "Revise complaints handling training module and deliver to all Customer Service staff — completion tracked as KPI.", owner: "user-chris", deadline: new Date("2026-06-30"), status: "OPEN", priority: "P3" },

    // risk-011: Vulnerable Customer Risk
    { id: "mit-031", riskId: "risk-011", action: "Implement TEXAS framework vulnerability screening in customer onboarding journey and train all Customer Service staff on identification techniques.", owner: "user-ash", deadline: new Date("2026-04-30"), status: "IN_PROGRESS", priority: "P1" },
    { id: "mit-032", riskId: "risk-011", action: "Design and launch accessible communications review — confirm all key customer documents meet plain English standard and accessibility guidelines.", owner: "user-ash", deadline: new Date("2026-06-30"), status: "OPEN", priority: "P2" },
    { id: "mit-033", riskId: "risk-011", action: "Complete vulnerability outcome monitoring framework — track % of flagged vulnerable customers receiving tailored support vs standard treatment.", owner: "user-rob", deadline: new Date("2025-12-31"), status: "COMPLETE", priority: "P2" },

    // risk-012: Regulatory Change Risk
    { id: "mit-034", riskId: "risk-012", action: "Subscribe to FCA regulatory horizon scanning service and assign CCRO Team owner for each upcoming regulatory change item.", owner: "user-cath", deadline: new Date("2025-09-30"), status: "COMPLETE", priority: "P2" },
    { id: "mit-035", riskId: "risk-012", action: "Establish regulatory change impact assessment process — each horizon item assessed within 30 days of identification for applicability and required firm response.", owner: "user-rob", deadline: new Date("2026-03-31"), status: "IN_PROGRESS", priority: "P2" },
    { id: "mit-036", riskId: "risk-012", action: "Review and update SMCR Individual Accountability Statements to reflect responsibilities for regulatory change management.", owner: "user-cath", deadline: new Date("2026-05-31"), status: "OPEN", priority: "P3" },

    // risk-013: FCA Supervisory Risk
    { id: "mit-037", riskId: "risk-013", action: "Establish quarterly CEO/CCRO review of FCA supervisory correspondence and open regulatory commitments — log in risk register.", owner: "user-rob", deadline: new Date("2025-10-31"), status: "COMPLETE", priority: "P1" },
    { id: "mit-038", riskId: "risk-013", action: "Prepare FCA regulatory relationship strategy document — agreed approach to proactive engagement, threshold conditions maintenance, and SUP reporting.", owner: "user-rob", deadline: new Date("2026-04-30"), status: "IN_PROGRESS", priority: "P2" },
    { id: "mit-039", riskId: "risk-013", action: "Commission dry-run FCA supervisory visit preparation exercise — identify any gaps in documentation, governance, or evidencing of outcomes.", owner: "user-cath", deadline: new Date("2026-07-31"), status: "OPEN", priority: "P2" },

    // risk-014: Liquidity Risk
    { id: "mit-040", riskId: "risk-014", action: "Implement weekly cash flow forecasting model and present 13-week cash position to Finance Director and CEO — escalate if runway falls below 16 weeks.", owner: "user-david", deadline: new Date("2025-10-31"), status: "COMPLETE", priority: "P1" },
    { id: "mit-041", riskId: "risk-014", action: "Negotiate and execute a committed revolving credit facility with at least one additional lender to diversify funding concentration risk.", owner: "user-david", deadline: new Date("2026-06-30"), status: "OPEN", priority: "P1" },
    { id: "mit-042", riskId: "risk-014", action: "Conduct quarterly liquidity stress test (3 scenarios: mild, moderate, severe) and document results in board risk report.", owner: "user-david", deadline: new Date("2026-03-31"), status: "IN_PROGRESS", priority: "P2" },

    // risk-015: Interest Rate Risk
    { id: "mit-043", riskId: "risk-015", action: "Implement interest rate sensitivity model — calculate P&L impact per 25bps rate move and present to ExCo quarterly.", owner: "user-david", deadline: new Date("2025-11-30"), status: "COMPLETE", priority: "P2" },
    { id: "mit-044", riskId: "risk-015", action: "Review loan pricing model to confirm adequate margin buffer is maintained under a +200bps rate scenario before pricing new product tranches.", owner: "user-micha", deadline: new Date("2026-04-30"), status: "OPEN", priority: "P2" },
    { id: "mit-045", riskId: "risk-015", action: "Assess feasibility of interest rate hedging instruments (e.g. interest rate swaps) as portfolio grows — present recommendation to board.", owner: "user-david", deadline: new Date("2026-06-30"), status: "OPEN", priority: "P3" },
  ];

  let mitCount = 0;
  for (const m of RISK_MITIGATIONS) {
    await prisma.riskMitigation.upsert({
      where: { id: m.id },
      update: {
        action: m.action,
        owner: m.owner,
        deadline: m.deadline,
        status: m.status,
        priority: m.priority,
      },
      create: {
        id: m.id,
        riskId: m.riskId,
        action: m.action,
        owner: m.owner,
        deadline: m.deadline,
        status: m.status,
        priority: m.priority,
      },
    });
    mitCount++;
  }
  console.log(`  ✓ ${mitCount} risk mitigations created/updated`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n=== CEO Prep Seed Complete ===");
  console.log("Summary:");
  console.log(`  • ${CD_OUTCOMES.length} Consumer Duty Outcomes`);
  console.log(`  • ${CD_MEASURES.length} CD Measures`);
  console.log(`  • ${CD_MI.length} MI Metrics + ${CD_MI.length * 12} monthly snapshots`);
  console.log(`  • ${RISKS.length} Risks + ${RISKS.length * 12} monthly snapshots`);
  console.log(`  • ${CONTROLS.length} Controls + testing + 12-month results + quarterly summaries + attestations`);
  console.log(`  • ${ACTIONS.length} Actions`);
  console.log(`  • ${rcLinked} Risk-Control links`);
  console.log(`  • ${raLinked} Risk-Action links`);
  console.log(`  • ${mitCount} Risk Mitigations (3 per risk)`);
}

main()
  .catch((e) => {
    console.error("CEO prep seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
