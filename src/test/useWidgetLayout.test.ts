import { describe, it, expect } from "vitest";
import { mergeWidgetLayout } from "@/hooks/useWidgetLayout";
import type { WidgetSlot } from "@/lib/types";

describe("mergeWidgetLayout", () => {
  it("returns role defaults when savedSlots is null", () => {
    const result = mergeWidgetLayout("CCRO_TEAM", null, [], []);
    expect(result).toHaveLength(9);
  });

  it("returns role defaults when savedSlots is empty", () => {
    const result = mergeWidgetLayout("CCRO_TEAM", [], [], []);
    expect(result).toHaveLength(9);
  });

  it("uses saved order when provided", () => {
    const saved: WidgetSlot[] = [
      { slotId: "slot-1", widgetId: "risk-posture" },
      { slotId: "slot-2", widgetId: "horizon-alert" },
    ];
    const result = mergeWidgetLayout("CCRO_TEAM", saved, [], []);
    expect(result[0].widgetId).toBe("risk-posture");
    expect(result[1].widgetId).toBe("horizon-alert");
  });

  it("marks hidden widgets", () => {
    const result = mergeWidgetLayout("CCRO_TEAM", [], ["action-momentum"], []);
    const slot = result.find((s) => s.widgetId === "action-momentum");
    expect(slot?.hidden).toBe(true);
  });

  it("marks pinned widgets", () => {
    const result = mergeWidgetLayout("CCRO_TEAM", [], [], ["risk-posture"]);
    const slot = result.find((s) => s.widgetId === "risk-posture");
    expect(slot?.pinned).toBe(true);
  });
});
