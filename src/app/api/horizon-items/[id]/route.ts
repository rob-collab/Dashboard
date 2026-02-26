import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.enum(["FCA_REGULATORY", "LEGISLATIVE", "ECONOMIC", "DATA_TECHNOLOGY", "EMPLOYMENT", "PAYMENTS_REGULATORY", "COMPETITIVE"]).optional(),
  source: z.string().min(1).optional(),
  summary: z.string().optional(),
  whyItMatters: z.string().optional(),
  deadline: z.string().nullable().optional(),
  urgency: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  status: z.enum(["MONITORING", "ACTION_REQUIRED", "IN_PROGRESS", "COMPLETED", "DISMISSED"]).optional(),
  sourceUrl: z.string().nullable().optional(),
  actions: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.horizonItem.findUnique({
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
    if (!item) return errorResponse("Not found", 404);
    return jsonResponse(serialiseDates(item));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    const rawBody = await req.json();
    const validation = validateBody(patchSchema, rawBody);
    if ("error" in validation) return validation.error;
    const body = validation.data;

    const item = await prisma.horizonItem.update({
      where: { id },
      data: {
        ...body,
        deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : undefined,
      },
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

    return jsonResponse(serialiseDates(item));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return errorResponse("Unauthorised", 401);

    const { id } = await params;
    await prisma.horizonItem.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
