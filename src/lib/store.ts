import { create } from "zustand";
import type { User, Report, Section, Template, ImportedComponent, AuditLogEntry, ConsumerDutyOutcome, ConsumerDutyMeasure, ConsumerDutyMI, ReportVersion, BrandingConfig, Action, Risk } from "./types";
import { demoReports, demoSections, demoOutcomes, demoTemplates, demoComponents, demoAuditLogs, demoVersions, demoRisks } from "./demo-data";
import { DEMO_USERS } from "./auth";
import { api } from "./api-client";

interface AppState {
  // Hydration
  _hydrated: boolean;
  hydrate: () => Promise<void>;

  // Auth
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

  // Users (in-memory CRUD)
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Branding
  branding: BrandingConfig;
  updateBranding: (data: Partial<BrandingConfig>) => void;

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
  hydrate: async () => {
    try {
      const [users, reports, outcomes, templates, components, auditLogs, actions, risks] = await Promise.all([
        api<User[]>("/api/users"),
        api<Report[]>("/api/reports"),
        api<ConsumerDutyOutcome[]>("/api/consumer-duty"),
        api<Template[]>("/api/templates"),
        api<ImportedComponent[]>("/api/components"),
        api<{ data: AuditLogEntry[] }>("/api/audit?limit=50").then((r) => r.data),
        api<Action[]>("/api/actions"),
        api<Risk[]>("/api/risks"),
      ]);
      set({ users, reports, outcomes, templates, components, auditLogs, actions, risks, _hydrated: true });
    } catch (err) {
      console.warn("[hydrate] API unreachable, using demo data:", err);
      set({ _hydrated: true });
    }
  },

  // ── Auth ───────────────────────────────────────────────────
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // ── Reports ────────────────────────────────────────────────
  reports: demoReports,
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
  sections: demoSections,
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
  versions: demoVersions,
  addVersion: (version) =>
    set((state) => ({ versions: [version, ...state.versions] })),

  // ── Consumer Duty Outcomes ─────────────────────────────────
  outcomes: demoOutcomes,
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
  templates: demoTemplates,
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
  components: demoComponents,
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
  auditLogs: demoAuditLogs,
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
    set((state) => ({ actions: state.actions.filter((a) => a.id !== id) }));
    sync(() => api(`/api/actions/${id}`, { method: "DELETE" }));
  },

  // ── Risks ──────────────────────────────────────────────────
  risks: demoRisks,
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

  // ── Users ──────────────────────────────────────────────────
  users: DEMO_USERS,
  setUsers: (users) => set({ users }),
  addUser: (user) => {
    set((state) => ({ users: [...state.users, user] }));
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
    sync(() => api(`/api/users/${id}`, { method: "DELETE" }));
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

  // ── UI State ───────────────────────────────────────────────
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedSectionId: null,
  setSelectedSectionId: (id) => set({ selectedSectionId: id }),
  propertiesPanelOpen: false,
  setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),
}));
