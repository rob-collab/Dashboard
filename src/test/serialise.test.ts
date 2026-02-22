import { describe, it, expect } from "vitest";
import { serialiseDates } from "@/lib/serialise";

// ── null / undefined ──────────────────────────────────────────────────────────

describe("serialiseDates — null / undefined", () => {
  it("returns null unchanged", () => {
    expect(serialiseDates(null)).toBeNull();
  });

  it("returns undefined unchanged", () => {
    expect(serialiseDates(undefined)).toBeUndefined();
  });
});

// ── primitives ────────────────────────────────────────────────────────────────

describe("serialiseDates — primitives", () => {
  it("returns a string unchanged", () => {
    expect(serialiseDates("hello")).toBe("hello");
  });

  it("returns a number unchanged", () => {
    expect(serialiseDates(42)).toBe(42);
  });

  it("returns a boolean unchanged", () => {
    expect(serialiseDates(false)).toBe(false);
  });

  it("returns 0 unchanged", () => {
    expect(serialiseDates(0)).toBe(0);
  });

  it("returns an empty string unchanged", () => {
    expect(serialiseDates("")).toBe("");
  });
});

// ── Date conversion ───────────────────────────────────────────────────────────

describe("serialiseDates — Date objects", () => {
  it("converts a Date to an ISO string", () => {
    const d = new Date("2025-06-15T12:00:00.000Z");
    expect(serialiseDates(d)).toBe("2025-06-15T12:00:00.000Z");
  });

  it("converts the epoch date correctly", () => {
    expect(serialiseDates(new Date(0))).toBe("1970-01-01T00:00:00.000Z");
  });

  it("preserves millisecond precision", () => {
    const d = new Date("2025-01-01T00:00:00.123Z");
    expect(serialiseDates(d)).toBe("2025-01-01T00:00:00.123Z");
  });
});

// ── arrays ────────────────────────────────────────────────────────────────────

describe("serialiseDates — arrays", () => {
  it("converts Date entries in an array and leaves other values alone", () => {
    const d = new Date("2025-01-01T00:00:00.000Z");
    expect(serialiseDates([d, "text", 99])).toEqual([
      "2025-01-01T00:00:00.000Z",
      "text",
      99,
    ]);
  });

  it("returns an empty array unchanged", () => {
    expect(serialiseDates([])).toEqual([]);
  });

  it("handles an array of plain strings (no Dates) unchanged", () => {
    expect(serialiseDates(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("converts all Date entries in an array of mixed types", () => {
    const d1 = new Date("2025-03-01T00:00:00.000Z");
    const d2 = new Date("2025-04-01T00:00:00.000Z");
    expect(serialiseDates([d1, null, d2])).toEqual([
      "2025-03-01T00:00:00.000Z",
      null,
      "2025-04-01T00:00:00.000Z",
    ]);
  });
});

// ── objects ───────────────────────────────────────────────────────────────────

describe("serialiseDates — objects", () => {
  it("converts Date fields in a flat object", () => {
    const obj = { name: "Alice", createdAt: new Date("2025-03-01T00:00:00.000Z") };
    expect(serialiseDates(obj)).toEqual({
      name: "Alice",
      createdAt: "2025-03-01T00:00:00.000Z",
    });
  });

  it("leaves non-Date fields in an object unchanged", () => {
    const obj = { id: "u1", count: 7, active: false };
    expect(serialiseDates(obj)).toEqual({ id: "u1", count: 7, active: false });
  });

  it("handles an object with no Date fields", () => {
    const obj = { foo: "bar", baz: 42 };
    expect(serialiseDates(obj)).toEqual({ foo: "bar", baz: 42 });
  });

  it("converts multiple Date fields in one object", () => {
    const obj = {
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-06-01T00:00:00.000Z"),
    };
    expect(serialiseDates(obj)).toEqual({
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-06-01T00:00:00.000Z",
    });
  });
});

// ── nested structures ─────────────────────────────────────────────────────────

describe("serialiseDates — nested structures", () => {
  it("recursively converts Date fields in a nested object", () => {
    const obj = {
      user: { createdAt: new Date("2025-01-01T00:00:00.000Z") },
      tag: "test",
    };
    expect(serialiseDates(obj)).toEqual({
      user: { createdAt: "2025-01-01T00:00:00.000Z" },
      tag: "test",
    });
  });

  it("handles deeply nested structures", () => {
    const deep = {
      a: { b: { c: new Date("2024-12-31T00:00:00.000Z"), d: "unchanged" } },
    };
    expect(serialiseDates(deep)).toEqual({
      a: { b: { c: "2024-12-31T00:00:00.000Z", d: "unchanged" } },
    });
  });

  it("converts Dates inside arrays that are values of object keys", () => {
    const obj = {
      dates: [
        new Date("2025-01-01T00:00:00.000Z"),
        new Date("2025-02-01T00:00:00.000Z"),
      ],
      name: "test",
    };
    expect(serialiseDates(obj)).toEqual({
      dates: ["2025-01-01T00:00:00.000Z", "2025-02-01T00:00:00.000Z"],
      name: "test",
    });
  });

  it("handles arrays of objects with Date fields", () => {
    const items = [
      { id: 1, ts: new Date("2025-06-01T00:00:00.000Z") },
      { id: 2, ts: new Date("2025-07-01T00:00:00.000Z") },
    ];
    expect(serialiseDates(items)).toEqual([
      { id: 1, ts: "2025-06-01T00:00:00.000Z" },
      { id: 2, ts: "2025-07-01T00:00:00.000Z" },
    ]);
  });

  it("does not mutate the input object", () => {
    const d = new Date("2025-06-01T00:00:00.000Z");
    const obj = { ts: d };
    serialiseDates(obj);
    expect(obj.ts).toBeInstanceOf(Date); // original is untouched
  });
});
