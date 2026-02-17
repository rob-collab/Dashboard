import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, validateQuery } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

/* ── Schemas ─────────────────────────────────────────────────────────────── */

const periodQuerySchema = z.object({
  periodYear: z.string().min(1, "periodYear is required"),
  periodMonth: z.string().min(1, "periodMonth is required"),
});

const upsertSchema = z.object({
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  showDashboardSummary: z.boolean(),
  showPassRateByArea: z.boolean(),
  showPassRateByCDOutcome: z.boolean(),
  showAttestationOverview: z.boolean(),
  showAttentionRequired: z.boolean(),
  showTrendAnalysis: z.boolean(),
  showQuarterlySummaries: z.boolean(),
  controlVisibility: z.record(z.string(), z.enum(["SHOW", "SUMMARY_ONLY", "HIDE"])),
});

/* ── Default config (returned when none exists for a period) ─────────── */

function defaultConfig(periodYear: number, periodMonth: number) {
  return {
    id: null,
    periodYear,
    periodMonth,
    showDashboardSummary: true,
    showPassRateByArea: true,
    showPassRateByCDOutcome: true,
    showAttestationOverview: true,
    showAttentionRequired: true,
    showTrendAnalysis: true,
    showQuarterlySummaries: true,
    controlVisibility: {},
    configuredById: null,
    configuredBy: null,
    createdAt: null,
    updatedAt: null,
  };
}

/* ── GET — Fetch config for a period (or return defaults) ────────────── */

export async function GET(request: NextRequest) {
  try {
    const result = validateQuery(periodQuerySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;

    const periodYear = parseInt(result.data.periodYear);
    const periodMonth = parseInt(result.data.periodMonth);

    if (isNaN(periodYear) || isNaN(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      return errorResponse("Invalid periodYear or periodMonth", 400);
    }

    const config = await prisma.excoViewConfig.findUnique({
      where: {
        periodYear_periodMonth: { periodYear, periodMonth },
      },
      include: {
        configuredBy: true,
      },
    });

    if (!config) {
      return jsonResponse(defaultConfig(periodYear, periodMonth));
    }

    return jsonResponse(serialiseDates(config));
  } catch (err) {
    console.error("[GET /api/controls/exco-view-config]", err);
    return errorResponse("Internal server error", 500);
  }
}

/* ── PUT — Upsert config for a period (CCRO only) ───────────────────── */

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const body = await request.json();
    const result = validateBody(upsertSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    const config = await prisma.excoViewConfig.upsert({
      where: {
        periodYear_periodMonth: {
          periodYear: data.periodYear,
          periodMonth: data.periodMonth,
        },
      },
      update: {
        showDashboardSummary: data.showDashboardSummary,
        showPassRateByArea: data.showPassRateByArea,
        showPassRateByCDOutcome: data.showPassRateByCDOutcome,
        showAttestationOverview: data.showAttestationOverview,
        showAttentionRequired: data.showAttentionRequired,
        showTrendAnalysis: data.showTrendAnalysis,
        showQuarterlySummaries: data.showQuarterlySummaries,
        controlVisibility: data.controlVisibility,
        configuredById: userId,
      },
      create: {
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        showDashboardSummary: data.showDashboardSummary,
        showPassRateByArea: data.showPassRateByArea,
        showPassRateByCDOutcome: data.showPassRateByCDOutcome,
        showAttestationOverview: data.showAttestationOverview,
        showAttentionRequired: data.showAttentionRequired,
        showTrendAnalysis: data.showTrendAnalysis,
        showQuarterlySummaries: data.showQuarterlySummaries,
        controlVisibility: data.controlVisibility,
        configuredById: userId,
      },
      include: {
        configuredBy: true,
      },
    });

    return jsonResponse(serialiseDates(config));
  } catch (err) {
    console.error("[PUT /api/controls/exco-view-config]", err);
    return errorResponse("Internal server error", 500);
  }
}
