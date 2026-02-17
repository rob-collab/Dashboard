export type Role = "CCRO_TEAM" | "OWNER" | "VIEWER";
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

export interface ImageBlockContent {
  src: string;
  alt: string;
  caption: string;
  width: number | null;
  alignment: "left" | "center" | "right";
  objectFit: "contain" | "cover" | "fill";
}

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
  snapshots?: MetricSnapshot[];
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
  status: ActionStatus;
  priority: ActionPriority | null;
  assignedTo: string;
  assignee?: User;
  createdBy: string;
  creator?: User;
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
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  controls?: RiskControl[];
  mitigations?: RiskMitigation[];
  auditTrail?: RiskAuditEntry[];
  snapshots?: RiskSnapshot[];
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
  isActive: boolean;
  standingComments: string | null;
  createdAt: string;
  createdById: string;
  archivedAt: string | null;
  updatedAt: string;
  testingSchedule?: TestingScheduleEntry | null;
  attestations?: ControlAttestation[];
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
