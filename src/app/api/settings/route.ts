import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId, requireCCRORole } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

// Allow large payloads for base64 logo uploads
export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULTS = {
  id: "default",
  logoBase64: null,
  logoMarkBase64: null,
  logoX: 16,
  logoY: 16,
  logoScale: 1.0,
  primaryColour: null,
  accentColour: null,
  updatedAt: new Date().toISOString(),
  updatedBy: null,
};

/** Return value if key is in body, otherwise undefined (so Prisma skips it) */
function pick<T>(body: Record<string, unknown>, key: string): T | undefined {
  return key in body ? (body[key] as T) : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });
    return jsonResponse(settings ? serialiseDates(settings) : DEFAULTS);
  } catch (error) {
    console.error("[GET /api/settings]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch settings",
      500,
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        logoBase64: pick(body, "logoBase64"),
        logoMarkBase64: pick(body, "logoMarkBase64"),
        logoX: pick(body, "logoX"),
        logoY: pick(body, "logoY"),
        logoScale: pick(body, "logoScale"),
        primaryColour: pick(body, "primaryColour"),
        accentColour: pick(body, "accentColour"),
        updatedBy: pick(body, "updatedBy"),
      },
      create: {
        id: "default",
        logoBase64: body.logoBase64 ?? null,
        logoMarkBase64: body.logoMarkBase64 ?? null,
        logoX: body.logoX ?? 16,
        logoY: body.logoY ?? 16,
        logoScale: body.logoScale ?? 1.0,
        primaryColour: body.primaryColour ?? null,
        accentColour: body.accentColour ?? null,
        updatedBy: body.updatedBy ?? null,
      },
    });

    return jsonResponse(serialiseDates(settings));
  } catch (error) {
    console.error("[PUT /api/settings]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update settings",
      500,
    );
  }
}
