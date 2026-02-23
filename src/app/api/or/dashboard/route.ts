import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const [ibsList, scenarios, selfAssessments] = await Promise.all([
      prisma.importantBusinessService.findMany({
        where: { status: { not: "RETIRED" } },
        include: {
          processLinks: {
            include: {
              process: { select: { id: true, maturityScore: true, criticality: true } },
            },
          },
          resourceMaps: true,
          scenarios: { orderBy: { testedAt: "desc" } },
        },
        orderBy: { reference: "asc" },
      }),
      prisma.resilienceScenario.findMany({
        where: { remediationRequired: true, outcome: "BREACH" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.selfAssessment.findMany({ orderBy: { year: "desc" }, take: 1 }),
    ]);

    const currentYear = new Date().getFullYear();
    const currentAssessment = selfAssessments[0] ?? null;

    const ibsStats = ibsList.map((ibs) => {
      const processes = ibs.processLinks.map((l) => l.process);
      const processCount = processes.length;
      const avgMaturity = processCount > 0
        ? Math.round(processes.reduce((s, p) => s + p.maturityScore, 0) / processCount)
        : 0;

      const categoriesFilled = new Set(ibs.resourceMaps.filter((m) => {
        const content = m.content as Record<string, unknown>;
        return Object.keys(content).length > 0;
      }).map((m) => m.category)).size;

      const lastScenario = ibs.scenarios[0] ?? null;
      const openRemediations = ibs.scenarios.filter(
        (s) => s.remediationRequired && s.outcome === "BREACH"
      ).length;

      // Traffic light: green = 4-5 categories + maturity≥3 + scenario tested; amber = partial; red = gaps
      const readiness = categoriesFilled >= 4 && avgMaturity >= 3 && lastScenario && lastScenario.outcome !== "NOT_TESTED"
        ? "GREEN"
        : categoriesFilled >= 2 && avgMaturity >= 2
        ? "AMBER"
        : "RED";

      return {
        id: ibs.id,
        reference: ibs.reference,
        name: ibs.name,
        status: ibs.status,
        smfAccountable: ibs.smfAccountable,
        maxTolerableDisruptionHours: ibs.maxTolerableDisruptionHours,
        processCount,
        avgMaturity,
        categoriesFilled,
        lastTestedAt: lastScenario?.testedAt ?? null,
        lastOutcome: lastScenario?.outcome ?? "NOT_TESTED",
        openRemediations,
        readiness,
      };
    });

    const openRemediationsTotal = scenarios.length;
    const upcomingTests = await prisma.resilienceScenario.findMany({
      where: {
        nextTestDate: { gte: new Date() },
        status: { not: "COMPLETE" },
      },
      include: { ibs: { select: { reference: true, name: true } } },
      orderBy: { nextTestDate: "asc" },
      take: 5,
    });

    return jsonResponse(serialiseDates({
      ibs: ibsStats,
      openRemediationsTotal,
      upcomingTests,
      currentAssessment,
      currentYear,
      assessmentReadiness: currentAssessment
        ? Math.round(
            ((ibsStats.filter((i) => i.readiness === "GREEN").length / Math.max(ibsStats.length, 1)) * 100 +
              (ibsStats.filter((i) => i.lastTestedAt).length / Math.max(ibsStats.length, 1)) * 100 +
              (openRemediationsTotal === 0 ? 100 : Math.max(0, 100 - openRemediationsTotal * 10))) /
            3
          )
        : null,
    }));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch OR dashboard", 500);
  }
}
