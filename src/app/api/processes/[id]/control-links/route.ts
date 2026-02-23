import { prisma, requireCCRORole, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { computeMaturity, PROCESS_INCLUDE } from "../../route";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;
  const { controlId, notes } = await request.json().catch(() => ({}));
  if (!controlId) return errorResponse("controlId required", 400);
  try {
    await prisma.processControlLink.create({
      data: { processId: id, controlId, linkedBy: auth.userId, notes: notes ?? null },
    });
    const fresh = await prisma.process.findUnique({ where: { id }, include: PROCESS_INCLUDE });
    if (!fresh) return errorResponse("Not found", 404);
    const maturityScore = computeMaturity(fresh as Parameters<typeof computeMaturity>[0]);
    const result = await prisma.process.update({ where: { id }, data: { maturityScore }, include: PROCESS_INCLUDE });
    return jsonResponse(serialiseDates(result));
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return errorResponse("Already linked", 409);
    console.error(e);
    return errorResponse("Failed to link control", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;
  const { controlId } = await request.json().catch(() => ({}));
  if (!controlId) return errorResponse("controlId required", 400);
  try {
    await prisma.processControlLink.deleteMany({ where: { processId: id, controlId } });
    const fresh = await prisma.process.findUnique({ where: { id }, include: PROCESS_INCLUDE });
    if (!fresh) return errorResponse("Not found", 404);
    const maturityScore = computeMaturity(fresh as Parameters<typeof computeMaturity>[0]);
    const result = await prisma.process.update({ where: { id }, data: { maturityScore }, include: PROCESS_INCLUDE });
    return jsonResponse(serialiseDates(result));
  } catch (e) { console.error(e); return errorResponse("Failed to unlink control", 500); }
}
