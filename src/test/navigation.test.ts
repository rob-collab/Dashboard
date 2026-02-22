import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEntityUrl,
  navigateToEntity,
  ENTITY_BADGE_STYLES,
} from "@/lib/navigation";

// ── getEntityUrl ──────────────────────────────────────────────────────────────

describe("getEntityUrl", () => {
  it("builds the correct URL for policy", () => {
    expect(getEntityUrl("policy", "pol-123")).toBe(
      "/compliance?tab=policies&policy=pol-123"
    );
  });

  it("builds the correct URL for control", () => {
    expect(getEntityUrl("control", "ctrl-456")).toBe(
      "/controls?tab=library&control=ctrl-456"
    );
  });

  it("builds the correct URL for regulation", () => {
    expect(getEntityUrl("regulation", "reg-789")).toBe(
      "/compliance?tab=regulatory-universe&regulation=reg-789"
    );
  });

  it("builds the correct URL for risk", () => {
    expect(getEntityUrl("risk", "risk-001")).toBe(
      "/risk-register?risk=risk-001"
    );
  });

  it("builds the correct URL for action", () => {
    expect(getEntityUrl("action", "act-002")).toBe(
      "/actions?action=act-002"
    );
  });

  it("builds the correct URL for risk-acceptance", () => {
    expect(getEntityUrl("risk-acceptance", "ra-003")).toBe(
      "/risk-acceptances?acceptance=ra-003"
    );
  });

  it("embeds the id verbatim (no encoding applied)", () => {
    // IDs are typically UUIDs or simple refs — URL_BUILDERS use direct interpolation
    const id = "my-id-with-dashes";
    expect(getEntityUrl("risk", id)).toContain(id);
  });

  it("returns distinct URLs for distinct entity types with the same id", () => {
    const urls = (["policy", "control", "regulation", "risk", "action", "risk-acceptance"] as const)
      .map((t) => getEntityUrl(t, "same-id"));
    const unique = new Set(urls);
    expect(unique.size).toBe(6);
  });

  it("every URL starts with a slash", () => {
    const types = ["policy", "control", "regulation", "risk", "action", "risk-acceptance"] as const;
    for (const t of types) {
      expect(getEntityUrl(t, "x")).toMatch(/^\//);
    }
  });
});

// ── navigateToEntity ──────────────────────────────────────────────────────────
// jsdom does not implement window.location navigation ("Not implemented: navigation
// to another Document"), so we replace window.location with a plain mock object.

describe("navigateToEntity", () => {
  let mockLocation: { pathname: string; search: string; href: string };

  beforeEach(() => {
    mockLocation = { pathname: "/", search: "", href: "http://localhost/" };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
      configurable: true,
    });
  });

  it("calls pushStack with pathname + search of the current location", () => {
    const pushStack = vi.fn();
    navigateToEntity("risk", "risk-123", pushStack);
    expect(pushStack).toHaveBeenCalledOnce();
    expect(pushStack).toHaveBeenCalledWith("/");
  });

  it("sets window.location.href to the entity URL", () => {
    const pushStack = vi.fn();
    navigateToEntity("risk", "risk-123", pushStack);
    expect(mockLocation.href).toBe("/risk-register?risk=risk-123");
  });

  it("sets the correct href for each entity type", () => {
    navigateToEntity("action", "act-999", vi.fn());
    expect(mockLocation.href).toBe("/actions?action=act-999");
  });

  it("passes the full path + search string to pushStack", () => {
    mockLocation.pathname = "/risk-register";
    mockLocation.search = "?risk=existing-id";
    const pushStack = vi.fn();
    navigateToEntity("action", "new-act", pushStack);
    expect(pushStack).toHaveBeenCalledWith("/risk-register?risk=existing-id");
  });

  it("passes empty search when on root with no params", () => {
    mockLocation.pathname = "/";
    mockLocation.search = "";
    const pushStack = vi.fn();
    navigateToEntity("policy", "pol-1", pushStack);
    expect(pushStack).toHaveBeenCalledWith("/");
  });
});

// ── ENTITY_BADGE_STYLES ───────────────────────────────────────────────────────

describe("ENTITY_BADGE_STYLES", () => {
  const ENTITY_TYPES = ["policy", "control", "regulation", "risk", "action", "risk-acceptance"] as const;

  it("has an entry for every NavigableEntity type", () => {
    for (const type of ENTITY_TYPES) {
      expect(ENTITY_BADGE_STYLES[type], `missing styles for ${type}`).toBeDefined();
    }
  });

  it("every entry has bg, text, and hoverBg", () => {
    for (const type of ENTITY_TYPES) {
      const styles = ENTITY_BADGE_STYLES[type];
      expect(styles.bg, `${type}: missing bg`).toBeTruthy();
      expect(styles.text, `${type}: missing text`).toBeTruthy();
      expect(styles.hoverBg, `${type}: missing hoverBg`).toBeTruthy();
    }
  });

  it("bg classes start with 'bg-'", () => {
    for (const type of ENTITY_TYPES) {
      expect(ENTITY_BADGE_STYLES[type].bg).toMatch(/^bg-/);
    }
  });

  it("text classes start with 'text-'", () => {
    for (const type of ENTITY_TYPES) {
      expect(ENTITY_BADGE_STYLES[type].text).toMatch(/^text-/);
    }
  });

  it("hoverBg classes start with 'hover:'", () => {
    for (const type of ENTITY_TYPES) {
      expect(ENTITY_BADGE_STYLES[type].hoverBg).toMatch(/^hover:/);
    }
  });

  it("all six entity types have distinct bg colours", () => {
    const bgs = ENTITY_TYPES.map((t) => ENTITY_BADGE_STYLES[t].bg);
    const unique = new Set(bgs);
    expect(unique.size).toBe(ENTITY_TYPES.length);
  });

  it("risk uses red styling", () => {
    expect(ENTITY_BADGE_STYLES.risk.bg).toContain("red");
    expect(ENTITY_BADGE_STYLES.risk.text).toContain("red");
  });

  it("policy uses blue styling", () => {
    expect(ENTITY_BADGE_STYLES.policy.bg).toContain("blue");
    expect(ENTITY_BADGE_STYLES.policy.text).toContain("blue");
  });

  it("regulation uses green styling", () => {
    expect(ENTITY_BADGE_STYLES.regulation.bg).toContain("green");
    expect(ENTITY_BADGE_STYLES.regulation.text).toContain("green");
  });

  it("action uses amber styling", () => {
    expect(ENTITY_BADGE_STYLES.action.bg).toContain("amber");
    expect(ENTITY_BADGE_STYLES.action.text).toContain("amber");
  });

  it("risk-acceptance uses purple styling", () => {
    expect(ENTITY_BADGE_STYLES["risk-acceptance"].bg).toContain("purple");
    expect(ENTITY_BADGE_STYLES["risk-acceptance"].text).toContain("purple");
  });
});
