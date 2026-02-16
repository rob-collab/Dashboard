"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, FileText } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { generateHTMLExport } from "@/lib/export-html";
import { ReportCard } from "@/components/reports/ReportCard";
import type { Report, ReportStatus } from "@/lib/types";

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useAppStore((s) => s._hydrated);
  const reports = useAppStore((s) => s.reports);
  const sections = useAppStore((s) => s.sections);
  const outcomes = useAppStore((s) => s.outcomes);
  const currentUser = useAppStore((s) => s.currentUser);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">(() => {
    const param = searchParams.get("status");
    if (param === "DRAFT" || param === "PUBLISHED" || param === "ARCHIVED") return param;
    return "ALL";
  });

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-updraft-bright-purple border-t-transparent"></div>
          <p className="text-sm text-gray-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  const isCCROTeam = currentUser?.role === "CCRO_TEAM";

  const filteredReports = reports.filter((r) => {
    // Non-CCRO users can only see published or archived reports
    if (!isCCROTeam && r.status === "DRAFT") {
      return false;
    }

    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.period.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleView = (report: Report) => {
    router.push(`/reports/${report.id}`);
  };

  const handleEdit = (report: Report) => {
    router.push(`/reports/${report.id}/edit`);
  };

  const handlePublish = (report: Report) => {
    router.push(`/reports/${report.id}/edit`);
  };

  const handleExport = (report: Report) => {
    const reportSections = sections.filter((s) => s.reportId === report.id).sort((a, b) => a.position - b.position);
    const reportOutcomes = outcomes.filter((o) => o.reportId === report.id);
    const html = generateHTMLExport(report, reportSections, reportOutcomes);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CCRO_Report_${report.period.replace(/\s+/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-updraft-deep">Reports</h1>
          <p className="text-sm text-fca-gray mt-1">
            {isCCROTeam ? "Manage CCRO compliance reports" : "View published CCRO reports"}
          </p>
        </div>
        {isCCROTeam && (
          <Link
            href="/reports/new"
            className="inline-flex items-center gap-2 rounded-lg bg-updraft-bright-purple px-4 py-2.5 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Report
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fca-gray" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-updraft-light-purple focus:outline-none focus:ring-1 focus:ring-updraft-light-purple"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "ALL")}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-updraft-light-purple focus:outline-none focus:ring-1 focus:ring-updraft-light-purple"
        >
          <option value="ALL">All Status</option>
          {isCCROTeam && <option value="DRAFT">Draft</option>}
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Reports Grid */}
      {filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onEdit={handleEdit}
              onView={handleView}
              onPublish={handlePublish}
              onExport={handleExport}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bento-card">
          <FileText className="h-12 w-12 text-gray-300 mx-auto" />
          <h3 className="mt-3 text-lg font-medium text-fca-dark-gray">No reports found</h3>
          <p className="text-sm text-fca-gray mt-1">
            {searchQuery ? "Try a different search term" : "Create your first report to get started"}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsPageContent />
    </Suspense>
  );
}
