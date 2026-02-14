import { useAppStore } from "./store";
import { generateId } from "./utils";
import type { Role, AuditLogEntry } from "./types";

interface AuditParams {
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  reportId?: string | null;
}

/**
 * Log an audit event to the Zustand store.
 * Reads the current user from the store automatically.
 */
export function logAuditEvent(params: AuditParams): void {
  const state = useAppStore.getState();
  const user = state.currentUser;

  const entry: AuditLogEntry = {
    id: `log-${generateId()}`,
    timestamp: new Date().toISOString(),
    userId: user?.id ?? "unknown",
    userRole: (user?.role ?? "VIEWER") as Role,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    changes: params.changes ?? null,
    reportId: params.reportId ?? null,
    ipAddress: null,
    userAgent: null,
  };

  state.addAuditLog(entry);
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    login: "Logged in",
    logout: "Logged out",
    view_report: "Viewed report",
    create_report: "Created report",
    edit_report: "Edited report",
    edit_section: "Edited section",
    add_section: "Added section",
    delete_section: "Deleted section",
    reorder_sections: "Reordered sections",
    save_report: "Saved report",
    update_measure: "Updated measure",
    update_mi: "Updated MI metric",
    change_rag: "Changed RAG status",
    publish_report: "Published report",
    archive_report: "Archived report",
    download_export: "Downloaded export",
    import_component: "Imported component",
    delete_component: "Deleted component",
    duplicate_component: "Duplicated component",
    create_template: "Created template",
    update_template: "Updated template",
    delete_template: "Deleted template",
    duplicate_template: "Duplicated template",
    modify_permissions: "Modified permissions",
    add_user: "Added user",
    update_user: "Updated user",
    deactivate_user: "Deactivated user",
  };
  return labels[action] || action;
}
