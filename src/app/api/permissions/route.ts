import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, getUserId, errorResponse, jsonResponse, checkPermission, auditLog } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);

  const [rolePermissions, userPermissions] = await Promise.all([
    prisma.rolePermission.findMany({
      select: { role: true, permission: true, granted: true },
    }),
    prisma.userPermission.findMany({
      select: { userId: true, permission: true, granted: true },
    }),
  ]);

  return jsonResponse({ rolePermissions, userPermissions });
}

const putSchema = z.object({
  role: z.enum(["CCRO_TEAM", "CEO", "OWNER", "VIEWER"]),
  permissions: z.record(z.string(), z.boolean()),
});

export async function PUT(request: NextRequest) {
  const auth = await checkPermission(request, "can:manage-users");
  if (!auth.granted) return auth.error;

  const body = await request.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const { role, permissions } = parsed.data;

  // Upsert each permission
  const ops = Object.entries(permissions).map(([permission, granted]) =>
    prisma.rolePermission.upsert({
      where: { role_permission: { role: role as "CCRO_TEAM" | "CEO" | "OWNER" | "VIEWER", permission } },
      update: { granted: granted as boolean },
      create: { role: role as "CCRO_TEAM" | "CEO" | "OWNER" | "VIEWER", permission, granted: granted as boolean },
    })
  );

  await Promise.all(ops);

  // Audit: permission matrix changes are a compliance-critical event
  auditLog({
    userId: auth.userId,
    action: "update_role_permissions",
    entityType: "role_permission",
    entityId: role,
    changes: { role, permissions },
  });

  return jsonResponse({ ok: true });
}
