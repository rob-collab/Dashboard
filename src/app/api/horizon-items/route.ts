import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createSchema = z.object({
  title: z.string().min(1),
  category: z.enum(["FCA_REGULATORY", "LEGISLATIVE", "ECONOMIC", "DATA_TECHNOLOGY", "EMPLOYMENT", "PAYMENTS_REGULATORY", "COMPETITIVE"]),
  source: z.string().min(1),
  summary: z.string().min(1),
  whyItMatters: z.string().min(1),
  deadline: z.string().nullable().optional(),
  urgency: z.enum(["HIGH", "MEDIUM", "LOW"]),
  status: z.enum(["MONITORING", "ACTION_REQUIRED", "IN_PROGRESS", "COMPLETED", "DISMISSED"]).optional(),
  sourceUrl: z.string().nullable().optional(),
  actions: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const items = await prisma.horizonItem.findMany({
      orderBy: [{ urgency: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
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
    return jsonResponse(serialiseDates(items));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return errorResponse("Unauthorised", 401);

    const rawBody = await req.json();
    const validation = validateBody(createSchema, rawBody);
    if ("error" in validation) return validation.error;
    const body = validation.data;

    // Auto-generate reference HZ-NNN
    const count = await prisma.horizonItem.count();
    const reference = `HZ-${String(count + 1).padStart(3, "0")}`;

    // Auto-set monthAdded e.g. "February 2026"
    const now = new Date();
    const monthAdded = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

    const item = await prisma.horizonItem.create({
      data: {
        reference,
        title: body.title,
        category: body.category,
        source: body.source,
        summary: body.summary,
        whyItMatters: body.whyItMatters,
        deadline: body.deadline ? new Date(body.deadline) : null,
        urgency: body.urgency,
        status: body.status ?? "MONITORING",
        sourceUrl: body.sourceUrl ?? null,
        actions: body.actions ?? null,
        notes: body.notes ?? null,
        monthAdded,
        inFocus: false,
        addedById: userId,
      },
      include: {
        actionLinks: true,
        riskLinks: true,
      },
    });

    return jsonResponse(serialiseDates(item), 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
