import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const categories = await prisma.riskCategory.findMany({
      where: { level: 1 },
      include: {
        children: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    return jsonResponse(serialiseDates(categories));
  } catch (error) {
    console.error("[GET /api/risk-categories]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch risk categories",
      500,
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { id, name, definition } = body;

    if (!id) {
      return errorResponse("id is required", 400);
    }

    const updated = await prisma.riskCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(definition !== undefined && { definition }),
      },
    });

    return jsonResponse(serialiseDates(updated));
  } catch (error) {
    console.error("[PUT /api/risk-categories]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update category",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { parentId, name, definition } = body;

    if (!parentId || !name) {
      return errorResponse("parentId and name are required", 400);
    }

    // Verify parent exists and is L1
    const parent = await prisma.riskCategory.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      return errorResponse("Parent category not found", 404);
    }
    if (parent.level !== 1) {
      return errorResponse("Parent must be a Level 1 category", 400);
    }

    const category = await prisma.riskCategory.create({
      data: {
        level: 2,
        parentId,
        name,
        definition: definition ?? "",
      },
    });

    return jsonResponse(serialiseDates(category), 201);
  } catch (error) {
    console.error("[POST /api/risk-categories]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create category",
      500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("id query parameter is required", 400);
    }

    // Look up the category to get its name
    const category = await prisma.riskCategory.findUnique({
      where: { id },
    });
    if (!category) {
      return errorResponse("Category not found", 404);
    }

    // Check if any risks reference this category name (as L1 or L2)
    const referencingRisks = await prisma.risk.findFirst({
      where: {
        OR: [
          { categoryL1: category.name },
          { categoryL2: category.name },
        ],
      },
    });

    if (referencingRisks) {
      return errorResponse(
        `Cannot delete category "${category.name}" — it is referenced by one or more risks`,
        409,
      );
    }

    await prisma.riskCategory.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("[DELETE /api/risk-categories]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete category",
      500,
    );
  }
}
