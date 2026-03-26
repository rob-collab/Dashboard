"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
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
import {
  GripVertical,
  EyeOff,
  ShieldAlert,
  CheckSquare,
  TrendingUp,
  Bell,
  Zap,
  Calendar,
  BarChart2,
  Star,
  Eye,
  GripHorizontal,
} from "lucide-react";

// ── Widget definitions ────────────────────────────────────────────────────────

const WIDGET_DEFS: Record<
  string,
  { label: string; icon: React.ElementType; accent: string; defaultH: number; minH: number }
> = {
  "risk-posture":       { label: "Risk Posture",         icon: ShieldAlert, accent: "#7c3aed", defaultH: 3, minH: 2 },
  "controls-heartbeat": { label: "Controls Heartbeat",   icon: CheckSquare, accent: "#059669", defaultH: 6, minH: 3 },
  "consumer-duty":      { label: "Consumer Duty Health", icon: TrendingUp,  accent: "#2563eb", defaultH: 4, minH: 3 },
  "horizon-alert":      { label: "Horizon Alert",        icon: Bell,        accent: "#d97706", defaultH: 4, minH: 3 },
  "action-momentum":    { label: "Action Momentum",      icon: Zap,         accent: "#7c3aed", defaultH: 3, minH: 2 },
  "my-runway":          { label: "My Runway",            icon: Calendar,    accent: "#0891b2", defaultH: 3, minH: 2 },
  "firm-status":        { label: "Firm Status",          icon: BarChart2,   accent: "#be185d", defaultH: 2, minH: 2 },
  "risks-in-focus":     { label: "Risks in Focus",       icon: Star,        accent: "#7c3aed", defaultH: 5, minH: 3 },
};

const DEFAULT_ORDER = Object.keys(WIDGET_DEFS);
const ROW_HEIGHT = 72;
const GAP = 16;
const COLS = 2;

// ── Bin-packing ───────────────────────────────────────────────────────────────

interface PackedItem {
  id: string;
  col: number;
  top: number;
  height: number;
}

function binPack(
  orderedIds: string[],
  heights: Record<string, number>
): { items: PackedItem[]; totalHeight: number } {
  const colHeights = new Array(COLS).fill(0);
  const items: PackedItem[] = [];

  for (const id of orderedIds) {
    const h = heights[id] ?? WIDGET_DEFS[id]?.defaultH ?? 3;
    const heightPx = h * ROW_HEIGHT + (h - 1) * GAP;
    const col = colHeights.indexOf(Math.min(...colHeights));
    items.push({ id, col, top: colHeights[col], height: heightPx });
    colHeights[col] += heightPx + GAP;
  }

  return { items, totalHeight: Math.max(...colHeights) };
}

// ── Resize handle ─────────────────────────────────────────────────────────────

function ResizeHandle({
  id,
  currentH,
  minH,
  onResize,
}: {
  id: string;
  currentH: number;
  minH: number;
  onResize: (id: string, newH: number) => void;
}) {
  const startYRef = useRef<number>(0);
  const startHRef = useRef<number>(currentH);
  const isDraggingRef = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      startYRef.current = e.clientY;
      startHRef.current = currentH;

      const onMove = (me: PointerEvent) => {
        if (!isDraggingRef.current) return;
        const delta = me.clientY - startYRef.current;
        const rowDelta = Math.round(delta / (ROW_HEIGHT + GAP));
        const newH = Math.max(minH, startHRef.current + rowDelta);
        onResize(id, newH);
      };

      const onUp = () => {
        isDraggingRef.current = false;
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
      className="absolute bottom-0 left-0 right-0 flex h-5 cursor-s-resize items-center justify-center rounded-b-xl opacity-0 transition-opacity group-hover:opacity-100"
      style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.04))" }}
      title="Drag to resize"
    >
      <GripHorizontal size={12} className="text-[#c0bab2]" />
    </div>
  );
}

// ── Mock content ──────────────────────────────────────────────────────────────

function MockRows({ count, accent }: { count: number; accent: string }) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: accent, opacity: 0.4 + (i % 3) * 0.2 }}
          />
          <div className="h-2 rounded-full bg-[#E8E6E1]" style={{ width: `${55 + ((i * 37) % 35)}%` }} />
          <div className="ml-auto h-2 rounded-full bg-[#E8E6E1]" style={{ width: "20%" }} />
        </div>
      ))}
    </div>
  );
}

// ── Sortable card ─────────────────────────────────────────────────────────────

function SortableCard({
  id,
  editMode,
  onHide,
  onResize,
  currentH,
  isDragging,
}: {
  id: string;
  editMode: boolean;
  onHide: (id: string) => void;
  onResize: (id: string, newH: number) => void;
  currentH: number;
  isDragging: boolean;
}) {
  const def = WIDGET_DEFS[id];
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const Icon = def?.icon ?? ShieldAlert;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    height: "100%",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#E8E6E1] bg-white"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        {/* Drag handle — edit mode only */}
        <AnimatePresence>
          {editMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 28, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-shrink-0 cursor-grab items-center justify-between overflow-hidden border-b border-[#F0EEE9] bg-transparent px-3 active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={14} className="text-[#c0bab2]" />
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onHide(id)}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-red-50"
              >
                <EyeOff size={11} className="text-[#94a3b8]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: (def?.accent ?? "#7c3aed") + "18" }}
            >
              <Icon size={14} style={{ color: def?.accent ?? "#7c3aed" }} />
            </div>
            <span className="text-[13px] font-semibold text-[#1a1a2e]">{def?.label ?? id}</span>
          </div>
          <MockRows count={Math.max(2, currentH)} accent={def?.accent ?? "#7c3aed"} />
        </div>

        {/* Resize handle — edit mode only */}
        {editMode && (
          <ResizeHandle
            id={id}
            currentH={currentH}
            minH={def?.minH ?? 2}
            onResize={onResize}
          />
        )}
      </div>
    </div>
  );
}

// ── Drag overlay ──────────────────────────────────────────────────────────────

function OverlayCard({ id, currentH }: { id: string; currentH: number }) {
  const def = WIDGET_DEFS[id];
  const Icon = def?.icon ?? ShieldAlert;
  const heightPx = currentH * ROW_HEIGHT + (currentH - 1) * GAP;
  return (
    <div
      className="overflow-hidden rounded-xl border border-[#E8E6E1] bg-white"
      style={{
        height: heightPx,
        boxShadow: "0 20px 40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.1)",
        transform: "scale(1.02)",
        opacity: 0.96,
      }}
    >
      <div className="flex h-7 items-center border-b border-[#F0EEE9] bg-transparent px-3">
        <GripVertical size={14} className="text-[#c0bab2]" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: (def?.accent ?? "#7c3aed") + "18" }}
          >
            <Icon size={14} style={{ color: def?.accent ?? "#7c3aed" }} />
          </div>
          <span className="text-[13px] font-semibold text-[#1a1a2e]">{def?.label ?? id}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GridDemoPage() {
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [heights, setHeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(WIDGET_DEFS).map(([k, v]) => [k, v.defaultH]))
  );
  const [editMode, setEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

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
    setActiveId(e.active.id as string);
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setOrder((prev) => {
        const from = prev.indexOf(active.id as string);
        const to = prev.indexOf(over.id as string);
        return arrayMove(prev, from, to);
      });
    }
  }, []);

  const handleResize = useCallback((id: string, newH: number) => {
    setHeights((prev) => ({ ...prev, [id]: newH }));
  }, []);

  const handleHide = useCallback((id: string) => setHiddenIds((p) => [...p, id]), []);
  const handleShow = useCallback((id: string) => setHiddenIds((p) => p.filter((h) => h !== id)), []);

  const COL_WIDTH = `calc(50% - ${GAP / 2}px)`;

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a2e]">Grid Prototype</h1>
          <p className="mt-0.5 text-[13px] text-[#94a3b8]">
            Drag to reorder · hover bottom edge to resize · bin-packing eliminates gaps
          </p>
        </div>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: editMode ? "#7c3aed" : "#1a1a2e" }}
        >
          {editMode ? "Done" : "Customise"}
        </button>
      </div>

      {/* Hidden tray */}
      <AnimatePresence>
        {editMode && hiddenIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 rounded-xl border border-[#E8E6E1] bg-white p-3"
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">
              Hidden — click to restore
            </p>
            <div className="flex flex-wrap gap-2">
              {hiddenIds.map((id) => (
                <button key={id} onClick={() => handleShow(id)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#F8F7F4] px-3 py-1.5 text-xs hover:bg-[#F0EEE9]"
                >
                  <Eye size={11} className="text-[#94a3b8]" />
                  {WIDGET_DEFS[id]?.label ?? id}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
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
                  left: col === 0 ? 0 : `calc(50% + ${GAP / 2}px)`,
                  top,
                  width: COL_WIDTH,
                  height,
                }}
              >
                <SortableCard
                  id={id}
                  editMode={editMode}
                  onHide={handleHide}
                  onResize={handleResize}
                  currentH={heights[id] ?? WIDGET_DEFS[id]?.defaultH ?? 3}
                  isDragging={activeId === id}
                />
              </motion.div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.25,0.46,0.45,0.94)" }}>
          {activeId ? (
            <OverlayCard id={activeId} currentH={heights[activeId] ?? WIDGET_DEFS[activeId]?.defaultH ?? 3} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
