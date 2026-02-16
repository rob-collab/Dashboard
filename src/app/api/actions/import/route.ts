import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

interface ImportRow {
  actionId: string;
  title?: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  status?: string;
}

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE"];

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return errorResponse("Unauthorised", 401);

  // Only CCRO_TEAM can import
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "CCRO_TEAM") {
    return errorResponse("Only CCRO Team can import actions", 403);
  }

  const body = await request.json();
  const { rows, preview } = body as { rows: ImportRow[]; preview?: boolean };

  if (!Array.isArray(rows) || rows.length === 0) {
    return errorResponse("No rows provided");
  }

  // Validate all rows
  const results: Array<{
    rowIndex: number;
    actionId: string;
    changes: Array<{ field: string; oldValue: string; newValue: string }>;
    errors: string[];
  }> = [];

  // Batch load all users upfront to avoid N+1 queries
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });
  const userByName = new Map(
    allUsers.map((u) => [u.name.toLowerCase(), u])
  );
  const userByEmail = new Map(
    allUsers.map((u) => [u.email.toLowerCase(), u])
  );

  // Batch load all actions upfront
  const actionIds = rows.map((r) => r.actionId).filter(Boolean);
  const actions = await prisma.action.findMany({
    where: { id: { in: actionIds } },
    include: { assignee: true },
  });
  const actionMap = new Map(actions.map((a) => [a.id, a]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    if (!row.actionId) {
      errors.push("Missing actionId");
      results.push({ rowIndex: i, actionId: "", changes: [], errors });
      continue;
    }

    const action = actionMap.get(row.actionId);

    if (!action) {
      errors.push(`Action not found: ${row.actionId}`);
      results.push({ rowIndex: i, actionId: row.actionId, changes: [], errors });
      continue;
    }

    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

    if (row.title && row.title !== action.title) {
      changes.push({ field: "title", oldValue: action.title, newValue: row.title });
    }
    if (row.description !== undefined && row.description !== action.description) {
      changes.push({ field: "description", oldValue: action.description, newValue: row.description });
    }
    if (row.status) {
      const upper = row.status.toUpperCase().replace(/ /g, "_");
      if (!VALID_STATUSES.includes(upper)) {
        errors.push(`Invalid status: ${row.status}`);
      } else if (upper !== action.status) {
        changes.push({ field: "status", oldValue: action.status, newValue: upper });
      }
    }
    if (row.assignedTo) {
      // Lookup user from pre-loaded map
      const assignee = userByName.get(row.assignedTo.toLowerCase()) ||
                       userByEmail.get(row.assignedTo.toLowerCase());
      if (!assignee) {
        errors.push(`User not found: ${row.assignedTo}`);
      } else if (assignee.id !== action.assignedTo) {
        changes.push({
          field: "assignedTo",
          oldValue: action.assignee?.name ?? action.assignedTo,
          newValue: assignee.name,
        });
      }
    }
    if (row.dueDate) {
      const parsed = new Date(row.dueDate);
      if (isNaN(parsed.getTime())) {
        errors.push(`Invalid date: ${row.dueDate}`);
      } else {
        const existing = action.dueDate?.toISOString().split("T")[0] ?? "";
        const newDate = parsed.toISOString().split("T")[0];
        if (existing !== newDate) {
          changes.push({ field: "dueDate", oldValue: existing, newValue: newDate });
        }
      }
    }

    results.push({ rowIndex: i, actionId: row.actionId, changes, errors });
  }

  // Preview mode — return diff without committing
  if (preview) {
    return jsonResponse({ preview: true, results });
  }

  // Commit changes
  let updatedCount = 0;
  for (const result of results) {
    if (result.errors.length > 0 || result.changes.length === 0) continue;

    const updateData: Record<string, unknown> = {};
    for (const change of result.changes) {
      if (change.field === "dueDate") {
        updateData.dueDate = new Date(change.newValue);
      } else if (change.field === "assignedTo") {
        const assignee = await prisma.user.findFirst({
          where: { name: { equals: change.newValue, mode: "insensitive" } },
        });
        if (assignee) updateData.assignedTo = assignee.id;
      } else if (change.field === "status") {
        updateData.status = change.newValue;
        if (change.newValue === "COMPLETED") updateData.completedAt = new Date();
      } else {
        updateData[change.field] = change.newValue;
      }
    }

    await prisma.action.update({
      where: { id: result.actionId },
      data: updateData,
    });
    updatedCount++;
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      userRole: user.role,
      action: "import_actions",
      entityType: "action",
      changes: { rowCount: rows.length, updatedCount },
    },
  });

  return jsonResponse(serialiseDates({ committed: true, updatedCount, results }));
}
