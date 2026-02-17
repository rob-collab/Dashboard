"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { ExcoViewConfig, ExcoControlVisibility } from "@/lib/types";
import { Settings, Eye, EyeOff, Save, ExternalLink } from "lucide-react";

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

const SECTION_DEFINITIONS: {
  key: keyof Pick<
    ExcoViewConfig,
    | "showDashboardSummary"
    | "showPassRateByArea"
    | "showPassRateByCDOutcome"
    | "showAttestationOverview"
    | "showAttentionRequired"
    | "showTrendAnalysis"
    | "showQuarterlySummaries"
  >;
  label: string;
  description: string;
}[] = [
  {
    key: "showDashboardSummary",
    label: "Dashboard Summary Statistics",
    description: "Total active controls, pass/fail/partial counts, and percentages",
  },
  {
    key: "showPassRateByArea",
    label: "Pass Rate by Business Area",
    description: "Stacked bar chart showing test outcomes per business area",
  },
  {
    key: "showPassRateByCDOutcome",
    label: "Pass Rate by CD Outcome",
    description: "Donut charts for each Consumer Duty outcome category",
  },
  {
    key: "showAttestationOverview",
    label: "Attestation Overview",
    description: "Attestation completion rate and progress across business areas",
  },
  {
    key: "showAttentionRequired",
    label: "Attention Required Panel",
    description: "Controls that have failed, or not been tested for consecutive periods",
  },
  {
    key: "showTrendAnalysis",
    label: "Trend Analysis",
    description: "Month-over-month trend lines and direction of travel",
  },
  {
    key: "showQuarterlySummaries",
    label: "Quarterly Summaries",
    description: "Only approved quarterly narratives are shown to ExCo viewers",
  },
];

const VISIBILITY_OPTIONS: { value: ExcoControlVisibility; label: string }[] = [
  { value: "SHOW", label: "Show" },
  { value: "SUMMARY_ONLY", label: "Summary Only" },
  { value: "HIDE", label: "Hide" },
];

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function ExcoConfigTab() {
  const currentUser = useAppStore((s) => s.currentUser);
  const testingSchedule = useAppStore((s) => s.testingSchedule);

  /* Period selector — defaults to current month/year */
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  /* Year range for dropdown */
  const currentYear = now.getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  /* Config state */
  const [config, setConfig] = useState<ExcoViewConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  /* Control detail section expanded */
  const [controlDetailExpanded, setControlDetailExpanded] = useState(false);

  /* Active schedule entries with control info */
  const activeEntries = testingSchedule.filter((e) => e.isActive);

  /* ── Fetch config when period changes ──────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      setLoading(true);
      setSaveError(null);
      setSaveSuccess(false);
      setDirty(false);

      try {
        const data = await api<ExcoViewConfig>(
          `/api/controls/exco-view-config?periodYear=${selectedYear}&periodMonth=${selectedMonth}`,
        );
        if (!cancelled) {
          setConfig(data);
        }
      } catch {
        if (!cancelled) {
          // If no config exists yet, create a default
          setConfig({
            id: "",
            periodYear: selectedYear,
            periodMonth: selectedMonth,
            showDashboardSummary: true,
            showPassRateByArea: true,
            showPassRateByCDOutcome: true,
            showAttestationOverview: true,
            showAttentionRequired: true,
            showTrendAnalysis: true,
            showQuarterlySummaries: true,
            controlVisibility: {},
            configuredById: currentUser?.id ?? "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setDirty(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, [selectedYear, selectedMonth, currentUser?.id]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  const toggleSection = useCallback(
    (key: keyof ExcoViewConfig, value: boolean) => {
      setConfig((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: value };
      });
      setDirty(true);
      setSaveSuccess(false);
      setSaveError(null);
    },
    [],
  );

  const setControlVisibility = useCallback(
    (controlRef: string, visibility: ExcoControlVisibility) => {
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          controlVisibility: {
            ...prev.controlVisibility,
            [controlRef]: visibility,
          },
        };
      });
      setDirty(true);
      setSaveSuccess(false);
      setSaveError(null);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!config) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        periodYear: selectedYear,
        periodMonth: selectedMonth,
        showDashboardSummary: config.showDashboardSummary,
        showPassRateByArea: config.showPassRateByArea,
        showPassRateByCDOutcome: config.showPassRateByCDOutcome,
        showAttestationOverview: config.showAttestationOverview,
        showAttentionRequired: config.showAttentionRequired,
        showTrendAnalysis: config.showTrendAnalysis,
        showQuarterlySummaries: config.showQuarterlySummaries,
        controlVisibility: config.controlVisibility,
      };

      await api("/api/controls/exco-view-config", {
        method: "PUT",
        body: payload,
      });

      setSaveSuccess(true);
      setDirty(false);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to save configuration. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }, [config, selectedYear, selectedMonth]);

  /* ── Guards ────────────────────────────────────────────────────────────── */

  if (!currentUser || currentUser.role !== "CCRO_TEAM") {
    return (
      <div className="bento-card p-8 text-center text-gray-500">
        <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>ExCo view configuration is only available to CCRO Team members.</p>
      </div>
    );
  }

  const periodLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-poppins font-semibold text-updraft-deep flex items-center gap-2">
          <Settings className="w-5 h-5" />
          ExCo View Configuration
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure which sections and controls are visible to ExCo and Board
          viewers for the selected period.
        </p>
      </div>

      {/* Period selector */}
      <div className="bento-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-updraft-deep" />
              <span className="text-sm font-medium text-gray-700">Period:</span>
            </div>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
            >
              {yearOptions.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Preview link */}
          <a
            href={`/controls?view=exco&periodYear=${selectedYear}&periodMonth=${selectedMonth}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-updraft-bright-purple px-4 py-2 text-sm font-medium text-updraft-bright-purple hover:bg-updraft-pale-purple/20 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview as ExCo
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bento-card p-8 text-center text-gray-500">
          <Settings className="w-6 h-6 mx-auto mb-2 animate-spin text-updraft-deep" />
          Loading configuration...
        </div>
      )}

      {!loading && config && (
        <>
          {/* Section heading */}
          <div className="bento-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-updraft-deep" />
              <h3 className="text-sm font-poppins font-semibold text-gray-800">
                ExCo View Configuration &mdash; {periodLabel}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Toggle which dashboard sections ExCo and Board viewers can see for
              this period.
            </p>

            {/* Section toggles */}
            <div className="divide-y divide-gray-100">
              {SECTION_DEFINITIONS.map((section) => {
                const isEnabled = config[section.key] as boolean;
                return (
                  <div
                    key={section.key}
                    className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="text-sm font-medium text-gray-800">
                        {section.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {section.description}
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) =>
                          toggleSection(section.key, e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-updraft-bright-purple/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-updraft-bright-purple" />
                      <span className="ms-2 text-xs font-medium text-gray-600 w-10">
                        {isEnabled ? "Show" : "Hide"}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Control Visibility */}
          <div className="bento-card p-5">
            <button
              onClick={() => setControlDetailExpanded(!controlDetailExpanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-updraft-deep" />
                <h3 className="text-sm font-poppins font-semibold text-gray-800">
                  Individual Control Detail
                </h3>
                <span className="text-xs text-gray-400">
                  ({activeEntries.length} active control
                  {activeEntries.length !== 1 ? "s" : ""})
                </span>
              </div>
              <div
                className={`text-xs font-medium text-updraft-bright-purple flex items-center gap-1 transition-transform ${
                  controlDetailExpanded ? "" : ""
                }`}
              >
                {controlDetailExpanded ? "Collapse" : "Configure"}
                <svg
                  className={`w-4 h-4 transition-transform ${
                    controlDetailExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {controlDetailExpanded && (
              <div className="mt-4 divide-y divide-gray-100">
                {activeEntries.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                    No active controls on the testing schedule.
                  </div>
                ) : (
                  activeEntries.map((entry) => {
                    const controlRef =
                      entry.control?.controlRef ?? `entry-${entry.id}`;
                    const controlName =
                      entry.control?.controlName ?? "Unknown Control";
                    const visibility: ExcoControlVisibility =
                      config.controlVisibility[controlRef] ?? "SHOW";

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {visibility === "SHOW" && (
                              <Eye className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            )}
                            {visibility === "SUMMARY_ONLY" && (
                              <Eye className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                            {visibility === "HIDE" && (
                              <EyeOff className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            )}
                            <span className="text-xs font-mono font-semibold text-updraft-deep">
                              {controlRef}
                            </span>
                            <span className="text-sm text-gray-700 truncate">
                              {controlName}
                            </span>
                          </div>
                          {entry.control?.businessArea && (
                            <div className="text-xs text-gray-400 mt-0.5 ml-5">
                              {entry.control.businessArea.name}
                            </div>
                          )}
                        </div>

                        <select
                          value={visibility}
                          onChange={(e) =>
                            setControlVisibility(
                              controlRef,
                              e.target.value as ExcoControlVisibility,
                            )
                          }
                          className={`rounded-md border px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 shrink-0 ${
                            visibility === "SHOW"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : visibility === "SUMMARY_ONLY"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-gray-200 bg-gray-50 text-gray-500"
                          }`}
                        >
                          {VISIBILITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Save feedback */}
          {saveError && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <svg
                className="w-4 h-4 text-red-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              <svg
                className="w-4 h-4 text-green-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Configuration saved successfully for {periodLabel}.
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center justify-end gap-3">
            {dirty && (
              <span className="text-xs text-amber-600 font-medium">
                Unsaved changes
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-md bg-updraft-deep px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-updraft-deep/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Save className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
