import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody, generateReference } from "@/lib/api-helpers";
// Note: generateReference(prefix, modelName) — uses prisma internally
import { serialiseDates } from "@/lib/serialise";

const createActionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedTo: z.string().min(1),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(["P1", "P2", "P3"]).nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;

    // Verify horizon item exists
    const horizonItem = await prisma.horizonItem.findUnique({ where: { id } });
    if (!horizonItem) return errorResponse("Horizon item not found", 404);

    const rawBody = await req.json();
    const validation = validateBody(createActionSchema, rawBody);
    if ("error" in validation) return validation.error;
    const body = validation.data;

    const reference = await generateReference("ACT-", "action");

    const [action] = await prisma.$transaction([
      prisma.action.create({
        data: {
          reference,
          title: body.title,
          description: body.description ?? "",
          source: `Horizon Scanning — ${horizonItem.reference}`,
          status: "OPEN",
          approvalStatus: "APPROVED",
          priority: body.priority ?? null,
          assignedTo: body.assignedTo,
          createdBy: userId,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        },
      }),
    ]);

    // Create the link
    await prisma.horizonActionLink.create({
      data: {
        horizonItemId: id,
        actionId: action.id,
        linkedBy: userId,
      },
    });

    // Return updated horizon item with links
    const updated = await prisma.horizonItem.findUnique({
      where: { id },
      include: {
        actionLinks: {
          include: {
            action: { select: { id: true, reference: true, title: true, status: true } },
          },
        },
        riskLinks: {
          include: {
            risk: { select: { id: true, reference: true, name: true } },
          },
        },
      },
    });

    return jsonResponse({ action: serialiseDates(action), horizonItem: serialiseDates(updated) }, 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
