import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse, getUserId, generateReference } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

interface ImportRow {
  actionId: string;
  title?: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  source?: string;
}

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE", "PROPOSED_CLOSED"];
const VALID_PRIORITIES = ["P1", "P2", "P3"];

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

  // Batch load all actions upfront (for update rows)
  const actionIds = rows.map((r) => r.actionId).filter(Boolean);
  const actions = await prisma.action.findMany({
    where: { id: { in: actionIds } },
    include: { assignee: true },
  });
  const actionMap = new Map(actions.map((a) => [a.id, a]));

  // Validate all rows
  const results: Array<{
    rowIndex: number;
    actionId: string;
    mode: "create" | "update";
    changes: Array<{ field: string; oldValue: string; newValue: string }>;
    newAction?: { title: string; assignedTo: string; status: string; priority: string; dueDate: string };
    errors: string[];
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];
    const isCreate = !row.actionId;

    if (isCreate) {
      // ── CREATE mode ──
      if (!row.title) errors.push("Missing title (required for new actions)");
      if (!row.assignedTo) errors.push("Missing assignedTo (required for new actions)");

      // Resolve assignee
      let resolvedAssignee = "";
      if (row.assignedTo) {
        const assignee = userByName.get(row.assignedTo.toLowerCase()) ||
                         userByEmail.get(row.assignedTo.toLowerCase());
        if (!assignee) {
          errors.push(`User not found: ${row.assignedTo}`);
        } else {
          resolvedAssignee = assignee.name;
        }
      }

      if (row.status) {
        const upper = row.status.toUpperCase().replace(/ /g, "_");
        if (!VALID_STATUSES.includes(upper)) errors.push(`Invalid status: ${row.status}`);
      }

      if (row.priority) {
        const upper = row.priority.toUpperCase();
        if (!VALID_PRIORITIES.includes(upper)) errors.push(`Invalid priority: ${row.priority}`);
      }

      if (row.dueDate) {
        const parsed = new Date(row.dueDate);
        if (isNaN(parsed.getTime())) errors.push(`Invalid date: ${row.dueDate}`);
      }

      results.push({
        rowIndex: i,
        actionId: "",
        mode: "create",
        changes: [],
        newAction: errors.length === 0 ? {
          title: row.title ?? "",
          assignedTo: resolvedAssignee,
          status: row.status ? row.status.toUpperCase().replace(/ /g, "_") : "OPEN",
          priority: row.priority ? row.priority.toUpperCase() : "",
          dueDate: row.dueDate ?? "",
        } : undefined,
        errors,
      });
    } else {
      // ── UPDATE mode ──
      const action = actionMap.get(row.actionId);

      if (!action) {
        errors.push(`Action not found: ${row.actionId}`);
        results.push({ rowIndex: i, actionId: row.actionId, mode: "update", changes: [], errors });
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

      results.push({ rowIndex: i, actionId: row.actionId, mode: "update", changes, errors });
    }
  }

  // Preview mode — return diff without committing
  if (preview) {
    return jsonResponse({ preview: true, results });
  }

  // Commit changes
  let updatedCount = 0;
  let createdCount = 0;

  for (const result of results) {
    if (result.errors.length > 0) continue;

    if (result.mode === "create" && result.newAction) {
      // Resolve assignee ID
      const assignee = userByName.get(result.newAction.assignedTo.toLowerCase()) ||
                       userByEmail.get(result.newAction.assignedTo.toLowerCase());
      if (!assignee) continue;

      const reference = await generateReference("ACT-", "action");

      await prisma.action.create({
        data: {
          reference,
          title: result.newAction.title,
          description: "",
          status: result.newAction.status as "OPEN" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "PROPOSED_CLOSED",
          ...(result.newAction.priority && { priority: result.newAction.priority as "P1" | "P2" | "P3" }),
          assignedTo: assignee.id,
          createdBy: userId,
          ...(result.newAction.dueDate && { dueDate: new Date(result.newAction.dueDate) }),
        },
      });
      createdCount++;
    } else if (result.mode === "update" && result.changes.length > 0) {
      const updateData: Record<string, unknown> = {};
      for (const change of result.changes) {
        if (change.field === "dueDate") {
          updateData.dueDate = new Date(change.newValue);
        } else if (change.field === "assignedTo") {
          const assignee = userByName.get(change.newValue.toLowerCase()) ||
                           userByEmail.get(change.newValue.toLowerCase());
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
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      userRole: user.role,
      action: "import_actions",
      entityType: "action",
      changes: { rowCount: rows.length, createdCount, updatedCount },
    },
  });

  return jsonResponse(serialiseDates({ committed: true, createdCount, updatedCount, results }));
}
