import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, requireCCRORole, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  metric: z.string().min(1).optional(),
  current: z.string().optional(),
  previous: z.string().optional(),
  change: z.string().optional(),
  ragStatus: z.enum(["GOOD", "WARNING", "HARM"]).optional(),
  appetite: z.string().nullable().optional(),
  appetiteOperator: z.string().nullable().optional(),
  narrative: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authResult = await requireCCRORole(request);
    if ('error' in authResult) return authResult.error;
    const body = await request.json();
    const result = validateBody(updateSchema, body);
    if ("error" in result) return result.error;
    const mi = await prisma.consumerDutyMI.update({ where: { id }, data: result.data });
    return jsonResponse(serialiseDates(mi));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authResult = await requireCCRORole(_req);
    if ('error' in authResult) return authResult.error;
    await prisma.consumerDutyMI.delete({ where: { id } });
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
