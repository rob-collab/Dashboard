import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const rules = await prisma.conductRule.findMany({
      include: {
        breaches: true,
      },
      orderBy: { ruleId: "asc" },
    });

    return jsonResponse(serialiseDates(rules));
  } catch (err) {
    console.error("[GET /api/compliance/smcr/conduct-rules]", err);
    return errorResponse("Internal server error", 500);
  }
}
