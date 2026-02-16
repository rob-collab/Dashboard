/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Recursively convert Date objects to ISO strings so API responses
 * match the existing TypeScript interfaces (which use `string` for dates).
 */
export function serialiseDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString() as unknown as T;
  if (Array.isArray(obj)) return obj.map(serialiseDates) as unknown as T;
  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      result[key] = serialiseDates(value);
    }
    return result as T;
  }
  return obj;
}
