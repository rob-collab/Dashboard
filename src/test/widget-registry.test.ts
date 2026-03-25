// src/test/widget-registry.test.ts
import { describe, it, expect } from "vitest";
import {
  WIDGET_REGISTRY,
  DEFAULT_LAYOUTS,
  resolveLayout,
} from "@/lib/widget-registry";
import type { WidgetId, WidgetSlot } from "@/lib/types";

describe("WIDGET_REGISTRY", () => {
  it("contains an entry for every WidgetId", () => {
    const ids: WidgetId[] = [
      "approval-queue", "risk-posture", "controls-heartbeat",
      "consumer-duty-health", "horizon-alert", "action-momentum",
      "my-runway", "firm-status", "action-needed", "my-portfolio",
      "risks-in-focus",
    ];
    for (const id of ids) {
      expect(WIDGET_REGISTRY[id]).toBeDefined();
      expect(WIDGET_REGISTRY[id].label).toBeTruthy();
    }
  });
});

describe("DEFAULT_LAYOUTS", () => {
  it("CCRO has 9 slots", () => {
    expect(DEFAULT_LAYOUTS.CCRO_TEAM).toHaveLength(9);
  });
  it("CEO has 4 slots", () => {
    expect(DEFAULT_LAYOUTS.CEO).toHaveLength(4);
  });
  it("OWNER has 3 slots", () => {
    expect(DEFAULT_LAYOUTS.OWNER).toHaveLength(3);
  });
  it("all slot IDs are unique within each role", () => {
    for (const [, slots] of Object.entries(DEFAULT_LAYOUTS)) {
      const ids = slots.map((s) => s.slotId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it("all widgetIds in defaults exist in WIDGET_REGISTRY", () => {
    for (const [, slots] of Object.entries(DEFAULT_LAYOUTS)) {
      for (const slot of slots) {
        expect(WIDGET_REGISTRY[slot.widgetId]).toBeDefined();
      }
    }
  });
});

describe("resolveLayout", () => {
  it("returns role defaults when savedSlots is empty", () => {
    const result = resolveLayout("CCRO_TEAM", [], []);
    expect(result).toHaveLength(9);
  });
  it("honours saved slot order when provided", () => {
    const saved: WidgetSlot[] = [
      { slotId: "slot-1", widgetId: "risk-posture" },
      { slotId: "slot-2", widgetId: "controls-heartbeat" },
    ];
    const result = resolveLayout("CCRO_TEAM", saved, []);
    expect(result[0].widgetId).toBe("risk-posture");
    expect(result[1].widgetId).toBe("controls-heartbeat");
  });
  it("appends default widgets absent from saved slots (partial save)", () => {
    const saved: WidgetSlot[] = [
      { slotId: "slot-1", widgetId: "risk-posture" },
      { slotId: "slot-2", widgetId: "controls-heartbeat" },
    ];
    const result = resolveLayout("CCRO_TEAM", saved, []);
    expect(result).toHaveLength(9);
    expect(result[0].widgetId).toBe("risk-posture");
    expect(result[1].widgetId).toBe("controls-heartbeat");
    const widgetIds = result.map((s) => s.widgetId);
    expect(widgetIds).toContain("approval-queue");
    expect(widgetIds).toContain("consumer-duty-health");
  });
  it("marks hidden widgets so callers can skip rendering", () => {
    const result = resolveLayout("CCRO_TEAM", [], ["action-momentum"]);
    const hidden = result.find((s) => s.widgetId === "action-momentum");
    expect(hidden?.hidden).toBe(true);
  });
  it("treats pinned slots as non-swappable flag", () => {
    const result = resolveLayout("CCRO_TEAM", [], [], ["risk-posture"]);
    const pinned = result.find((s) => s.widgetId === "risk-posture");
    expect(pinned?.pinned).toBe(true);
  });
  it("VIEWER role returns a 4-slot layout (CEO-equivalent)", () => {
    const result = resolveLayout("VIEWER", [], []);
    expect(result).toHaveLength(4);
  });
  it("filters out saved slots with stale widgetIds not in WIDGET_REGISTRY", () => {
    const stale: WidgetSlot[] = [
      { slotId: "slot-1", widgetId: "risk-posture" },
      // @ts-expect-error intentional stale id for test
      { slotId: "slot-2", widgetId: "deleted-widget" },
    ];
    const result = resolveLayout("CCRO_TEAM", stale, []);
    expect(result.every((s) => s.widgetId in WIDGET_REGISTRY)).toBe(true);
    expect(result.map((s) => s.slotId)).not.toContain("slot-2");
  });
});
