import { z } from "zod";

export const SectionType = z.enum([
  "TEXT_BLOCK",
  "DATA_TABLE",
  "CONSUMER_DUTY_DASHBOARD",
  "CHART",
  "CARD_GRID",
  "IMPORTED_COMPONENT",
  "TEMPLATE_INSTANCE",
  "ACCORDION",
  "IMAGE_BLOCK",
]);

export const CreateTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  category: z.string().optional().default("General"),
  thumbnailUrl: z.string().nullable().optional(),
  layoutConfig: z.any().optional().default({}), // JSON field
  styleConfig: z.any().optional().default({}), // JSON field
  contentSchema: z.any().optional().default([]), // JSON field
  sectionType: SectionType.optional().default("TEXT_BLOCK"),
  isGlobal: z.boolean().optional().default(false),
  version: z.number().optional().default(1),
});

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  layoutConfig: z.any().optional(), // JSON field
  styleConfig: z.any().optional(), // JSON field
  contentSchema: z.any().optional(), // JSON field
  sectionType: SectionType.optional(),
  isGlobal: z.boolean().optional(),
  version: z.number().optional(),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
