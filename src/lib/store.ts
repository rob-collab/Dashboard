import { create } from "zustand";
import type { User, Report, Section, Template, ImportedComponent, AuditLogEntry, ConsumerDutyOutcome, ConsumerDutyMeasure, ConsumerDutyMI, ReportVersion, BrandingConfig, Action, Risk, RiskCategoryDB, PriorityDefinition, SiteSettings, ControlRecord, ControlBusinessArea, TestingScheduleEntry, RiskAcceptance, Policy, Regulation } from "./types";
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

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  propertiesPanelOpen: boolean;
  setPropertiesPanelOpen: (open: boolean) => void;
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

export const useAppStore = create<AppState>((set) => ({
  // ── Hydration ──────────────────────────────────────────────
  _hydrated: false,
  _hydrateError: null,
  hydrate: async () => {
    try {
      const [users, reports, outcomes, templates, components, auditLogs, actions, risks, siteSettings, riskCategories, priorityDefinitions, controlBusinessAreas, controls, testingSchedule, riskAcceptances, policies, regulations] = await Promise.all([
        api<User[]>("/api/users"),
        api<Report[]>("/api/reports"),
        api<ConsumerDutyOutcome[]>("/api/consumer-duty"),
        api<Template[]>("/api/templates"),
        api<ImportedComponent[]>("/api/components"),
        api<{ data: AuditLogEntry[] }>("/api/audit?limit=50").then((r) => r.data),
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
        api<Regulation[]>("/api/regulations").catch(() => []),
      ]);
      set({ users, reports, outcomes, templates, components, auditLogs, actions, risks, siteSettings, riskCategories, priorityDefinitions, controlBusinessAreas, controls, testingSchedule, riskAcceptances, policies, regulations, _hydrated: true, _hydrateError: null });
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
    // Outcome deletion would need a route; for now rely on cascade from report
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
  },
  updateRiskAcceptance: (id, data) => {
    set((state) => ({
      riskAcceptances: state.riskAcceptances.map((ra) => (ra.id === id ? { ...ra, ...data } : ra)),
    }));
  },
  deleteRiskAcceptance: (id) => {
    set((state) => ({ riskAcceptances: state.riskAcceptances.filter((ra) => ra.id !== id) }));
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

  // ── Controls Testing Module ─────────────────────────────
  controlBusinessAreas: [],
  setControlBusinessAreas: (areas) => set({ controlBusinessAreas: areas }),
  controls: [],
  setControls: (controls) => set({ controls }),
  addControl: (control) => {
    set((state) => ({ controls: [...state.controls, control] }));
  },
  updateControl: (id, data) => {
    set((state) => ({
      controls: state.controls.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
  },
  testingSchedule: [],
  setTestingSchedule: (entries) => set({ testingSchedule: entries }),
  addTestingScheduleEntries: (entries) => {
    set((state) => ({ testingSchedule: [...state.testingSchedule, ...entries] }));
  },
  updateTestingScheduleEntry: (id, data) => {
    set((state) => ({
      testingSchedule: state.testingSchedule.map((e) => (e.id === id ? { ...e, ...data } : e)),
    }));
  },

  // ── UI State ───────────────────────────────────────────────
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedSectionId: null,
  setSelectedSectionId: (id) => set({ selectedSectionId: id }),
  propertiesPanelOpen: false,
  setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),
}));
