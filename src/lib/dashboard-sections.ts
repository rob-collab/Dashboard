/**
 * Dashboard section registry.
 * Each section has a unique key, label, and description.
 * The DEFAULT_SECTION_ORDER defines the canonical order matching the current hardcoded layout.
 * The DEFAULT_GRID_LAYOUT defines default react-grid-layout positions for each section.
 */
import type { RGLLayoutItem, DashboardElementDef } from "@/lib/types";

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
  { key: "control-health", label: "Control Health Trend", description: "6-month pass rate trend for all active controls — trajectory at a glance" },
  { key: "quarterly-summary", label: "Quarterly Summary", description: "Per-quarter test result pass rates and historical comparison" },
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
    "control-health",      // CCRO-level control testing oversight
    "quarterly-summary",   // CCRO-level quarterly review
  ],
  REVIEWER: [
    "pending-approvals",
    "proposed-changes",
    "cross-entity",
    "overdue-metrics",
    "programme-health",    // CCRO-level portfolio scorecard
    "control-health",
    "quarterly-summary",
  ],
};

/**
 * Default react-grid-layout positions for all 21 dashboard sections.
 * y: Infinity lets RGL auto-pack vertically on first render.
 * These widths/heights are the recommended starting sizes; users can resize freely.
 */
/**
 * rowHeight = 40px. Heights calibrated so each section comfortably shows its
 * content without excessive empty space. Users can resize freely in edit mode.
 *
 * Side-by-side pairs share the same y value; max(h) of the pair determines
 * the next row's y so sections always stack flush.
 *
 * y-offsets (cumulative):
 *   welcome        y=0   h=5  → next=5
 *   notif/action   y=5   h=3/6 → next=11
 *   priority       y=11  h=8  → next=19
 *   risk-acc/comp  y=19  h=10/8 → next=29
 *   controls/pol   y=29  h=7/7 → next=36
 *   cross-entity   y=36  h=10 → next=46
 *   focus/approvals y=46 h=10/9 → next=56
 *   proposed-ch    y=56  h=10 → next=66
 *   action/overdue y=66  h=11/8 → next=77
 *   tasks-reviews  y=77  h=12 → next=89
 *   consumer/risk  y=89  h=10/12 → next=101
 *   prog/reports   y=101 h=5/9  → next=110
 *   recent-act     y=110 h=9  → next=119
 *   horizon        y=119 h=8  → next=127
 */
export const DEFAULT_GRID_LAYOUT: RGLLayoutItem[] = [
  { i: "welcome",           x: 0, y: 0,   w: 12, h: 5,  minW: 4, minH: 4 },
  { i: "notifications",     x: 0, y: 5,   w: 6,  h: 3,  minW: 3, minH: 3 },
  { i: "action-required",   x: 6, y: 5,   w: 6,  h: 6,  minW: 3, minH: 4 },
  { i: "priority-actions",  x: 0, y: 11,  w: 12, h: 8,  minW: 4, minH: 6 },
  { i: "risk-acceptances",  x: 0, y: 19,  w: 8,  h: 10, minW: 4, minH: 6 },
  { i: "compliance-health", x: 8, y: 19,  w: 4,  h: 8,  minW: 3, minH: 6 },
  { i: "controls-library",  x: 0, y: 29,  w: 6,  h: 7,  minW: 3, minH: 4 },
  { i: "policy-health",     x: 6, y: 29,  w: 6,  h: 7,  minW: 3, minH: 4 },
  { i: "cross-entity",      x: 0, y: 36,  w: 12, h: 10, minW: 4, minH: 6 },
  { i: "risks-in-focus",    x: 0, y: 46,  w: 6,  h: 10, minW: 3, minH: 6 },
  { i: "pending-approvals", x: 6, y: 46,  w: 6,  h: 9,  minW: 3, minH: 6 },
  { i: "proposed-changes",  x: 0, y: 56,  w: 6,  h: 10, minW: 3, minH: 6 },
  { i: "action-tracking",   x: 0, y: 66,  w: 8,  h: 11, minW: 4, minH: 6 },
  { i: "overdue-metrics",   x: 8, y: 66,  w: 4,  h: 8,  minW: 3, minH: 6 },
  { i: "tasks-reviews",     x: 0, y: 77,  w: 12, h: 12, minW: 4, minH: 8 },
  { i: "consumer-duty",     x: 0, y: 89,  w: 4,  h: 10, minW: 3, minH: 6 },
  { i: "risk-summary",      x: 4, y: 89,  w: 8,  h: 12, minW: 4, minH: 8 },
  { i: "programme-health",  x: 0, y: 101, w: 6,  h: 5,  minW: 3, minH: 4 },
  { i: "reports",           x: 6, y: 101, w: 6,  h: 9,  minW: 3, minH: 6 },
  { i: "recent-activity",   x: 0, y: 110, w: 6,  h: 9,  minW: 3, minH: 6 },
  { i: "horizon-scanning",  x: 0, y: 119, w: 12, h: 8,  minW: 4, minH: 6 },
  { i: "control-health",   x: 0, y: 127, w: 6,  h: 10, minW: 3, minH: 6 },
  { i: "quarterly-summary",x: 6, y: 127, w: 6,  h: 10, minW: 3, minH: 6 },
];

/**
 * Inner element registry — Phase 1 sections only.
 * Each entry defines the draggable/hideable elements within a section.
 * Sections not in this map are treated as atomic (no inner element control).
 *
 * Element IDs are short strings without section prefix.
 * The composite key used in hiddenElements is "sectionKey:elementId".
 */
export const SECTION_ELEMENTS: Record<string, DashboardElementDef[]> = {
  "compliance-health": [
    { id: "stat-compliant",   label: "Compliant %",          description: "Percentage of regulations in compliant status" },
    { id: "stat-applicable",  label: "Applicable",            description: "Total applicable regulatory requirements" },
    { id: "stat-gaps",        label: "Open Gaps",             description: "Regulations with identified compliance gaps" },
    { id: "stat-assessments", label: "Overdue Assessments",   description: "Overdue compliance assessments" },
    { id: "stat-certs",       label: "Pending Certs",         description: "Pending SMCR certifications" },
  ],
  "controls-library": [
    { id: "stat-total",        label: "Total Controls",       description: "Total controls in the library" },
    { id: "stat-preventative", label: "Preventative",         description: "Preventative control count" },
    { id: "stat-detective",    label: "Detective",            description: "Detective control count" },
    { id: "stat-directive",    label: "Directive",            description: "Directive control count" },
    { id: "stat-corrective",   label: "Corrective",           description: "Corrective control count" },
    { id: "stat-policies",     label: "Policies Covered",     description: "Controls linked to at least one policy" },
  ],
  "policy-health": [
    { id: "stat-total",        label: "Total Policies",       description: "Total policies in the register" },
    { id: "stat-overdue",      label: "Overdue",              description: "Policies past their review date" },
    { id: "stat-requirements", label: "Requirements",         description: "Total regulatory requirements mapped" },
    { id: "stat-links",        label: "Control Links",        description: "Controls linked to policies" },
  ],
  "priority-actions": [
    { id: "card-p1",           label: "P1 — Critical",        description: "Critical priority actions" },
    { id: "card-p2",           label: "P2 — Important",       description: "Important priority actions" },
    { id: "card-p3",           label: "P3 — Routine",         description: "Routine priority actions" },
  ],
  "risk-summary": [
    { id: "stat-total",        label: "Total Risks",          description: "Total risks in the register" },
    { id: "stat-low",          label: "Low Risks",            description: "Risks scored as Low" },
    { id: "stat-medium",       label: "Medium Risks",         description: "Risks scored as Medium" },
    { id: "stat-high",         label: "High Risks",           description: "Risks scored as High" },
  ],
};
