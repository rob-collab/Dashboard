"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, FileText, Send, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { generateHTMLExport } from "@/lib/export-html";
import { ReportCard } from "@/components/reports/ReportCard";
import type { Report, ReportStatus } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";
import { api, friendlyApiError } from "@/lib/api-client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Button from "@/components/common/Button";
import { Calendar, ArrowRight } from "lucide-react";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import ScrollReveal from "@/components/common/ScrollReveal";

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useAppStore((s) => s._hydrated);
  const reports = useAppStore((s) => s.reports);
  const sections = useAppStore((s) => s.sections);
  const outcomes = useAppStore((s) => s.outcomes);
  const deleteReport = useAppStore((s) => s.deleteReport);
  const currentUser = useAppStore((s) => s.currentUser);
  const updateReport = useAppStore((s) => s.updateReport);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">(() => {
    const param = searchParams.get("status");
    if (param === "DRAFT" || param === "PUBLISHED" || param === "ARCHIVED") return param;
    return "ALL";
  });
  const [publishingReport, setPublishingReport] = useState<Report | null>(null);
  const [publishNote, setPublishNote] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);

  const draftCount = useMemo(() => reports.filter((r) => r.status === "DRAFT").length, [reports]);
  const publishedCount = useMemo(() => reports.filter((r) => r.status === "PUBLISHED").length, [reports]);

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

  // Current period computation (UX8)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const currentPeriodLabel = `Q${currentQuarter} ${currentYear}`;

  // Find reports for the current year, sorted by createdAt desc
  const currentYearReports = reports
    .filter((r) => r.period.includes(String(currentYear)) && (isCCROTeam || r.status !== "DRAFT"))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const currentPeriodReport = currentYearReports[0] ?? null;

  const filteredReports = reports
    .filter((r) => {
      // Non-CCRO users can only see published or archived reports
      if (!isCCROTeam && r.status === "DRAFT") {
        return false;
      }

      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.period.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    // Sort most recent first (UX8)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleView = (report: Report) => {
    router.push(`/reports/${report.id}`);
  };

  const handleEdit = (report: Report) => {
    router.push(`/reports/${report.id}/edit`);
  };

  const handlePublish = (report: Report) => {
    setPublishingReport(report);
    setPublishNote("");
  };

  const handleConfirmPublish = async () => {
    if (!publishingReport) return;
    setIsPublishing(true);
    try {
      await api(`/api/reports/${publishingReport.id}/publish`, {
        method: "POST",
        body: { publishNote: publishNote.trim() || null },
      });
      updateReport(publishingReport.id, { status: "PUBLISHED" });
      toast.success(`"${publishingReport.title}" published successfully`);
      setPublishingReport(null);
    } catch (err) {
      const { message, description } = friendlyApiError(err);
      toast.error(message, { description });
    } finally {
      setIsPublishing(false);
    }
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
    toast.success("Report exported as HTML");
  };

  const handlePrintPDF = (report: Report) => {
    const reportSections = sections.filter((s) => s.reportId === report.id).sort((a, b) => a.position - b.position);
    const reportOutcomes = outcomes.filter((o) => o.reportId === report.id);
    const html = generateHTMLExport(report, reportSections, reportOutcomes);
    // Inject auto-print script — triggers browser's "Save as PDF" dialog
    const printHtml = html.replace("</body>", '<script>window.onload=function(){window.print();}</script></body>');
    const blob = new Blob([printHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");
    if (!printWindow) {
      toast.error("Pop-up was blocked — please allow pop-ups for this site");
    } else {
      // Revoke the object URL once the window has loaded
      printWindow.addEventListener("load", () => URL.revokeObjectURL(url));
    }
  };

  const handleDelete = (report: Report) => {
    setDeletingReport(report);
  };

  const handleConfirmDelete = () => {
    if (!deletingReport) return;
    deleteReport(deletingReport.id);
    toast.success(`"${deletingReport.title}" deleted`);
    setDeletingReport(null);
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

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">
          <AnimatedNumber value={reports.length} /> report{reports.length !== 1 ? "s" : ""}
        </span>
        {isCCROTeam && draftCount > 0 && (
          <>
            <span className="text-gray-200">|</span>
            <span className="text-amber-600 font-medium"><AnimatedNumber value={draftCount} delay={50} /> draft</span>
          </>
        )}
        {publishedCount > 0 && (
          <>
            <span className="text-gray-200">|</span>
            <span className="text-green-600 font-medium"><AnimatedNumber value={publishedCount} delay={100} /> published</span>
          </>
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

      {/* Publish Confirmation Modal */}
      {publishingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Publish Report</h2>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">{publishingReport.title}</span> will be visible to all users and locked for editing.
                </p>
              </div>
              <button onClick={() => setPublishingReport(null)} className="text-gray-400 hover:text-gray-600 transition-colors ml-4 shrink-0">
                <X size={20} />
              </button>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publish note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={publishNote}
                onChange={(e) => setPublishNote(e.target.value)}
                placeholder="e.g. Q1 2026 board submission, reviewed by CCRO team"
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-updraft-light-purple focus:outline-none focus:ring-1 focus:ring-updraft-light-purple resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setPublishingReport(null)} disabled={isPublishing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmPublish}
                loading={isPublishing}
                iconLeft={<Send size={14} />}
              >
                Publish Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingReport}
        onClose={() => setDeletingReport(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Report"
        message={deletingReport ? `"${deletingReport.title}" will be permanently deleted and cannot be recovered.` : ""}
        confirmLabel="Delete Report"
        variant="danger"
      />

      {/* Current Period highlight (UX8) */}
      {currentPeriodReport ? (
        <div
          className="bento-card border-l-4 border-l-updraft-bright-purple flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => handleView(currentPeriodReport)}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-updraft-pale-purple/40">
            <Calendar className="h-5 w-5 text-updraft-bright-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-updraft-bright-purple px-2.5 py-0.5 text-xs font-semibold text-white">
                Current Period
              </span>
              <span className="text-xs text-gray-400">{currentPeriodLabel}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-900 truncate">{currentPeriodReport.title}</p>
            <p className="text-xs text-gray-500">
              {currentPeriodReport.period} ·{" "}
              <span className={currentPeriodReport.status === "PUBLISHED" ? "text-green-600" : currentPeriodReport.status === "DRAFT" ? "text-amber-600" : "text-gray-400"}>
                {currentPeriodReport.status.charAt(0) + currentPeriodReport.status.slice(1).toLowerCase()}
              </span>
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 shrink-0 mt-3" />
        </div>
      ) : isCCROTeam ? (
        <div className="bento-card border-l-4 border-l-gray-200 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700">No report for {currentPeriodLabel} yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Start the current period report to capture this quarter&apos;s activity.</p>
          </div>
          <Link
            href="/reports/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-updraft-deep transition-colors whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
          >
            Start {currentPeriodLabel} report <ArrowRight size={12} />
          </Link>
        </div>
      ) : null}

      {/* Reports Grid */}
      {filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report, idx) => (
            <ScrollReveal key={report.id} delay={Math.min(idx * 40, 200)}>
              <ReportCard
                report={report}
                onEdit={handleEdit}
                onView={handleView}
                onPublish={handlePublish}
                onExport={handleExport}
                onPrintPDF={handlePrintPDF}
                onDelete={isCCROTeam ? handleDelete : undefined}
              />
            </ScrollReveal>
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
  usePageTitle("Reports");
  return (
    <Suspense>
      <ReportsPageContent />
    </Suspense>
  );
}
