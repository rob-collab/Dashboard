"use client";

import { useState, useMemo } from "react";
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
import { demoComponents, getDemoUser } from "@/lib/demo-data";
import { cn, formatDate } from "@/lib/utils";

export default function ComponentsLibPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");

  const filteredComponents = useMemo(() => {
    if (!searchQuery) return demoComponents;
    const q = searchQuery.toLowerCase();
    return demoComponents.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const selectedComponent = previewId
    ? demoComponents.find((c) => c.id === previewId) ?? null
    : null;

  return (
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
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors">
          <Plus size={16} /> Import Component
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Total Components</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">{demoComponents.length}</p>
        </div>
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Sanitized</p>
          <p className="text-2xl font-bold text-risk-green mt-1">
            {demoComponents.filter((c) => c.sanitized).length}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Categories</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">
            {new Set(demoComponents.map((c) => c.category)).size}
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
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
        />
      </div>

      <div className="flex gap-6">
        {/* Component list */}
        <div className="flex-1 space-y-3">
          {filteredComponents.map((component) => {
            const creator = getDemoUser(component.createdBy);
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
                          <CheckCircle size={10} /> Sanitized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-risk-amber font-medium">
                          <AlertTriangle size={10} /> Unsanitized
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
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
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
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      title="View Code"
                    >
                      <Code size={14} />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-risk-red transition-colors"
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
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
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
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
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
                  dangerouslySetInnerHTML={{ __html: selectedComponent.htmlContent }}
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
    </div>
  );
}
