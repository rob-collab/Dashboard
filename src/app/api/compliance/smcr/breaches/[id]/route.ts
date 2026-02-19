import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateBody, auditLog, checkPermission } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const updateSchema = z.object({
  investigationNotes: z.string().nullable().optional(),
  status: z.enum(["IDENTIFIED", "UNDER_INVESTIGATION", "CLOSED_NO_ACTION", "CLOSED_DISCIPLINARY", "REPORTED_TO_FCA"]).optional(),
  outcome: z.string().nullable().optional(),
  disciplinaryAction: z.string().nullable().optional(),
  reportedToFCA: z.boolean().optional(),
  fcaReportDate: z.string().nullable().optional(),
  closedAt: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkPermission(request, "manage:smcr");
    if (!auth.granted) return auth.error;

    const { id } = await params;
    const existing = await prisma.conductRuleBreach.findUnique({ where: { id } });
    if (!existing) return errorResponse("Conduct rule breach not found", 404);

    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    const updateData: Record<string, unknown> = {};

    if (data.investigationNotes !== undefined) updateData.investigationNotes = data.investigationNotes;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.outcome !== undefined) updateData.outcome = data.outcome;
    if (data.disciplinaryAction !== undefined) updateData.disciplinaryAction = data.disciplinaryAction;
    if (data.reportedToFCA !== undefined) updateData.reportedToFCA = data.reportedToFCA;
    if (data.fcaReportDate !== undefined) {
      updateData.fcaReportDate = data.fcaReportDate ? new Date(data.fcaReportDate) : null;
    }
    if (data.closedAt !== undefined) {
      updateData.closedAt = data.closedAt ? new Date(data.closedAt) : null;
    }

    const updated = await prisma.conductRuleBreach.update({
      where: { id },
      data: updateData,
      include: {
        conductRule: true,
        user: true,
        reportedBy: true,
      },
    });

    auditLog({
      userId: auth.userId,
      action: "update_conduct_rule_breach",
      entityType: "conduct_rule_breach",
      entityId: id,
      changes: data as Record<string, unknown>,
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/compliance/smcr/breaches/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
