"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Blocks,
  Search,
  Plus,
  Eye,
  Code,
  Copy,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { sanitizeHTML } from "@/lib/sanitize";
import RoleGuard from "@/components/common/RoleGuard";
import ImportComponentDialog from "@/components/components-lib/ImportComponentDialog";
import type { ImportedComponentPayload } from "@/components/components-lib/ImportComponentDialog";
import { cn, formatDate } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit";

export default function ComponentsLibPage() {
  const components = useAppStore((s) => s.components);
  const users = useAppStore((s) => s.users);
  const addComponent = useAppStore((s) => s.addComponent);
  const deleteComponent = useAppStore((s) => s.deleteComponent);

  const [searchQuery, setSearchQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const filteredComponents = useMemo(() => {
    if (!searchQuery) return components;
    const q = searchQuery.toLowerCase();
    return components.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [searchQuery, components]);

  const selectedComponent = previewId
    ? components.find((c) => c.id === previewId) ?? null
    : null;

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleDuplicate = useCallback(
    (componentId: string) => {
      const source = components.find((c) => c.id === componentId);
      if (!source) return;

      const copy = {
        ...source,
        id: `component-${Date.now()}`,
        name: `${source.name} (Copy)`,
        createdAt: new Date().toISOString(),
      };
      delete copy.creator;
      addComponent(copy);
      logAuditEvent({ action: "duplicate_component", entityType: "component", entityId: copy.id, changes: { sourceComponent: source.name } });
    },
    [components, addComponent]
  );

  const handleDelete = useCallback(
    (componentId: string) => {
      const comp = components.find((c) => c.id === componentId);
      if (window.confirm("Are you sure you want to delete this component?")) {
        deleteComponent(componentId);
        logAuditEvent({ action: "delete_component", entityType: "component", entityId: componentId, changes: { name: comp?.name } });
        if (previewId === componentId) {
          setPreviewId(null);
        }
      }
    },
    [components, deleteComponent, previewId]
  );

  const handleImport = useCallback(
    (payload: ImportedComponentPayload) => {
      const sanitiseResult = sanitizeHTML(payload.htmlContent);
      const compId = `component-${Date.now()}`;
      addComponent({
        id: compId,
        name: payload.name,
        description: payload.description,
        category: payload.category,
        htmlContent: payload.htmlContent,
        cssContent: null,
        jsContent: null,
        version: payload.version,
        sanitized: sanitiseResult.safe,
        createdBy: "user-rob",
        createdAt: new Date().toISOString(),
      });
      logAuditEvent({ action: "import_component", entityType: "component", entityId: compId, changes: { name: payload.name, category: payload.category } });
    },
    [addComponent]
  );

  return (
    <RoleGuard allowedRoles={["CCRO_TEAM"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-updraft-pale-purple/40 p-2.5">
            <Blocks className="h-6 w-6 text-updraft-bright-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Component Library</h1>
            <p className="text-sm text-fca-gray mt-0.5">Imported HTML components for embedding in reports</p>
          </div>
        </div>
        <button
          onClick={() => setImportDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colours"
        >
          <Plus size={16} /> Import Component
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Total Components</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">{components.length}</p>
        </div>
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Sanitised</p>
          <p className="text-2xl font-bold text-risk-green mt-1">
            {components.filter((c) => c.sanitized).length}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Categories</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">
            {new Set(components.map((c) => c.category)).size}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colours"
        />
      </div>

      <div className="flex gap-6">
        {/* Component list */}
        <div className="flex-1 space-y-3">
          {filteredComponents.map((component) => {
            const creator = users.find((u) => u.id === component.createdBy);
            return (
              <div
                key={component.id}
                onClick={() => setPreviewId(component.id === previewId ? null : component.id)}
                className={cn(
                  "bento-card cursor-pointer transition-all hover:shadow-bento-hover hover:-translate-y-0.5",
                  previewId === component.id && "ring-2 ring-updraft-bright-purple/40"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 font-poppins">{component.name}</h3>
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        {component.category}
                      </span>
                      {component.sanitized ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-risk-green font-medium">
                          <CheckCircle size={10} /> Sanitised
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-risk-amber font-medium">
                          <AlertTriangle size={10} /> Unsanitised
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{component.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                      <span>v{component.version}</span>
                      <span>by {creator?.name ?? "Unknown"}</span>
                      <span>{formatDate(component.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewId(component.id);
                        setViewMode("preview");
                      }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colours"
                      title="Preview"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewId(component.id);
                        setViewMode("code");
                      }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colours"
                      title="View Code"
                    >
                      <Code size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(component.id);
                      }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colours"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(component.id);
                      }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-risk-red transition-colours"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredComponents.length === 0 && (
            <div className="bento-card text-center py-12">
              <Blocks size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No components found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or import a new component</p>
            </div>
          )}
        </div>

        {/* Preview panel */}
        {selectedComponent && (
          <div className="w-96 shrink-0">
            <div className="bento-card sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 font-poppins">{selectedComponent.name}</h3>
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colours",
                      viewMode === "preview"
                        ? "bg-updraft-pale-purple/40 text-updraft-deep"
                        : "text-gray-500"
                    )}
                  >
                    <Eye size={12} className="inline mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode("code")}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colours",
                      viewMode === "code"
                        ? "bg-updraft-pale-purple/40 text-updraft-deep"
                        : "text-gray-500"
                    )}
                  >
                    <Code size={12} className="inline mr-1" />
                    Code
                  </button>
                </div>
              </div>

              {viewMode === "preview" ? (
                <div
                  className="rounded-lg border border-gray-200 p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedComponent.htmlContent).html }}
                />
              ) : (
                <pre className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700 overflow-x-auto max-h-96 overflow-y-auto">
                  <code>{selectedComponent.htmlContent}</code>
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Import dialogue */}
      <ImportComponentDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImport}
      />
    </div>
    </RoleGuard>
  );
}
