import { describe, it, expect } from "vitest";
import {
  getLastPublishDate,
  isMeasureStale,
  getStaleMeasures,
  hasStaleChildren,
} from "@/lib/stale-utils";
import type {
  ConsumerDutyMeasure,
  ConsumerDutyOutcome,
  ReportVersion,
} from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeVersion(reportId: string, publishedAt: string): ReportVersion {
  return { id: `v-${publishedAt}`, reportId, publishedAt } as unknown as ReportVersion;
}

function makeMeasure(lastUpdatedAt: string | null, overrides: Partial<ConsumerDutyMeasure> = {}): ConsumerDutyMeasure {
  return {
    id: "m-1",
    name: "Test measure",
    lastUpdatedAt,
    ragStatus: "GOOD",
    ...overrides,
  } as unknown as ConsumerDutyMeasure;
}

function makeOutcome(measures: ConsumerDutyMeasure[]): ConsumerDutyOutcome {
  return {
    id: "o-1",
    name: "Test outcome",
    measures,
  } as unknown as ConsumerDutyOutcome;
}

// ── getLastPublishDate ────────────────────────────────────────────────────────

describe("getLastPublishDate", () => {
  it("returns null when versions array is empty", () => {
    expect(getLastPublishDate([], "report-1")).toBeNull();
  });

  it("returns null when no versions match the reportId", () => {
    const versions = [makeVersion("report-2", "2025-06-01T00:00:00Z")];
    expect(getLastPublishDate(versions, "report-1")).toBeNull();
  });

  it("returns the publishedAt for a single matching version", () => {
    const versions = [makeVersion("report-1", "2025-06-01T00:00:00Z")];
    expect(getLastPublishDate(versions, "report-1")).toBe("2025-06-01T00:00:00Z");
  });

  it("returns the most recent publishedAt when multiple versions exist", () => {
    const versions = [
      makeVersion("report-1", "2025-01-01T00:00:00Z"),
      makeVersion("report-1", "2025-06-01T00:00:00Z"),
      makeVersion("report-1", "2025-03-15T00:00:00Z"),
    ];
    expect(getLastPublishDate(versions, "report-1")).toBe("2025-06-01T00:00:00Z");
  });

  it("ignores versions for other reports", () => {
    const versions = [
      makeVersion("report-1", "2025-01-01T00:00:00Z"),
      makeVersion("report-2", "2025-12-01T00:00:00Z"), // different report, more recent
    ];
    expect(getLastPublishDate(versions, "report-1")).toBe("2025-01-01T00:00:00Z");
  });

  it("handles a single version correctly (no sort edge case)", () => {
    const versions = [makeVersion("report-1", "2024-12-31T23:59:59Z")];
    expect(getLastPublishDate(versions, "report-1")).toBe("2024-12-31T23:59:59Z");
  });
});

// ── isMeasureStale ────────────────────────────────────────────────────────────

describe("isMeasureStale", () => {
  it("returns false when lastPublishDate is null (never published)", () => {
    const measure = makeMeasure("2025-01-01T00:00:00Z");
    expect(isMeasureStale(measure, null)).toBe(false);
  });

  it("returns true when measure has no lastUpdatedAt", () => {
    const measure = makeMeasure(null);
    expect(isMeasureStale(measure, "2025-06-01T00:00:00Z")).toBe(true);
  });

  it("returns true when measure was last updated before publish date", () => {
    const measure = makeMeasure("2025-01-01T00:00:00Z");
    expect(isMeasureStale(measure, "2025-06-01T00:00:00Z")).toBe(true);
  });

  it("returns false when measure was last updated after publish date", () => {
    const measure = makeMeasure("2025-07-01T00:00:00Z");
    expect(isMeasureStale(measure, "2025-06-01T00:00:00Z")).toBe(false);
  });

  it("returns false when measure was last updated on the exact publish date", () => {
    // Not strictly less-than, so same timestamp = not stale
    const date = "2025-06-01T00:00:00Z";
    const measure = makeMeasure(date);
    expect(isMeasureStale(measure, date)).toBe(false);
  });

  it("is sensitive to time within the same day", () => {
    const measure = makeMeasure("2025-06-01T08:00:00Z");
    // Published at noon — measure updated at 8am is before noon → stale
    expect(isMeasureStale(measure, "2025-06-01T12:00:00Z")).toBe(true);
    // Published at 6am — measure updated at 8am is after 6am → not stale
    expect(isMeasureStale(measure, "2025-06-01T06:00:00Z")).toBe(false);
  });
});

// ── getStaleMeasures ──────────────────────────────────────────────────────────

describe("getStaleMeasures", () => {
  it("returns empty array when lastPublishDate is null", () => {
    const outcomes = [makeOutcome([makeMeasure(null)])];
    expect(getStaleMeasures(outcomes, null)).toEqual([]);
  });

  it("returns empty array when outcomes array is empty", () => {
    expect(getStaleMeasures([], "2025-06-01T00:00:00Z")).toEqual([]);
  });

  it("returns empty array when all measures are up-to-date", () => {
    const outcomes = [
      makeOutcome([
        makeMeasure("2025-07-01T00:00:00Z"),
        makeMeasure("2025-08-01T00:00:00Z"),
      ]),
    ];
    expect(getStaleMeasures(outcomes, "2025-06-01T00:00:00Z")).toHaveLength(0);
  });

  it("returns stale measures from a single outcome", () => {
    const staleMeasure = makeMeasure("2025-01-01T00:00:00Z", { id: "m-stale" });
    const freshMeasure = makeMeasure("2025-07-01T00:00:00Z", { id: "m-fresh" });
    const outcomes = [makeOutcome([staleMeasure, freshMeasure])];
    const result = getStaleMeasures(outcomes, "2025-06-01T00:00:00Z");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m-stale");
  });

  it("returns stale measures across multiple outcomes", () => {
    const outcomes = [
      makeOutcome([
        makeMeasure("2025-01-01T00:00:00Z", { id: "m-1-stale" }),
        makeMeasure("2025-07-01T00:00:00Z", { id: "m-1-fresh" }),
      ]),
      makeOutcome([
        makeMeasure(null, { id: "m-2-null" }),              // null → stale
        makeMeasure("2025-06-15T00:00:00Z", { id: "m-2-fresh" }),
      ]),
    ];
    const result = getStaleMeasures(outcomes, "2025-06-01T00:00:00Z");
    const ids = result.map((m) => m.id);
    expect(ids).toContain("m-1-stale");
    expect(ids).toContain("m-2-null");
    expect(ids).not.toContain("m-1-fresh");
    expect(ids).not.toContain("m-2-fresh");
    expect(result).toHaveLength(2);
  });

  it("handles outcomes with no measures (null/empty)", () => {
    const outcomes = [
      { ...makeOutcome([]), measures: [] },
      { ...makeOutcome([]), measures: null as unknown as ConsumerDutyMeasure[] },
    ];
    expect(getStaleMeasures(outcomes as unknown as ConsumerDutyOutcome[], "2025-06-01T00:00:00Z")).toEqual([]);
  });

  it("treats all measures as stale when they all have no lastUpdatedAt", () => {
    const outcomes = [
      makeOutcome([makeMeasure(null), makeMeasure(null), makeMeasure(null)]),
    ];
    expect(getStaleMeasures(outcomes, "2025-06-01T00:00:00Z")).toHaveLength(3);
  });
});

// ── hasStaleChildren ──────────────────────────────────────────────────────────

describe("hasStaleChildren", () => {
  it("returns false when lastPublishDate is null", () => {
    const outcome = makeOutcome([makeMeasure(null)]);
    expect(hasStaleChildren(outcome, null)).toBe(false);
  });

  it("returns false when outcome has no measures", () => {
    const outcome = makeOutcome([]);
    expect(hasStaleChildren(outcome, "2025-06-01T00:00:00Z")).toBe(false);
  });

  it("returns false when measures is null/undefined", () => {
    const outcome = { ...makeOutcome([]), measures: null as unknown as ConsumerDutyMeasure[] };
    expect(hasStaleChildren(outcome as unknown as ConsumerDutyOutcome, "2025-06-01T00:00:00Z")).toBe(false);
  });

  it("returns false when all measures are fresh", () => {
    const outcome = makeOutcome([
      makeMeasure("2025-07-01T00:00:00Z"),
      makeMeasure("2025-08-01T00:00:00Z"),
    ]);
    expect(hasStaleChildren(outcome, "2025-06-01T00:00:00Z")).toBe(false);
  });

  it("returns true when at least one measure is stale", () => {
    const outcome = makeOutcome([
      makeMeasure("2025-07-01T00:00:00Z"),  // fresh
      makeMeasure("2025-01-01T00:00:00Z"),  // stale
    ]);
    expect(hasStaleChildren(outcome, "2025-06-01T00:00:00Z")).toBe(true);
  });

  it("returns true when all measures are stale", () => {
    const outcome = makeOutcome([
      makeMeasure("2025-01-01T00:00:00Z"),
      makeMeasure("2025-02-01T00:00:00Z"),
    ]);
    expect(hasStaleChildren(outcome, "2025-06-01T00:00:00Z")).toBe(true);
  });

  it("returns true when any measure has null lastUpdatedAt", () => {
    const outcome = makeOutcome([
      makeMeasure("2025-07-01T00:00:00Z"),  // fresh
      makeMeasure(null),                      // null → stale
    ]);
    expect(hasStaleChildren(outcome, "2025-06-01T00:00:00Z")).toBe(true);
  });

  it("short-circuits on first stale child (returns true, not all)", () => {
    // Correctness: returns true even if only the first measure is stale
    const outcome = makeOutcome([makeMeasure(null)]);
    expect(hasStaleChildren(outcome, "2025-06-01T00:00:00Z")).toBe(true);
  });
});
