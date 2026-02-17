"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  TestResultValue,
  TEST_RESULT_LABELS,
  CD_OUTCOME_LABELS,
  TestingScheduleEntry,
  ControlTestResult,
} from "@/lib/types";
import { Download, Globe, Printer } from "lucide-react";

/* ── Props ──────────────────────────────────────────────────────────────────── */

interface ExportPanelProps {
  selectedYear: number;
  selectedMonth: number;
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type HistoricalRange = 0 | 6 | 12;

/* ── Helpers ────────────────────────────────────────────────────────────────── */

/**
 * Resolve the months to include based on a base period and how many months
 * of history to include. Returns an array of { year, month } objects
 * from oldest to newest.
 */
function resolveMonths(
  year: number,
  month: number,
  includeMonths: HistoricalRange,
): { year: number; month: number }[] {
  const count = includeMonths === 0 ? 1 : includeMonths;
  const months: { year: number; month: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    let m = month - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push({ year: y, month: m });
  }
  return months;
}

/** Get the test result for a schedule entry in a specific period. */
function getResultForPeriod(
  entry: TestingScheduleEntry,
  year: number,
  month: number,
): ControlTestResult | null {
  const results = entry.testResults ?? [];
  return results.find(
    (r) => r.periodYear === year && r.periodMonth === month,
  ) ?? null;
}

/** Format a period as YYYY-MM. */
function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Escape a CSV cell value — wrap in quotes and escape inner quotes. */
function escapeCSV(value: string | null | undefined): string {
  const str = value ?? "";
  return `"${str.replace(/"/g, '""')}"`;
}

/** Trigger a file download in the browser. */
function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── CSV generation ─────────────────────────────────────────────────────────── */

function generateCSV(
  entries: TestingScheduleEntry[],
  year: number,
  month: number,
  includeMonths: HistoricalRange,
): string {
  const headers = [
    "Control Ref",
    "Control Name",
    "Business Area",
    "CD Outcome",
    "Testing Frequency",
    "Period",
    "Result",
    "Tester",
    "Notes",
    "Attested",
    "Attestation Comments",
  ];

  const months = resolveMonths(year, month, includeMonths);
  const rows: string[][] = [];

  for (const entry of entries) {
    if (!entry.isActive) continue;
    const control = entry.control;
    if (!control) continue;

    const controlRef = control.controlRef ?? "";
    const controlName = control.controlName ?? "";
    const businessArea = control.businessArea?.name ?? "";
    const cdOutcome = CD_OUTCOME_LABELS[control.consumerDutyOutcome] ?? control.consumerDutyOutcome ?? "";
    const frequency = entry.testingFrequency ?? "";

    for (const { year: pYear, month: pMonth } of months) {
      const result = getResultForPeriod(entry, pYear, pMonth);
      const resultLabel = result ? TEST_RESULT_LABELS[result.result] : "Not Due";
      const tester = result?.testedBy?.name ?? "";
      const notes = result?.notes ?? "";

      // Look up attestation from the control record
      const attestation = control.attestations?.find(
        (a) => a.periodYear === pYear && a.periodMonth === pMonth,
      );
      const attested = attestation ? (attestation.attested ? "Yes" : "No") : "";
      const attestationComments = attestation?.comments ?? "";

      rows.push([
        controlRef,
        controlName,
        businessArea,
        cdOutcome,
        frequency,
        formatPeriod(pYear, pMonth),
        resultLabel,
        tester,
        notes,
        attested,
        attestationComments,
      ]);
    }
  }

  return [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");
}

/* ── HTML summary generation ────────────────────────────────────────────────── */

function generateHTMLSummary(
  entries: TestingScheduleEntry[],
  year: number,
  month: number,
): string {
  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const active = entries.filter((e) => e.isActive);

  // Build result counts
  const counts: Record<TestResultValue, number> = {
    PASS: 0,
    FAIL: 0,
    PARTIALLY: 0,
    NOT_TESTED: 0,
    NOT_DUE: 0,
  };
  for (const entry of active) {
    const result = getResultForPeriod(entry, year, month);
    const value: TestResultValue = result?.result ?? "NOT_DUE";
    counts[value]++;
  }

  const total = active.length;
  const tested = total - counts.NOT_DUE;
  const passRate = tested > 0 ? ((counts.PASS / tested) * 100).toFixed(1) : "N/A";

  // Build pass rate by business area
  const areaMap = new Map<string, { pass: number; tested: number; total: number }>();
  for (const entry of active) {
    const areaName = entry.control?.businessArea?.name ?? "Unknown";
    if (!areaMap.has(areaName)) {
      areaMap.set(areaName, { pass: 0, tested: 0, total: 0 });
    }
    const area = areaMap.get(areaName)!;
    area.total++;

    const result = getResultForPeriod(entry, year, month);
    const value: TestResultValue = result?.result ?? "NOT_DUE";
    if (value !== "NOT_DUE") {
      area.tested++;
      if (value === "PASS") area.pass++;
    }
  }

  const areaRows = Array.from(areaMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, data]) => {
      const rate = data.tested > 0 ? ((data.pass / data.tested) * 100).toFixed(1) : "N/A";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${data.total}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${data.tested}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${data.pass}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;">${rate}%</td>
      </tr>`;
    })
    .join("\n");

  // Key findings
  const failEntries = active.filter((entry) => {
    const r = getResultForPeriod(entry, year, month);
    return r?.result === "FAIL";
  });
  const partialEntries = active.filter((entry) => {
    const r = getResultForPeriod(entry, year, month);
    return r?.result === "PARTIALLY";
  });
  const notTestedEntries = active.filter((entry) => {
    const r = getResultForPeriod(entry, year, month);
    return r?.result === "NOT_TESTED";
  });

  let findingsHTML = "";
  if (failEntries.length > 0) {
    const items = failEntries
      .map((e) => `<li style="margin-bottom:4px;"><strong>${e.control?.controlRef ?? ""}</strong> ${e.control?.controlName ?? ""}</li>`)
      .join("\n");
    findingsHTML += `
      <div style="margin-bottom:16px;">
        <h3 style="color:#dc2626;font-size:14px;margin:0 0 8px 0;">Failed Controls (${failEntries.length})</h3>
        <ul style="margin:0;padding-left:20px;font-size:13px;color:#374151;">${items}</ul>
      </div>`;
  }
  if (partialEntries.length > 0) {
    const items = partialEntries
      .map((e) => `<li style="margin-bottom:4px;"><strong>${e.control?.controlRef ?? ""}</strong> ${e.control?.controlName ?? ""}</li>`)
      .join("\n");
    findingsHTML += `
      <div style="margin-bottom:16px;">
        <h3 style="color:#d97706;font-size:14px;margin:0 0 8px 0;">Partially Effective Controls (${partialEntries.length})</h3>
        <ul style="margin:0;padding-left:20px;font-size:13px;color:#374151;">${items}</ul>
      </div>`;
  }
  if (notTestedEntries.length > 0) {
    findingsHTML += `
      <div style="margin-bottom:16px;">
        <h3 style="color:#6b7280;font-size:14px;margin:0 0 8px 0;">Not Tested (${notTestedEntries.length})</h3>
        <p style="margin:0;font-size:13px;color:#6b7280;">${notTestedEntries.length} control(s) were due for testing but were not tested this period.</p>
      </div>`;
  }
  if (!findingsHTML) {
    findingsHTML = `<p style="color:#059669;font-size:14px;">All tested controls passed for this period.</p>`;
  }

  const resultBadge = (label: string, count: number, colour: string) =>
    `<span style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;background:${colour}20;color:${colour};margin-right:8px;">${label}: ${count}</span>`;

  const timestamp = new Date().toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Controls Testing Summary — ${periodLabel}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#311B92 0%,#7B1FA2 100%);padding:32px 40px;color:#fff;">
    <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Controls Testing Summary</h1>
    <p style="margin:6px 0 0;font-size:14px;opacity:0.85;">${periodLabel}</p>
  </div>

  <div style="max-width:800px;margin:0 auto;padding:32px 24px;">
    <!-- Summary statistics -->
    <h2 style="font-size:16px;color:#311B92;margin:0 0 16px;font-weight:600;">Overview</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Metric</th>
          <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Total Controls in Schedule</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;">${total}</td></tr>
        <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Tested This Period</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;">${tested}</td></tr>
        <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Overall Pass Rate</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;color:#311B92;">${passRate}%</td></tr>
      </tbody>
    </table>

    <!-- Result breakdown badges -->
    <div style="margin-bottom:24px;">
      ${resultBadge("Pass", counts.PASS, "#22c55e")}
      ${resultBadge("Fail", counts.FAIL, "#ef4444")}
      ${resultBadge("Partial", counts.PARTIALLY, "#f59e0b")}
      ${resultBadge("Not Tested", counts.NOT_TESTED, "#9ca3af")}
      ${resultBadge("Not Due", counts.NOT_DUE, "#d1d5db")}
    </div>

    <!-- Pass rate by business area -->
    <h2 style="font-size:16px;color:#311B92;margin:0 0 16px;font-weight:600;">Pass Rate by Business Area</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Business Area</th>
          <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Total</th>
          <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Tested</th>
          <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Passed</th>
          <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Pass Rate</th>
        </tr>
      </thead>
      <tbody>
        ${areaRows || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#9ca3af;">No data available</td></tr>'}
      </tbody>
    </table>

    <!-- Key findings -->
    <h2 style="font-size:16px;color:#311B92;margin:0 0 16px;font-weight:600;">Key Findings</h2>
    ${findingsHTML}

    <!-- Footer -->
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
    <p style="font-size:11px;color:#9ca3af;margin:0;">
      Generated on ${timestamp} &middot; Updraft CCRO Dashboard
    </p>
  </div>
</body>
</html>`;
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function ExportPanel({
  selectedYear,
  selectedMonth,
}: ExportPanelProps) {
  const testingSchedule = useAppStore((s) => s.testingSchedule);
  const controls = useAppStore((s) => s.controls);
  const currentUser = useAppStore((s) => s.currentUser);

  const [historicalRange, setHistoricalRange] = useState<HistoricalRange>(0);
  const [loadingCSV, setLoadingCSV] = useState(false);
  const [loadingHTML, setLoadingHTML] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isCCROTeam = currentUser?.role === "CCRO_TEAM";
  const periodLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  // Enrich schedule entries with their associated control records
  // (testingSchedule entries may already have control populated; if not, look it up)
  const enrichedEntries: TestingScheduleEntry[] = testingSchedule.map((entry) => {
    if (entry.control) return entry;
    const control = controls.find((c) => c.id === entry.controlId);
    return control ? { ...entry, control } : entry;
  });

  /* ── Status toast ─────────────────────────────────────────────────────────── */

  function showStatus(message: string) {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 3000);
  }

  /* ── CSV export ───────────────────────────────────────────────────────────── */

  async function handleCSVExport() {
    setLoadingCSV(true);
    try {
      // Small delay to allow spinner to render
      await new Promise((r) => setTimeout(r, 50));

      const csv = generateCSV(
        enrichedEntries,
        selectedYear,
        selectedMonth,
        historicalRange,
      );

      const rangeLabel =
        historicalRange === 0
          ? formatPeriod(selectedYear, selectedMonth)
          : `${historicalRange}m-to-${formatPeriod(selectedYear, selectedMonth)}`;
      const filename = `controls-test-results-${rangeLabel}.csv`;
      downloadFile(csv, filename, "text/csv;charset=utf-8;");
      showStatus("CSV downloaded successfully");
    } catch (err) {
      console.error("[ExportPanel] CSV export failed:", err);
      showStatus("CSV export failed — see console for details");
    } finally {
      setLoadingCSV(false);
    }
  }

  /* ── HTML summary export ──────────────────────────────────────────────────── */

  async function handleHTMLExport() {
    setLoadingHTML(true);
    try {
      await new Promise((r) => setTimeout(r, 50));

      const html = generateHTMLSummary(
        enrichedEntries,
        selectedYear,
        selectedMonth,
      );

      // Try to copy to clipboard; fall back to opening in new window
      let copied = false;
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(html);
          copied = true;
        } catch {
          // Clipboard API blocked — fall back
        }
      }

      // Always open in new window for preview
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
      }

      showStatus(
        copied
          ? "HTML copied to clipboard and opened in new tab"
          : "HTML summary opened in new tab",
      );
    } catch (err) {
      console.error("[ExportPanel] HTML export failed:", err);
      showStatus("HTML export failed — see console for details");
    } finally {
      setLoadingHTML(false);
    }
  }

  /* ── Print dashboard ──────────────────────────────────────────────────────── */

  async function handlePrint() {
    setLoadingPrint(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      window.print();
      showStatus("Print dialogue opened");
    } catch (err) {
      console.error("[ExportPanel] Print failed:", err);
      showStatus("Print failed — see console for details");
    } finally {
      setLoadingPrint(false);
    }
  }

  /* ── Spinner helper ───────────────────────────────────────────────────────── */

  function Spinner() {
    return (
      <svg
        className="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    );
  }

  /* ── Render ────────────────────────────────────────────────────────────────── */

  return (
    <div className="bento-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold font-poppins text-updraft-deep">
          Export Data
        </h3>
        {statusMessage && (
          <span className="text-xs font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full animate-fade-in">
            {statusMessage}
          </span>
        )}
      </div>

      {/* Export buttons row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* CSV Export — CCRO_TEAM only */}
        {isCCROTeam && (
          <button
            onClick={handleCSVExport}
            disabled={loadingCSV}
            className="inline-flex items-center gap-2 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingCSV ? <Spinner /> : <Download className="w-4 h-4" />}
            CSV Results
          </button>
        )}

        {/* HTML Summary — CCRO_TEAM only */}
        {isCCROTeam && (
          <button
            onClick={handleHTMLExport}
            disabled={loadingHTML}
            className="inline-flex items-center gap-2 rounded-lg bg-updraft-bar px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingHTML ? <Spinner /> : <Globe className="w-4 h-4" />}
            HTML Summary
          </button>
        )}

        {/* Print Dashboard — all users */}
        <button
          onClick={handlePrint}
          disabled={loadingPrint}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingPrint ? <Spinner /> : <Printer className="w-4 h-4" />}
          Print Dashboard
        </button>
      </div>

      {/* Period and historical range */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="font-medium">
          Period: <span className="text-gray-700">{periodLabel}</span>
        </span>

        {isCCROTeam && (
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-500">Include historical:</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={historicalRange === 6}
                onChange={() =>
                  setHistoricalRange((prev) => (prev === 6 ? 0 : 6))
                }
                className="h-3.5 w-3.5 rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bright-purple"
              />
              <span>Last 6 months</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={historicalRange === 12}
                onChange={() =>
                  setHistoricalRange((prev) => (prev === 12 ? 0 : 12))
                }
                className="h-3.5 w-3.5 rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bright-purple"
              />
              <span>Last 12 months</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
