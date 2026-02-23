import { describe, it, expect } from "vitest";
import {
  cn,
  naturalCompare,
  slugify,
  calculateChange,
  suggestRAG,
  ragLabel,
  ragLabelShort,
  ragColor,
  ragBgColor,
  statusColor,
  statusLabel,
  formatDate,
  formatDateShort,
  generateId,
} from "@/lib/utils";

// ── cn ───────────────────────────────────────────────────────────────────────

describe("cn", () => {
  it("joins truthy class strings", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("returns empty string when all falsy", () => {
    expect(cn(false, undefined, null)).toBe("");
  });

  it("handles a single class", () => {
    expect(cn("px-4")).toBe("px-4");
  });

  it("handles empty call", () => {
    expect(cn()).toBe("");
  });
});

// ── naturalCompare ───────────────────────────────────────────────────────────

describe("naturalCompare", () => {
  it("sorts numerically within strings", () => {
    const arr = ["CONC 10", "CONC 2", "CONC 1"];
    arr.sort(naturalCompare);
    expect(arr).toEqual(["CONC 1", "CONC 2", "CONC 10"]);
  });

  it("sorts risk references naturally", () => {
    const arr = ["R10", "R2", "R1", "R20"];
    arr.sort(naturalCompare);
    expect(arr).toEqual(["R1", "R2", "R10", "R20"]);
  });

  it("handles equal strings", () => {
    expect(naturalCompare("abc", "abc")).toBe(0);
  });

  it("pure text sorts alphabetically", () => {
    expect(naturalCompare("apple", "banana")).toBeLessThan(0);
    expect(naturalCompare("zebra", "apple")).toBeGreaterThan(0);
  });

  it("handles dotted numeric references", () => {
    const arr = ["1.10", "1.2", "1.1"];
    arr.sort(naturalCompare);
    expect(arr).toEqual(["1.1", "1.2", "1.10"]);
  });
});

// ── slugify ──────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("HELLO")).toBe("hello");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("hello world")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("hello! world?")).toBe("hello-world");
  });

  it("collapses multiple separators", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("-hello-")).toBe("hello");
  });

  it("handles already-slug strings", () => {
    expect(slugify("my-slug")).toBe("my-slug");
  });
});

// ── calculateChange ──────────────────────────────────────────────────────────

describe("calculateChange", () => {
  it("returns positive change with + sign", () => {
    expect(calculateChange("10", "7")).toBe("+3");
  });

  it("returns negative change without + sign", () => {
    expect(calculateChange("5", "10")).toBe("-5");
  });

  it("returns zero change", () => {
    expect(calculateChange("10", "10")).toBe("0");
  });

  it("handles decimal inputs", () => {
    expect(calculateChange("10.5", "10")).toBe("+0.5");
  });

  it("returns empty string for non-numeric inputs", () => {
    expect(calculateChange("abc", "5")).toBe("");
    expect(calculateChange("5", "abc")).toBe("");
  });

  it("rounds to 1 decimal place for non-integer results", () => {
    // 10.3 - 10.0 = 0.3
    expect(calculateChange("10.3", "10")).toBe("+0.3");
  });
});

// ── suggestRAG ───────────────────────────────────────────────────────────────

describe("suggestRAG", () => {
  it("returns GOOD for positive change", () => {
    expect(suggestRAG("+5")).toBe("GOOD");
    expect(suggestRAG("10")).toBe("GOOD");
  });

  it("returns GOOD for zero change", () => {
    expect(suggestRAG("0")).toBe("GOOD");
  });

  it("returns WARNING for small negative change (between -5 and 0)", () => {
    expect(suggestRAG("-1")).toBe("WARNING");
    expect(suggestRAG("-4.9")).toBe("WARNING");
  });

  it("returns HARM for large negative change (<= -5)", () => {
    expect(suggestRAG("-5")).toBe("HARM");
    expect(suggestRAG("-10")).toBe("HARM");
  });

  it("returns GOOD for non-numeric input", () => {
    expect(suggestRAG("")).toBe("GOOD");
    expect(suggestRAG("n/a")).toBe("GOOD");
  });
});

// ── ragLabel / ragLabelShort ─────────────────────────────────────────────────

describe("ragLabel", () => {
  it("returns full label for GOOD", () => {
    expect(ragLabel("GOOD")).toBe("Green — Good Customer Outcome");
  });

  it("returns full label for WARNING", () => {
    expect(ragLabel("WARNING")).toBe("Amber — Possible Detriment");
  });

  it("returns full label for HARM", () => {
    expect(ragLabel("HARM")).toBe("Red — Harm Identified");
  });
});

describe("ragLabelShort", () => {
  it("returns short labels", () => {
    expect(ragLabelShort("GOOD")).toBe("Green");
    expect(ragLabelShort("WARNING")).toBe("Amber");
    expect(ragLabelShort("HARM")).toBe("Red");
  });
});

// ── ragColor / ragBgColor ────────────────────────────────────────────────────

describe("ragColor", () => {
  it("returns correct text class for each status", () => {
    expect(ragColor("GOOD")).toBe("text-risk-green");
    expect(ragColor("WARNING")).toBe("text-risk-amber");
    expect(ragColor("HARM")).toBe("text-risk-red");
  });
});

describe("ragBgColor", () => {
  it("returns correct background class for each status", () => {
    expect(ragBgColor("GOOD")).toBe("bg-risk-green");
    expect(ragBgColor("WARNING")).toBe("bg-risk-amber");
    expect(ragBgColor("HARM")).toBe("bg-risk-red");
  });
});

// ── statusColor / statusLabel ────────────────────────────────────────────────

describe("statusColor", () => {
  it("returns correct colour classes", () => {
    expect(statusColor("DRAFT")).toBe("bg-red-100 text-red-700");
    expect(statusColor("PUBLISHED")).toBe("bg-green-100 text-green-700");
    expect(statusColor("ARCHIVED")).toBe("bg-gray-100 text-gray-500");
  });
});

describe("statusLabel", () => {
  it("returns readable labels", () => {
    expect(statusLabel("DRAFT")).toBe("Draft");
    expect(statusLabel("PUBLISHED")).toBe("Published");
    expect(statusLabel("ARCHIVED")).toBe("Archived");
  });
});

// ── formatDateShort ──────────────────────────────────────────────────────────

describe("formatDateShort", () => {
  it("formats an ISO date string to en-GB short date", () => {
    // Note: output depends on the test runner's locale/timezone.
    // We just assert it contains the year.
    const result = formatDateShort("2024-06-15");
    expect(result).toContain("2024");
  });

  it("accepts a Date object", () => {
    const result = formatDateShort(new Date("2025-01-01"));
    expect(result).toContain("2025");
  });
});

// ── formatDate ───────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("returns a string containing the year", () => {
    const result = formatDate("2025-06-15T12:00:00.000Z");
    expect(result).toContain("2025");
  });

  it("accepts a Date object", () => {
    const result = formatDate(new Date("2024-03-20T09:30:00.000Z"));
    expect(result).toContain("2024");
  });

  it("returns a non-empty string", () => {
    expect(formatDate("2025-01-01T00:00:00.000Z").length).toBeGreaterThan(0);
  });

  it("includes time components (hours and minutes)", () => {
    // en-GB locale with hour/minute options always produces a colon separator
    const result = formatDate("2025-06-15T14:30:00.000Z");
    expect(result).toMatch(/:/);
  });
});

// ── generateId ───────────────────────────────────────────────────────────────

describe("generateId", () => {
  it("returns a non-empty string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateId()));
    expect(ids.size).toBe(10);
  });

  it("returns a UUID-shaped string (crypto.randomUUID is available in jsdom)", () => {
    const id = generateId();
    // Standard UUID format: 8-4-4-4-12 hex characters
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});
