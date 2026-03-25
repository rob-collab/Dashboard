"use client";

import { useEffect, useRef } from "react";
import { createSwapy } from "swapy";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIDGET_REGISTRY } from "@/lib/widget-registry";
import type { ResolvedSlot } from "@/lib/widget-registry";
import type { WidgetId } from "@/lib/types";

interface WidgetGridProps {
  slots: ResolvedSlot[];
  editMode: boolean;
  onSwap: (fromSlotId: string, toSlotId: string) => void;
  onHide: (widgetId: WidgetId) => void;
  onShow: (widgetId: WidgetId) => void;
  hiddenWidgets: WidgetId[];
  renderWidget: (widgetId: WidgetId) => React.ReactNode;
  className?: string;
}

export function WidgetGrid({
  slots,
  editMode,
  onSwap,
  onHide,
  onShow,
  hiddenWidgets,
  renderWidget,
  className,
}: WidgetGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<ReturnType<typeof createSwapy> | null>(null);

  const visibleSlots = slots.filter((s) => !s.hidden);

  // Keep a stable ref to onSwap so the Swapy closure never goes stale.
  // Swapy is initialised once per editMode activation; re-registering on every
  // render would destroy and recreate it mid-drag.
  const onSwapRef = useRef(onSwap);
  useEffect(() => {
    onSwapRef.current = onSwap;
  }, [onSwap]);

  // Initialise / destroy Swapy when editMode changes.
  // The actual Swapy SwapEvent shape exposes fromSlot and toSlot directly —
  // there is no event.data.array. We use onSwapEnd (fires once on drop, not
  // on every hover-over) so the consumer receives one call per completed drag.
  useEffect(() => {
    if (!containerRef.current) return;

    if (editMode) {
      swapyRef.current = createSwapy(containerRef.current, {
        animation: "dynamic",
      });

      swapyRef.current.onSwapEnd((event: import("swapy").SwapEndEvent) => {
        // Only propagate when the layout actually changed
        if (!event.hasChanged) return;

        // SlotItemMap.asArray gives us the full after-state; compare with
        // before via oldSlotItemMap is not available on SwapEndEvent.
        // Instead use the slotItemMap (new state) and derive which two slots
        // differ from the slots prop held in closure — but since Swapy already
        // physically moved the DOM items we use onSwap from onSwapRef.
        // The simplest correct approach: call into onSwap with the two slot
        // keys from the new SlotItemMap that differ from the original layout.
        const afterArray = event.slotItemMap.asArray; // Array<{ slot, item }>

        // Build a map of slotId → widgetId from the *current* rendered slots
        const beforeMap = new Map<string, string>();
        for (const s of slots) {
          if (!s.hidden) {
            beforeMap.set(s.slotId, s.widgetId);
          }
        }

        const changed: string[] = [];
        for (const entry of afterArray) {
          if (beforeMap.get(entry.slot) !== entry.item) {
            changed.push(entry.slot);
          }
        }

        if (changed.length === 2) {
          onSwapRef.current(changed[0], changed[1]);
        }
      });
    } else {
      swapyRef.current?.destroy();
      swapyRef.current = null;
    }

    return () => {
      swapyRef.current?.destroy();
      swapyRef.current = null;
    };
    // slots intentionally excluded — only editMode triggers re-init.
    // The slots snapshot used in onSwapEnd is read from the prop at call time
    // (closure over the render's slots), which is always the pre-swap state
    // since the effect only re-runs when editMode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  return (
    <div className="space-y-4">
      {/* Hidden widgets restore panel */}
      {editMode && hiddenWidgets.length > 0 && (
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-3">
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Hidden widgets — click to restore
          </p>
          <div className="flex flex-wrap gap-2">
            {hiddenWidgets.map((wid) => (
              <button
                key={wid}
                onClick={() => onShow(wid)}
                className="flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#F8F7F4] px-3 py-1.5 transition-colors hover:bg-[#F0EEE9]"
                style={{ fontSize: 12 }}
              >
                <Eye size={12} className="text-[#94a3b8]" />
                {WIDGET_REGISTRY[wid]?.label ?? wid}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Widget grid */}
      <div
        ref={containerRef}
        data-swapy-container
        className={cn(
          "grid grid-cols-1 gap-4 md:grid-cols-2",
          className
        )}
      >
        {visibleSlots.map((slot) => (
          <div
            key={slot.slotId}
            data-swapy-slot={slot.slotId}
            className="min-h-[220px]"
          >
            <div
              data-swapy-item={slot.widgetId}
              className={cn(
                "h-full",
                editMode && "cursor-grab active:cursor-grabbing"
              )}
            >
              {editMode ? (
                <div className="relative h-full">
                  <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                    {slot.pinned ? (
                      <span
                        className="flex h-6 items-center rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-2"
                        style={{ fontSize: 9, color: "#7c3aed", fontWeight: 600 }}
                      >
                        PINNED
                      </span>
                    ) : (
                      <button
                        onClick={() => onHide(slot.widgetId)}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-[#E8E6E1] bg-white/90 shadow-sm transition-colors hover:bg-red-50"
                        title="Hide widget"
                      >
                        <EyeOff size={12} className="text-[#94a3b8]" />
                      </button>
                    )}
                    <GripVertical size={14} className="text-[#94a3b8]" />
                  </div>
                  {renderWidget(slot.widgetId)}
                </div>
              ) : (
                renderWidget(slot.widgetId)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
