import { z } from "zod";

export const UserRole = z.enum(["CCRO_TEAM", "CEO", "OWNER", "VIEWER"]);

export const CreateUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  role: UserRole.optional().default("VIEWER"),
  assignedMeasures: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: UserRole.optional(),
  assignedMeasures: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
