export type Role = "CCRO_TEAM" | "METRIC_OWNER" | "VIEWER";
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

export type ActionStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
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
  reportId: string | null;
  reportPeriod: string | null;
  source: string | null;
  sectionId: string | null;
  sectionTitle: string | null;
  title: string;
  description: string;
  status: ActionStatus;
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
