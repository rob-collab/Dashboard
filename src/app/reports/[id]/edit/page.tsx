"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Eye,
  Send,
  Save,
  GripVertical,
  FileText,
  Table2,
  LayoutGrid,
  ShieldCheck,
  ChevronDown,
  Trash2,
  Type,
  BarChart3,
  ChevronsUpDown,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { demoSections, demoReports, demoOutcomes } from "@/lib/demo-data";
import SectionRenderer from "@/components/sections/SectionRenderer";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import PublishDialog from "@/components/reports/PublishDialog";
import { cn, generateId, statusColor, statusLabel } from "@/lib/utils";
import type { Section, SectionType } from "@/lib/types";

const SECTION_TYPES: { type: SectionType; label: string; icon: React.ReactNode }[] = [
  { type: "TEXT_BLOCK", label: "Text Block", icon: <Type size={16} /> },
  { type: "DATA_TABLE", label: "Data Table", icon: <Table2 size={16} /> },
  { type: "CARD_GRID", label: "Card Grid", icon: <LayoutGrid size={16} /> },
  { type: "CONSUMER_DUTY_DASHBOARD", label: "Consumer Duty", icon: <ShieldCheck size={16} /> },
  { type: "ACCORDION", label: "Accordion", icon: <ChevronsUpDown size={16} /> },
  { type: "CHART", label: "Chart", icon: <BarChart3 size={16} /> },
];

function defaultContent(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "TEXT_BLOCK":
      return { html: "<p>Start typing...</p>" };
    case "DATA_TABLE":
      return { headers: ["Column 1", "Column 2", "Column 3"], rows: [["", "", ""]] };
    case "CARD_GRID":
      return { cards: [{ icon: "BarChart3", title: "Stat", value: "0", subtitle: "Description" }] };
    case "ACCORDION":
      return { items: [{ title: "Section 1", content: "<p>Content here</p>" }] };
    default:
      return {};
  }
}

// Sortable sidebar item
function SortableSidebarItem({
  section,
  selected,
  onSelect,
  onDelete,
}: {
  section: Section;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer transition-colors",
        selected
          ? "bg-updraft-pale-purple/40 text-updraft-deep border border-updraft-light-purple"
          : "text-gray-600 hover:bg-gray-100 border border-transparent"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing shrink-0"
      >
        <GripVertical size={14} />
      </div>
      <span className="flex-1 truncate text-xs font-medium">
        {section.title || "Untitled"}
      </span>
      <span className="text-[9px] uppercase text-gray-400 shrink-0">
        {section.type.replace(/_/g, " ")}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-risk-red transition-all shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export default function ReportEditorPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const report = useMemo(
    () => demoReports.find((r) => r.id === reportId) ?? demoReports[0],
    [reportId]
  );

  const [sections, setSections] = useState<Section[]>(() =>
    demoSections.filter((s) => s.reportId === report.id).sort((a, b) => a.position - b.position)
  );
  const [selectedId, setSelectedId] = useState<string | null>(sections[0]?.id ?? null);
  const [showProperties, setShowProperties] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? null,
    [sections, selectedId]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      const result = [...prev];
      const [moved] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, moved);
      return result.map((s, i) => ({ ...s, position: i }));
    });
  }, []);

  const updateSection = useCallback((id: string, data: Partial<Section>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s))
    );
  }, []);

  const addSection = useCallback((type: SectionType) => {
    const newSection: Section = {
      id: `section-${generateId()}`,
      reportId: report.id,
      type,
      position: sections.length,
      title: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      content: defaultContent(type),
      layoutConfig: { width: "full", columnSpan: 12 },
      styleConfig: { borderRadius: 16, padding: { top: 24, right: 24, bottom: 24, left: 24 }, margin: { top: 0, right: 0, bottom: 16, left: 0 } },
      templateId: null,
      componentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSections((prev) => [...prev, newSection]);
    setSelectedId(newSection.id);
    setShowAddMenu(false);
  }, [report.id, sections.length]);

  const deleteSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) {
      setSelectedId(sections.find((s) => s.id !== id)?.id ?? null);
    }
  }, [selectedId, sections]);

  const handleSave = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-1.5rem)] -m-6">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-gray-900 font-poppins">
              {report.title} — {report.period}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusColor(report.status as "DRAFT" | "PUBLISHED" | "ARCHIVED"))}>
                {statusLabel(report.status as "DRAFT" | "PUBLISHED" | "ARCHIVED")}
              </span>
              <span className="text-xs text-gray-400">{sections.length} sections</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/${reportId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye size={14} />
            Preview
          </Link>
          <button
            onClick={handleSave}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              saved
                ? "border-risk-green bg-risk-green/10 text-risk-green"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            )}
          >
            <Save size={14} />
            {saved ? "Saved!" : "Save"}
          </button>
          <button
            onClick={() => setPublishOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-updraft-deep transition-colors"
          >
            <Send size={14} />
            Publish
          </button>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - section list */}
        <div className="w-60 border-r border-gray-200 bg-gray-50/50 flex flex-col shrink-0">
          <div className="px-3 py-3 border-b border-gray-200">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sections</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((section) => (
                  <SortableSidebarItem
                    key={section.id}
                    section={section}
                    selected={section.id === selectedId}
                    onSelect={() => {
                      setSelectedId(section.id);
                      setShowProperties(true);
                    }}
                    onDelete={() => deleteSection(section.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          {/* Add section */}
          <div className="relative px-2 py-2 border-t border-gray-200">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-updraft-light-purple bg-updraft-pale-purple/10 px-3 py-2 text-xs font-medium text-updraft-bright-purple hover:bg-updraft-pale-purple/30 transition-colors"
            >
              <Plus size={14} />
              Add Section
              <ChevronDown size={12} className={cn("transition-transform", showAddMenu && "rotate-180")} />
            </button>
            {showAddMenu && (
              <div className="absolute bottom-full left-2 right-2 mb-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20 animate-fade-in">
                <div className="py-1">
                  {SECTION_TYPES.map((st) => (
                    <button
                      key={st.type}
                      onClick={() => addSection(st.type)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-updraft-pale-purple/20 transition-colors"
                    >
                      <span className="text-updraft-bar">{st.icon}</span>
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center - content area */}
        <div className="flex-1 overflow-y-auto bg-bg-light p-6">
          {selectedSection ? (
            <div className="max-w-4xl mx-auto">
              <SectionRenderer
                section={selectedSection}
                editable={true}
                selected={true}
                onSelect={() => {}}
                onUpdate={(data) => updateSection(selectedSection.id, data)}
                onDelete={() => deleteSection(selectedSection.id)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">Select a section to edit</p>
                <p className="text-xs mt-1">Or add a new section from the sidebar</p>
              </div>
            </div>
          )}
        </div>

        {/* Right - properties panel */}
        {showProperties && selectedSection && (
          <PropertiesPanel
            section={selectedSection}
            onUpdate={(data) => updateSection(selectedSection.id, data)}
            onClose={() => setShowProperties(false)}
          />
        )}
      </div>

      {/* Publish dialog */}
      <PublishDialog
        report={report}
        sections={sections}
        outcomes={demoOutcomes}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublish={() => {
          setPublishOpen(false);
          router.push(`/reports/${reportId}`);
        }}
      />
    </div>
  );
}
