"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Search, Plus, Filter } from "lucide-react";
import { useAppStore } from "@/lib/store";
import TemplateCard from "@/components/templates/TemplateCard";
import TemplateFormDialog from "@/components/templates/TemplateFormDialog";
import type { TemplateFormData } from "@/components/templates/TemplateFormDialog";
import type { Template } from "@/lib/types";
import { cn } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit";
import ConfirmDialog from "@/components/common/ConfirmDialog";

export default function TemplatesPanel() {
  const router = useRouter();
  const templates = useAppStore((s) => s.templates);
  const addTemplate = useAppStore((s) => s.addTemplate);
  const updateTemplate = useAppStore((s) => s.updateTemplate);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState<Template | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>(
    undefined
  );

  const categories = useMemo(
    () => Array.from(new Set(templates.map((t) => t.category))),
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (categoryFilter !== "ALL") {
      result = result.filter((t) => t.category === categoryFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [templates, categoryFilter, searchQuery]);

  // ---- Handlers ----

  const handleUse = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_template: Template) => {
      router.push("/reports/new");
    },
    [router]
  );

  const handleEdit = useCallback((template: Template) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  }, []);

  const handleDuplicate = useCallback(
    (template: Template) => {
      const duplicateId = `template-${Date.now()}`;
      const duplicate: Template = {
        ...template,
        id: duplicateId,
        name: `${template.name} (Copy)`,
        isGlobal: false,
        version: 1,
        createdAt: new Date().toISOString(),
      };
      addTemplate(duplicate);
      logAuditEvent({ action: "duplicate_template", entityType: "template", entityId: duplicateId, changes: { sourceTemplate: template.name } });
    },
    [addTemplate]
  );

  const handleDelete = useCallback(
    (template: Template) => {
      setPendingDeleteTemplate(template);
      setDeleteConfirmOpen(true);
    },
    []
  );

  const handleDeleteConfirmed = useCallback(() => {
    if (!pendingDeleteTemplate) return;
    setDeleteConfirmOpen(false);
    deleteTemplate(pendingDeleteTemplate.id);
    logAuditEvent({ action: "delete_template", entityType: "template", entityId: pendingDeleteTemplate.id, changes: { name: pendingDeleteTemplate.name } });
    setPendingDeleteTemplate(null);
  }, [pendingDeleteTemplate, deleteTemplate]);

  const handleCreateNew = useCallback(() => {
    setEditingTemplate(undefined);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditingTemplate(undefined);
  }, []);

  const handleDialogSave = useCallback(
    (data: TemplateFormData) => {
      if (editingTemplate) {
        updateTemplate(editingTemplate.id, {
          name: data.name,
          description: data.description,
          category: data.category,
          sectionType: data.sectionType,
        });
        logAuditEvent({ action: "update_template", entityType: "template", entityId: editingTemplate.id, changes: { name: data.name, category: data.category } });
      } else {
        const newId = `template-${Date.now()}`;
        const newTemplate: Template = {
          id: newId,
          name: data.name,
          description: data.description,
          category: data.category,
          thumbnailUrl: null,
          layoutConfig: {},
          styleConfig: {},
          contentSchema: [],
          sectionType: data.sectionType,
          createdBy: "user-rob",
          isGlobal: false,
          version: 1,
          createdAt: new Date().toISOString(),
        };
        addTemplate(newTemplate);
        logAuditEvent({ action: "create_template", entityType: "template", entityId: newId, changes: { name: data.name, category: data.category } });
      }
      handleDialogClose();
    },
    [editingTemplate, addTemplate, updateTemplate, handleDialogClose]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-updraft-pale-purple/40 p-2.5">
            <LayoutTemplate className="h-6 w-6 text-updraft-bright-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-updraft-deep font-poppins">
              Section Templates
            </h1>
            <p className="text-sm text-fca-gray mt-0.5">
              Reusable layouts and content patterns for reports
            </p>
          </div>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
        >
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Total Templates</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">
            {templates.length}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Global Templates</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">
            {templates.filter((t) => t.isGlobal).length}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Categories</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">
            {categories.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
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
            onUse={handleUse}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="bento-card text-center py-12">
          <LayoutTemplate
            size={48}
            className="mx-auto mb-3 text-gray-300"
          />
          <p className="text-sm font-medium text-gray-500">
            No templates found
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Try adjusting your search or create a new template
          </p>
        </div>
      )}

      {/* Create / Edit dialog */}
      <TemplateFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        template={editingTemplate}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirmed}
        title="Delete template"
        message={`Are you sure you want to delete "${pendingDeleteTemplate?.name ?? "this template"}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
