import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, validateQuery } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const querySchema = z.object({
  scheduleEntryId: z.string().optional(),
  quarter: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const result = validateQuery(querySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;
    const { scheduleEntryId, quarter, status } = result.data;

    const summaries = await prisma.quarterlySummary.findMany({
      where: {
        ...(scheduleEntryId && { scheduleEntryId }),
        ...(quarter && { quarter }),
        ...(status && { status }),
      },
      include: {
        author: true,
        approvedBy: true,
        scheduleEntry: {
          include: {
            control: true,
          },
        },
      },
      orderBy: { quarter: "desc" },
    });

    return jsonResponse(serialiseDates(summaries));
  } catch (err) {
    console.error("[GET /api/controls/quarterly-summaries]", err);
    return errorResponse("Internal server error", 500);
  }
}

const createSchema = z.object({
  scheduleEntryId: z.string().min(1),
  quarter: z.string().min(1),
  narrative: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;
    const { scheduleEntryId, quarter, narrative } = result.data;

    const summary = await prisma.quarterlySummary.upsert({
      where: {
        scheduleEntryId_quarter: {
          scheduleEntryId,
          quarter,
        },
      },
      update: {
        narrative,
        status: "DRAFT",
      },
      create: {
        scheduleEntryId,
        quarter,
        narrative,
        authorId: userId,
        status: "DRAFT",
      },
      include: {
        author: true,
        approvedBy: true,
        scheduleEntry: {
          include: {
            control: true,
          },
        },
      },
    });

    return jsonResponse(serialiseDates(summary), 201);
  } catch (err) {
    console.error("[POST /api/controls/quarterly-summaries]", err);
    return errorResponse("Internal server error", 500);
  }
}
