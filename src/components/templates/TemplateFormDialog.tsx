"use client";

import { useState, useEffect } from "react";
import { Save, ChevronDown } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import type { Template, SectionType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TemplateFormData) => void;
  /** When provided the dialog opens in edit mode, pre-populated with existing values. */
  template?: Template;
}

export interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  sectionType: SectionType;
}

const CATEGORIES = [
  "Consumer Duty",
  "Metrics",
  "Narrative",
  "Data",
  "Analysis",
  "Stats",
  "General",
];

const SECTION_TYPE_OPTIONS: { value: SectionType; label: string }[] = [
  { value: "TEXT_BLOCK", label: "Text Block" },
  { value: "DATA_TABLE", label: "Data Table" },
  { value: "CARD_GRID", label: "Card Grid" },
  { value: "CONSUMER_DUTY_DASHBOARD", label: "Consumer Duty Dashboard" },
  { value: "ACCORDION", label: "Accordion" },
  { value: "CHART", label: "Chart" },
  { value: "IMPORTED_COMPONENT", label: "Imported Component" },
  { value: "TEMPLATE_INSTANCE", label: "Template Instance" },
];

export default function TemplateFormDialog({
  open,
  onClose,
  onSave,
  template,
}: TemplateFormDialogProps) {
  const isEditing = !!template;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [sectionType, setSectionType] = useState<SectionType>("TEXT_BLOCK");

  // Reset form whenever the dialog opens or the template changes
  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setDescription(template?.description ?? "");
      setCategory(template?.category ?? CATEGORIES[0]);
      setSectionType(template?.sectionType ?? "TEXT_BLOCK");
    }
  }, [open, template]);

  const canSave = name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      sectionType,
    });
  }

  const inputClasses =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-updraft-light-purple focus:ring-2 focus:ring-updraft-light-purple/30 outline-none transition-shadow";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Template" : "Create Template"}
      size="md"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              onSave({
                name: name.trim(),
                description: description.trim(),
                category,
                sectionType,
              });
            }}
            iconLeft={<Save size={14} />}
          >
            {isEditing ? "Update Template" : "Create Template"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-risk-red">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Consumer Duty Summary Card"
            className={inputClasses}
            autoFocus
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
            className={cn(inputClasses, "resize-none")}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(inputClasses, "appearance-none pr-8 bg-white")}
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

        {/* Section Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Section Type
          </label>
          <div className="relative">
            <select
              value={sectionType}
              onChange={(e) => setSectionType(e.target.value as SectionType)}
              className={cn(inputClasses, "appearance-none pr-8 bg-white")}
            >
              {SECTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
