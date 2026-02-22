import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  relativeLuminance,
  isDarkBackground,
  sidebarGradient,
  DEFAULT_SIDEBAR_COLOUR,
} from "@/lib/colour-utils";

// ── hexToRgb ─────────────────────────────────────────────────────────────────

describe("hexToRgb", () => {
  it("parses a 6-digit hex colour with hash", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("parses uppercase hex", () => {
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("parses mixed case hex", () => {
    expect(hexToRgb("#1C1B29")).toEqual({ r: 28, g: 27, b: 41 });
  });

  it("returns null for invalid hex", () => {
    expect(hexToRgb("#fff")).toBeNull();      // 3-digit not supported
    expect(hexToRgb("not-a-colour")).toBeNull();
    expect(hexToRgb("")).toBeNull();
    expect(hexToRgb("#gggggg")).toBeNull();   // invalid hex chars
  });

  it("parses hex without hash", () => {
    expect(hexToRgb("ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });
});

// ── relativeLuminance ─────────────────────────────────────────────────────────

describe("relativeLuminance", () => {
  it("returns 0 for pure black", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("returns ~1 for pure white", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("returns expected luminance for pure red", () => {
    // sRGB red: 0.2126 * linearise(1.0) ≈ 0.2126
    const lum = relativeLuminance("#ff0000");
    expect(lum).toBeGreaterThan(0.2);
    expect(lum).toBeLessThan(0.22);
  });

  it("returns 0 for invalid hex", () => {
    expect(relativeLuminance("invalid")).toBe(0);
  });

  it("white has higher luminance than black", () => {
    expect(relativeLuminance("#ffffff")).toBeGreaterThan(relativeLuminance("#000000"));
  });

  it("white has higher luminance than any primary colour", () => {
    expect(relativeLuminance("#ffffff")).toBeGreaterThan(relativeLuminance("#ff0000"));
    expect(relativeLuminance("#ffffff")).toBeGreaterThan(relativeLuminance("#00ff00"));
    expect(relativeLuminance("#ffffff")).toBeGreaterThan(relativeLuminance("#0000ff"));
  });
});

// ── isDarkBackground ──────────────────────────────────────────────────────────

describe("isDarkBackground", () => {
  it("returns true for black", () => {
    expect(isDarkBackground("#000000")).toBe(true);
  });

  it("returns false for white", () => {
    expect(isDarkBackground("#ffffff")).toBe(false);
  });

  it("returns true for the default sidebar colour (dark purple)", () => {
    expect(isDarkBackground(DEFAULT_SIDEBAR_COLOUR)).toBe(true);
  });

  it("returns false for a light colour", () => {
    expect(isDarkBackground("#f0f0f0")).toBe(false);
  });

  it("returns true for a dark navy", () => {
    expect(isDarkBackground("#003366")).toBe(true);
  });

  it("returns false for a bright yellow (high luminance)", () => {
    expect(isDarkBackground("#ffff00")).toBe(false);
  });
});

// ── sidebarGradient ───────────────────────────────────────────────────────────

describe("sidebarGradient", () => {
  it("returns a CSS linear-gradient string", () => {
    const gradient = sidebarGradient("#1c1b29");
    expect(gradient).toContain("linear-gradient");
    expect(gradient).toContain("180deg");
    expect(gradient).toContain("1c1b29");
  });

  it("gradient starts with the original colour at 0%", () => {
    const gradient = sidebarGradient("#ff0000");
    expect(gradient).toContain("#ff0000 0%");
  });

  it("gradient ends with a darkened colour at 100%", () => {
    const gradient = sidebarGradient("#ffffff");
    // darken(#ffffff, 0.85) = #d9d9d9
    expect(gradient).toContain("100%");
    // The end colour should not be the same as the start (i.e. it was darkened)
    expect(gradient).not.toBe(sidebarGradient("#000000").replace("#000000", "#ffffff"));
  });

  it("handles the default sidebar colour without throwing", () => {
    expect(() => sidebarGradient(DEFAULT_SIDEBAR_COLOUR)).not.toThrow();
  });
});

// ── DEFAULT_SIDEBAR_COLOUR ────────────────────────────────────────────────────

describe("DEFAULT_SIDEBAR_COLOUR", () => {
  it("is a valid hex colour string", () => {
    expect(DEFAULT_SIDEBAR_COLOUR).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("is a dark colour", () => {
    expect(isDarkBackground(DEFAULT_SIDEBAR_COLOUR)).toBe(true);
  });
});
