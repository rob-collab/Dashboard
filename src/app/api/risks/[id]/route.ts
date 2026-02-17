import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

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
  riskAppetite: z.enum(["VERY_LOW", "LOW", "LOW_TO_MODERATE", "MODERATE"]).nullable().optional(),
  directionOfTravel: z.enum(["IMPROVING", "STABLE", "DETERIORATING"]).optional(),
  reviewFrequencyDays: z.number().int().min(1).optional(),
  reviewRequested: z.boolean().optional(),
  lastReviewed: z.string().optional(),
  controls: z.array(z.object({
    id: z.string().optional(),
    description: z.string().min(1),
    controlOwner: z.string().nullable().optional(),
    sortOrder: z.number().int().optional(),
  })).optional(),
  mitigations: z.array(z.object({
    id: z.string().optional(),
    action: z.string().min(1),
    owner: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETE"]).optional(),
    priority: z.enum(["P1", "P2", "P3"]).nullable().optional(),
  })).optional(),
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
    const { controls, mitigations, ...data } = result.data;

    // Build audit log entries for changed fields
    const auditEntries: { field: string; old: string | null; new_: string | null }[] = [];
    for (const [key, value] of Object.entries(data)) {
      const oldVal = (existing as Record<string, unknown>)[key];
      if (oldVal !== value && value !== undefined) {
        auditEntries.push({ field: key, old: String(oldVal ?? ""), new_: String(value ?? "") });
      }
    }

    // Update risk
    const updateData: Record<string, unknown> = { ...data, updatedBy: userId };
    if (data.lastReviewed) updateData.lastReviewed = new Date(data.lastReviewed);

    // Handle controls replacement
    if (controls) {
      await prisma.riskControl.deleteMany({ where: { riskId: id } });
      await prisma.riskControl.createMany({
        data: controls.map((c, i) => ({
          riskId: id,
          description: c.description,
          controlOwner: c.controlOwner ?? null,
          sortOrder: c.sortOrder ?? i,
        })),
      });
    }

    // Handle mitigations replacement with linked action sync
    if (mitigations) {
      // Fetch existing mitigations with their actionIds
      const existingMits = await prisma.riskMitigation.findMany({ where: { riskId: id } });

      // Delete linked actions and then all existing mitigations
      for (const em of existingMits) {
        if (em.actionId) {
          await prisma.action.delete({ where: { id: em.actionId } }).catch(() => {});
        }
      }
      await prisma.riskMitigation.deleteMany({ where: { riskId: id } });

      // Helper: resolve owner name to user ID
      const resolveOwner = async (ownerName: string | null | undefined): Promise<string> => {
        if (!ownerName) return userId;
        const user = await prisma.user.findFirst({ where: { name: { equals: ownerName, mode: "insensitive" } } });
        return user?.id ?? userId;
      };

      // Map mitigation status to action status
      const mitToActionStatus = (ms: string): "OPEN" | "IN_PROGRESS" | "COMPLETED" => {
        if (ms === "COMPLETE") return "COMPLETED";
        if (ms === "IN_PROGRESS") return "IN_PROGRESS";
        return "OPEN";
      };

      // Get last action reference for generating new references
      const lastAction = await prisma.action.findFirst({ orderBy: { reference: "desc" } });
      let actionNum = lastAction?.reference
        ? parseInt(lastAction.reference.replace("ACT-", ""), 10) + 1
        : 1;

      // Create new mitigations with linked actions
      for (const m of mitigations) {
        const assigneeId = await resolveOwner(m.owner);
        const actionRef = `ACT-${String(actionNum).padStart(3, "0")}`;
        actionNum++;
        const linkedAction = await prisma.action.create({
          data: {
            reference: actionRef,
            title: m.action,
            description: `Mitigation action from Risk ${existing.reference}: ${existing.name}`,
            source: "Risk Register",
            status: mitToActionStatus(m.status ?? "OPEN"),
            priority: m.priority ?? null,
            assignedTo: assigneeId,
            createdBy: userId,
            dueDate: m.deadline ? new Date(m.deadline) : null,
          },
        });
        await prisma.riskMitigation.create({
          data: {
            riskId: id,
            action: m.action,
            owner: m.owner ?? null,
            deadline: m.deadline ? new Date(m.deadline) : null,
            status: m.status ?? "OPEN",
            priority: m.priority ?? null,
            actionId: linkedAction.id,
          },
        });
      }
    }

    const risk = await prisma.risk.update({
      where: { id },
      data: updateData,
      include: {
        controls: { orderBy: { sortOrder: "asc" } },
        mitigations: { orderBy: { createdAt: "asc" } },
        riskOwner: true,
      },
    });

    // Write audit entries
    if (auditEntries.length > 0) {
      await prisma.riskAuditLog.createMany({
        data: auditEntries.map((e) => ({
          riskId: id, userId, action: "updated",
          fieldChanged: e.field, oldValue: e.old, newValue: e.new_,
        })),
      }).catch((e) => console.error("[risk audit]", e));
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

    return jsonResponse(serialiseDates(risk));
  } catch (err) {
    console.error("[PATCH /api/risks/:id]", err);
    return errorResponse("Internal server error", 500);
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
