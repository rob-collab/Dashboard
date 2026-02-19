import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, jsonResponse, errorResponse, validateBody, auditLog, checkPermission } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const createSchema = z.object({
  userId: z.string().min(1),
  certificationFunctionId: z.string().min(1),
  certifiedDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(["CURRENT", "DUE", "OVERDUE", "LAPSED", "REVOKED"]).optional(),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const functions = await prisma.certificationFunction.findMany({
      include: {
        certifiedPersons: {
          include: {
            user: true,
            assessor: true,
          },
        },
      },
    });

    return jsonResponse(serialiseDates(functions));
  } catch (err) {
    console.error("[GET /api/compliance/smcr/certification]", err);
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

    const certifiedPerson = await prisma.certifiedPerson.create({
      data: {
        userId: data.userId,
        certificationFunctionId: data.certificationFunctionId,
        certifiedDate: data.certifiedDate ? new Date(data.certifiedDate) : new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        status: data.status ?? "CURRENT",
        notes: data.notes ?? null,
      },
      include: {
        user: true,
        assessor: true,
        certificationFunction: true,
      },
    });

    auditLog({
      userId: auth.userId,
      action: "create_certified_person",
      entityType: "certified_person",
      entityId: certifiedPerson.id,
      changes: {
        userId: data.userId,
        certificationFunctionId: data.certificationFunctionId,
        status: data.status ?? "CURRENT",
      },
    });

    return jsonResponse(serialiseDates(certifiedPerson), 201);
  } catch (err) {
    console.error("[POST /api/compliance/smcr/certification]", err);
    return errorResponse("Internal server error", 500);
  }
}
