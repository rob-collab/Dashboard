"use client";

import { useState, useCallback, useMemo } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import type { ConsumerDutyOutcome, ConsumerDutyMeasure } from "@/lib/types";
import { generateId, cn } from "@/lib/utils";
import { parseCSV, autoMapColumns, validateRow, type RowValidation } from "@/lib/csv-utils";

interface CSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (items: { outcomeId: string; measure: ConsumerDutyMeasure }[]) => void;
  outcomes: ConsumerDutyOutcome[];
}

export default function CSVUploadDialog({
  open,
  onClose,
  onImport,
  outcomes,
}: CSVUploadDialogProps) {
  const [rawText, setRawText] = useState("");
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [imported, setImported] = useState(false);

  const validOutcomeIds = useMemo(
    () => outcomes.map((o) => o.id),
    [outcomes]
  );

  const parsed = useMemo(() => {
    if (!rawText.trim()) return null;
    const { headers, rows } = parseCSV(rawText);
    const mapping = autoMapColumns(headers);
    const validated: RowValidation[] = rows.map((row, i) =>
      validateRow(row, i, mapping, validOutcomeIds)
    );
    return { headers, rows, mapping, validated };
  }, [rawText, validOutcomeIds]);

  const validCount = parsed?.validated.filter((v) => v.errors.length === 0).length ?? 0;
  const errorCount = parsed?.validated.filter((v) => v.errors.length > 0).length ?? 0;

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawText((ev.target?.result as string) ?? "");
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
      setImported(false);
    };
    reader.readAsText(file);
  }, []);

  function handleImport() {
    if (!parsed) return;
    const validRows = parsed.validated.filter((v) => v.errors.length === 0 && v.mapped);
    const items = validRows.map((v) => {
      const m = v.mapped!;
      // Match outcome by ID or name
      const matchedOutcome = outcomes.find(
        (o) => o.id === m.outcomeId || o.outcomeId === m.outcomeId || o.name.toLowerCase() === m.outcomeId.toLowerCase()
      );
      return {
        outcomeId: matchedOutcome?.id ?? outcomes[0]?.id ?? "",
        measure: {
          id: `measure-${generateId()}`,
          outcomeId: matchedOutcome?.id ?? outcomes[0]?.id ?? "",
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
    onImport(items);
    setImported(true);
  }

  function handleClose() {
    setRawText("");
    setImported(false);
    onClose();
  }

  const footer = (
    <>
      <button
        onClick={handleClose}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        {imported ? "Done" : "Cancel"}
      </button>
      {!imported && (
        <button
          onClick={handleImport}
          disabled={validCount === 0}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
            validCount > 0
              ? "bg-updraft-bright-purple hover:bg-updraft-dark-purple"
              : "cursor-not-allowed bg-gray-300"
          )}
        >
          <Upload size={15} />
          Import {validCount} Measure{validCount !== 1 ? "s" : ""}
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
      {imported ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 size={48} className="mb-3 text-risk-green" />
          <p className="text-lg font-semibold text-gray-900">Import Complete</p>
          <p className="text-sm text-gray-500 mt-1">{validCount} measure{validCount !== 1 ? "s" : ""} imported successfully</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-updraft-light-purple bg-updraft-pale-purple/10 p-8 cursor-pointer hover:bg-updraft-pale-purple/20 transition-colors"
            onClick={() => document.getElementById("csv-file-input")?.click()}
          >
            <FileSpreadsheet size={32} className="mb-2 text-updraft-bar" />
            <p className="text-sm font-medium text-gray-700">Drop a CSV/TSV file here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Supports .csv and .tsv files</p>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Paste textarea */}
          <div>
            <label htmlFor="csv-paste" className="block text-sm font-medium text-gray-700 mb-1">
              Or paste data from Google Sheets
            </label>
            <textarea
              id="csv-paste"
              rows={6}
              value={rawText}
              onChange={(e) => { setRawText(e.target.value); setImported(false); }}
              placeholder={"Measure ID\tName\tOutcome\tOwner\tSummary\tRAG\n1.1\tCustomer Needs Met\toutcome-1\tash@updraft.com\tProducts meeting needs\tGood"}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-updraft-bar focus:outline-none focus:ring-2 focus:ring-updraft-pale-purple/40 transition-colors"
            />
          </div>

          {/* Preview table */}
          {parsed && parsed.validated.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">
                  Preview ({parsed.validated.length} row{parsed.validated.length !== 1 ? "s" : ""})
                </h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-risk-green font-medium">{validCount} valid</span>
                  {errorCount > 0 && (
                    <span className="text-risk-red font-medium">{errorCount} error{errorCount !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
              <div className="max-h-48 overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 sticky top-0">
                      <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">Row</th>
                      {parsed.headers.map((h) => (
                        <th key={h} className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">{h}</th>
                      ))}
                      <th className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.validated.map((v) => (
                      <tr
                        key={v.rowIndex}
                        className={v.errors.length > 0 ? "bg-red-50/60" : ""}
                      >
                        <td className="border-b border-gray-100 px-2 py-1 text-gray-400">{v.rowIndex + 1}</td>
                        {parsed.headers.map((h) => (
                          <td key={h} className="border-b border-gray-100 px-2 py-1 text-gray-700 max-w-[120px] truncate">
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
                            <span className="text-risk-green">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Skip invalid checkbox */}
              {errorCount > 0 && (
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-700 cursor-pointer">
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
          )}
        </div>
      )}
    </Modal>
  );
}
