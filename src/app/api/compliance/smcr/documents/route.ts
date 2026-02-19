import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const documents = await prisma.sMCRDocument.findMany({
      include: {
        owner: true,
      },
      orderBy: { docId: "asc" },
    });

    return jsonResponse(serialiseDates(documents));
  } catch (err) {
    console.error("[GET /api/compliance/smcr/documents]", err);
    return errorResponse("Internal server error", 500);
  }
}
