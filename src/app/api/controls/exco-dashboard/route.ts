import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateQuery } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

/* ── Schema ──────────────────────────────────────────────────────────────── */

const querySchema = z.object({
  periodYear: z.string().min(1, "periodYear is required"),
  periodMonth: z.string().min(1, "periodMonth is required"),
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */

type ControlVisibility = Record<string, "SHOW" | "SUMMARY_ONLY" | "HIDE">;

/** Determine the quarter string (e.g. "Q1 2026") for a given year/month. */
function getQuarterLabel(year: number, month: number): string {
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}

/* ── GET — Read-only ExCo dashboard data (VIEWER accessible) ─────────── */

export async function GET(request: NextRequest) {
  try {
    const result = validateQuery(querySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;

    const periodYear = parseInt(result.data.periodYear);
    const periodMonth = parseInt(result.data.periodMonth);

    if (isNaN(periodYear) || isNaN(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      return errorResponse("Invalid periodYear or periodMonth", 400);
    }

    /* ── 1. Fetch ExCo view config (or use defaults) ───────────────── */

    const configRow = await prisma.excoViewConfig.findUnique({
      where: {
        periodYear_periodMonth: { periodYear, periodMonth },
      },
      include: { configuredBy: true },
    });

    const config = configRow ?? {
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
      controlVisibility: {} as ControlVisibility,
      configuredById: null,
      configuredBy: null,
      createdAt: null,
      updatedAt: null,
    };

    const controlVisibility = (config.controlVisibility ?? {}) as ControlVisibility;

    /* ── 2. Fetch all active schedule entries with relations ────────── */

    const quarterLabel = getQuarterLabel(periodYear, periodMonth);

    const entries = await prisma.testingScheduleEntry.findMany({
      where: { isActive: true },
      include: {
        control: { include: { businessArea: true } },
        testResults: {
          where: { periodYear, periodMonth },
        },
        quarterlySummaries: {
          where: { status: "APPROVED" },
        },
      },
    });

    /* ── 3. Filter entries by controlVisibility ────────────────────── */

    // Controls not in the visibility map default to SHOW
    const visibleEntries = entries.filter((e) => {
      const vis = controlVisibility[e.controlId];
      return vis !== "HIDE";
    });

    /* ── 4. Build summary stats ────────────────────────────────────── */

    let summaryStats = null;
    if (config.showDashboardSummary) {
      let passed = 0;
      let failed = 0;
      let partially = 0;
      let notTested = 0;
      let notDue = 0;
      let attested = 0;

      for (const entry of visibleEntries) {
        const tr = entry.testResults[0];
        if (!tr) {
          notTested++;
          continue;
        }
        switch (tr.result) {
          case "PASS": passed++; break;
          case "FAIL": failed++; break;
          case "PARTIALLY": partially++; break;
          case "NOT_TESTED": notTested++; break;
          case "NOT_DUE": notDue++; break;
        }
      }

      // Attestation count: fetch separately for visible controls
      const visibleControlIds = visibleEntries.map((e) => e.controlId);
      if (visibleControlIds.length > 0) {
        const attestations = await prisma.controlAttestation.count({
          where: {
            controlId: { in: visibleControlIds },
            periodYear,
            periodMonth,
            attested: true,
          },
        });
        attested = attestations;
      }

      const totalActive = visibleEntries.length;
      const attestationRate = totalActive > 0 ? Math.round((attested / totalActive) * 100) : 0;

      summaryStats = {
        totalActive,
        passed,
        failed,
        partially,
        notTested,
        notDue,
        attestationRate,
      };
    }

    /* ── 5. Build pass-rate by business area ───────────────────────── */

    let byBusinessArea = null;
    if (config.showPassRateByArea) {
      const areaMap = new Map<string, {
        areaId: string;
        areaName: string;
        pass: number;
        fail: number;
        partially: number;
        notTested: number;
        notDue: number;
      }>();

      for (const entry of visibleEntries) {
        const area = entry.control.businessArea;
        if (!areaMap.has(area.id)) {
          areaMap.set(area.id, {
            areaId: area.id,
            areaName: area.name,
            pass: 0,
            fail: 0,
            partially: 0,
            notTested: 0,
            notDue: 0,
          });
        }
        const bucket = areaMap.get(area.id)!;
        const tr = entry.testResults[0];
        if (!tr) {
          bucket.notTested++;
          continue;
        }
        switch (tr.result) {
          case "PASS": bucket.pass++; break;
          case "FAIL": bucket.fail++; break;
          case "PARTIALLY": bucket.partially++; break;
          case "NOT_TESTED": bucket.notTested++; break;
          case "NOT_DUE": bucket.notDue++; break;
        }
      }

      byBusinessArea = Array.from(areaMap.values());
    }

    /* ── 6. Build pass-rate by Consumer Duty outcome ───────────────── */

    let byOutcome = null;
    if (config.showPassRateByCDOutcome) {
      const outcomeMap = new Map<string, {
        outcome: string;
        pass: number;
        fail: number;
        partially: number;
        notTested: number;
        notDue: number;
      }>();

      for (const entry of visibleEntries) {
        const outcome = entry.control.consumerDutyOutcome;
        if (!outcomeMap.has(outcome)) {
          outcomeMap.set(outcome, {
            outcome,
            pass: 0,
            fail: 0,
            partially: 0,
            notTested: 0,
            notDue: 0,
          });
        }
        const bucket = outcomeMap.get(outcome)!;
        const tr = entry.testResults[0];
        if (!tr) {
          bucket.notTested++;
          continue;
        }
        switch (tr.result) {
          case "PASS": bucket.pass++; break;
          case "FAIL": bucket.fail++; break;
          case "PARTIALLY": bucket.partially++; break;
          case "NOT_TESTED": bucket.notTested++; break;
          case "NOT_DUE": bucket.notDue++; break;
        }
      }

      byOutcome = Array.from(outcomeMap.values());
    }

    /* ── 7. Quarterly summaries (APPROVED only, for this quarter) ──── */

    let quarterlySummaries = null;
    if (config.showQuarterlySummaries) {
      const visibleControlIds = visibleEntries.map((e) => e.controlId);

      // Filter approved summaries from the entries that match this quarter
      const summaries: Array<{
        scheduleEntryId: string;
        controlId: string;
        controlRef: string;
        controlName: string;
        quarter: string;
        narrative: string;
        authorId: string;
        approvedAt: Date | null;
      }> = [];

      for (const entry of visibleEntries) {
        const vis = controlVisibility[entry.controlId];
        // SUMMARY_ONLY controls still get their quarterly summaries shown
        if (vis === "HIDE") continue;

        for (const qs of entry.quarterlySummaries) {
          if (qs.quarter === quarterLabel && visibleControlIds.includes(entry.controlId)) {
            summaries.push({
              scheduleEntryId: qs.scheduleEntryId,
              controlId: entry.controlId,
              controlRef: entry.control.controlRef,
              controlName: entry.control.controlName,
              quarter: qs.quarter,
              narrative: qs.narrative,
              authorId: qs.authorId,
              approvedAt: qs.approvedAt,
            });
          }
        }
      }

      quarterlySummaries = summaries;
    }

    /* ── 8. Build filtered control results ─────────────────────────── */

    const controlResults = visibleEntries.map((entry) => {
      const vis = controlVisibility[entry.controlId] ?? "SHOW";
      const tr = entry.testResults[0] ?? null;

      const base = {
        controlId: entry.controlId,
        controlRef: entry.control.controlRef,
        controlName: entry.control.controlName,
        businessAreaId: entry.control.businessAreaId,
        businessAreaName: entry.control.businessArea.name,
        consumerDutyOutcome: entry.control.consumerDutyOutcome,
        result: tr?.result ?? null,
        visibility: vis,
      };

      if (vis === "SUMMARY_ONLY") {
        // Exclude detailed notes/evidence for SUMMARY_ONLY controls
        return base;
      }

      // SHOW — include full details
      return {
        ...base,
        notes: tr?.notes ?? null,
        evidenceLinks: tr?.evidenceLinks ?? [],
        testedDate: tr?.testedDate ?? null,
        isBackdated: tr?.isBackdated ?? false,
      };
    });

    /* ── 9. Return assembled response ──────────────────────────────── */

    return jsonResponse(serialiseDates({
      config,
      summaryStats,
      byBusinessArea,
      byOutcome,
      quarterlySummaries,
      controlResults,
    }));
  } catch (err) {
    console.error("[GET /api/controls/exco-dashboard]", err);
    return errorResponse("Internal server error", 500);
  }
}
