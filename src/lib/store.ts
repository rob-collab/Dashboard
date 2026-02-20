import { create } from "zustand";
import type { User, Report, Section, Template, ImportedComponent, AuditLogEntry, ConsumerDutyOutcome, ConsumerDutyMeasure, ConsumerDutyMI, ReportVersion, BrandingConfig, Action, Risk, RiskCategoryDB, PriorityDefinition, SiteSettings, ControlRecord, ControlBusinessArea, TestingScheduleEntry, RiskAcceptance, Policy, Regulation, DashboardNotification, Role, RiskControlLink, SMFRole, PrescribedResponsibility, CertificationFunction, CertifiedPerson, ConductRule, ConductRuleBreach, SMCRDocument, ComplianceStatus, AccessRequest } from "./types";
import { api } from "./api-client";

interface AppState {
  // Hydration
  _hydrated: boolean;
  _hydrateError: string | null;
  hydrate: () => Promise<void>;

  // Auth
  authUser: User | null;
  setAuthUser: (user: User | null) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Reports
  reports: Report[];
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
  updateReport: (id: string, data: Partial<Report>) => void;
  deleteReport: (id: string) => void;
  currentReport: Report | null;
  setCurrentReport: (report: Report | null) => void;

  // Sections
  sections: Section[];
  setSections: (sections: Section[]) => void;
  updateSection: (id: string, data: Partial<Section>) => void;
  addSection: (section: Section) => void;
  removeSection: (id: string) => void;
  reorderSections: (startIndex: number, endIndex: number) => void;

  // Versions
  versions: ReportVersion[];
  addVersion: (version: ReportVersion) => void;

  // Consumer Duty Outcomes
  outcomes: ConsumerDutyOutcome[];
  setOutcomes: (outcomes: ConsumerDutyOutcome[]) => void;
  addOutcome: (outcome: ConsumerDutyOutcome) => void;
  updateOutcome: (id: string, data: Partial<ConsumerDutyOutcome>) => void;
  deleteOutcome: (id: string) => void;
  addMeasure: (outcomeId: string, measure: ConsumerDutyMeasure) => void;
  updateMeasure: (measureId: string, data: Partial<ConsumerDutyMeasure>) => void;
  deleteMeasure: (measureId: string) => void;
  bulkAddMeasures: (items: { outcomeId: string; measure: ConsumerDutyMeasure }[]) => void;
  updateMeasureMetrics: (measureId: string, metrics: ConsumerDutyMI[]) => void;

  // Templates
  templates: Template[];
  setTemplates: (templates: Template[]) => void;
  addTemplate: (template: Template) => void;
  updateTemplate: (id: string, data: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;

  // Components
  components: ImportedComponent[];
  setComponents: (components: ImportedComponent[]) => void;
  addComponent: (component: ImportedComponent) => void;
  deleteComponent: (id: string) => void;

  // Audit
  auditLogs: AuditLogEntry[];
  setAuditLogs: (logs: AuditLogEntry[]) => void;
  addAuditLog: (entry: AuditLogEntry) => void;

  // Actions
  actions: Action[];
  setActions: (actions: Action[]) => void;
  addAction: (action: Action) => void;
  updateAction: (id: string, data: Partial<Action>) => void;
  deleteAction: (id: string) => void;

  // Risks
  risks: Risk[];
  setRisks: (risks: Risk[]) => void;
  addRisk: (risk: Risk) => void;
  updateRisk: (id: string, data: Partial<Risk>) => void;
  deleteRisk: (id: string) => void;
  syncMitigationStatus: (actionId: string, newActionStatus: string) => void;

  // Users (in-memory CRUD)
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Branding
  branding: BrandingConfig;
  updateBranding: (data: Partial<BrandingConfig>) => void;

  // Site Settings (DB-persisted branding)
  siteSettings: SiteSettings | null;
  updateSiteSettings: (data: Partial<SiteSettings>) => void;

  // Risk Categories (DB-backed)
  riskCategories: RiskCategoryDB[];
  setRiskCategories: (cats: RiskCategoryDB[]) => void;

  // Priority Definitions (DB-backed)
  priorityDefinitions: PriorityDefinition[];
  setPriorityDefinitions: (defs: PriorityDefinition[]) => void;

  // Risk Acceptances
  riskAcceptances: RiskAcceptance[];
  riskAcceptancesLoading: boolean;
  setRiskAcceptances: (items: RiskAcceptance[]) => void;
  addRiskAcceptance: (item: RiskAcceptance) => void;
  updateRiskAcceptance: (id: string, data: Partial<RiskAcceptance>) => void;
  deleteRiskAcceptance: (id: string) => void;

  // Policy Review Module
  policies: Policy[];
  setPolicies: (items: Policy[]) => void;
  addPolicy: (item: Policy) => void;
  updatePolicy: (id: string, data: Partial<Policy>) => void;
  deletePolicy: (id: string) => void;
  regulations: Regulation[];
  setRegulations: (items: Regulation[]) => void;
  addRegulation: (item: Regulation) => void;
  updateRegulation: (id: string, data: Partial<Regulation>) => void;
  deleteRegulation: (id: string) => void;

  // Dashboard Notifications
  notifications: DashboardNotification[];
  setNotifications: (items: DashboardNotification[]) => void;
  addNotification: (item: DashboardNotification) => void;
  updateNotification: (id: string, data: Partial<DashboardNotification>) => void;
  deleteNotification: (id: string) => void;

  // Controls Testing Module
  controlBusinessAreas: ControlBusinessArea[];
  setControlBusinessAreas: (areas: ControlBusinessArea[]) => void;
  controls: ControlRecord[];
  setControls: (controls: ControlRecord[]) => void;
  addControl: (control: ControlRecord) => void;
  updateControl: (id: string, data: Partial<ControlRecord>) => void;
  testingSchedule: TestingScheduleEntry[];
  setTestingSchedule: (entries: TestingScheduleEntry[]) => void;
  addTestingScheduleEntries: (entries: TestingScheduleEntry[]) => void;
  updateTestingScheduleEntry: (id: string, data: Partial<TestingScheduleEntry>) => void;

  // Permissions
  rolePermissions: { role: Role; permission: string; granted: boolean }[];
  userPermissions: { userId: string; permission: string; granted: boolean }[];
  setRolePermissions: (perms: { role: Role; permission: string; granted: boolean }[]) => void;
  setUserPermissions: (perms: { userId: string; permission: string; granted: boolean }[]) => void;
  updateRolePermissions: (role: Role, perms: Record<string, boolean>) => void;
  updateUserPermissions: (userId: string, perms: Record<string, boolean | null>) => void;

  // Risk in Focus
  toggleRiskInFocus: (riskId: string, inFocus: boolean) => void;

  // Risk ↔ Control linking
  linkControlToRisk: (riskId: string, controlId: string, linkedBy: string, notes?: string) => void;
  unlinkControlFromRisk: (riskId: string, controlId: string) => void;

  // Entity approval
  approveEntity: (type: "risk" | "action" | "control", id: string) => void;
  rejectEntity: (type: "risk" | "action" | "control", id: string) => void;

  // SM&CR Module
  smfRoles: SMFRole[];
  setSmfRoles: (roles: SMFRole[]) => void;
  updateSmfRole: (id: string, data: Partial<SMFRole>) => void;

  prescribedResponsibilities: PrescribedResponsibility[];
  setPrescribedResponsibilities: (items: PrescribedResponsibility[]) => void;
  updatePrescribedResponsibility: (id: string, data: Partial<PrescribedResponsibility>) => void;

  certificationFunctions: CertificationFunction[];
  setCertificationFunctions: (items: CertificationFunction[]) => void;

  certifiedPersons: CertifiedPerson[];
  setCertifiedPersons: (items: CertifiedPerson[]) => void;
  addCertifiedPerson: (item: CertifiedPerson) => void;
  updateCertifiedPerson: (id: string, data: Partial<CertifiedPerson>) => void;

  conductRules: ConductRule[];
  setConductRules: (items: ConductRule[]) => void;

  conductRuleBreaches: ConductRuleBreach[];
  setConductRuleBreaches: (items: ConductRuleBreach[]) => void;
  addConductRuleBreach: (item: ConductRuleBreach) => void;
  updateConductRuleBreach: (id: string, data: Partial<ConductRuleBreach>) => void;

  smcrDocuments: SMCRDocument[];
  setSmcrDocuments: (items: SMCRDocument[]) => void;
  updateSmcrDocument: (id: string, data: Partial<SMCRDocument>) => void;

  // Compliance actions
  updateRegulationCompliance: (id: string, data: { complianceStatus?: ComplianceStatus; assessmentNotes?: string; nextReviewDate?: string }) => void;
  toggleRegulationApplicability: (id: string, isApplicable: boolean) => void;
  linkRegulationToControl: (regulationId: string, controlId: string, linkedBy: string, notes?: string) => void;
  unlinkRegulationFromControl: (regulationId: string, controlId: string) => void;

  // Access Requests
  accessRequests: AccessRequest[];
  setAccessRequests: (items: AccessRequest[]) => void;
  addAccessRequest: (item: AccessRequest) => void;
  updateAccessRequest: (id: string, data: Partial<AccessRequest>) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  propertiesPanelOpen: boolean;
  setPropertiesPanelOpen: (open: boolean) => void;

  // Navigation back-stack (for cross-entity click-through)
  navigationStack: string[];
  pushNavigationStack: (url: string) => void;
  popNavigationStack: () => string | undefined;
  clearNavigationStack: () => void;
}

/**
 * Fire-and-forget API call with retry logic
 * Logs errors and attempts retry with exponential backoff
 */
function sync(fn: () => Promise<unknown>, options?: { maxRetries?: number }): void {
  const maxRetries = options?.maxRetries ?? 2;
  let attempt = 0;

  const execute = async (): Promise<void> => {
    try {
      await fn();
    } catch (err) {
      attempt++;
      if (attempt <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.warn(`[store sync] Attempt ${attempt} failed, retrying in ${delay}ms...`, err);
        setTimeout(() => execute(), delay);
      } else {
        console.error("[store sync] Max retries exceeded:", err);
        // Dynamic import to avoid circular dependency
        if (typeof window !== "undefined") {
          import("sonner").then(({ toast }) => {
            toast.error("Failed to sync changes to server. Please refresh the page.", {
              description: err instanceof Error ? err.message : "Network error",
              duration: 5000,
            });
          });
        }
      }
    }
  };

  execute();
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── Hydration ──────────────────────────────────────────────
  _hydrated: false,
  _hydrateError: null,
  hydrate: async () => {
    try {
      const [users, reports, outcomes, templates, components, auditLogs, actions, risks, siteSettings, riskCategories, priorityDefinitions, controlBusinessAreas, controls, testingSchedule, riskAcceptances, policies, regulations, notifications, permissionsData, smfRoles, prescribedResponsibilities, certificationFunctions, conductRules, conductRuleBreaches, smcrDocuments, accessRequests] = await Promise.all([
        api<User[]>("/api/users"),
        api<Report[]>("/api/reports"),
        api<ConsumerDutyOutcome[]>("/api/consumer-duty"),
        api<Template[]>("/api/templates"),
        api<ImportedComponent[]>("/api/components"),
        api<{ data: AuditLogEntry[] }>("/api/audit?limit=500").then((r) => r.data),
        api<Action[]>("/api/actions"),
        api<Risk[]>("/api/risks"),
        api<SiteSettings>("/api/settings").catch(() => null),
        api<RiskCategoryDB[]>("/api/risk-categories").catch(() => []),
        api<PriorityDefinition[]>("/api/priority-definitions").catch(() => []),
        api<ControlBusinessArea[]>("/api/controls/business-areas").catch(() => []),
        api<ControlRecord[]>("/api/controls/library?includeSchedule=true").catch(() => []),
        api<TestingScheduleEntry[]>("/api/controls/testing-schedule?includeResults=true").catch(() => []),
        api<RiskAcceptance[]>("/api/risk-acceptances").catch(() => []),
        api<Policy[]>("/api/policies").catch(() => []),
        api<Regulation[]>("/api/compliance/regulations?showAll=true").catch(() => []),
        api<DashboardNotification[]>("/api/notifications").catch(() => []),
        api<{ rolePermissions: { role: Role; permission: string; granted: boolean }[]; userPermissions: { userId: string; permission: string; granted: boolean }[] }>("/api/permissions").catch(() => ({ rolePermissions: [], userPermissions: [] })),
        api<SMFRole[]>("/api/compliance/smcr/roles").catch(() => []),
        api<PrescribedResponsibility[]>("/api/compliance/smcr/responsibilities").catch(() => []),
        api<CertificationFunction[]>("/api/compliance/smcr/certification").catch(() => []),
        api<ConductRule[]>("/api/compliance/smcr/conduct-rules").catch(() => []),
        api<ConductRuleBreach[]>("/api/compliance/smcr/breaches").catch(() => []),
        api<SMCRDocument[]>("/api/compliance/smcr/documents").catch(() => []),
        api<AccessRequest[]>("/api/access-requests").catch(() => []),
      ]);
      // Extract certified persons from nested certification functions response
      const allCertifiedPersons = certificationFunctions.flatMap((cf: CertificationFunction & { certifiedPersons?: CertifiedPerson[] }) => cf.certifiedPersons ?? []);
      // Fire-and-forget: expire any access grants that have lapsed
      api("/api/access-requests/expiry-check", { method: "POST" }).catch(() => {});
      set({ users, reports, outcomes, templates, components, auditLogs, actions, risks, siteSettings, riskCategories, priorityDefinitions, controlBusinessAreas, controls, testingSchedule, riskAcceptances, policies, regulations, notifications, rolePermissions: permissionsData.rolePermissions, userPermissions: permissionsData.userPermissions, smfRoles, prescribedResponsibilities, certificationFunctions, certifiedPersons: allCertifiedPersons, conductRules, conductRuleBreaches, smcrDocuments, accessRequests, _hydrated: true, _hydrateError: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect to server";
      console.error("[hydrate] API unreachable:", message);
      set({ _hydrated: true, _hydrateError: message });
    }
  },

  // ── Auth ───────────────────────────────────────────────────
  authUser: null,
  setAuthUser: (user) => set({ authUser: user }),
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // ── Reports ────────────────────────────────────────────────
  reports: [],
  setReports: (reports) => set({ reports }),
  addReport: (report) => {
    set((state) => ({ reports: [report, ...state.reports] }));
    sync(() => api("/api/reports", { method: "POST", body: report }));
  },
  updateReport: (id, data) => {
    set((state) => ({
      reports: state.reports.map((r) => (r.id === id ? { ...r, ...data } : r)),
    }));
    sync(() => api(`/api/reports/${id}`, { method: "PATCH", body: data }));
  },
  deleteReport: (id) => {
    set((state) => ({ reports: state.reports.filter((r) => r.id !== id) }));
    sync(() => api(`/api/reports/${id}`, { method: "DELETE" }));
  },
  currentReport: null,
  setCurrentReport: (report) => set({ currentReport: report }),

  // ── Sections ───────────────────────────────────────────────
  sections: [],
  setSections: (sections) => set({ sections }),
  updateSection: (id, data) => {
    set((state) => ({
      sections: state.sections.map((s) => (s.id === id ? { ...s, ...data } : s)),
    }));
    sync(() => api(`/api/sections/${id}`, { method: "PATCH", body: data }));
  },
  addSection: (section) => {
    set((state) => ({ sections: [...state.sections, section] }));
    // Section persistence is handled via bulk PUT on save
  },
  removeSection: (id) => {
    set((state) => ({ sections: state.sections.filter((s) => s.id !== id) }));
    sync(() => api(`/api/sections/${id}`, { method: "DELETE" }));
  },
  reorderSections: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.sections);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return {
        sections: result.map((s, i) => ({ ...s, position: i })),
      };
    }),

  // ── Versions ───────────────────────────────────────────────
  versions: [],
  addVersion: (version) =>
    set((state) => ({ versions: [version, ...state.versions] })),

  // ── Consumer Duty Outcomes ─────────────────────────────────
  outcomes: [],
  setOutcomes: (outcomes) => set({ outcomes }),
  addOutcome: (outcome) => {
    set((state) => ({ outcomes: [...state.outcomes, outcome] }));
    sync(() => api("/api/consumer-duty", { method: "POST", body: outcome }));
  },
  updateOutcome: (id, data) => {
    set((state) => ({
      outcomes: state.outcomes.map((o) => (o.id === id ? { ...o, ...data } : o)),
    }));
    sync(() => api(`/api/consumer-duty/outcomes/${id}`, { method: "PATCH", body: data }));
  },
  deleteOutcome: (id) => {
    set((state) => ({ outcomes: state.outcomes.filter((o) => o.id !== id) }));
    sync(() => api(`/api/consumer-duty/outcomes/${id}`, { method: "DELETE" }));
  },
  addMeasure: (outcomeId, measure) => {
    set((state) => ({
      outcomes: state.outcomes.map((o) =>
        o.id === outcomeId
          ? { ...o, measures: [...(o.measures ?? []), measure] }
          : o
      ),
    }));
    sync(() => api("/api/consumer-duty/measures", { method: "POST", body: { ...measure, outcomeId } }));
  },
  updateMeasure: (measureId, data) => {
    set((state) => ({
      outcomes: state.outcomes.map((o) => ({
        ...o,
        measures: o.measures?.map((m) =>
          m.id === measureId ? { ...m, ...data } : m
        ),
      })),
    }));
    sync(() => api(`/api/consumer-duty/measures/${measureId}`, { method: "PATCH", body: data }));
  },
  deleteMeasure: (measureId) => {
    set((state) => ({
      outcomes: state.outcomes.map((o) => ({
        ...o,
        measures: o.measures?.filter((m) => m.id !== measureId),
      })),
    }));
    sync(() => api(`/api/consumer-duty/measures/${measureId}`, { method: "DELETE" }));
  },
  bulkAddMeasures: (items) => {
    set((state) => {
      const outcomeMap = new Map<string, ConsumerDutyMeasure[]>();
      for (const { outcomeId, measure } of items) {
        const arr = outcomeMap.get(outcomeId) ?? [];
        arr.push(measure);
        outcomeMap.set(outcomeId, arr);
      }
      return {
        outcomes: state.outcomes.map((o) => {
          const newMeasures = outcomeMap.get(o.id);
          if (!newMeasures) return o;
          return { ...o, measures: [...(o.measures ?? []), ...newMeasures] };
        }),
      };
    });
    const measures = items.map((i) => ({ ...i.measure, outcomeId: i.outcomeId }));
    sync(() => api("/api/consumer-duty/measures", { method: "POST", body: measures }));
  },
  updateMeasureMetrics: (measureId, metrics) => {
    set((state) => ({
      outcomes: state.outcomes.map((o) => ({
        ...o,
        measures: o.measures?.map((m) =>
          m.id === measureId ? { ...m, metrics, lastUpdatedAt: new Date().toISOString() } : m
        ),
      })),
    }));
    sync(() => api("/api/consumer-duty/mi", { method: "PUT", body: { measureId, metrics } }));
  },

  // ── Templates ──────────────────────────────────────────────
  templates: [],
  setTemplates: (templates) => set({ templates }),
  addTemplate: (template) => {
    set((state) => ({ templates: [template, ...state.templates] }));
    sync(() => api("/api/templates", { method: "POST", body: template }));
  },
  updateTemplate: (id, data) => {
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
    sync(() => api(`/api/templates/${id}`, { method: "PATCH", body: data }));
  },
  deleteTemplate: (id) => {
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
    sync(() => api(`/api/templates/${id}`, { method: "DELETE" }));
  },

  // ── Components ─────────────────────────────────────────────
  components: [],
  setComponents: (components) => set({ components }),
  addComponent: (component) => {
    set((state) => ({ components: [component, ...state.components] }));
    sync(() => api("/api/components", { method: "POST", body: component }));
  },
  deleteComponent: (id) => {
    set((state) => ({ components: state.components.filter((c) => c.id !== id) }));
    sync(() => api(`/api/components/${id}`, { method: "DELETE" }));
  },

  // ── Audit ──────────────────────────────────────────────────
  auditLogs: [],
  setAuditLogs: (logs) => set({ auditLogs: logs }),
  addAuditLog: (entry) => {
    set((state) => ({ auditLogs: [entry, ...state.auditLogs] }));
    sync(() => api("/api/audit", { method: "POST", body: entry }));
  },

  // ── Actions ────────────────────────────────────────────────
  actions: [],
  setActions: (actions) => set({ actions }),
  addAction: (action) => {
    set((state) => ({ actions: [action, ...state.actions] }));
    sync(() => api("/api/actions", { method: "POST", body: action }));
  },
  updateAction: (id, data) => {
    set((state) => ({
      actions: state.actions.map((a) => (a.id === id ? { ...a, ...data } : a)),
    }));
    sync(() => api(`/api/actions/${id}`, { method: "PATCH", body: data }));
  },
  deleteAction: (id) => {
    set((state) => ({
      actions: state.actions.filter((a) => a.id !== id),
      // Also remove linked mitigations from risks
      risks: state.risks.map((r) => ({
        ...r,
        mitigations: r.mitigations?.filter((m) => m.actionId !== id),
      })),
    }));
    sync(() => api(`/api/actions/${id}`, { method: "DELETE" }));
  },

  // ── Risks ──────────────────────────────────────────────────
  risks: [],
  setRisks: (risks) => set({ risks }),
  addRisk: (risk) => {
    set((state) => ({ risks: [...state.risks, risk] }));
    sync(() => api("/api/risks", { method: "POST", body: risk }));
  },
  updateRisk: (id, data) => {
    set((state) => ({
      risks: state.risks.map((r) => (r.id === id ? { ...r, ...data } : r)),
    }));
    sync(() => api(`/api/risks/${id}`, { method: "PATCH", body: data }));
  },
  deleteRisk: (id) => {
    set((state) => ({ risks: state.risks.filter((r) => r.id !== id) }));
    sync(() => api(`/api/risks/${id}`, { method: "DELETE" }));
  },
  // Cross-entity sync: when action status changes, update linked mitigation in local state
  syncMitigationStatus: (actionId: string, newActionStatus: string) => {
    const mitStatusMap: Record<string, string> = { COMPLETED: "COMPLETE", IN_PROGRESS: "IN_PROGRESS", OPEN: "OPEN", OVERDUE: "OPEN", PROPOSED_CLOSED: "IN_PROGRESS" };
    const newMitStatus = mitStatusMap[newActionStatus] ?? "OPEN";
    set((state) => ({
      risks: state.risks.map((r) => ({
        ...r,
        mitigations: r.mitigations?.map((m) =>
          m.actionId === actionId ? { ...m, status: newMitStatus as "OPEN" | "IN_PROGRESS" | "COMPLETE" } : m
        ),
      })),
    }));
  },

  // ── Users ──────────────────────────────────────────────────
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) => {
    set((state) => {
      // Prevent duplicate users by email or id
      if (state.users.some((u) => u.id === user.id || u.email === user.email)) return state;
      return { users: [...state.users, user] };
    });
    sync(() => api("/api/users", { method: "POST", body: user }));
  },
  updateUser: (id, data) => {
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
    }));
    sync(() => api(`/api/users/${id}`, { method: "PATCH", body: data }));
  },
  deleteUser: (id) => {
    set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
    // API call is handled by UserDeleteDialog (requires reassignment body)
  },

  // ── Branding ───────────────────────────────────────────────
  branding: {
    logoSrc: null,
    logoAlt: "Team Logo",
    logoWidth: 120,
    companyName: "Updraft",
    showInHeader: true,
    showInFooter: true,
    dashboardIconSrc: null,
    dashboardIconAlt: "Dashboard",
  },
  updateBranding: (data) =>
    set((state) => ({ branding: { ...state.branding, ...data } })),

  // ── Site Settings (DB-persisted branding) ─────────────────
  siteSettings: null,
  updateSiteSettings: (data) => {
    set((state) => ({
      siteSettings: state.siteSettings
        ? { ...state.siteSettings, ...data }
        : { id: "default", logoBase64: null, logoMarkBase64: null, logoX: 16, logoY: 16, logoScale: 1.0, primaryColour: null, accentColour: null, updatedAt: new Date().toISOString(), updatedBy: null, ...data },
    }));
    sync(() => api("/api/settings", { method: "PUT", body: data }));
  },

  // ── Risk Categories (DB-backed) ──────────────────────────
  riskCategories: [],
  setRiskCategories: (cats) => set({ riskCategories: cats }),

  // ── Priority Definitions (DB-backed) ─────────────────────
  priorityDefinitions: [],
  setPriorityDefinitions: (defs) => set({ priorityDefinitions: defs }),

  // ── Risk Acceptances ─────────────────────────────────────
  riskAcceptances: [],
  riskAcceptancesLoading: false,
  setRiskAcceptances: (items) => set({ riskAcceptances: items }),
  addRiskAcceptance: (item) => {
    set((state) => ({ riskAcceptances: [item, ...state.riskAcceptances] }));
    sync(() => api("/api/risk-acceptances", { method: "POST", body: item }));
  },
  updateRiskAcceptance: (id, data) => {
    set((state) => ({
      riskAcceptances: state.riskAcceptances.map((ra) => (ra.id === id ? { ...ra, ...data } : ra)),
    }));
    sync(() => api(`/api/risk-acceptances/${id}`, { method: "PATCH", body: data }));
  },
  deleteRiskAcceptance: (id) => {
    set((state) => ({ riskAcceptances: state.riskAcceptances.filter((ra) => ra.id !== id) }));
    sync(() => api(`/api/risk-acceptances/${id}`, { method: "DELETE" }));
  },

  // ── Policy Review Module ────────────────────────────────
  policies: [],
  setPolicies: (items) => set({ policies: items }),
  addPolicy: (item) => {
    set((state) => ({ policies: [item, ...state.policies] }));
    sync(() => api("/api/policies", { method: "POST", body: item }));
  },
  updatePolicy: (id, data) => {
    set((state) => ({
      policies: state.policies.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
    sync(() => api(`/api/policies/${id}`, { method: "PATCH", body: data }));
  },
  deletePolicy: (id) => {
    set((state) => ({ policies: state.policies.filter((p) => p.id !== id) }));
    sync(() => api(`/api/policies/${id}`, { method: "DELETE" }));
  },
  regulations: [],
  setRegulations: (items) => set({ regulations: items }),
  addRegulation: (item) => {
    set((state) => ({ regulations: [item, ...state.regulations] }));
    sync(() => api("/api/regulations", { method: "POST", body: item }));
  },
  updateRegulation: (id, data) => {
    set((state) => ({
      regulations: state.regulations.map((r) => (r.id === id ? { ...r, ...data } : r)),
    }));
    sync(() => api(`/api/regulations/${id}`, { method: "PATCH", body: data }));
  },
  deleteRegulation: (id) => {
    set((state) => ({ regulations: state.regulations.filter((r) => r.id !== id) }));
    sync(() => api(`/api/regulations/${id}`, { method: "DELETE" }));
  },

  // ── Dashboard Notifications ─────────────────────────────
  notifications: [],
  setNotifications: (items) => set({ notifications: items }),
  addNotification: (item) => {
    set((state) => ({ notifications: [item, ...state.notifications] }));
    sync(() => api("/api/notifications", { method: "POST", body: item }));
  },
  updateNotification: (id, data) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, ...data } : n)),
    }));
    sync(() => api(`/api/notifications/${id}`, { method: "PATCH", body: data }));
  },
  deleteNotification: (id) => {
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }));
    sync(() => api(`/api/notifications/${id}`, { method: "DELETE" }));
  },

  // ── Controls Testing Module ─────────────────────────────
  controlBusinessAreas: [],
  setControlBusinessAreas: (areas) => set({ controlBusinessAreas: areas }),
  controls: [],
  setControls: (controls) => set({ controls }),
  addControl: (control) => {
    set((state) => ({ controls: [...state.controls, control] }));
    sync(() => api("/api/controls/library", { method: "POST", body: control }));
  },
  updateControl: (id, data) => {
    set((state) => ({
      controls: state.controls.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
    sync(() => api(`/api/controls/library/${id}`, { method: "PATCH", body: data }));
  },
  testingSchedule: [],
  setTestingSchedule: (entries) => set({ testingSchedule: entries }),
  addTestingScheduleEntries: (entries) => {
    set((state) => ({ testingSchedule: [...state.testingSchedule, ...entries] }));
    sync(() => api("/api/controls/testing-schedule", { method: "POST", body: { entries } }));
  },
  updateTestingScheduleEntry: (id, data) => {
    set((state) => ({
      testingSchedule: state.testingSchedule.map((e) => (e.id === id ? { ...e, ...data } : e)),
    }));
    sync(() => api(`/api/controls/testing-schedule/${id}`, { method: "PATCH", body: data }));
  },

  // ── Permissions ──────────────────────────────────────────────
  rolePermissions: [],
  userPermissions: [],
  setRolePermissions: (perms) => set({ rolePermissions: perms }),
  setUserPermissions: (perms) => set({ userPermissions: perms }),
  updateRolePermissions: (role, perms) => {
    set((state) => {
      const updated = state.rolePermissions.filter((rp) => rp.role !== role || !(rp.permission in perms));
      for (const [perm, granted] of Object.entries(perms)) {
        updated.push({ role, permission: perm, granted });
      }
      return { rolePermissions: updated };
    });
    sync(() => api("/api/permissions", { method: "PUT", body: { role, permissions: perms } }));
  },
  updateUserPermissions: (userId, perms) => {
    set((state) => {
      const updated = state.userPermissions.filter((up) => up.userId !== userId || !(up.permission in perms));
      for (const [perm, granted] of Object.entries(perms)) {
        if (granted !== null) {
          updated.push({ userId, permission: perm, granted });
        }
        // null = remove override (already filtered out above)
      }
      return { userPermissions: updated };
    });
    sync(() => api(`/api/permissions/users/${userId}`, { method: "PUT", body: { permissions: perms } }));
  },

  // ── Risk in Focus ──────────────────────────────────────────
  toggleRiskInFocus: (riskId, inFocus) => {
    set((state) => ({
      risks: state.risks.map((r) => (r.id === riskId ? { ...r, inFocus } : r)),
    }));
    sync(() => api(`/api/risks/${riskId}`, { method: "PATCH", body: { inFocus } }));
  },

  // ── Risk ↔ Control linking ─────────────────────────────────
  linkControlToRisk: (riskId, controlId, linkedBy, notes) => {
    const tempLink: RiskControlLink = {
      id: `temp-${Date.now()}`,
      riskId,
      controlId,
      linkedAt: new Date().toISOString(),
      linkedBy,
      notes: notes ?? null,
    };
    set((state) => ({
      risks: state.risks.map((r) =>
        r.id === riskId ? { ...r, controlLinks: [...(r.controlLinks ?? []), tempLink] } : r
      ),
    }));
    sync(async () => {
      const link = await api<RiskControlLink>(`/api/risks/${riskId}/control-links`, {
        method: "POST",
        body: { controlId, notes },
      });
      // Replace temp with real
      set((state) => ({
        risks: state.risks.map((r) =>
          r.id === riskId
            ? { ...r, controlLinks: (r.controlLinks ?? []).map((l) => l.id === tempLink.id ? link : l) }
            : r
        ),
      }));
    });
  },
  unlinkControlFromRisk: (riskId, controlId) => {
    set((state) => ({
      risks: state.risks.map((r) =>
        r.id === riskId
          ? { ...r, controlLinks: (r.controlLinks ?? []).filter((l) => l.controlId !== controlId) }
          : r
      ),
    }));
    sync(() => api(`/api/risks/${riskId}/control-links`, { method: "DELETE", body: { controlId } }));
  },

  // ── Entity approval ─────────────────────────────────────────
  approveEntity: (type, id) => {
    const data = { approvalStatus: "APPROVED" as const };
    if (type === "risk") {
      set((state) => ({ risks: state.risks.map((r) => (r.id === id ? { ...r, ...data } : r)) }));
      sync(() => api(`/api/risks/${id}`, { method: "PATCH", body: data }));
    } else if (type === "action") {
      set((state) => ({ actions: state.actions.map((a) => (a.id === id ? { ...a, ...data } : a)) }));
      sync(() => api(`/api/actions/${id}`, { method: "PATCH", body: data }));
    } else {
      set((state) => ({ controls: state.controls.map((c) => (c.id === id ? { ...c, ...data } : c)) }));
      sync(() => api(`/api/controls/library/${id}`, { method: "PATCH", body: data }));
    }
  },
  rejectEntity: (type, id) => {
    const data = { approvalStatus: "REJECTED" as const };
    if (type === "risk") {
      set((state) => ({ risks: state.risks.map((r) => (r.id === id ? { ...r, ...data } : r)) }));
      sync(() => api(`/api/risks/${id}`, { method: "PATCH", body: data }));
    } else if (type === "action") {
      set((state) => ({ actions: state.actions.map((a) => (a.id === id ? { ...a, ...data } : a)) }));
      sync(() => api(`/api/actions/${id}`, { method: "PATCH", body: data }));
    } else {
      set((state) => ({ controls: state.controls.map((c) => (c.id === id ? { ...c, ...data } : c)) }));
      sync(() => api(`/api/controls/library/${id}`, { method: "PATCH", body: data }));
    }
  },

  // ── SM&CR Module ─────────────────────────────────────────────
  smfRoles: [],
  setSmfRoles: (roles) => set({ smfRoles: roles }),
  updateSmfRole: (id, data) => {
    set((state) => ({
      smfRoles: state.smfRoles.map((r) => (r.id === id ? { ...r, ...data } : r)),
    }));
    sync(() => api(`/api/compliance/smcr/roles/${id}`, { method: "PATCH", body: data }));
  },

  prescribedResponsibilities: [],
  setPrescribedResponsibilities: (items) => set({ prescribedResponsibilities: items }),
  updatePrescribedResponsibility: (id, data) => {
    set((state) => ({
      prescribedResponsibilities: state.prescribedResponsibilities.map((r) => (r.id === id ? { ...r, ...data } : r)),
    }));
    sync(() => api(`/api/compliance/smcr/responsibilities/${id}`, { method: "PATCH", body: data }));
  },

  certificationFunctions: [],
  setCertificationFunctions: (items) => set({ certificationFunctions: items }),

  certifiedPersons: [],
  setCertifiedPersons: (items) => set({ certifiedPersons: items }),
  addCertifiedPerson: (item) => {
    set((state) => ({ certifiedPersons: [item, ...state.certifiedPersons] }));
    sync(() => api("/api/compliance/smcr/certification", { method: "POST", body: item }));
  },
  updateCertifiedPerson: (id, data) => {
    set((state) => ({
      certifiedPersons: state.certifiedPersons.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
    sync(() => api(`/api/compliance/smcr/certification/${id}`, { method: "PATCH", body: data }));
  },

  conductRules: [],
  setConductRules: (items) => set({ conductRules: items }),

  conductRuleBreaches: [],
  setConductRuleBreaches: (items) => set({ conductRuleBreaches: items }),
  addConductRuleBreach: (item) => {
    set((state) => ({ conductRuleBreaches: [item, ...state.conductRuleBreaches] }));
    sync(() => api("/api/compliance/smcr/breaches", { method: "POST", body: item }));
  },
  updateConductRuleBreach: (id, data) => {
    set((state) => ({
      conductRuleBreaches: state.conductRuleBreaches.map((b) => (b.id === id ? { ...b, ...data } : b)),
    }));
    sync(() => api(`/api/compliance/smcr/breaches/${id}`, { method: "PATCH", body: data }));
  },

  smcrDocuments: [],
  setSmcrDocuments: (items) => set({ smcrDocuments: items }),
  updateSmcrDocument: (id, data) => {
    set((state) => ({
      smcrDocuments: state.smcrDocuments.map((d) => (d.id === id ? { ...d, ...data } : d)),
    }));
    sync(() => api(`/api/compliance/smcr/documents/${id}`, { method: "PATCH", body: data }));
  },

  // ── Compliance Actions ────────────────────────────────────────
  updateRegulationCompliance: (id, data) => {
    set((state) => ({
      regulations: state.regulations.map((r) => (r.id === id ? { ...r, ...data } : r)),
    }));
    sync(() => api(`/api/compliance/regulations/${id}`, { method: "PATCH", body: data }));
  },
  toggleRegulationApplicability: (id, isApplicable) => {
    set((state) => ({
      regulations: state.regulations.map((r) => (r.id === id ? { ...r, isApplicable } : r)),
    }));
    sync(() => api(`/api/compliance/regulations/${id}`, { method: "PATCH", body: { isApplicable } }));
  },
  linkRegulationToControl: (regulationId, controlId, linkedBy, notes) => {
    set((state) => ({
      regulations: state.regulations.map((r) =>
        r.id === regulationId
          ? { ...r, controlLinks: [...(r.controlLinks ?? []), { id: `temp-${Date.now()}`, regulationId, controlId, linkedAt: new Date().toISOString(), linkedBy, notes: notes ?? null }] }
          : r
      ),
    }));
    sync(() => api(`/api/compliance/regulations/${regulationId}/control-links`, { method: "POST", body: { controlId, notes } }));
  },
  unlinkRegulationFromControl: (regulationId, controlId) => {
    set((state) => ({
      regulations: state.regulations.map((r) =>
        r.id === regulationId
          ? { ...r, controlLinks: (r.controlLinks ?? []).filter((l) => l.controlId !== controlId) }
          : r
      ),
    }));
    sync(() => api(`/api/compliance/regulations/${regulationId}/control-links`, { method: "DELETE", body: { controlId } }));
  },

  // ── Access Requests ──────────────────────────────────────────
  accessRequests: [],
  setAccessRequests: (items) => set({ accessRequests: items }),
  addAccessRequest: (item) => set((s) => ({ accessRequests: [item, ...s.accessRequests] })),
  updateAccessRequest: (id, data) =>
    set((s) => ({
      accessRequests: s.accessRequests.map((r) => (r.id === id ? { ...r, ...data } : r)),
    })),

  // ── UI State ───────────────────────────────────────────────
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedSectionId: null,
  setSelectedSectionId: (id) => set({ selectedSectionId: id }),
  propertiesPanelOpen: false,
  setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),

  // Navigation back-stack
  navigationStack: [],
  pushNavigationStack: (url) =>
    set((s) => ({ navigationStack: [...s.navigationStack, url] })),
  popNavigationStack: () => {
    const stack = get().navigationStack;
    if (stack.length === 0) return undefined;
    const url = stack[stack.length - 1];
    set({ navigationStack: stack.slice(0, -1) });
    return url;
  },
  clearNavigationStack: () => set({ navigationStack: [] }),
}));
