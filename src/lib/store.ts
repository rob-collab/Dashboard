import { create } from "zustand";
import type { User, Report, Section, Template, ImportedComponent, AuditLogEntry, ConsumerDutyOutcome, ConsumerDutyMI, ReportVersion } from "./types";
import { demoReports, demoSections, demoOutcomes, demoTemplates, demoComponents, demoAuditLogs, demoVersions } from "./demo-data";
import { DEMO_USERS } from "./auth";

interface AppState {
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

  // Users (in-memory CRUD)
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  propertiesPanelOpen: boolean;
  setPropertiesPanelOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  reports: demoReports,
  setReports: (reports) => set({ reports }),
  addReport: (report) =>
    set((state) => ({ reports: [report, ...state.reports] })),
  updateReport: (id, data) =>
    set((state) => ({
      reports: state.reports.map((r) => (r.id === id ? { ...r, ...data } : r)),
    })),
  deleteReport: (id) =>
    set((state) => ({ reports: state.reports.filter((r) => r.id !== id) })),
  currentReport: null,
  setCurrentReport: (report) => set({ currentReport: report }),

  sections: demoSections,
  setSections: (sections) => set({ sections }),
  updateSection: (id, data) =>
    set((state) => ({
      sections: state.sections.map((s) => (s.id === id ? { ...s, ...data } : s)),
    })),
  addSection: (section) =>
    set((state) => ({ sections: [...state.sections, section] })),
  removeSection: (id) =>
    set((state) => ({ sections: state.sections.filter((s) => s.id !== id) })),
  reorderSections: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.sections);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return {
        sections: result.map((s, i) => ({ ...s, position: i })),
      };
    }),

  versions: demoVersions,
  addVersion: (version) =>
    set((state) => ({ versions: [version, ...state.versions] })),

  outcomes: demoOutcomes,
  setOutcomes: (outcomes) => set({ outcomes }),
  updateMeasureMetrics: (measureId, metrics) =>
    set((state) => ({
      outcomes: state.outcomes.map((o) => ({
        ...o,
        measures: o.measures?.map((m) =>
          m.id === measureId ? { ...m, metrics } : m
        ),
      })),
    })),

  templates: demoTemplates,
  setTemplates: (templates) => set({ templates }),
  addTemplate: (template) =>
    set((state) => ({ templates: [template, ...state.templates] })),
  updateTemplate: (id, data) =>
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),
  deleteTemplate: (id) =>
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),

  components: demoComponents,
  setComponents: (components) => set({ components }),
  addComponent: (component) =>
    set((state) => ({ components: [component, ...state.components] })),
  deleteComponent: (id) =>
    set((state) => ({ components: state.components.filter((c) => c.id !== id) })),

  auditLogs: demoAuditLogs,
  setAuditLogs: (logs) => set({ auditLogs: logs }),
  addAuditLog: (entry) =>
    set((state) => ({ auditLogs: [entry, ...state.auditLogs] })),

  users: DEMO_USERS,
  setUsers: (users) => set({ users }),
  addUser: (user) =>
    set((state) => ({ users: [...state.users, user] })),
  updateUser: (id, data) =>
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
    })),
  deleteUser: (id) =>
    set((state) => ({ users: state.users.filter((u) => u.id !== id) })),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedSectionId: null,
  setSelectedSectionId: (id) => set({ selectedSectionId: id }),
  propertiesPanelOpen: false,
  setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),
}));
