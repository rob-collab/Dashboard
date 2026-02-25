import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody, auditLog } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

const CATEGORIES = ["PEOPLE", "PROCESSES", "TECHNOLOGY", "FACILITIES", "INFORMATION"] as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const maps = await prisma.iBSResourceMap.findMany({
      where: { ibsId: id },
      orderBy: { category: "asc" },
    });
    // Return all 5 categories, initialising missing ones with empty content
    const result = CATEGORIES.map((cat) => {
      const existing = maps.find((m) => m.category === cat);
      return existing ?? { id: null, ibsId: id, category: cat, content: {}, lastUpdatedAt: null, lastUpdatedBy: null };
    });
    return jsonResponse(serialiseDates(result));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch resource maps", 500);
  }
}

const patchSchema = z.object({
  category: z.enum(CATEGORIES),
  content: z.record(z.string(), z.unknown()),
  lastUpdatedBy: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const validated = validateBody(patchSchema, body);
  if ("error" in validated) return validated.error;

  try {
    const map = await prisma.iBSResourceMap.upsert({
      where: { ibsId_category: { ibsId: id, category: validated.data.category } },
      create: {
        ibsId: id,
        category: validated.data.category,
        content: validated.data.content as Prisma.InputJsonValue,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: validated.data.lastUpdatedBy ?? null,
      },
      update: {
        content: validated.data.content as Prisma.InputJsonValue,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: validated.data.lastUpdatedBy ?? null,
      },
    });
    auditLog({ userId: auth.userId, userRole: "CCRO_TEAM", action: "update_resource_map", entityType: "ibs_resource_map", entityId: id, changes: { category: validated.data.category } });
    return jsonResponse(serialiseDates(map));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to update resource map", 500);
  }
}
