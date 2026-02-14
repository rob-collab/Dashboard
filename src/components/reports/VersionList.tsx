"use client";

import { useState, useMemo } from "react";
import {
  Eye,
  Download,
  GitCompareArrows,
  ChevronDown,
  Clock,
  MessageSquare,
  User,
} from "lucide-react";
import type { ReportVersion } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

interface VersionListProps {
  versions: ReportVersion[];
  currentVersionId: string;
  onView: (version: ReportVersion) => void;
  onDownload: (version: ReportVersion) => void;
  onCompare: (version: ReportVersion) => void;
}

const PAGE_SIZE = 10;

export default function VersionList({
  versions,
  currentVersionId,
  onView,
  onDownload,
  onCompare,
}: VersionListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filterYear, setFilterYear] = useState<string>("all");

  // Derive available years from versions
  const availableYears = useMemo(() => {
    const years = new Set(
      versions.map((v) => new Date(v.publishedAt).getFullYear().toString())
    );
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [versions]);

  // Filter by year
  const filtered = useMemo(() => {
    if (filterYear === "all") return versions;
    return versions.filter(
      (v) =>
        new Date(v.publishedAt).getFullYear().toString() === filterYear
    );
  }, [versions, filterYear]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div>
      {/* Filter row */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-poppins text-base font-semibold text-gray-900">
          Version History
        </h3>
        {availableYears.length > 1 && (
          <div className="relative">
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-gray-700 focus:border-updraft-bar focus:outline-none focus:ring-2 focus:ring-updraft-pale-purple/40 transition-colors"
            >
              <option value="all">All years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        )}
      </div>

      {/* Timeline */}
      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          No published versions found.
        </p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gray-200" />

          <ul className="space-y-0">
            {visible.map((version, idx) => {
              const isCurrent = version.id === currentVersionId;
              const isLast = idx === visible.length - 1;

              return (
                <li key={version.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute left-2.5 top-4 h-[11px] w-[11px] rounded-full border-2",
                      isCurrent
                        ? "border-green-500 bg-green-500"
                        : "border-gray-300 bg-white"
                    )}
                  />

                  <div
                    className={cn(
                      "rounded-xl border p-4 transition-colors",
                      isCurrent
                        ? "border-green-200 bg-green-50/50"
                        : "border-gray-100 bg-white hover:bg-gray-50/50",
                      !isLast && "mb-3"
                    )}
                  >
                    {/* Version header */}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-poppins text-sm font-semibold text-gray-900">
                        Version {version.version}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700">
                          Current
                        </span>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-gray-400" />
                        {formatDate(version.publishedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-gray-400" />
                        {version.publisher?.name ?? version.publishedBy}
                      </span>
                    </div>

                    {/* Publish note */}
                    {version.publishNote && (
                      <div className="mb-3 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
                        <MessageSquare
                          size={13}
                          className="mt-0.5 shrink-0 text-gray-400"
                        />
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {version.publishNote}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onView(version)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <Eye size={13} />
                        View
                      </button>
                      <button
                        onClick={() => onDownload(version)}
                        disabled={!version.htmlExport}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                          version.htmlExport
                            ? "border-gray-200 text-gray-700 hover:bg-gray-50"
                            : "cursor-not-allowed border-gray-100 text-gray-300"
                        )}
                      >
                        <Download size={13} />
                        Download HTML
                      </button>
                      <button
                        onClick={() => onCompare(version)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <GitCompareArrows size={13} />
                        Compare
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ChevronDown size={16} />
            Load More ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
