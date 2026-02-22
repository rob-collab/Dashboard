import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deriveTestingStatus } from "@/lib/controls-utils";
import type { ControlRecord } from "@/lib/types";

// Pin the clock to a known date so overdue calculations are deterministic.
// Fixed: 2026-02-22 → currentYear=2026, currentMonth=2
const FIXED_NOW = new Date("2026-02-22T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── helpers ──────────────────────────────────────────────────────────────────

function makeControl(overrides: Partial<ControlRecord> = {}): ControlRecord {
  return {
    id: "ctrl-1",
    controlRef: "CTRL-001",
    controlName: "Test control",
    isActive: true,
    testingSchedule: null,
    attestations: [],
    changes: [],
    ...overrides,
  } as unknown as ControlRecord;
}

function makeSchedule(
  frequency: string,
  testResults: { periodYear: number; periodMonth: number; result: string }[],
  isActive = true
) {
  return {
    isActive,
    testingFrequency: frequency,
    testResults: testResults.map((r, i) => ({
      id: `tr-${i}`,
      ...r,
      testedDate: `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}-01`,
      notes: null,
    })),
  };
}

// ── No testing schedule ───────────────────────────────────────────────────────

describe("deriveTestingStatus — no schedule", () => {
  it("returns Not Scheduled when testingSchedule is null", () => {
    const result = deriveTestingStatus(makeControl({ testingSchedule: null }));
    expect(result.label).toBe("Not Scheduled");
    expect(result.colour).toContain("gray");
    expect(result.bgColour).toContain("gray");
    expect(result.dotColour).toContain("gray");
  });

  it("returns Not Scheduled when testingSchedule is undefined", () => {
    const result = deriveTestingStatus(makeControl({ testingSchedule: undefined as unknown as null }));
    expect(result.label).toBe("Not Scheduled");
  });
});

// ── Inactive schedule ─────────────────────────────────────────────────────────

describe("deriveTestingStatus — inactive schedule", () => {
  it("returns Removed when schedule isActive is false", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("MONTHLY", [], false) as unknown as ControlRecord["testingSchedule"],
    });
    const result = deriveTestingStatus(control);
    expect(result.label).toBe("Removed");
    expect(result.colour).toContain("orange");
  });
});

// ── No test results yet ───────────────────────────────────────────────────────

describe("deriveTestingStatus — no test results", () => {
  it("returns Awaiting Test when testResults is empty", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("QUARTERLY", []) as unknown as ControlRecord["testingSchedule"],
    });
    const result = deriveTestingStatus(control);
    expect(result.label).toBe("Awaiting Test");
    expect(result.colour).toContain("blue");
  });

  it("returns Awaiting Test when testResults is null/undefined", () => {
    const control = makeControl({
      testingSchedule: {
        isActive: true,
        testingFrequency: "ANNUAL",
        testResults: null,
      } as unknown as ControlRecord["testingSchedule"],
    });
    const result = deriveTestingStatus(control);
    expect(result.label).toBe("Awaiting Test");
  });
});

// ── Overdue detection (clock fixed at 2026-02-22, currentMonth=2) ─────────────

describe("deriveTestingStatus — overdue", () => {
  // MONTHLY threshold = 1 month. Last tested Dec 2025 → elapsed = 2 months → overdue.
  it("MONTHLY: overdue when last test was 2 months ago", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("MONTHLY", [
        { periodYear: 2025, periodMonth: 12, result: "PASS" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    expect(deriveTestingStatus(control).label).toBe("Overdue");
    expect(deriveTestingStatus(control).colour).toContain("red");
  });

  // MONTHLY: last tested Jan 2026 → elapsed = 1 → 1 > 1 is false → not overdue
  it("MONTHLY: not overdue when last test was 1 month ago", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("MONTHLY", [
        { periodYear: 2026, periodMonth: 1, result: "PASS" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    expect(deriveTestingStatus(control).label).not.toBe("Overdue");
  });

  // QUARTERLY threshold = 3 months. Oct 2025 → elapsed = 4 → overdue.
  it("QUARTERLY: overdue when last test was 4 months ago", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("QUARTERLY", [
        { periodYear: 2025, periodMonth: 10, result: "PASS" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    expect(deriveTestingStatus(control).label).toBe("Overdue");
  });

  // QUARTERLY: Nov 2025 → elapsed = 3 → 3 > 3 is false → not overdue
  it("QUARTERLY: not overdue when last test was exactly 3 months ago", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("QUARTERLY", [
        { periodYear: 2025, periodMonth: 11, result: "PASS" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    expect(deriveTestingStatus(control).label).not.toBe("Overdue");
  });

  // BI_ANNUAL threshold = 6 months. Jul 2025 → elapsed = 7 → overdue.
  it("BI_ANNUAL: overdue when last test was 7 months ago", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("BI_ANNUAL", [
        { periodYear: 2025, periodMonth: 7, result: "PASS" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    expect(deriveTestingStatus(control).label).toBe("Overdue");
  });

  // BI_ANNUAL: Aug 2025 → elapsed = 6 → 6 > 6 is false → not overdue
  it("BI_ANNUAL: not overdue when last test was exactly 6 months ago", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("BI_ANNUAL", [
        { periodYear: 2025, periodMonth: 8, result: "PASS" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    expect(deriveTestingStatus(control).label).not.toBe("Overdue");
  });

  // ANNUAL threshold = 12 months. Jan 2025 → elapsed = 13 → overdue.
  it("ANNUAL: overdue when last test was 13 months ago", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("ANNUAL", [
        { periodYear: 2025, periodMonth: 1, result: "PASS" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    expect(deriveTestingStatus(control).label).toBe("Overdue");
  });

  // ANNUAL: Feb 2025 → elapsed = 12 → 12 > 12 is false → not overdue
  it("ANNUAL: not overdue when last test was exactly 12 months ago", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("ANNUAL", [
        { periodYear: 2025, periodMonth: 2, result: "PASS" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    expect(deriveTestingStatus(control).label).not.toBe("Overdue");
  });
});

// ── Latest result status (within threshold) ───────────────────────────────────

describe("deriveTestingStatus — result labels", () => {
  // Use this-month period to guarantee not overdue for any frequency
  const thisMonth = { periodYear: 2026, periodMonth: 2 };

  it("returns Pass for PASS result", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("ANNUAL", [
        { ...thisMonth, result: "PASS" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    const result = deriveTestingStatus(control);
    expect(result.label).toBe("Pass");
    expect(result.colour).toContain("green");
    expect(result.dotColour).toContain("green");
  });

  it("returns Fail for FAIL result", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("ANNUAL", [
        { ...thisMonth, result: "FAIL" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    const result = deriveTestingStatus(control);
    expect(result.label).toBe("Fail");
    expect(result.colour).toContain("red");
  });

  it("returns Partial for PARTIALLY result", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("ANNUAL", [
        { ...thisMonth, result: "PARTIALLY" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    const result = deriveTestingStatus(control);
    expect(result.label).toBe("Partial");
    expect(result.colour).toContain("amber");
  });

  it("returns Not Tested for unknown result", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("ANNUAL", [
        { ...thisMonth, result: "UNKNOWN_STATUS" },
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    const result = deriveTestingStatus(control);
    expect(result.label).toBe("Not Tested");
  });
});

// ── Latest result selection ───────────────────────────────────────────────────

describe("deriveTestingStatus — picks the most recent test period", () => {
  it("uses the most recent year/month, not array order", () => {
    // Array is intentionally out of order — older result first
    const control = makeControl({
      testingSchedule: makeSchedule("ANNUAL", [
        { periodYear: 2025, periodMonth: 1, result: "FAIL" }, // older
        { periodYear: 2026, periodMonth: 2, result: "PASS" }, // newer
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    expect(deriveTestingStatus(control).label).toBe("Pass");
  });

  it("sorts by year first, then month", () => {
    const control = makeControl({
      testingSchedule: makeSchedule("ANNUAL", [
        { periodYear: 2026, periodMonth: 1, result: "FAIL" },
        { periodYear: 2025, periodMonth: 12, result: "PASS" }, // higher month but older year
      ]) as unknown as ControlRecord["testingSchedule"],
    });
    // Jan 2026 is more recent than Dec 2025
    expect(deriveTestingStatus(control).label).toBe("Fail");
  });
});

// ── Result shape ──────────────────────────────────────────────────────────────

describe("deriveTestingStatus — result shape", () => {
  it("always returns all four keys", () => {
    const cases = [
      makeControl(),
      makeControl({ testingSchedule: makeSchedule("MONTHLY", []) as unknown as ControlRecord["testingSchedule"] }),
      makeControl({ testingSchedule: makeSchedule("ANNUAL", [{ periodYear: 2026, periodMonth: 2, result: "PASS" }]) as unknown as ControlRecord["testingSchedule"] }),
    ];
    for (const c of cases) {
      const r = deriveTestingStatus(c);
      expect(r).toHaveProperty("label");
      expect(r).toHaveProperty("colour");
      expect(r).toHaveProperty("bgColour");
      expect(r).toHaveProperty("dotColour");
    }
  });
});
