"use client";

import { useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Section } from "@/lib/types";
import { ScrollChart } from "@/components/common/ScrollChart";

// ---------------------------------------------------------------------------
// Brand colours
// ---------------------------------------------------------------------------

const BRAND_COLOURS = [
  "#7B1FA2", // updraft-bright-purple
  "#673AB7", // updraft-bar
  "#311B92", // updraft-deep
  "#10B981", // risk-green
  "#F59E0B", // risk-amber
  "#DC2626", // risk-red
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChartType = "bar" | "line" | "pie";

interface Dataset {
  label: string;
  data: number[];
  color?: string;
}

interface ChartData {
  labels: string[];
  datasets: Dataset[];
}

interface ChartContent {
  chartType: ChartType;
  chartData: ChartData;
}

interface ChartSectionProps {
  section: Section;
  editable: boolean;
  onUpdate: (content: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseContent(section: Section): ChartContent {
  const c = section.content ?? {};
  return {
    chartType: (c.chartType as ChartType) ?? "bar",
    chartData: {
      labels: (c.chartData as ChartData | undefined)?.labels ?? ["Q1", "Q2", "Q3", "Q4"],
      datasets: (c.chartData as ChartData | undefined)?.datasets ?? [
        { label: "Series 1", data: [10, 20, 30, 40], color: BRAND_COLOURS[0] },
      ],
    },
  };
}

/** Transform our data model into the flat-object array Recharts expects. */
function toRechartsData(chartData: ChartData) {
  return chartData.labels.map((label, i) => {
    const entry: Record<string, string | number> = { name: label };
    chartData.datasets.forEach((ds) => {
      entry[ds.label] = ds.data[i] ?? 0;
    });
    return entry;
  });
}

/** Build pie-specific data for a single dataset. */
function toPieData(chartData: ChartData) {
  const ds = chartData.datasets[0];
  if (!ds) return [];
  return chartData.labels.map((label, i) => ({
    name: label,
    value: ds.data[i] ?? 0,
  }));
}

function datasetColour(ds: Dataset, idx: number): string {
  return ds.color ?? BRAND_COLOURS[idx % BRAND_COLOURS.length];
}

// ---------------------------------------------------------------------------
// Chart renderers (view mode)
// ---------------------------------------------------------------------------

function BarChartView({ chartData }: { chartData: ChartData }) {
  const data = useMemo(() => toRechartsData(chartData), [chartData]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {chartData.datasets.map((ds, idx) => (
          <Bar
            key={ds.label}
            dataKey={ds.label}
            fill={datasetColour(ds, idx)}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({ chartData }: { chartData: ChartData }) {
  const data = useMemo(() => toRechartsData(chartData), [chartData]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {chartData.datasets.map((ds, idx) => (
          <Line
            key={ds.label}
            type="monotone"
            dataKey={ds.label}
            stroke={datasetColour(ds, idx)}
            strokeWidth={2}
            dot={{ r: 4, fill: datasetColour(ds, idx) }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ chartData }: { chartData: ChartData }) {
  const data = useMemo(() => toPieData(chartData), [chartData]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={{ stroke: "#9CA3AF" }}
        >
          {data.map((_entry, idx) => (
            <Cell
              key={`cell-${idx}`}
              fill={BRAND_COLOURS[idx % BRAND_COLOURS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Edit-mode controls
// ---------------------------------------------------------------------------

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
];

function ChartTypeSelector({
  value,
  onChange,
}: {
  value: ChartType;
  onChange: (t: ChartType) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-xs font-medium text-gray-600">Chart type:</span>
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
        {CHART_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              opt.value === value
                ? "bg-updraft-bright-purple text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EditableDataTable({
  chartData,
  onChange,
}: {
  chartData: ChartData;
  onChange: (d: ChartData) => void;
}) {
  const updateLabel = useCallback(
    (idx: number, val: string) => {
      const labels = [...chartData.labels];
      labels[idx] = val;
      onChange({ ...chartData, labels });
    },
    [chartData, onChange]
  );

  const updateValue = useCallback(
    (dsIdx: number, rowIdx: number, val: string) => {
      const datasets = chartData.datasets.map((ds, di) => {
        if (di !== dsIdx) return ds;
        const data = [...ds.data];
        data[rowIdx] = val === "" ? 0 : Number(val);
        return { ...ds, data };
      });
      onChange({ ...chartData, datasets });
    },
    [chartData, onChange]
  );

  const updateDatasetLabel = useCallback(
    (dsIdx: number, val: string) => {
      const datasets = chartData.datasets.map((ds, di) =>
        di === dsIdx ? { ...ds, label: val } : ds
      );
      onChange({ ...chartData, datasets });
    },
    [chartData, onChange]
  );

  const updateDatasetColour = useCallback(
    (dsIdx: number, val: string) => {
      const datasets = chartData.datasets.map((ds, di) =>
        di === dsIdx ? { ...ds, color: val } : ds
      );
      onChange({ ...chartData, datasets });
    },
    [chartData, onChange]
  );

  const addRow = useCallback(() => {
    const labels = [...chartData.labels, `Label ${chartData.labels.length + 1}`];
    const datasets = chartData.datasets.map((ds) => ({
      ...ds,
      data: [...ds.data, 0],
    }));
    onChange({ labels, datasets });
  }, [chartData, onChange]);

  const removeRow = useCallback(
    (idx: number) => {
      if (chartData.labels.length <= 1) return;
      const labels = chartData.labels.filter((_, i) => i !== idx);
      const datasets = chartData.datasets.map((ds) => ({
        ...ds,
        data: ds.data.filter((_, i) => i !== idx),
      }));
      onChange({ labels, datasets });
    },
    [chartData, onChange]
  );

  const addDataset = useCallback(() => {
    const newDs: Dataset = {
      label: `Series ${chartData.datasets.length + 1}`,
      data: chartData.labels.map(() => 0),
      color: BRAND_COLOURS[chartData.datasets.length % BRAND_COLOURS.length],
    };
    onChange({ ...chartData, datasets: [...chartData.datasets, newDs] });
  }, [chartData, onChange]);

  const removeDataset = useCallback(
    (dsIdx: number) => {
      if (chartData.datasets.length <= 1) return;
      onChange({
        ...chartData,
        datasets: chartData.datasets.filter((_, i) => i !== dsIdx),
      });
    },
    [chartData, onChange]
  );

  return (
    <div className="mt-4 space-y-3">
      {/* Dataset headers with colour pickers */}
      <div className="flex items-end gap-2 flex-wrap">
        {chartData.datasets.map((ds, dsIdx) => (
          <div key={dsIdx} className="flex items-center gap-1.5">
            <input
              type="color"
              value={datasetColour(ds, dsIdx)}
              onChange={(e) => updateDatasetColour(dsIdx, e.target.value)}
              className="h-6 w-6 rounded border border-gray-200 cursor-pointer"
              title="Dataset colour"
            />
            <input
              type="text"
              value={ds.label}
              onChange={(e) => updateDatasetLabel(dsIdx, e.target.value)}
              className="w-28 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-updraft-bright-purple"
              placeholder="Dataset name"
            />
            {chartData.datasets.length > 1 && (
              <button
                type="button"
                onClick={() => removeDataset(dsIdx)}
                className="text-gray-400 hover:text-risk-red transition-colors"
                title="Remove dataset"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addDataset}
          className="inline-flex items-center gap-1 rounded border border-dashed border-updraft-light-purple px-2 py-1 text-xs text-updraft-bright-purple hover:bg-updraft-pale-purple/20 transition-colors"
        >
          <Plus size={12} />
          Dataset
        </button>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-medium text-gray-500 border-b border-gray-200">
                Label
              </th>
              {chartData.datasets.map((ds, dsIdx) => (
                <th
                  key={dsIdx}
                  className="px-3 py-2 text-left font-medium text-gray-500 border-b border-gray-200"
                >
                  {ds.label}
                </th>
              ))}
              <th className="px-2 py-2 border-b border-gray-200 w-8" />
            </tr>
          </thead>
          <tbody>
            {chartData.labels.map((label, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-100 last:border-b-0">
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => updateLabel(rowIdx, e.target.value)}
                    className="w-full bg-transparent outline-none text-gray-700 focus:text-updraft-deep"
                  />
                </td>
                {chartData.datasets.map((ds, dsIdx) => (
                  <td key={dsIdx} className="px-3 py-1.5">
                    <input
                      type="number"
                      value={ds.data[rowIdx] ?? 0}
                      onChange={(e) => updateValue(dsIdx, rowIdx, e.target.value)}
                      className="w-full bg-transparent outline-none text-gray-700 focus:text-updraft-deep tabular-nums"
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center">
                  {chartData.labels.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(rowIdx)}
                      className="text-gray-400 hover:text-risk-red transition-colors"
                      title="Remove row"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1 rounded border border-dashed border-updraft-light-purple px-2 py-1 text-xs text-updraft-bright-purple hover:bg-updraft-pale-purple/20 transition-colors"
      >
        <Plus size={12} />
        Add row
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ChartSection({
  section,
  editable,
  onUpdate,
}: ChartSectionProps) {
  const { chartType, chartData } = parseContent(section);

  const handleTypeChange = useCallback(
    (type: ChartType) => {
      onUpdate({ chartType: type, chartData });
    },
    [chartData, onUpdate]
  );

  const handleDataChange = useCallback(
    (data: ChartData) => {
      onUpdate({ chartType, chartData: data });
    },
    [chartType, onUpdate]
  );

  // Select the correct chart renderer
  const ChartView = useMemo(() => {
    switch (chartType) {
      case "line":
        return LineChartView;
      case "pie":
        return PieChartView;
      case "bar":
      default:
        return BarChartView;
    }
  }, [chartType]);

  return (
    <div>
      {editable && (
        <ChartTypeSelector value={chartType} onChange={handleTypeChange} />
      )}

      {/* Chart preview — scroll-triggered: replays Recharts entrance animation on each scroll entry */}
      <ScrollChart className="rounded-lg border border-gray-100 bg-white p-4">
        {(scrollKey) => <ChartView key={scrollKey} chartData={chartData} />}
      </ScrollChart>

      {/* Edit-mode data table */}
      {editable && (
        <EditableDataTable chartData={chartData} onChange={handleDataChange} />
      )}
    </div>
  );
}
