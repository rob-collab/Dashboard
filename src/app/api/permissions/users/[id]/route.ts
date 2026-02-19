import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, errorResponse, jsonResponse, checkPermission } from "@/lib/api-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const perms = await prisma.userPermission.findMany({
    where: { userId: id },
    select: { userId: true, permission: true, granted: true },
  });

  return jsonResponse(perms);
}

const putSchema = z.object({
  permissions: z.record(z.string(), z.boolean().nullable()),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkPermission(request, "can:manage-users");
  if (!auth.granted) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const { permissions } = parsed.data;

  const ops = Object.entries(permissions).map(([permission, granted]) => {
    if (granted === null) {
      // Remove override — inherit from role
      return prisma.userPermission.deleteMany({ where: { userId: id, permission } });
    }
    return prisma.userPermission.upsert({
      where: { userId_permission: { userId: id, permission } },
      update: { granted: granted as boolean },
      create: { userId: id, permission, granted: granted as boolean },
    });
  });

  await Promise.all(ops);

  return jsonResponse({ ok: true });
}
