import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, generateReference } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export const PROCESS_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  steps: { orderBy: { stepOrder: "asc" as const } },
  controlLinks: {
    include: {
      control: {
        select: {
          id: true, controlRef: true, controlName: true, controlType: true, isActive: true,
          testingSchedule: {
            include: {
              testResults: { orderBy: { testedDate: "desc" as const }, take: 1 },
            },
          },
        },
      },
    },
  },
  policyLinks: {
    include: {
      policy: { select: { id: true, reference: true, name: true, status: true, version: true } },
    },
  },
  regulationLinks: {
    include: {
      regulation: { select: { id: true, reference: true, name: true, shortName: true, complianceStatus: true } },
    },
  },
  riskLinks: {
    include: {
      risk: { select: { id: true, reference: true, name: true, residualLikelihood: true, residualImpact: true } },
    },
  },
  ibsLinks: {
    include: {
      ibs: { select: { id: true, reference: true, name: true, maxTolerableDisruptionHours: true, smfAccountable: true, status: true } },
    },
  },
};

/** Compute maturity score 1–5 from process fields + link counts */
export function computeMaturity(p: {
  ownerId?: string | null;
  description?: string | null;
  purpose?: string | null;
  smfFunction?: string | null;
  endToEndSlaDays?: number | null;
  ibsLinks?: unknown[];
  controlLinks?: unknown[];
  policyLinks?: unknown[];
  regulationLinks?: unknown[];
  riskLinks?: unknown[];
  steps?: unknown[];
  nextReviewDate?: Date | string | null;
}): number {
  // Level 1: always (name is required to exist)
  let level = 1;

  // Level 2: named owner + description + purpose
  if (p.ownerId && p.description && p.purpose) level = 2;
  else return level;

  // Level 3: linked to ≥1 policy or regulation + review date set
  const hasLinks = (p.policyLinks?.length ?? 0) > 0 || (p.regulationLinks?.length ?? 0) > 0;
  if (hasLinks && p.nextReviewDate) level = 3;
  else return level;

  // Level 4: linked controls + linked risks + steps defined
  const hasControls = (p.controlLinks?.length ?? 0) > 0;
  const hasRisks = (p.riskLinks?.length ?? 0) > 0;
  const hasSteps = (p.steps?.length ?? 0) > 0;
  if (hasControls && hasRisks && hasSteps) level = 4;
  else return level;

  // Level 5: linked to ≥1 IBS + SLA defined + SMF assigned
  const hasIbs = (p.ibsLinks?.length ?? 0) > 0;
  if (hasIbs && p.endToEndSlaDays && p.smfFunction) level = 5;

  return level;
}

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
