import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const items = await prisma.selfAssessment.findMany({
      orderBy: { year: "desc" },
    });
    return jsonResponse(serialiseDates(items));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch self-assessments", 500);
  }
}

const createSchema = z.object({
  year: z.number().int().min(2020).max(2050),
  executiveSummary: z.string().optional().nullable(),
  documentUrl: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const validated = validateBody(createSchema, body);
  if ("error" in validated) return validated.error;

  try {
    const item = await prisma.selfAssessment.create({
      data: {
        year: validated.data.year,
        executiveSummary: validated.data.executiveSummary ?? null,
        documentUrl: validated.data.documentUrl ?? null,
        status: "DRAFT",
      },
    });
    return jsonResponse(serialiseDates(item), 201);
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to create self-assessment", 500);
  }
}
