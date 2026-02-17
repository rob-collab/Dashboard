import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, jsonResponse, errorResponse, validateBody, validateQuery } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const querySchema = z.object({
  controlId: z.string().optional(),
  periodYear: z.string().optional(),
  periodMonth: z.string().optional(),
  attestedById: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const result = validateQuery(querySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;
    const { controlId, periodYear, periodMonth, attestedById } = result.data;

    const attestations = await prisma.controlAttestation.findMany({
      where: {
        ...(controlId && { controlId }),
        ...(periodYear && { periodYear: parseInt(periodYear) }),
        ...(periodMonth && { periodMonth: parseInt(periodMonth) }),
        ...(attestedById && { attestedById }),
      },
      include: {
        attestedBy: true,
        control: { include: { businessArea: true } },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    return jsonResponse(serialiseDates(attestations));
  } catch (err) {
    console.error("[GET /api/controls/attestations]", err);
    return errorResponse("Internal server error", 500);
  }
}

const attestSchema = z.object({
  controlId: z.string().min(1),
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  attested: z.boolean(),
  comments: z.string().nullable().optional(),
  issuesFlagged: z.boolean().optional(),
  issueDescription: z.string().nullable().optional(),
});

const bulkSchema = z.object({
  attestations: z.array(attestSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const body = await request.json();
    const result = validateBody(bulkSchema, body);
    if ("error" in result) return result.error;

    const upserted = [];
    for (const entry of result.data.attestations) {
      // Validate: issue description required if issue flagged
      if (entry.issuesFlagged && !entry.issueDescription?.trim()) {
        return errorResponse("Issue description is required when flagging an issue", 400);
      }

      const record = await prisma.controlAttestation.upsert({
        where: {
          controlId_periodYear_periodMonth: {
            controlId: entry.controlId,
            periodYear: entry.periodYear,
            periodMonth: entry.periodMonth,
          },
        },
        update: {
          attested: entry.attested,
          attestedById: userId,
          comments: entry.comments ?? null,
          issuesFlagged: entry.issuesFlagged ?? false,
          issueDescription: entry.issueDescription ?? null,
        },
        create: {
          controlId: entry.controlId,
          periodYear: entry.periodYear,
          periodMonth: entry.periodMonth,
          attested: entry.attested,
          attestedById: userId,
          comments: entry.comments ?? null,
          issuesFlagged: entry.issuesFlagged ?? false,
          issueDescription: entry.issueDescription ?? null,
        },
        include: { attestedBy: true },
      });
      upserted.push(record);
    }

    return jsonResponse(serialiseDates(upserted), 201);
  } catch (err) {
    console.error("[POST /api/controls/attestations]", err);
    return errorResponse("Internal server error", 500);
  }
}
