import { NextRequest } from "next/server";
import { prisma, requireCCRORole, getUserId, getViewAsUserId, jsonResponse, errorResponse, auditLog } from "@/lib/api-helpers";
import { Prisma } from "@/generated/prisma";
import { serialiseDates } from "@/lib/serialise";
import { DEFAULT_SECTION_ORDER } from "@/lib/dashboard-sections";
import type { RGLLayoutItem } from "@/lib/types";

function defaultLayout(userId: string) {
  return {
    id: "",
    userId,
    sectionOrder: DEFAULT_SECTION_ORDER,
    hiddenSections: [] as string[],
    layoutGrid: null,
    pinnedSections: [] as string[],
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
 * PUT — Upsert a per-user dashboard layout.
 * - Any authenticated user can update their own layout (self-edit)
 * - CCRO required to update another user's layout
 * - Only CCRO can set pinnedSections
 * Body: { userId, sectionOrder, hiddenSections, layoutGrid?, pinnedSections? }
 */
export async function PUT(request: NextRequest) {
  try {
    const callerUserId = getUserId(request);
    if (!callerUserId) {
      return errorResponse("Unauthorised", 401);
    }

    const body = await request.json();
    const { userId: targetUserId, sectionOrder, hiddenSections, layoutGrid, pinnedSections } = body;

    if (!targetUserId || typeof targetUserId !== "string") {
      return errorResponse("userId is required", 400);
    }
    if (!Array.isArray(sectionOrder) || !sectionOrder.every((s: unknown) => typeof s === "string")) {
      return errorResponse("sectionOrder must be a string array", 400);
    }
    if (!Array.isArray(hiddenSections) || !hiddenSections.every((s: unknown) => typeof s === "string")) {
      return errorResponse("hiddenSections must be a string array", 400);
    }

    const isSelfEdit = targetUserId === callerUserId;

    // Check CCRO status once — needed for cross-user editing and pinnedSections
    const ccroCheck = await requireCCRORole(request);
    const isCCRO = !("error" in ccroCheck);

    // Non-CCRO cannot edit another user's layout
    if (!isSelfEdit && !isCCRO) {
      return errorResponse("Forbidden: CCRO role required to configure another user's layout", 403);
    }

    // Only CCRO can set pinnedSections; non-CCRO submits are silently ignored
    const resolvedPinned: string[] =
      isCCRO && Array.isArray(pinnedSections) && pinnedSections.every((s: unknown) => typeof s === "string")
        ? (pinnedSections as string[])
        : [];

    // Validate layoutGrid shape if provided
    let resolvedGrid: RGLLayoutItem[] | null = null;
    if (layoutGrid !== undefined && layoutGrid !== null) {
      if (!Array.isArray(layoutGrid)) {
        return errorResponse("layoutGrid must be an array", 400);
      }
      resolvedGrid = layoutGrid as RGLLayoutItem[];
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true },
    });
    if (!targetUser) {
      return errorResponse("Target user not found", 404);
    }

    const updateData: Record<string, unknown> = {
      sectionOrder,
      hiddenSections,
      configuredById: callerUserId,
    };
    if (resolvedGrid !== null) updateData.layoutGrid = resolvedGrid;
    // Always write pinnedSections in update — non-CCRO gets empty array (no change to existing pins)
    // Only override stored pinnedSections when caller is CCRO (resolvedPinned is non-empty or CCRO explicitly sent [])
    if (isCCRO) updateData.pinnedSections = resolvedPinned;

    const layout = await prisma.dashboardLayout.upsert({
      where: { userId: targetUserId },
      update: updateData,
      create: {
        userId: targetUserId,
        sectionOrder,
        hiddenSections,
        layoutGrid: resolvedGrid != null ? (resolvedGrid as unknown as Prisma.InputJsonValue) : undefined,
        pinnedSections: resolvedPinned,
        configuredById: callerUserId,
      },
    });

    // Audit log
    auditLog({
      userId: callerUserId,
      userRole: isCCRO ? "CCRO_TEAM" : "VIEWER",
      action: "update_dashboard_layout",
      entityType: "dashboard_layout",
      entityId: layout.id,
      changes: {
        targetUserId,
        targetUserName: targetUser.name,
        sectionOrder,
        hiddenSections,
        hasLayoutGrid: resolvedGrid !== null,
        pinnedSections: resolvedPinned,
      },
    });

    return jsonResponse(serialiseDates(layout));
  } catch (err) {
    console.error("[PUT /api/dashboard-layout]", err);
    return errorResponse("Failed to update dashboard layout", 500);
  }
}
