import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, validateQuery } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const querySchema = z.object({
  businessAreaId: z.string().optional(),
  consumerDutyOutcome: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  includeSchedule: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const result = validateQuery(querySchema, request.nextUrl.searchParams);
    if ("error" in result) return result.error;
    const { businessAreaId, consumerDutyOutcome, isActive, includeSchedule } = result.data;

    const controls = await prisma.control.findMany({
      where: {
        ...(businessAreaId && { businessAreaId }),
        ...(consumerDutyOutcome && { consumerDutyOutcome: consumerDutyOutcome as never }),
        ...(isActive !== undefined && { isActive: isActive === "true" }),
      },
      include: {
        businessArea: true,
        controlOwner: true,
        testingSchedule: includeSchedule === "true" ? {
          include: {
            assignedTester: true,
            testResults: { orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }], take: 12 },
          },
        } : false,
        attestations: includeSchedule === "true" ? {
          include: { attestedBy: true, ccroReviewedBy: true },
        } : false,
      },
      orderBy: { controlRef: "asc" },
    });

    return jsonResponse(serialiseDates(controls));
  } catch (err) {
    console.error("[GET /api/controls/library]", err);
    return errorResponse("Internal server error", 500);
  }
}

const createSchema = z.object({
  controlName: z.string().min(1),
  controlDescription: z.string().min(1),
  businessAreaId: z.string().min(1),
  controlOwnerId: z.string().min(1),
  consumerDutyOutcome: z.enum(["PRODUCTS_AND_SERVICES", "CONSUMER_UNDERSTANDING", "CONSUMER_SUPPORT", "GOVERNANCE_CULTURE_OVERSIGHT"]),
  controlFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "BI_ANNUAL", "ANNUAL", "EVENT_DRIVEN"]),
  internalOrThirdParty: z.enum(["INTERNAL", "THIRD_PARTY"]).optional(),
  controlType: z.enum(["PREVENTATIVE", "DETECTIVE", "CORRECTIVE", "DIRECTIVE"]).nullable().optional(),
  standingComments: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const result = validateBody(createSchema, body);
    if ("error" in result) return result.error;

    // Generate next CTRL-NNN reference
    const lastControl = await prisma.control.findFirst({ orderBy: { controlRef: "desc" } });
    let nextNum = 1;
    if (lastControl) {
      const match = lastControl.controlRef.match(/CTRL-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const controlRef = `CTRL-${String(nextNum).padStart(3, "0")}`;

    const control = await prisma.control.create({
      data: {
        controlRef,
        controlName: result.data.controlName,
        controlDescription: result.data.controlDescription,
        businessAreaId: result.data.businessAreaId,
        controlOwnerId: result.data.controlOwnerId,
        consumerDutyOutcome: result.data.consumerDutyOutcome,
        controlFrequency: result.data.controlFrequency,
        internalOrThirdParty: result.data.internalOrThirdParty ?? "INTERNAL",
        controlType: result.data.controlType ?? null,
        standingComments: result.data.standingComments ?? null,
        createdById: auth.userId,
      },
      include: {
        businessArea: true,
        controlOwner: true,
      },
    });

    return jsonResponse(serialiseDates(control), 201);
  } catch (err) {
    console.error("[POST /api/controls/library]", err);
    return errorResponse("Internal server error", 500);
  }
}
