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
  ImageIcon,
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
import { useAppStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
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
  { type: "IMAGE_BLOCK", label: "Image", icon: <ImageIcon size={16} /> },
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
    case "CHART":
      return { chartType: "bar", chartData: { labels: ["Q1", "Q2", "Q3", "Q4"], datasets: [{ label: "Performance", data: [65, 78, 82, 91], color: "#7B1FA2" }] } };
    case "IMAGE_BLOCK":
      return { src: "", alt: "", caption: "", width: null, alignment: "center", objectFit: "contain" };
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
  const storeReports = useAppStore((s) => s.reports);
  const storeSections = useAppStore((s) => s.sections);
  const storeOutcomes = useAppStore((s) => s.outcomes);
  const setStoreSections = useAppStore((s) => s.setSections);
  const updateReport = useAppStore((s) => s.updateReport);
  const addVersion = useAppStore((s) => s.addVersion);
  const storeVersions = useAppStore((s) => s.versions);
  const currentUser = useAppStore((s) => s.currentUser);
  const addAuditLog = useAppStore((s) => s.addAuditLog);

  const report = useMemo(
    () => storeReports.find((r) => r.id === reportId) ?? null,
    [storeReports, reportId]
  );

  const outcomes = useMemo(
    () => [...storeOutcomes].sort((a, b) => a.position - b.position),
    [storeOutcomes]
  );

  const [sections, setSections] = useState<Section[]>(() => {
    const found = storeReports.find((r) => r.id === reportId);
    if (!found) return [];
    return storeSections.filter((s) => s.reportId === found.id).sort((a, b) => a.position - b.position);
  });
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
    if (!over || active.id === over.id || !report) return;

    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      const result = [...prev];
      const [moved] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, moved);
      const reordered = result.map((s, i) => ({ ...s, position: i }));

      // Persist to API
      fetch(`/api/reports/${report.id}/sections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: reordered }),
      }).catch((err) => console.error("Failed to persist section order:", err));

      return reordered;
    });
  }, [report]);

  const updateSection = useCallback((id: string, data: Partial<Section>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s))
    );
  }, []);

  const addSection = useCallback((type: SectionType) => {
    if (!report) return;
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
  }, [report, sections.length]);

  const deleteSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) {
      setSelectedId(sections.find((s) => s.id !== id)?.id ?? null);
    }
  }, [selectedId, sections]);

  const handleSave = useCallback(() => {
    if (!report) return;
    // Merge editor sections into the global store
    const otherSections = storeSections.filter((s) => s.reportId !== report.id);
    setStoreSections([...otherSections, ...sections]);
    // Update report's updatedAt timestamp
    updateReport(report.id, { updatedAt: new Date().toISOString() });
    logAuditEvent({
      action: "save_report",
      entityType: "report",
      entityId: report.id,
      changes: { sectionCount: sections.length },
      reportId: report.id,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [report, sections, storeSections, setStoreSections, updateReport]);

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileText size={48} className="mb-4 text-gray-300" />
        <h1 className="text-xl font-bold text-gray-700 font-poppins">Report Not Found</h1>
        <p className="text-sm text-fca-gray mt-2">The report you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Link href="/reports" className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors">
          <ArrowLeft size={14} /> Back to Reports
        </Link>
      </div>
    );
  }

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
        outcomes={outcomes}
        versions={storeVersions.filter((v) => v.reportId === report.id)}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublish={(publishNote) => {
          // Save sections to store first
          const otherSections = storeSections.filter((s) => s.reportId !== report.id);
          setStoreSections([...otherSections, ...sections]);
          // Update report status
          updateReport(report.id, { status: "PUBLISHED", updatedAt: new Date().toISOString() });
          // Create version
          const existingVersions = storeVersions.filter((v) => v.reportId === report.id);
          const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map((v) => v.version)) + 1 : 1;
          addVersion({
            id: `version-${generateId()}`,
            reportId: report.id,
            version: nextVersion,
            snapshotData: { sections: sections.map((s) => ({ ...s })) },
            htmlExport: null,
            publishedBy: currentUser?.id ?? "unknown",
            publishedAt: new Date().toISOString(),
            publishNote: publishNote || null,
          });
          // Audit log
          addAuditLog({
            id: `log-${generateId()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser?.id ?? "unknown",
            userRole: currentUser?.role ?? "VIEWER",
            action: "publish_report",
            entityType: "report",
            entityId: report.id,
            changes: { version: nextVersion, note: publishNote },
            reportId: report.id,
            ipAddress: null,
            userAgent: null,
          });
          setPublishOpen(false);
          router.push(`/reports/${reportId}`);
        }}
      />
    </div>
  );
}
