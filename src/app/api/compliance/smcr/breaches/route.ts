import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateBody, auditLog, checkPermission, generateReference, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createSchema = z.object({
  conductRuleId: z.string().min(1),
  userId: z.string().min(1),
  dateIdentified: z.string().min(1),
  description: z.string().min(1),
  reportedById: z.string().optional(),
  status: z.enum(["IDENTIFIED", "UNDER_INVESTIGATION", "CLOSED_NO_ACTION", "CLOSED_DISCIPLINARY", "REPORTED_TO_FCA"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) return errorResponse("Unauthorised", 401);

    const breaches = await prisma.conductRuleBreach.findMany({
      include: {
        conductRule: true,
        user: true,
        reportedBy: true,
      },
      orderBy: { dateIdentified: "desc" },
    });

    return jsonResponse(serialiseDates(breaches));
  } catch (err) {
    console.error("[GET /api/compliance/smcr/breaches]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkPermission(request, "manage:smcr");
    if (!auth.granted) return auth.error;

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;
    const data = result.data;

    // Generate next reference number (collision-safe)
    const reference = await generateReference("BRE-", "conductRuleBreach");

    const breach = await prisma.conductRuleBreach.create({
      data: {
        reference,
        conductRuleId: data.conductRuleId,
        userId: data.userId,
        dateIdentified: new Date(data.dateIdentified),
        description: data.description,
        reportedById: data.reportedById ?? auth.userId,
        status: data.status ?? "IDENTIFIED",
      },
      include: {
        conductRule: true,
        user: true,
        reportedBy: true,
      },
    });

    auditLog({
      userId: auth.userId,
      action: "create_conduct_rule_breach",
      entityType: "conduct_rule_breach",
      entityId: breach.id,
      changes: {
        reference,
        conductRuleId: data.conductRuleId,
        userId: data.userId,
        status: data.status ?? "IDENTIFIED",
      },
    });

    return jsonResponse(serialiseDates(breach), 201);
  } catch (err) {
    console.error("[POST /api/compliance/smcr/breaches]", err);
    return errorResponse("Internal server error", 500);
  }
}
