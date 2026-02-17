import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody, validateQuery } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const querySchema = z.object({
  categoryL1: z.string().optional(),
  owner: z.string().optional(),
  directionOfTravel: z.enum(["IMPROVING", "STABLE", "DETERIORATING"]).optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  categoryL1: z.string().min(1),
  categoryL2: z.string().min(1),
  owner: z.string().min(1),
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
    const { categoryL1, owner, directionOfTravel } = result.data;

    const risks = await prisma.risk.findMany({
      where: {
        ...(categoryL1 && { categoryL1 }),
        ...(owner && { owner }),
        ...(directionOfTravel && { directionOfTravel }),
      },
      include: {
        controls: { orderBy: { sortOrder: "asc" } },
        mitigations: { orderBy: { createdAt: "asc" } },
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

    // Generate next reference number
    const lastRisk = await prisma.risk.findFirst({ orderBy: { reference: "desc" } });
    const nextNum = lastRisk ? parseInt(lastRisk.reference.replace("R", ""), 10) + 1 : 1;
    const reference = `R${String(nextNum).padStart(3, "0")}`;

    // Helper: resolve owner name to user ID (case-insensitive, fallback to createdBy)
    const resolveOwnerToUserId = async (ownerName: string | null | undefined, fallback: string): Promise<string> => {
      if (!ownerName) return fallback;
      const user = await prisma.user.findFirst({ where: { name: { equals: ownerName, mode: "insensitive" } } });
      return user?.id ?? fallback;
    };

    // Map mitigation status to action status
    const mitigationToActionStatus = (ms: string): "OPEN" | "IN_PROGRESS" | "COMPLETED" => {
      if (ms === "COMPLETE") return "COMPLETED";
      if (ms === "IN_PROGRESS") return "IN_PROGRESS";
      return "OPEN";
    };

    const risk = await prisma.risk.create({
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
      },
    });

    // Auto-create linked Actions for each mitigation
    if (risk.mitigations.length > 0) {
      for (const mit of risk.mitigations) {
        const assigneeId = await resolveOwnerToUserId(mit.owner, userId);
        const linkedAction = await prisma.action.create({
          data: {
            title: mit.action,
            description: `Mitigation action from Risk ${reference}: ${risk.name}`,
            source: "Risk Register",
            status: mitigationToActionStatus(mit.status),
            assignedTo: assigneeId,
            createdBy: userId,
            dueDate: mit.deadline,
          },
        });
        await prisma.riskMitigation.update({
          where: { id: mit.id },
          data: { actionId: linkedAction.id },
        });
      }
    }

    // Re-fetch to include actionIds in mitigations
    const refreshedRisk = await prisma.risk.findUnique({
      where: { id: risk.id },
      include: {
        controls: { orderBy: { sortOrder: "asc" } },
        mitigations: { orderBy: { createdAt: "asc" } },
      },
    });

    // Audit log
    await prisma.riskAuditLog.create({
      data: { riskId: risk.id, userId, action: "created", fieldChanged: null, oldValue: null, newValue: risk.name },
    }).catch((e) => console.error("[risk audit]", e));

    // Auto-create snapshot for the current month
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    await prisma.riskSnapshot.upsert({
      where: { riskId_month: { riskId: risk.id, month: monthStart } },
      update: {
        residualLikelihood: risk.residualLikelihood,
        residualImpact: risk.residualImpact,
        inherentLikelihood: risk.inherentLikelihood,
        inherentImpact: risk.inherentImpact,
        directionOfTravel: risk.directionOfTravel,
      },
      create: {
        riskId: risk.id, month: monthStart,
        residualLikelihood: risk.residualLikelihood,
        residualImpact: risk.residualImpact,
        inherentLikelihood: risk.inherentLikelihood,
        inherentImpact: risk.inherentImpact,
        directionOfTravel: risk.directionOfTravel,
      },
    }).catch((e) => console.error("[risk snapshot]", e));

    return jsonResponse(serialiseDates(refreshedRisk ?? risk), 201);
  } catch (err) {
    console.error("[POST /api/risks]", err);
    return errorResponse("Internal server error", 500);
  }
}
