import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, requireCCRORole } from "@/lib/api-helpers";
import { sendUserInvite } from "@/lib/email";

function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    const [targetUser, senderUser] = await Promise.all([
      prisma.user.findUnique({ where: { id } }),
      prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } }),
    ]);

    if (!targetUser) return errorResponse("User not found", 404);

    const result = await sendUserInvite({
      recipientName: targetUser.name,
      recipientEmail: targetUser.email,
      senderName: senderUser?.name ?? "The CCRO Team",
      appUrl: appUrl(),
    });

    if (!result.success) {
      return errorResponse(result.error ?? "Failed to send invitation email", 500);
    }

    return jsonResponse({ sent: true });
  } catch (err) {
    console.error("[POST /api/users/:id/invite]", err);
    return errorResponse("Internal server error", 500);
  }
}
