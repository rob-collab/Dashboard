import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, checkPermission, generateReference, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: riskId } = await params;
    const links = await prisma.riskActionLink.findMany({
      where: { riskId },
      include: {
        action: {
          select: { id: true, reference: true, title: true, status: true, assignedTo: true, dueDate: true, priority: true },
        },
      },
      orderBy: { linkedAt: "desc" },
    });
    return jsonResponse(serialiseDates(links));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

const createSchema = z.object({
  // Provide actionId to link an existing action
  actionId: z.string().min(1).optional(),
  // Or provide these fields to create a new action
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignedTo: z.string().min(1).optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(["P1", "P2", "P3"]).nullable().optional(),
}).refine(
  (d) => d.actionId || (d.title && d.assignedTo),
  { message: "Provide either actionId (link existing) or title + assignedTo (create new)" }
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CCRO_TEAM and OWNER can raise / link actions
    const perm = await checkPermission(req, "create:action");
    if (!perm.granted) return perm.error;
    const { userId } = perm;

    const { id: riskId } = await params;

    const risk = await prisma.risk.findUnique({ where: { id: riskId } });
    if (!risk) return errorResponse("Risk not found", 404);

    const rawBody = await req.json();
    const validation = validateBody(createSchema, rawBody);
    if ("error" in validation) return validation.error;
    const body = validation.data;

    let actionId: string;

    if (body.actionId) {
      // Link existing action
      const action = await prisma.action.findUnique({ where: { id: body.actionId } });
      if (!action) return errorResponse("Action not found", 404);
      actionId = body.actionId;
    } else {
      // Create new action then link
      const reference = await generateReference("ACT-", "action");
      const action = await prisma.action.create({
        data: {
          reference,
          title: body.title!,
          description: body.description ?? `Action raised from Risk ${risk.reference}: ${risk.name}`,
          source: `Risk Register — ${risk.reference}`,
          status: "OPEN",
          approvalStatus: "APPROVED",
          priority: body.priority ?? null,
          assignedTo: body.assignedTo!,
          createdBy: userId,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        },
      });
      actionId = action.id;
    }

    // Upsert to avoid duplicate link
    const link = await prisma.riskActionLink.upsert({
      where: { riskId_actionId: { riskId, actionId } },
      create: { riskId, actionId, linkedBy: userId },
      update: {},
      include: {
        action: {
          select: { id: true, reference: true, title: true, status: true, assignedTo: true, dueDate: true, priority: true },
        },
      },
    });

    return jsonResponse(serialiseDates(link), 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
