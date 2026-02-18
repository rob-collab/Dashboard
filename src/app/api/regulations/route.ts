import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createSchema = z.object({
  reference: z.string().optional(),
  name: z.string().min(1),
  shortName: z.string().optional().nullable(),
  body: z.string().min(1),
  type: z.enum(["HANDBOOK_RULE", "PRINCIPLE", "LEGISLATION", "STATUTORY_INSTRUMENT", "GUIDANCE", "INDUSTRY_CODE"]),
  provisions: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const regulations = await prisma.regulation.findMany({
      include: { _count: { select: { policyLinks: true } } },
      orderBy: { reference: "asc" },
    });

    return jsonResponse(serialiseDates(regulations));
  } catch (err) {
    console.error("[GET /api/regulations]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    // Generate reference if not provided
    let reference = data.reference;
    if (!reference) {
      const lastReg = await prisma.regulation.findFirst({ orderBy: { reference: "desc" } });
      const nextNum = lastReg ? parseInt(lastReg.reference.replace("REG-", ""), 10) + 1 : 1;
      reference = `REG-${String(nextNum).padStart(3, "0")}`;
    }

    const regulation = await prisma.regulation.create({
      data: {
        reference,
        name: data.name,
        shortName: data.shortName ?? null,
        body: data.body,
        type: data.type,
        provisions: data.provisions ?? null,
        url: data.url ?? null,
        description: data.description ?? null,
      },
      include: { _count: { select: { policyLinks: true } } },
    });

    return jsonResponse(serialiseDates(regulation), 201);
  } catch (err) {
    console.error("[POST /api/regulations]", err);
    return errorResponse("Internal server error", 500);
  }
}
