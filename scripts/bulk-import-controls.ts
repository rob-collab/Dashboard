import "dotenv/config";
import { PrismaClient, Prisma } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Types ────────────────────────────────────────────────────────────────────
interface ParsedControl {
  controlRef: string;
  controlName: string;
  rawDescription: string;
  controlObjective?: string;
  evidence?: string;
  frequency: string;
  owner?: string;
  policySection?: string;
  regulatoryReference?: string;
  notes?: string;
  prefix: string;
  batch: 1 | 2 | 3 | 4;
}

interface PolicyContext {
  policyArea: string;
  riskContext: string;
  regulatoryFramework: string;
  businessAreaId: string;
  defaultOwnerId: string;
  defaultOwnerRole: string;
  consumerDutyOutcome: "PRODUCTS_AND_SERVICES" | "CONSUMER_UNDERSTANDING" | "CONSUMER_SUPPORT" | "GOVERNANCE_CULTURE_OVERSIGHT";
}

// ── Policy Context Map ──────────────────────────────────────────────────────
const POLICY_CONTEXT: Record<string, PolicyContext> = {
  FP: {
    policyArea: "Financial Promotions",
    riskContext: "misleading, unfair, or non-compliant promotional material reaching consumers, resulting in poor customer outcomes and regulatory enforcement action",
    regulatoryFramework: "FCA COBS rules, FSMA 2000 s.21, Consumer Duty (PRIN 12), and ASA/CAP Code",
    businessAreaId: "ba-finprom",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "Compliance",
    consumerDutyOutcome: "CONSUMER_UNDERSTANDING",
  },
  CMP: {
    policyArea: "Complaints Handling",
    riskContext: "inadequate complaint handling resulting in customer detriment, FOS referrals, regulatory censure, and systemic failure to identify root causes",
    regulatoryFramework: "FCA DISP rules, Consumer Duty (PRIN 12), and FOS requirements",
    businessAreaId: "ba-customer-svc",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "Customer Service",
    consumerDutyOutcome: "CONSUMER_SUPPORT",
  },
  VUL: {
    policyArea: "Vulnerable Customers",
    riskContext: "failure to identify and appropriately support vulnerable customers, leading to customer harm and non-compliance with FCA Consumer Duty obligations",
    regulatoryFramework: "FCA Consumer Duty (PRIN 12), FG21/1 Guidance on Fair Treatment of Vulnerable Customers, and CONC 7",
    businessAreaId: "ba-customer-svc",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "Compliance",
    consumerDutyOutcome: "CONSUMER_SUPPORT",
  },
  CR: {
    policyArea: "Consumer Lending Credit",
    riskContext: "irresponsible lending, inadequate affordability assessment, or failure to identify vulnerable borrowers, resulting in customer harm and regulatory action",
    regulatoryFramework: "FCA CONC 5 (affordability and creditworthiness), Consumer Duty (PRIN 12), CCA 1974, and MLR 2017",
    businessAreaId: "ba-underwriting",
    defaultOwnerId: "user-ash",
    defaultOwnerRole: "Credit",
    consumerDutyOutcome: "PRODUCTS_AND_SERVICES",
  },
  AML: {
    policyArea: "AML/KYC/PEPs",
    riskContext: "money laundering, terrorist financing, sanctions breaches, or inadequate customer due diligence, exposing the firm to criminal liability and regulatory enforcement",
    regulatoryFramework: "Money Laundering Regulations 2017, Proceeds of Crime Act 2002, Terrorism Act 2000, Criminal Finances Act 2017, and JMLSG Guidance",
    businessAreaId: "ba-compliance",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "MLRO / Compliance",
    consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
  },
  AC: {
    policyArea: "Arrears & Collections",
    riskContext: "unfair treatment of customers in financial difficulty, non-compliant collections practices, or failure to offer appropriate forbearance measures",
    regulatoryFramework: "FCA CONC 7 (arrears and default), Consumer Duty (PRIN 12), CCA 1974, and Debt Relief (Breathing Space) Order 2021",
    businessAreaId: "ba-collections",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "Collections",
    consumerDutyOutcome: "CONSUMER_SUPPORT",
  },
  DP: {
    policyArea: "Data Protection",
    riskContext: "personal data breaches, non-compliance with data subject rights, or inadequate data processing controls, resulting in ICO enforcement and customer harm",
    regulatoryFramework: "UK GDPR, Data Protection Act 2018, PECR, and ICO guidance",
    businessAreaId: "ba-compliance",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "DPO / Compliance",
    consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
  },
  COND: {
    policyArea: "Conduct Risk",
    riskContext: "conduct failings leading to poor customer outcomes, cultural deficiencies, or inadequate risk management, resulting in regulatory intervention",
    regulatoryFramework: "FCA Consumer Duty (PRIN 12), COCON, PRIN 2A, and SYSC 3",
    businessAreaId: "ba-compliance",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "CRCO / Compliance",
    consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
  },
  COI: {
    policyArea: "Conflicts of Interest",
    riskContext: "unmanaged conflicts of interest compromising the integrity of decision-making and customer outcomes",
    regulatoryFramework: "FCA SYSC 10 (conflicts of interest), PRIN 8, and COCON",
    businessAreaId: "ba-compliance",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "Risk & Compliance",
    consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
  },
  ABC: {
    policyArea: "Anti-Bribery & Corruption",
    riskContext: "bribery, corruption, or improper inducements, exposing the firm to criminal prosecution under the Bribery Act 2010 and reputational damage",
    regulatoryFramework: "Bribery Act 2010, FCA SYSC 3, and Ministry of Justice Guidance",
    businessAreaId: "ba-compliance",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "Risk & Compliance",
    consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
  },
  FV: {
    policyArea: "Fair Value Assessment",
    riskContext: "products failing to deliver fair value to consumers, with pricing, benefits, or limitations not meeting Consumer Duty requirements",
    regulatoryFramework: "FCA Consumer Duty (PRIN 12), FG22/5 Fair Value Framework, and PROD 4",
    businessAreaId: "ba-compliance",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "Compliance",
    consumerDutyOutcome: "PRODUCTS_AND_SERVICES",
  },
  PAR: {
    policyArea: "Product Annual Review",
    riskContext: "products becoming unsuitable over time due to market changes, evolving customer needs, or emerging conduct risks that are not identified through regular review",
    regulatoryFramework: "FCA Consumer Duty (PRIN 12), PROD 4 (product governance), and TCF outcomes framework",
    businessAreaId: "ba-compliance",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "Product Manager / Compliance",
    consumerDutyOutcome: "PRODUCTS_AND_SERVICES",
  },
  CLP: {
    policyArea: "Consumer Lending Procedures",
    riskContext: "procedural failures in the lending process leading to irresponsible lending, inadequate verification, or poor customer outcomes",
    regulatoryFramework: "FCA CONC 5 (affordability), Consumer Duty (PRIN 12), FSMA 2000, and CCA 1974",
    businessAreaId: "ba-underwriting",
    defaultOwnerId: "user-ash",
    defaultOwnerRole: "Credit / Underwriting",
    consumerDutyOutcome: "PRODUCTS_AND_SERVICES",
  },
  DR: {
    policyArea: "Data Retention",
    riskContext: "non-compliant data retention or premature destruction of records, impeding regulatory investigations or breaching data protection obligations",
    regulatoryFramework: "UK GDPR, Data Protection Act 2018, FSMA 2000, CCA 1974, and FCA record-keeping rules",
    businessAreaId: "ba-compliance",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "DPO / Compliance",
    consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
  },
  HS: {
    policyArea: "Health & Safety",
    riskContext: "workplace injuries, non-compliance with health and safety legislation, or inadequate emergency preparedness",
    regulatoryFramework: "Health and Safety at Work Act 1974, Management of Health and Safety at Work Regulations 1999, RIDDOR, and DSE Regulations",
    businessAreaId: "ba-hr",
    defaultOwnerId: "user-david",
    defaultOwnerRole: "Operations / HR",
    consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
  },
  ITS: {
    policyArea: "IT Security",
    riskContext: "cyber attacks, data breaches, unauthorised access, or system failures compromising the confidentiality, integrity, and availability of critical systems and customer data",
    regulatoryFramework: "FCA SYSC 13 (operational resilience), UK GDPR Art 32 (security of processing), and NCSC Cyber Essentials",
    businessAreaId: "ba-it",
    defaultOwnerId: "user-micha",
    defaultOwnerRole: "IT / Information Security",
    consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
  },
  PAYCE: {
    policyArea: "Payce Credit Product",
    riskContext: "product-specific lending failures, inadequate affordability checks, or pricing unfairness in the Payce point-of-sale lending product",
    regulatoryFramework: "FCA CONC 5 (affordability), Consumer Duty (PRIN 12), FSMA 2000, and CCA 1974",
    businessAreaId: "ba-underwriting",
    defaultOwnerId: "user-ash",
    defaultOwnerRole: "Credit / Product",
    consumerDutyOutcome: "PRODUCTS_AND_SERVICES",
  },
  PP: {
    policyArea: "Privacy",
    riskContext: "inadequate transparency about data processing, failure to respect data subject rights, or non-compliant data sharing with third parties",
    regulatoryFramework: "UK GDPR, Data Protection Act 2018, PECR, and ICO guidance on privacy notices",
    businessAreaId: "ba-compliance",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "DPO / Compliance",
    consumerDutyOutcome: "CONSUMER_UNDERSTANDING",
  },
  PROV: {
    policyArea: "Provisioning",
    riskContext: "inaccurate credit loss provisioning, under-estimation of impairment, or non-compliance with accounting standards, leading to misstated financial position",
    regulatoryFramework: "FSMA 2000, IFRS 9 (expected credit losses), and FCA prudential requirements",
    businessAreaId: "ba-finance",
    defaultOwnerId: "user-ash",
    defaultOwnerRole: "Finance",
    consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
  },
  TCS: {
    policyArea: "Terms & Conditions",
    riskContext: "unfair or unclear contractual terms, non-disclosure of material information, or non-compliance with consumer credit disclosure requirements",
    regulatoryFramework: "CCA 1974, Consumer Rights Act 2015, FCA CONC 2, FSMA 2000 s.21, and PECR",
    businessAreaId: "ba-compliance",
    defaultOwnerId: "user-cath",
    defaultOwnerRole: "Compliance / Legal",
    consumerDutyOutcome: "CONSUMER_UNDERSTANDING",
  },
};

// ── Policy Name → Prefix mapping (for DB lookup) ────────────────────────────
const PREFIX_TO_POLICY_NAME: Record<string, string> = {
  FP: "Financial Promotions",
  CMP: "Complaints",
  VUL: "Vulnerable Customers",
  CR: "Credit Policy",
  AML: "AML/KYC",
  AC: "Arrears & Collections",
  DP: "Data Protection",
  COND: "Conduct Risk",
  COI: "Conflicts of Interest",
  ABC: "Anti-Bribery",
  FV: "Fair Value",
  PAR: "Product Annual Review",
  CLP: "Lending Procedures",
  DR: "Data Retention",
  HS: "Health & Safety",
  ITS: "IT Security",
  PAYCE: "Payce Credit",
  PP: "Privacy",
  PROV: "Provisioning",
  TCS: "Terms & Conditions",
};

// ── Owner mapping ────────────────────────────────────────────────────────────
function mapOwner(ownerText: string | undefined, defaultId: string): string {
  if (!ownerText) return defaultId;
  const lower = ownerText.toLowerCase();
  if (lower.includes("ceo") || lower.includes("board")) return "user-ceo";
  if (lower.includes("coo")) return "user-ash";
  if (lower.includes("hr")) return "user-david";
  if (lower.includes("it") && !lower.includes("credit")) return "user-micha";
  if (lower.includes("finance") && !lower.includes("compliance")) return "user-ash";
  if (lower.includes("credit") && !lower.includes("compliance")) return "user-ash";
  if (lower.includes("underwriting")) return "user-ash";
  if (lower.includes("collections") && !lower.includes("compliance")) return "user-ash";
  if (lower.includes("product") && !lower.includes("compliance")) return "user-chris";
  if (lower.includes("risk management")) return "user-cath";
  return defaultId;
}

// ── Frequency mapping ────────────────────────────────────────────────────────
function mapFrequency(freq: string): "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BI_ANNUAL" | "ANNUAL" | "EVENT_DRIVEN" {
  const lower = freq.toLowerCase();
  if (lower.includes("daily") || lower.includes("continuous") || lower.includes("real-time")) return "DAILY";
  if (lower.includes("weekly")) return "WEEKLY";
  if (lower.includes("monthly") || lower.includes("4 week")) return "MONTHLY";
  if (lower.includes("quarterly") || lower.includes("18-month")) return "QUARTERLY";
  if (lower.includes("twice") || lower.includes("semi-annual") || lower.includes("bi-annual")) return "BI_ANNUAL";
  if (lower.includes("annual") || lower.includes("year")) return "ANNUAL";
  // Per event, per promotion, per complaint, on detection, etc.
  return "EVENT_DRIVEN";
}

// ── Control type inference ───────────────────────────────────────────────────
function inferControlType(name: string, desc: string): "PREVENTATIVE" | "DETECTIVE" | "CORRECTIVE" | "DIRECTIVE" {
  const text = `${name} ${desc}`.toLowerCase();
  // Corrective patterns
  if (text.includes("root cause") || text.includes("remediation") || text.includes("compensation")
    || text.includes("corrective") || text.includes("resolution") || text.includes("learning implementation")) return "CORRECTIVE";
  // Detective patterns
  if (text.includes("monitor") || text.includes("review") || text.includes("audit") || text.includes("analysis")
    || text.includes("assessment") || text.includes("screening") || text.includes("detection")
    || text.includes("identification") || text.includes("tracking") || text.includes("reporting")
    || text.includes("dashboard") || text.includes("measurement") || text.includes("scanning")) return "DETECTIVE";
  // Directive patterns
  if (text.includes("training") || text.includes("policy") || text.includes("framework")
    || text.includes("standard") || text.includes("definition") || text.includes("documentation")
    || text.includes("record") || text.includes("retention") || text.includes("procedure")
    || text.includes("protocol") || text.includes("three lines")) return "DIRECTIVE";
  // Preventative is the default for approvals, restrictions, enforcement, etc.
  return "PREVENTATIVE";
}

// ── Description enrichment ───────────────────────────────────────────────────
function enrichDescription(ctrl: ParsedControl): string {
  const ctx = POLICY_CONTEXT[ctrl.prefix];
  if (!ctx) return ctrl.rawDescription;

  const parts: string[] = [];

  // Part 1: Lead sentence — what the control does (process-oriented)
  if (ctrl.batch === 1 && ctrl.controlObjective) {
    // Best data: we have name + objective
    parts.push(
      `${ctrl.controlName} — ${ctrl.controlObjective}. ` +
      `The ${ctrl.owner || ctx.defaultOwnerRole} function performs this control to safeguard against ${ctx.riskContext.split(",")[0]}.`
    );
  } else if (ctrl.batch === 2 && ctrl.policySection) {
    // Good data: description + policy section
    parts.push(
      `${capitalise(ctrl.rawDescription)}. ` +
      `This control operates within the "${ctrl.policySection}" section of the ${ctx.policyArea} Policy and is executed by the ${ctx.defaultOwnerRole} function.`
    );
  } else if (ctrl.batch === 3) {
    // Poor data: requirement text + notes
    const requirement = ctrl.rawDescription.replace(/^[^:]+:\s*/, ""); // Strip "Category: " prefix if present
    parts.push(
      `${capitalise(ctrl.rawDescription)}. ` +
      `The ${ctx.defaultOwnerRole} function is responsible for ensuring this control operates effectively within the ${ctx.policyArea} framework.`
    );
    if (ctrl.notes) {
      parts.push(ctrl.notes.replace(/\.$/, "") + ".");
    }
  } else {
    // Batch 4: section + brief description
    parts.push(
      `${capitalise(ctrl.rawDescription)}. ` +
      `This control is managed by the ${ctx.defaultOwnerRole} function within the ${ctx.policyArea} Policy framework.`
    );
  }

  // Part 2: Evidence — what documentation or artifacts demonstrate the control is working
  if (ctrl.evidence) {
    parts.push(`Evidence of effective operation is maintained through: ${ctrl.evidence}.`);
  } else {
    // Generate evidence based on control type
    const ev = generateEvidence(ctrl);
    if (ev) parts.push(`Evidence of effective operation includes ${ev}.`);
  }

  // Part 3: Regulatory context and risk
  const regRef = ctrl.regulatoryReference || ctx.regulatoryFramework;
  parts.push(
    `This control supports compliance with ${regRef} and mitigates the risk of ${ctx.riskContext}.`
  );

  // Part 4: Frequency
  const freqText = ctrl.frequency.toLowerCase();
  if (freqText.includes("per ") || freqText.includes("on ") || freqText.includes("as ")) {
    parts.push(`It operates on an event-driven basis (${ctrl.frequency.toLowerCase()}).`);
  } else {
    parts.push(`It operates on a ${ctrl.frequency.toLowerCase()} basis.`);
  }

  return parts.join(" ");
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateEvidence(ctrl: ParsedControl): string {
  const text = `${ctrl.controlName} ${ctrl.rawDescription}`.toLowerCase();

  if (text.includes("training")) return "training attendance records, competency assessment results, and completion tracking reports";
  if (text.includes("approval") || text.includes("sign-off")) return "signed approval records, workflow audit trails, and version-controlled documentation";
  if (text.includes("complaint")) return "complaint case records, investigation documentation, outcome letters, and management reporting";
  if (text.includes("monitor")) return "monitoring dashboards, exception reports, and periodic management information packs";
  if (text.includes("screening") || text.includes("sanction")) return "screening results, match/no-match records, and escalation documentation";
  if (text.includes("assessment") || text.includes("review")) return "completed assessment templates, documented findings, reviewer sign-off records, and action tracking logs";
  if (text.includes("report")) return "report outputs, distribution records, and management acknowledgement";
  if (text.includes("audit")) return "audit reports, findings registers, management responses, and remediation tracking";
  if (text.includes("record") || text.includes("register") || text.includes("log")) return "maintained register entries, access-controlled records, and periodic reconciliation";
  if (text.includes("policy") || text.includes("procedure") || text.includes("framework")) return "current policy documentation, version control records, and board/committee approval minutes";
  if (text.includes("retention") || text.includes("destruction")) return "retention schedule documentation, destruction certificates, and disposal audit trails";
  if (text.includes("encrypt") || text.includes("security") || text.includes("access")) return "system configuration records, access logs, penetration test reports, and security audit evidence";
  if (text.includes("backup") || text.includes("recovery") || text.includes("disaster")) return "backup completion logs, recovery test results, and business continuity plan documentation";
  if (text.includes("escalat")) return "escalation records, case notes, and management decision documentation";
  if (text.includes("communication") || text.includes("readability")) return "communication templates, readability analysis reports, and consumer comprehension testing results";
  if (text.includes("third party") || text.includes("third-party")) return "contractual agreements, due diligence reports, and periodic audit findings";
  if (text.includes("provision") || text.includes("impairment")) return "provisioning calculation workpapers, Board-approved weights, and external auditor sign-off";
  if (text.includes("price") || text.includes("pricing") || text.includes("margin")) return "pricing matrix documentation, approval records, and fair value assessment evidence";
  if (text.includes("affordability") || text.includes("income") || text.includes("expense")) return "affordability calculation workpapers, income verification records, and expenditure analysis documentation";
  if (text.includes("fire") || text.includes("safety") || text.includes("hazard")) return "risk assessment records, drill logs, inspection reports, and incident records";
  if (text.includes("vulnerability") || text.includes("vulnerable")) return "customer vulnerability flags, case notes, support outcome records, and management reporting";
  if (text.includes("forbearance") || text.includes("breathing space")) return "forbearance agreement documentation, customer communication records, and outcome tracking";

  return "documented records, periodic review evidence, and management reporting";
}

// ── Markdown parsers ─────────────────────────────────────────────────────────

/** Parse Batch 1: has | Control ID | Control Name | Control Objective | Evidence | Frequency | Owner | */
function parseBatch1(md: string): ParsedControl[] {
  const controls: ParsedControl[] = [];
  const tableRegex = /\|\s*(CTRL-\w+-\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g;
  let match;
  while ((match = tableRegex.exec(md)) !== null) {
    const ref = match[1].trim();
    const prefix = extractPrefix(ref);
    controls.push({
      controlRef: ref,
      controlName: match[2].trim(),
      rawDescription: match[3].trim(), // Control Objective
      controlObjective: match[3].trim(),
      evidence: match[4].trim(),
      frequency: match[5].trim(),
      owner: match[6].trim(),
      prefix,
      batch: 1,
    });
  }
  return controls;
}

/** Parse Batch 2: has | Control ID | Description | Policy Section | Regulatory Reference | Frequency | */
function parseBatch2(md: string): ParsedControl[] {
  const controls: ParsedControl[] = [];
  const tableRegex = /\|\s*(CTRL-\w+-\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g;
  let match;
  while ((match = tableRegex.exec(md)) !== null) {
    const ref = match[1].trim();
    if (ref.startsWith("CTRL-")) {
      const prefix = extractPrefix(ref);
      controls.push({
        controlRef: ref,
        controlName: match[2].trim(),
        rawDescription: match[2].trim(),
        policySection: match[3].trim(),
        regulatoryReference: match[4].trim(),
        frequency: match[5].trim(),
        prefix,
        batch: 2,
      });
    }
  }
  return controls;
}

/** Parse Batch 3: has | Control ID | Requirement | Notes | — IDs lack CTRL- prefix */
function parseBatch3(md: string): ParsedControl[] {
  const controls: ParsedControl[] = [];
  const seen = new Set<string>();
  // Match rows like: | COI-001 | text | text |  or | ABC-001 | text | text |
  const tableRegex = /\|\s*(\w+-\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|/g;
  let match;
  while ((match = tableRegex.exec(md)) !== null) {
    let ref = match[1].trim();
    // Skip header rows
    if (ref === "Control ID" || ref.includes("---")) continue;
    // Normalise to CTRL- prefix
    if (!ref.startsWith("CTRL-")) ref = `CTRL-${ref}`;
    // De-duplicate by ref
    if (seen.has(ref)) continue;
    seen.add(ref);

    const prefix = extractPrefix(ref);
    const requirement = match[2].trim();
    const notes = match[3].trim();

    // Generate a proper control name from the requirement text
    const colonIdx = requirement.indexOf(":");
    const name = colonIdx > 0 ? requirement.substring(0, colonIdx).trim() : requirement.substring(0, 60);

    controls.push({
      controlRef: ref,
      controlName: name,
      rawDescription: requirement,
      notes: notes || undefined,
      frequency: inferFrequencyFromBatch3(requirement, notes),
      prefix,
      batch: 3,
    });
  }
  return controls;
}

function inferFrequencyFromBatch3(req: string, notes: string): string {
  const text = `${req} ${notes}`.toLowerCase();
  if (text.includes("annual")) return "Annual";
  if (text.includes("quarterly")) return "Quarterly";
  if (text.includes("monthly")) return "Monthly";
  if (text.includes("induction")) return "Per event";
  if (text.includes("ongoing") || text.includes("continuous")) return "Ongoing";
  return "Event-driven";
}

/** Parse Batch 4: detailed format with #### CTRL-XXX-NNN headers */
function parseBatch4(md: string): ParsedControl[] {
  const controls: ParsedControl[] = [];
  // Match the detailed blocks:
  // #### CTRL-XXX-NNN
  // **Section:** ...
  // **Description:** ...
  // **Regulation References:** ...
  const blockRegex = /####\s+(CTRL-[\w-]+-\d+)\s*\n\*\*Section:\*\*\s*([^\n]+)\n\s*\n\*\*Description:\*\*\s*([^\n]+)\n\s*\n\*\*Regulation References:\*\*\s*([^\n]+)/g;
  let match;
  while ((match = blockRegex.exec(md)) !== null) {
    const ref = match[1].trim();
    const prefix = extractPrefix(ref);
    const section = match[2].trim();
    const description = match[3].trim();
    const regRefs = match[4].trim();

    controls.push({
      controlRef: ref,
      controlName: `${section} Control`,
      rawDescription: description,
      policySection: section,
      regulatoryReference: regRefs.replace(/;/g, "; "),
      frequency: inferFrequencyFromBatch4(section, description),
      prefix,
      batch: 4,
    });
  }
  return controls;
}

function inferFrequencyFromBatch4(section: string, desc: string): string {
  const text = `${section} ${desc}`.toLowerCase();
  if (text.includes("annual") || text.includes("yearly")) return "Annual";
  if (text.includes("quarterly") || text.includes("every 12 month")) return "Quarterly";
  if (text.includes("monthly")) return "Monthly";
  if (text.includes("weekly")) return "Weekly";
  if (text.includes("daily")) return "Daily";
  if (text.includes("continuous") || text.includes("ongoing") || text.includes("mandatory")) return "Ongoing";
  if (text.includes("per application") || text.includes("per transaction")) return "Per event";
  return "Event-driven";
}

function extractPrefix(ref: string): string {
  // CTRL-FP-001 → FP, CTRL-PAYCE-001 → PAYCE, CTRL-CMP-001 → CMP
  const parts = ref.replace("CTRL-", "").split("-");
  // The last part is the number, everything before is the prefix
  parts.pop();
  return parts.join("-");
}

// ── Main ─────────────────────────────────────────────────────────────────────
const CSV_DIR = "/Users/robhealey/Downloads/drive-download-20260219T231609Z-1-001";

async function main() {
  console.log("Bulk importing controls with enriched descriptions");
  console.log("─".repeat(60));

  // Read all 4 batch files
  const batch1 = fs.readFileSync(`${CSV_DIR}/controls_registers_batch1.md`, "utf-8");
  const batch2 = fs.readFileSync(`${CSV_DIR}/controls_registers_batch2.md`, "utf-8");
  const batch3 = fs.readFileSync(`${CSV_DIR}/controls_registers_batch3.md`, "utf-8");
  const batch4 = fs.readFileSync(`${CSV_DIR}/controls_registers_batch4.md`, "utf-8");

  // Parse all batches
  const controls1 = parseBatch1(batch1);
  const controls2 = parseBatch2(batch2);
  const controls3 = parseBatch3(batch3);
  const controls4 = parseBatch4(batch4);

  console.log(`Parsed: Batch 1=${controls1.length}, Batch 2=${controls2.length}, Batch 3=${controls3.length}, Batch 4=${controls4.length}`);

  const allControls = [...controls1, ...controls2, ...controls3, ...controls4];

  // De-duplicate across batches by controlRef
  const uniqueMap = new Map<string, ParsedControl>();
  for (const ctrl of allControls) {
    if (!uniqueMap.has(ctrl.controlRef)) {
      uniqueMap.set(ctrl.controlRef, ctrl);
    }
  }
  const uniqueControls = Array.from(uniqueMap.values());
  console.log(`Total unique controls: ${uniqueControls.length}`);

  // Load policies from DB for linking
  const policies = await prisma.policy.findMany({ select: { id: true, name: true, reference: true } });
  console.log(`Found ${policies.length} policies in DB`);

  // Build prefix → policy map
  const prefixToPolicy = new Map<string, { id: string; name: string; reference: string }>();
  for (const [prefix, searchName] of Object.entries(PREFIX_TO_POLICY_NAME)) {
    const policy = policies.find(p => p.name.toLowerCase().includes(searchName.toLowerCase()));
    if (policy) {
      prefixToPolicy.set(prefix, policy);
    } else {
      console.log(`⚠ No policy found for prefix ${prefix} (searched: "${searchName}")`);
    }
  }

  // Check for existing controls to avoid duplicates
  const existing = await prisma.control.findMany({ select: { controlRef: true } });
  const existingRefs = new Set(existing.map(e => e.controlRef));
  console.log(`Existing controls in DB: ${existingRefs.size}`);

  let created = 0;
  let skipped = 0;
  let errors = 0;
  let linked = 0;

  for (const ctrl of uniqueControls) {
    // Skip if already exists
    if (existingRefs.has(ctrl.controlRef)) {
      skipped++;
      continue;
    }

    const ctx = POLICY_CONTEXT[ctrl.prefix];
    if (!ctx) {
      console.error(`  ✗ No context for prefix: ${ctrl.prefix} (${ctrl.controlRef})`);
      errors++;
      continue;
    }

    try {
      const enrichedDescription = enrichDescription(ctrl);
      const ownerId = mapOwner(ctrl.owner, ctx.defaultOwnerId);
      const frequency = mapFrequency(ctrl.frequency);
      const controlType = inferControlType(ctrl.controlName, ctrl.rawDescription);

      const control = await prisma.control.create({
        data: {
          controlRef: ctrl.controlRef,
          controlName: ctrl.controlName,
          controlDescription: enrichedDescription,
          businessAreaId: ctx.businessAreaId,
          controlOwnerId: ownerId,
          consumerDutyOutcome: ctx.consumerDutyOutcome,
          controlFrequency: frequency,
          internalOrThirdParty: inferInternalOrThirdParty(ctrl),
          controlType: controlType,
          isActive: true,
          approvalStatus: "APPROVED",
          standingComments: ctrl.notes || null,
          createdById: "user-cath",
        },
      });

      created++;

      // Link to policy
      const policy = prefixToPolicy.get(ctrl.prefix);
      if (policy) {
        try {
          await prisma.policyControlLink.create({
            data: {
              policyId: policy.id,
              controlId: control.id,
              linkedBy: "user-cath",
              notes: `Auto-linked during bulk import from ${ctrl.prefix} controls register`,
            },
          });
          linked++;
        } catch {
          // Unique constraint violation = already linked
        }
      }

      if (created % 25 === 0) {
        console.log(`  ... ${created} controls created so far`);
      }
    } catch (err) {
      errors++;
      console.error(`  ✗ Error creating ${ctrl.controlRef}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("─".repeat(60));
  console.log(`Done: ${created} controls created, ${linked} policy links, ${skipped} skipped (existing), ${errors} errors`);

  // Summary by prefix
  const byPrefix = new Map<string, number>();
  for (const ctrl of uniqueControls) {
    if (!existingRefs.has(ctrl.controlRef)) {
      byPrefix.set(ctrl.prefix, (byPrefix.get(ctrl.prefix) || 0) + 1);
    }
  }
  console.log("\nControls by policy area:");
  for (const [prefix, count] of Array.from(byPrefix.entries()).sort()) {
    const policy = prefixToPolicy.get(prefix);
    console.log(`  ${prefix.padEnd(6)} → ${String(count).padStart(3)} controls (${policy?.name || "no policy match"})`);
  }

  await prisma.$disconnect();
}

function inferInternalOrThirdParty(ctrl: ParsedControl): "INTERNAL" | "THIRD_PARTY" {
  const text = `${ctrl.controlName} ${ctrl.rawDescription} ${ctrl.notes || ""}`.toLowerCase();
  if (text.includes("third party") || text.includes("third-party") || text.includes("external")
    || text.includes("outsourc") || text.includes("cifas") || text.includes("truelayer")
    || text.includes("modulr") || text.includes("transunion") || text.includes("callvalidate")
    || text.includes("everything financial") || text.includes("fos") || text.includes("ico")) {
    return "THIRD_PARTY";
  }
  return "INTERNAL";
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
