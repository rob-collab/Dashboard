import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Replace NextResponse.json with a plain object so we can inspect data + status
// without needing a real Next.js server environment.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      _data: data,
      _status: init?.status ?? 200,
    }),
  },
}));

// Hoist prisma mock so the factory can reference it before imports are resolved.
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  rolePermission: { findMany: vi.fn() },
  userPermission: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import {
  getUserId,
  getViewAsUserId,
  getAuthUserId,
  jsonResponse,
  errorResponse,
  validateBody,
  validateQuery,
  requireCCRORole,
  auditLog,
  generateReference,
  checkPermission,
} from "@/lib/api-helpers";

// ── Test helpers ───────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", { headers });
}

/** Unwrap the mocked NextResponse to its data and status. */
function unwrap(r: unknown): { data: unknown; status: number } {
  const m = r as { _data: unknown; _status: number };
  return { data: m._data, status: m._status };
}

// ── getUserId ──────────────────────────────────────────────────────────────────

describe("getUserId", () => {
  it("returns the X-Verified-User-Id header value", () => {
    expect(getUserId(makeRequest({ "X-Verified-User-Id": "user-123" }))).toBe("user-123");
  });

  it("returns null when the header is absent", () => {
    expect(getUserId(makeRequest())).toBeNull();
  });

  it("ignores X-User-Id — only trusts the verified header", () => {
    expect(getUserId(makeRequest({ "X-User-Id": "spoof" }))).toBeNull();
  });
});

// ── getViewAsUserId ───────────────────────────────────────────────────────────

describe("getViewAsUserId", () => {
  it("returns X-User-Id when present", () => {
    const req = makeRequest({ "X-User-Id": "view-user", "X-Verified-User-Id": "real-user" });
    expect(getViewAsUserId(req)).toBe("view-user");
  });

  it("falls back to X-Verified-User-Id when X-User-Id is absent", () => {
    expect(getViewAsUserId(makeRequest({ "X-Verified-User-Id": "real-user" }))).toBe("real-user");
  });

  it("returns null when both headers are absent", () => {
    expect(getViewAsUserId(makeRequest())).toBeNull();
  });
});

// ── getAuthUserId ─────────────────────────────────────────────────────────────

describe("getAuthUserId", () => {
  it("delegates to getUserId and returns X-Verified-User-Id", () => {
    expect(getAuthUserId(makeRequest({ "X-Verified-User-Id": "user-456" }))).toBe("user-456");
  });

  it("returns null when header is absent", () => {
    expect(getAuthUserId(makeRequest())).toBeNull();
  });
});

// ── jsonResponse ──────────────────────────────────────────────────────────────

describe("jsonResponse", () => {
  it("returns the data with a default status of 200", () => {
    const { data, status } = unwrap(jsonResponse({ hello: "world" }));
    expect(data).toEqual({ hello: "world" });
    expect(status).toBe(200);
  });

  it("uses the provided status code", () => {
    expect(unwrap(jsonResponse({ ok: true }, 201)).status).toBe(201);
  });

  it("passes an array through unchanged", () => {
    const items = [1, 2, 3];
    expect(unwrap(jsonResponse(items)).data).toEqual(items);
  });
});

// ── errorResponse ─────────────────────────────────────────────────────────────

describe("errorResponse", () => {
  it("wraps the message in {error:…} and defaults to status 400", () => {
    const { data, status } = unwrap(errorResponse("Something went wrong"));
    expect(data).toEqual({ error: "Something went wrong" });
    expect(status).toBe(400);
  });

  it("uses the provided status code", () => {
    expect(unwrap(errorResponse("Not found", 404)).status).toBe(404);
  });

  it("handles a 401 status code", () => {
    expect(unwrap(errorResponse("Unauthorised", 401)).status).toBe(401);
  });
});

// ── validateBody ──────────────────────────────────────────────────────────────

describe("validateBody", () => {
  const NameSchema = z.object({ name: z.string().min(1) });

  it("returns {data} when input is valid", () => {
    const result = validateBody(NameSchema, { name: "Alice" });
    expect("data" in result).toBe(true);
    if ("data" in result) expect(result.data.name).toBe("Alice");
  });

  it("returns {error: 400} when a required field is missing", () => {
    const result = validateBody(NameSchema, {});
    expect("error" in result).toBe(true);
    if ("error" in result) {
      const { data, status } = unwrap(result.error);
      expect(status).toBe(400);
      expect((data as { error: string }).error).toContain("name");
    }
  });

  it("formats ZodError issues as 'path: message' joined by ', '", () => {
    const Schema = z.object({ a: z.string(), b: z.number() });
    const result = validateBody(Schema, { a: 123, b: "x" });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      const msg = (unwrap(result.error).data as { error: string }).error;
      expect(msg).toContain("a:");
      expect(msg).toContain("b:");
    }
  });

  it("returns {error: 400} for a non-object body", () => {
    const result = validateBody(NameSchema, "not-an-object");
    expect("error" in result).toBe(true);
  });

  it("returns 'Invalid request body' for non-ZodError exceptions", () => {
    // Use a duck-typed fake schema that throws a non-ZodError
    const throwingSchema = {
      parse: () => { throw new TypeError("unexpected"); },
    } as unknown as z.ZodSchema;
    const result = validateBody(throwingSchema, {});
    expect("error" in result).toBe(true);
    if ("error" in result) {
      const msg = (unwrap(result.error).data as { error: string }).error;
      expect(msg).toBe("Invalid request body");
    }
  });
});

// ── validateQuery ─────────────────────────────────────────────────────────────

describe("validateQuery", () => {
  const SearchSchema = z.object({ q: z.string().min(1) });

  it("returns {data} when URLSearchParams are valid", () => {
    const result = validateQuery(SearchSchema, new URLSearchParams({ q: "hello" }));
    expect("data" in result).toBe(true);
    if ("data" in result) expect(result.data.q).toBe("hello");
  });

  it("returns {error: 400} when a required param is missing", () => {
    const result = validateQuery(SearchSchema, new URLSearchParams());
    expect("error" in result).toBe(true);
    if ("error" in result) expect(unwrap(result.error).status).toBe(400);
  });

  it("parses multiple params correctly", () => {
    const Schema = z.object({ page: z.string(), limit: z.string() });
    const result = validateQuery(Schema, new URLSearchParams({ page: "2", limit: "10" }));
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.page).toBe("2");
      expect(result.data.limit).toBe("10");
    }
  });

  it("returns 'Invalid query parameters' for non-ZodError exceptions", () => {
    const throwingSchema = {
      parse: () => { throw new RangeError("unexpected"); },
    } as unknown as z.ZodSchema;
    const result = validateQuery(throwingSchema, new URLSearchParams());
    expect("error" in result).toBe(true);
    if ("error" in result) {
      const msg = (unwrap(result.error).data as { error: string }).error;
      expect(msg).toBe("Invalid query parameters");
    }
  });
});

// ── requireCCRORole ───────────────────────────────────────────────────────────

describe("requireCCRORole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns {error: 401} when no user id header is present", async () => {
    const result = await requireCCRORole(makeRequest());
    expect("error" in result).toBe(true);
    if ("error" in result) expect(unwrap(result.error).status).toBe(401);
  });

  it("returns {error: 403} when the user is not found in the DB", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await requireCCRORole(makeRequest({ "X-Verified-User-Id": "u1" }));
    expect("error" in result).toBe(true);
    if ("error" in result) expect(unwrap(result.error).status).toBe(403);
  });

  it("returns {error: 403} when the user role is not CCRO_TEAM", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "CEO" });
    const result = await requireCCRORole(makeRequest({ "X-Verified-User-Id": "u1" }));
    expect("error" in result).toBe(true);
    if ("error" in result) expect(unwrap(result.error).status).toBe(403);
  });

  it("returns {userId} when the user has CCRO_TEAM role", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "CCRO_TEAM" });
    const result = await requireCCRORole(makeRequest({ "X-Verified-User-Id": "user-abc" }));
    expect("userId" in result).toBe(true);
    if ("userId" in result) expect(result.userId).toBe("user-abc");
  });
});

// ── auditLog ──────────────────────────────────────────────────────────────────

describe("auditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  it("calls prisma.auditLog.create with the correct required fields", () => {
    auditLog({ userId: "u1", action: "CREATE", entityType: "risk" });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
    const { data } = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(data.userId).toBe("u1");
    expect(data.action).toBe("CREATE");
    expect(data.entityType).toBe("risk");
  });

  it("defaults userRole to CCRO_TEAM when not provided", () => {
    auditLog({ userId: "u1", action: "UPDATE", entityType: "control" });
    const { data } = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(data.userRole).toBe("CCRO_TEAM");
  });

  it("uses the provided userRole when given", () => {
    auditLog({ userId: "u1", action: "VIEW", entityType: "risk", userRole: "CEO" });
    const { data } = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(data.userRole).toBe("CEO");
  });

  it("defaults entityId, changes, and reportId to null", () => {
    auditLog({ userId: "u1", action: "DELETE", entityType: "action" });
    const { data } = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(data.entityId).toBeNull();
    expect(data.changes).toBeNull();
    expect(data.reportId).toBeNull();
  });

  it("passes optional fields through when provided", () => {
    auditLog({
      userId: "u2",
      action: "EDIT",
      entityType: "policy",
      entityId: "pol-1",
      changes: { name: "updated" },
      reportId: "rep-1",
    });
    const { data } = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(data.entityId).toBe("pol-1");
    expect(data.changes).toEqual({ name: "updated" });
    expect(data.reportId).toBe("rep-1");
  });
});

// ── generateReference ─────────────────────────────────────────────────────────

describe("generateReference", () => {
  // The function accesses prisma dynamically as (prisma as any)[model],
  // so we attach a mock model object to the prisma mock in beforeEach.
  const mockModel = { findMany: vi.fn(), findFirst: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    (mockPrisma as unknown as Record<string, unknown>).action = mockModel;
  });

  it("generates a padded reference from 1 when there are no existing refs", async () => {
    mockModel.findMany.mockResolvedValue([]);
    mockModel.findFirst.mockResolvedValue(null);
    expect(await generateReference("ACT-", "action")).toBe("ACT-001");
  });

  it("increments from the last existing reference", async () => {
    mockModel.findMany.mockResolvedValue([
      { reference: "ACT-001" },
      { reference: "ACT-002" },
    ]);
    mockModel.findFirst.mockResolvedValue(null);
    expect(await generateReference("ACT-", "action")).toBe("ACT-003");
  });

  it("uses natural sort to find the true max (ACT-9 < ACT-10)", async () => {
    mockModel.findMany.mockResolvedValue([
      { reference: "ACT-009" },
      { reference: "ACT-001" },
      { reference: "ACT-010" },
    ]);
    mockModel.findFirst.mockResolvedValue(null);
    expect(await generateReference("ACT-", "action")).toBe("ACT-011");
  });

  it("respects a custom padWidth", async () => {
    mockModel.findMany.mockResolvedValue([]);
    mockModel.findFirst.mockResolvedValue(null);
    expect(await generateReference("R", "action", "reference", 4)).toBe("R0001");
  });

  it("retries on collision and returns the next available reference", async () => {
    // Last ref = ACT-001. Attempt 0: ACT-002 collides. Attempt 1: ACT-003 is free.
    mockModel.findMany.mockResolvedValue([{ reference: "ACT-001" }]);
    mockModel.findFirst
      .mockResolvedValueOnce({ id: "existing" }) // attempt 0: collision
      .mockResolvedValueOnce(null);              // attempt 1: available
    expect(await generateReference("ACT-", "action")).toBe("ACT-003");
  });

  it("falls back to a timestamp-based reference when all retries are exhausted", async () => {
    mockModel.findMany.mockResolvedValue([]);
    mockModel.findFirst.mockResolvedValue({ id: "always-exists" }); // always collides
    const ref = await generateReference("ACT-", "action");
    // Fallback format: prefix + Date.now().toString(36).toUpperCase()
    expect(ref).toMatch(/^ACT-[0-9A-Z]+$/);
  });
});

// ── checkPermission ───────────────────────────────────────────────────────────

describe("checkPermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns {granted: false, 401} when no user id header is present", async () => {
    const result = await checkPermission(makeRequest(), "page:dashboard");
    expect(result.granted).toBe(false);
    if (!result.granted) expect(unwrap(result.error).status).toBe(401);
  });

  it("returns {granted: false, 404} when the user is not found in the DB", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await checkPermission(makeRequest({ "X-Verified-User-Id": "u1" }), "page:dashboard");
    expect(result.granted).toBe(false);
    if (!result.granted) expect(unwrap(result.error).status).toBe(404);
  });

  it("returns {granted: false, 403} when permission is denied by default", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "VIEWER" });
    mockPrisma.rolePermission.findMany.mockResolvedValue([]);
    mockPrisma.userPermission.findMany.mockResolvedValue([]);
    const result = await checkPermission(makeRequest({ "X-Verified-User-Id": "u1" }), "can:manage-users");
    expect(result.granted).toBe(false);
    if (!result.granted) expect(unwrap(result.error).status).toBe(403);
  });

  it("includes the permission code in the 403 error message", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "VIEWER" });
    mockPrisma.rolePermission.findMany.mockResolvedValue([]);
    mockPrisma.userPermission.findMany.mockResolvedValue([]);
    const result = await checkPermission(makeRequest({ "X-Verified-User-Id": "u1" }), "delete:risk");
    expect(result.granted).toBe(false);
    if (!result.granted) {
      const msg = (unwrap(result.error).data as { error: string }).error;
      expect(msg).toContain("delete:risk");
    }
  });

  it("returns {granted: true, userId} for CCRO_TEAM with default permissions", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "CCRO_TEAM" });
    mockPrisma.rolePermission.findMany.mockResolvedValue([]);
    mockPrisma.userPermission.findMany.mockResolvedValue([]);
    const result = await checkPermission(makeRequest({ "X-Verified-User-Id": "user-abc" }), "can:manage-users");
    expect(result.granted).toBe(true);
    if (result.granted) expect(result.userId).toBe("user-abc");
  });

  it("grants permission via user-level override for a normally-restricted VIEWER", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "VIEWER" });
    mockPrisma.rolePermission.findMany.mockResolvedValue([]);
    mockPrisma.userPermission.findMany.mockResolvedValue([
      { permission: "can:manage-users", granted: true },
    ]);
    const result = await checkPermission(makeRequest({ "X-Verified-User-Id": "u1" }), "can:manage-users");
    expect(result.granted).toBe(true);
  });

  it("denies a normally-granted permission when revoked via user-level override", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "CCRO_TEAM" });
    mockPrisma.rolePermission.findMany.mockResolvedValue([]);
    mockPrisma.userPermission.findMany.mockResolvedValue([
      { permission: "page:dashboard", granted: false },
    ]);
    const result = await checkPermission(makeRequest({ "X-Verified-User-Id": "u1" }), "page:dashboard");
    expect(result.granted).toBe(false);
  });
});
