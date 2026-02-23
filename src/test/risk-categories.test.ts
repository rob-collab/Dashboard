import { describe, it, expect } from "vitest";
import {
  getRiskScore,
  getRiskLevel,
  getCellRiskLevel,
  calculateBreach,
  getAppetiteMaxScore,
  LIKELIHOOD_SCALE,
  IMPACT_SCALE,
  L1_CATEGORIES,
  getL2Categories,
  L1_CATEGORY_COLOURS,
  DIRECTION_DISPLAY,
  EFFECTIVENESS_DISPLAY,
  APPETITE_DISPLAY,
  RISK_CATEGORIES,
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

// ── LIKELIHOOD_SCALE ─────────────────────────────────────────────────────────

describe("LIKELIHOOD_SCALE", () => {
  it("has 5 entries", () => {
    expect(LIKELIHOOD_SCALE).toHaveLength(5);
  });

  it("scores run from 1 to 5", () => {
    const scores = LIKELIHOOD_SCALE.map((e) => e.score);
    expect(scores).toEqual([1, 2, 3, 4, 5]);
  });

  it("entry 1 is Rare", () => {
    expect(LIKELIHOOD_SCALE[0].label).toBe("Rare");
  });

  it("entry 5 is Almost Certain", () => {
    expect(LIKELIHOOD_SCALE[4].label).toBe("Almost Certain");
  });

  it("every entry has a non-empty description", () => {
    for (const entry of LIKELIHOOD_SCALE) {
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });
});

// ── IMPACT_SCALE ─────────────────────────────────────────────────────────────

describe("IMPACT_SCALE", () => {
  it("has 5 entries", () => {
    expect(IMPACT_SCALE).toHaveLength(5);
  });

  it("scores run from 1 to 5", () => {
    const scores = IMPACT_SCALE.map((e) => e.score);
    expect(scores).toEqual([1, 2, 3, 4, 5]);
  });

  it("entry 1 is Negligible", () => {
    expect(IMPACT_SCALE[0].label).toBe("Negligible");
  });

  it("entry 5 is Significant", () => {
    expect(IMPACT_SCALE[4].label).toBe("Significant");
  });

  it("every entry has an operational field", () => {
    for (const entry of IMPACT_SCALE) {
      expect(typeof entry.operational).toBe("string");
    }
  });
});

// ── L1_CATEGORIES ─────────────────────────────────────────────────────────────

describe("L1_CATEGORIES", () => {
  it("has 5 entries", () => {
    expect(L1_CATEGORIES).toHaveLength(5);
  });

  it("includes Conduct & Compliance Risk", () => {
    expect(L1_CATEGORIES).toContain("Conduct & Compliance Risk");
  });

  it("includes Operational Risk", () => {
    expect(L1_CATEGORIES).toContain("Operational Risk");
  });

  it("includes Strategic Risk", () => {
    expect(L1_CATEGORIES).toContain("Strategic Risk");
  });

  it("matches the names of RISK_CATEGORIES", () => {
    expect(L1_CATEGORIES).toEqual(RISK_CATEGORIES.map((c) => c.name));
  });
});

// ── getL2Categories ───────────────────────────────────────────────────────────

describe("getL2Categories", () => {
  it("returns subcategories for a valid L1 name", () => {
    const subs = getL2Categories("Conduct & Compliance Risk");
    expect(subs.length).toBeGreaterThan(0);
  });

  it("returns the correct subcategories for Conduct & Compliance Risk", () => {
    const names = getL2Categories("Conduct & Compliance Risk").map((s) => s.name);
    expect(names).toContain("Culture");
    expect(names).toContain("Products");
    expect(names).toContain("Regulations");
  });

  it("returns 7 subcategories for Operational Risk", () => {
    expect(getL2Categories("Operational Risk")).toHaveLength(7);
  });

  it("returns an empty array for an unknown L1 name", () => {
    expect(getL2Categories("Unknown Category")).toEqual([]);
  });

  it("returns subcategories with non-empty definitions", () => {
    for (const sub of getL2Categories("Strategic Risk")) {
      expect(sub.definition.length).toBeGreaterThan(0);
    }
  });
});

// ── L1_CATEGORY_COLOURS ───────────────────────────────────────────────────────

describe("L1_CATEGORY_COLOURS", () => {
  it("has an entry for every L1 category", () => {
    for (const name of L1_CATEGORIES) {
      expect(L1_CATEGORY_COLOURS[name]).toBeDefined();
    }
  });

  it("each entry has fill, stroke, and label properties", () => {
    for (const entry of Object.values(L1_CATEGORY_COLOURS)) {
      expect(typeof entry.fill).toBe("string");
      expect(typeof entry.stroke).toBe("string");
      expect(typeof entry.label).toBe("string");
    }
  });

  it("Conduct & Compliance Risk has label 'Conduct'", () => {
    expect(L1_CATEGORY_COLOURS["Conduct & Compliance Risk"].label).toBe("Conduct");
  });
});

// ── DIRECTION_DISPLAY ─────────────────────────────────────────────────────────

describe("DIRECTION_DISPLAY", () => {
  it("has IMPROVING, STABLE, and DETERIORATING keys", () => {
    expect(DIRECTION_DISPLAY).toHaveProperty("IMPROVING");
    expect(DIRECTION_DISPLAY).toHaveProperty("STABLE");
    expect(DIRECTION_DISPLAY).toHaveProperty("DETERIORATING");
  });

  it("IMPROVING has an upward arrow icon", () => {
    expect(DIRECTION_DISPLAY.IMPROVING.icon).toBe("↑");
  });

  it("DETERIORATING has a downward arrow icon", () => {
    expect(DIRECTION_DISPLAY.DETERIORATING.icon).toBe("↓");
  });

  it("each entry has label, icon, and colour", () => {
    for (const entry of Object.values(DIRECTION_DISPLAY)) {
      expect(typeof entry.label).toBe("string");
      expect(typeof entry.icon).toBe("string");
      expect(typeof entry.colour).toBe("string");
    }
  });
});

// ── EFFECTIVENESS_DISPLAY ─────────────────────────────────────────────────────

describe("EFFECTIVENESS_DISPLAY", () => {
  it("has EFFECTIVE, PARTIALLY_EFFECTIVE, and INEFFECTIVE keys", () => {
    expect(EFFECTIVENESS_DISPLAY).toHaveProperty("EFFECTIVE");
    expect(EFFECTIVENESS_DISPLAY).toHaveProperty("PARTIALLY_EFFECTIVE");
    expect(EFFECTIVENESS_DISPLAY).toHaveProperty("INEFFECTIVE");
  });

  it("EFFECTIVE label is 'Effective'", () => {
    expect(EFFECTIVENESS_DISPLAY.EFFECTIVE.label).toBe("Effective");
  });

  it("each entry has label, colour, and bg", () => {
    for (const entry of Object.values(EFFECTIVENESS_DISPLAY)) {
      expect(typeof entry.label).toBe("string");
      expect(typeof entry.colour).toBe("string");
      expect(typeof entry.bg).toBe("string");
    }
  });
});

// ── APPETITE_DISPLAY ──────────────────────────────────────────────────────────

describe("APPETITE_DISPLAY", () => {
  it("maps VERY_LOW to 'Very Low'", () => {
    expect(APPETITE_DISPLAY.VERY_LOW).toBe("Very Low");
  });

  it("maps LOW to 'Low'", () => {
    expect(APPETITE_DISPLAY.LOW).toBe("Low");
  });

  it("maps LOW_TO_MODERATE to 'Low to Moderate'", () => {
    expect(APPETITE_DISPLAY.LOW_TO_MODERATE).toBe("Low to Moderate");
  });

  it("maps MODERATE to 'Moderate'", () => {
    expect(APPETITE_DISPLAY.MODERATE).toBe("Moderate");
  });
});
