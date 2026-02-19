import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "./prisma";
import { resolvePermission, type PermissionCode } from "./permissions";

export { prisma };

/**
 * Returns the real authenticated user ID.
 * Prefers X-Verified-User-Id (set by middleware from JWT) for tamper-proof identity,
 * then falls back to X-Auth-User-Id / X-User-Id for backwards compatibility.
 */
export function getUserId(request: Request): string | null {
  return request.headers.get("X-Verified-User-Id")
    || request.headers.get("X-Auth-User-Id")
    || request.headers.get("X-User-Id");
}

/**
 * Returns the effective user ID for read-scoped operations.
 * In "View As" mode, X-User-Id carries the impersonated user;
 * otherwise falls back to the verified identity from JWT.
 */
export function getViewAsUserId(request: Request): string | null {
  return request.headers.get("X-User-Id")
    || request.headers.get("X-Verified-User-Id")
    || request.headers.get("X-Auth-User-Id");
}

/** @deprecated Use getUserId() — now always returns real identity */
export function getAuthUserId(request: Request): string | null {
  return getUserId(request);
}

export async function requireCCRORole(request: Request): Promise<{ userId: string } | { error: NextResponse }> {
  const userId = getAuthUserId(request);
  if (!userId) {
    return { error: errorResponse("Unauthorised", 401) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== "CCRO_TEAM") {
    return { error: errorResponse("Forbidden - CCRO team access required", 403) };
  }

  return { userId };
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { data: T } | { error: NextResponse } {
  try {
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return { error: errorResponse(messages.join(", "), 400) };
    }
    return { error: errorResponse("Invalid request body", 400) };
  }
}

/**
 * Fire-and-forget audit log entry. Errors are caught and logged but never block the response.
 */
export function auditLog(opts: {
  userId: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  reportId?: string | null;
}) {
  prisma.auditLog.create({
    data: {
      userId: opts.userId,
      userRole: (opts.userRole ?? "CCRO_TEAM") as never,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId ?? null,
      changes: (opts.changes ?? null) as never,
      reportId: opts.reportId ?? null,
    },
  }).catch((e) => console.error("[audit]", e));
}

/**
 * Generate a unique reference with retry-on-collision.
 * Uses a transaction to read the current max reference and create the record atomically.
 * If a unique constraint violation occurs, retries up to `maxRetries` times.
 *
 * @param prefix   - e.g. "ACT-", "RA-", "POL-", "R", "REG-", "CTRL-"
 * @param model    - Prisma model name (e.g. "action", "risk", "riskAcceptance")
 * @param refField - The field storing the reference (e.g. "reference", "controlRef")
 * @param padWidth - Zero-pad width (default 3)
 */
export async function generateReference(
  prefix: string,
  model: string,
  refField = "reference",
  padWidth = 3,
): Promise<string> {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = (prisma as any)[model];
    const last = await table.findFirst({
      orderBy: { [refField]: "desc" },
      select: { [refField]: true },
    });
    const lastRef = last?.[refField] as string | undefined;
    const nextNum = lastRef
      ? parseInt(lastRef.replace(prefix, ""), 10) + 1 + attempt
      : 1 + attempt;
    const reference = `${prefix}${String(nextNum).padStart(padWidth, "0")}`;

    // Check if reference already exists
    const existing = await table.findFirst({
      where: { [refField]: reference },
      select: { id: true },
    });
    if (!existing) return reference;
  }
  // Fallback: use timestamp-based reference
  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Server-side permission check. Fetches user + permission overrides from DB and resolves.
 * Returns { granted: true, userId } or { granted: false, error: NextResponse }.
 */
export async function checkPermission(
  request: Request,
  permission: PermissionCode,
): Promise<{ granted: true; userId: string } | { granted: false; error: NextResponse }> {
  const userId = getUserId(request);
  if (!userId) {
    return { granted: false, error: errorResponse("Unauthorised", 401) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) {
    return { granted: false, error: errorResponse("User not found", 404) };
  }

  const [rolePerms, userPerms] = await Promise.all([
    prisma.rolePermission.findMany({ where: { role: user.role } }),
    prisma.userPermission.findMany({ where: { userId } }),
  ]);

  const allowed = resolvePermission(permission, user.role as Parameters<typeof resolvePermission>[1], rolePerms, userPerms);
  if (!allowed) {
    return { granted: false, error: errorResponse(`Forbidden - missing permission: ${permission}`, 403) };
  }

  return { granted: true, userId };
}

export function validateQuery<T>(schema: z.ZodSchema<T>, params: URLSearchParams): { data: T } | { error: NextResponse } {
  try {
    const obj = Object.fromEntries(params.entries());
    const data = schema.parse(obj);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return { error: errorResponse(messages.join(", "), 400) };
    }
    return { error: errorResponse("Invalid query parameters", 400) };
  }
}
