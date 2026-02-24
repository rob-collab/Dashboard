import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  eventDate: z.string().optional(),
  type: z.enum(["DEADLINE", "REVIEW", "SUBMISSION", "CONSULTATION", "INTERNAL_DEADLINE"]).optional(),
  source: z.string().optional(),
  url: z.string().optional().nullable(),
  alertDays: z.number().int().min(1).max(365).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const validated = validateBody(patchSchema, body);
  if ("error" in validated) return validated.error;

  try {
    const data: Record<string, unknown> = { ...validated.data };
    if (validated.data.eventDate) data.eventDate = new Date(validated.data.eventDate);

    const event = await prisma.regulatoryEvent.update({
      where: { id },
      data,
    });
    return jsonResponse(serialiseDates(event));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to update regulatory event", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    await prisma.regulatoryEvent.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to delete regulatory event", 500);
  }
}
