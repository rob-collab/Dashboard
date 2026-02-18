"use client";

import { useState, useCallback } from "react";
import { Upload, AlertCircle, CheckCircle2, Download } from "lucide-react";
import Modal from "@/components/common/Modal";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";

interface ControlCSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ValidationResult {
  valid: boolean;
  rowCount: number;
  errors: { row: number; field: string; message: string }[];
  controls: { controlRef: string; controlName: string; businessArea: string; testResultCount: number; hasTestingSchedule: boolean }[];
}

export default function ControlCSVUploadDialog({
  open,
  onClose,
  onImportComplete,
}: ControlCSVUploadDialogProps) {
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawText((ev.target?.result as string) ?? "");
      setPreview(null);
      setImported(false);
    };
    reader.readAsText(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawText((ev.target?.result as string) ?? "");
      setPreview(null);
      setImported(false);
    };
    reader.readAsText(file);
  }, []);

  async function handlePreview() {
    setError(null);
    try {
      const result = await api<ValidationResult>("/api/controls/bulk-import", {
        method: "POST",
        body: { csv: rawText, preview: true },
      });
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    }
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const result = await api<{ created: number }>("/api/controls/bulk-import", {
        method: "POST",
        body: { csv: rawText },
      });
      setImported(true);
      setImportCount(result.created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    if (imported) onImportComplete();
    setRawText("");
    setPreview(null);
    setImported(false);
    setImportCount(0);
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Import Controls"
      size="xl"
      footer={
        <>
          {!imported && preview?.valid && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50"
            >
              <Upload size={14} />
              {importing ? "Importing..." : `Import ${preview.rowCount} Controls`}
            </button>
          )}
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {imported ? "Done" : "Cancel"}
          </button>
        </>
      }
    >
      {imported ? (
        <div className="text-center py-8">
          <CheckCircle2 size={48} className="mx-auto mb-3 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">Import Complete</h3>
          <p className="text-sm text-gray-500 mt-1">
            Successfully created {importCount} controls with their testing schedules and historical results.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-lg border border-updraft-pale-purple bg-updraft-pale-purple/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-updraft-deep">CSV Template</p>
              <p className="text-xs text-gray-500">Download the template with all fields and example data</p>
            </div>
            <a
              href="/controls-bulk-template.csv"
              download="controls-bulk-template.csv"
              className="inline-flex items-center gap-1.5 rounded-lg border border-updraft-bright-purple px-3 py-1.5 text-xs font-medium text-updraft-bright-purple hover:bg-updraft-pale-purple/40 transition-colors"
            >
              <Download size={13} />
              Download Template
            </a>
          </div>

          {/* File drop / paste area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="relative rounded-lg border-2 border-dashed border-gray-300 hover:border-updraft-light-purple transition-colors"
          >
            <textarea
              value={rawText}
              onChange={(e) => { setRawText(e.target.value); setPreview(null); setImported(false); }}
              placeholder="Paste CSV data here or drag & drop a .csv file..."
              className="w-full h-40 rounded-lg p-4 text-xs font-mono bg-transparent resize-none outline-none"
            />
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="absolute top-2 right-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs file:text-gray-600 file:cursor-pointer hover:file:bg-gray-200"
            />
          </div>

          {/* Validate button */}
          {rawText.trim() && !preview && (
            <button
              onClick={handlePreview}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Validate CSV
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle size={16} className="mt-0.5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Preview results */}
          {preview && (
            <div className="space-y-3">
              {/* Summary */}
              <div className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-3 border",
                preview.valid
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              )}>
                {preview.valid ? (
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-red-500 shrink-0" />
                )}
                <p className={cn("text-sm font-medium", preview.valid ? "text-green-700" : "text-red-700")}>
                  {preview.valid
                    ? `${preview.rowCount} controls ready to import`
                    : `${preview.errors.length} validation error${preview.errors.length > 1 ? "s" : ""} found`
                  }
                </p>
              </div>

              {/* Errors list */}
              {preview.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {preview.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs">
                      <span className="shrink-0 font-medium text-gray-500">Row {err.row}</span>
                      <span className="font-medium text-gray-700">{err.field}:</span>
                      <span className="text-red-600">{err.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Controls preview table */}
              {preview.valid && preview.controls.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500">
                        <th className="px-3 py-2 font-medium">Ref</th>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Business Area</th>
                        <th className="px-3 py-2 font-medium">Schedule</th>
                        <th className="px-3 py-2 font-medium">Test Results</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.controls.map((ctrl) => (
                        <tr key={ctrl.controlRef}>
                          <td className="px-3 py-2 font-mono font-medium text-updraft-deep">{ctrl.controlRef}</td>
                          <td className="px-3 py-2 text-gray-700">{ctrl.controlName}</td>
                          <td className="px-3 py-2 text-gray-500">{ctrl.businessArea}</td>
                          <td className="px-3 py-2">
                            {ctrl.hasTestingSchedule ? (
                              <span className="text-green-600">Yes</span>
                            ) : (
                              <span className="text-gray-400">No</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{ctrl.testResultCount} periods</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
