import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId, generateReference } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

interface ImportRow {
  name: string;
  description: string;
  categoryL1: string;
  categoryL2: string;
  owner: string;
  inherentLikelihood: number;
  inherentImpact: number;
  residualLikelihood: number;
  residualImpact: number;
  controlEffectiveness?: string;
  riskAppetite?: string;
  directionOfTravel?: string;
  controls?: string[];
  monthHistory?: { date: string; colour: string }[];
}

/** Map a residual RAG colour to representative likelihood × impact scores */
function colourToScores(colour: string): { likelihood: number; impact: number } {
  switch (colour) {
    case "GREEN":  return { likelihood: 1, impact: 2 };  // score 2 (Low)
    case "YELLOW": return { likelihood: 3, impact: 3 };  // score 9 (Medium)
    case "AMBER":  return { likelihood: 4, impact: 4 };  // score 16 (High)
    case "RED":    return { likelihood: 5, impact: 5 };  // score 25 (Very High)
    default:       return { likelihood: 3, impact: 3 };
  }
}

const VALID_CONTROL_EFFECTIVENESS = ["EFFECTIVE", "PARTIALLY_EFFECTIVE", "INEFFECTIVE"];
const VALID_RISK_APPETITE = ["VERY_LOW", "LOW", "LOW_TO_MODERATE", "MODERATE", "HIGH"];
const VALID_DIRECTION = ["IMPROVING", "STABLE", "DETERIORATING"];

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);

  // Only CCRO_TEAM can import risks
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "CCRO_TEAM") {
    return errorResponse("Only CCRO Team can import risks", 403);
  }

  const body = await request.json();
  const { rows, preview } = body as { rows: ImportRow[]; preview?: boolean };

  if (!Array.isArray(rows) || rows.length === 0) {
    return errorResponse("No rows provided");
  }

  // Pre-load users for owner resolution
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });
  const userByName = new Map(allUsers.map((u) => [u.name.toLowerCase(), u]));
  const userByEmail = new Map(allUsers.map((u) => [u.email.toLowerCase(), u]));

  // Pre-load risk categories for validation
  const categories = await prisma.riskCategory.findMany();
  const l1Names = new Set(categories.filter((c) => c.level === 1).map((c) => c.name.toLowerCase()));
  const l2ByParent = new Map<string, Set<string>>();
  for (const c of categories.filter((c) => c.level === 2)) {
    const parent = categories.find((p) => p.id === c.parentId);
    if (parent) {
      const key = parent.name.toLowerCase();
      if (!l2ByParent.has(key)) l2ByParent.set(key, new Set());
      l2ByParent.get(key)!.add(c.name.toLowerCase());
    }
  }

  // Validate all rows
  const results: Array<{
    rowIndex: number;
    errors: string[];
    risk?: { name: string; categoryL1: string; categoryL2: string; owner: string; inherentScore: number; residualScore: number; controlCount: number; monthCount: number };
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    if (!row.name) errors.push("Missing name");
    if (!row.description) errors.push("Missing description");

    // Validate category L1
    if (!row.categoryL1) {
      errors.push("Missing Category L1");
    } else if (!l1Names.has(row.categoryL1.toLowerCase())) {
      // Try partial match
      const match = Array.from(l1Names).find((n) => n.includes(row.categoryL1.toLowerCase()));
      if (!match) errors.push(`Unknown Category L1: ${row.categoryL1}`);
    }

    // Validate category L2
    if (!row.categoryL2) {
      errors.push("Missing Category L2");
    } else if (row.categoryL1) {
      const l1Key = row.categoryL1.toLowerCase();
      const l2Set = l2ByParent.get(l1Key) ||
        l2ByParent.get(Array.from(l1Names).find((n) => n.includes(l1Key)) ?? "");
      if (l2Set && !l2Set.has(row.categoryL2.toLowerCase())) {
        const match = Array.from(l2Set).find((n) => n.includes(row.categoryL2.toLowerCase()));
        if (!match) errors.push(`Unknown Category L2: ${row.categoryL2} (for ${row.categoryL1})`);
      }
    }

    // Resolve owner
    let resolvedOwner = "";
    if (!row.owner) {
      errors.push("Missing owner");
    } else {
      const ownerUser = userByName.get(row.owner.toLowerCase()) ||
                        userByEmail.get(row.owner.toLowerCase());
      if (!ownerUser) {
        errors.push(`User not found: ${row.owner}`);
      } else {
        resolvedOwner = ownerUser.name;
      }
    }

    // Validate scores
    const validateScore = (val: number, field: string) => {
      if (!val || val < 1 || val > 5) errors.push(`${field} must be 1-5`);
    };
    validateScore(row.inherentLikelihood, "Inherent Likelihood");
    validateScore(row.inherentImpact, "Inherent Impact");
    validateScore(row.residualLikelihood, "Residual Likelihood");
    validateScore(row.residualImpact, "Residual Impact");

    // Optional enum validations
    if (row.controlEffectiveness && !VALID_CONTROL_EFFECTIVENESS.includes(row.controlEffectiveness)) {
      errors.push(`Invalid control effectiveness: ${row.controlEffectiveness}`);
    }
    if (row.riskAppetite && !VALID_RISK_APPETITE.includes(row.riskAppetite)) {
      errors.push(`Invalid risk appetite: ${row.riskAppetite}`);
    }
    if (row.directionOfTravel && !VALID_DIRECTION.includes(row.directionOfTravel)) {
      errors.push(`Invalid direction of travel: ${row.directionOfTravel}`);
    }

    results.push({
      rowIndex: i,
      errors,
      risk: errors.length === 0 ? {
        name: row.name,
        categoryL1: row.categoryL1,
        categoryL2: row.categoryL2,
        owner: resolvedOwner,
        inherentScore: row.inherentLikelihood * row.inherentImpact,
        residualScore: row.residualLikelihood * row.residualImpact,
        controlCount: row.controls?.length ?? 0,
        monthCount: row.monthHistory?.length ?? 0,
      } : undefined,
    });
  }

  // Preview mode — return validation results without committing
  if (preview) {
    return jsonResponse({ preview: true, results });
  }

  // Commit — create risks
  let createdCount = 0;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = results[i];
    if (result.errors.length > 0) continue;

    // Resolve owner ID
    const ownerUser = userByName.get(row.owner.toLowerCase()) ||
                      userByEmail.get(row.owner.toLowerCase());
    if (!ownerUser) continue;

    // Resolve exact category names (case-correct)
    const exactL1 = categories.find((c) => c.level === 1 && c.name.toLowerCase() === row.categoryL1.toLowerCase())?.name ||
      categories.find((c) => c.level === 1 && c.name.toLowerCase().includes(row.categoryL1.toLowerCase()))?.name ||
      row.categoryL1;

    const exactL2 = categories.find((c) => c.level === 2 && c.name.toLowerCase() === row.categoryL2.toLowerCase())?.name ||
      categories.find((c) => c.level === 2 && c.name.toLowerCase().includes(row.categoryL2.toLowerCase()))?.name ||
      row.categoryL2;

    const reference = await generateReference("R", "risk");

    const risk = await prisma.risk.create({
      data: {
        reference,
        name: row.name,
        description: row.description,
        categoryL1: exactL1,
        categoryL2: exactL2,
        ownerId: ownerUser.id,
        inherentLikelihood: row.inherentLikelihood,
        inherentImpact: row.inherentImpact,
        residualLikelihood: row.residualLikelihood,
        residualImpact: row.residualImpact,
        controlEffectiveness: (row.controlEffectiveness as "EFFECTIVE" | "PARTIALLY_EFFECTIVE" | "INEFFECTIVE") ?? null,
        riskAppetite: (row.riskAppetite as "VERY_LOW" | "LOW" | "LOW_TO_MODERATE" | "MODERATE" | "HIGH") ?? null,
        directionOfTravel: (row.directionOfTravel as "IMPROVING" | "STABLE" | "DETERIORATING") ?? "STABLE",
        lastReviewed: now,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Create controls (pipe-separated from CSV)
    if (row.controls && row.controls.length > 0) {
      await Promise.all(
        row.controls.map((desc, idx) =>
          prisma.riskControl.create({
            data: {
              riskId: risk.id,
              description: desc,
              sortOrder: idx,
            },
          }).catch((e) => console.error("[risk control]", e))
        )
      );
    }

    // Create month history snapshots (12-month rolling RAG colours)
    if (row.monthHistory && row.monthHistory.length > 0) {
      for (const entry of row.monthHistory) {
        const monthDate = new Date(entry.date);
        const scores = colourToScores(entry.colour);
        await prisma.riskSnapshot.upsert({
          where: { riskId_month: { riskId: risk.id, month: monthDate } },
          update: {
            residualLikelihood: scores.likelihood,
            residualImpact: scores.impact,
            inherentLikelihood: risk.inherentLikelihood,
            inherentImpact: risk.inherentImpact,
            directionOfTravel: risk.directionOfTravel,
          },
          create: {
            riskId: risk.id,
            month: monthDate,
            residualLikelihood: scores.likelihood,
            residualImpact: scores.impact,
            inherentLikelihood: risk.inherentLikelihood,
            inherentImpact: risk.inherentImpact,
            directionOfTravel: risk.directionOfTravel,
          },
        }).catch((e) => console.error("[risk snapshot history]", e));
      }
    }

    // Create current-month snapshot
    await prisma.riskSnapshot.upsert({
      where: { riskId_month: { riskId: risk.id, month: monthStart } },
      update: {
        residualLikelihood: risk.residualLikelihood,
        residualImpact: risk.residualImpact,
        inherentLikelihood: risk.inherentLikelihood,
        inherentImpact: risk.inherentImpact,
        directionOfTravel: risk.directionOfTravel,
      },
      create: {
        riskId: risk.id,
        month: monthStart,
        residualLikelihood: risk.residualLikelihood,
        residualImpact: risk.residualImpact,
        inherentLikelihood: risk.inherentLikelihood,
        inherentImpact: risk.inherentImpact,
        directionOfTravel: risk.directionOfTravel,
      },
    }).catch((e) => console.error("[risk snapshot]", e));

    // Audit log
    await prisma.riskAuditLog.create({
      data: { riskId: risk.id, userId, action: "created_via_import", fieldChanged: null, oldValue: null, newValue: risk.name },
    }).catch((e) => console.error("[risk audit]", e));

    createdCount++;
  }

  // Global audit log
  await prisma.auditLog.create({
    data: {
      userId,
      userRole: user.role,
      action: "import_risks",
      entityType: "risk",
      changes: { rowCount: rows.length, createdCount },
    },
  });

  return jsonResponse(serialiseDates({ committed: true, createdCount, results }));
}
