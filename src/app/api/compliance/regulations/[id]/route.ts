import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateBody, auditLog, checkPermission } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const regulation = await prisma.regulation.findUnique({
      where: { id },
      include: {
        children: { select: { id: true, reference: true, name: true, level: true, complianceStatus: true } },
        parent: { select: { id: true, reference: true, name: true } },
        policyLinks: {
          include: {
            policy: true,
          },
        },
        controlLinks: {
          include: {
            control: {
              select: { id: true, controlRef: true, controlName: true, businessArea: true },
            },
          },
        },
      },
    });

    if (!regulation) return errorResponse("Regulation not found", 404);
    return jsonResponse(serialiseDates(regulation));
  } catch (err) {
    console.error("[GET /api/compliance/regulations/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

const updateSchema = z.object({
  complianceStatus: z.enum(["COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT", "NOT_ASSESSED", "GAP_IDENTIFIED"]).optional(),
  assessmentNotes: z.string().nullable().optional(),
  nextReviewDate: z.string().nullable().optional(),
  applicability: z.enum(["CORE", "HIGH", "MEDIUM", "LOW", "N_A", "ASSESS"]).optional(),
  applicabilityNotes: z.string().nullable().optional(),
  isApplicable: z.boolean().optional(),
  primarySMF: z.string().nullable().optional(),
  secondarySMF: z.string().nullable().optional(),
  smfNotes: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkPermission(request, "edit:compliance");
    if (!auth.granted) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;

    const data: Record<string, unknown> = { ...result.data };

    // Convert nextReviewDate string to Date if provided
    if (typeof data.nextReviewDate === "string") {
      data.nextReviewDate = new Date(data.nextReviewDate);
    }

    // Set lastAssessedAt when complianceStatus changes
    if (result.data.complianceStatus) {
      data.lastAssessedAt = new Date();
    }

    const regulation = await prisma.regulation.update({
      where: { id },
      data,
      include: {
        children: { select: { id: true, reference: true, name: true, level: true, complianceStatus: true } },
        parent: { select: { id: true, reference: true, name: true } },
        _count: { select: { policyLinks: true, controlLinks: true } },
      },
    });

    auditLog({ userId: auth.userId, action: "update_regulation_compliance", entityType: "regulation", entityId: id, changes: result.data as Record<string, unknown> });
    return jsonResponse(serialiseDates(regulation));
  } catch (err) {
    console.error("[PATCH /api/compliance/regulations/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
