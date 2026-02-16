import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.string().optional().default("1").transform(Number),
  limit: z.string().optional().default("50").transform(Number),
});

export function getPaginationParams(searchParams: URLSearchParams) {
  const validation = PaginationQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!validation.success) {
    return { page: 1, limit: 50 };
  }

  const { page, limit } = validation.data;
  const clampedLimit = Math.min(Math.max(limit, 1), 500); // Between 1 and 500
  const clampedPage = Math.max(page, 1);
  const skip = (clampedPage - 1) * clampedLimit;

  return {
    page: clampedPage,
    limit: clampedLimit,
    skip,
    take: clampedLimit,
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

export type PaginatedResponse<T> = ReturnType<typeof paginatedResponse<T>>;
