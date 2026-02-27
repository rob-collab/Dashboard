/**
 * Dashboard section registry.
 * Each section has a unique key, label, and description.
 * The DEFAULT_SECTION_ORDER defines the canonical order matching the current hardcoded layout.
 * The DEFAULT_GRID_LAYOUT defines default react-grid-layout positions for each section.
 */
import type { RGLLayoutItem } from "@/lib/types";

export interface DashboardSectionDef {
  key: string;
  label: string;
  description: string;
}

export const DASHBOARD_SECTIONS: DashboardSectionDef[] = [
  { key: "welcome", label: "Welcome Banner", description: "Personalised greeting with notification pills and quick actions" },
  { key: "notifications", label: "Notification Banners", description: "Active system notifications and alerts" },
  { key: "action-required", label: "Action Required", description: "Consolidated list of items requiring your attention — overdue reviews, pending approvals, proposed changes" },
  { key: "priority-actions", label: "Priority Action Cards", description: "P1/P2/P3 action breakdown with counts" },
  { key: "risk-acceptances", label: "Risk Acceptances", description: "Risk acceptance status summary and review timelines" },
  { key: "compliance-health", label: "Compliance Health", description: "Regulatory compliance status and gap analysis" },
  { key: "controls-library", label: "Controls Library", description: "Control type breakdown and policy coverage" },
  { key: "cross-entity", label: "Cross-Entity Insights", description: "Risks with failing controls and policy coverage gaps" },
  { key: "policy-health", label: "Policy Health Summary", description: "Policy status overview and overdue reviews" },
  { key: "risks-in-focus", label: "Risks in Focus", description: "Starred risks for board-level visibility" },
  { key: "pending-approvals", label: "Pending Approvals", description: "New entities awaiting CCRO approval" },
  { key: "proposed-changes", label: "Proposed Changes", description: "Pending field-level changes requiring review" },
  { key: "action-tracking", label: "Action Tracking", description: "Open, overdue, and completed action statistics" },
  { key: "overdue-metrics", label: "Overdue Metrics", description: "Consumer Duty measures not updated in 30+ days" },
  { key: "tasks-reviews", label: "Tasks & Reviews", description: "Risk reviews, personal actions, and assigned metrics" },
  { key: "consumer-duty", label: "Consumer Duty Overview", description: "RAG status summary for Consumer Duty outcomes" },
  { key: "risk-summary", label: "Risk Summary", description: "Risk register summary with heatmap indicators" },
  { key: "programme-health", label: "Programme Health", description: "Arc-gauge scorecard for Risk, Actions, Consumer Duty and Compliance health" },
  { key: "reports", label: "Reports", description: "Recent and published reports" },
  { key: "recent-activity", label: "Recent Activity", description: "Latest audit log entries" },
  { key: "horizon-scanning", label: "Horizon Scanning", description: "Regulatory & business environment monitor — urgency breakdown and in-focus item" },
];

export const DEFAULT_SECTION_ORDER = DASHBOARD_SECTIONS.map((s) => s.key);

/**
 * Default section order for CCRO_TEAM users with no saved layout.
 * Puts the highest-priority CCRO sections above the fold:
 * Action Required → Proposed Changes → Compliance Health → Risks in Focus
 */
export const CCRO_DEFAULT_SECTION_ORDER: string[] = (() => {
  const priority = [
    "welcome",
    "notifications",
    "action-required",
    "proposed-changes",
    "compliance-health",
    "risks-in-focus",
    "pending-approvals",
    "programme-health",
  ];
  const rest = DEFAULT_SECTION_ORDER.filter((k) => !priority.includes(k));
  return [...priority, ...rest];
})();

/**
 * Sections hidden by default for each role when the user has no saved layout.
 * CCRO_TEAM sees everything. OWNERs and REVIEWERs have CCRO-only sections hidden.
 */
export const ROLE_DEFAULT_HIDDEN: Record<string, string[]> = {
  OWNER: [
    "pending-approvals",   // Only CCRO reviews new entity submissions
    "proposed-changes",    // Only CCRO reviews field-level change proposals
    "cross-entity",        // Board/CCRO cross-entity reporting
    "policy-health",       // Policy management is CCRO domain
    "overdue-metrics",     // CCRO oversight of Consumer Duty measure updates
    "programme-health",    // CCRO-level portfolio scorecard
  ],
  REVIEWER: [
    "pending-approvals",
    "proposed-changes",
    "cross-entity",
    "overdue-metrics",
    "programme-health",    // CCRO-level portfolio scorecard
  ],
};

/**
 * Default react-grid-layout positions for all 21 dashboard sections.
 * y: Infinity lets RGL auto-pack vertically on first render.
 * These widths/heights are the recommended starting sizes; users can resize freely.
 */
export const DEFAULT_GRID_LAYOUT: RGLLayoutItem[] = [
  { i: "welcome",           x: 0, y: 0,        w: 12, h: 4,  minW: 4, minH: 2 },
  { i: "notifications",     x: 0, y: 4,        w: 6,  h: 3,  minW: 3, minH: 2 },
  { i: "action-required",   x: 6, y: 4,        w: 6,  h: 4,  minW: 3, minH: 2 },
  { i: "priority-actions",  x: 0, y: 8,        w: 12, h: 6,  minW: 4, minH: 3 },
  { i: "risk-acceptances",  x: 0, y: 14,       w: 8,  h: 6,  minW: 4, minH: 3 },
  { i: "compliance-health", x: 8, y: 14,       w: 4,  h: 6,  minW: 3, minH: 3 },
  { i: "controls-library",  x: 0, y: 20,       w: 6,  h: 4,  minW: 3, minH: 2 },
  { i: "policy-health",     x: 6, y: 20,       w: 6,  h: 4,  minW: 3, minH: 2 },
  { i: "cross-entity",      x: 0, y: 24,       w: 12, h: 7,  minW: 4, minH: 3 },
  { i: "risks-in-focus",    x: 0, y: 31,       w: 6,  h: 8,  minW: 3, minH: 3 },
  { i: "pending-approvals", x: 6, y: 31,       w: 6,  h: 7,  minW: 3, minH: 3 },
  { i: "proposed-changes",  x: 0, y: 39,       w: 6,  h: 8,  minW: 3, minH: 3 },
  { i: "action-tracking",   x: 0, y: 47,       w: 8,  h: 9,  minW: 4, minH: 3 },
  { i: "overdue-metrics",   x: 8, y: 47,       w: 4,  h: 7,  minW: 3, minH: 3 },
  { i: "tasks-reviews",     x: 0, y: 56,       w: 12, h: 10, minW: 4, minH: 4 },
  { i: "consumer-duty",     x: 0, y: 66,       w: 4,  h: 8,  minW: 3, minH: 3 },
  { i: "risk-summary",      x: 4, y: 66,       w: 8,  h: 10, minW: 4, minH: 4 },
  { i: "programme-health",  x: 0, y: 76,       w: 6,  h: 6,  minW: 3, minH: 3 },
  { i: "reports",           x: 6, y: 76,       w: 6,  h: 7,  minW: 3, minH: 3 },
  { i: "recent-activity",   x: 0, y: 83,       w: 6,  h: 7,  minW: 3, minH: 3 },
  { i: "horizon-scanning",  x: 0, y: 90,       w: 12, h: 6,  minW: 4, minH: 3 },
];
