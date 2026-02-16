import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  const components = await prisma.component.findMany({
    include: { creator: true },
    orderBy: { createdAt: "desc" },
  });
  return jsonResponse(serialiseDates(components));
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);
  const body = await request.json();
  const { name, htmlContent } = body;
  if (!name || !htmlContent) return errorResponse("name and htmlContent are required");

  const component = await prisma.component.create({
    data: {
      id: body.id || undefined,
      name,
      description: body.description ?? "",
      category: body.category ?? "General",
      htmlContent,
      cssContent: body.cssContent ?? null,
      jsContent: body.jsContent ?? null,
      version: body.version ?? "1.0",
      sanitized: body.sanitized ?? false,
      createdBy: userId,
    },
    include: { creator: true },
  });
  return jsonResponse(serialiseDates(component), 201);
}
