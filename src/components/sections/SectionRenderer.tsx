"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Section } from "@/lib/types";
import TextBlock from "./TextBlock";
import DataTable from "./DataTable";
import CardGrid from "./CardGrid";
import AccordionSection from "./AccordionSection";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectionRendererProps {
  section: Section;
  editable: boolean;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (data: Partial<Section>) => void;
  onDelete: () => void;
  /** Attrs spread on to the wrapper for dnd-kit or similar */
  dragHandleProps?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Placeholder renderers for types that require separate pages / complex data
// ---------------------------------------------------------------------------

function PlaceholderBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-sm text-gray-400">
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner content switcher
// ---------------------------------------------------------------------------

function SectionContent({
  section,
  editable,
  onUpdate,
}: {
  section: Section;
  editable: boolean;
  onUpdate: (data: Partial<Section>) => void;
}) {
  const updateContent = useCallback(
    (content: Record<string, unknown>) => {
      onUpdate({ content });
    },
    [onUpdate]
  );

  switch (section.type) {
    case "TEXT_BLOCK":
      return (
        <TextBlock
          content={(section.content?.html as string) ?? ""}
          editable={editable}
          onChange={(html) => updateContent({ html })}
        />
      );

    case "DATA_TABLE":
      return (
        <DataTable
          content={{
            headers: (section.content?.headers as string[]) ?? [],
            rows: (section.content?.rows as string[][]) ?? [],
          }}
          editable={editable}
          onChange={(data) => updateContent(data as unknown as Record<string, unknown>)}
        />
      );

    case "CARD_GRID":
      return (
        <CardGrid
          content={{
            cards: (section.content?.cards as Array<{
              id: string;
              icon: string;
              title: string;
              value: string;
              subtitle: string;
            }>) ?? [],
          }}
          editable={editable}
          onChange={(data) => updateContent(data as unknown as Record<string, unknown>)}
        />
      );

    case "ACCORDION":
      return (
        <AccordionSection
          content={{
            items: (section.content?.items as Array<{
              id: string;
              title: string;
              content: string;
            }>) ?? [],
          }}
          editable={editable}
          onChange={(data) => updateContent(data as unknown as Record<string, unknown>)}
        />
      );

    case "CHART":
      return <PlaceholderBlock label="Chart section -- configure via chart editor" />;

    case "IMPORTED_COMPONENT":
      return (
        <PlaceholderBlock label="Imported Component -- rendered from component library" />
      );

    case "CONSUMER_DUTY_DASHBOARD":
      return (
        <PlaceholderBlock label="Consumer Duty Dashboard -- linked from outcomes" />
      );

    case "TEMPLATE_INSTANCE":
      return (
        <PlaceholderBlock label="Template Instance -- populated from template" />
      );

    default:
      return <PlaceholderBlock label={`Unknown section type: ${section.type}`} />;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SectionRenderer({
  section,
  editable,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  dragHandleProps,
}: SectionRendererProps) {
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(section.title ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus the title input when entering edit mode
  useEffect(() => {
    if (titleEditing && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [titleEditing]);

  // Sync title from props
  useEffect(() => {
    setTitleValue(section.title ?? "");
  }, [section.title]);

  const commitTitle = useCallback(() => {
    setTitleEditing(false);
    if (titleValue !== (section.title ?? "")) {
      onUpdate({ title: titleValue || null });
    }
  }, [titleValue, section.title, onUpdate]);

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      // Auto-dismiss confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }, [confirmDelete, onDelete]);

  // Build inline style from styleConfig
  const sectionStyle: React.CSSProperties = {};
  const sc = section.styleConfig;
  if (sc?.backgroundColor) sectionStyle.backgroundColor = sc.backgroundColor;
  if (sc?.borderStyle && sc.borderStyle !== "none") {
    const w = `${sc.borderWidth ?? 1}px`;
    const s = sc.borderStyle;
    const c = sc.borderColor ?? "#E5E7EB";
    const borderVal = `${w} ${s} ${c}`;
    if (!sc.borderPosition || sc.borderPosition === "all") {
      sectionStyle.border = borderVal;
    } else {
      const key = `border${sc.borderPosition.charAt(0).toUpperCase()}${sc.borderPosition.slice(1)}` as
        | "borderLeft"
        | "borderTop"
        | "borderBottom";
      sectionStyle[key] = borderVal;
    }
  }
  if (sc?.borderRadius) sectionStyle.borderRadius = sc.borderRadius;
  if (sc?.padding) {
    sectionStyle.padding = `${sc.padding.top}px ${sc.padding.right}px ${sc.padding.bottom}px ${sc.padding.left}px`;
  }
  if (sc?.margin) {
    sectionStyle.margin = `${sc.margin.top}px ${sc.margin.right}px ${sc.margin.bottom}px ${sc.margin.left}px`;
  }
  if (sc?.shadowDepth && sc.shadowDepth > 0) {
    const depth = sc.shadowDepth;
    sectionStyle.boxShadow = `0 ${depth * 2}px ${depth * 4}px rgba(0,0,0,${0.04 + depth * 0.02})`;
  }

  return (
    <div
      onClick={onSelect}
      style={sectionStyle}
      className={cn(
        "group relative rounded-lg transition-all",
        editable && "cursor-pointer",
        selected
          ? "ring-2 ring-updraft-bright-purple shadow-md"
          : editable && "hover:ring-1 hover:ring-updraft-pale-purple"
      )}
    >
      {/* Top bar: drag handle + title + delete */}
      {editable && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 border-b border-gray-100 rounded-t-lg",
            selected ? "bg-updraft-pale-purple/20" : "bg-gray-50/50"
          )}
        >
          {/* Drag handle */}
          <div
            {...(dragHandleProps as React.HTMLAttributes<HTMLDivElement>)}
            className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </div>

          {/* Editable title */}
          {titleEditing ? (
            <input
              ref={titleRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitleValue(section.title ?? "");
                  setTitleEditing(false);
                }
              }}
              className="flex-1 bg-transparent text-sm font-medium text-gray-700 outline-none border-b border-updraft-light-purple"
            />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTitleEditing(true);
              }}
              className="flex-1 text-left text-sm font-medium text-gray-700 hover:text-updraft-bright-purple transition-colors truncate"
            >
              {section.title || (
                <span className="italic text-gray-400">Untitled section</span>
              )}
            </button>
          )}

          {/* Section type badge */}
          <span className="text-[10px] uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
            {section.type.replace(/_/g, " ")}
          </span>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className={cn(
              "rounded-md p-1 transition-colors",
              confirmDelete
                ? "bg-red-100 text-red-600"
                : "text-gray-400 hover:bg-red-50 hover:text-red-500"
            )}
            title={confirmDelete ? "Click again to confirm deletion" : "Delete section"}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="p-4">
        <SectionContent
          section={section}
          editable={editable}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}
