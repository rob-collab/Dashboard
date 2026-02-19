export type Role = "CCRO_TEAM" | "CEO" | "OWNER" | "VIEWER";
export type ApprovalStatus = "APPROVED" | "PENDING_APPROVAL" | "REJECTED";
export type ReportStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type RAGStatus = "GOOD" | "WARNING" | "HARM";
export type SectionType =
  | "TEXT_BLOCK"
  | "DATA_TABLE"
  | "CONSUMER_DUTY_DASHBOARD"
  | "CHART"
  | "CARD_GRID"
  | "IMPORTED_COMPONENT"
  | "TEMPLATE_INSTANCE"
  | "ACCORDION"
  | "IMAGE_BLOCK";

export type ActionStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "PROPOSED_CLOSED";
export type ActionPriority = "P1" | "P2" | "P3";
export type ChangeStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface BrandingConfig {
  logoSrc: string | null;
  logoAlt: string;
  logoWidth: number;
  companyName: string;
  showInHeader: boolean;
  showInFooter: boolean;
  dashboardIconSrc: string | null;
  dashboardIconAlt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  assignedMeasures: string[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Report {
  id: string;
  title: string;
  period: string;
  status: ReportStatus;
  createdBy: string;
  creator?: User;
  createdAt: string;
  updatedAt: string;
  sections?: Section[];
  outcomes?: ConsumerDutyOutcome[];
  versions?: ReportVersion[];
}

export interface Section {
  id: string;
  reportId: string;
  type: SectionType;
  position: number;
  title: string | null;
  content: Record<string, unknown>;
  layoutConfig: LayoutConfig;
  styleConfig: StyleConfig;
  templateId: string | null;
  componentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LayoutConfig {
  columns?: number;
  width?: "full" | "half" | "third" | "quarter";
  columnSpan?: number;
  layout?: "single" | "two-col" | "three-col" | "sidebar" | "card-grid" | "bento";
  gap?: number;
}

export interface StyleConfig {
  backgroundColor?: string;
  backgroundGradient?: string;
  backgroundOpacity?: number;
  borderStyle?: "solid" | "dashed" | "none";
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  borderPosition?: "all" | "left" | "top" | "bottom";
  shadowDepth?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  margin?: { top: number; right: number; bottom: number; left: number };
  fontFamily?: string;
  fontSize?: string;
}

export interface ConsumerDutyOutcome {
  id: string;
  reportId?: string;
  outcomeId: string;
  name: string;
  shortDesc: string;
  detailedDescription?: string | null;
  riskOwner?: string | null;
  previousRAG?: RAGStatus | null;
  mitigatingActions?: string | null;
  monthlySummary?: string | null;
  icon: string | null;
  ragStatus: RAGStatus;
  position: number;
  measures?: ConsumerDutyMeasure[];
}

export interface ConsumerDutyMeasure {
  id: string;
  outcomeId: string;
  measureId: string;
  name: string;
  owner: string | null;
  summary: string;
  ragStatus: RAGStatus;
  position: number;
  lastUpdatedAt: string | null;
  updatedById: string | null;
  metrics?: ConsumerDutyMI[];
}

export interface ConsumerDutyMI {
  id: string;
  measureId: string;
  metric: string;
  current: string;
  previous: string;
  change: string;
  ragStatus: RAGStatus;
  appetite: string | null;
  appetiteOperator: string | null;
  narrative: string | null;
  snapshots?: MetricSnapshot[];
  actions?: Action[];
}

export interface MetricSnapshot {
  id: string;
  miId: string;
  month: string;
  value: string;
  ragStatus: RAGStatus;
  createdAt: string;
}

export interface ReportVersion {
  id: string;
  reportId: string;
  version: number;
  snapshotData: Record<string, unknown>;
  htmlExport: string | null;
  publishedBy: string;
  publisher?: User;
  publishedAt: string;
  publishNote: string | null;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string | null;
  layoutConfig: Record<string, unknown>;
  styleConfig: Record<string, unknown>;
  contentSchema: ContentField[];
  sectionType: SectionType;
  createdBy: string;
  creator?: User;
  isGlobal: boolean;
  version: number;
  createdAt: string;
}

export interface ContentField {
  key: string;
  label: string;
  type: "text" | "richtext" | "table" | "number" | "date" | "rag";
  required?: boolean;
  defaultValue?: string;
}

export interface ImportedComponent {
  id: string;
  name: string;
  description: string;
  category: string;
  htmlContent: string;
  cssContent: string | null;
  jsContent: string | null;
  version: string;
  sanitized: boolean;
  createdBy: string;
  creator?: User;
  createdAt: string;
}

export interface Action {
  id: string;
  reference: string;
  reportId: string | null;
  reportPeriod: string | null;
  source: string | null;
  sectionId: string | null;
  sectionTitle: string | null;
  title: string;
  description: string;
  issueDescription: string | null;
  status: ActionStatus;
  approvalStatus: ApprovalStatus;
  priority: ActionPriority | null;
  assignedTo: string;
  assignee?: User;
  createdBy: string;
  creator?: User;
  controlId: string | null;
  control?: ControlRecord;
  consumerDutyMIId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  changes?: ActionChange[];
  report?: Report;
  linkedMitigation?: RiskMitigation;
}

export interface ActionChange {
  id: string;
  actionId: string;
  proposedBy: string;
  proposer?: User;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  proposedAt: string;
  status: ChangeStatus;
  reviewedBy: string | null;
  reviewer?: User;
  reviewedAt: string | null;
  reviewNote: string | null;
  evidenceUrl: string | null;
  evidenceName: string | null;
  isUpdate: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  user?: User;
  userRole: Role;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  reportId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

// ── Risk Register ──────────────────────────────────────────────────────────────

export type ControlEffectiveness = "EFFECTIVE" | "PARTIALLY_EFFECTIVE" | "INEFFECTIVE";
export type RiskAppetite = "VERY_LOW" | "LOW" | "LOW_TO_MODERATE" | "MODERATE";
export type DirectionOfTravel = "IMPROVING" | "STABLE" | "DETERIORATING";
export type MitigationStatus = "OPEN" | "IN_PROGRESS" | "COMPLETE";

export interface RiskControl {
  id: string;
  riskId: string;
  description: string;
  controlOwner: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface RiskMitigation {
  id: string;
  riskId: string;
  action: string;
  owner: string | null;
  deadline: string | null;
  status: MitigationStatus;
  priority: ActionPriority | null;
  actionId: string | null;
  createdAt: string;
}

export interface RiskAuditEntry {
  id: string;
  riskId: string;
  userId: string;
  action: string;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
}

export interface RiskSnapshot {
  id: string;
  riskId: string;
  month: string;
  residualLikelihood: number;
  residualImpact: number;
  inherentLikelihood: number;
  inherentImpact: number;
  directionOfTravel: DirectionOfTravel;
}

export interface Risk {
  id: string;
  reference: string;
  name: string;
  description: string;
  categoryL1: string;
  categoryL2: string;
  ownerId: string;
  riskOwner?: User;
  inherentLikelihood: number;
  inherentImpact: number;
  residualLikelihood: number;
  residualImpact: number;
  controlEffectiveness: ControlEffectiveness | null;
  riskAppetite: RiskAppetite | null;
  directionOfTravel: DirectionOfTravel;
  reviewFrequencyDays: number;
  reviewRequested: boolean;
  lastReviewed: string;
  inFocus: boolean;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  controls?: RiskControl[];
  mitigations?: RiskMitigation[];
  auditTrail?: RiskAuditEntry[];
  snapshots?: RiskSnapshot[];
  changes?: RiskChange[];
  controlLinks?: RiskControlLink[];
}

export interface RiskChange {
  id: string;
  riskId: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  status: ChangeStatus;
  proposedBy: string;
  proposer?: User;
  proposedAt: string;
  reviewedBy: string | null;
  reviewer?: User;
  reviewNote: string | null;
}

export interface DashboardNotification {
  id: string;
  message: string;
  type: "info" | "warning" | "urgent";
  active: boolean;
  targetRoles: Role[] | string[];
  createdBy: string;
  creator?: User;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface RiskCategoryDef {
  name: string;
  definition: string;
  subcategories: { name: string; definition: string }[];
}

export interface RiskCategoryDB {
  id: string;
  level: number;
  parentId: string | null;
  name: string;
  definition: string;
  children?: RiskCategoryDB[];
}

export interface PriorityDefinition {
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  updatedAt: string;
}

export interface SiteSettings {
  id: string;
  logoBase64: string | null;
  logoMarkBase64: string | null;
  logoX: number;
  logoY: number;
  logoScale: number;
  primaryColour: string | null;
  accentColour: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

// ── Controls Testing Module ──────────────────────────────────────────────────

export type ControlFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BI_ANNUAL" | "ANNUAL" | "EVENT_DRIVEN";
export type TestingFrequency = "MONTHLY" | "QUARTERLY" | "BI_ANNUAL" | "ANNUAL";
export type TestResultValue = "PASS" | "FAIL" | "PARTIALLY" | "NOT_TESTED" | "NOT_DUE";
export type QuarterlySummaryStatus = "DRAFT" | "SUBMITTED" | "APPROVED";
export type ConsumerDutyOutcomeType = "PRODUCTS_AND_SERVICES" | "CONSUMER_UNDERSTANDING" | "CONSUMER_SUPPORT" | "GOVERNANCE_CULTURE_OVERSIGHT";
export type InternalOrThirdParty = "INTERNAL" | "THIRD_PARTY";
export type ControlType = "PREVENTATIVE" | "DETECTIVE" | "CORRECTIVE" | "DIRECTIVE";

export const CONTROL_TYPE_LABELS: Record<ControlType, string> = {
  PREVENTATIVE: "Preventative",
  DETECTIVE: "Detective",
  CORRECTIVE: "Corrective",
  DIRECTIVE: "Directive",
};

export const CD_OUTCOME_LABELS: Record<ConsumerDutyOutcomeType, string> = {
  PRODUCTS_AND_SERVICES: "Products and Services",
  CONSUMER_UNDERSTANDING: "Consumer Understanding",
  CONSUMER_SUPPORT: "Consumer Support",
  GOVERNANCE_CULTURE_OVERSIGHT: "Governance, Culture and Oversight",
};

export const CONTROL_FREQUENCY_LABELS: Record<ControlFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  BI_ANNUAL: "Bi-annual",
  ANNUAL: "Annual",
  EVENT_DRIVEN: "Event-driven",
};

export const TESTING_FREQUENCY_LABELS: Record<TestingFrequency, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  BI_ANNUAL: "Bi-annual",
  ANNUAL: "Annual",
};

export const TEST_RESULT_LABELS: Record<TestResultValue, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  PARTIALLY: "Partially",
  NOT_TESTED: "Not Tested",
  NOT_DUE: "Not Due",
};

export const TEST_RESULT_COLOURS: Record<TestResultValue, { bg: string; text: string; dot: string }> = {
  PASS: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  FAIL: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  PARTIALLY: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  NOT_TESTED: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  NOT_DUE: { bg: "bg-gray-50", text: "text-gray-400", dot: "bg-gray-300" },
};

export interface ControlBusinessArea {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface ControlRecord {
  id: string;
  controlRef: string;
  controlName: string;
  controlDescription: string;
  businessAreaId: string;
  businessArea?: ControlBusinessArea;
  controlOwnerId: string;
  controlOwner?: User;
  consumerDutyOutcome: ConsumerDutyOutcomeType;
  controlFrequency: ControlFrequency;
  internalOrThirdParty: InternalOrThirdParty;
  controlType: ControlType | null;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  standingComments: string | null;
  createdAt: string;
  createdById: string;
  archivedAt: string | null;
  updatedAt: string;
  testingSchedule?: TestingScheduleEntry | null;
  attestations?: ControlAttestation[];
  changes?: ControlChange[];
  actions?: Action[];
  riskLinks?: RiskControlLink[];
  regulationLinks?: RegulationControlLink[];
}

export interface ControlAttestation {
  id: string;
  controlId: string;
  periodYear: number;
  periodMonth: number;
  attested: boolean;
  attestedById: string;
  attestedBy?: User;
  attestedAt: string;
  comments: string | null;
  issuesFlagged: boolean;
  issueDescription: string | null;
  ccroReviewedById: string | null;
  ccroReviewedBy?: User;
  ccroReviewedAt: string | null;
  ccroAgreement: boolean | null;
  ccroComments: string | null;
}

export interface ControlChange {
  id: string;
  controlId: string;
  proposedBy: string;
  proposer?: User;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  rationale: string;
  proposedAt: string;
  status: ChangeStatus;
  reviewedBy: string | null;
  reviewer?: User;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface TestingScheduleEntry {
  id: string;
  controlId: string;
  control?: ControlRecord;
  testingFrequency: TestingFrequency;
  assignedTesterId: string;
  assignedTester?: User;
  summaryOfTest: string;
  isActive: boolean;
  standingComments: string | null;
  addedAt: string;
  addedById: string;
  removedAt: string | null;
  removedReason: string | null;
  testResults?: ControlTestResult[];
  quarterlySummaries?: QuarterlySummaryRecord[];
}

export interface ControlTestResult {
  id: string;
  scheduleEntryId: string;
  periodYear: number;
  periodMonth: number;
  result: TestResultValue;
  testedById: string;
  testedBy?: User;
  testedDate: string;
  effectiveDate: string | null;
  notes: string | null;
  evidenceLinks: string[];
  isBackdated: boolean;
  updatedAt: string;
  updatedById: string | null;
}

export interface QuarterlySummaryRecord {
  id: string;
  scheduleEntryId: string;
  quarter: string;
  narrative: string;
  authorId: string;
  author?: User;
  status: QuarterlySummaryStatus;
  approvedById: string | null;
  approvedBy?: User;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ExcoControlVisibility = "SHOW" | "SUMMARY_ONLY" | "HIDE";

export interface ExcoViewConfig {
  id: string;
  periodYear: number;
  periodMonth: number;
  showDashboardSummary: boolean;
  showPassRateByArea: boolean;
  showPassRateByCDOutcome: boolean;
  showAttestationOverview: boolean;
  showAttentionRequired: boolean;
  showTrendAnalysis: boolean;
  showQuarterlySummaries: boolean;
  controlVisibility: Record<string, ExcoControlVisibility>;
  configuredById: string;
  configuredBy?: User;
  createdAt: string;
  updatedAt: string;
}

// ── Policy Review Module ──────────────────────────────────────────────────

export type PolicyStatus = "CURRENT" | "OVERDUE" | "UNDER_REVIEW" | "ARCHIVED";
export type RegulationType = "HANDBOOK_RULE" | "PRINCIPLE" | "LEGISLATION" | "STATUTORY_INSTRUMENT" | "GUIDANCE" | "INDUSTRY_CODE";

export interface Regulation {
  id: string;
  reference: string;
  name: string;
  shortName: string | null;
  body: string;
  type: RegulationType;
  provisions: string | null;
  url: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  // Hierarchy
  parentId: string | null;
  parent?: Regulation;
  children?: Regulation[];
  level: number;
  // Regulatory
  regulatoryBody: string | null;
  applicability: Applicability;
  applicabilityNotes: string | null;
  isApplicable: boolean;
  isActive: boolean;
  // SMF Accountability
  primarySMF: string | null;
  secondarySMF: string | null;
  smfNotes: string | null;
  // Compliance Assessment
  complianceStatus: ComplianceStatus;
  lastAssessedAt: string | null;
  nextReviewDate: string | null;
  assessmentNotes: string | null;
  // Links
  policyLinks?: PolicyRegulatoryLink[];
  controlLinks?: RegulationControlLink[];
}

export interface PolicyRegulatoryLink {
  id: string;
  policyId: string;
  regulationId: string;
  regulation?: Regulation;
  policySections: string | null;
  notes: string | null;
  linkedAt: string;
  linkedBy: string;
}

export interface PolicyControlLink {
  id: string;
  policyId: string;
  controlId: string;
  control?: ControlRecord;
  notes: string | null;
  linkedAt: string;
  linkedBy: string;
}

export interface PolicyObligationSection {
  name: string;
  regulationRefs: string[];
  controlRefs: string[];
}

export interface PolicyObligation {
  id: string;
  policyId: string;
  reference: string;
  category: string;
  description: string;
  regulationRefs: string[];
  controlRefs: string[];
  sections: PolicyObligationSection[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyAuditEntry {
  id: string;
  policyId: string;
  userId: string;
  action: string;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  details: string | null;
  changedAt: string;
}

export interface Policy {
  id: string;
  reference: string;
  name: string;
  description: string;
  status: PolicyStatus;
  version: string;
  ownerId: string;
  owner?: User;
  approvedBy: string | null;
  classification: string;
  reviewFrequencyDays: number;
  lastReviewedDate: string | null;
  nextReviewDate: string | null;
  effectiveDate: string | null;
  scope: string | null;
  applicability: string | null;
  exceptions: string | null;
  relatedPolicies: string[];
  storageUrl: string | null;
  approvingBody: string | null;
  consumerDutyOutcomes: string[];
  createdAt: string;
  updatedAt: string;
  regulatoryLinks?: PolicyRegulatoryLink[];
  controlLinks?: PolicyControlLink[];
  obligations?: PolicyObligation[];
  auditTrail?: PolicyAuditEntry[];
}

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  CURRENT: "Current",
  OVERDUE: "Overdue",
  UNDER_REVIEW: "Under Review",
  ARCHIVED: "Archived",
};

export const POLICY_STATUS_COLOURS: Record<PolicyStatus, { bg: string; text: string }> = {
  CURRENT: { bg: "bg-green-100", text: "text-green-700" },
  OVERDUE: { bg: "bg-red-100", text: "text-red-700" },
  UNDER_REVIEW: { bg: "bg-amber-100", text: "text-amber-700" },
  ARCHIVED: { bg: "bg-gray-100", text: "text-gray-600" },
};

export const CONSUMER_DUTY_OUTCOME_LABELS: Record<string, string> = {
  "products-services": "Products & Services",
  "price-value": "Price & Value",
  "consumer-understanding": "Consumer Understanding",
  "consumer-support": "Consumer Support",
};

export const CONSUMER_DUTY_OUTCOME_COLOURS: Record<string, { bg: string; text: string; icon: string }> = {
  "products-services": { bg: "bg-blue-100", text: "text-blue-700", icon: "text-blue-500" },
  "price-value": { bg: "bg-emerald-100", text: "text-emerald-700", icon: "text-emerald-500" },
  "consumer-understanding": { bg: "bg-purple-100", text: "text-purple-700", icon: "text-purple-500" },
  "consumer-support": { bg: "bg-amber-100", text: "text-amber-700", icon: "text-amber-500" },
};

export const REGULATION_TYPE_LABELS: Record<RegulationType, string> = {
  HANDBOOK_RULE: "Handbook Rule",
  PRINCIPLE: "Principle",
  LEGISLATION: "Legislation",
  STATUTORY_INSTRUMENT: "Statutory Instrument",
  GUIDANCE: "Guidance",
  INDUSTRY_CODE: "Industry Code",
};

export const REGULATION_TYPE_COLOURS: Record<RegulationType, { bg: string; text: string }> = {
  HANDBOOK_RULE: { bg: "bg-blue-100", text: "text-blue-700" },
  PRINCIPLE: { bg: "bg-purple-100", text: "text-purple-700" },
  LEGISLATION: { bg: "bg-red-100", text: "text-red-700" },
  STATUTORY_INSTRUMENT: { bg: "bg-orange-100", text: "text-orange-700" },
  GUIDANCE: { bg: "bg-teal-100", text: "text-teal-700" },
  INDUSTRY_CODE: { bg: "bg-indigo-100", text: "text-indigo-700" },
};

// ── Risk Acceptance Module ──────────────────────────────────────────────────

export type RiskAcceptanceStatus =
  | "PROPOSED"
  | "CCRO_REVIEW"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED"
  | "EXPIRED";

export type RiskAcceptanceSource =
  | "RISK_REGISTER"
  | "CONTROL_TESTING"
  | "INCIDENT"
  | "AD_HOC";

export interface RiskAcceptance {
  id: string;
  reference: string;
  title: string;
  description: string;
  source: RiskAcceptanceSource;
  status: RiskAcceptanceStatus;
  riskId: string | null;
  risk?: Risk;
  proposerId: string;
  proposer?: User;
  approverId: string | null;
  approver?: User;
  proposedRationale: string;
  proposedConditions: string | null;
  approverRationale: string | null;
  ccroNote: string | null;
  reviewDate: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
  consumerDutyOutcomeId: string | null;
  consumerDutyOutcome?: ConsumerDutyOutcome;
  linkedControlId: string | null;
  linkedControl?: ControlRecord;
  linkedActionIds: string[];
  createdAt: string;
  updatedAt: string;
  comments?: RiskAcceptanceComment[];
  history?: RiskAcceptanceHistory[];
}

export interface RiskAcceptanceComment {
  id: string;
  acceptanceId: string;
  userId: string;
  user?: User;
  content: string;
  createdAt: string;
}

export interface RiskAcceptanceHistory {
  id: string;
  acceptanceId: string;
  userId: string | null;
  user?: User;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  details: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const RISK_ACCEPTANCE_STATUS_LABELS: Record<RiskAcceptanceStatus, string> = {
  PROPOSED: "Proposed",
  CCRO_REVIEW: "CCRO Review",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Returned",
  EXPIRED: "Expired",
};

export const RISK_ACCEPTANCE_STATUS_COLOURS: Record<RiskAcceptanceStatus, { bg: string; text: string }> = {
  PROPOSED: { bg: "bg-blue-100", text: "text-blue-700" },
  CCRO_REVIEW: { bg: "bg-purple-100", text: "text-purple-700" },
  AWAITING_APPROVAL: { bg: "bg-amber-100", text: "text-amber-700" },
  APPROVED: { bg: "bg-green-100", text: "text-green-700" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700" },
  RETURNED: { bg: "bg-orange-100", text: "text-orange-700" },
  EXPIRED: { bg: "bg-gray-100", text: "text-gray-600" },
};

export const RISK_ACCEPTANCE_SOURCE_LABELS: Record<RiskAcceptanceSource, string> = {
  RISK_REGISTER: "Risk Register",
  CONTROL_TESTING: "Control Testing",
  INCIDENT: "Incident",
  AD_HOC: "Ad Hoc",
};

// ── Approval Status (entity-level) ─────────────────────────────────────────

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  APPROVED: "Approved",
  PENDING_APPROVAL: "Pending Approval",
  REJECTED: "Rejected",
};

export const APPROVAL_STATUS_COLOURS: Record<ApprovalStatus, { bg: string; text: string }> = {
  APPROVED: { bg: "bg-green-100", text: "text-green-700" },
  PENDING_APPROVAL: { bg: "bg-amber-100", text: "text-amber-700" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700" },
};

// ── Risk ↔ Control Library Link ─────────────────────────────────────────────

export interface RiskControlLink {
  id: string;
  riskId: string;
  controlId: string;
  control?: Pick<ControlRecord, "id" | "controlRef" | "controlName"> & { businessArea?: ControlBusinessArea };
  risk?: Pick<Risk, "id" | "reference" | "name" | "residualLikelihood" | "residualImpact">;
  linkedAt: string;
  linkedBy: string;
  notes: string | null;
}

// ── Compliance Universe ──────────────────────────────────────────────────────

export type Applicability = "CORE" | "HIGH" | "MEDIUM" | "LOW" | "N_A" | "ASSESS";
export type ComplianceStatus = "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_ASSESSED" | "GAP_IDENTIFIED";
export type SMFStatus = "ACTIVE" | "VACANT" | "PENDING_APPROVAL";
export type CertificationStatus = "CURRENT" | "DUE" | "OVERDUE" | "LAPSED" | "REVOKED";
export type BreachStatus = "IDENTIFIED" | "UNDER_INVESTIGATION" | "CLOSED_NO_ACTION" | "CLOSED_DISCIPLINARY" | "REPORTED_TO_FCA";
export type DocumentStatus = "DOC_CURRENT" | "DOC_OVERDUE" | "DOC_DRAFT" | "DOC_NOT_STARTED";

export const APPLICABILITY_LABELS: Record<Applicability, string> = {
  CORE: "Core",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  N_A: "Not Applicable",
  ASSESS: "To Assess",
};

export const APPLICABILITY_COLOURS: Record<Applicability, { bg: string; text: string }> = {
  CORE: { bg: "bg-red-100", text: "text-red-700" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-700" },
  MEDIUM: { bg: "bg-amber-100", text: "text-amber-700" },
  LOW: { bg: "bg-blue-100", text: "text-blue-700" },
  N_A: { bg: "bg-gray-100", text: "text-gray-500" },
  ASSESS: { bg: "bg-purple-100", text: "text-purple-700" },
};

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  COMPLIANT: "Compliant",
  PARTIALLY_COMPLIANT: "Partially Compliant",
  NON_COMPLIANT: "Non-Compliant",
  NOT_ASSESSED: "Not Assessed",
  GAP_IDENTIFIED: "Gap Identified",
};

export const COMPLIANCE_STATUS_COLOURS: Record<ComplianceStatus, { bg: string; text: string; dot: string }> = {
  COMPLIANT: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  PARTIALLY_COMPLIANT: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  NON_COMPLIANT: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  NOT_ASSESSED: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  GAP_IDENTIFIED: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
};

export const SMF_STATUS_LABELS: Record<SMFStatus, string> = {
  ACTIVE: "Active",
  VACANT: "Vacant",
  PENDING_APPROVAL: "Pending Approval",
};

export const SMF_STATUS_COLOURS: Record<SMFStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: "bg-green-100", text: "text-green-700" },
  VACANT: { bg: "bg-red-100", text: "text-red-700" },
  PENDING_APPROVAL: { bg: "bg-amber-100", text: "text-amber-700" },
};

export const CERTIFICATION_STATUS_LABELS: Record<CertificationStatus, string> = {
  CURRENT: "Current",
  DUE: "Due",
  OVERDUE: "Overdue",
  LAPSED: "Lapsed",
  REVOKED: "Revoked",
};

export const CERTIFICATION_STATUS_COLOURS: Record<CertificationStatus, { bg: string; text: string }> = {
  CURRENT: { bg: "bg-green-100", text: "text-green-700" },
  DUE: { bg: "bg-amber-100", text: "text-amber-700" },
  OVERDUE: { bg: "bg-red-100", text: "text-red-700" },
  LAPSED: { bg: "bg-gray-100", text: "text-gray-600" },
  REVOKED: { bg: "bg-red-200", text: "text-red-800" },
};

export const BREACH_STATUS_LABELS: Record<BreachStatus, string> = {
  IDENTIFIED: "Identified",
  UNDER_INVESTIGATION: "Under Investigation",
  CLOSED_NO_ACTION: "Closed — No Action",
  CLOSED_DISCIPLINARY: "Closed — Disciplinary",
  REPORTED_TO_FCA: "Reported to FCA",
};

export const BREACH_STATUS_COLOURS: Record<BreachStatus, { bg: string; text: string }> = {
  IDENTIFIED: { bg: "bg-red-100", text: "text-red-700" },
  UNDER_INVESTIGATION: { bg: "bg-amber-100", text: "text-amber-700" },
  CLOSED_NO_ACTION: { bg: "bg-green-100", text: "text-green-700" },
  CLOSED_DISCIPLINARY: { bg: "bg-orange-100", text: "text-orange-700" },
  REPORTED_TO_FCA: { bg: "bg-purple-100", text: "text-purple-700" },
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  DOC_CURRENT: "Current",
  DOC_OVERDUE: "Overdue",
  DOC_DRAFT: "Draft",
  DOC_NOT_STARTED: "Not Started",
};

export const DOCUMENT_STATUS_COLOURS: Record<DocumentStatus, { bg: string; text: string }> = {
  DOC_CURRENT: { bg: "bg-green-100", text: "text-green-700" },
  DOC_OVERDUE: { bg: "bg-red-100", text: "text-red-700" },
  DOC_DRAFT: { bg: "bg-amber-100", text: "text-amber-700" },
  DOC_NOT_STARTED: { bg: "bg-gray-100", text: "text-gray-600" },
};

export interface RegulationControlLink {
  id: string;
  regulationId: string;
  controlId: string;
  regulation?: Regulation;
  control?: Pick<ControlRecord, "id" | "controlRef" | "controlName"> & { businessArea?: ControlBusinessArea };
  notes: string | null;
  linkedAt: string;
  linkedBy: string;
}

export interface SMFRole {
  id: string;
  smfId: string;
  title: string;
  shortTitle: string | null;
  description: string;
  fitsUpdraft: boolean;
  mandatory: boolean;
  currentHolderId: string | null;
  currentHolder?: User;
  status: SMFStatus;
  scope: string | null;
  keyDuties: string | null;
  regulatoryBasis: string | null;
  notes: string | null;
  appointmentDate: string | null;
  createdAt: string;
  updatedAt: string;
  responsibilities?: PrescribedResponsibility[];
}

export interface PrescribedResponsibility {
  id: string;
  prId: string;
  reference: string;
  title: string;
  description: string;
  mandatoryFor: string | null;
  suggestedSMF: string | null;
  assignedSMFId: string | null;
  assignedSMF?: SMFRole;
  scope: string | null;
  keyActivities: string | null;
  linkedDomains: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CertificationFunction {
  id: string;
  cfId: string;
  title: string;
  description: string;
  fitsUpdraft: boolean;
  examples: string | null;
  assessmentFrequency: string | null;
  fandpCriteria: string | null;
  createdAt: string;
  updatedAt: string;
  certifiedPersons?: CertifiedPerson[];
}

export interface CertifiedPerson {
  id: string;
  userId: string;
  user?: User;
  certificationFunctionId: string;
  certificationFunction?: CertificationFunction;
  certifiedDate: string | null;
  expiryDate: string | null;
  status: CertificationStatus;
  lastAssessmentDate: string | null;
  assessmentResult: string | null;
  assessorId: string | null;
  assessor?: User;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConductRule {
  id: string;
  ruleId: string;
  ruleType: string;
  appliesTo: string;
  title: string;
  description: string;
  examples: string | null;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
  breaches?: ConductRuleBreach[];
}

export interface ConductRuleBreach {
  id: string;
  reference: string;
  conductRuleId: string;
  conductRule?: ConductRule;
  userId: string;
  user?: User;
  dateIdentified: string;
  description: string;
  investigationNotes: string | null;
  status: BreachStatus;
  outcome: string | null;
  disciplinaryAction: string | null;
  reportedToFCA: boolean;
  fcaReportDate: string | null;
  reportedById: string | null;
  reportedBy?: User;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SMCRDocument {
  id: string;
  docId: string;
  title: string;
  description: string;
  requiredFor: string | null;
  template: string | null;
  updateTrigger: string | null;
  retention: string | null;
  status: DocumentStatus;
  lastUpdatedAt: string | null;
  nextUpdateDue: string | null;
  ownerId: string | null;
  owner?: User;
  storageUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Permission Records ──────────────────────────────────────────────────────

export interface RolePermissionRecord {
  id: string;
  role: Role;
  permission: string;
  granted: boolean;
}

export interface UserPermissionRecord {
  id: string;
  userId: string;
  permission: string;
  granted: boolean;
}
