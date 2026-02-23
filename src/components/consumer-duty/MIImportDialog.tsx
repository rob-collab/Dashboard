"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import Modal from "@/components/common/Modal";
import type { ConsumerDutyMeasure, ConsumerDutyMI, RAGStatus } from "@/lib/types";
import { generateId, cn } from "@/lib/utils";
import { parseCSV, normaliseRAG } from "@/lib/csv-utils";

type WizardStep = "upload" | "preview" | "done";

interface MIImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (updates: { measureId: string; metrics: ConsumerDutyMI[] }[], month?: string) => void;
  measures: ConsumerDutyMeasure[];
}

interface MIColumnMapping {
  measureId: string;
  metricName: string;
  currentValue: string;
  ragStatus: string;
}

interface ParsedMIRow {
  measureId: string;
  metricName: string;
  currentValue: string;
  ragStatus: RAGStatus;
}

interface RowValidation {
  rowIndex: number;
  errors: string[];
  parsed: ParsedMIRow | null;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString();
    const label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

export default function MIImportDialog({
  open,
  onClose,
  onImport,
  measures,
}: MIImportDialogProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [rawText, setRawText] = useState("");
  const [validated, setValidated] = useState<RowValidation[]>([]);
  const [importing, setImporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const validCount = validated.filter((v) => v.errors.length === 0).length;
  const errorCount = validated.filter((v) => v.errors.length > 0).length;

  function handleTextLoaded(text: string) {
    setRawText(text);
    const { headers, rows } = parseCSV(text);

    // Auto-detect columns
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const mapping: Partial<MIColumnMapping> = {};

    for (const header of headers) {
      const norm = normalise(header);
      if (!mapping.measureId && ["measureid", "id", "measure"].includes(norm)) {
        mapping.measureId = header;
      }
      if (!mapping.metricName && ["metricname", "metric", "name"].includes(norm)) {
        mapping.metricName = header;
      }
      if (!mapping.currentValue && ["currentvalue", "current", "value"].includes(norm)) {
        mapping.currentValue = header;
      }
      if (!mapping.ragStatus && ["ragstatus", "rag", "status"].includes(norm)) {
        mapping.ragStatus = header;
      }
    }

    // Validate rows
    const validations: RowValidation[] = rows.map((row, idx) => {
      const errors: string[] = [];

      const measureId = row[mapping.measureId ?? ""] ?? "";
      const metricName = row[mapping.metricName ?? ""] ?? "";
      const currentValue = row[mapping.currentValue ?? ""] ?? "";
      const ragRaw = row[mapping.ragStatus ?? ""] ?? "";

      if (!measureId) errors.push("Missing Measure ID");
      if (!metricName) errors.push("Missing Metric Name");

      // Check if measure exists
      const measure = measures.find((m) => m.measureId === measureId);
      if (measureId && !measure) {
        errors.push(`Measure ${measureId} not found`);
      }

      const ragStatus = ragRaw ? normaliseRAG(ragRaw) : "GOOD";
      if (ragRaw && !ragStatus) errors.push(`Invalid RAG: ${ragRaw}`);

      if (errors.length > 0) {
        return { rowIndex: idx, errors, parsed: null };
      }

      return {
        rowIndex: idx,
        errors: [],
        parsed: {
          measureId,
          metricName,
          currentValue: currentValue || "",
          ragStatus: ragStatus ?? "GOOD",
        },
      };
    });

    setValidated(validations);
    setStep("preview");
  }

  const handleFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => handleTextLoaded((ev.target?.result as string) ?? "");
      reader.readAsText(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measures]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => handleTextLoaded((ev.target?.result as string) ?? "");
      reader.readAsText(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measures]
  );

  function handlePasteConfirm() {
    if (!rawText.trim()) return;
    handleTextLoaded(rawText);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const validRows = validated.filter((v) => v.errors.length === 0 && v.parsed);

      // Group by measure ID
      const byMeasure = new Map<string, ParsedMIRow[]>();
      for (const v of validRows) {
        if (!v.parsed) continue;
        const existing = byMeasure.get(v.parsed.measureId) ?? [];
        existing.push(v.parsed);
        byMeasure.set(v.parsed.measureId, existing);
      }

      // Build updates
      const updates = Array.from(byMeasure.entries()).map(([measureId, rows]) => {
        const measure = measures.find((m) => m.measureId === measureId)!;
        const metrics: ConsumerDutyMI[] = rows.map((r) => ({
          id: `mi-${generateId()}`,
          measureId: measure.id,
          metric: r.metricName,
          current: r.currentValue,
          previous: "",
          change: "",
          ragStatus: r.ragStatus,
          appetite: null,
          appetiteOperator: null,
          narrative: null,
        }));

        return { measureId: measure.id, metrics };
      });

      onImport(updates, selectedMonth || undefined);
      const totalMetrics = updates.reduce((sum, u) => sum + u.metrics.length, 0);
      toast.success(`Successfully imported ${totalMetrics} metric${totalMetrics !== 1 ? "s" : ""}`, {
        description: `Updated ${updates.length} measure${updates.length !== 1 ? "s" : ""}`,
      });
      setStep("done");
    } catch (error) {
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : "An error occurred during import",
      });
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setRawText("");
    setValidated([]);
    setSelectedMonth("");
    setStep("upload");
    onClose();
  }

  /* ─────────────────── Step rendering ─────────────────── */

  function renderUpload() {
    const monthOptions = getMonthOptions();
    return (
      <div className="space-y-4">
        {/* Month selector for historical imports */}
        <div>
          <label htmlFor="mi-month" className="block text-sm font-medium text-gray-700 mb-1">
            Import data for month
          </label>
          <select
            id="mi-month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
          >
            <option value="">Current month (default)</option>
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-updraft-light-purple bg-updraft-pale-purple/10 p-8 cursor-pointer hover:bg-updraft-pale-purple/20 transition-colors"
          onClick={() => document.getElementById("mi-file-input")?.click()}
        >
          <FileSpreadsheet size={32} className="mb-2 text-updraft-bar" />
          <p className="text-sm font-medium text-gray-700">
            Drop a CSV file here, or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Format: Measure ID, Metric Name, Current Value, RAG
          </p>
          <input
            id="mi-file-input"
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div>
          <label htmlFor="mi-paste" className="block text-sm font-medium text-gray-700 mb-1">
            Or paste data from Google Sheets
          </label>
          <textarea
            id="mi-paste"
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              "Measure ID\tMetric Name\tCurrent Value\tRAG\n1.1\tNet Promoter Score\t72\tGreen\n1.1\tAverage TrustPilot score\t4.5\tGreen"
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-updraft-bar focus:outline-none focus:ring-2 focus:ring-updraft-pale-purple/40 transition-colors"
          />
          {rawText.trim() && (
            <button
              onClick={handlePasteConfirm}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-updraft-deep transition-colors"
            >
              Continue
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> First import measures using the main CSV Import, then use this
            MI Import to add metrics to those measures.
          </p>
        </div>
      </div>
    );
  }

  function renderPreview() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">
            Preview ({validated.length} row{validated.length !== 1 ? "s" : ""})
          </h4>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-risk-green font-medium">{validCount} valid</span>
            {errorCount > 0 && (
              <span className="text-risk-red font-medium">
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="max-h-64 overflow-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 sticky top-0">
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">
                  Row
                </th>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">
                  Measure ID
                </th>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">
                  Metric Name
                </th>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">
                  Value
                </th>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">
                  RAG
                </th>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {validated.map((v) => (
                <tr
                  key={v.rowIndex}
                  className={v.errors.length > 0 ? "bg-red-50/60" : ""}
                >
                  <td className="border-b border-gray-100 px-2 py-1 text-gray-400">
                    {v.rowIndex + 1}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1 text-gray-700">
                    {v.parsed?.measureId ?? "—"}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1 text-gray-700 max-w-[200px] truncate">
                    {v.parsed?.metricName ?? "—"}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1 text-gray-700">
                    {v.parsed?.currentValue ?? "—"}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1">
                    {v.parsed?.ragStatus ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          v.parsed.ragStatus === "GOOD" && "bg-risk-green/10 text-risk-green",
                          v.parsed.ragStatus === "WARNING" &&
                            "bg-risk-amber/10 text-risk-amber",
                          v.parsed.ragStatus === "HARM" && "bg-risk-red/10 text-risk-red"
                        )}
                      >
                        {v.parsed.ragStatus === "GOOD"
                          ? "Green"
                          : v.parsed.ragStatus === "WARNING"
                          ? "Amber"
                          : "Red"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1">
                    {v.errors.length > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 text-red-600"
                        title={v.errors.join("; ")}
                      >
                        <AlertCircle size={12} />
                        {v.errors[0]}
                      </span>
                    ) : (
                      <span className="text-risk-green">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {errorCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-risk-amber/10 border border-risk-amber/30 px-3 py-2">
            <AlertTriangle size={16} className="text-risk-amber shrink-0 mt-0.5" />
            <p className="text-xs text-risk-amber font-medium">
              {errorCount} row{errorCount !== 1 ? "s" : ""} will be skipped. Only valid metrics
              will be imported.
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderDone() {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 size={48} className="mb-3 text-risk-green" />
        <p className="text-lg font-semibold text-gray-900">Import Complete</p>
        <p className="text-sm text-gray-500 mt-1">
          {validCount} metric{validCount !== 1 ? "s" : ""} imported successfully
        </p>
      </div>
    );
  }

  /* ─────────────────── Footer ─────────────────── */

  const footer =
    step === "done" ? (
      <button
        onClick={handleClose}
        className="rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
      >
        Done
      </button>
    ) : (
      <>
        {step === "preview" && (
          <button
            onClick={() => setStep("upload")}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ChevronLeft size={14} />
            Back
          </button>
        )}
        <button
          onClick={handleClose}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
        {step === "preview" && (
          <button
            onClick={handleImport}
            disabled={validCount === 0 || importing}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
              validCount > 0 && !importing
                ? "bg-updraft-bright-purple hover:bg-updraft-deep"
                : "cursor-not-allowed bg-gray-300"
            )}
          >
            {importing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={15} />
                Import {validCount} Metric{validCount !== 1 ? "s" : ""}
              </>
            )}
          </button>
        )}
      </>
    );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import MI Metrics"
      size="lg"
      footer={footer}
    >
      {step === "upload" && renderUpload()}
      {step === "preview" && renderPreview()}
      {step === "done" && renderDone()}
    </Modal>
  );
}
