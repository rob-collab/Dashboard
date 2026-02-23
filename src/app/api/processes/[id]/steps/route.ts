import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const stepSchema = z.object({
  stepOrder: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  responsibleRole: z.string().optional().nullable(),
  accountableRole: z.string().optional().nullable(),
  slaDays: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  const validated = validateBody(stepSchema, body);
  if ("error" in validated) return validated.error;
  try {
    const step = await prisma.processStep.upsert({
      where: { processId_stepOrder: { processId: id, stepOrder: validated.data.stepOrder } },
      create: { processId: id, ...validated.data },
      update: validated.data,
    });
    return jsonResponse(serialiseDates(step), 201);
  } catch (e) { console.error(e); return errorResponse("Failed to save step", 500); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;
  const { stepId } = await request.json().catch(() => ({}));
  if (!stepId) return errorResponse("stepId required", 400);
  try {
    await prisma.processStep.delete({ where: { id: stepId } });
    return jsonResponse({ success: true });
  } catch (e) { console.error(e); return errorResponse("Failed to delete step", 500); }
}
