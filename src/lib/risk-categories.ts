import type { RiskCategoryDef } from "./types";

// ── L1 → L2 Risk Category Taxonomy (from RMF Appendix 4.2) ────────────────

export const RISK_CATEGORIES: RiskCategoryDef[] = [
  {
    name: "Conduct & Compliance Risk",
    definition: "The risk of customer detriment arising from inappropriate culture, products and processes or the risks of non-compliance with regulation, rules or prescribed industry practices (including data protection).",
    subcategories: [
      { name: "Culture", definition: "The risk of Updraft's business is not being conducted in line with its core purpose or values due to poor governance or inappropriate behaviours or judgements." },
      { name: "Products", definition: "The risk of Updraft's design or service of products which result in poor customer outcomes or undermine market integrity (including supporting promotions and communications)." },
      { name: "Regulations", definition: "The risk of Updraft not complying with applicable regulations & codes, misinterpreting regulations or not identifying and managing changes in regulations." },
    ],
  },
  {
    name: "Operational Risk",
    definition: "The risk of loss or damage resulting from inadequate or failed internal processes, people and systems, fraud or external events. This also extends to the services or processes provided by third parties.",
    subcategories: [
      { name: "People", definition: "The risk of damage to Updraft as a result of an inability to recruit, develop, reward or retain appropriate people." },
      { name: "Fraud", definition: "The risk of damage or loss to Updraft as a result of an act of dishonesty, false representation, the failure to disclose information or an abuse of position." },
      { name: "Service Availability & Resilience", definition: "The risk of a failure to maintain suitable technology services to customers due to performance, availability or failure in the design operation of security controls." },
      { name: "Processes", definition: "The risk of damage or loss as a result of failure to understand, document and maintain effective business processes." },
      { name: "Change & Transformation", definition: "The risk of damage or loss from poorly managed change or transformation activity." },
      { name: "Third Parties", definition: "The risk of failure of a critical third party as a result of the selection or contracting process, poor service definition and management or tracking of expected benefits." },
      { name: "Information Management & Data Security", definition: "The risk of loss or damage as a result of material errors in critical reporting or failure to secure key data assets." },
    ],
  },
  {
    name: "Credit Risk",
    definition: "The risk that unexpected losses might arise as a result of Updraft's customers failing to meet their obligations to repay.",
    subcategories: [
      { name: "Impairments", definition: "The risk of Updraft being subject to excessive impairment provisions." },
      { name: "Credit Strategy", definition: "The risk Updraft fails to document, review and adhere to appropriate credit strategies and makes lending decisions outside of approved demographics." },
      { name: "Credit Models", definition: "The risk of failure of Updraft's key credit decisioning models and processes." },
    ],
  },
  {
    name: "Financial Risk",
    definition: "The risk of Updraft having inadequate earnings, cash flow or capital to meet its current or future requirements and expectations. It also includes the risk of material financial and management misstatements occurring.",
    subcategories: [
      { name: "Liquidity & Funding", definition: "The risk of Updraft being unable to meet its liabilities as they become due. Funding risk is the risk that Updraft is unable to maintain diverse funding sources." },
      { name: "Solvency", definition: "The risk of Updraft failing to maintain sufficient capital to maintain the confidence of current and future investors, the Board, our customers and regulators." },
      { name: "Market", definition: "The risk that the net value of, or net income arising from, Updraft's assets and liabilities is impacted as a result of market price or rate changes." },
    ],
  },
  {
    name: "Strategic Risk",
    definition: "The risk of significant loss or damage arising from business decisions that impact the long-term future of Updraft, poor business strategy execution or a failure to adapt to external developments.",
    subcategories: [
      { name: "Business Model", definition: "The risk of failing to adopt an appropriate business model, set appropriate goals and targets within the business plan, or adapt to external developments." },
      { name: "Strategic Initiatives", definition: "The risk of Updraft entering into strategic initiatives that undermine the business model or fails to identify opportunities to enter arrangements which would support growth." },
      { name: "Reputation", definition: "The risk of events or incidents impacting Updraft's reputation to an extent it impacts business operations." },
    ],
  },
];

/** All L1 category names */
export const L1_CATEGORIES = RISK_CATEGORIES.map((c) => c.name);

/** Get L2 subcategories for a given L1 category */
export function getL2Categories(l1Name: string) {
  return RISK_CATEGORIES.find((c) => c.name === l1Name)?.subcategories ?? [];
}

// ── Likelihood Scale ────────────────────────────────────────────────────────

export const LIKELIHOOD_SCALE = [
  { score: 1, label: "Rare", description: "May occur in exceptional circumstances" },
  { score: 2, label: "Unlikely", description: "Could occur at some time" },
  { score: 3, label: "Possible", description: "Might occur at some point in a 12-month period" },
  { score: 4, label: "Moderate", description: "Will probably occur in some circumstances" },
  { score: 5, label: "Almost Certain", description: "Is expected to occur in most circumstances" },
] as const;

// ── Impact Scale ────────────────────────────────────────────────────────────

export const IMPACT_SCALE = [
  { score: 1, label: "Negligible", description: "No regulatory issues, no concern", operational: "Effects less than 10 customers" },
  { score: 2, label: "Minor", description: "Minor breach (not systematic), limited impact", operational: "Effects less than 10% of customers" },
  { score: 3, label: "Moderate", description: "Technical breach, local news", operational: "Effects 25% of customers" },
  { score: 4, label: "Major", description: "Systematic regulatory breach, national press", operational: "Effects 50% of customers" },
  { score: 5, label: "Significant", description: "Removal of permissions, headline news", operational: "Effects 100% of customers" },
] as const;

// ── Risk Score Helpers ──────────────────────────────────────────────────────

export type RiskLevel = "Low" | "Medium" | "High" | "Very High";

export interface RiskLevelInfo {
  level: RiskLevel;
  colour: string;
  bgClass: string;
  textClass: string;
}

export function getRiskScore(likelihood: number, impact: number): number {
  return likelihood * impact;
}

export function getRiskLevel(score: number): RiskLevelInfo {
  if (score >= 20) return { level: "Very High", colour: "#dc2626", bgClass: "bg-red-600", textClass: "text-white" };
  if (score >= 10) return { level: "High", colour: "#ea580c", bgClass: "bg-orange-600", textClass: "text-white" };
  if (score >= 5) return { level: "Medium", colour: "#eab308", bgClass: "bg-yellow-500", textClass: "text-black" };
  return { level: "Low", colour: "#22c55e", bgClass: "bg-green-500", textClass: "text-white" };
}

/** Get the risk level info for a specific grid cell */
export function getCellRiskLevel(likelihood: number, impact: number): RiskLevelInfo {
  return getRiskLevel(getRiskScore(likelihood, impact));
}

// ── L1 Category Colour Map (for heatmap markers) ───────────────────────────

export const L1_CATEGORY_COLOURS: Record<string, { fill: string; stroke: string; label: string }> = {
  "Conduct & Compliance Risk": { fill: "#7B1FA2", stroke: "#4A148C", label: "Conduct" },
  "Operational Risk":          { fill: "#1976D2", stroke: "#0D47A1", label: "Operational" },
  "Credit Risk":               { fill: "#388E3C", stroke: "#1B5E20", label: "Credit" },
  "Financial Risk":            { fill: "#F57C00", stroke: "#E65100", label: "Financial" },
  "Strategic Risk":            { fill: "#C62828", stroke: "#B71C1C", label: "Strategic" },
};

// ── Direction of Travel display ─────────────────────────────────────────────

export const DIRECTION_DISPLAY = {
  IMPROVING: { label: "Improving", icon: "↑", colour: "text-green-600" },
  STABLE: { label: "Stable", icon: "→", colour: "text-yellow-600" },
  DETERIORATING: { label: "Deteriorating", icon: "↓", colour: "text-red-600" },
} as const;

// ── Control Effectiveness display ───────────────────────────────────────────

export const EFFECTIVENESS_DISPLAY = {
  EFFECTIVE: { label: "Effective", colour: "text-green-600", bg: "bg-green-100" },
  PARTIALLY_EFFECTIVE: { label: "Partially Effective", colour: "text-yellow-600", bg: "bg-yellow-100" },
  INEFFECTIVE: { label: "Ineffective", colour: "text-red-600", bg: "bg-red-100" },
} as const;

// ── Risk Appetite display ───────────────────────────────────────────────────

export const APPETITE_DISPLAY = {
  VERY_LOW: "Very Low",
  LOW: "Low",
  LOW_TO_MODERATE: "Low to Moderate",
  MODERATE: "Moderate",
} as const;
