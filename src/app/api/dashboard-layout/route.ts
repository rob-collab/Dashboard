import { NextRequest } from "next/server";
import { prisma, requireCCRORole, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";
import { DEFAULT_SECTION_ORDER } from "@/lib/dashboard-sections";

const DEFAULT_LAYOUT = {
  id: "singleton",
  sectionOrder: DEFAULT_SECTION_ORDER,
  hiddenSections: [] as string[],
  configuredById: null,
  createdAt: null,
  updatedAt: null,
};

/** GET — Returns the dashboard layout (or defaults). No auth gate — all users read. */
export async function GET() {
  try {
    const layout = await prisma.dashboardLayout.findUnique({
      where: { id: "singleton" },
    });
    return jsonResponse(layout ? serialiseDates(layout) : DEFAULT_LAYOUT);
  } catch (err) {
    console.error("[GET /api/dashboard-layout]", err);
    return errorResponse("Failed to fetch dashboard layout", 500);
  }
}

/** PUT — Upsert dashboard layout. CCRO only. */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const body = await request.json();
    const { sectionOrder, hiddenSections } = body;

    if (!Array.isArray(sectionOrder) || !sectionOrder.every((s: unknown) => typeof s === "string")) {
      return errorResponse("sectionOrder must be a string array", 400);
    }
    if (!Array.isArray(hiddenSections) || !hiddenSections.every((s: unknown) => typeof s === "string")) {
      return errorResponse("hiddenSections must be a string array", 400);
    }

    const layout = await prisma.dashboardLayout.upsert({
      where: { id: "singleton" },
      update: {
        sectionOrder,
        hiddenSections,
        configuredById: userId,
      },
      create: {
        id: "singleton",
        sectionOrder,
        hiddenSections,
        configuredById: userId,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        userRole: "CCRO_TEAM",
        action: "update_dashboard_layout",
        entityType: "dashboard_layout",
        entityId: "singleton",
        changes: { sectionOrder, hiddenSections },
      },
    }).catch(() => {}); // Non-critical — don't fail if audit log errors

    return jsonResponse(serialiseDates(layout));
  } catch (err) {
    console.error("[PUT /api/dashboard-layout]", err);
    return errorResponse("Failed to update dashboard layout", 500);
  }
}
