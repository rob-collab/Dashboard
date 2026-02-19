import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const roles = await prisma.sMFRole.findMany({
      include: {
        currentHolder: true,
        responsibilities: true,
      },
      orderBy: { smfId: "asc" },
    });

    return jsonResponse(serialiseDates(roles));
  } catch (err) {
    console.error("[GET /api/compliance/smcr/roles]", err);
    return errorResponse("Internal server error", 500);
  }
}
