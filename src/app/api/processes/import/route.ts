import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole } from "@/lib/api-helpers";

// Reverse-lookup maps from human label → DB enum value
const STATUS_MAP: Record<string, string> = {
  "Draft": "DRAFT", "Active": "ACTIVE", "Under Review": "UNDER_REVIEW", "Retired": "RETIRED",
};
const CATEGORY_MAP: Record<string, string> = {
  "Customer Onboarding": "CUSTOMER_ONBOARDING", "Payments": "PAYMENTS", "Lending": "LENDING",
  "Compliance": "COMPLIANCE", "Risk Management": "RISK_MANAGEMENT", "Finance": "FINANCE",
  "Technology": "TECHNOLOGY", "People": "PEOPLE", "Governance": "GOVERNANCE", "Other": "OTHER",
};
const TYPE_MAP: Record<string, string> = {
  "Core": "CORE", "Support": "SUPPORT", "Management": "MANAGEMENT", "Governance": "GOVERNANCE",
};
const CRITICALITY_MAP: Record<string, string> = {
  "Critical": "CRITICAL", "Important": "IMPORTANT", "Standard": "STANDARD",
};
const FREQUENCY_MAP: Record<string, string> = {
  "Ad Hoc": "AD_HOC", "Daily": "DAILY", "Weekly": "WEEKLY", "Monthly": "MONTHLY",
  "Quarterly": "QUARTERLY", "Annually": "ANNUALLY", "Continuous": "CONTINUOUS",
};
const AUTOMATION_MAP: Record<string, string> = {
  "Manual": "MANUAL", "Partially Automated": "PARTIALLY_AUTOMATED", "Fully Automated": "FULLY_AUTOMATED",
};

function mapEnum<T extends string>(map: Record<string, string>, value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  return (map[value] ?? value) as T;
}

export async function POST(request: NextRequest) {
  const authResult = await requireCCRORole(request);
  if ("error" in authResult) return authResult.error;
  const { userId } = authResult;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return errorResponse("Body must contain { rows: [...] }", 400);
  }

  const rows = body.rows as Record<string, string>[];
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowLabel = `Row ${i + 2}`; // 1-indexed + header

    const reference = row["Reference"]?.trim();
    const name = row["Name"]?.trim();
    if (!reference) { errors.push(`${rowLabel}: Missing Reference`); continue; }
    if (!name) { errors.push(`${rowLabel}: Missing Name`); continue; }

    // Resolve owner by name
    let ownerId: string | undefined;
    const ownerName = row["Owner"]?.trim();
    if (ownerName) {
      const owner = await prisma.user.findFirst({ where: { name: ownerName } });
      if (owner) ownerId = owner.id;
    }

    const prescribedRaw = row["Prescribed Responsibilities"]?.trim();
    const prescribedResponsibilities = prescribedRaw
      ? prescribedRaw.split("|").map((s) => s.trim()).filter(Boolean)
      : [];

    const data = {
      name,
      status: mapEnum(STATUS_MAP, row["Status"], "DRAFT" as const),
      category: mapEnum(CATEGORY_MAP, row["Category"], "OTHER" as const),
      processType: mapEnum(TYPE_MAP, row["Process Type"], "CORE" as const),
      criticality: mapEnum(CRITICALITY_MAP, row["Criticality"], "STANDARD" as const),
      frequency: mapEnum(FREQUENCY_MAP, row["Frequency"], "AD_HOC" as const),
      automationLevel: mapEnum(AUTOMATION_MAP, row["Automation Level"], "MANUAL" as const),
      version: row["Version"]?.trim() || "1.0",
      effectiveDate: row["Effective Date"] ? new Date(row["Effective Date"]) : null,
      nextReviewDate: row["Next Review Date"] ? new Date(row["Next Review Date"]) : null,
      endToEndSlaDays: row["SLA Days"] ? parseInt(row["SLA Days"], 10) || null : null,
      smfFunction: row["SMF Function"]?.trim() || null,
      prescribedResponsibilities,
      ...(ownerId ? { ownerId } : {}),
    };

    try {
      const existing = await prisma.process.findUnique({ where: { reference } });
      if (existing) {
        await prisma.process.update({ where: { reference }, data });
        updated++;
        prisma.auditLog.create({
          data: { userId, userRole: "CCRO_TEAM", action: "update_process", entityType: "process", entityId: existing.id, changes: { source: "csv_import" } },
        }).catch(() => {});
      } else {
        // Auto-generate reference if needed or use provided
        await prisma.process.create({
          data: {
            reference,
            ...data,
            maturityScore: 1,
          },
        });
        created++;
        prisma.auditLog.create({
          data: { userId, userRole: "CCRO_TEAM", action: "create_process", entityType: "process", entityId: reference, changes: { source: "csv_import" } },
        }).catch(() => {});
      }
    } catch (err) {
      errors.push(`${rowLabel} (${reference}): ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return jsonResponse({ created, updated, errors });
}
