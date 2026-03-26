"use client";

import { useCallback } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { WIDGET_REGISTRY } from "@/lib/widget-registry";
import type { ResolvedSlot } from "@/lib/widget-registry";
import type { WidgetId } from "@/lib/types";

interface AdminWidgetGridProps {
  slots: ResolvedSlot[];
  pinnedIds: string[];
  onReorder: (fromSlotId: string, toSlotId: string) => void;
  onTogglePin: (widgetId: WidgetId) => void;
}

/**
 * Widget preview grid for the admin layout panel.
 * Shows widget name + description cards in a 2-column dnd-kit sortable grid.
 * No live widget data — driven entirely by WIDGET_REGISTRY.
 * Adding a new widget to the registry + DEFAULT_LAYOUTS is all that is needed;
 * this component picks it up automatically via the slots prop.
 */
export function AdminWidgetGrid({
  slots,
  pinnedIds,
  onReorder,
  onTogglePin,
}: AdminWidgetGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;

      const activeSlot = slots.find((s) => s.widgetId === active.id);
      const overSlot = slots.find((s) => s.widgetId === over.id);

      if (!activeSlot || !overSlot) return;
      if (activeSlot.pinned || overSlot.pinned) return;

      onReorder(activeSlot.slotId, overSlot.slotId);
    },
    [slots, onReorder]
  );

  const widgetIds = slots.map((s) => s.widgetId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {slots.map((slot) => {
            const isPinned = pinnedIds.includes(slot.widgetId);
            const def = WIDGET_REGISTRY[slot.widgetId];
            if (!def) return null;

            return (
              <SortableAdminCard
                key={slot.slotId}
                slot={slot}
                label={def.label}
                description={def.description}
                pinned={isPinned}
                onTogglePin={() => onTogglePin(slot.widgetId)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ── Sortable card (drag handle + card content merged) ─────────────────────────

function SortableAdminCard({
  slot,
  label,
  description,
  pinned,
  onTogglePin,
}: {
  slot: ResolvedSlot;
  label: string;
  description: string;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: slot.widgetId, disabled: pinned });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        data-testid={`admin-widget-card-${slot.widgetId}`}
        className={cn(
          "flex h-full items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
          pinned
            ? "border-updraft-bar/30 bg-updraft-bar/5"
            : "border-[#E8E6E1] bg-white hover:border-updraft-light-purple/30 dark:border-gray-800 dark:bg-gray-900"
        )}
      >
        {/* Drag handle — hidden when pinned */}
        {!pinned && (
          <div
            data-drag-handle
            className="cursor-grab select-none active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} className="text-[#94a3b8]" />
          </div>
        )}

        {/* Widget info */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-medium",
              pinned ? "text-updraft-deep" : "text-gray-700 dark:text-gray-300"
            )}
          >
            {label}
          </p>
          <p className="truncate text-xs text-gray-400">{description}</p>
        </div>

        {/* Pin toggle */}
        <button
          onClick={onTogglePin}
          className={cn(
            "flex-shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
            pinned
              ? "border-updraft-bar/40 bg-updraft-bar text-white hover:bg-updraft-deep"
              : "border-[#E8E6E1] bg-white text-gray-400 hover:border-updraft-bar/30 hover:text-updraft-bar dark:border-gray-700 dark:bg-gray-900"
          )}
          aria-label={pinned ? "Locked" : "Lock"}
        >
          {pinned ? "Locked" : "Lock"}
        </button>
      </div>
    </div>
  );
}
