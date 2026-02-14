"use client";

import { useState, useMemo } from "react";
import { LayoutTemplate, Search, Plus, Filter } from "lucide-react";
import { demoTemplates } from "@/lib/demo-data";
import TemplateCard from "@/components/templates/TemplateCard";
import { cn } from "@/lib/utils";

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const categories = useMemo(
    () => Array.from(new Set(demoTemplates.map((t) => t.category))),
    []
  );

  const filteredTemplates = useMemo(() => {
    let templates = demoTemplates;
    if (categoryFilter !== "ALL") {
      templates = templates.filter((t) => t.category === categoryFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return templates;
  }, [categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-updraft-pale-purple/40 p-2.5">
            <LayoutTemplate className="h-6 w-6 text-updraft-bright-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Section Templates</h1>
            <p className="text-sm text-fca-gray mt-0.5">Reusable layouts and content patterns for reports</p>
          </div>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors">
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Total Templates</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">{demoTemplates.length}</p>
        </div>
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Global Templates</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">
            {demoTemplates.filter((t) => t.isGlobal).length}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Categories</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">{categories.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          <Filter size={14} className="ml-2 text-gray-400" />
          <button
            onClick={() => setCategoryFilter("ALL")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              categoryFilter === "ALL"
                ? "bg-updraft-pale-purple/40 text-updraft-deep"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                categoryFilter === cat
                  ? "bg-updraft-pale-purple/40 text-updraft-deep"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onUse={() => {}}
            onEdit={() => {}}
            onDuplicate={() => {}}
            onDelete={() => {}}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="bento-card text-center py-12">
          <LayoutTemplate size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No templates found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search or create a new template</p>
        </div>
      )}
    </div>
  );
}
