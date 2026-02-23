"use client";

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
import { BarChart3 } from "lucide-react";

interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface ReportChartProps {
  chartType: string;
  chartData: ChartData;
}

// Brand colour palette used when a dataset has no explicit colour
const BRAND_COLOURS = [
  "#7B1FA2", // updraft-bright-purple
  "#4A1D96", // updraft-deep
  "#9C27B0", // updraft-light-purple
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
];

function colourForIndex(idx: number, override?: string): string {
  return override || BRAND_COLOURS[idx % BRAND_COLOURS.length];
}

/** Transform labels + datasets into Recharts-friendly row objects */
function toRowData(labels: string[], datasets: ChartDataset[]): Record<string, string | number>[] {
  return labels.map((label, i) => {
    const row: Record<string, string | number> = { name: label };
    for (const ds of datasets) {
      row[ds.label] = ds.data[i] ?? 0;
    }
    return row;
  });
}

export default function ReportChart({ chartType, chartData }: ReportChartProps) {
  const { labels = [], datasets = [] } = chartData;

  if (labels.length === 0 || datasets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        <BarChart3 size={24} className="mr-2" />
        <span>No chart data available</span>
      </div>
    );
  }

  if (chartType === "pie") {
    // Use first dataset only for pie; labels = slice names, data[i] = slice value
    const firstDs = datasets[0];
    const pieData = labels.map((label, i) => ({
      name: label,
      value: firstDs?.data[i] ?? 0,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={110}
            dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {pieData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colourForIndex(index)} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => (typeof value === "number" ? value.toLocaleString() : value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const rowData = toRowData(labels, datasets);

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rowData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {datasets.length > 1 && <Legend />}
          {datasets.map((ds, i) => (
            <Line
              key={ds.label}
              type="monotone"
              dataKey={ds.label}
              stroke={colourForIndex(i, ds.color)}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar chart
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rowData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        {datasets.length > 1 && <Legend />}
        {datasets.map((ds, i) => (
          <Bar
            key={ds.label}
            dataKey={ds.label}
            fill={colourForIndex(i, ds.color)}
            radius={[3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
