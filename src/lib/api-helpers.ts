import { NextResponse } from "next/server";
import prisma from "./prisma";

export { prisma };

export function getUserId(request: Request): string | null {
  return request.headers.get("X-User-Id");
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
