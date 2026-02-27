"use client";

import { useState, useCallback } from "react";
import Modal from "@/components/common/Modal";
import type { ImportedComponent } from "@/lib/types";

/** The subset of fields collected by the import dialogue. */
export type ImportedComponentPayload = Omit<
  ImportedComponent,
  "id" | "sanitized" | "createdBy" | "createdAt" | "creator" | "cssContent" | "jsContent"
>;

interface ImportComponentDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (component: ImportedComponentPayload) => void;
}

const CATEGORY_OPTIONS = [
  "Regulatory",
  "Finance",
  "Operations",
  "Risk",
  "Technology",
  "Consumer Duty",
  "Other",
];

export default function ImportComponentDialog({
  open,
  onClose,
  onImport,
}: ImportComponentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [htmlContent, setHtmlContent] = useState("");
  const [version, setVersion] = useState("1.0");

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setCategory(CATEGORY_OPTIONS[0]);
    setHtmlContent("");
    setVersion("1.0");
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim() || !htmlContent.trim()) return;

      onImport({
        name: name.trim(),
        description: description.trim(),
        category,
        htmlContent: htmlContent.trim(),
        version: version.trim() || "1.0",
      });

      resetForm();
      onClose();
    },
    [name, description, category, htmlContent, version, onImport, onClose, resetForm]
  );

  const isValid = name.trim().length > 0 && htmlContent.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Component"
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="import-component-form"
            disabled={!isValid}
            className="rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </>
      }
    >
      <form id="import-component-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="comp-name" className="mb-1 block text-sm font-medium text-gray-700">
            Name <span className="text-risk-red">*</span>
          </label>
          <input
            id="comp-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DPO Deep Dive Q2 2025"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="comp-desc" className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <input
            id="comp-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the component"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
          />
        </div>

        {/* Category & Version row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="comp-category" className="mb-1 block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="comp-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="comp-version" className="mb-1 block text-sm font-medium text-gray-700">
              Version
            </label>
            <input
              id="comp-version"
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
            />
          </div>
        </div>

        {/* HTML Content */}
        <div>
          <label htmlFor="comp-html" className="mb-1 block text-sm font-medium text-gray-700">
            HTML Content <span className="text-risk-red">*</span>
          </label>
          <textarea
            id="comp-html"
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="Paste your HTML here&hellip;"
            rows={10}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors resize-y"
          />
          <p className="mt-1 text-xs text-gray-400">
            Content will be sanitised before rendering. Scripts and forms are automatically stripped.
          </p>
        </div>
      </form>
    </Modal>
  );
}
