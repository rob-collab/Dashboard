"use client";

import { useState, useCallback, useMemo } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, PlusCircle } from "lucide-react";
import Modal from "@/components/common/Modal";
import { cn } from "@/lib/utils";
import { parseCSV, autoMapRiskColumns, validateRiskRow, type RiskRowValidation } from "@/lib/csv-utils";
import { api } from "@/lib/api-client";

interface RiskCSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function RiskCSVUploadDialog({
  open,
  onClose,
  onImportComplete,
}: RiskCSVUploadDialogProps) {
  const [rawText, setRawText] = useState("");
  const [previewData, setPreviewData] = useState<{
    results: Array<{
      rowIndex: number;
      errors: string[];
      risk?: { name: string; categoryL1: string; categoryL2: string; owner: string; inherentScore: number; residualScore: number; controlCount?: number; monthCount?: number };
    }>;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!rawText.trim()) return null;
    const { headers, rows } = parseCSV(rawText);
    const mapping = autoMapRiskColumns(headers);
    const validated: RiskRowValidation[] = rows.map((row, i) =>
      validateRiskRow(row, i, mapping)
    );
    return { headers, rows, mapping, validated };
  }, [rawText]);

  const validCount = parsed?.validated.filter((v) => v.errors.length === 0).length ?? 0;
  const errorCount = parsed?.validated.filter((v) => v.errors.length > 0).length ?? 0;

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawText((ev.target?.result as string) ?? "");
      setPreviewData(null);
      setImported(false);
      setError(null);
    };
    reader.readAsText(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawText((ev.target?.result as string) ?? "");
      setPreviewData(null);
      setImported(false);
      setError(null);
    };
    reader.readAsText(file);
  }, []);

  async function handlePreview() {
    if (!parsed) return;
    setError(null);
    setImporting(true);

    try {
      const rows = parsed.validated
        .filter((v) => v.errors.length === 0 && v.mapped)
        .map((v) => v.mapped!);

      const result = await api<{
        preview: boolean;
        results: Array<{
          rowIndex: number;
          errors: string[];
          risk?: { name: string; categoryL1: string; categoryL2: string; owner: string; inherentScore: number; residualScore: number; controlCount?: number; monthCount?: number };
        }>;
      }>("/api/risks/import", {
        method: "POST",
        body: { rows, preview: true },
      });

      setPreviewData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview import");
    } finally {
      setImporting(false);
    }
  }

  async function handleCommit() {
    if (!parsed) return;
    setError(null);
    setImporting(true);

    try {
      const rows = parsed.validated
        .filter((v) => v.errors.length === 0 && v.mapped)
        .map((v) => v.mapped!);

      const result = await api<{ committed: boolean; createdCount: number }>("/api/risks/import", {
        method: "POST",
        body: { rows, preview: false },
      });

      setCreatedCount(result.createdCount);
      setImported(true);
      onImportComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to commit import");
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setRawText("");
    setPreviewData(null);
    setImported(false);
    setError(null);
    onClose();
  }

  const previewValid = previewData?.results.filter((r) => r.errors.length === 0 && r.risk) ?? [];
  const previewErrors = previewData?.results.filter((r) => r.errors.length > 0).length ?? 0;

  const footer = (
    <>
      <button
        onClick={handleClose}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        {imported ? "Done" : "Cancel"}
      </button>
      {!imported && !previewData && (
        <button
          onClick={handlePreview}
          disabled={validCount === 0 || importing}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
            validCount > 0 && !importing
              ? "bg-updraft-bar hover:bg-updraft-deep"
              : "cursor-not-allowed bg-gray-300"
          )}
        >
          {importing ? "Loading..." : "Preview Import"}
        </button>
      )}
      {!imported && previewData && previewValid.length > 0 && (
        <button
          onClick={handleCommit}
          disabled={importing}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
            !importing
              ? "bg-updraft-bright-purple hover:bg-updraft-deep"
              : "cursor-not-allowed bg-gray-300"
          )}
        >
          <Upload size={15} />
          {importing ? "Importing..." : `Create ${previewValid.length} Risk${previewValid.length !== 1 ? "s" : ""}`}
        </button>
      )}
    </>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Risks from CSV"
      size="lg"
      footer={footer}
    >
      {imported ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 size={48} className="mb-3 text-risk-green" />
          <p className="text-lg font-semibold text-gray-900">Import Complete</p>
          <p className="text-sm text-gray-500 mt-1">
            {createdCount} risk{createdCount !== 1 ? "s" : ""} created with auto-generated references
          </p>
        </div>
      ) : previewData ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              Import Preview
            </h4>
            <button
              onClick={() => setPreviewData(null)}
              className="text-xs text-updraft-bright-purple hover:underline"
            >
              Back to upload
            </button>
          </div>

          {previewErrors > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 space-y-1">
              <p className="font-semibold">{previewErrors} row{previewErrors !== 1 ? "s" : ""} had errors and will be skipped:</p>
              {previewData.results
                .filter((r) => r.errors.length > 0)
                .map((r) => (
                  <div key={r.rowIndex} className="pl-2 border-l-2 border-red-300">
                    <span className="font-medium">Row {r.rowIndex + 1}:</span>{" "}
                    {r.errors.join(" | ")}
                  </div>
                ))}
            </div>
          )}

          {previewValid.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              No valid risks to import.
            </div>
          ) : (
            <div>
              <h5 className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                <PlusCircle size={12} />
                {previewValid.length} Risk{previewValid.length !== 1 ? "s" : ""} to Create
              </h5>
              <div className="max-h-52 overflow-auto rounded-lg border border-green-200 bg-green-50/30">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-green-50 sticky top-0">
                      <th className="border-b border-green-200 px-2 py-1.5 text-left font-semibold text-green-700">Name</th>
                      <th className="border-b border-green-200 px-2 py-1.5 text-left font-semibold text-green-700">Category</th>
                      <th className="border-b border-green-200 px-2 py-1.5 text-left font-semibold text-green-700">Owner</th>
                      <th className="border-b border-green-200 px-2 py-1.5 text-center font-semibold text-green-700">Inherent</th>
                      <th className="border-b border-green-200 px-2 py-1.5 text-center font-semibold text-green-700">Residual</th>
                      <th className="border-b border-green-200 px-2 py-1.5 text-center font-semibold text-green-700">Controls</th>
                      <th className="border-b border-green-200 px-2 py-1.5 text-center font-semibold text-green-700">History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewValid.map((r) => (
                      <tr key={r.rowIndex}>
                        <td className="border-b border-green-100 px-2 py-1 text-gray-700 font-medium">{r.risk!.name}</td>
                        <td className="border-b border-green-100 px-2 py-1 text-gray-600 text-[10px]">
                          {r.risk!.categoryL1}
                          <span className="text-gray-400"> / </span>
                          {r.risk!.categoryL2}
                        </td>
                        <td className="border-b border-green-100 px-2 py-1 text-gray-600">{r.risk!.owner}</td>
                        <td className="border-b border-green-100 px-2 py-1 text-center font-mono font-bold text-gray-700">{r.risk!.inherentScore}</td>
                        <td className="border-b border-green-100 px-2 py-1 text-center font-mono font-bold text-gray-700">{r.risk!.residualScore}</td>
                        <td className="border-b border-green-100 px-2 py-1 text-center text-gray-600">{r.risk!.controlCount || "—"}</td>
                        <td className="border-b border-green-100 px-2 py-1 text-center text-gray-600">{r.risk!.monthCount ? `${r.risk!.monthCount}mo` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* File drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-updraft-light-purple bg-updraft-pale-purple/10 p-8 cursor-pointer hover:bg-updraft-pale-purple/20 transition-colors"
            onClick={() => document.getElementById("risk-csv-input")?.click()}
          >
            <FileSpreadsheet size={32} className="mb-2 text-updraft-bar" />
            <p className="text-sm font-medium text-gray-700">Drop a CSV/TSV file here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">
              Required: Name, Description, Category L1, Category L2, Owner, Inherent L, Inherent I, Residual L, Residual I
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Optional: Controls (pipe-separated), Control Effectiveness, Risk Appetite, Direction of Travel
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              12-month history: add columns like &quot;Jan 25&quot;, &quot;Feb 25&quot;, etc. with Green/Yellow/Amber/Red values
            </p>
            <input
              id="risk-csv-input"
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Paste textarea */}
          <div>
            <label htmlFor="risk-csv-paste" className="block text-sm font-medium text-gray-700 mb-1">
              Or paste data
            </label>
            <textarea
              id="risk-csv-paste"
              rows={5}
              value={rawText}
              onChange={(e) => { setRawText(e.target.value); setPreviewData(null); setImported(false); }}
              placeholder={"Name,Description,Category L1,Category L2,Owner,Inherent L,Inherent I,Residual L,Residual I,Controls,Jan 25,Feb 25\nNew Risk,Description here,Operational Risk,People,Chris,4,3,2,2,\"Control A|Control B\",Green,Amber"}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-updraft-bar focus:outline-none focus:ring-2 focus:ring-updraft-pale-purple/40 transition-colors"
            />
          </div>

          {/* Parsed preview */}
          {parsed && parsed.validated.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">
                  Parsed ({parsed.validated.length} row{parsed.validated.length !== 1 ? "s" : ""})
                </h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-risk-green font-medium">{validCount} valid</span>
                  {errorCount > 0 && (
                    <span className="text-risk-red font-medium">{errorCount} error{errorCount !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
              <div className="max-h-36 overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 sticky top-0">
                      <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">Row</th>
                      {parsed.headers.slice(0, 6).map((h) => (
                        <th key={h} className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">{h}</th>
                      ))}
                      <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.validated.map((v) => (
                      <tr key={v.rowIndex} className={v.errors.length > 0 ? "bg-red-50/60" : "bg-green-50/40"}>
                        <td className="border-b border-gray-100 px-2 py-1 text-gray-400">{v.rowIndex + 1}</td>
                        {parsed.headers.slice(0, 6).map((h) => (
                          <td key={h} className="border-b border-gray-100 px-2 py-1 text-gray-700 max-w-[100px] truncate">
                            {v.row[h] ?? ""}
                          </td>
                        ))}
                        <td className="border-b border-gray-100 px-2 py-1">
                          {v.errors.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-600" title={v.errors.join("; ")}>
                              <AlertCircle size={12} />
                              {v.errors[0]}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                              <PlusCircle size={12} />
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
