import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminWidgetGrid } from "@/components/settings/AdminWidgetGrid";
import type { ResolvedSlot } from "@/lib/widget-registry";

// Swapy has no DOM to operate on in jsdom — mock it so tests focus on our logic.
vi.mock("swapy", () => ({
  createSwapy: () => ({
    onSwapEnd: vi.fn(),
    destroy: vi.fn(),
  }),
}));

const baseSlots: ResolvedSlot[] = [
  { slotId: "slot-1", widgetId: "risk-posture",         hidden: false, pinned: false },
  { slotId: "slot-2", widgetId: "consumer-duty-health", hidden: false, pinned: false },
  { slotId: "slot-3", widgetId: "horizon-alert",         hidden: false, pinned: false },
];

describe("AdminWidgetGrid", () => {
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
});
