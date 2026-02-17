import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const includeRelations = {
  author: true,
  approvedBy: true,
  scheduleEntry: {
    include: {
      control: true,
    },
  },
} as const;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const summary = await prisma.quarterlySummary.findUnique({
      where: { id },
      include: includeRelations,
    });

    if (!summary) {
      return errorResponse("Quarterly summary not found", 404);
    }

    return jsonResponse(serialiseDates(summary));
  } catch (err) {
    console.error("[GET /api/controls/quarterly-summaries/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

const patchSchema = z.object({
  narrative: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { id } = await params;

    const body = await request.json();
    const result = validateBody(patchSchema, body);
    if ("error" in result) return result.error;
    const { narrative, status } = result.data;

    // Fetch existing summary
    const existing = await prisma.quarterlySummary.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse("Quarterly summary not found", 404);
    }

    // Cannot edit narrative if status is APPROVED
    if (narrative && existing.status === "APPROVED") {
      return errorResponse("Cannot edit narrative of an approved summary", 400);
    }

    // Build the update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (status === "SUBMITTED") {
      // Validate narrative is not empty before submitting
      const currentNarrative = narrative ?? existing.narrative;
      if (!currentNarrative?.trim()) {
        return errorResponse("Narrative must not be empty to submit", 400);
      }
      updateData.status = "SUBMITTED";
      // Reset approval fields when submitting
      updateData.approvedById = null;
      updateData.approvedAt = null;
    } else if (status === "APPROVED") {
      updateData.status = "APPROVED";
      updateData.approvedById = userId;
      updateData.approvedAt = new Date();
    } else if (status === "DRAFT") {
      updateData.status = "DRAFT";
      updateData.approvedById = null;
      updateData.approvedAt = null;
    }

    if (narrative) {
      updateData.narrative = narrative;
      // If narrative is updated and status was SUBMITTED or APPROVED, reset to DRAFT
      // (unless a new status was explicitly provided in this same request)
      if (!status && (existing.status === "SUBMITTED" || existing.status === "APPROVED")) {
        updateData.status = "DRAFT";
        updateData.approvedById = null;
        updateData.approvedAt = null;
      }
    }

    const updated = await prisma.quarterlySummary.update({
      where: { id },
      data: updateData,
      include: includeRelations,
    });

    return jsonResponse(serialiseDates(updated));
  } catch (err) {
    console.error("[PATCH /api/controls/quarterly-summaries/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    const existing = await prisma.quarterlySummary.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse("Quarterly summary not found", 404);
    }

    if (existing.status !== "DRAFT") {
      return errorResponse("Only draft summaries can be deleted", 400);
    }

    await prisma.quarterlySummary.delete({
      where: { id },
    });

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[DELETE /api/controls/quarterly-summaries/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
