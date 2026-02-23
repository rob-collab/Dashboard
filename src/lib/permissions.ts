import type { Role } from "./types";

export type PermissionCode =
  // Page access
  | "page:dashboard"
  | "page:risk-register"
  | "page:actions"
  | "page:controls"
  | "page:consumer-duty"
  | "page:policies"
  | "page:compliance"
  | "page:reports"
  | "page:risk-acceptances"
  | "page:audit"
  | "page:settings"
  | "page:users"
  | "page:operational-resilience"
  // Data actions
  | "create:risk"
  | "create:action"
  | "create:control"
  | "edit:risk"
  | "edit:action"
  | "edit:control"
  | "delete:risk"
  | "delete:action"
  | "delete:control"
  // Compliance capabilities
  | "edit:compliance"
  | "manage:smcr"
  | "manage:regulations"
  // Special capabilities
  | "can:toggle-risk-focus"
  | "can:bypass-approval"
  | "can:approve-entities"
  | "can:manage-users"
  | "can:manage-settings"
  | "can:manage-notifications"
  | "can:view-pending";

export const ALL_PERMISSIONS: Record<PermissionCode, { label: string; category: string }> = {
  // Pages
  "page:dashboard":        { label: "View Dashboard",             category: "Pages" },
  "page:risk-register":    { label: "View Risk Register",         category: "Pages" },
  "page:actions":          { label: "View Actions",               category: "Pages" },
  "page:controls":         { label: "View Controls Testing",      category: "Pages" },
  "page:consumer-duty":    { label: "View Consumer Duty",         category: "Pages" },
  "page:policies":         { label: "View Policies (legacy)",     category: "Pages" },
  "page:compliance":       { label: "View Compliance",            category: "Pages" },
  "page:reports":          { label: "View Reports",               category: "Pages" },
  "page:risk-acceptances": { label: "View Risk Acceptances",      category: "Pages" },
  "page:audit":                     { label: "View Audit Trail",              category: "Pages" },
  "page:settings":                  { label: "View Settings",                 category: "Pages" },
  "page:users":                     { label: "View Users",                    category: "Pages" },
  "page:operational-resilience":    { label: "View Operational Resilience",   category: "Pages" },
  // Data
  "create:risk":    { label: "Create Risks",    category: "Data" },
  "create:action":  { label: "Create Actions",  category: "Data" },
  "create:control": { label: "Create Controls", category: "Data" },
  "edit:risk":      { label: "Edit Risks",      category: "Data" },
  "edit:action":    { label: "Edit Actions",     category: "Data" },
  "edit:control":   { label: "Edit Controls",   category: "Data" },
  "delete:risk":    { label: "Delete Risks",    category: "Data" },
  "delete:action":  { label: "Delete Actions",  category: "Data" },
  "delete:control": { label: "Delete Controls", category: "Data" },
  // Compliance
  "edit:compliance":      { label: "Edit Compliance Assessments",    category: "Compliance" },
  "manage:smcr":          { label: "Manage SM&CR Data",              category: "Compliance" },
  "manage:regulations":   { label: "Manage Regulation Applicability", category: "Compliance" },
  // Special
  "can:toggle-risk-focus":    { label: "Toggle Risk in Focus",         category: "Special" },
  "can:bypass-approval":      { label: "Create/Edit Without Approval", category: "Special" },
  "can:approve-entities":     { label: "Approve/Reject Entities",      category: "Special" },
  "can:manage-users":         { label: "Manage Users",                 category: "Admin" },
  "can:manage-settings":      { label: "Manage Settings",              category: "Admin" },
  "can:manage-notifications": { label: "Manage Notifications",         category: "Admin" },
  "can:view-pending":         { label: "View Pending Approvals",       category: "Admin" },
};

export const PERMISSION_CODES = Object.keys(ALL_PERMISSIONS) as PermissionCode[];

export const PERMISSION_CATEGORIES = ["Pages", "Data", "Compliance", "Special", "Admin"] as const;

/** Hardcoded default permissions per role — always works even with empty DB */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Partial<Record<PermissionCode, boolean>>> = {
  CCRO_TEAM: Object.fromEntries(PERMISSION_CODES.map((c) => [c, true])) as Record<PermissionCode, boolean>,
  CEO: {
    "page:dashboard": true,
    "page:risk-register": true,
    "page:actions": true,
    "page:controls": true,
    "page:consumer-duty": true,
    "page:policies": true,
    "page:compliance": true,
    "page:reports": true,
    "page:risk-acceptances": true,
    "can:toggle-risk-focus": true,
  },
  OWNER: {
    "page:dashboard": true,
    "page:risk-register": true,
    "page:actions": true,
    "page:controls": true,
    "page:consumer-duty": true,
    "page:policies": true,
    "page:compliance": true,
    "page:reports": true,
    "page:risk-acceptances": true,
    "create:risk": true,
    "create:action": true,
    "edit:risk": true,
    "edit:action": true,
  },
  VIEWER: {
    "page:dashboard": true,
    "page:risk-register": true,
    "page:actions": true,
    "page:consumer-duty": true,
    "page:policies": true,
    "page:compliance": true,
    "page:reports": true,
    "page:risk-acceptances": true,
  },
};

/**
 * Resolve a single permission for a user.
 * Priority: user override > role setting > hardcoded default
 */
export function resolvePermission(
  permission: PermissionCode,
  role: Role,
  rolePerms: { permission: string; granted: boolean }[],
  userPerms: { permission: string; granted: boolean }[],
): boolean {
  const userOverride = userPerms.find((p) => p.permission === permission);
  if (userOverride) return userOverride.granted;
  const roleSetting = rolePerms.find((p) => p.permission === permission);
  if (roleSetting) return roleSetting.granted;
  return DEFAULT_ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/** Resolve all permissions into a set of granted codes */
export function resolveAllPermissions(
  role: Role,
  rolePerms: { permission: string; granted: boolean }[],
  userPerms: { permission: string; granted: boolean }[],
): Set<PermissionCode> {
  const granted = new Set<PermissionCode>();
  for (const code of PERMISSION_CODES) {
    if (resolvePermission(code, role, rolePerms, userPerms)) {
      granted.add(code);
    }
  }
  return granted;
}
