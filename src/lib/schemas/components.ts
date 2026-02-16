import { z } from "zod";

export const CreateComponentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  htmlContent: z.string().min(1, "HTML content is required"),
  category: z.string().optional().default("General"),
});

export const UpdateComponentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  htmlContent: z.string().optional(),
  category: z.string().optional(),
});

export type CreateComponentInput = z.infer<typeof CreateComponentSchema>;
export type UpdateComponentInput = z.infer<typeof UpdateComponentSchema>;
