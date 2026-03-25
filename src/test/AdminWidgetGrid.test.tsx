import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AdminWidgetGrid } from "@/components/settings/AdminWidgetGrid";
import type { ResolvedSlot } from "@/lib/widget-registry";

// Swapy has no DOM to operate on in jsdom — mock it so tests focus on our logic.
// capturedOnSwapEnd holds the callback AdminWidgetGrid registers via onSwapEnd,
// so individual tests can fire synthetic swap events and assert onReorder behaviour.
let capturedOnSwapEnd: ((event: unknown) => void) | null = null;
const mockSwapyInstance = {
  onSwapEnd: vi.fn((cb: (event: unknown) => void) => {
    capturedOnSwapEnd = cb;
  }),
  destroy: vi.fn(),
};
vi.mock("swapy", () => ({
  createSwapy: vi.fn(() => mockSwapyInstance),
}));

const baseSlots: ResolvedSlot[] = [
  { slotId: "slot-1", widgetId: "risk-posture",         hidden: false, pinned: false },
  { slotId: "slot-2", widgetId: "consumer-duty-health", hidden: false, pinned: false },
  { slotId: "slot-3", widgetId: "horizon-alert",         hidden: false, pinned: false },
];

describe("AdminWidgetGrid", () => {
  beforeEach(() => {
    capturedOnSwapEnd = null;
    mockSwapyInstance.onSwapEnd.mockClear();
    mockSwapyInstance.destroy.mockClear();
  });

  it("renders a card for every slot using WIDGET_REGISTRY labels", () => {
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={[]}
        onReorder={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );
    expect(screen.getByText("Risk Posture")).toBeInTheDocument();
    expect(screen.getByText("Consumer Duty Health")).toBeInTheDocument();
    expect(screen.getByText("Horizon Alert")).toBeInTheDocument();
  });

  it("shows Lock button for unpinned widgets", () => {
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={[]}
        onReorder={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );
    const lockButtons = screen.getAllByRole("button", { name: /lock/i });
    expect(lockButtons).toHaveLength(3);
  });

  it("shows Locked badge and no drag handle for pinned widget", () => {
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={["risk-posture"]}
        onReorder={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );
    // The pinned card shows "Locked" state label
    expect(screen.getByText("Locked")).toBeInTheDocument();
    // The pinned card's drag handle is hidden (aria-hidden or absent)
    const riskPostureCard = screen.getByTestId("admin-widget-card-risk-posture");
    expect(riskPostureCard.querySelector("[data-drag-handle]")).toBeNull();
  });

  it("calls onTogglePin with the widgetId when Lock button is clicked", () => {
    const onTogglePin = vi.fn();
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={[]}
        onReorder={vi.fn()}
        onTogglePin={onTogglePin}
      />
    );
    const lockButtons = screen.getAllByRole("button", { name: /lock/i });
    fireEvent.click(lockButtons[0]); // first card = risk-posture
    expect(onTogglePin).toHaveBeenCalledWith("risk-posture");
  });

  it("calls onTogglePin when Locked badge is clicked to unpin", () => {
    const onTogglePin = vi.fn();
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={["risk-posture"]}
        onReorder={vi.fn()}
        onTogglePin={onTogglePin}
      />
    );
    const lockedButton = screen.getByRole("button", { name: /locked/i });
    fireEvent.click(lockedButton);
    expect(onTogglePin).toHaveBeenCalledWith("risk-posture");
  });

  it("calls onReorder with the two changed slot IDs after a swap", async () => {
    const onReorder = vi.fn();
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={[]}
        onReorder={onReorder}
        onTogglePin={vi.fn()}
      />
    );

    // baseSlots: slot-1 → risk-posture, slot-2 → consumer-duty-health, slot-3 → horizon-alert
    // Simulate swapping slot-1 and slot-2: their items are exchanged.
    act(() => {
      capturedOnSwapEnd!({
        hasChanged: true,
        slotItemMap: {
          asArray: [
            { slot: "slot-1", item: "consumer-duty-health" }, // swapped
            { slot: "slot-2", item: "risk-posture" },          // swapped
            { slot: "slot-3", item: "horizon-alert" },          // unchanged
          ],
        },
      });
    });

    expect(onReorder).toHaveBeenCalledWith("slot-1", "slot-2");
  });
});
