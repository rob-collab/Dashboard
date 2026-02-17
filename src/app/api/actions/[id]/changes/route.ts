import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const changes = await prisma.actionChange.findMany({
      where: { actionId: id },
      include: { proposer: true, reviewer: true },
      orderBy: { proposedAt: "desc" },
    });
    return jsonResponse(serialiseDates(changes));
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const action = await prisma.action.findUnique({ where: { id } });
    if (!action) return errorResponse("Action not found", 404);

    const body = await request.json();
    const { fieldChanged, oldValue, newValue, evidenceUrl, evidenceName, isUpdate } = body;

    if (!fieldChanged) return errorResponse("fieldChanged is required");

    const change = await prisma.actionChange.create({
      data: {
        actionId: id,
        proposedBy: userId,
        fieldChanged,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
        ...(evidenceUrl !== undefined && { evidenceUrl }),
        ...(evidenceName !== undefined && { evidenceName }),
        ...(isUpdate !== undefined && { isUpdate }),
      },
      include: { proposer: true },
    });

    return jsonResponse(serialiseDates(change), 201);
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
