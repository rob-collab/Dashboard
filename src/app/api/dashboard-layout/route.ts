import { NextRequest } from "next/server";
import { prisma, requireCCRORole, getViewAsUserId, jsonResponse, errorResponse, auditLog } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { DEFAULT_SECTION_ORDER } from "@/lib/dashboard-sections";

function defaultLayout(userId: string) {
  return {
    id: "",
    userId,
    sectionOrder: DEFAULT_SECTION_ORDER,
    hiddenSections: [] as string[],
    configuredById: null,
    createdAt: null,
    updatedAt: null,
  };
}

/**
 * GET — Returns a user's dashboard layout (or defaults).
 *
 * ?userId=xxx  → CCRO only: return that user's layout (for config UI)
 * no param     → return the current viewed user's own layout
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (targetUserId) {
      // CCRO only — fetching another user's layout for editing
      const auth = await requireCCRORole(request);
      if ("error" in auth) return auth.error;

      const layout = await prisma.dashboardLayout.findUnique({
        where: { userId: targetUserId },
      });
      return jsonResponse(layout ? serialiseDates(layout) : defaultLayout(targetUserId));
    }

    // Default: return the current viewed user's layout
    const viewUserId = getViewAsUserId(request);
    if (!viewUserId) {
      return jsonResponse(defaultLayout(""));
    }

    const layout = await prisma.dashboardLayout.findUnique({
      where: { userId: viewUserId },
    });
    return jsonResponse(layout ? serialiseDates(layout) : defaultLayout(viewUserId));
  } catch (err) {
    console.error("[GET /api/dashboard-layout]", err);
    return errorResponse("Failed to fetch dashboard layout", 500);
  }
}

/**
 * PUT — Upsert a per-user dashboard layout. CCRO only.
 * Body: { userId, sectionOrder, hiddenSections }
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const ccroUserId = auth.userId;

    const body = await request.json();
    const { userId: targetUserId, sectionOrder, hiddenSections } = body;

    if (!targetUserId || typeof targetUserId !== "string") {
      return errorResponse("userId is required", 400);
    }
    if (!Array.isArray(sectionOrder) || !sectionOrder.every((s: unknown) => typeof s === "string")) {
      return errorResponse("sectionOrder must be a string array", 400);
    }
    if (!Array.isArray(hiddenSections) || !hiddenSections.every((s: unknown) => typeof s === "string")) {
      return errorResponse("hiddenSections must be a string array", 400);
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true },
    });
    if (!targetUser) {
      return errorResponse("Target user not found", 404);
    }

    const layout = await prisma.dashboardLayout.upsert({
      where: { userId: targetUserId },
      update: {
        sectionOrder,
        hiddenSections,
        configuredById: ccroUserId,
      },
      create: {
        userId: targetUserId,
        sectionOrder,
        hiddenSections,
        configuredById: ccroUserId,
      },
    });

    // Audit log
    auditLog({
      userId: ccroUserId,
      userRole: "CCRO_TEAM",
      action: "update_dashboard_layout",
      entityType: "dashboard_layout",
      entityId: layout.id,
      changes: { targetUserId, targetUserName: targetUser.name, sectionOrder, hiddenSections },
    });

    return jsonResponse(serialiseDates(layout));
  } catch (err) {
    console.error("[PUT /api/dashboard-layout]", err);
    return errorResponse("Failed to update dashboard layout", 500);
  }
}
