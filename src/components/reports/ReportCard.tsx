"use client";

import { useState } from "react";
import {
  Pencil,
  Eye,
  Send,
  Download,
  FileDown,
  Calendar,
  User,
  Clock,
  Trash2,
} from "lucide-react";
import type { Report } from "@/lib/types";
import { cn, formatDate, statusColor, statusLabel } from "@/lib/utils";

interface ReportCardProps {
  report: Report;
  onEdit: (report: Report) => void;
  onView: (report: Report) => void;
  onPublish: (report: Report) => void;
  onExport: (report: Report) => void;
  onPrintPDF?: (report: Report) => void;
  onDelete?: (report: Report) => void;
}

export function ReportCard({
  report,
  onEdit,
  onView,
  onPublish,
  onExport,
  onPrintPDF,
  onDelete,
}: ReportCardProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    if (!onDelete) return;
    if (deleteConfirm) {
      onDelete(report);
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-white shadow-bento",
        "transition-all duration-300 ease-out",
        "hover:shadow-bento-hover hover:-translate-y-1"
      )}
    >
      {/* Ambient SVG decoration */}
      <svg
        className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-updraft-pale-purple/30"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="35" stroke="currentColor" strokeWidth="1" />
        <circle cx="60" cy="60" r="18" fill="currentColor" fillOpacity="0.15" />
      </svg>

      <div className="relative p-5">
        {/* Top row: status badge + period */}
        <div className="mb-3 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
              statusColor(report.status)
            )}
          >
            {statusLabel(report.status)}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar size={12} />
            {report.period}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-1 truncate font-poppins text-base font-semibold text-gray-900">
          {report.title}
        </h3>

        {/* Meta row */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <User size={12} className="text-gray-400" />
            {report.creator?.name ?? report.createdBy}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-gray-400" />
            Created {formatDate(report.createdAt)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onView(report)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Eye size={14} />
            View
          </button>
          <button
            onClick={() => onEdit(report)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Pencil size={14} />
            Edit
          </button>
          {report.status === "DRAFT" && (
            <button
              onClick={() => onPublish(report)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-updraft-dark-purple"
            >
              <Send size={14} />
              Publish
            </button>
          )}
          <button
            onClick={() => onExport(report)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download size={14} />
            Export HTML
          </button>
          {onPrintPDF && (
            <button
              onClick={() => onPrintPDF(report)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-updraft-bright-purple/30 px-3 py-1.5 text-xs font-medium text-updraft-deep transition-colors hover:bg-updraft-pale-purple/20"
            >
              <FileDown size={14} />
              Print to PDF
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                deleteConfirm
                  ? "bg-red-600 text-white border border-red-600 hover:bg-red-700"
                  : "border border-red-200 text-red-600 hover:bg-red-50"
              )}
              title={deleteConfirm ? "Click again to confirm" : "Delete report"}
            >
              <Trash2 size={14} />
              {deleteConfirm ? "Confirm Delete?" : "Delete"}
            </button>
          )}
        </div>

        {/* Last updated */}
        <div className="mt-4 flex items-center gap-1 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
          <Clock size={11} />
          Last updated {formatDate(report.updatedAt)}
        </div>
      </div>
    </div>
  );
}
