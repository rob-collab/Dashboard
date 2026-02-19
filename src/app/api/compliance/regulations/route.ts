import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, naturalCompare, checkPermission, jsonResponse, errorResponse, validateQuery, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const querySchema = z.object({
  showAll: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const result = validateQuery(querySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;
    const { showAll } = result.data;

    const regulations = await prisma.regulation.findMany({
      where: {
        ...(showAll !== "true" && { isApplicable: true }),
      },
      include: {
        children: { select: { id: true, reference: true, name: true, level: true, complianceStatus: true } },
        parent: { select: { id: true, reference: true, name: true } },
        _count: { select: { policyLinks: true, controlLinks: true } },
      },
      orderBy: { reference: "asc" },
    });

    regulations.sort((a, b) => naturalCompare(a.reference, b.reference));

    return jsonResponse(serialiseDates(regulations));
  } catch (err) {
    console.error("[GET /api/compliance/regulations]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── Bulk update regulations (CSV import) ────────────────────────

const updateItemSchema = z.object({
  id: z.string(),
  reference: z.string().optional(),
  name: z.string().optional(),
  shortName: z.string().nullable().optional(),
  regulatoryBody: z.string().nullable().optional(),
  type: z.enum(["HANDBOOK_RULE", "PRINCIPLE", "LEGISLATION", "STATUTORY_INSTRUMENT", "GUIDANCE", "INDUSTRY_CODE"]).optional(),
  description: z.string().nullable().optional(),
  provisions: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  applicability: z.enum(["CORE", "HIGH", "MEDIUM", "LOW", "N_A", "ASSESS"]).optional(),
  applicabilityNotes: z.string().nullable().optional(),
  isApplicable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  primarySMF: z.string().nullable().optional(),
  secondarySMF: z.string().nullable().optional(),
  smfNotes: z.string().nullable().optional(),
  complianceStatus: z.enum(["COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT", "NOT_ASSESSED", "GAP_IDENTIFIED"]).optional(),
  assessmentNotes: z.string().nullable().optional(),
});

const bulkUpdateSchema = z.object({
  updates: z.array(updateItemSchema).min(1).max(500),
});

export async function PATCH(request: NextRequest) {
  try {
    const auth = await checkPermission(request, "edit:compliance");
    if (!auth.granted) return auth.error;

    const body = await request.json();
    const result = validateBody(bulkUpdateSchema, body);
    if ("error" in result) return result.error;

    const { updates } = result.data;

    // Execute all updates in a transaction
    const results = await prisma.$transaction(
      updates.map((item) => {
        const { id, ...data } = item;
        return prisma.regulation.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        });
      })
    );

    return jsonResponse({ updated: results.length });
  } catch (err) {
    console.error("[PATCH /api/compliance/regulations]", err);
    return errorResponse("Internal server error", 500);
  }
}
