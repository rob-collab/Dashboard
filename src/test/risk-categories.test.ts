import { describe, it, expect } from "vitest";
import {
  getRiskScore,
  getRiskLevel,
  getCellRiskLevel,
  calculateBreach,
  getAppetiteMaxScore,
} from "@/lib/risk-categories";

// ── getRiskScore ──────────────────────────────────────────────────────────────

describe("getRiskScore", () => {
  it("multiplies likelihood by impact", () => {
    expect(getRiskScore(3, 4)).toBe(12);
    expect(getRiskScore(5, 5)).toBe(25);
    expect(getRiskScore(1, 1)).toBe(1);
  });

  it("returns 0 when either factor is 0", () => {
    expect(getRiskScore(0, 5)).toBe(0);
    expect(getRiskScore(5, 0)).toBe(0);
  });
});

// ── getRiskLevel ─────────────────────────────────────────────────────────────

describe("getRiskLevel", () => {
  it("returns Very High for score >= 20", () => {
    expect(getRiskLevel(20).level).toBe("Very High");
    expect(getRiskLevel(25).level).toBe("Very High");
  });

  it("returns High for score 10–19", () => {
    expect(getRiskLevel(10).level).toBe("High");
    expect(getRiskLevel(15).level).toBe("High");
    expect(getRiskLevel(19).level).toBe("High");
  });

  it("returns Medium for score 5–9", () => {
    expect(getRiskLevel(5).level).toBe("Medium");
    expect(getRiskLevel(9).level).toBe("Medium");
  });

  it("returns Low for score < 5", () => {
    expect(getRiskLevel(4).level).toBe("Low");
    expect(getRiskLevel(1).level).toBe("Low");
    expect(getRiskLevel(0).level).toBe("Low");
  });

  it("includes colour and CSS classes in the result", () => {
    const high = getRiskLevel(15);
    expect(high.colour).toBeTruthy();
    expect(high.bgClass).toContain("bg-");
    expect(high.textClass).toContain("text-");
  });

  it("boundary: score 20 is Very High not High", () => {
    expect(getRiskLevel(20).level).toBe("Very High");
    expect(getRiskLevel(19).level).toBe("High");
  });

  it("boundary: score 10 is High not Medium", () => {
    expect(getRiskLevel(10).level).toBe("High");
    expect(getRiskLevel(9).level).toBe("Medium");
  });

  it("boundary: score 5 is Medium not Low", () => {
    expect(getRiskLevel(5).level).toBe("Medium");
    expect(getRiskLevel(4).level).toBe("Low");
  });
});

// ── getCellRiskLevel ──────────────────────────────────────────────────────────

describe("getCellRiskLevel", () => {
  it("computes the combined risk level for a grid cell", () => {
    // 4 × 5 = 20 → Very High
    expect(getCellRiskLevel(4, 5).level).toBe("Very High");
    // 2 × 3 = 6 → High (10 > 6, so Medium... wait: 6 >= 5 and < 10 → Medium)
    expect(getCellRiskLevel(2, 3).level).toBe("Medium");
    // 1 × 1 = 1 → Low
    expect(getCellRiskLevel(1, 1).level).toBe("Low");
  });
});

// ── getAppetiteMaxScore ───────────────────────────────────────────────────────

describe("getAppetiteMaxScore", () => {
  it("returns correct thresholds for each appetite level", () => {
    expect(getAppetiteMaxScore("VERY_LOW")).toBe(3);
    expect(getAppetiteMaxScore("LOW")).toBe(6);
    expect(getAppetiteMaxScore("LOW_TO_MODERATE")).toBe(8);
    expect(getAppetiteMaxScore("MODERATE")).toBe(9);
  });
});

// ── calculateBreach ───────────────────────────────────────────────────────────

describe("calculateBreach", () => {
  it("detects breach when residual score exceeds appetite threshold", () => {
    const result = calculateBreach(10, "VERY_LOW"); // threshold 3
    expect(result.breached).toBe(true);
    expect(result.difference).toBe(7);
  });

  it("detects no breach when residual score equals threshold", () => {
    const result = calculateBreach(6, "LOW"); // threshold 6
    expect(result.breached).toBe(false);
    expect(result.difference).toBe(0);
  });

  it("detects no breach when residual score is below threshold", () => {
    const result = calculateBreach(5, "LOW"); // threshold 6
    expect(result.breached).toBe(false);
    expect(result.difference).toBe(-1);
  });

  it("reports negative difference when well within appetite", () => {
    const result = calculateBreach(1, "MODERATE"); // threshold 9
    expect(result.breached).toBe(false);
    expect(result.difference).toBe(-8);
  });

  it("handles all appetite levels", () => {
    expect(calculateBreach(4, "VERY_LOW").breached).toBe(true);   // 4 > 3
    expect(calculateBreach(7, "LOW").breached).toBe(true);          // 7 > 6
    expect(calculateBreach(8, "LOW_TO_MODERATE").breached).toBe(false); // 8 == 8
    expect(calculateBreach(9, "MODERATE").breached).toBe(false);  // 9 == 9
    expect(calculateBreach(10, "MODERATE").breached).toBe(true);  // 10 > 9
  });
});
