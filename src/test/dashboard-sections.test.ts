import { describe, it, expect } from "vitest";
import {
  DASHBOARD_SECTIONS,
  DEFAULT_SECTION_ORDER,
  ROLE_DEFAULT_HIDDEN,
} from "@/lib/dashboard-sections";

// ── DASHBOARD_SECTIONS ────────────────────────────────────────────────────────

describe("DASHBOARD_SECTIONS", () => {
  it("has 19 sections", () => {
    expect(DASHBOARD_SECTIONS).toHaveLength(19);
  });

  it("every section has a non-empty key", () => {
    for (const s of DASHBOARD_SECTIONS) {
      expect(s.key.length).toBeGreaterThan(0);
    }
  });

  it("every section has a non-empty label", () => {
    for (const s of DASHBOARD_SECTIONS) {
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it("every section has a non-empty description", () => {
    for (const s of DASHBOARD_SECTIONS) {
      expect(s.description.length).toBeGreaterThan(0);
    }
  });

  it("all keys are unique", () => {
    const keys = DASHBOARD_SECTIONS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("contains the 'welcome' section", () => {
    expect(DASHBOARD_SECTIONS.find((s) => s.key === "welcome")).toBeDefined();
  });

  it("contains the 'risk-summary' section", () => {
    expect(DASHBOARD_SECTIONS.find((s) => s.key === "risk-summary")).toBeDefined();
  });

  it("contains the 'consumer-duty' section", () => {
    expect(DASHBOARD_SECTIONS.find((s) => s.key === "consumer-duty")).toBeDefined();
  });

  it("welcome section has label 'Welcome Banner'", () => {
    const s = DASHBOARD_SECTIONS.find((s) => s.key === "welcome");
    expect(s?.label).toBe("Welcome Banner");
  });
});

// ── DEFAULT_SECTION_ORDER ─────────────────────────────────────────────────────

describe("DEFAULT_SECTION_ORDER", () => {
  it("has the same length as DASHBOARD_SECTIONS", () => {
    expect(DEFAULT_SECTION_ORDER).toHaveLength(DASHBOARD_SECTIONS.length);
  });

  it("contains every key from DASHBOARD_SECTIONS", () => {
    for (const s of DASHBOARD_SECTIONS) {
      expect(DEFAULT_SECTION_ORDER).toContain(s.key);
    }
  });

  it("'welcome' is the first section", () => {
    expect(DEFAULT_SECTION_ORDER[0]).toBe("welcome");
  });

  it("'recent-activity' is the last section", () => {
    expect(DEFAULT_SECTION_ORDER[DEFAULT_SECTION_ORDER.length - 1]).toBe("recent-activity");
  });

  it("all entries are unique strings", () => {
    expect(new Set(DEFAULT_SECTION_ORDER).size).toBe(DEFAULT_SECTION_ORDER.length);
  });
});

// ── ROLE_DEFAULT_HIDDEN ───────────────────────────────────────────────────────

describe("ROLE_DEFAULT_HIDDEN", () => {
  it("has entries for OWNER and REVIEWER", () => {
    expect(ROLE_DEFAULT_HIDDEN).toHaveProperty("OWNER");
    expect(ROLE_DEFAULT_HIDDEN).toHaveProperty("REVIEWER");
  });

  it("OWNER hidden list includes pending-approvals", () => {
    expect(ROLE_DEFAULT_HIDDEN.OWNER).toContain("pending-approvals");
  });

  it("OWNER hidden list includes proposed-changes", () => {
    expect(ROLE_DEFAULT_HIDDEN.OWNER).toContain("proposed-changes");
  });

  it("REVIEWER hidden list includes pending-approvals", () => {
    expect(ROLE_DEFAULT_HIDDEN.REVIEWER).toContain("pending-approvals");
  });

  it("OWNER has more hidden sections than REVIEWER (CCRO-domain extras)", () => {
    expect(ROLE_DEFAULT_HIDDEN.OWNER.length).toBeGreaterThan(
      ROLE_DEFAULT_HIDDEN.REVIEWER.length
    );
  });

  it("all hidden keys exist in DASHBOARD_SECTIONS", () => {
    const allKeys = DASHBOARD_SECTIONS.map((s) => s.key);
    for (const hidden of Object.values(ROLE_DEFAULT_HIDDEN).flat()) {
      expect(allKeys).toContain(hidden);
    }
  });

  it("CCRO_TEAM has no entry (sees everything)", () => {
    expect(ROLE_DEFAULT_HIDDEN.CCRO_TEAM).toBeUndefined();
  });
});
