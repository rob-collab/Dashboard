"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Plus,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate, ragBgColor } from "@/lib/utils";
import { getActionLabel } from "@/lib/audit";

export default function DashboardHome() {
  const currentUser = useAppStore((s) => s.currentUser);
  const reports = useAppStore((s) => s.reports);
  const outcomes = useAppStore((s) => s.outcomes);
  const allAuditLogs = useAppStore((s) => s.auditLogs);
  const users = useAppStore((s) => s.users);
  const auditLogs = useMemo(() => allAuditLogs.slice(0, 5), [allAuditLogs]);

  const draftCount = reports.filter((r) => r.status === "DRAFT").length;
  const publishedCount = reports.filter((r) => r.status === "PUBLISHED").length;
  const warningCount = outcomes.filter((o) => o.ragStatus === "WARNING").length;
  const harmCount = outcomes.filter((o) => o.ragStatus === "HARM").length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-updraft-deep to-updraft-bar p-8 text-white">
        <div className="absolute top-0 right-0 opacity-20">
          <svg width="300" height="200" viewBox="0 0 300 200">
            <circle cx="250" cy="30" r="100" fill="#E1BEE7" />
            <circle cx="180" cy="150" r="60" fill="#BA68C8" />
          </svg>
        </div>
        <div className="relative">
          <h1 className="text-2xl font-bold">
            Welcome back, {currentUser?.name || "User"}
          </h1>
          <p className="mt-1 text-white/80">
            Updraft CCRO Report Management Dashboard
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/reports/new"
              className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Report
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              <FileText className="h-4 w-4" />
              View Reports
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-updraft-pale-purple/50 p-2.5">
              <FileText className="h-5 w-5 text-updraft-bright-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-updraft-deep">{draftCount}</p>
              <p className="text-sm text-fca-gray">Draft Reports</p>
            </div>
          </div>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2.5">
              <CheckCircle className="h-5 w-5 text-risk-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-risk-green">{publishedCount}</p>
              <p className="text-sm text-fca-gray">Published</p>
            </div>
          </div>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-updraft-pale-purple/50 p-2.5">
              <Shield className="h-5 w-5 text-updraft-bright-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-updraft-deep">{outcomes.length}</p>
              <p className="text-sm text-fca-gray">CD Outcomes</p>
            </div>
          </div>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <AlertTriangle className="h-5 w-5 text-risk-amber" />
            </div>
            <div>
              <p className="text-2xl font-bold text-risk-amber">{warningCount + harmCount}</p>
              <p className="text-sm text-fca-gray">Attention Needed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consumer Duty Overview */}
        <div className="lg:col-span-2 bento-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-updraft-deep">Consumer Duty Overview</h2>
            <Link
              href="/consumer-duty"
              className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1"
            >
              View Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {outcomes.map((outcome) => (
              <div
                key={outcome.id}
                className="flex items-center justify-between rounded-xl bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${ragBgColor(outcome.ragStatus)}`}
                  />
                  <div>
                    <p className="text-sm font-medium">{outcome.name}</p>
                    <p className="text-xs text-fca-gray">{outcome.shortDesc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fca-gray">
                    {outcome.measures?.length || 0} measures
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      outcome.ragStatus === "GOOD"
                        ? "bg-green-100 text-risk-green"
                        : outcome.ragStatus === "WARNING"
                        ? "bg-amber-100 text-risk-amber"
                        : "bg-red-100 text-risk-red"
                    }`}
                  >
                    {outcome.ragStatus === "GOOD"
                      ? "Good"
                      : outcome.ragStatus === "WARNING"
                      ? "Warning"
                      : "Harm"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bento-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-updraft-deep">Recent Activity</h2>
            <Link
              href="/audit"
              className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {auditLogs.map((log) => {
              const logUser = users.find((u) => u.id === log.userId);
              return (
                <div key={log.id} className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-updraft-light-purple" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{logUser?.name || log.userId}</span>{" "}
                      <span className="text-fca-gray">{getActionLabel(log.action)}</span>
                    </p>
                    {log.changes && (
                      <p className="text-xs text-fca-gray mt-0.5 truncate">
                        {Object.entries(log.changes)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(log.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bento-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-updraft-deep">Reports</h2>
          <Link
            href="/reports"
            className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-fca-gray">Report</th>
                <th className="text-left py-2 px-3 font-medium text-fca-gray">Period</th>
                <th className="text-left py-2 px-3 font-medium text-fca-gray">Status</th>
                <th className="text-left py-2 px-3 font-medium text-fca-gray">Updated</th>
                <th className="text-right py-2 px-3 font-medium text-fca-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium">{report.title}</td>
                  <td className="py-3 px-3 text-fca-gray">{report.period}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        report.status === "DRAFT"
                          ? "bg-red-100 text-red-700"
                          : report.status === "PUBLISHED"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {report.status === "DRAFT"
                        ? "Draft"
                        : report.status === "PUBLISHED"
                        ? "Published"
                        : "Archived"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-fca-gray text-xs">
                    {formatDate(report.updatedAt)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/reports/${report.id}/edit`}
                      className="text-updraft-bright-purple hover:text-updraft-deep text-xs font-medium mr-3"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/reports/${report.id}`}
                      className="text-fca-gray hover:text-fca-dark-gray text-xs font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
