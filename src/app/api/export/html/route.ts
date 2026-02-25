import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, errorResponse, validateBody } from "@/lib/api-helpers";
import { generateFullHTMLExport, type SectionKey, type ExportData } from "@/lib/export-html-builder";

const bodySchema = z.object({
  sections: z.array(
    z.enum([
      "executive_summary",
      "risk_register",
      "controls",
      "compliance",
      "consumer_duty",
      "or_resilience",
      "process_library",
      "actions",
      "audit_trail",
    ])
  ).min(1),
  filters: z
    .object({
      riskStatus: z.string().optional(),
      riskCategory: z.string().optional(),
      controlType: z.string().optional(),
      actionStatus: z.string().optional(),
      nonCompliantOnly: z.boolean().optional(),
      auditFrom: z.string().optional(),
      auditTo: z.string().optional(),
      processMinMaturity: z.number().int().min(1).max(5).optional(),
      processCriticality: z.string().optional(),
    })
    .optional(),
  options: z
    .object({
      firmName: z.string().optional(),
      watermark: z.enum(["NONE", "CONFIDENTIAL", "DRAFT"]).default("NONE"),
      packTitle: z.string().optional(),
      interactive: z.boolean().default(true),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);

  const rawBody = await request.json().catch(() => ({}));
  const validated = validateBody(bodySchema, rawBody);
  if ("error" in validated) return validated.error;

  const sections = validated.data.sections;
  const filters = validated.data.filters ?? {};
  const options = validated.data.options ?? { watermark: "NONE" as const, interactive: true };

  try {
    // ── Fetch all requested section data in parallel ─────────────────────────

    const fetchers: Promise<unknown>[] = [];
    const fetchMap: Record<string, number> = {};

    const register = (key: string, p: Promise<unknown>) => {
      fetchMap[key] = fetchers.length;
      fetchers.push(p);
    };

    if (sections.includes("risk_register") || sections.includes("executive_summary")) {
      const riskWhere: Record<string, unknown> = {};
      if (filters.riskCategory) riskWhere.categoryL1 = filters.riskCategory;
      register(
        "risks",
        prisma.risk.findMany({
          where: riskWhere,
          select: {
            id: true, reference: true, name: true, description: true,
            categoryL1: true, categoryL2: true,
            inherentLikelihood: true, inherentImpact: true,
            residualLikelihood: true, residualImpact: true,
            directionOfTravel: true, riskAppetite: true,
          },
          orderBy: { reference: "asc" },
        })
      );
    }

    if (sections.includes("controls") || sections.includes("executive_summary")) {
      const controlWhere: Record<string, unknown> = { isActive: true };
      if (filters.controlType) controlWhere.controlType = filters.controlType;
      register(
        "controls",
        prisma.control.findMany({
          where: controlWhere,
          select: {
            id: true, controlRef: true, controlName: true, controlDescription: true,
            controlType: true, isActive: true,
            businessArea: { select: { name: true } },
          },
          orderBy: { controlRef: "asc" },
        })
      );
    }

    if (sections.includes("compliance") || sections.includes("executive_summary")) {
      const compWhere: Record<string, unknown> = {};
      if (filters.nonCompliantOnly) compWhere.complianceStatus = { in: ["NON_COMPLIANT", "GAP_IDENTIFIED"] };
      register(
        "regulations",
        prisma.regulation.findMany({
          where: compWhere,
          select: {
            id: true, reference: true, name: true, shortName: true,
            body: true, complianceStatus: true, isApplicable: true,
            assessmentNotes: true,
          },
          orderBy: [{ body: "asc" }, { reference: "asc" }],
        })
      );
    }

    if (sections.includes("consumer_duty")) {
      register(
        "outcomes",
        prisma.consumerDutyOutcome.findMany({
          select: {
            id: true, outcomeId: true, name: true, shortDesc: true,
            ragStatus: true, monthlySummary: true,
          },
          orderBy: { outcomeId: "asc" },
        })
      );
    }

    if (sections.includes("or_resilience")) {
      register(
        "ibs",
        prisma.importantBusinessService.findMany({
          include: { resourceMaps: true },
          orderBy: { reference: "asc" },
        })
      );
      register(
        "scenarios",
        prisma.resilienceScenario.findMany({
          select: {
            id: true, reference: true, ibsId: true, name: true,
            scenarioType: true, status: true, outcome: true,
            testedAt: true, nextTestDate: true, findings: true,
            remediationRequired: true,
          },
          orderBy: { reference: "asc" },
        })
      );
      register(
        "selfAssessment",
        prisma.selfAssessment.findFirst({
          orderBy: { year: "desc" },
          select: {
            id: true, year: true, status: true, executiveSummary: true,
            vulnerabilitiesCount: true, openRemediations: true, documentUrl: true,
          },
        })
      );
    }

    if (sections.includes("process_library")) {
      const procWhere: Record<string, unknown> = { status: "ACTIVE" };
      if (filters.processCriticality) procWhere.criticality = filters.processCriticality;
      if (filters.processMinMaturity) procWhere.maturityScore = { gte: filters.processMinMaturity };
      register(
        "processes",
        prisma.process.findMany({
          where: procWhere,
          select: {
            id: true, reference: true, name: true, category: true,
            criticality: true, maturityScore: true, status: true,
            nextReviewDate: true,
          },
          orderBy: { reference: "asc" },
        })
      );
    }

    if (sections.includes("actions")) {
      const actWhere: Record<string, unknown> = {};
      if (filters.actionStatus) actWhere.status = filters.actionStatus;
      register(
        "actions",
        prisma.action.findMany({
          where: actWhere,
          select: {
            id: true, reference: true, title: true, status: true,
            priority: true, assignedTo: true, dueDate: true, description: true,
          },
          orderBy: { reference: "asc" },
        })
      );
    }

    if (sections.includes("audit_trail")) {
      const auditWhere: Record<string, unknown> = {};
      if (filters.auditFrom || filters.auditTo) {
        auditWhere.timestamp = {};
        if (filters.auditFrom) (auditWhere.timestamp as Record<string, unknown>).gte = new Date(filters.auditFrom);
        if (filters.auditTo) (auditWhere.timestamp as Record<string, unknown>).lte = new Date(filters.auditTo);
      } else {
        // Default: last 30 days
        auditWhere.timestamp = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
      }
      register(
        "auditLogs",
        prisma.auditLog.findMany({
          where: auditWhere,
          select: {
            id: true, timestamp: true, action: true, entityType: true,
            userId: true, userRole: true, changes: true,
          },
          orderBy: { timestamp: "desc" },
          take: 500,
        })
      );
    }

    const results = await Promise.all(fetchers);
    const get = (key: string) => (fetchMap[key] !== undefined ? results[fetchMap[key]] : undefined);

    // ── Map IBS — compute categoriesFilled ───────────────────────────────────
    type RawIBS = {
      id: string; reference: string; name: string;
      smfAccountable: string | null; maxTolerableDisruptionHours: number | null;
      status: string; resourceMaps: { content: unknown }[];
    };
    const rawIBS = (get("ibs") as RawIBS[] | undefined) ?? [];
    const ibsRows = rawIBS.map((i) => ({
      id: i.id, reference: i.reference, name: i.name,
      smfAccountable: i.smfAccountable,
      maxTolerableDisruptionHours: i.maxTolerableDisruptionHours,
      status: i.status,
      categoriesFilled: i.resourceMaps.filter((m) => {
        const c = m.content as Record<string, unknown>;
        return Object.keys(c).length > 0;
      }).length,
    }));

    // ── Map AuditLogs — serialise dates ──────────────────────────────────────
    type RawAudit = {
      id: string; timestamp: Date | string; action: string; entityType: string;
      userId: string; userRole: string; changes: unknown;
    };
    const rawAudit = (get("auditLogs") as RawAudit[] | undefined) ?? [];
    const auditRows = rawAudit.map((a) => ({
      id: a.id,
      timestamp: a.timestamp instanceof Date ? a.timestamp.toISOString() : String(a.timestamp),
      action: a.action,
      entityType: a.entityType,
      userId: a.userId,
      userRole: a.userRole,
      changes: a.changes as Record<string, unknown> | null,
    }));

    // ── Map SelfAssessment — serialise dates ─────────────────────────────────
    type RawSA = {
      id: string; year: number; status: string; executiveSummary: string | null;
      vulnerabilitiesCount: number; openRemediations: number; documentUrl: string | null;
    };
    const rawSA = get("selfAssessment") as RawSA | null | undefined;

    // ── Map Scenarios — serialise dates ──────────────────────────────────────
    type RawScenario = {
      id: string; reference: string; ibsId: string; name: string;
      scenarioType: string; status: string; outcome: string;
      testedAt: Date | null; nextTestDate: Date | null;
      findings: string | null; remediationRequired: boolean;
    };
    const rawScenarios = (get("scenarios") as RawScenario[] | undefined) ?? [];
    const scenarioRows = rawScenarios.map((s) => ({
      ...s,
      testedAt: s.testedAt ? s.testedAt.toISOString() : null,
      nextTestDate: s.nextTestDate ? s.nextTestDate.toISOString() : null,
    }));

    // ── Map Actions — serialise dates ────────────────────────────────────────
    type RawAction = {
      id: string; reference: string; title: string; status: string;
      priority: string | null; assignedTo: string; dueDate: Date | null;
      description: string;
    };
    const rawActions = (get("actions") as RawAction[] | undefined) ?? [];
    const actionRows = rawActions.map((a) => ({
      ...a,
      dueDate: a.dueDate ? a.dueDate.toISOString() : null,
    }));

    // ── Map Processes — serialise dates ──────────────────────────────────────
    type RawProcess = {
      id: string; reference: string; name: string; category: string;
      criticality: string; maturityScore: number; status: string;
      nextReviewDate: Date | null;
    };
    const rawProcesses = (get("processes") as RawProcess[] | undefined) ?? [];
    const processRows = rawProcesses.map((p) => ({
      ...p,
      nextReviewDate: p.nextReviewDate ? p.nextReviewDate.toISOString() : null,
    }));

    const data: ExportData = {
      firmName: options.firmName,
      risks: get("risks") as ExportData["risks"],
      controls: get("controls") as ExportData["controls"],
      regulations: get("regulations") as ExportData["regulations"],
      outcomes: get("outcomes") as ExportData["outcomes"],
      ibs: ibsRows,
      scenarios: scenarioRows,
      selfAssessment: rawSA ?? null,
      processes: processRows,
      actions: actionRows,
      auditLogs: auditRows,
    };

    const html = generateFullHTMLExport(
      {
        sections: sections as SectionKey[],
        firmName: options.firmName,
        watermark: options.watermark,
        packTitle: options.packTitle,
        interactive: options.interactive,
      },
      data
    );

    const now = new Date();
    const filename = `CCRO_Pack_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.html`;

    // Audit log — fire-and-forget; never block the download
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }).then((u) =>
      prisma.auditLog.create({
        data: {
          userId,
          userRole: u?.role ?? "VIEWER",
          action: "generate_export",
          entityType: "export",
          entityId: "html-pack",
          changes: { sections: sections as string[], firmName: options.firmName ?? "Unknown" },
        },
      })
    ).catch(() => {});

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Export HTML]", error);
    return errorResponse(error instanceof Error ? error.message : "Export failed", 500);
  }
}
