import { z } from "zod";

export const RAGStatus = z.enum(["GOOD", "WARNING", "HARM"]);

export const CreateOutcomeSchema = z.object({
  reportId: z.string().min(1),
  outcomeId: z.string().min(1, "Outcome ID is required"),
  name: z.string().min(1, "Name is required"),
  shortDesc: z.string(),
  icon: z.string().optional(),
  ragStatus: RAGStatus.optional().default("GOOD"),
  position: z.number().int().min(0).optional().default(0),
});

export const UpdateOutcomeSchema = z.object({
  name: z.string().min(1).optional(),
  shortDesc: z.string().optional(),
  detailedDescription: z.string().nullable().optional(),
  previousRAG: RAGStatus.nullable().optional(),
  monthlySummary: z.string().nullable().optional(),
  icon: z.string().optional(),
  ragStatus: RAGStatus.optional(),
  position: z.number().int().min(0).optional(),
});

export const CreateMeasureSchema = z.object({
  outcomeId: z.string().min(1, "Outcome ID is required"),
  measureId: z.string().min(1, "Measure ID is required"),
  name: z.string().min(1, "Name is required"),
  owner: z.string().nullable().optional(),
  summary: z.string().optional().default(""),
  ragStatus: RAGStatus.optional().default("GOOD"),
  position: z.number().int().min(0).optional().default(0),
});

export const UpdateMeasureSchema = z.object({
  name: z.string().min(1).optional(),
  owner: z.string().nullable().optional(),
  summary: z.string().optional(),
  ragStatus: RAGStatus.optional(),
  position: z.number().int().min(0).optional(),
  lastUpdatedAt: z.string().optional(),
});

export const CreateMISchema = z.object({
  measureId: z.string().min(1),
  metric: z.string().min(1, "Metric name is required"),
  current: z.string(),
  previous: z.string().optional().default(""),
  change: z.string().optional().default(""),
  ragStatus: RAGStatus.optional().default("GOOD"),
  appetite: z.string().nullable().optional(),
  appetiteOperator: z.string().nullable().optional(),
});

export const UpdateMISchema = z.object({
  metric: z.string().optional(),
  current: z.string().optional(),
  previous: z.string().optional(),
  change: z.string().optional(),
  ragStatus: RAGStatus.optional(),
  appetite: z.string().nullable().optional(),
  appetiteOperator: z.string().nullable().optional(),
});

export type CreateOutcomeInput = z.infer<typeof CreateOutcomeSchema>;
export type UpdateOutcomeInput = z.infer<typeof UpdateOutcomeSchema>;
export type CreateMeasureInput = z.infer<typeof CreateMeasureSchema>;
export type UpdateMeasureInput = z.infer<typeof UpdateMeasureSchema>;
export type CreateMIInput = z.infer<typeof CreateMISchema>;
export type UpdateMIInput = z.infer<typeof UpdateMISchema>;
