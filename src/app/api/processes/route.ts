import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, generateReference } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { PROCESS_INCLUDE } from "@/lib/process-utils";

export async function GET() {
  try {
    const items = await prisma.process.findMany({
      include: PROCESS_INCLUDE,
      orderBy: { reference: "asc" },
    });
    return jsonResponse(serialiseDates(items));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch processes", 500);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  category: z.enum(["CUSTOMER_ONBOARDING","PAYMENTS","LENDING","COMPLIANCE","RISK_MANAGEMENT","FINANCE","TECHNOLOGY","PEOPLE","GOVERNANCE","OTHER"]).optional(),
  processType: z.enum(["CORE","SUPPORT","MANAGEMENT","GOVERNANCE"]).optional(),
  status: z.enum(["DRAFT","ACTIVE","UNDER_REVIEW","RETIRED"]).optional(),
  version: z.string().optional(),
  frequency: z.enum(["AD_HOC","DAILY","WEEKLY","MONTHLY","QUARTERLY","ANNUALLY","CONTINUOUS"]).optional(),
  automationLevel: z.enum(["MANUAL","PARTIALLY_AUTOMATED","FULLY_AUTOMATED"]).optional(),
  criticality: z.enum(["CRITICAL","IMPORTANT","STANDARD"]).optional(),
  triggerDescription: z.string().optional().nullable(),
  inputs: z.string().optional().nullable(),
  outputs: z.string().optional().nullable(),
  escalationPath: z.string().optional().nullable(),
  exceptions: z.string().optional().nullable(),
  endToEndSlaDays: z.number().int().positive().optional().nullable(),
  reviewFrequencyDays: z.number().int().positive().optional(),
  effectiveDate: z.string().optional().nullable(),
  nextReviewDate: z.string().optional().nullable(),
  smfFunction: z.string().optional().nullable(),
  prescribedResponsibilities: z.array(z.string()).optional(),
  ownerId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const validated = validateBody(createSchema, body);
  if ("error" in validated) return validated.error;

  try {
    const reference = await generateReference("PROC-", "process");
    const process = await prisma.process.create({
      data: {
        reference,
        name: validated.data.name,
        description: validated.data.description ?? null,
        purpose: validated.data.purpose ?? null,
        scope: validated.data.scope ?? null,
        category: validated.data.category ?? "OTHER",
        processType: validated.data.processType ?? "CORE",
        status: validated.data.status ?? "DRAFT",
        version: validated.data.version ?? "1.0",
        frequency: validated.data.frequency ?? "AD_HOC",
        automationLevel: validated.data.automationLevel ?? "MANUAL",
        criticality: validated.data.criticality ?? "STANDARD",
        triggerDescription: validated.data.triggerDescription ?? null,
        inputs: validated.data.inputs ?? null,
        outputs: validated.data.outputs ?? null,
        escalationPath: validated.data.escalationPath ?? null,
        exceptions: validated.data.exceptions ?? null,
        endToEndSlaDays: validated.data.endToEndSlaDays ?? null,
        reviewFrequencyDays: validated.data.reviewFrequencyDays ?? 365,
        effectiveDate: validated.data.effectiveDate ? new Date(validated.data.effectiveDate) : null,
        nextReviewDate: validated.data.nextReviewDate ? new Date(validated.data.nextReviewDate) : null,
        smfFunction: validated.data.smfFunction ?? null,
        prescribedResponsibilities: validated.data.prescribedResponsibilities ?? [],
        ownerId: validated.data.ownerId ?? null,
        maturityScore: 1,
      },
      include: PROCESS_INCLUDE,
    });
    return jsonResponse(serialiseDates(process), 201);
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to create process", 500);
  }
}
