"use client";

import { cn } from "@/lib/utils";

interface DataTableContent {
  headers: string[];
  rows: string[][];
}

interface DataTableProps {
  content: DataTableContent;
  editable: boolean;
  onChange: (data: DataTableContent) => void;
}

function ragCellColor(value: string): string {
  const lower = value.toLowerCase();
  if (lower === "good") return "text-risk-green";
  if (lower === "warning" || lower === "amber") return "text-risk-amber";
  if (lower === "harm" || lower === "red") return "text-risk-red";
  return "";
}

export default function DataTable({ content, editable, onChange }: DataTableProps) {
  const { headers, rows } = content;

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = rows.map((row, ri) =>
      ri === rowIdx ? row.map((cell, ci) => (ci === colIdx ? value : cell)) : [...row]
    );
    onChange({ headers, rows: newRows });
  };

  const updateHeader = (colIdx: number, value: string) => {
    const newHeaders = headers.map((h, i) => (i === colIdx ? value : h));
    onChange({ headers: newHeaders, rows });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50">
            {headers.map((header, i) => (
              <th
                key={i}
                className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700"
              >
                {editable ? (
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => updateHeader(i, e.target.value)}
                    className="w-full bg-transparent outline-none font-semibold"
                  />
                ) : (
                  header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-gray-50/50">
              {row.map((cell, ci) => {
                const isRagCol = headers[ci]?.toLowerCase().includes("rag") ||
                  headers[ci]?.toLowerCase().includes("status");
                return (
                  <td
                    key={ci}
                    className={cn(
                      "border border-gray-200 px-3 py-2",
                      isRagCol && ragCellColor(cell) && `font-semibold ${ragCellColor(cell)}`
                    )}
                  >
                    {editable ? (
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        className="w-full bg-transparent outline-none"
                      />
                    ) : (
                      cell
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
