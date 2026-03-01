"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ConsumerDutyMeasure,
  ConsumerDutyMI,
  RAGStatus,
  MIIndicatorType,
} from "@/lib/types";
import { MI_INDICATOR_TYPE_LABELS } from "@/lib/types";
import {
  cn,
  ragBgColor,
  ragLabel,
  ragLabelShort,
  calculateChange,
  suggestRAG,
} from "@/lib/utils";
import Modal from "@/components/common/Modal";
import GlossaryTooltip from "@/components/common/GlossaryTooltip";
import MetricDrillDown from "@/components/consumer-duty/MetricDrillDown";
import { useAppStore } from "@/lib/store";
import { TrendingUp, TrendingDown, Minus, Save, Target, Check, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */
interface MIModalProps {
  measure: ConsumerDutyMeasure | null;
  open: boolean;
  onClose: () => void;
  editable: boolean;
  isCCRO?: boolean;
  onSave?: (measureId: string, metrics: ConsumerDutyMI[]) => void;
  onSaveAppetite?: (miId: string, appetite: string | null, appetiteOperator: string | null) => void;
  onCreateAction?: (miId: string, metricName: string) => void;
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */
const RAG_OPTIONS: RAGStatus[] = ["GOOD", "WARNING", "HARM"];

const RAG_RADIO_STYLES: Record<RAGStatus, string> = {
  GOOD: "border-risk-green text-risk-green bg-risk-green/5",
  WARNING: "border-risk-amber text-risk-amber bg-risk-amber/5",
  HARM: "border-risk-red text-risk-red bg-risk-red/5",
};

const RAG_RADIO_ACTIVE: Record<RAGStatus, string> = {
  GOOD: "!bg-risk-green !text-white ring-2 ring-risk-green/30",
  WARNING: "!bg-risk-amber !text-white ring-2 ring-risk-amber/30",
  HARM: "!bg-risk-red !text-white ring-2 ring-risk-red/30",
};

function changeIcon(change: string) {
  const val = parseFloat(change);
  if (isNaN(val) || val === 0) return <Minus size={14} className="text-gray-400" />;
  if (val > 0) return <TrendingUp size={14} className="text-risk-green" />;
  return <TrendingDown size={14} className="text-risk-red" />;
}

function changeColor(change: string): string {
  const val = parseFloat(change);
  if (isNaN(val) || val === 0) return "text-gray-400";
  if (val > 0) return "text-risk-green";
  return "text-risk-red";
}

function parseNumeric(value: string): number | null {
  const num = parseFloat(value.replace(/[%,]/g, ""));
  return isNaN(num) ? null : num;
}

function appetiteMet(current: string, appetite: string, operator: string): boolean {
  const curr = parseNumeric(current);
  const target = parseNumeric(appetite);
  if (curr === null || target === null) return false;
  switch (operator) {
    case ">=": return curr >= target;
    case "<=": return curr <= target;
    case ">":  return curr > target;
    case "<":  return curr < target;
    case "==": return curr === target;
    default:   return false;
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function MIModal({
  measure,
  open,
  onClose,
  editable,
  isCCRO = false,
  onSave,
  onSaveAppetite,
  onCreateAction,
}: MIModalProps) {
  const users = useAppStore((s) => s.users);
  const [editedMetrics, setEditedMetrics] = useState<ConsumerDutyMI[]>([]);
  const [dirty, setDirty] = useState(false);
  const [drillDownMetric, setDrillDownMetric] = useState<ConsumerDutyMI | null>(null);

  /* Sync local state when measure changes */
  useEffect(() => {
    if (measure?.metrics) {
      setEditedMetrics(measure.metrics.map((m) => ({ ...m })));
      setDirty(false);
    }
  }, [measure]);

  /* Update a single metric field */
  const updateMetric = useCallback(
    (index: number, field: keyof ConsumerDutyMI, value: string) => {
      setEditedMetrics((prev) => {
        const next = prev.map((m, i) => {
          if (i !== index) return m;
          const updated = { ...m, [field]: value };
          /* Auto-calculate change when current value changes */
          if (field === "current") {
            updated.change = calculateChange(value, updated.previous);
          }
          return updated;
        });
        return next;
      });
      setDirty(true);
    },
    []
  );

  /* Update RAG for a metric */
  const updateRAG = useCallback((index: number, rag: RAGStatus) => {
    setEditedMetrics((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ragStatus: rag } : m))
    );
    setDirty(true);
  }, []);

  /* Auto-suggest RAG when current value changes */
  const autoSuggestRAG = useCallback(
    (index: number) => {
      const metric = editedMetrics[index];
      if (!metric) return;
      const change = calculateChange(metric.current, metric.previous);
      const suggested = suggestRAG(change);
      updateRAG(index, suggested);
    },
    [editedMetrics, updateRAG]
  );

  /* Save handler */
  const handleSave = useCallback(() => {
    if (measure && onSave) {
      onSave(measure.id, editedMetrics);
      setDirty(false);
    }
  }, [measure, editedMetrics, onSave]);

  if (!measure) return null;

  const metrics = editable ? editedMetrics : measure.metrics ?? [];

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={`${measure.measureId} - ${measure.name}`}
      size="xl"
      footer={
        editable ? (
          <>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
                dirty
                  ? "bg-updraft-bar hover:bg-updraft-bright-purple"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              <Save size={16} />
              Save Changes
            </button>
          </>
        ) : undefined
      }
    >
      {/* Measure summary */}
      <div className="mb-6 rounded-xl bg-updraft-pale-purple/10 border border-updraft-pale-purple/30 p-4">
        <p className="text-sm text-gray-600">{measure.summary}</p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              ragBgColor(measure.ragStatus)
            )}
          />
          <span className="text-xs font-medium text-gray-500">
            Overall status: {ragLabelShort(measure.ragStatus)}
          </span>
          {measure.owner?.name && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-500">
                Owner: {measure.owner.name}
              </span>
            </>
          )}
          {measure.lastUpdatedAt && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-500">
                Last updated: {new Date(measure.lastUpdatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {measure.updatedById && (() => {
                  const updater = users.find((u) => u.id === measure.updatedById);
                  return updater ? ` by ${updater.name}` : "";
                })()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Metrics table */}
      {metrics.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">
          No MI metrics recorded for this measure.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 text-left font-semibold text-gray-700">
                  Metric
                </th>
                <th className="pb-3 px-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Current
                </th>
                <th className="pb-3 px-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Previous
                </th>
                <th className="pb-3 px-3 text-right font-semibold text-gray-700">
                  Change
                </th>
                <th className="pb-3 px-3 text-center font-semibold text-gray-700 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <Target size={12} className="text-gray-400" />
                    Target
                  </span>
                </th>
                <th className="pb-3 pl-3 text-center font-semibold text-gray-700">
                  <GlossaryTooltip term="RAG">RAG</GlossaryTooltip>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metrics.map((metric, idx) => (
                <tr
                  key={metric.id}
                  className="group cursor-pointer hover:bg-updraft-pale-purple/10 transition-colors"
                  onClick={() => setDrillDownMetric(metric)}
                >
                  {/* Metric name + indicator type */}
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-800">{metric.metric}</div>
                    {editable ? (
                      <select
                        value={editedMetrics[idx]?.indicatorType ?? metric.indicatorType}
                        onChange={(e) => { e.stopPropagation(); updateMetric(idx, "indicatorType", e.target.value as MIIndicatorType); }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-600 focus:outline-none"
                      >
                        {(Object.keys(MI_INDICATOR_TYPE_LABELS) as MIIndicatorType[]).map((k) => (
                          <option key={k} value={k}>{MI_INDICATOR_TYPE_LABELS[k]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="mt-0.5 inline-block rounded bg-updraft-pale-purple/30 px-1.5 py-0.5 text-[9px] font-medium text-updraft-deep">
                        {MI_INDICATOR_TYPE_LABELS[metric.indicatorType ?? "LAGGING"]}
                      </span>
                    )}
                  </td>

                  {/* Current value */}
                  <td className="py-3 px-3 text-right">
                    {editable ? (
                      <input
                        type="text"
                        value={
                          editedMetrics[idx]
                            ? editedMetrics[idx].current
                            : metric.current
                        }
                        onChange={(e) =>
                          updateMetric(idx, "current", e.target.value)
                        }
                        onBlur={() => autoSuggestRAG(idx)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-24 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-right text-sm text-gray-800 focus:border-updraft-bar focus:ring-1 focus:ring-updraft-bar/30 focus:outline-none transition-colors"
                      />
                    ) : (
                      <span className="font-medium text-gray-800">
                        {metric.current}
                      </span>
                    )}
                  </td>

                  {/* Previous value */}
                  <td className="py-3 px-3 text-right text-gray-500">
                    {metric.previous}
                  </td>

                  {/* Change */}
                  <td className="py-3 px-3 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-medium",
                        changeColor(
                          editable && editedMetrics[idx]
                            ? editedMetrics[idx].change
                            : metric.change
                        )
                      )}
                    >
                      {changeIcon(
                        editable && editedMetrics[idx]
                          ? editedMetrics[idx].change
                          : metric.change
                      )}
                      {editable && editedMetrics[idx]
                        ? editedMetrics[idx].change || "--"
                        : metric.change || "--"}
                    </span>
                  </td>

                  {/* Target / appetite */}
                  <td className="py-3 px-3 text-center">
                    {metric.appetite && metric.appetiteOperator ? (
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <span className="text-[11px] font-mono text-gray-600 whitespace-nowrap">
                          {metric.appetiteOperator} {metric.appetite}
                        </span>
                        {(() => {
                          const met = appetiteMet(
                            editable && editedMetrics[idx] ? editedMetrics[idx].current : metric.current,
                            metric.appetite,
                            metric.appetiteOperator
                          );
                          return met ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-risk-green/10 text-risk-green px-1.5 py-0.5 text-[10px] font-semibold">
                              <Check size={9} />Met
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-risk-red/10 text-risk-red px-1.5 py-0.5 text-[10px] font-semibold">
                              <X size={9} />Missed
                            </span>
                          );
                        })()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300" title="Click row to set a target">—</span>
                    )}
                  </td>

                  {/* RAG status */}
                  <td className="py-3 pl-3">
                    {editable ? (
                      <div className="flex items-center justify-center gap-1">
                        {RAG_OPTIONS.map((rag) => {
                          const isActive =
                            (editedMetrics[idx]?.ragStatus ?? metric.ragStatus) ===
                            rag;
                          return (
                            <button
                              key={rag}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); updateRAG(idx, rag); }}
                              className={cn(
                                "rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-all duration-150",
                                RAG_RADIO_STYLES[rag],
                                isActive && RAG_RADIO_ACTIVE[rag]
                              )}
                              title={ragLabel(rag)}
                            >
                              {ragLabelShort(rag).charAt(0)}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            metric.ragStatus === "GOOD" &&
                              "bg-risk-green/15 text-risk-green",
                            metric.ragStatus === "WARNING" &&
                              "bg-risk-amber/10 text-risk-amber",
                            metric.ragStatus === "HARM" &&
                              "bg-risk-red/10 text-risk-red"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              ragBgColor(metric.ragStatus)
                            )}
                          />
                          {ragLabelShort(metric.ragStatus)}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unsaved changes indicator */}
      {editable && dirty && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-risk-amber/10 border border-risk-amber/30 px-3 py-2 text-xs text-risk-amber font-medium">
          <span className="h-2 w-2 rounded-full bg-risk-amber rag-pulse" />
          You have unsaved changes
        </div>
      )}

      {metrics.length > 0 && (
        <p className="mt-3 text-center text-xs text-gray-400">
          Click a metric row to view 12-month trend history and set targets
        </p>
      )}

    </Modal>

    {/* MetricDrillDown is rendered as a sibling, NOT inside Modal's children.
        Placing it inside would make it a descendant of the content div which has
        a CSS transform (from animate-slide-up-fade), creating a new containing
        block that traps fixed-position overlays within the content area. */}
    <MetricDrillDown
      metric={drillDownMetric}
      open={!!drillDownMetric}
      onClose={() => setDrillDownMetric(null)}
      isCCRO={isCCRO}
      onSaveAppetite={onSaveAppetite}
      onCreateAction={onCreateAction}
    />
    </>
  );
}
