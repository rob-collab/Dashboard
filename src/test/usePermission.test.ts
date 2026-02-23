import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock the store before importing the hooks
vi.mock("@/lib/store", () => ({
  useAppStore: vi.fn(),
}));

import { useAppStore } from "@/lib/store";
import {
  useHasPermission,
  useHasAnyPermission,
  usePermissionSet,
} from "@/lib/usePermission";

// ── Helpers ───────────────────────────────────────────────────────────────────

type FakeState = {
  currentUser: { id: string; role: "CCRO_TEAM" | "CEO" | "OWNER" | "VIEWER" } | null;
  rolePermissions: { role: string; permission: string; granted: boolean }[];
  userPermissions: { userId: string; permission: string; granted: boolean }[];
};

function mockStore(state: FakeState) {
  vi.mocked(useAppStore).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (selector: (s: any) => unknown) => selector(state)
  );
}

const noUser: FakeState = {
  currentUser: null,
  rolePermissions: [],
  userPermissions: [],
};

const ccroUser: FakeState = {
  currentUser: { id: "u1", role: "CCRO_TEAM" },
  rolePermissions: [],
  userPermissions: [],
};

const viewerUser: FakeState = {
  currentUser: { id: "u2", role: "VIEWER" },
  rolePermissions: [],
  userPermissions: [],
};

// ── useHasPermission ──────────────────────────────────────────────────────────

describe("useHasPermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when there is no current user", () => {
    mockStore(noUser);
    const { result } = renderHook(() => useHasPermission("page:dashboard"));
    expect(result.current).toBe(false);
  });

  it("returns true for a permission granted to CCRO_TEAM by default", () => {
    mockStore(ccroUser);
    const { result } = renderHook(() => useHasPermission("page:dashboard"));
    expect(result.current).toBe(true);
  });

  it("returns true for create:risk which CCRO_TEAM has by default", () => {
    mockStore(ccroUser);
    const { result } = renderHook(() => useHasPermission("create:risk"));
    expect(result.current).toBe(true);
  });

  it("returns false for an admin-only permission for a VIEWER", () => {
    mockStore(viewerUser);
    const { result } = renderHook(() => useHasPermission("can:manage-users"));
    expect(result.current).toBe(false);
  });

  it("returns true for page:dashboard which VIEWER has by default", () => {
    mockStore(viewerUser);
    const { result } = renderHook(() => useHasPermission("page:dashboard"));
    expect(result.current).toBe(true);
  });

  it("respects a role-level override that grants a permission", () => {
    mockStore({
      currentUser: { id: "u3", role: "VIEWER" },
      rolePermissions: [{ role: "VIEWER", permission: "can:manage-users", granted: true }],
      userPermissions: [],
    });
    const { result } = renderHook(() => useHasPermission("can:manage-users"));
    expect(result.current).toBe(true);
  });

  it("respects a user-level override that revokes a permission", () => {
    mockStore({
      currentUser: { id: "u4", role: "CCRO_TEAM" },
      rolePermissions: [],
      userPermissions: [{ userId: "u4", permission: "page:dashboard", granted: false }],
    });
    const { result } = renderHook(() => useHasPermission("page:dashboard"));
    expect(result.current).toBe(false);
  });

  it("user override takes priority over role override", () => {
    mockStore({
      currentUser: { id: "u5", role: "VIEWER" },
      rolePermissions: [{ role: "VIEWER", permission: "create:risk", granted: true }],
      userPermissions: [{ userId: "u5", permission: "create:risk", granted: false }],
    });
    const { result } = renderHook(() => useHasPermission("create:risk"));
    expect(result.current).toBe(false);
  });
});

// ── useHasAnyPermission ───────────────────────────────────────────────────────

describe("useHasAnyPermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when there is no current user", () => {
    mockStore(noUser);
    const { result } = renderHook(() =>
      useHasAnyPermission("page:dashboard", "create:risk")
    );
    expect(result.current).toBe(false);
  });

  it("returns true when the user has at least one of the permissions", () => {
    mockStore(viewerUser);
    // VIEWER has page:dashboard but not can:manage-users
    const { result } = renderHook(() =>
      useHasAnyPermission("can:manage-users", "page:dashboard")
    );
    expect(result.current).toBe(true);
  });

  it("returns false when the user has none of the requested permissions", () => {
    mockStore(viewerUser);
    const { result } = renderHook(() =>
      useHasAnyPermission("can:manage-users", "can:bypass-approval")
    );
    expect(result.current).toBe(false);
  });

  it("returns true when the user has all of the requested permissions", () => {
    mockStore(ccroUser);
    const { result } = renderHook(() =>
      useHasAnyPermission("create:risk", "delete:risk", "can:manage-users")
    );
    expect(result.current).toBe(true);
  });

  it("returns false when called with no permission codes and no user", () => {
    mockStore(noUser);
    const { result } = renderHook(() => useHasAnyPermission());
    expect(result.current).toBe(false);
  });
});

// ── usePermissionSet ──────────────────────────────────────────────────────────

describe("usePermissionSet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an empty Set when there is no current user", () => {
    mockStore(noUser);
    const { result } = renderHook(() => usePermissionSet());
    expect(result.current).toBeInstanceOf(Set);
    expect(result.current.size).toBe(0);
  });

  it("returns a Set containing all default CCRO_TEAM permissions", () => {
    mockStore(ccroUser);
    const { result } = renderHook(() => usePermissionSet());
    expect(result.current).toBeInstanceOf(Set);
    expect(result.current.has("page:dashboard")).toBe(true);
    expect(result.current.has("create:risk")).toBe(true);
    expect(result.current.has("can:manage-users")).toBe(true);
  });

  it("returns only VIEWER's default permissions for a VIEWER user", () => {
    mockStore(viewerUser);
    const { result } = renderHook(() => usePermissionSet());
    expect(result.current.has("page:dashboard")).toBe(true);
    expect(result.current.has("can:manage-users")).toBe(false);
    expect(result.current.has("create:risk")).toBe(false);
  });

  it("includes permissions granted via role override", () => {
    mockStore({
      currentUser: { id: "u6", role: "VIEWER" },
      rolePermissions: [{ role: "VIEWER", permission: "create:risk", granted: true }],
      userPermissions: [],
    });
    const { result } = renderHook(() => usePermissionSet());
    expect(result.current.has("create:risk")).toBe(true);
  });

  it("excludes permissions revoked via user override", () => {
    mockStore({
      currentUser: { id: "u7", role: "CCRO_TEAM" },
      rolePermissions: [],
      userPermissions: [{ userId: "u7", permission: "can:manage-users", granted: false }],
    });
    const { result } = renderHook(() => usePermissionSet());
    expect(result.current.has("can:manage-users")).toBe(false);
  });
});
