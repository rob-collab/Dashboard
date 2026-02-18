"use client";

import { useState } from "react";
import { Copy, FileUp, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

const TEMPLATES: Record<string, string> = {
  policies: "name,description,ownerId,status,classification,reviewFrequencyDays,scope,applicability,relatedPolicies",
  regulations: "reference,name,shortName,body,type,provisions,url,description",
  obligations: "category,description,regulationRefs,controlRefs,notes",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  policyId?: string;
}

export default function CSVImportPanel({ open, onClose, onImported, policyId }: Props) {
  const [importType, setImportType] = useState<"policies" | "regulations" | "obligations">("policies");
  const [csvData, setCsvData] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; total: number; errors: string[] } | null>(null);

  if (!open) return null;

  async function handleImport() {
    if (!csvData.trim()) {
      toast.error("Please paste CSV data");
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const res = await api<{ created: number; total: number; errors: string[] }>("/api/policies/import", {
        method: "POST",
        body: { type: importType, data: csvData, ...(importType === "obligations" && policyId ? { policyId } : {}) },
      });
      setResult(res);
      if (res.created > 0) {
        toast.success(`Imported ${res.created} of ${res.total} records`);
        onImported();
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  }

  function copyTemplate() {
    navigator.clipboard.writeText(TEMPLATES[importType]);
    toast.success("Template copied to clipboard");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">CSV Import</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Import Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Import Type</label>
            <div className="flex gap-2">
              {(["policies", "regulations", "obligations"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setImportType(t); setResult(null); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    importType === t ? "bg-updraft-deep text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Template */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-600">CSV Template</label>
              <button onClick={copyTemplate} className="inline-flex items-center gap-1 text-[10px] text-updraft-bright-purple hover:underline">
                <Copy size={10} /> Copy
              </button>
            </div>
            <pre className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 overflow-x-auto">{TEMPLATES[importType]}</pre>
          </div>

          {/* Paste Area */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Paste CSV Data</label>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={8}
              placeholder="Paste your CSV data here..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
            />
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-3 text-xs ${result.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
              <p className="font-medium">{result.created} of {result.total} records imported successfully</p>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-red-600">
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
            <button
              onClick={handleImport}
              disabled={importing || !csvData.trim()}
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
