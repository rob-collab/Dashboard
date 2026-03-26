import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AdminWidgetGrid } from "@/components/settings/AdminWidgetGrid";
import type { ResolvedSlot } from "@/lib/widget-registry";

// dnd-kit has no DOM to operate on in jsdom — mock it so tests focus on our logic.
// capturedOnDragEnd holds the callback AdminWidgetGrid registers via onDragEnd,
// so individual tests can fire synthetic drag events and assert onReorder behaviour.
let capturedOnDragEnd: ((event: unknown) => void) | null = null;

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    onDragEnd,
    children,
  }: {
    onDragEnd: (e: unknown) => void;
    children: React.ReactNode;
  }) => {
    capturedOnDragEnd = onDragEnd;
    return children;
  },
  closestCenter: {},
  PointerSensor: class {},
  useSensor: () => ({}),
  useSensors: (...args: unknown[]) => args,
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  useSortable: ({ disabled }: { id: string; disabled?: boolean }) => ({
    attributes: {},
    listeners: disabled ? undefined : {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
  }),
  rectSortingStrategy: {},
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

const baseSlots: ResolvedSlot[] = [
  { slotId: "slot-1", widgetId: "risk-posture",         hidden: false, pinned: false },
  { slotId: "slot-2", widgetId: "consumer-duty-health", hidden: false, pinned: false },
  { slotId: "slot-3", widgetId: "horizon-alert",         hidden: false, pinned: false },
];

describe("AdminWidgetGrid", () => {
  beforeEach(() => {
    capturedOnDragEnd = null;
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
    expect(screen.getByText("Locked")).toBeInTheDocument();
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

  it("calls onReorder with the two slot IDs when a drag completes", async () => {
    const onReorder = vi.fn();
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={[]}
        onReorder={onReorder}
        onTogglePin={vi.fn()}
      />
    );

    // Drag risk-posture (slot-1) onto consumer-duty-health (slot-2)
    act(() => {
      capturedOnDragEnd!({
        active: { id: "risk-posture" },
        over: { id: "consumer-duty-health" },
      });
    });

    expect(onReorder).toHaveBeenCalledWith("slot-1", "slot-2");
  });

  it("does not call onReorder when the dragged widget is pinned", async () => {
    const onReorder = vi.fn();
    const pinnedSlots: ResolvedSlot[] = [
      { slotId: "slot-1", widgetId: "risk-posture",         hidden: false, pinned: true },
      { slotId: "slot-2", widgetId: "consumer-duty-health", hidden: false, pinned: false },
      { slotId: "slot-3", widgetId: "horizon-alert",         hidden: false, pinned: false },
    ];
    render(
      <AdminWidgetGrid
        slots={pinnedSlots}
        pinnedIds={["risk-posture"]}
        onReorder={onReorder}
        onTogglePin={vi.fn()}
      />
    );

    // Attempt to drag pinned risk-posture onto another widget
    act(() => {
      capturedOnDragEnd!({
        active: { id: "risk-posture" },
        over: { id: "consumer-duty-health" },
      });
    });

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("does not call onReorder when the drop target is pinned", async () => {
    const onReorder = vi.fn();
    const pinnedSlots: ResolvedSlot[] = [
      { slotId: "slot-1", widgetId: "risk-posture",         hidden: false, pinned: true },
      { slotId: "slot-2", widgetId: "consumer-duty-health", hidden: false, pinned: false },
      { slotId: "slot-3", widgetId: "horizon-alert",         hidden: false, pinned: false },
    ];
    render(
      <AdminWidgetGrid
        slots={pinnedSlots}
        pinnedIds={["risk-posture"]}
        onReorder={onReorder}
        onTogglePin={vi.fn()}
      />
    );

    // Attempt to drag onto pinned risk-posture
    act(() => {
      capturedOnDragEnd!({
        active: { id: "consumer-duty-health" },
        over: { id: "risk-posture" },
      });
    });

    expect(onReorder).not.toHaveBeenCalled();
  });
});
