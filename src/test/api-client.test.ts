import { describe, it, expect, vi } from "vitest";

// Mock the Zustand store before importing api-client (it's imported at module level)
vi.mock("@/lib/store", () => ({
  useAppStore: {
    getState: vi.fn(() => ({ currentUser: null, authUser: null })),
  },
}));

import { ApiError, friendlyApiError } from "@/lib/api-client";

// ── ApiError ─────────────────────────────────────────────────────────────────

describe("ApiError", () => {
  it("extends Error", () => {
    const err = new ApiError(404, "Not Found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it("sets name to ApiError", () => {
    const err = new ApiError(500, "Server Error");
    expect(err.name).toBe("ApiError");
  });

  it("stores the HTTP status code", () => {
    const err = new ApiError(403, "Forbidden");
    expect(err.status).toBe(403);
  });

  it("stores the message", () => {
    const err = new ApiError(400, "Bad Request");
    expect(err.message).toBe("Bad Request");
  });
});

// ── friendlyApiError ──────────────────────────────────────────────────────────

describe("friendlyApiError", () => {
  it("handles 400 — invalid request", () => {
    const result = friendlyApiError(new ApiError(400, "Bad Request"));
    expect(result.message).toBe("Invalid request");
  });

  it("handles 401 — session expired", () => {
    const result = friendlyApiError(new ApiError(401, "Unauthorized"));
    expect(result.message).toBe("Session expired");
  });

  it("handles 403 — access denied", () => {
    const result = friendlyApiError(new ApiError(403, "Forbidden"));
    expect(result.message).toBe("Access denied");
  });

  it("handles 404 — not found", () => {
    const result = friendlyApiError(new ApiError(404, "Not Found"));
    expect(result.message).toBe("Item not found");
  });

  it("handles 409 with duplicate/unique message", () => {
    const result = friendlyApiError(new ApiError(409, "unique constraint violation"));
    expect(result.message).toBe("Duplicate record");
  });

  it("handles 409 without duplicate mention — generic conflict", () => {
    const result = friendlyApiError(new ApiError(409, "Conflict"));
    expect(result.message).toBe("Conflict");
  });

  it("handles 422 — validation failed", () => {
    const result = friendlyApiError(new ApiError(422, "Unprocessable Entity"));
    expect(result.message).toBe("Validation failed");
  });

  it("handles 500 server error with database keyword in message", () => {
    const result = friendlyApiError(new ApiError(500, "Database connection error"));
    expect(result.message).toBe("Database error");
  });

  it("handles 500 server error with prisma keyword", () => {
    const result = friendlyApiError(new ApiError(500, "Prisma client error"));
    expect(result.message).toBe("Database error");
  });

  it("handles 500 with timeout keyword", () => {
    const result = friendlyApiError(new ApiError(500, "Request timeout"));
    expect(result.message).toBe("Request timed out");
  });

  it("handles generic 500 error", () => {
    const result = friendlyApiError(new ApiError(500, "Internal Server Error"));
    expect(result.message).toBe("Server error");
  });

  it("handles 502 and 503 as server errors", () => {
    expect(friendlyApiError(new ApiError(502, "Bad Gateway")).message).toBe("Server error");
    expect(friendlyApiError(new ApiError(503, "Service Unavailable")).message).toBe("Server error");
  });

  it("handles foreign key constraint message", () => {
    const result = friendlyApiError(new ApiError(500, "foreign key constraint violation"));
    expect(result.message).toBe("Cannot complete this action");
  });

  it("handles unknown non-ApiError TypeError with 'fetch'", () => {
    const err = new TypeError("Failed to fetch");
    const result = friendlyApiError(err);
    expect(result.message).toBe("Could not reach the server");
  });

  it("handles completely unknown error", () => {
    const result = friendlyApiError(new Error("Something random"));
    expect(result.message).toBe("An unexpected error occurred");
  });

  it("handles non-Error objects", () => {
    const result = friendlyApiError("oops");
    expect(result.message).toBe("An unexpected error occurred");
  });

  it("handles null", () => {
    const result = friendlyApiError(null);
    expect(result.message).toBe("An unexpected error occurred");
  });

  it("all results include a message string", () => {
    const cases = [400, 401, 403, 404, 409, 422, 500].map((status) =>
      friendlyApiError(new ApiError(status, "error"))
    );
    for (const r of cases) {
      expect(typeof r.message).toBe("string");
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it("sanitises UUID identifiers in fallback message", () => {
    // A non-keyword message at a non-standard status falls through to the sanitise branch.
    // Messages containing "prisma" are caught earlier by the database keyword check,
    // so we use a neutral message with a raw UUID to test the UUID-scrubbing regex.
    const result = friendlyApiError(new ApiError(418, "Record abc12345-1234-1234-1234-abcdef123456 could not be resolved"));
    expect(result.message).toBe("Operation failed");
    expect(result.description).toContain("[id]");
    expect(result.description).not.toContain("abc12345-1234-1234-1234-abcdef123456");
  });
});
