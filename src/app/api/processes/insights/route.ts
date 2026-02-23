import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  try {
    const processes = await prisma.process.findMany({
      include: {
        controlLinks: { select: { id: true } },
        policyLinks: { select: { id: true } },
        regulationLinks: { select: { id: true } },
        riskLinks: { select: { id: true } },
        ibsLinks: { select: { id: true, ibsId: true } },
        owner: { select: { id: true } },
      },
    });

    const ibs = await prisma.importantBusinessService.findMany({
      include: {
        processLinks: {
          include: {
            process: { select: { id: true, maturityScore: true, criticality: true, status: true } },
          },
        },
      },
    });

    // Maturity distribution
    const maturityDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const p of processes) {
      const s = Math.min(5, Math.max(1, p.maturityScore));
      maturityDistribution[s] = (maturityDistribution[s] ?? 0) + 1;
    }

    // Coverage gaps
    const noControls = processes
      .filter((p) => p.controlLinks.length === 0 && p.status !== "RETIRED")
      .map((p) => ({ id: p.id, reference: p.reference, name: p.name, maturityScore: p.maturityScore, criticality: p.criticality }));

    const noPolicies = processes
      .filter((p) => p.policyLinks.length === 0 && p.status !== "RETIRED")
      .map((p) => ({ id: p.id, reference: p.reference, name: p.name, maturityScore: p.maturityScore, criticality: p.criticality }));

    const noRegulations = processes
      .filter((p) => p.regulationLinks.length === 0 && p.status !== "RETIRED")
      .map((p) => ({ id: p.id, reference: p.reference, name: p.name, maturityScore: p.maturityScore, criticality: p.criticality }));

    // Owner / SMF gaps
    const noOwner = processes
      .filter((p) => !p.ownerId && p.status !== "RETIRED")
      .map((p) => ({ id: p.id, reference: p.reference, name: p.name, maturityScore: p.maturityScore }));

    const noSmf = processes
      .filter((p) => !p.smfFunction && p.status !== "RETIRED")
      .map((p) => ({ id: p.id, reference: p.reference, name: p.name, maturityScore: p.maturityScore }));

    // IBS coverage
    const ibsCoverage = ibs.map((i) => {
      const linked = i.processLinks.map((l) => l.process);
      const governed = linked.filter((p) => p.maturityScore >= 3).length;
      const critical = linked.filter((p) => p.criticality === "CRITICAL").length;
      const lowMaturityCritical = linked.filter((p) => p.criticality === "CRITICAL" && p.maturityScore <= 2).length;
      return {
        id: i.id,
        reference: i.reference,
        name: i.name,
        smfAccountable: i.smfAccountable,
        maxTolerableDisruptionHours: i.maxTolerableDisruptionHours,
        processCount: linked.length,
        governedCount: governed,
        criticalCount: critical,
        lowMaturityCriticalCount: lowMaturityCritical,
        readiness: linked.length === 0 ? "NONE" :
          lowMaturityCritical > 0 ? "RED" :
          governed / Math.max(linked.length, 1) < 0.5 ? "AMBER" : "GREEN",
      };
    });

    // Maturity × Category heatmap
    const CATEGORIES = ["CUSTOMER_ONBOARDING","PAYMENTS","LENDING","COMPLIANCE","RISK_MANAGEMENT","FINANCE","TECHNOLOGY","PEOPLE","GOVERNANCE","OTHER"];
    const heatmap: Record<string, Record<number, number>> = {};
    for (const cat of CATEGORIES) {
      heatmap[cat] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }
    for (const p of processes) {
      if (p.status === "RETIRED") continue;
      const s = Math.min(5, Math.max(1, p.maturityScore));
      if (heatmap[p.category]) {
        heatmap[p.category][s] = (heatmap[p.category][s] ?? 0) + 1;
      }
    }

    // Critical + low maturity flag
    const criticalLowMaturity = processes.filter(
      (p) => p.criticality === "CRITICAL" && p.maturityScore <= 2 && p.status !== "RETIRED"
    ).map((p) => ({ id: p.id, reference: p.reference, name: p.name, maturityScore: p.maturityScore }));

    return jsonResponse({
      totalProcesses: processes.filter((p) => p.status !== "RETIRED").length,
      maturityDistribution,
      ibsCoverage,
      gaps: { noControls, noPolicies, noRegulations },
      ownerGaps: { noOwner, noSmf },
      heatmap,
      criticalLowMaturity,
    });
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to compute insights", 500);
  }
}
