"use client";

import { useState, useRef } from "react";
import { Send, Paperclip, X } from "lucide-react";

interface ActionUpdateFormProps {
  actionId: string;
  onSubmit: (data: {
    updateText: string;
    evidenceUrl: string | null;
    evidenceName: string | null;
  }) => void;
  onCancel: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx";

export default function ActionUpdateForm({
  actionId,
  onSubmit,
  onCancel,
}: ActionUpdateFormProps) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      setFileData(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("Unsupported file type. Use PDF, PNG, JPG, DOCX, or XLSX.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File exceeds 5MB limit.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function removeFile() {
    setFileName(null);
    setFileData(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        updateText: text.trim(),
        evidenceUrl: fileData,
        evidenceName: fileName,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
      <div>
        <label htmlFor={`update-${actionId}`} className="block text-xs font-medium text-gray-700 mb-1">
          Progress Update
        </label>
        <textarea
          id={`update-${actionId}`}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe the progress or update..."
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors resize-none"
        />
      </div>

      {/* File upload */}
      <div>
        {fileName ? (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <Paperclip size={14} className="text-updraft-bright-purple shrink-0" />
            <span className="text-xs text-gray-700 truncate flex-1">{fileName}</span>
            <button type="button" onClick={removeFile} className="text-gray-400 hover:text-gray-600" aria-label="Remove file">
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-updraft-light-purple hover:text-updraft-deep cursor-pointer transition-colors">
            <Paperclip size={12} />
            Attach evidence
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
        {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
        <p className="text-[10px] text-gray-400 mt-1">PDF, PNG, JPG, DOCX, XLSX (max 5MB)</p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="inline-flex items-center gap-1 rounded-lg bg-updraft-bright-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={12} />
          {submitting ? "Submitting..." : "Submit Update"}
        </button>
      </div>
    </form>
  );
}
