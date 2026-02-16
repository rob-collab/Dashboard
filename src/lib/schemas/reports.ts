import { z } from "zod";

export const ReportStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const CreateReportSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  period: z.string().min(1, "Period is required"),
  status: ReportStatus.optional().default("DRAFT"),
});

export const UpdateReportSchema = z.object({
  title: z.string().min(1).optional(),
  period: z.string().optional(),
  status: ReportStatus.optional(),
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type UpdateReportInput = z.infer<typeof UpdateReportSchema>;
