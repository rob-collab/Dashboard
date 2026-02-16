import { z } from "zod";

export const ActionStatus = z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE"]);

export const CreateActionSchema = z.object({
  id: z.string().optional(),
  reportId: z.string().min(1, "Report ID is required"),
  sectionId: z.string().nullable().optional(),
  sectionTitle: z.string().nullable().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  assignedTo: z.string().min(1, "Assignee is required"),
  dueDate: z.string().nullable().optional(),
  status: ActionStatus.optional().default("OPEN"),
});

export const UpdateActionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  status: ActionStatus.optional(),
  completedAt: z.string().nullable().optional(),
  sectionId: z.string().nullable().optional(),
  sectionTitle: z.string().nullable().optional(),
});

export const ActionQuerySchema = z.object({
  reportId: z.string().optional(),
  assignedTo: z.string().optional(),
  status: ActionStatus.optional(),
});

export type CreateActionInput = z.infer<typeof CreateActionSchema>;
export type UpdateActionInput = z.infer<typeof UpdateActionSchema>;
export type ActionQueryInput = z.infer<typeof ActionQuerySchema>;
