import { describe, it, expect } from "vitest";
import {
  ALL_PERMISSIONS,
  PERMISSION_CODES,
  PERMISSION_CATEGORIES,
  DEFAULT_ROLE_PERMISSIONS,
  resolvePermission,
  resolveAllPermissions,
} from "@/lib/permissions";

// ── ALL_PERMISSIONS integrity ─────────────────────────────────────────────────

describe("ALL_PERMISSIONS", () => {
  it("every code has a non-empty label", () => {
    for (const [code, meta] of Object.entries(ALL_PERMISSIONS)) {
      expect(meta.label.length, `label missing for ${code}`).toBeGreaterThan(0);
    }
  });

  it("every code has a valid category", () => {
    const valid = new Set<string>(PERMISSION_CATEGORIES);
    for (const [code, meta] of Object.entries(ALL_PERMISSIONS)) {
      expect(valid.has(meta.category), `bad category for ${code}: "${meta.category}"`).toBe(true);
    }
  });

  it("contains all expected categories", () => {
    const present = new Set(Object.values(ALL_PERMISSIONS).map((m) => m.category));
    for (const cat of PERMISSION_CATEGORIES) {
      expect(present.has(cat), `category "${cat}" not used`).toBe(true);
    }
  });
});

// ── PERMISSION_CODES ──────────────────────────────────────────────────────────

describe("PERMISSION_CODES", () => {
  it("contains every key in ALL_PERMISSIONS", () => {
    const allKeys = Object.keys(ALL_PERMISSIONS);
    expect(PERMISSION_CODES).toHaveLength(allKeys.length);
    for (const key of allKeys) {
      expect(PERMISSION_CODES).toContain(key);
    }
  });

  it("has no duplicates", () => {
    const unique = new Set(PERMISSION_CODES);
    expect(unique.size).toBe(PERMISSION_CODES.length);
  });
});

// ── DEFAULT_ROLE_PERMISSIONS ──────────────────────────────────────────────────

describe("DEFAULT_ROLE_PERMISSIONS", () => {
  it("CCRO_TEAM has every permission granted", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.CCRO_TEAM;
    for (const code of PERMISSION_CODES) {
      expect(perms[code], `CCRO_TEAM missing ${code}`).toBe(true);
    }
  });

  it("CCRO_TEAM permission count equals total PERMISSION_CODES count", () => {
    const granted = Object.values(DEFAULT_ROLE_PERMISSIONS.CCRO_TEAM).filter(Boolean);
    expect(granted).toHaveLength(PERMISSION_CODES.length);
  });

  it("CEO has page access but not admin capabilities", () => {
    const ceo = DEFAULT_ROLE_PERMISSIONS.CEO;
    expect(ceo["page:dashboard"]).toBe(true);
    expect(ceo["page:risk-register"]).toBe(true);
    expect(ceo["can:manage-users"]).toBeUndefined();
    expect(ceo["can:manage-settings"]).toBeUndefined();
    expect(ceo["delete:risk"]).toBeUndefined();
  });

  it("CEO has can:toggle-risk-focus", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.CEO["can:toggle-risk-focus"]).toBe(true);
  });

  it("OWNER has create and edit permissions but not delete", () => {
    const owner = DEFAULT_ROLE_PERMISSIONS.OWNER;
    expect(owner["create:risk"]).toBe(true);
    expect(owner["create:action"]).toBe(true);
    expect(owner["edit:risk"]).toBe(true);
    expect(owner["edit:action"]).toBe(true);
    expect(owner["delete:risk"]).toBeUndefined();
    expect(owner["can:manage-users"]).toBeUndefined();
    expect(owner["can:bypass-approval"]).toBeUndefined();
  });

  it("VIEWER has only read-only page access", () => {
    const viewer = DEFAULT_ROLE_PERMISSIONS.VIEWER;
    expect(viewer["page:dashboard"]).toBe(true);
    expect(viewer["create:risk"]).toBeUndefined();
    expect(viewer["edit:risk"]).toBeUndefined();
    expect(viewer["delete:risk"]).toBeUndefined();
    expect(viewer["can:manage-users"]).toBeUndefined();
    expect(viewer["page:audit"]).toBeUndefined();
    expect(viewer["page:settings"]).toBeUndefined();
    expect(viewer["page:users"]).toBeUndefined();
  });
});

// ── resolvePermission ─────────────────────────────────────────────────────────

describe("resolvePermission", () => {
  // ── Fallback to role defaults ───────────────────────────────────────────────

  it("returns true for CCRO_TEAM when no overrides (default grants all)", () => {
    expect(resolvePermission("can:manage-users", "CCRO_TEAM", [], [])).toBe(true);
  });

  it("returns true for a VIEWER page permission when no overrides", () => {
    expect(resolvePermission("page:dashboard", "VIEWER", [], [])).toBe(true);
  });

  it("returns false for a permission VIEWER doesn't have by default", () => {
    expect(resolvePermission("can:manage-users", "VIEWER", [], [])).toBe(false);
  });

  it("returns false for a permission CEO doesn't have by default", () => {
    expect(resolvePermission("can:manage-users", "CEO", [], [])).toBe(false);
  });

  it("returns false for an unknown/unset permission on a restricted role", () => {
    expect(resolvePermission("delete:risk", "VIEWER", [], [])).toBe(false);
  });

  // ── Role-level override ────────────────────────────────────────────────────

  it("role setting grants a permission not in defaults", () => {
    const rolePerms = [{ permission: "can:manage-users", granted: true }];
    expect(resolvePermission("can:manage-users", "VIEWER", rolePerms, [])).toBe(true);
  });

  it("role setting revokes a permission that is in defaults", () => {
    const rolePerms = [{ permission: "page:dashboard", granted: false }];
    expect(resolvePermission("page:dashboard", "CCRO_TEAM", rolePerms, [])).toBe(false);
  });

  // ── User-level override (highest priority) ─────────────────────────────────

  it("user override grants a permission the role setting denies", () => {
    const rolePerms = [{ permission: "can:manage-users", granted: false }];
    const userPerms = [{ permission: "can:manage-users", granted: true }];
    expect(resolvePermission("can:manage-users", "VIEWER", rolePerms, userPerms)).toBe(true);
  });

  it("user override revokes a permission the role setting grants", () => {
    const rolePerms = [{ permission: "can:manage-users", granted: true }];
    const userPerms = [{ permission: "can:manage-users", granted: false }];
    expect(resolvePermission("can:manage-users", "VIEWER", rolePerms, userPerms)).toBe(false);
  });

  it("user override revokes a permission that is in CCRO_TEAM defaults", () => {
    const userPerms = [{ permission: "page:dashboard", granted: false }];
    expect(resolvePermission("page:dashboard", "CCRO_TEAM", [], userPerms)).toBe(false);
  });

  it("user override takes precedence over both role setting and default", () => {
    // Default: CCRO_TEAM → true; role: true; user: false → result: false
    const rolePerms = [{ permission: "page:dashboard", granted: true }];
    const userPerms = [{ permission: "page:dashboard", granted: false }];
    expect(resolvePermission("page:dashboard", "CCRO_TEAM", rolePerms, userPerms)).toBe(false);
  });

  // ── Priority chain ─────────────────────────────────────────────────────────

  it("ignores role perms for a different code when checking user override", () => {
    // User override only for "create:risk"; checking "edit:risk" falls through to default
    const userPerms = [{ permission: "create:risk", granted: false }];
    // OWNER has edit:risk by default → true
    expect(resolvePermission("edit:risk", "OWNER", [], userPerms)).toBe(true);
  });

  it("unrelated entries in rolePerms and userPerms do not interfere", () => {
    const rolePerms = [{ permission: "create:risk", granted: true }];
    const userPerms = [{ permission: "create:action", granted: true }];
    // VIEWER has no edit:risk by default, no override for it
    expect(resolvePermission("edit:risk", "VIEWER", rolePerms, userPerms)).toBe(false);
  });
});

// ── resolveAllPermissions ─────────────────────────────────────────────────────

describe("resolveAllPermissions", () => {
  it("CCRO_TEAM with no overrides gets every permission", () => {
    const granted = resolveAllPermissions("CCRO_TEAM", [], []);
    for (const code of PERMISSION_CODES) {
      expect(granted.has(code), `CCRO_TEAM should have ${code}`).toBe(true);
    }
    expect(granted.size).toBe(PERMISSION_CODES.length);
  });

  it("VIEWER with no overrides gets only default VIEWER permissions", () => {
    const granted = resolveAllPermissions("VIEWER", [], []);
    const expected = Object.entries(DEFAULT_ROLE_PERMISSIONS.VIEWER)
      .filter(([, v]) => v)
      .map(([k]) => k);
    expect(granted.size).toBe(expected.length);
    for (const code of expected) {
      expect(granted.has(code as never)).toBe(true);
    }
    expect(granted.has("can:manage-users")).toBe(false);
    expect(granted.has("delete:risk")).toBe(false);
  });

  it("CEO with no overrides gets only default CEO permissions", () => {
    const granted = resolveAllPermissions("CEO", [], []);
    expect(granted.has("page:dashboard")).toBe(true);
    expect(granted.has("can:toggle-risk-focus")).toBe(true);
    expect(granted.has("can:manage-users")).toBe(false);
    expect(granted.has("delete:risk")).toBe(false);
  });

  it("OWNER with no overrides has create/edit but not delete", () => {
    const granted = resolveAllPermissions("OWNER", [], []);
    expect(granted.has("create:risk")).toBe(true);
    expect(granted.has("edit:risk")).toBe(true);
    expect(granted.has("delete:risk")).toBe(false);
  });

  it("role override adds a permission beyond the default", () => {
    const rolePerms = [{ permission: "can:manage-users", granted: true }];
    const granted = resolveAllPermissions("VIEWER", rolePerms, []);
    expect(granted.has("can:manage-users")).toBe(true);
  });

  it("user override removes a permission from CCRO_TEAM", () => {
    const userPerms = [{ permission: "can:manage-users", granted: false }];
    const granted = resolveAllPermissions("CCRO_TEAM", [], userPerms);
    expect(granted.has("can:manage-users")).toBe(false);
    // All other CCRO permissions still present
    expect(granted.has("page:dashboard")).toBe(true);
  });

  it("returns a Set<PermissionCode>", () => {
    const granted = resolveAllPermissions("VIEWER", [], []);
    expect(granted).toBeInstanceOf(Set);
  });

  it("Set contains only valid PermissionCodes", () => {
    const granted = resolveAllPermissions("OWNER", [], []);
    const valid = new Set(PERMISSION_CODES);
    for (const code of granted) {
      expect(valid.has(code), `unexpected code in result: ${code}`).toBe(true);
    }
  });
});
