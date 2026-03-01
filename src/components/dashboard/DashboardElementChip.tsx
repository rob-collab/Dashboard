"use client";

import { Eye, EyeOff, GripVertical } from "lucide-react";
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
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { DashboardElementDef } from "@/lib/types";

/* ── Inner element editor for Phase 1 sections ───────────────────────── */
export function SortableElementChip({
  id, label, isHidden, onToggleHidden,
}: { id: string; label: string; isHidden: boolean; onToggleHidden: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: DndCSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        isHidden
          ? "border-gray-200 bg-gray-50 text-gray-400 opacity-50"
          : "border-updraft-light-purple/40 bg-updraft-pale-purple/20 text-updraft-deep"
      )}
    >
      <span
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0 text-gray-400 hover:text-gray-600"
        title="Drag to reorder"
      >
        <GripVertical size={9} />
      </span>
      <span className="truncate max-w-[80px]">{label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
        className="shrink-0 hover:opacity-70 transition-opacity"
        title={isHidden ? "Show element" : "Hide element"}
      >
        {isHidden
          ? <EyeOff size={9} className="text-gray-400" />
          : <Eye size={9} className="text-updraft-bright-purple" />}
      </button>
    </div>
  );
}

export function InnerElementEditor({
  sectionKey, elements, elementOrder, hiddenElements, onOrderChange, onToggleHidden,
}: {
  sectionKey: string;
  elements: DashboardElementDef[];
  elementOrder: string[];
  hiddenElements: Set<string>;
  onOrderChange: (newOrder: string[]) => void;
  onToggleHidden: (compositeId: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = elementOrder.indexOf(active.id as string);
      const newIdx = elementOrder.indexOf(over.id as string);
      if (oldIdx !== -1 && newIdx !== -1) {
        onOrderChange(arrayMove(elementOrder, oldIdx, newIdx));
      }
    }
  }

  return (
    <div className="p-2 border-b border-updraft-light-purple/10 bg-updraft-pale-purple/5">
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Elements — drag to reorder, click eye to hide</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={elementOrder} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-1">
            {elementOrder.map((id) => {
              const def = elements.find((d) => d.id === id);
              if (!def) return null;
              const compositeId = `${sectionKey}:${id}`;
              return (
                <SortableElementChip
                  key={id}
                  id={id}
                  label={def.label}
                  isHidden={hiddenElements.has(compositeId)}
                  onToggleHidden={() => onToggleHidden(compositeId)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
