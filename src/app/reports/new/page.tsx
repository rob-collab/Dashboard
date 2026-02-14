"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { generateId } from "@/lib/utils";

export default function NewReportPage() {
  const router = useRouter();
  const addReport = useAppStore((s) => s.addReport);
  const currentUser = useAppStore((s) => s.currentUser);
  const [title, setTitle] = useState("CCRO Monthly Report");
  const [period, setPeriod] = useState("");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const handleCreate = () => {
    if (!title.trim() || !period.trim()) return;
    const reportId = `report-${generateId()}`;
    const now = new Date().toISOString();
    addReport({
      id: reportId,
      title: title.trim(),
      period: period.trim(),
      status: "DRAFT",
      createdBy: currentUser?.id ?? "user-rob",
      createdAt: now,
      updatedAt: now,
    });
    logAuditEvent({
      action: "create_report",
      entityType: "report",
      entityId: reportId,
      changes: { title: title.trim(), period: period.trim() },
      reportId,
    });
    router.push(`/reports/${reportId}/edit`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-fca-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-updraft-deep">Create New Report</h1>
          <p className="text-sm text-fca-gray">Set up a new CCRO compliance report</p>
        </div>
      </div>

      <div className="bento-card space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="rounded-lg bg-updraft-pale-purple/50 p-3">
            <FileText className="h-6 w-6 text-updraft-bright-purple" />
          </div>
          <div>
            <h2 className="font-semibold text-updraft-deep">Report Details</h2>
            <p className="text-sm text-fca-gray">Configure your new report</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fca-dark-gray mb-1.5">
              Report Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., CCRO Monthly Report"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-updraft-light-purple focus:outline-none focus:ring-1 focus:ring-updraft-light-purple"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fca-dark-gray mb-1.5">
              Report Period
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                onChange={(e) => {
                  const month = e.target.value;
                  const yearEl = document.getElementById("year-select") as HTMLSelectElement;
                  const year = yearEl?.value || currentYear;
                  if (month) setPeriod(`${month} ${year}`);
                }}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-updraft-light-purple focus:outline-none focus:ring-1 focus:ring-updraft-light-purple"
                defaultValue=""
              >
                <option value="" disabled>Select Month</option>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                id="year-select"
                onChange={(e) => {
                  if (period) {
                    const month = period.split(" ")[0];
                    setPeriod(`${month} ${e.target.value}`);
                  }
                }}
                defaultValue={currentYear}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-updraft-light-purple focus:outline-none focus:ring-1 focus:ring-updraft-light-purple"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {period && (
              <p className="mt-1.5 text-xs text-fca-gray">Period: {period}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-fca-dark-gray mb-1.5">
              Initial Template
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-lg border-2 border-updraft-light-purple bg-updraft-pale-purple/20 p-4 text-left hover:bg-updraft-pale-purple/40 transition-colors">
                <p className="font-medium text-sm text-updraft-deep">Standard CCRO Report</p>
                <p className="text-xs text-fca-gray mt-1">
                  Executive Summary, Consumer Duty, Risk Profile, Detailed Analysis
                </p>
              </button>
              <button className="rounded-lg border border-gray-200 p-4 text-left hover:border-updraft-light-purple transition-colors">
                <p className="font-medium text-sm text-fca-dark-gray">Blank Report</p>
                <p className="text-xs text-fca-gray mt-1">
                  Start from scratch with an empty report
                </p>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Link
            href="/reports"
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-fca-gray hover:bg-gray-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || !period.trim()}
            className="rounded-lg bg-updraft-bright-purple px-6 py-2.5 text-sm font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Report
          </button>
        </div>
      </div>
    </div>
  );
}
