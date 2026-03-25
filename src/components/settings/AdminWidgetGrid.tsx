"use client";

import { useEffect, useRef } from "react";
import { GripVertical } from "lucide-react";
import { createSwapy } from "swapy";
import type { SwapEndEvent } from "swapy";
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
 * Shows widget name + description cards in a 2-column Swapy grid.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<ReturnType<typeof createSwapy> | null>(null);
  const onReorderRef = useRef(onReorder);
  const slotsRef = useRef(slots);

  useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);
  useEffect(() => { slotsRef.current = slots; }, [slots]);

  useEffect(() => {
    if (!containerRef.current) return;

    swapyRef.current = createSwapy(containerRef.current, { animation: "dynamic" });

    swapyRef.current.onSwapEnd((event: SwapEndEvent) => {
      if (!event.hasChanged) return;

      const afterArray = event.slotItemMap.asArray;
      const beforeMap = new Map<string, string>();
      for (const s of slotsRef.current) {
        beforeMap.set(s.slotId, s.widgetId);
      }

      const changed: string[] = [];
      for (const entry of afterArray) {
        if (entry.item === null) continue;
        if (beforeMap.get(entry.slot) !== entry.item) changed.push(entry.slot);
      }

      // If either changed slot holds a pinned widget, skip the reorder
      const isPinnedSwap = changed.some(
        (slotId) => slotsRef.current.find((s) => s.slotId === slotId)?.pinned
      );
      if (isPinnedSwap) return;

      if (changed.length === 2) {
        onReorderRef.current(changed[0], changed[1]);
      }
    });

    return () => {
      swapyRef.current?.destroy();
      swapyRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-swapy-container
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {slots.map((slot) => {
        const isPinned = pinnedIds.includes(slot.widgetId);
        const def = WIDGET_REGISTRY[slot.widgetId];
        if (!def) return null;

        return (
          <div key={slot.slotId} data-swapy-slot={slot.slotId} className="min-h-[90px]">
            <div data-swapy-item={slot.widgetId} className="h-full">
              <AdminWidgetCard
                widgetId={slot.widgetId}
                label={def.label}
                description={def.description}
                pinned={isPinned}
                onTogglePin={() => onTogglePin(slot.widgetId)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AdminWidgetCardProps {
  widgetId: string;
  label: string;
  description: string;
  pinned: boolean;
  onTogglePin: () => void;
}

function AdminWidgetCard({
  widgetId,
  label,
  description,
  pinned,
  onTogglePin,
}: AdminWidgetCardProps) {
  return (
    <div
      data-testid={`admin-widget-card-${widgetId}`}
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
  );
}
