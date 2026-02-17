import { useAppStore } from "./store";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body } = opts;
  const userId = useAppStore.getState().currentUser?.id;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) {
    headers["X-User-Id"] = userId;
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
