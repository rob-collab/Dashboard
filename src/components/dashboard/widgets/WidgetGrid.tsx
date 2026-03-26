"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, EyeOff, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGET_REGISTRY,
  binPack,
  GRID_ROW_HEIGHT,
  GRID_GAP,
} from "@/lib/widget-registry";
import type { WidgetId } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WidgetGridProps {
  order: WidgetId[];
  heights: Partial<Record<WidgetId, number>>;
  hiddenIds: WidgetId[];
  pinnedIds: WidgetId[];
  editMode: boolean;
  onOrderChange: (newOrder: WidgetId[]) => void;
  onResize: (widgetId: WidgetId, newH: number) => void;
  onHide: (widgetId: WidgetId) => void;
  onShow: (widgetId: WidgetId) => void;
  renderWidget: (widgetId: WidgetId) => React.ReactNode;
  className?: string;
}

// ── Resize handle ─────────────────────────────────────────────────────────────

function ResizeHandle({
  id,
  currentH,
  minH,
  onResize,
}: {
  id: WidgetId;
  currentH: number;
  minH: number;
  onResize: (id: WidgetId, newH: number) => void;
}) {
  const startYRef = useRef(0);
  const startHRef = useRef(currentH);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = true;
      startYRef.current = e.clientY;
      startHRef.current = currentH;

      const onMove = (me: PointerEvent) => {
        if (!draggingRef.current) return;
        const delta = me.clientY - startYRef.current;
        const rowDelta = Math.round(delta / (GRID_ROW_HEIGHT + GRID_GAP));
        const newH = Math.max(minH, startHRef.current + rowDelta);
        onResize(id, newH);
      };

      const onUp = () => {
        draggingRef.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [id, currentH, minH, onResize]
  );

  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute bottom-0 left-0 right-0 flex h-5 cursor-s-resize items-center justify-center rounded-b-2xl opacity-0 transition-opacity group-hover:opacity-100"
      style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.04))" }}
    >
      <div className="flex gap-[3px]">
        <div className="h-1 w-1 rounded-full bg-[#c0bab2]" />
        <div className="h-1 w-1 rounded-full bg-[#c0bab2]" />
        <div className="h-1 w-1 rounded-full bg-[#c0bab2]" />
      </div>
    </div>
  );
}

// ── Sortable widget wrapper ───────────────────────────────────────────────────

function SortableWidget({
  id,
  currentH,
  editMode,
  isPinned,
  onHide,
  onResize,
  isDragging,
  renderWidget,
}: {
  id: WidgetId;
  currentH: number;
  editMode: boolean;
  isPinned: boolean;
  onHide: (id: WidgetId) => void;
  onResize: (id: WidgetId, newH: number) => void;
  isDragging: boolean;
  renderWidget: (id: WidgetId) => React.ReactNode;
}) {
  const def = WIDGET_REGISTRY[id];
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    disabled: isPinned,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    height: "100%",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-warm)] bg-[var(--surface-warm)]",
          "shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
        )}
      >
        {/* Drag/control handle bar — edit mode only */}
        <AnimatePresence>
          {editMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 30, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "flex flex-shrink-0 items-center justify-between overflow-hidden border-b border-[var(--border-warm)] px-3",
                !isPinned && "cursor-grab active:cursor-grabbing"
              )}
              {...(!isPinned ? { ...attributes, ...listeners } : {})}
            >
              <div className="flex items-center gap-2">
                {isPinned ? (
                  <span
                    className="rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-2 py-0.5"
                    style={{ fontSize: 9, color: "#7c3aed", fontWeight: 700, letterSpacing: "0.05em" }}
                  >
                    PINNED
                  </span>
                ) : (
                  <GripVertical size={14} className="text-[#c0bab2]" />
                )}
              </div>
              {!isPinned && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onHide(id)}
                  className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-red-50"
                  title="Hide widget"
                >
                  <EyeOff size={11} className="text-[#94a3b8]" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Widget content */}
        <div className="min-h-0 flex-1">
          {renderWidget(id)}
        </div>

        {/* Resize handle — edit mode, non-pinned only */}
        {editMode && !isPinned && def && (
          <ResizeHandle
            id={id}
            currentH={currentH}
            minH={def.minH}
            onResize={onResize}
          />
        )}
      </div>
    </div>
  );
}

// ── Drag overlay card ─────────────────────────────────────────────────────────

function OverlayCard({ heightPx }: { id: WidgetId; heightPx: number }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--border-warm)] bg-[var(--surface-warm)]"
      style={{
        height: heightPx,
        boxShadow: "0 20px 40px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.1)",
        transform: "scale(1.02)",
        opacity: 0.96,
      }}
    >
      <div className="flex h-[30px] items-center border-b border-[var(--border-warm)] px-3">
        <GripVertical size={14} className="text-[#c0bab2]" />
      </div>
    </div>
  );
}

// ── Main grid ─────────────────────────────────────────────────────────────────

export function WidgetGrid({
  order,
  heights,
  hiddenIds,
  pinnedIds,
  editMode,
  onOrderChange,
  onResize,
  onHide,
  onShow,
  renderWidget,
  className,
}: WidgetGridProps) {
  const [activeId, setActiveId] = useState<WidgetId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const visibleOrder = useMemo(
    () => order.filter((id) => !hiddenIds.includes(id)),
    [order, hiddenIds]
  );

  const { items: packed, totalHeight } = useMemo(
    () => binPack(visibleOrder, heights),
    [visibleOrder, heights]
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as WidgetId);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = e;
      if (over && active.id !== over.id) {
        const from = order.indexOf(active.id as WidgetId);
        const to = order.indexOf(over.id as WidgetId);
        if (from !== -1 && to !== -1) {
          onOrderChange(arrayMove(order, from, to));
        }
      }
    },
    [order, onOrderChange]
  );

  const COL_WIDTH = `calc(50% - ${GRID_GAP / 2}px)`;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden widgets restore tray */}
      <AnimatePresence>
        {editMode && hiddenIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border border-[var(--border-warm)] bg-white p-3"
          >
            <p
              className="mb-2 uppercase"
              style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.06em" }}
            >
              Hidden widgets — click to restore
            </p>
            <div className="flex flex-wrap gap-2">
              {hiddenIds.map((id) => (
                <button
                  key={id}
                  onClick={() => onShow(id)}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border-warm)] bg-[var(--surface-muted)] px-3 py-1.5 transition-colors hover:bg-[#F0EEE9]"
                  style={{ fontSize: 12 }}
                >
                  <Eye size={11} className="text-[#94a3b8]" />
                  {WIDGET_REGISTRY[id]?.label ?? id}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bin-packed 2-column grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
          <div className="relative" style={{ height: totalHeight }}>
            {packed.map(({ id, col, top, height }) => (
              <motion.div
                key={id}
                layoutId={id}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{
                  position: "absolute",
                  left: col === 0 ? 0 : `calc(50% + ${GRID_GAP / 2}px)`,
                  top,
                  width: COL_WIDTH,
                  height,
                }}
              >
                <SortableWidget
                  id={id}
                  currentH={heights[id] ?? WIDGET_REGISTRY[id]?.defaultH ?? 3}
                  editMode={editMode}
                  isPinned={pinnedIds.includes(id)}
                  onHide={onHide}
                  onResize={onResize}
                  isDragging={activeId === id}
                  renderWidget={renderWidget}
                />
              </motion.div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay
          dropAnimation={{ duration: 180, easing: "cubic-bezier(0.25,0.46,0.45,0.94)" }}
        >
          {activeId ? (
            <OverlayCard
              id={activeId}
              heightPx={packed.find((p) => p.id === activeId)?.height ?? 200}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
