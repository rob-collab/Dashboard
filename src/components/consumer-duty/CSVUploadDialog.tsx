"use client";

import { useState, useCallback, useMemo } from "react";
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
import type { ConsumerDutyOutcome, ConsumerDutyMeasure } from "@/lib/types";
import { generateId, cn } from "@/lib/utils";
import {
  parseCSV,
  autoMapColumns,
  validateRow,
  type ColumnMapping,
  type RowValidation,
} from "@/lib/csv-utils";

type WizardStep = "upload" | "mapping" | "options" | "preview" | "done";

interface CSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (
    items: { outcomeId: string; measure: ConsumerDutyMeasure }[],
    mode?: "append" | "replace",
    affectedOutcomeIds?: string[]
  ) => void;
  outcomes: ConsumerDutyOutcome[];
}

const MAPPING_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: "measureId", label: "Measure ID", required: true },
  { key: "name", label: "Name", required: true },
  { key: "outcomeId", label: "Outcome", required: false },
  { key: "owner", label: "Owner", required: false },
  { key: "summary", label: "Summary", required: false },
  { key: "ragStatus", label: "RAG Status", required: false },
];

export default function CSVUploadDialog({
  open,
  onClose,
  onImport,
  outcomes,
}: CSVUploadDialogProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [rawText, setRawText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [defaultOutcomeId, setDefaultOutcomeId] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [importing, setImporting] = useState(false);

  const validOutcomeIds = useMemo(() => outcomes.map((o) => o.id), [outcomes]);

  const parsed = useMemo(() => {
    if (!rawText.trim()) return null;
    const result = parseCSV(rawText);
    return result;
  }, [rawText]);

  const validated = useMemo<RowValidation[]>(() => {
    if (!parsed) return [];
    return parsed.rows.map((row, i) => {
      const v = validateRow(row, i, mapping, validOutcomeIds, outcomes);
      // If no outcome matched and defaultOutcomeId is set, use it
      if (v.mapped && !v.mapped.outcomeId && defaultOutcomeId) {
        v.mapped.outcomeId = defaultOutcomeId;
      }
      // If still no outcome and outcome column was empty, mark missing
      if (v.mapped && !v.mapped.outcomeId) {
        return { ...v, errors: [...v.errors, "Missing Outcome (no default set)"], mapped: null };
      }
      return v;
    });
  }, [parsed, mapping, validOutcomeIds, outcomes, defaultOutcomeId]);

  const validCount = validated.filter((v) => v.errors.length === 0).length;
  const errorCount = validated.filter((v) => v.errors.length > 0).length;

  // Affected outcome IDs (for replace mode)
  const affectedOutcomeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const v of validated) {
      if (v.mapped?.outcomeId) ids.add(v.mapped.outcomeId);
    }
    return Array.from(ids);
  }, [validated]);

  function handleTextLoaded(text: string) {
    setRawText(text);
    const result = parseCSV(text);
    setHeaders(result.headers);
    const autoMapping = autoMapColumns(result.headers);
    setMapping(autoMapping);
    setDefaultOutcomeId(outcomes[0]?.id ?? "");
    setStep("mapping");
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
    [outcomes]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => handleTextLoaded((ev.target?.result as string) ?? "");
      reader.readAsText(file);
    },
    [outcomes]
  );

  function handlePasteConfirm() {
    if (!rawText.trim()) return;
    handleTextLoaded(rawText);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const validRows = validated.filter((v) => v.errors.length === 0 && v.mapped);
      const items = validRows.map((v) => {
        const m = v.mapped!;
        return {
          outcomeId: m.outcomeId,
          measure: {
            id: `measure-${generateId()}`,
            outcomeId: m.outcomeId,
            measureId: m.measureId,
            name: m.name,
            owner: m.owner || null,
            summary: m.summary,
            ragStatus: m.ragStatus,
            position: 0,
            lastUpdatedAt: new Date().toISOString(),
            metrics: [],
          } as ConsumerDutyMeasure,
        };
      });
      await onImport(items, importMode, importMode === "replace" ? affectedOutcomeIds : undefined);
      toast.success(`Successfully imported ${validRows.length} measure${validRows.length !== 1 ? "s" : ""}`, {
        description: importMode === "replace" ? "Replaced existing measures" : "Added to existing measures",
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
    setHeaders([]);
    setMapping({});
    setStep("upload");
    setImportMode("append");
    setSkipInvalid(true);
    onClose();
  }

  function updateMapping(field: keyof ColumnMapping, headerValue: string) {
    setMapping((prev) => ({ ...prev, [field]: headerValue || undefined }));
  }

  // Resolve outcome name for display
  function outcomeNameById(id: string): string {
    const o = outcomes.find((o) => o.id === id);
    return o ? `${o.outcomeId} — ${o.name}` : id;
  }

  /* ─────────────────── Step rendering ─────────────────── */

  function renderUpload() {
    return (
      <div className="space-y-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-updraft-light-purple bg-updraft-pale-purple/10 p-8 cursor-pointer hover:bg-updraft-pale-purple/20 transition-colors"
          onClick={() => document.getElementById("csv-file-input")?.click()}
        >
          <FileSpreadsheet size={32} className="mb-2 text-updraft-bar" />
          <p className="text-sm font-medium text-gray-700">
            Drop a CSV/TSV file here, or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-1">Supports .csv and .tsv files</p>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div>
          <label htmlFor="csv-paste" className="block text-sm font-medium text-gray-700 mb-1">
            Or paste data from Google Sheets
          </label>
          <textarea
            id="csv-paste"
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              "Measure ID\tName\tOutcome\tOwner\tSummary\tRAG\n1.1\tCustomer Needs Met\tProducts & Services\tash@updraft.com\tProducts meeting needs\tGreen"
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
      </div>
    );
  }

  function renderMapping() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Map your CSV columns to the required fields. Auto-detected mappings are pre-filled.
        </p>
        <div className="space-y-3">
          {MAPPING_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium text-gray-700 shrink-0">
                {field.label}
                {field.required && <span className="text-risk-red ml-0.5">*</span>}
              </label>
              <select
                value={mapping[field.key] ?? ""}
                onChange={(e) => updateMapping(field.key, e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
              >
                <option value="">— Not mapped —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderOptions() {
    return (
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Outcome
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Used for rows that don&apos;t specify an outcome
          </p>
          <select
            value={defaultOutcomeId}
            onChange={(e) => setDefaultOutcomeId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
          >
            <option value="">— None —</option>
            {outcomes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.outcomeId} — {o.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Import Mode
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="import-mode"
                value="append"
                checked={importMode === "append"}
                onChange={() => setImportMode("append")}
                className="mt-0.5 h-4 w-4 border-gray-300 text-updraft-bright-purple focus:ring-updraft-bar"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">Append new measures</span>
                <p className="text-xs text-gray-500">Add these measures alongside existing ones</p>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="import-mode"
                value="replace"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
                className="mt-0.5 h-4 w-4 border-gray-300 text-updraft-bright-purple focus:ring-updraft-bar"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">Replace all measures</span>
                <p className="text-xs text-gray-500">
                  Delete existing measures under matched outcomes, then import these
                </p>
              </div>
            </label>
          </div>
          {importMode === "replace" && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-risk-amber/10 border border-risk-amber/30 px-3 py-2">
              <AlertTriangle size={16} className="text-risk-amber shrink-0 mt-0.5" />
              <p className="text-xs text-risk-amber font-medium">
                This will permanently delete all existing measures under the matched outcomes before importing.
              </p>
            </div>
          )}
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
                  Name
                </th>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">
                  Outcome
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
                    {v.mapped?.measureId ?? "—"}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1 text-gray-700 max-w-[150px] truncate">
                    {v.mapped?.name ?? "—"}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1 text-gray-700 max-w-[150px] truncate">
                    {v.mapped?.outcomeId ? outcomeNameById(v.mapped.outcomeId) : "—"}
                  </td>
                  <td className="border-b border-gray-100 px-2 py-1">
                    {v.mapped?.ragStatus ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          v.mapped.ragStatus === "GOOD" && "bg-risk-green/10 text-risk-green",
                          v.mapped.ragStatus === "WARNING" && "bg-risk-amber/10 text-risk-amber",
                          v.mapped.ragStatus === "HARM" && "bg-risk-red/10 text-risk-red"
                        )}
                      >
                        {v.mapped.ragStatus === "GOOD"
                          ? "Green"
                          : v.mapped.ragStatus === "WARNING"
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
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={skipInvalid}
              onChange={(e) => setSkipInvalid(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bar"
            />
            Skip invalid rows and import only valid ones
          </label>
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
          {validCount} measure{validCount !== 1 ? "s" : ""} imported successfully
          {importMode === "replace" ? " (replaced)" : ""}
        </p>
      </div>
    );
  }

  /* ─────────────────── Step navigation ─────────────────── */

  const STEPS: WizardStep[] = ["upload", "mapping", "options", "preview", "done"];
  const stepIndex = STEPS.indexOf(step);

  const canGoNext = (() => {
    switch (step) {
      case "upload":
        return rawText.trim().length > 0;
      case "mapping":
        return !!(mapping.measureId && mapping.name);
      case "options":
        return true;
      case "preview":
        return validCount > 0;
      default:
        return false;
    }
  })();

  function goNext() {
    if (step === "preview") {
      handleImport();
      return;
    }
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev && prev !== "done") setStep(prev);
  }

  const stepLabels: Record<WizardStep, string> = {
    upload: "Upload",
    mapping: "Map Columns",
    options: "Options",
    preview: "Preview",
    done: "Done",
  };

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
        {step !== "upload" && (
          <button
            onClick={goBack}
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
        {step !== "upload" && (
          <button
            onClick={goNext}
            disabled={!canGoNext || importing}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
              canGoNext && !importing
                ? "bg-updraft-bright-purple hover:bg-updraft-deep"
                : "cursor-not-allowed bg-gray-300"
            )}
          >
            {importing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Importing...
              </>
            ) : step === "preview" ? (
              <>
                <Upload size={15} />
                Import {validCount} Measure{validCount !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                Next
                <ChevronRight size={14} />
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
      title="Import Measures from CSV"
      size="lg"
      footer={footer}
    >
      {/* Step indicator */}
      {step !== "done" && (
        <div className="flex items-center gap-2 mb-6">
          {STEPS.filter((s) => s !== "done").map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-4 bg-gray-200" />}
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  step === s
                    ? "bg-updraft-bright-purple text-white"
                    : stepIndex > i
                    ? "bg-updraft-pale-purple/40 text-updraft-bar"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {stepLabels[s]}
              </span>
            </div>
          ))}
        </div>
      )}

      {step === "upload" && renderUpload()}
      {step === "mapping" && renderMapping()}
      {step === "options" && renderOptions()}
      {step === "preview" && renderPreview()}
      {step === "done" && renderDone()}
    </Modal>
  );
}
