import type { Role } from "./types";

interface AuditParams {
  userId: string;
  userRole: Role;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  reportId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    login: "Logged in",
    logout: "Logged out",
    view_report: "Viewed report",
    create_report: "Created report",
    edit_section: "Edited section",
    add_section: "Added section",
    delete_section: "Deleted section",
    reorder_sections: "Reordered sections",
    update_measure: "Updated measure",
    update_mi: "Updated MI metric",
    change_rag: "Changed RAG status",
    publish_report: "Published report",
    download_export: "Downloaded export",
    import_component: "Imported component",
    create_template: "Created template",
    update_template: "Updated template",
    modify_permissions: "Modified permissions",
    add_user: "Added user",
    update_user: "Updated user",
    deactivate_user: "Deactivated user",
  };
  return labels[action] || action;
}
