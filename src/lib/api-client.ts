import { useAppStore } from "./store";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Converts a raw ApiError into a user-friendly message with optional description.
 * Hides database internals and provides actionable guidance.
 */
export function friendlyApiError(err: unknown): { message: string; description?: string } {
  if (!(err instanceof ApiError)) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      return { message: "Could not reach the server", description: "Check your network connection and try again." };
    }
    return { message: "An unexpected error occurred", description: "Please try again or contact support if the problem persists." };
  }

  const raw = err.message.toLowerCase();

  // Map HTTP status codes first
  switch (err.status) {
    case 400:
      return { message: "Invalid request", description: "Please check your inputs and try again." };
    case 401:
      return { message: "Session expired", description: "Please sign in again to continue." };
    case 403:
      return { message: "Access denied", description: "You don't have permission to perform this action." };
    case 404:
      return { message: "Item not found", description: "This record may have been deleted or moved." };
    case 409:
      if (raw.includes("unique") || raw.includes("already exists")) {
        return { message: "Duplicate record", description: "A record with this reference or name already exists." };
      }
      return { message: "Conflict", description: "This action conflicts with existing data. Please refresh and try again." };
    case 422:
      return { message: "Validation failed", description: "One or more fields contain invalid values." };
    case 500:
    case 502:
    case 503:
      break; // Fall through to content-based matching
  }

  // Content-based matching for DB/server errors
  if (raw.includes("foreign key") || raw.includes("constraint")) {
    return { message: "Cannot complete this action", description: "This record is linked to other items that must be updated first." };
  }
  if (raw.includes("unique constraint") || raw.includes("duplicate")) {
    return { message: "Duplicate record", description: "A record with this reference or name already exists." };
  }
  if (raw.includes("database") || raw.includes("prisma") || raw.includes("connection")) {
    return { message: "Database error", description: "Could not save changes. Please try again in a moment." };
  }
  if (raw.includes("timeout")) {
    return { message: "Request timed out", description: "The server took too long to respond. Please try again." };
  }

  // 5xx fallback
  if (err.status >= 500) {
    return { message: "Server error", description: "Something went wrong on our end. Please try again or contact support." };
  }

  // Fallback — show message but sanitise any stack traces or internal identifiers
  const sanitised = err.message
    .replace(/prisma\.\w+\.\w+/gi, "database operation")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]")
    .slice(0, 120);
  return { message: "Operation failed", description: sanitised };
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body } = opts;
  const state = useAppStore.getState();
  const userId = state.currentUser?.id;
  const authUserId = state.authUser?.id;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) {
    headers["X-User-Id"] = userId;
  }
  if (authUserId) {
    headers["X-Auth-User-Id"] = authUserId;
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error ?? body?.message ?? JSON.stringify(body);
    } catch {
      message = await res.text().catch(() => res.statusText);
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
