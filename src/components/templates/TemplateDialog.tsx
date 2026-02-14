"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Save,
  Play,
  ChevronDown,
  Eye,
  FileText,
  Type,
  Hash,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import type { Template, Section, ContentField, SectionType } from "@/lib/types";
import { cn } from "@/lib/utils";

type DialogMode = "create" | "use";

interface TemplateDialogProps {
  mode: DialogMode;
  template: Template | null;
  section: Section | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: TemplateSaveData) => void;
}

export interface TemplateSaveData {
  mode: DialogMode;
  name: string;
  description: string;
  category: string;
  isGlobal: boolean;
  contentSchema: ContentField[];
  fieldValues: Record<string, string>;
  sectionType: SectionType;
}

const CATEGORIES = [
  "Consumer Duty",
  "Metrics",
  "Narrative",
  "Data",
  "General",
];

const FIELD_TYPE_ICONS: Record<ContentField["type"], typeof Type> = {
  text: Type,
  richtext: FileText,
  table: FileText,
  number: Hash,
  date: Calendar,
  rag: AlertCircle,
};

/** Auto-detect content fields from a section's content object. */
function detectContentFields(
  content: Record<string, unknown>
): ContentField[] {
  const fields: ContentField[] = [];
  for (const [key, value] of Object.entries(content)) {
    let type: ContentField["type"] = "text";
    if (typeof value === "string") {
      if (value.length > 200 || /<[^>]+>/.test(value)) {
        type = "richtext";
      } else {
        type = "text";
      }
    } else if (typeof value === "number") {
      type = "number";
    } else if (Array.isArray(value)) {
      type = "table";
    }
    fields.push({
      key,
      label: key
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim(),
      type,
      required: true,
      defaultValue: typeof value === "string" ? value : JSON.stringify(value),
    });
  }
  return fields;
}

export default function TemplateDialog({
  mode,
  template,
  section,
  open,
  onClose,
  onSave,
}: TemplateDialogProps) {
  // ---- Create mode state ----
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [category, setCategory] = useState(template?.category ?? CATEGORIES[0]);
  const [isGlobal, setIsGlobal] = useState(template?.isGlobal ?? false);

  // Auto-detected fields from section content (create mode)
  const detectedFields = useMemo(() => {
    if (mode === "create" && section) {
      return detectContentFields(section.content);
    }
    return template?.contentSchema ?? [];
  }, [mode, section, template]);

  const [contentSchema, setContentSchema] = useState<ContentField[]>(detectedFields);

  // ---- Use mode state ----
  const templateFields = template?.contentSchema ?? [];
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    templateFields.forEach((field) => {
      initial[field.key] = field.defaultValue ?? "";
    });
    return initial;
  });

  const [showPreview, setShowPreview] = useState(false);

  const updateFieldValue = useCallback((key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleFieldRequired = useCallback((index: number) => {
    setContentSchema((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, required: !f.required } : f
      )
    );
  }, []);

  const updateFieldLabel = useCallback((index: number, label: string) => {
    setContentSchema((prev) =>
      prev.map((f, i) => (i === index ? { ...f, label } : f))
    );
  }, []);

  const canSave =
    mode === "create"
      ? name.trim().length > 0
      : templateFields.every(
          (f) => !f.required || (fieldValues[f.key] ?? "").trim().length > 0
        );

  function handleSave() {
    onSave({
      mode,
      name,
      description,
      category,
      isGlobal,
      contentSchema: mode === "create" ? contentSchema : templateFields,
      fieldValues,
      sectionType: mode === "create"
        ? section?.type ?? "TEXT_BLOCK"
        : template?.sectionType ?? "TEXT_BLOCK",
    });
  }

  // ---- Render ----
  const title =
    mode === "create" ? "Save as Template" : `Use Template: ${template?.name ?? ""}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      preventBackdropClose
      footer={
        <div className="flex w-full items-center justify-between">
          <div>
            {mode === "use" && (
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="inline-flex items-center gap-1.5 text-sm text-updraft-bar hover:text-updraft-bright-purple transition-colors"
              >
                <Eye size={14} />
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canSave}
              onClick={handleSave}
              iconLeft={mode === "create" ? <Save size={14} /> : <Play size={14} />}
            >
              {mode === "create" ? "Save Template" : "Use Template"}
            </Button>
          </div>
        </div>
      }
    >
      {mode === "create" ? (
        <CreateMode
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          category={category}
          setCategory={setCategory}
          isGlobal={isGlobal}
          setIsGlobal={setIsGlobal}
          contentSchema={contentSchema}
          onToggleRequired={toggleFieldRequired}
          onUpdateLabel={updateFieldLabel}
        />
      ) : (
        <UseMode
          fields={templateFields}
          values={fieldValues}
          onValueChange={updateFieldValue}
          showPreview={showPreview}
          template={template}
        />
      )}
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Create Mode                                                               */
/* -------------------------------------------------------------------------- */

interface CreateModeProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  isGlobal: boolean;
  setIsGlobal: (v: boolean) => void;
  contentSchema: ContentField[];
  onToggleRequired: (i: number) => void;
  onUpdateLabel: (i: number, label: string) => void;
}

function CreateMode({
  name,
  setName,
  description,
  setDescription,
  category,
  setCategory,
  isGlobal,
  setIsGlobal,
  contentSchema,
  onToggleRequired,
  onUpdateLabel,
}: CreateModeProps) {
  return (
    <div className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Template Name <span className="text-risk-red">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Consumer Duty Summary Card"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-updraft-light-purple focus:ring-2 focus:ring-updraft-light-purple/30 outline-none transition-shadow"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Brief description of this template..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-updraft-light-purple focus:ring-2 focus:ring-updraft-light-purple/30 outline-none transition-shadow resize-none"
        />
      </div>

      {/* Category + Visibility */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-gray-900 focus:border-updraft-light-purple focus:ring-2 focus:ring-updraft-light-purple/30 outline-none transition-shadow"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Visibility
          </label>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsGlobal(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                isGlobal
                  ? "border-updraft-bar bg-updraft-pale-purple/30 text-updraft-deep"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              )}
            >
              Global
            </button>
            <button
              type="button"
              onClick={() => setIsGlobal(false)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                !isGlobal
                  ? "border-updraft-bar bg-updraft-pale-purple/30 text-updraft-deep"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              )}
            >
              Personal
            </button>
          </div>
        </div>
      </div>

      {/* Detected placeholder fields */}
      {contentSchema.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detected Content Fields ({contentSchema.length})
          </label>
          <p className="text-xs text-gray-500 mb-3">
            These fields were auto-detected from the section content and will
            become template placeholders.
          </p>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {contentSchema.map((field, i) => {
              const Icon = FIELD_TYPE_ICONS[field.type] ?? Type;
              return (
                <div
                  key={field.key}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <Icon size={14} className="shrink-0 text-updraft-bar" />
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => onUpdateLabel(i, e.target.value)}
                    className="flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none"
                  />
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-500 uppercase">
                    {field.type}
                  </span>
                  <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required ?? false}
                      onChange={() => onToggleRequired(i)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-updraft-bar focus:ring-updraft-light-purple"
                    />
                    Required
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Use Mode                                                                  */
/* -------------------------------------------------------------------------- */

interface UseModeProps {
  fields: ContentField[];
  values: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  showPreview: boolean;
  template: Template | null;
}

function UseMode({
  fields,
  values,
  onValueChange,
  showPreview,
  template,
}: UseModeProps) {
  return (
    <div className="space-y-5">
      {/* Template info */}
      {template && (
        <div className="rounded-lg border border-updraft-pale-purple bg-updraft-pale-purple/10 px-4 py-3">
          <p className="text-sm font-medium text-updraft-deep">
            {template.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {template.description || "No description provided."}
          </p>
        </div>
      )}

      {/* Fields */}
      {fields.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          This template has no configurable fields.
        </p>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-800">
            Template Fields
          </h3>
          {fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              onChange={(v) => onValueChange(field.key, v)}
            />
          ))}
        </div>
      )}

      {/* Preview */}
      {showPreview && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Preview</h3>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 min-h-[120px]">
            {fields.map((field) => {
              const val = values[field.key];
              return (
                <div key={field.key} className="mb-3 last:mb-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {field.label}
                  </span>
                  {field.type === "richtext" ? (
                    <div
                      className="prose prose-sm max-w-none mt-1 text-sm text-gray-700"
                      dangerouslySetInnerHTML={{ __html: val || "<em>Empty</em>" }}
                    />
                  ) : (
                    <p className="mt-0.5 text-sm text-gray-700">
                      {val || <span className="italic text-gray-400">Empty</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Field Input Renderer                                                      */
/* -------------------------------------------------------------------------- */

interface FieldInputProps {
  field: ContentField;
  value: string;
  onChange: (v: string) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  const baseInputClasses =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-updraft-light-purple focus:ring-2 focus:ring-updraft-light-purple/30 outline-none transition-shadow";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-risk-red ml-0.5">*</span>}
      </label>

      {field.type === "richtext" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          className={cn(baseInputClasses, "resize-none")}
        />
      ) : field.type === "number" ? (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={baseInputClasses}
        />
      ) : field.type === "date" ? (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        />
      ) : field.type === "rag" ? (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(baseInputClasses, "appearance-none pr-8")}
          >
            <option value="">Select status...</option>
            <option value="GOOD">Good</option>
            <option value="WARNING">Warning</option>
            <option value="HARM">Harm</option>
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          className={baseInputClasses}
        />
      )}
    </div>
  );
}
