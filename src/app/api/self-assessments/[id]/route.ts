import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const item = await prisma.selfAssessment.findUnique({ where: { id } });
    if (!item) return errorResponse("Self-assessment not found", 404);
    return jsonResponse(serialiseDates(item));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch self-assessment", 500);
  }
}

const patchSchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED"]).optional(),
  executiveSummary: z.string().optional().nullable(),
  ibsCoverage: z.record(z.string(), z.unknown()).optional().nullable(),
  vulnerabilitiesCount: z.number().int().min(0).optional(),
  openRemediations: z.number().int().min(0).optional(),
  documentUrl: z.string().optional().nullable(),
  submittedAt: z.string().datetime().optional().nullable(),
  approvedBy: z.string().optional().nullable(),
  boardApprovalDate: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const validated = validateBody(patchSchema, body);
  if ("error" in validated) return validated.error;

  const data: Record<string, unknown> = { ...validated.data };
  if (validated.data.submittedAt !== undefined) {
    data.submittedAt = validated.data.submittedAt ? new Date(validated.data.submittedAt) : null;
  }
  if (validated.data.boardApprovalDate !== undefined) {
    data.boardApprovalDate = validated.data.boardApprovalDate ? new Date(validated.data.boardApprovalDate) : null;
  }

  try {
    const item = await prisma.selfAssessment.update({ where: { id }, data });
    return jsonResponse(serialiseDates(item));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to update self-assessment", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    await prisma.selfAssessment.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to delete self-assessment", 500);
  }
}
