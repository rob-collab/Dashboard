import { z } from "zod";
import { prisma, requireCCRORole, jsonResponse, errorResponse, validateBody } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export async function GET() {
  try {
    const events = await prisma.regulatoryEvent.findMany({
      orderBy: { eventDate: "asc" },
    });
    return jsonResponse(serialiseDates(events));
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to fetch regulatory calendar", 500);
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  eventDate: z.string().min(1),
  type: z.enum(["DEADLINE", "REVIEW", "SUBMISSION", "CONSULTATION", "INTERNAL_DEADLINE"]),
  source: z.string().min(1),
  url: z.string().optional().nullable(),
  alertDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(request: Request) {
  const auth = await requireCCRORole(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const validated = validateBody(createSchema, body);
  if ("error" in validated) return validated.error;

  try {
    const event = await prisma.regulatoryEvent.create({
      data: {
        title: validated.data.title,
        description: validated.data.description ?? null,
        eventDate: new Date(validated.data.eventDate),
        type: validated.data.type,
        source: validated.data.source,
        url: validated.data.url ?? null,
        alertDays: validated.data.alertDays ?? 30,
      },
    });
    return jsonResponse(serialiseDates(event), 201);
  } catch (e) {
    console.error(e);
    return errorResponse("Failed to create regulatory event", 500);
  }
}
