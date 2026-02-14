"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  X,
  Columns2,
  Columns3,
  Columns4,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Section, StyleConfig, LayoutConfig } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertiesPanelProps {
  section: Section;
  onUpdate: (data: Partial<Section>) => void;
  onClose: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Brand palette presets
// ---------------------------------------------------------------------------

const BRAND_PALETTE = [
  { label: "Deep Purple", value: "#311B92" },
  { label: "Bar Purple", value: "#673AB7" },
  { label: "Dark Purple", value: "#4A148C" },
  { label: "Bright Purple", value: "#7B1FA2" },
  { label: "Medium Purple", value: "#9C27B0" },
  { label: "Light Purple", value: "#BA68C8" },
  { label: "Pale Purple", value: "#E1BEE7" },
  { label: "Green", value: "#10B981" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Red", value: "#DC2626" },
  { label: "White", value: "#FFFFFF" },
  { label: "Light Gray", value: "#F3F4F6" },
  { label: "Gray", value: "#6B7280" },
  { label: "Dark Gray", value: "#374151" },
  { label: "Black", value: "#111827" },
];

const WIDTH_OPTIONS: { label: string; value: LayoutConfig["width"] }[] = [
  { label: "Full", value: "full" },
  { label: "Half", value: "half" },
  { label: "Third", value: "third" },
  { label: "Quarter", value: "quarter" },
];

const BORDER_STYLE_OPTIONS: { label: string; value: StyleConfig["borderStyle"] }[] = [
  { label: "None", value: "none" },
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
];

const BORDER_POSITION_OPTIONS: { label: string; value: StyleConfig["borderPosition"] }[] = [
  { label: "All", value: "all" },
  { label: "Left", value: "left" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
];

const SHADOW_LEVELS = [0, 1, 2, 3, 4, 5];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function widthIcon(width: LayoutConfig["width"]) {
  switch (width) {
    case "full":
      return <Square size={16} />;
    case "half":
      return <Columns2 size={16} />;
    case "third":
      return <Columns3 size={16} />;
    case "quarter":
      return <Columns4 size={16} />;
    default:
      return <Square size={16} />;
  }
}

// ---------------------------------------------------------------------------
// Collapsible section wrapper
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-colors"
      >
        {title}
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helper components
// ---------------------------------------------------------------------------

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
  max = 200,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PropertiesPanel({
  section,
  onUpdate,
  onClose,
}: PropertiesPanelProps) {
  const style = useMemo(() => section.styleConfig ?? ({} as StyleConfig), [section.styleConfig]);
  const layout = useMemo(() => section.layoutConfig ?? ({} as LayoutConfig), [section.layoutConfig]);

  // Convenience updaters
  const updateStyle = useCallback(
    (patch: Partial<StyleConfig>) => {
      onUpdate({ styleConfig: { ...style, ...patch } });
    },
    [style, onUpdate]
  );

  const updateLayout = useCallback(
    (patch: Partial<LayoutConfig>) => {
      onUpdate({ layoutConfig: { ...layout, ...patch } });
    },
    [layout, onUpdate]
  );

  const updatePadding = useCallback(
    (side: "top" | "right" | "bottom" | "left", value: number) => {
      const prev = style.padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
      updateStyle({ padding: { ...prev, [side]: value } });
    },
    [style.padding, updateStyle]
  );

  const updateMargin = useCallback(
    (side: "top" | "right" | "bottom" | "left", value: number) => {
      const prev = style.margin ?? { top: 0, right: 0, bottom: 0, left: 0 };
      updateStyle({ margin: { ...prev, [side]: value } });
    },
    [style.margin, updateStyle]
  );

  return (
    <aside className="w-72 border-l border-gray-200 bg-white overflow-y-auto flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">Properties</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ============================================================ */}
        {/* LAYOUT */}
        {/* ============================================================ */}
        <CollapsibleSection title="Layout">
          <div>
            <Label>Width</Label>
            <div className="grid grid-cols-4 gap-1">
              {WIDTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateLayout({ width: opt.value })}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors",
                    layout.width === opt.value
                      ? "border-updraft-bright-purple bg-updraft-pale-purple/30 text-updraft-bright-purple"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}
                >
                  {widthIcon(opt.value)}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Column Span</Label>
            <NumberInput
              value={layout.columnSpan ?? 1}
              onChange={(v) => updateLayout({ columnSpan: v })}
              min={1}
              max={12}
            />
          </div>
        </CollapsibleSection>

        {/* ============================================================ */}
        {/* BACKGROUND */}
        {/* ============================================================ */}
        <CollapsibleSection title="Background">
          <div>
            <Label>Colour</Label>
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {BRAND_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => updateStyle({ backgroundColor: c.value })}
                  title={c.label}
                  className={cn(
                    "h-7 w-7 rounded-md border-2 transition-transform hover:scale-110",
                    style.backgroundColor === c.value
                      ? "border-updraft-bright-purple ring-2 ring-updraft-light-purple/50"
                      : "border-gray-200"
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.backgroundColor ?? "#FFFFFF"}
                onChange={(e) =>
                  updateStyle({ backgroundColor: e.target.value })
                }
                className="h-8 w-8 cursor-pointer rounded border border-gray-200"
              />
              <input
                type="text"
                value={style.backgroundColor ?? ""}
                onChange={(e) =>
                  updateStyle({ backgroundColor: e.target.value })
                }
                placeholder="#FFFFFF"
                className="flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* ============================================================ */}
        {/* BORDER */}
        {/* ============================================================ */}
        <CollapsibleSection title="Border">
          <div>
            <Label>Style</Label>
            <div className="grid grid-cols-3 gap-1">
              {BORDER_STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateStyle({ borderStyle: opt.value })}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs transition-colors",
                    style.borderStyle === opt.value
                      ? "border-updraft-bright-purple bg-updraft-pale-purple/30 text-updraft-bright-purple"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Width</Label>
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={style.borderWidth ?? 0}
              onChange={(e) =>
                updateStyle({ borderWidth: Number(e.target.value) })
              }
              className="w-full accent-updraft-bright-purple"
            />
            <span className="text-xs text-gray-400">{style.borderWidth ?? 0}px</span>
          </div>

          <div>
            <Label>Colour</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.borderColor ?? "#E5E7EB"}
                onChange={(e) =>
                  updateStyle({ borderColor: e.target.value })
                }
                className="h-8 w-8 cursor-pointer rounded border border-gray-200"
              />
              <input
                type="text"
                value={style.borderColor ?? ""}
                onChange={(e) =>
                  updateStyle({ borderColor: e.target.value })
                }
                placeholder="#E5E7EB"
                className="flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
              />
            </div>
          </div>

          <div>
            <Label>Radius</Label>
            <input
              type="range"
              min={0}
              max={32}
              step={1}
              value={style.borderRadius ?? 0}
              onChange={(e) =>
                updateStyle({ borderRadius: Number(e.target.value) })
              }
              className="w-full accent-updraft-bright-purple"
            />
            <span className="text-xs text-gray-400">{style.borderRadius ?? 0}px</span>
          </div>

          <div>
            <Label>Position</Label>
            <div className="grid grid-cols-4 gap-1">
              {BORDER_POSITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateStyle({ borderPosition: opt.value })}
                  className={cn(
                    "rounded-md border px-1.5 py-1.5 text-[10px] transition-colors",
                    style.borderPosition === opt.value
                      ? "border-updraft-bright-purple bg-updraft-pale-purple/30 text-updraft-bright-purple"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* ============================================================ */}
        {/* SPACING */}
        {/* ============================================================ */}
        <CollapsibleSection title="Spacing">
          <div>
            <Label>Padding</Label>
            <div className="grid grid-cols-4 gap-2">
              {(["top", "right", "bottom", "left"] as const).map((side) => (
                <div key={side} className="text-center">
                  <span className="text-[10px] uppercase text-gray-400 block mb-0.5">
                    {side[0]}
                  </span>
                  <NumberInput
                    value={style.padding?.[side] ?? 0}
                    onChange={(v) => updatePadding(side, v)}
                    min={0}
                    max={100}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Margin</Label>
            <div className="grid grid-cols-4 gap-2">
              {(["top", "right", "bottom", "left"] as const).map((side) => (
                <div key={side} className="text-center">
                  <span className="text-[10px] uppercase text-gray-400 block mb-0.5">
                    {side[0]}
                  </span>
                  <NumberInput
                    value={style.margin?.[side] ?? 0}
                    onChange={(v) => updateMargin(side, v)}
                    min={0}
                    max={100}
                  />
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* ============================================================ */}
        {/* SHADOW */}
        {/* ============================================================ */}
        <CollapsibleSection title="Shadow" defaultOpen={false}>
          <div>
            <Label>Depth</Label>
            <div className="flex gap-1">
              {SHADOW_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => updateStyle({ shadowDepth: level })}
                  className={cn(
                    "flex-1 rounded-md border py-1.5 text-xs transition-colors",
                    (style.shadowDepth ?? 0) === level
                      ? "border-updraft-bright-purple bg-updraft-pale-purple/30 text-updraft-bright-purple"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* ============================================================ */}
        {/* IMAGE BLOCK CONTROLS (only visible for IMAGE_BLOCK sections) */}
        {/* ============================================================ */}
        {section.type === "IMAGE_BLOCK" && (
          <CollapsibleSection title="Image" defaultOpen={true}>
            <div>
              <Label>Alignment</Label>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { value: "left", icon: <AlignLeft size={14} />, label: "Left" },
                  { value: "center", icon: <AlignCenter size={14} />, label: "Centre" },
                  { value: "right", icon: <AlignRight size={14} />, label: "Right" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdate({ content: { ...section.content, alignment: opt.value } })}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-md border py-1.5 text-xs transition-colors",
                      (section.content?.alignment as string) === opt.value
                        ? "border-updraft-bright-purple bg-updraft-pale-purple/30 text-updraft-bright-purple"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Width {(section.content?.width as number) ? `${section.content.width}px` : "Auto"}</Label>
              <input
                type="range"
                min={100}
                max={1200}
                step={10}
                value={(section.content?.width as number) ?? 800}
                onChange={(e) =>
                  onUpdate({ content: { ...section.content, width: Number(e.target.value) } })
                }
                className="w-full accent-updraft-bright-purple"
              />
            </div>

            <div>
              <Label>Object Fit</Label>
              <div className="grid grid-cols-3 gap-1">
                {(["contain", "cover", "fill"] as const).map((fit) => (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => onUpdate({ content: { ...section.content, objectFit: fit } })}
                    className={cn(
                      "rounded-md border py-1.5 text-xs capitalize transition-colors",
                      (section.content?.objectFit as string) === fit
                        ? "border-updraft-bright-purple bg-updraft-pale-purple/30 text-updraft-bright-purple"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        )}
      </div>
    </aside>
  );
}
