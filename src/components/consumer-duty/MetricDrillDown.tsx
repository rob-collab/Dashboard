"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ConsumerDutyMI, MetricSnapshot } from "@/lib/types";
import { cn, ragBgColor, ragLabelShort } from "@/lib/utils";
import { api } from "@/lib/api-client";
import Modal from "@/components/common/Modal";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { Target, TrendingUp, TrendingDown, Minus, Save, FileText, Plus } from "lucide-react";

const RichTextEditor = dynamic(() => import("@/components/common/RichTextEditor"), { ssr: false });

interface MetricDrillDownProps {
  metric: ConsumerDutyMI | null;
  open: boolean;
  onClose: () => void;
  isCCRO: boolean;
  onSaveAppetite?: (
    miId: string,
    appetite: string | null,
    appetiteOperator: string | null
  ) => void;
  onCreateAction?: (miId: string, metricName: string) => void;
}

const OPERATORS = [">=", "<=", ">", "<", "=="] as const;

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function parseNumeric(value: string): number | null {
  const num = parseFloat(value.replace(/[%,]/g, ""));
  return isNaN(num) ? null : num;
}

function appetiteMet(
  current: string,
  appetite: string,
  operator: string
): boolean {
  const curr = parseNumeric(current);
  const target = parseNumeric(appetite);
  if (curr === null || target === null) return false;
  switch (operator) {
    case ">=":
      return curr >= target;
    case "<=":
      return curr <= target;
    case ">":
      return curr > target;
    case "<":
      return curr < target;
    case "==":
      return curr === target;
    default:
      return false;
  }
}

export default function MetricDrillDown({
  metric,
  open,
  onClose,
  isCCRO,
  onSaveAppetite,
  onCreateAction,
}: MetricDrillDownProps) {
  const [snapshots, setSnapshots] = useState<MetricSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [appetiteValue, setAppetiteValue] = useState("");
  const [appetiteOp, setAppetiteOp] = useState<string>(">=");
  const [dirty, setDirty] = useState(false);
  const [narrativeValue, setNarrativeValue] = useState("");
  const [narrativeDirty, setNarrativeDirty] = useState(false);
  const [narrativeSaving, setNarrativeSaving] = useState(false);

  useEffect(() => {
    if (!metric || !open) return;
    setAppetiteValue(metric.appetite ?? "");
    setAppetiteOp(metric.appetiteOperator ?? ">=");
    setNarrativeValue(metric.narrative ?? "");
    setDirty(false);
    setNarrativeDirty(false);

    setLoading(true);
    api<MetricSnapshot[]>(`/api/consumer-duty/mi/${metric.id}/snapshots`)
      .then((data) => setSnapshots(data))
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false));
  }, [metric, open]);

  const handleSave = useCallback(() => {
    if (!metric || !onSaveAppetite) return;
    onSaveAppetite(
      metric.id,
      appetiteValue.trim() || null,
      appetiteValue.trim() ? appetiteOp : null
    );
    setDirty(false);
  }, [metric, onSaveAppetite, appetiteValue, appetiteOp]);

  const handleSaveNarrative = useCallback(async () => {
    if (!metric) return;
    setNarrativeSaving(true);
    try {
      const clean = narrativeValue === "<p></p>" ? "" : narrativeValue;
      await api(`/api/consumer-duty/mi/${metric.id}`, {
        method: "PATCH",
        body: { narrative: clean || null },
      });
      setNarrativeDirty(false);
    } catch (err) {
      console.error("Failed to save narrative:", err);
    } finally {
      setNarrativeSaving(false);
    }
  }, [metric, narrativeValue]);

  if (!metric) return null;

  const changeVal = parseFloat(metric.change);
  const changeIcon =
    isNaN(changeVal) || changeVal === 0 ? (
      <Minus size={14} className="text-gray-400" />
    ) : changeVal > 0 ? (
      <TrendingUp size={14} className="text-risk-green" />
    ) : (
      <TrendingDown size={14} className="text-risk-red" />
    );

  const hasAppetite = !!metric.appetite && !!metric.appetiteOperator;
  const isMet = hasAppetite
    ? appetiteMet(metric.current, metric.appetite!, metric.appetiteOperator!)
    : null;

  // Chart data
  const chartData = snapshots.map((s) => ({
    month: formatMonth(s.month),
    value: parseNumeric(s.value),
    ragStatus: s.ragStatus,
  }));
  const hasNumericData = chartData.some((d) => d.value !== null);

  const appetiteNum = metric.appetite ? parseNumeric(metric.appetite) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={metric.metric}
      size="lg"
      footer={
        isCCRO && onSaveAppetite ? (
          <>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
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
              Save Target
            </button>
          </>
        ) : undefined
      }
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-2xl font-bold text-updraft-deep font-poppins">
          {metric.current}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            metric.ragStatus === "GOOD" && "bg-risk-green/15 text-risk-green",
            metric.ragStatus === "WARNING" &&
              "bg-risk-amber/10 text-risk-amber",
            metric.ragStatus === "HARM" && "bg-risk-red/10 text-risk-red"
          )}
        >
          <span
            className={cn("h-2 w-2 rounded-full", ragBgColor(metric.ragStatus))}
          />
          {ragLabelShort(metric.ragStatus)}
        </span>
        {metric.change && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-500">
            {changeIcon}
            {metric.change}
          </span>
        )}
        {onCreateAction && (
          <button
            onClick={() => onCreateAction(metric.id, metric.metric)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-updraft-light-purple bg-updraft-pale-purple/20 px-3 py-1.5 text-xs font-medium text-updraft-deep hover:bg-updraft-pale-purple/40 transition-colors"
          >
            <Plus size={13} /> Create Action
          </button>
        )}
      </div>

      {/* Appetite section */}
      <div className="mb-6 rounded-xl border border-updraft-pale-purple/30 bg-updraft-pale-purple/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-updraft-bar" />
          <h4 className="text-sm font-semibold text-gray-700">
            Appetite Target
          </h4>
        </div>
        {isCCRO ? (
          <div className="flex items-center gap-3">
            <select
              value={appetiteOp}
              onChange={(e) => {
                setAppetiteOp(e.target.value);
                setDirty(true);
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-updraft-bar focus:ring-1 focus:ring-updraft-bar/30 focus:outline-none"
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={appetiteValue}
              onChange={(e) => {
                setAppetiteValue(e.target.value);
                setDirty(true);
              }}
              placeholder="e.g. 70"
              className="w-28 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-updraft-bar focus:ring-1 focus:ring-updraft-bar/30 focus:outline-none"
            />
            {hasAppetite && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  isMet
                    ? "bg-risk-green/15 text-risk-green"
                    : "bg-risk-red/10 text-risk-red"
                )}
              >
                {isMet ? "Met" : "Not Met"}
              </span>
            )}
          </div>
        ) : hasAppetite ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Target: {metric.appetiteOperator} {metric.appetite}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                isMet
                  ? "bg-risk-green/15 text-risk-green"
                  : "bg-risk-red/10 text-risk-red"
              )}
            >
              {isMet ? "Met" : "Not Met"}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No target set</p>
        )}
      </div>

      {/* 12-month chart */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-updraft-bar border-t-transparent" />
        </div>
      ) : hasNumericData && chartData.length > 1 ? (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            12-Month History
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradient-purple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B1FA2" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7B1FA2" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#888" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#888" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: 13,
                }}
              />
              {appetiteNum !== null && (
                <ReferenceLine
                  y={appetiteNum}
                  stroke="#EF4444"
                  strokeDasharray="6 4"
                  label={{
                    value: `Target: ${metric.appetite}`,
                    position: "insideTopRight",
                    fill: "#EF4444",
                    fontSize: 11,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#7B1FA2"
                strokeWidth={2}
                fill="url(#gradient-purple)"
                dot={{ fill: "#7B1FA2", r: 3 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Monthly Narrative */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-updraft-bar" />
            <h4 className="text-sm font-semibold text-gray-700">Monthly Narrative</h4>
          </div>
          {narrativeDirty && (
            <button
              onClick={handleSaveNarrative}
              disabled={narrativeSaving}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors",
                narrativeSaving ? "bg-gray-300 cursor-not-allowed" : "bg-updraft-bar hover:bg-updraft-bright-purple"
              )}
            >
              <Save size={13} />
              {narrativeSaving ? "Saving..." : "Save Narrative"}
            </button>
          )}
        </div>
        <RichTextEditor
          value={narrativeValue}
          onChange={(val) => { setNarrativeValue(val); setNarrativeDirty(true); }}
          placeholder="Add commentary or narrative for this metric..."
          minHeight="80px"
        />
      </div>

      {/* History table */}
      {snapshots.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Monthly Data
          </h4>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2 text-left">Month</th>
                  <th className="px-4 py-2 text-right">Value</th>
                  <th className="px-4 py-2 text-center">RAG</th>
                </tr>
              </thead>
              <tbody>
                {[...snapshots].reverse().map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-2 text-gray-600">
                      {formatMonth(s.month)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-800">
                      {s.value}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            s.ragStatus === "GOOD" &&
                              "bg-risk-green/15 text-risk-green",
                            s.ragStatus === "WARNING" &&
                              "bg-risk-amber/10 text-risk-amber",
                            s.ragStatus === "HARM" &&
                              "bg-risk-red/10 text-risk-red"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              ragBgColor(s.ragStatus)
                            )}
                          />
                          {ragLabelShort(s.ragStatus)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && snapshots.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">
          No historical data available for this metric.
        </p>
      )}
    </Modal>
  );
}
