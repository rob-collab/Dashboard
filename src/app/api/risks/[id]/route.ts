import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { getRiskScore, getAppetiteMaxScore, calculateBreach } from "@/lib/risk-categories";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  categoryL1: z.string().min(1).optional(),
  categoryL2: z.string().min(1).optional(),
  ownerId: z.string().min(1).optional(),
  inherentLikelihood: z.number().int().min(1).max(5).optional(),
  inherentImpact: z.number().int().min(1).max(5).optional(),
  residualLikelihood: z.number().int().min(1).max(5).optional(),
  residualImpact: z.number().int().min(1).max(5).optional(),
  controlEffectiveness: z.enum(["EFFECTIVE", "PARTIALLY_EFFECTIVE", "INEFFECTIVE"]).nullable().optional(),
  riskAppetite: z.enum(["VERY_LOW", "LOW", "LOW_TO_MODERATE", "MODERATE", "HIGH"]).nullable().optional(),
  directionOfTravel: z.enum(["IMPROVING", "STABLE", "DETERIORATING"]).optional(),
  reviewFrequencyDays: z.number().int().min(1).optional(),
  reviewRequested: z.boolean().optional(),
  inFocus: z.boolean().optional(),
  approvalStatus: z.enum(["APPROVED", "PENDING_APPROVAL", "REJECTED"]).optional(),
  lastReviewed: z.string().optional(),
  // controls and mitigations are no longer managed via PATCH — ignored if sent
  controls: z.unknown().optional(),
  mitigations: z.unknown().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const risk = await prisma.risk.findUnique({
      where: { id },
      include: {
        controls: { orderBy: { sortOrder: "asc" } },
        mitigations: { orderBy: { createdAt: "asc" } },
        auditTrail: { orderBy: { changedAt: "desc" }, take: 50 },
        riskOwner: true,
        changes: { include: { proposer: true, reviewer: true }, orderBy: { proposedAt: "desc" } },
        controlLinks: { include: { control: { select: { id: true, controlRef: true, controlName: true, businessArea: true } } } },
        actionLinks: {
          include: {
            action: { select: { id: true, reference: true, title: true, status: true, assignedTo: true, dueDate: true, priority: true } },
          },
          orderBy: { linkedAt: "desc" },
        },
        regulationLinks: { include: { regulation: { select: { id: true, reference: true, name: true, type: true, complianceStatus: true } } }, orderBy: { createdAt: "desc" } },
      },
    });

    if (!risk) return errorResponse("Risk not found", 404);
    return jsonResponse(serialiseDates(risk));
  } catch (err) {
    console.error("[GET /api/risks/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);
    const { id } = await params;

    const existing = await prisma.risk.findUnique({ where: { id } });
    if (!existing) return errorResponse("Risk not found", 404);

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;
    // Strip controls/mitigations — no longer managed via PATCH
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { controls: _controls, mitigations: _mitigations, ...data } = result.data;

    // Build audit log entries for changed fields
    const auditEntries: { field: string; old: string | null; new_: string | null }[] = [];
    for (const [key, value] of Object.entries(data)) {
      const oldVal = (existing as Record<string, unknown>)[key];
      if (oldVal !== value && value !== undefined) {
        auditEntries.push({ field: key, old: String(oldVal ?? ""), new_: String(value ?? "") });
      }
    }

    const updateData: Record<string, unknown> = { ...data, updatedBy: userId };
    if (data.lastReviewed) updateData.lastReviewed = new Date(data.lastReviewed);

    const risk = await prisma.risk.update({
      where: { id },
      data: updateData,
      include: {
        controls: { orderBy: { sortOrder: "asc" } },
        mitigations: { orderBy: { createdAt: "asc" } },
        riskOwner: true,
        changes: { include: { proposer: true, reviewer: true }, orderBy: { proposedAt: "desc" } },
        controlLinks: { include: { control: { select: { id: true, controlRef: true, controlName: true, businessArea: true } } } },
        actionLinks: {
          include: {
            action: { select: { id: true, reference: true, title: true, status: true, assignedTo: true, dueDate: true, priority: true } },
          },
          orderBy: { linkedAt: "desc" },
        },
        regulationLinks: { include: { regulation: { select: { id: true, reference: true, name: true, type: true, complianceStatus: true } } }, orderBy: { createdAt: "desc" } },
      },
    });

    // Write audit entries to risk-specific log
    if (auditEntries.length > 0) {
      await prisma.riskAuditLog.createMany({
        data: auditEntries.map((e) => ({
          riskId: id, userId, action: "updated",
          fieldChanged: e.field, oldValue: e.old, newValue: e.new_,
        })),
      }).catch((e) => console.error("[risk audit]", e));

      // Also write to the general AuditLog so changes appear on the Audit Trail page
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      await prisma.auditLog.create({
        data: {
          userId,
          userRole: user?.role ?? "VIEWER",
          action: "update_risk",
          entityType: "risk",
          entityId: id,
          changes: Object.fromEntries(auditEntries.map((e) => [e.field, { old: e.old, new: e.new_ }])),
        },
      }).catch((e) => console.error("[general audit for risk]", e));
    }

    // Auto-upsert snapshot if score fields changed
    const scoreFields = ["inherentLikelihood", "inherentImpact", "residualLikelihood", "residualImpact", "directionOfTravel"];
    const scoreChanged = auditEntries.some((e) => scoreFields.includes(e.field));
    if (scoreChanged) {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      await prisma.riskSnapshot.upsert({
        where: { riskId_month: { riskId: id, month: monthStart } },
        update: {
          residualLikelihood: risk.residualLikelihood,
          residualImpact: risk.residualImpact,
          inherentLikelihood: risk.inherentLikelihood,
          inherentImpact: risk.inherentImpact,
          directionOfTravel: risk.directionOfTravel,
        },
        create: {
          riskId: id, month: monthStart,
          residualLikelihood: risk.residualLikelihood,
          residualImpact: risk.residualImpact,
          inherentLikelihood: risk.inherentLikelihood,
          inherentImpact: risk.inherentImpact,
          directionOfTravel: risk.directionOfTravel,
        },
      }).catch((e) => console.error("[risk snapshot]", e));
    }

    // Calculate appetite breach if appetite is set
    const responseData = serialiseDates(risk);
    if (risk.riskAppetite) {
      const residualScore = getRiskScore(risk.residualLikelihood, risk.residualImpact);
      const threshold = getAppetiteMaxScore(risk.riskAppetite);
      const breach = calculateBreach(residualScore, risk.riskAppetite);
      Object.assign(responseData as Record<string, unknown>, {
        appetiteBreached: breach.breached,
        residualScore,
        appetiteThreshold: threshold,
      });
    }

    return jsonResponse(responseData);
  } catch (err) {
    console.error("[PATCH /api/risks/:id]", err);
    return errorResponse(err instanceof Error ? err.message : "Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);
    const { id } = await params;

    const existing = await prisma.risk.findUnique({ where: { id } });
    if (!existing) return errorResponse("Risk not found", 404);

    await prisma.risk.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/risks/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
