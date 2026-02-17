import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "./prisma";

export { prisma };

export function getUserId(request: Request): string | null {
  return request.headers.get("X-User-Id");
}

export function getAuthUserId(request: Request): string | null {
  return request.headers.get("X-Auth-User-Id") || getUserId(request);
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
