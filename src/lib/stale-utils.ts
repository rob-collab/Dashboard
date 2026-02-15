import type { ConsumerDutyMeasure, ConsumerDutyOutcome, ReportVersion } from "./types";

/**
 * Returns the most recent publish date for a report, or null if never published.
 */
export function getLastPublishDate(
  versions: ReportVersion[],
  reportId: string
): string | null {
  const reportVersions = versions
    .filter((v) => v.reportId === reportId)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return reportVersions[0]?.publishedAt ?? null;
}

/**
 * A measure is stale if its lastUpdatedAt is null or before the last publish date.
 */
export function isMeasureStale(
  measure: ConsumerDutyMeasure,
  lastPublishDate: string | null
): boolean {
  if (!lastPublishDate) return false; // never published — nothing is "stale"
  if (!measure.lastUpdatedAt) return true; // no update timestamp — consider stale
  return new Date(measure.lastUpdatedAt).getTime() < new Date(lastPublishDate).getTime();
}

/**
 * Returns all stale measures across all outcomes.
 */
export function getStaleMeasures(
  outcomes: ConsumerDutyOutcome[],
  lastPublishDate: string | null
): ConsumerDutyMeasure[] {
  if (!lastPublishDate) return [];
  return outcomes.flatMap((o) =>
    (o.measures ?? []).filter((m) => isMeasureStale(m, lastPublishDate))
  );
}

/**
 * True if any child measure of an outcome is stale.
 */
export function hasStaleChildren(
  outcome: ConsumerDutyOutcome,
  lastPublishDate: string | null
): boolean {
  if (!lastPublishDate) return false;
  return (outcome.measures ?? []).some((m) => isMeasureStale(m, lastPublishDate));
}
