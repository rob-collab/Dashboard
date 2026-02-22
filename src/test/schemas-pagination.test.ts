import { describe, it, expect } from "vitest";
import {
  PaginationQuerySchema,
  getPaginationParams,
  paginatedResponse,
} from "@/lib/schemas/pagination";

// ── PaginationQuerySchema ─────────────────────────────────────────────────────

describe("PaginationQuerySchema", () => {
  it("defaults page to 1 and limit to 50 when absent", () => {
    const result = PaginationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
    }
  });

  it("transforms string page to number", () => {
    const result = PaginationQuerySchema.safeParse({ page: "3" });
    expect(result.success && result.data.page).toBe(3);
  });

  it("transforms string limit to number", () => {
    const result = PaginationQuerySchema.safeParse({ limit: "25" });
    expect(result.success && result.data.limit).toBe(25);
  });

  it("accepts both page and limit as strings", () => {
    const result = PaginationQuerySchema.safeParse({ page: "2", limit: "10" });
    expect(result.success && result.data.page).toBe(2);
    expect(result.success && result.data.limit).toBe(10);
  });
});

// ── getPaginationParams ───────────────────────────────────────────────────────

describe("getPaginationParams", () => {
  function params(obj: Record<string, string>) {
    return new URLSearchParams(obj);
  }

  it("returns defaults for empty URLSearchParams", () => {
    const result = getPaginationParams(params({}));
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(50);
  });

  it("parses page and limit from URLSearchParams", () => {
    const result = getPaginationParams(params({ page: "3", limit: "20" }));
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(40); // (3-1) * 20
    expect(result.take).toBe(20);
  });

  it("calculates skip correctly for page 1", () => {
    const result = getPaginationParams(params({ page: "1", limit: "10" }));
    expect(result.skip).toBe(0);
  });

  it("calculates skip correctly for page 5", () => {
    const result = getPaginationParams(params({ page: "5", limit: "10" }));
    expect(result.skip).toBe(40); // (5-1) * 10
  });

  it("clamps page to minimum of 1 when 0 is given", () => {
    const result = getPaginationParams(params({ page: "0" }));
    expect(result.page).toBe(1);
  });

  it("clamps page to minimum of 1 when negative is given", () => {
    const result = getPaginationParams(params({ page: "-5" }));
    expect(result.page).toBe(1);
  });

  it("clamps limit to maximum of 500", () => {
    const result = getPaginationParams(params({ limit: "999" }));
    expect(result.limit).toBe(500);
  });

  it("clamps limit to minimum of 1 when 0 is given", () => {
    const result = getPaginationParams(params({ limit: "0" }));
    expect(result.limit).toBe(1);
  });

  it("clamps limit to minimum of 1 when negative is given", () => {
    const result = getPaginationParams(params({ limit: "-10" }));
    expect(result.limit).toBe(1);
  });

  it("accepts limit at exact boundaries (1 and 500)", () => {
    expect(getPaginationParams(params({ limit: "1" })).limit).toBe(1);
    expect(getPaginationParams(params({ limit: "500" })).limit).toBe(500);
  });

  it("returns NaN for page and limit when params are non-numeric strings", () => {
    // PaginationQuerySchema uses z.string().transform(Number); Number("abc") → NaN.
    // Zod treats that as a successful parse, so the safeParse branch is not taken.
    // Math.max(NaN, 1) === NaN, so the clamp does not recover the value.
    const result = getPaginationParams(params({ page: "abc", limit: "xyz" }));
    expect(Number.isNaN(result.page)).toBe(true);
    expect(Number.isNaN(result.limit)).toBe(true);
  });

  it("skip is always (page-1) * limit", () => {
    for (const [p, l] of [[1, 10], [2, 10], [3, 25], [10, 5]]) {
      const result = getPaginationParams(params({ page: String(p), limit: String(l) }));
      expect(result.skip).toBe((result.page - 1) * result.limit);
    }
  });

  it("take always equals limit", () => {
    const result = getPaginationParams(params({ page: "2", limit: "30" }));
    expect(result.take).toBe(result.limit);
  });
});

// ── paginatedResponse ─────────────────────────────────────────────────────────

describe("paginatedResponse", () => {
  it("includes data array in response", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = paginatedResponse(items, 10, 1, 5);
    expect(result.data).toEqual(items);
  });

  it("sets total correctly", () => {
    const result = paginatedResponse([], 42, 1, 10);
    expect(result.pagination.total).toBe(42);
  });

  it("sets page and limit correctly", () => {
    const result = paginatedResponse([], 100, 3, 20);
    expect(result.pagination.page).toBe(3);
    expect(result.pagination.limit).toBe(20);
  });

  it("calculates totalPages as ceil(total / limit)", () => {
    expect(paginatedResponse([], 10, 1, 3).pagination.totalPages).toBe(4);   // ceil(10/3)
    expect(paginatedResponse([], 9, 1, 3).pagination.totalPages).toBe(3);    // ceil(9/3)
    expect(paginatedResponse([], 100, 1, 10).pagination.totalPages).toBe(10);
    expect(paginatedResponse([], 1, 1, 50).pagination.totalPages).toBe(1);
  });

  it("hasNext is true when page * limit < total", () => {
    expect(paginatedResponse([], 100, 1, 10).pagination.hasNext).toBe(true);  // 10 < 100
    expect(paginatedResponse([], 100, 9, 10).pagination.hasNext).toBe(true);  // 90 < 100
    expect(paginatedResponse([], 100, 10, 10).pagination.hasNext).toBe(false); // 100 == 100
    expect(paginatedResponse([], 100, 11, 10).pagination.hasNext).toBe(false); // 110 > 100
  });

  it("hasPrev is true when page > 1", () => {
    expect(paginatedResponse([], 100, 1, 10).pagination.hasPrev).toBe(false);
    expect(paginatedResponse([], 100, 2, 10).pagination.hasPrev).toBe(true);
    expect(paginatedResponse([], 100, 5, 10).pagination.hasPrev).toBe(true);
  });

  it("first page: hasPrev false, hasNext true when more pages exist", () => {
    const result = paginatedResponse([], 50, 1, 10);
    expect(result.pagination.hasPrev).toBe(false);
    expect(result.pagination.hasNext).toBe(true);
  });

  it("last page: hasPrev true, hasNext false", () => {
    const result = paginatedResponse([], 50, 5, 10);
    expect(result.pagination.hasPrev).toBe(true);
    expect(result.pagination.hasNext).toBe(false);
  });

  it("single page: hasPrev false, hasNext false", () => {
    const result = paginatedResponse([], 5, 1, 10);
    expect(result.pagination.hasPrev).toBe(false);
    expect(result.pagination.hasNext).toBe(false);
  });

  it("handles empty dataset (total = 0)", () => {
    const result = paginatedResponse([], 0, 1, 10);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(false);
  });

  it("works with typed data arrays", () => {
    const users = [{ id: "u1", name: "Alice" }, { id: "u2", name: "Bob" }];
    const result = paginatedResponse(users, 2, 1, 10);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe("Alice");
  });
});
