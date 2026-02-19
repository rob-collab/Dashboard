"use client";

import { useState, useMemo } from "react";
import { Upload, X, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Regulation, Applicability, ComplianceStatus } from "@/lib/types";

interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface RegulationDiff {
  id: string;
  reference: string;
  name: string;
  changes: FieldChange[];
}

// Editable CSV columns in order
const CSV_FIELDS = [
  "id",
  "reference",
  "parentReference",
  "level",
  "name",
  "shortName",
  "regulatoryBody",
  "type",
  "description",
  "provisions",
  "url",
  "applicability",
  "applicabilityNotes",
  "isApplicable",
  "isActive",
  "primarySMF",
  "secondarySMF",
  "smfNotes",
  "complianceStatus",
  "assessmentNotes",
] as const;

// Human-readable labels
const FIELD_LABELS: Record<string, string> = {
  reference: "Reference",
  parentReference: "Parent Reference",
  level: "Level",
  name: "Name",
  shortName: "Short Name",
  regulatoryBody: "Regulatory Body",
  type: "Type",
  description: "Description",
  provisions: "Provisions",
  url: "URL",
  applicability: "Applicability",
  applicabilityNotes: "Applicability Notes",
  isApplicable: "Is Applicable",
  isActive: "Is Active",
  primarySMF: "Primary SMF",
  secondarySMF: "Secondary SMF",
  smfNotes: "SMF Notes",
  complianceStatus: "Compliance Status",
  assessmentNotes: "Assessment Notes",
};

const VALID_APPLICABILITY = ["CORE", "HIGH", "MEDIUM", "LOW", "N_A", "ASSESS"];
const VALID_COMPLIANCE_STATUS = ["COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT", "NOT_ASSESSED", "GAP_IDENTIFIED"];
const VALID_TYPES = ["HANDBOOK_RULE", "PRINCIPLE", "LEGISLATION", "STATUTORY_INSTRUMENT", "GUIDANCE", "INDUSTRY_CODE"];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header — handle quoted fields
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });
}

function normalise(value: string | null | undefined | boolean): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}

export default function RegulationCSVDialog({
  open,
  onClose,
  regulations,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  regulations: Regulation[];
  onImported: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [diffs, setDiffs] = useState<RegulationDiff[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());

  // Build a lookup by id
  const regById = useMemo(() => {
    const map = new Map<string, Regulation>();
    for (const r of regulations) map.set(r.id, r);
    return map;
  }, [regulations]);

  const regByRef = useMemo(() => {
    const map = new Map<string, Regulation>();
    for (const r of regulations) map.set(r.reference, r);
    return map;
  }, [regulations]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      analyseCSV(text);
    };
    reader.readAsText(file);
  }

  function handlePaste() {
    if (!csvText.trim()) {
      toast.error("Please paste CSV data first");
      return;
    }
    analyseCSV(csvText);
  }

  function analyseCSV(text: string) {
    setDiffs(null);
    setValidationErrors([]);

    const rows = parseCSV(text);
    if (rows.length === 0) {
      setValidationErrors(["No data rows found in CSV"]);
      return;
    }

    // Check required columns
    const firstRow = rows[0];
    if (!firstRow.id && !firstRow.reference) {
      setValidationErrors(["CSV must include an 'id' or 'reference' column to match regulations"]);
      return;
    }

    const errors: string[] = [];
    const changes: RegulationDiff[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header

      // Match to existing regulation
      let existing: Regulation | undefined;
      if (row.id) {
        existing = regById.get(row.id);
      }
      if (!existing && row.reference) {
        existing = regByRef.get(row.reference);
      }
      if (!existing) {
        errors.push(`Row ${rowNum}: Cannot find regulation with id="${row.id || ""}" or reference="${row.reference || ""}"`);
        continue;
      }

      // Validate enum fields
      if (row.applicability && !VALID_APPLICABILITY.includes(row.applicability)) {
        errors.push(`Row ${rowNum} (${existing.reference}): Invalid applicability "${row.applicability}". Must be one of: ${VALID_APPLICABILITY.join(", ")}`);
      }
      if (row.complianceStatus && !VALID_COMPLIANCE_STATUS.includes(row.complianceStatus)) {
        errors.push(`Row ${rowNum} (${existing.reference}): Invalid complianceStatus "${row.complianceStatus}". Must be one of: ${VALID_COMPLIANCE_STATUS.join(", ")}`);
      }
      if (row.type && !VALID_TYPES.includes(row.type)) {
        errors.push(`Row ${rowNum} (${existing.reference}): Invalid type "${row.type}". Must be one of: ${VALID_TYPES.join(", ")}`);
      }

      // Compare fields
      const fieldChanges: FieldChange[] = [];
      const editableFields = CSV_FIELDS.filter((f) => f !== "id" && f !== "parentReference" && f !== "level");

      for (const field of editableFields) {
        if (!(field in row)) continue; // Column not in CSV, skip

        const csvVal = normalise(row[field]);
        let existingVal: string;

        if (field === "isApplicable" || field === "isActive") {
          existingVal = normalise((existing as unknown as Record<string, unknown>)[field] as boolean);
        } else {
          existingVal = normalise((existing as unknown as Record<string, unknown>)[field] as string);
        }

        if (csvVal !== existingVal) {
          fieldChanges.push({
            field,
            oldValue: existingVal,
            newValue: csvVal,
          });
        }
      }

      if (fieldChanges.length > 0) {
        changes.push({
          id: existing.id,
          reference: row.reference || existing.reference,
          name: row.name || existing.name,
          changes: fieldChanges,
        });
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
    }
    setDiffs(changes);
    // Auto-expand first few
    setExpandedDiffs(new Set(changes.slice(0, 5).map((d) => d.id)));
  }

  async function applyChanges() {
    if (!diffs || diffs.length === 0) return;
    setImporting(true);
    try {
      const updates = diffs.map((d) => {
        const data: Record<string, unknown> = {};
        for (const change of d.changes) {
          if (change.field === "isApplicable" || change.field === "isActive") {
            data[change.field] = change.newValue === "true";
          } else {
            data[change.field] = change.newValue || null;
          }
        }
        return { id: d.id, ...data };
      });

      await api("/api/compliance/regulations", {
        method: "PATCH",
        body: { updates },
      });

      toast.success(`Updated ${diffs.length} regulation${diffs.length > 1 ? "s" : ""}`);
      onImported();
      onClose();
      setCsvText("");
      setDiffs(null);
    } catch (err) {
      toast.error("Import failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setImporting(false);
    }
  }

  const totalFieldChanges = diffs?.reduce((sum, d) => sum + d.changes.length, 0) ?? 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 font-poppins">Import Regulatory Universe CSV</h2>
            <p className="text-xs text-gray-500 mt-0.5">Upload an edited CSV to update regulation data. Changes will be previewed before applying.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Upload area */}
          {!diffs && (
            <>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-updraft-bright-purple/40 transition-colors">
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">Drop a CSV file or click to upload</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-updraft-pale-purple/40 file:text-updraft-deep hover:file:bg-updraft-pale-purple/60 cursor-pointer"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-gray-400">or paste CSV data</span></div>
              </div>

              <textarea
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-mono placeholder:text-gray-400 focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple/30 outline-none resize-none"
                rows={6}
                placeholder="Paste CSV content here..."
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />

              {csvText && (
                <button
                  onClick={handlePaste}
                  className="rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-semibold text-white hover:bg-updraft-deep transition-colors"
                >
                  Analyse Changes
                </button>
              )}
            </>
          )}

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">{validationErrors.length} validation error{validationErrors.length > 1 ? "s" : ""}</span>
              </div>
              <ul className="space-y-1 text-xs text-red-600 max-h-40 overflow-y-auto">
                {validationErrors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Change preview */}
          {diffs !== null && (
            <>
              {diffs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                  <p className="text-sm font-medium text-gray-700">No changes detected</p>
                  <p className="text-xs text-gray-500 mt-1">The CSV data matches the current regulation data.</p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold text-amber-700">
                        {diffs.length} regulation{diffs.length > 1 ? "s" : ""} will be updated ({totalFieldChanges} field change{totalFieldChanges > 1 ? "s" : ""})
                      </span>
                    </div>
                  </div>

                  {/* Toggle unchanged */}
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={showUnchanged} onChange={(e) => setShowUnchanged(e.target.checked)} className="rounded text-updraft-bright-purple" />
                    Show field details for all changes
                  </label>

                  {/* Changes list */}
                  <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                    {diffs.map((diff) => {
                      const isExpanded = expandedDiffs.has(diff.id) || showUnchanged;
                      return (
                        <div key={diff.id} className="rounded-lg border border-gray-200 overflow-hidden">
                          <button
                            onClick={() => setExpandedDiffs((prev) => {
                              const next = new Set(prev);
                              if (next.has(diff.id)) next.delete(diff.id);
                              else next.add(diff.id);
                              return next;
                            })}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-mono font-bold text-updraft-deep shrink-0">{diff.reference}</span>
                              <span className="text-sm text-gray-700 truncate">{diff.name}</span>
                            </div>
                            <span className="text-xs font-semibold text-amber-600 shrink-0 ml-2">
                              {diff.changes.length} change{diff.changes.length > 1 ? "s" : ""}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="px-4 py-2 space-y-1.5">
                              {diff.changes.map((change, ci) => (
                                <div key={ci} className="flex items-start gap-2 text-xs">
                                  <span className="font-medium text-gray-500 w-32 shrink-0 pt-0.5">{FIELD_LABELS[change.field] ?? change.field}</span>
                                  <div className="flex-1 min-w-0 flex items-start gap-1.5">
                                    <span className="text-red-600 line-through max-w-[45%] break-words">
                                      {change.oldValue || <span className="italic text-gray-400 no-underline">(empty)</span>}
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-gray-400 shrink-0 mt-0.5" />
                                    <span className="text-green-700 font-medium max-w-[45%] break-words">
                                      {change.newValue || <span className="italic text-gray-400 font-normal">(empty)</span>}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Reset button */}
              <button
                onClick={() => { setDiffs(null); setCsvText(""); setValidationErrors([]); }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Upload different file
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        {diffs && diffs.length > 0 && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-xl shrink-0">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={applyChanges}
              disabled={importing || validationErrors.length > 0}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
                importing || validationErrors.length > 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-updraft-bright-purple hover:bg-updraft-deep"
              )}
            >
              {importing ? "Applying..." : `Apply ${diffs.length} Update${diffs.length > 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
