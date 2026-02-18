import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

interface DependencyGroup {
  category: string;
  model: string;
  field: string;
  count: number;
  items: Array<{ id: string; label: string }>;
}

const DEPENDENCY_QUERIES: Array<{
  category: string;
  model: string;
  field: string;
  query: (userId: string) => Promise<{ count: number; items: Array<{ id: string; label: string }> }>;
}> = [
  {
    category: "Assigned Actions",
    model: "Action",
    field: "assignedTo",
    query: async (userId) => {
      const rows = await prisma.action.findMany({ where: { assignedTo: userId }, select: { id: true, reference: true, title: true }, take: 5 });
      return { count: await prisma.action.count({ where: { assignedTo: userId } }), items: rows.map((r) => ({ id: r.id, label: `${r.reference}: ${r.title}` })) };
    },
  },
  {
    category: "Created Actions",
    model: "Action",
    field: "createdBy",
    query: async (userId) => {
      const rows = await prisma.action.findMany({ where: { createdBy: userId }, select: { id: true, reference: true, title: true }, take: 5 });
      return { count: await prisma.action.count({ where: { createdBy: userId } }), items: rows.map((r) => ({ id: r.id, label: `${r.reference}: ${r.title}` })) };
    },
  },
  {
    category: "Proposed Action Changes",
    model: "ActionChange",
    field: "proposedBy",
    query: async (userId) => {
      const rows = await prisma.actionChange.findMany({ where: { proposedBy: userId }, select: { id: true, fieldChanged: true }, take: 5 });
      return { count: await prisma.actionChange.count({ where: { proposedBy: userId } }), items: rows.map((r) => ({ id: r.id, label: `Change: ${r.fieldChanged}` })) };
    },
  },
  {
    category: "Reviewed Action Changes",
    model: "ActionChange",
    field: "reviewedBy",
    query: async (userId) => {
      const rows = await prisma.actionChange.findMany({ where: { reviewedBy: userId }, select: { id: true, fieldChanged: true }, take: 5 });
      return { count: await prisma.actionChange.count({ where: { reviewedBy: userId } }), items: rows.map((r) => ({ id: r.id, label: `Review: ${r.fieldChanged}` })) };
    },
  },
  {
    category: "Owned Risks",
    model: "Risk",
    field: "ownerId",
    query: async (userId) => {
      const rows = await prisma.risk.findMany({ where: { ownerId: userId }, select: { id: true, reference: true, name: true }, take: 5 });
      return { count: await prisma.risk.count({ where: { ownerId: userId } }), items: rows.map((r) => ({ id: r.id, label: `${r.reference}: ${r.name}` })) };
    },
  },
  {
    category: "Created Risks",
    model: "Risk",
    field: "createdBy",
    query: async (userId) => {
      const rows = await prisma.risk.findMany({ where: { createdBy: userId }, select: { id: true, reference: true, name: true }, take: 5 });
      return { count: await prisma.risk.count({ where: { createdBy: userId } }), items: rows.map((r) => ({ id: r.id, label: `${r.reference}: ${r.name}` })) };
    },
  },
  {
    category: "Updated Risks",
    model: "Risk",
    field: "updatedBy",
    query: async (userId) => {
      const rows = await prisma.risk.findMany({ where: { updatedBy: userId }, select: { id: true, reference: true, name: true }, take: 5 });
      return { count: await prisma.risk.count({ where: { updatedBy: userId } }), items: rows.map((r) => ({ id: r.id, label: `${r.reference}: ${r.name}` })) };
    },
  },
  {
    category: "Owned Controls",
    model: "Control",
    field: "controlOwnerId",
    query: async (userId) => {
      const rows = await prisma.control.findMany({ where: { controlOwnerId: userId }, select: { id: true, controlRef: true, controlName: true }, take: 5 });
      return { count: await prisma.control.count({ where: { controlOwnerId: userId } }), items: rows.map((r) => ({ id: r.id, label: `${r.controlRef}: ${r.controlName}` })) };
    },
  },
  {
    category: "Created Controls",
    model: "Control",
    field: "createdById",
    query: async (userId) => {
      const rows = await prisma.control.findMany({ where: { createdById: userId }, select: { id: true, controlRef: true, controlName: true }, take: 5 });
      return { count: await prisma.control.count({ where: { createdById: userId } }), items: rows.map((r) => ({ id: r.id, label: `${r.controlRef}: ${r.controlName}` })) };
    },
  },
  {
    category: "Control Attestations",
    model: "ControlAttestation",
    field: "attestedById",
    query: async (userId) => {
      const count = await prisma.controlAttestation.count({ where: { attestedById: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "CCRO Attestation Reviews",
    model: "ControlAttestation",
    field: "ccroReviewedById",
    query: async (userId) => {
      const count = await prisma.controlAttestation.count({ where: { ccroReviewedById: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Proposed Control Changes",
    model: "ControlChange",
    field: "proposedBy",
    query: async (userId) => {
      const count = await prisma.controlChange.count({ where: { proposedBy: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Reviewed Control Changes",
    model: "ControlChange",
    field: "reviewedBy",
    query: async (userId) => {
      const count = await prisma.controlChange.count({ where: { reviewedBy: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Assigned Tests",
    model: "TestingScheduleEntry",
    field: "assignedTesterId",
    query: async (userId) => {
      const count = await prisma.testingScheduleEntry.count({ where: { assignedTesterId: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Added Testing Schedules",
    model: "TestingScheduleEntry",
    field: "addedById",
    query: async (userId) => {
      const count = await prisma.testingScheduleEntry.count({ where: { addedById: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Test Results",
    model: "ControlTestResult",
    field: "testedById",
    query: async (userId) => {
      const count = await prisma.controlTestResult.count({ where: { testedById: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Updated Test Results",
    model: "ControlTestResult",
    field: "updatedById",
    query: async (userId) => {
      const count = await prisma.controlTestResult.count({ where: { updatedById: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Created Reports",
    model: "Report",
    field: "createdBy",
    query: async (userId) => {
      const rows = await prisma.report.findMany({ where: { createdBy: userId }, select: { id: true, title: true, period: true }, take: 5 });
      return { count: await prisma.report.count({ where: { createdBy: userId } }), items: rows.map((r) => ({ id: r.id, label: `${r.title} — ${r.period}` })) };
    },
  },
  {
    category: "Published Report Versions",
    model: "ReportVersion",
    field: "publishedBy",
    query: async (userId) => {
      const count = await prisma.reportVersion.count({ where: { publishedBy: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Created Templates",
    model: "Template",
    field: "createdBy",
    query: async (userId) => {
      const count = await prisma.template.count({ where: { createdBy: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Created Components",
    model: "Component",
    field: "createdBy",
    query: async (userId) => {
      const count = await prisma.component.count({ where: { createdBy: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Owned Policies",
    model: "Policy",
    field: "ownerId",
    query: async (userId) => {
      const rows = await prisma.policy.findMany({ where: { ownerId: userId }, select: { id: true, reference: true, name: true }, take: 5 });
      return { count: await prisma.policy.count({ where: { ownerId: userId } }), items: rows.map((r) => ({ id: r.id, label: `${r.reference}: ${r.name}` })) };
    },
  },
  {
    category: "Updated Consumer Duty Measures",
    model: "ConsumerDutyMeasure",
    field: "updatedById",
    query: async (userId) => {
      const count = await prisma.consumerDutyMeasure.count({ where: { updatedById: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Proposed Risk Acceptances",
    model: "RiskAcceptance",
    field: "proposerId",
    query: async (userId) => {
      const rows = await prisma.riskAcceptance.findMany({ where: { proposerId: userId }, select: { id: true, reference: true, title: true }, take: 5 });
      return { count: await prisma.riskAcceptance.count({ where: { proposerId: userId } }), items: rows.map((r) => ({ id: r.id, label: `${r.reference}: ${r.title}` })) };
    },
  },
  {
    category: "Approved Risk Acceptances",
    model: "RiskAcceptance",
    field: "approverId",
    query: async (userId) => {
      const count = await prisma.riskAcceptance.count({ where: { approverId: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Risk Acceptance Comments",
    model: "RiskAcceptanceComment",
    field: "userId",
    query: async (userId) => {
      const count = await prisma.riskAcceptanceComment.count({ where: { userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Risk Acceptance History",
    model: "RiskAcceptanceHistory",
    field: "userId",
    query: async (userId) => {
      const count = await prisma.riskAcceptanceHistory.count({ where: { userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Quarterly Summaries (Author)",
    model: "QuarterlySummary",
    field: "authorId",
    query: async (userId) => {
      const count = await prisma.quarterlySummary.count({ where: { authorId: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Quarterly Summaries (Approver)",
    model: "QuarterlySummary",
    field: "approvedById",
    query: async (userId) => {
      const count = await prisma.quarterlySummary.count({ where: { approvedById: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "ExCo View Configurations",
    model: "ExcoViewConfig",
    field: "configuredById",
    query: async (userId) => {
      const count = await prisma.excoViewConfig.count({ where: { configuredById: userId } });
      return { count, items: [] };
    },
  },
  {
    category: "Audit Logs",
    model: "AuditLog",
    field: "userId",
    query: async (userId) => {
      const count = await prisma.auditLog.count({ where: { userId } });
      return { count, items: [] };
    },
  },
];

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authResult = await requireCCRORole(request);
    if ("error" in authResult) return authResult.error;

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorResponse("User not found", 404);

    const groups: DependencyGroup[] = [];
    let totalCount = 0;

    // Run all dependency queries in parallel
    const results = await Promise.all(
      DEPENDENCY_QUERIES.map(async (dq) => {
        const result = await dq.query(id);
        return { ...dq, ...result };
      })
    );

    for (const r of results) {
      if (r.count > 0) {
        groups.push({
          category: r.category,
          model: r.model,
          field: r.field,
          count: r.count,
          items: r.items,
        });
        totalCount += r.count;
      }
    }

    return jsonResponse({ groups, totalCount });
  } catch (error) {
    console.error("[API Error]", error);
    return errorResponse(error instanceof Error ? error.message : "Operation failed", 500);
  }
}
