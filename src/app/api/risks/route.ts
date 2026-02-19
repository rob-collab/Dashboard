import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody, validateQuery, generateReference } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const querySchema = z.object({
  categoryL1: z.string().optional(),
  ownerId: z.string().optional(),
  directionOfTravel: z.enum(["IMPROVING", "STABLE", "DETERIORATING"]).optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  categoryL1: z.string().min(1),
  categoryL2: z.string().min(1),
  ownerId: z.string().min(1),
  inherentLikelihood: z.number().int().min(1).max(5),
  inherentImpact: z.number().int().min(1).max(5),
  residualLikelihood: z.number().int().min(1).max(5),
  residualImpact: z.number().int().min(1).max(5),
  controlEffectiveness: z.enum(["EFFECTIVE", "PARTIALLY_EFFECTIVE", "INEFFECTIVE"]).nullable().optional(),
  riskAppetite: z.enum(["VERY_LOW", "LOW", "LOW_TO_MODERATE", "MODERATE"]).nullable().optional(),
  directionOfTravel: z.enum(["IMPROVING", "STABLE", "DETERIORATING"]).optional(),
  lastReviewed: z.string().optional(),
  controls: z.array(z.object({
    description: z.string().min(1),
    controlOwner: z.string().nullable().optional(),
    sortOrder: z.number().int().optional(),
  })).optional(),
  mitigations: z.array(z.object({
    action: z.string().min(1),
    owner: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETE"]).optional(),
  })).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const result = validateQuery(querySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;
    const { categoryL1, ownerId, directionOfTravel } = result.data;

    const risks = await prisma.risk.findMany({
      where: {
        ...(categoryL1 && { categoryL1 }),
        ...(ownerId && { ownerId }),
        ...(directionOfTravel && { directionOfTravel }),
      },
      include: {
        controls: { orderBy: { sortOrder: "asc" } },
        mitigations: { orderBy: { createdAt: "asc" } },
        riskOwner: true,
        changes: { include: { proposer: true, reviewer: true }, orderBy: { proposedAt: "desc" } },
      },
      orderBy: { reference: "asc" },
    });

    return jsonResponse(serialiseDates(risks));
  } catch (err) {
    console.error("[GET /api/risks]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;
    const { controls, mitigations, ...data } = result.data;

    // Generate next reference number (collision-safe)
    const reference = await generateReference("R", "risk");

    // Map mitigation status to action status
    const mitigationToActionStatus = (ms: string): "OPEN" | "IN_PROGRESS" | "COMPLETED" => {
      if (ms === "COMPLETE") return "COMPLETED";
      if (ms === "IN_PROGRESS") return "IN_PROGRESS";
      return "OPEN";
    };

    // Wrap risk + linked action creation in a transaction for atomicity
    const refreshedRisk = await prisma.$transaction(async (tx) => {
      const risk = await tx.risk.create({
        data: {
          ...data,
          reference,
          lastReviewed: data.lastReviewed ? new Date(data.lastReviewed) : new Date(),
          directionOfTravel: data.directionOfTravel ?? "STABLE",
          createdBy: userId,
          updatedBy: userId,
          controls: controls ? {
            create: controls.map((c, i) => ({
              description: c.description,
              controlOwner: c.controlOwner ?? null,
              sortOrder: c.sortOrder ?? i,
            })),
          } : undefined,
          mitigations: mitigations ? {
            create: mitigations.map((m) => ({
              action: m.action,
              owner: m.owner ?? null,
              deadline: m.deadline ? new Date(m.deadline) : null,
              status: m.status ?? "OPEN",
            })),
          } : undefined,
        },
        include: {
          controls: { orderBy: { sortOrder: "asc" } },
          mitigations: { orderBy: { createdAt: "asc" } },
          riskOwner: true,
        },
      });

      // Auto-create linked Actions for each mitigation
      if (risk.mitigations.length > 0) {
        // Batch-resolve owner names to user IDs (avoids N+1 queries)
        const ownerNames = Array.from(new Set(risk.mitigations.map((m) => m.owner).filter(Boolean))) as string[];
        const ownerUsers = ownerNames.length > 0
          ? await tx.user.findMany({ where: { name: { in: ownerNames, mode: "insensitive" } } })
          : [];
        const ownerMap = new Map(ownerUsers.map((u) => [u.name.toLowerCase(), u.id]));

        for (const mit of risk.mitigations) {
          const assigneeId = mit.owner ? (ownerMap.get(mit.owner.toLowerCase()) ?? userId) : userId;
          const actionRef = await generateReference("ACT-", "action");
          const linkedAction = await tx.action.create({
            data: {
              title: mit.action,
              description: `Mitigation action from Risk ${reference}: ${risk.name}`,
              source: "Risk Register",
              reference: actionRef,
              status: mitigationToActionStatus(mit.status),
              assignedTo: assigneeId,
              createdBy: userId,
              dueDate: mit.deadline,
            },
          });
          await tx.riskMitigation.update({
            where: { id: mit.id },
            data: { actionId: linkedAction.id },
          });
        }
      }

      // Re-fetch to include actionIds in mitigations
      return tx.risk.findUnique({
        where: { id: risk.id },
        include: {
          controls: { orderBy: { sortOrder: "asc" } },
          mitigations: { orderBy: { createdAt: "asc" } },
          riskOwner: true,
        },
      });
    });

    if (!refreshedRisk) return errorResponse("Failed to create risk", 500);

    // Audit log (fire-and-forget, outside transaction)
    await prisma.riskAuditLog.create({
      data: { riskId: refreshedRisk.id, userId, action: "created", fieldChanged: null, oldValue: null, newValue: refreshedRisk.name },
    }).catch((e) => console.error("[risk audit]", e));

    // Auto-create snapshot for the current month
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    await prisma.riskSnapshot.upsert({
      where: { riskId_month: { riskId: refreshedRisk.id, month: monthStart } },
      update: {
        residualLikelihood: refreshedRisk.residualLikelihood,
        residualImpact: refreshedRisk.residualImpact,
        inherentLikelihood: refreshedRisk.inherentLikelihood,
        inherentImpact: refreshedRisk.inherentImpact,
        directionOfTravel: refreshedRisk.directionOfTravel,
      },
      create: {
        riskId: refreshedRisk.id, month: monthStart,
        residualLikelihood: refreshedRisk.residualLikelihood,
        residualImpact: refreshedRisk.residualImpact,
        inherentLikelihood: refreshedRisk.inherentLikelihood,
        inherentImpact: refreshedRisk.inherentImpact,
        directionOfTravel: refreshedRisk.directionOfTravel,
      },
    }).catch((e) => console.error("[risk snapshot]", e));

    return jsonResponse(serialiseDates(refreshedRisk), 201);
  } catch (err) {
    console.error("[POST /api/risks]", err);
    return errorResponse("Internal server error", 500);
  }
}
