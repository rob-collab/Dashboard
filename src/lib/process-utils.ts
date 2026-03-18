/** Shared constants and helpers for process API routes.
 *  Extracted from route.ts to avoid non-HTTP exports in Next.js route files. */

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
