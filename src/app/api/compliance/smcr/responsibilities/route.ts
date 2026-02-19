import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const responsibilities = await prisma.prescribedResponsibility.findMany({
      include: {
        assignedSMF: {
          include: {
            currentHolder: true,
          },
        },
      },
      orderBy: { prId: "asc" },
    });

    return jsonResponse(serialiseDates(responsibilities));
  } catch (err) {
    console.error("[GET /api/compliance/smcr/responsibilities]", err);
    return errorResponse("Internal server error", 500);
  }
}
