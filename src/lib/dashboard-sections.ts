/**
 * Dashboard section registry.
 * Each section has a unique key, label, and description.
 * The DEFAULT_SECTION_ORDER defines the canonical order matching the current hardcoded layout.
 */

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
  { key: "reports", label: "Reports", description: "Recent and published reports" },
  { key: "recent-activity", label: "Recent Activity", description: "Latest audit log entries" },
];

export const DEFAULT_SECTION_ORDER = DASHBOARD_SECTIONS.map((s) => s.key);

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
  ],
  REVIEWER: [
    "pending-approvals",
    "proposed-changes",
    "cross-entity",
    "overdue-metrics",
  ],
};
