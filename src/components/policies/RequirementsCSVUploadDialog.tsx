"use client";

import { useState, useRef, useCallback } from "react";
import { FileUp, X, Upload, FileText, Download } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  policyId: string;
  policyReference: string;
}

export default function RequirementsCSVUploadDialog({ open, onClose, onImported, policyId, policyReference }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ created: number; total: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }
    setFile(f);
    setResult(null);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function downloadTemplate() {
    const headers = [
      "category",
      "description",
      "sectionName",
      "regulationReferences",
      "controlReferences",
      "notes",
    ];

    const examples = [
      [
        "Promotions Approval",
        "All financial promotions must be approved by an authorised person before publication",
        "Section 3 — Approval Process",
        "CU-0036;CU-0037",
        "CTRL-001;CTRL-002",
        "Includes digital, print, social media",
      ],
      [
        "Promotions Approval",
        "All financial promotions must be approved by an authorised person before publication",
        "Section 7 — Record Keeping",
        "CU-0036;CU-0039",
        "CTRL-001;CTRL-003",
        "",
      ],
      [
        "Content Standards",
        "Financial promotions must be fair, clear and not misleading",
        "",
        "CU-0036;CU-0040",
        "CTRL-004",
        "",
      ],
    ];

    const escapeCSV = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csv = [
      headers.join(","),
      ...examples.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${policyReference}-requirements-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const csvData = await file.text();
      const res = await api<{ created: number; total: number; errors: string[] }>("/api/policies/import", {
        method: "POST",
        body: { type: "obligations", data: csvData, policyId },
      });
      setResult(res);
      if (res.created > 0) {
        toast.success(`Imported ${res.created} requirement${res.created !== 1 ? "s" : ""}`);
        onImported();
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-updraft-deep font-poppins">Upload Requirements CSV</h2>
            <p className="text-xs text-gray-500 mt-0.5">Import requirements for {policyReference}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Template download */}
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors w-full justify-center"
          >
            <Download size={13} />
            Download Template CSV
          </button>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            Rows with the same <strong>category</strong> and <strong>description</strong> are merged into a single requirement
            with multiple sections. Leave <em>sectionName</em> empty for flat requirements.
          </p>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors",
              dragging
                ? "border-updraft-bright-purple bg-updraft-pale-purple/20"
                : file
                ? "border-green-300 bg-green-50"
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            )}
          >
            {file ? (
              <>
                <FileText size={24} className="text-green-600" />
                <p className="text-sm font-medium text-green-700">{file.name}</p>
                <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <Upload size={24} className="text-gray-400" />
                <p className="text-sm text-gray-600">
                  Drag and drop a CSV file, or <span className="text-updraft-bright-purple font-medium">browse</span>
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {file && (
            <button
              onClick={() => { setFile(null); setResult(null); }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Remove file
            </button>
          )}

          {/* Result */}
          {result && (
            <div className={cn("rounded-lg p-3 text-xs", result.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200")}>
              <p className="font-medium">{result.created} of {result.total} requirement{result.total !== 1 ? "s" : ""} imported</p>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-red-600 max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
            <button
              onClick={handleImport}
              disabled={importing || !file}
              className="inline-flex items-center gap-2 rounded-lg bg-updraft-deep px-4 py-2 text-sm font-medium text-white hover:bg-updraft-bar transition-colors disabled:opacity-50"
            >
              <FileUp size={14} />
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
