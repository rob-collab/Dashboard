import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

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

export async function GET() {
  try {
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
    const body = await request.json();

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        logoBase64: body.logoBase64 ?? undefined,
        logoMarkBase64: body.logoMarkBase64 ?? undefined,
        logoX: body.logoX ?? undefined,
        logoY: body.logoY ?? undefined,
        logoScale: body.logoScale ?? undefined,
        primaryColour: body.primaryColour ?? undefined,
        accentColour: body.accentColour ?? undefined,
        updatedBy: body.updatedBy ?? undefined,
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
