import { NextResponse } from "next/server";
import { prisma } from "@/lib/api-helpers";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "(not set)";
  const directUrl = process.env.DIRECT_URL || "(not set)";

  // Mask password in URL for display
  const mask = (url: string) => url.replace(/:([^@]+)@/, ":***@");

  try {
    // Try a simple query
    const result = await prisma.$queryRawUnsafe("SELECT 1 as ok");
    return NextResponse.json({
      status: "connected",
      DATABASE_URL: mask(dbUrl),
      DIRECT_URL: mask(directUrl),
      query: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      status: "error",
      DATABASE_URL: mask(dbUrl),
      DIRECT_URL: mask(directUrl),
      error: message,
    }, { status: 500 });
  }
}
