"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { Download, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionKey =
  | "executive_summary"
  | "risk_register"
  | "controls"
  | "compliance"
  | "consumer_duty"
  | "or_resilience"
  | "process_library"
  | "actions"
  | "audit_trail"
  | "horizon_scanning"
  | "smcr_register"
  | "policies"
  | "control_test_results"
  | "risk_acceptances";

interface SectionDef {
  key: SectionKey;
  label: string;
  description: string;
  getCount: (store: ReturnType<typeof useAppStore.getState>) => number;
  filters?: FilterField[];
}

interface FilterField {
  key: string;
  label: string;
  type: "select" | "toggle" | "date" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

const SECTIONS: SectionDef[] = [
  {
    key: "executive_summary",
    label: "Executive Summary",
    description: "KPI grid, compliance status donut, headline metrics",
    getCount: () => 1,
  },
  {
    key: "risk_register",
    label: "Risk Register",
    description: "All risks with heat map, scores and directional arrows",
    getCount: (s) => s.risks.length,
    filters: [
      {
        key: "riskCategory",
        label: "Category",
        type: "select",
        options: [
          { value: "", label: "All categories" },
          { value: "Operational", label: "Operational" },
          { value: "Financial", label: "Financial" },
          { value: "Strategic", label: "Strategic" },
          { value: "Regulatory", label: "Regulatory" },
        ],
      },
      {
        key: "includeRiskDeepDives",
        label: "Include risk deep-dives",
        type: "toggle",
      },
    ],
  },
  {
    key: "controls",
    label: "Controls Library",
    description: "Active controls with type, owner and linked processes",
    getCount: (s) => s.controls.length,
    filters: [
      {
        key: "controlType",
        label: "Control Type",
        type: "select",
        options: [
          { value: "", label: "All types" },
          { value: "PREVENTIVE", label: "Preventive" },
          { value: "DETECTIVE", label: "Detective" },
          { value: "CORRECTIVE", label: "Corrective" },
          { value: "DIRECTIVE", label: "Directive" },
        ],
      },
    ],
  },
  {
    key: "compliance",
    label: "Compliance Universe",
    description: "Regulations with RAG status, provisions and obligations",
    getCount: (s) => s.regulations.length,
    filters: [
      {
        key: "nonCompliantOnly",
        label: "Non-compliant items only",
        type: "toggle",
      },
    ],
  },
  {
    key: "consumer_duty",
    label: "Consumer Duty Dashboard",
    description: "Four outcome areas with RAG status and narrative",
    getCount: (s) => s.outcomes.length,
  },
  {
    key: "or_resilience",
    label: "Operational Resilience",
    description: "IBS readiness, scenario testing results and self-assessment",
    getCount: (s) => s.ibs.length,
  },
  {
    key: "process_library",
    label: "Process Library",
    description: "Processes with maturity scores, steps and linked controls",
    getCount: (s) => s.processes.length,
    filters: [
      {
        key: "processCriticality",
        label: "Criticality",
        type: "select",
        options: [
          { value: "", label: "All criticality" },
          { value: "CRITICAL", label: "Critical" },
          { value: "IMPORTANT", label: "Important" },
          { value: "STANDARD", label: "Standard" },
        ],
      },
      {
        key: "processMinMaturity",
        label: "Min Maturity",
        type: "select",
        options: [
          { value: "", label: "Any maturity" },
          { value: "1", label: "Level 1+" },
          { value: "2", label: "Level 2+" },
          { value: "3", label: "Level 3+" },
          { value: "4", label: "Level 4+" },
          { value: "5", label: "Level 5 only" },
        ],
      },
    ],
  },
  {
    key: "actions",
    label: "Actions Register",
    description: "Open and completed actions with owners and due dates",
    getCount: (s) => s.actions.length,
    filters: [
      {
        key: "actionStatus",
        label: "Status",
        type: "select",
        options: [
          { value: "", label: "All statuses" },
          { value: "OPEN", label: "Open" },
          { value: "IN_PROGRESS", label: "In Progress" },
          { value: "COMPLETED", label: "Completed" },
          { value: "OVERDUE", label: "Overdue" },
        ],
      },
      {
        key: "includeActionSpotlights",
        label: "Include action spotlights",
        type: "toggle",
      },
    ],
  },
  {
    key: "audit_trail",
    label: "Audit Trail",
    description: "Chronological activity log (last 30 days by default)",
    getCount: () => 0,
    filters: [
      { key: "auditFrom", label: "From date", type: "date" },
      { key: "auditTo", label: "To date", type: "date" },
    ],
  },
  {
    key: "horizon_scanning",
    label: "Horizon Scanning",
    description: "Regulatory and legislative horizon items under monitoring",
    getCount: () => 0,
    filters: [
      {
        key: "horizonStatus",
        label: "Status",
        type: "select",
        options: [
          { value: "", label: "All statuses" },
          { value: "MONITORING", label: "Monitoring" },
          { value: "ACTION_REQUIRED", label: "Action Required" },
          { value: "IN_PROGRESS", label: "In Progress" },
          { value: "COMPLETED", label: "Completed" },
          { value: "DISMISSED", label: "Dismissed" },
        ],
      },
    ],
  },
  {
    key: "smcr_register",
    label: "SMCR Register",
    description: "Senior Manager Function roles and prescribed responsibilities",
    getCount: () => 0,
  },
  {
    key: "policies",
    label: "Policies",
    description: "Policy library with review dates, owners and status",
    getCount: () => 0,
    filters: [
      {
        key: "policyStatus",
        label: "Status",
        type: "select",
        options: [
          { value: "", label: "All statuses" },
          { value: "CURRENT", label: "Current" },
          { value: "UNDER_REVIEW", label: "Under Review" },
          { value: "OVERDUE", label: "Overdue Review" },
          { value: "ARCHIVED", label: "Archived" },
        ],
      },
    ],
  },
  {
    key: "control_test_results",
    label: "Control Test Results",
    description: "Testing results by period, grouped by control",
    getCount: () => 0,
    filters: [
      {
        key: "testPeriodYear",
        label: "Year",
        type: "select",
        options: [
          { value: "", label: "All years" },
          { value: "2026", label: "2026" },
          { value: "2025", label: "2025" },
          { value: "2024", label: "2024" },
        ],
      },
      {
        key: "testPeriodMonth",
        label: "Month",
        type: "select",
        options: [
          { value: "", label: "All months" },
          { value: "1", label: "January" }, { value: "2", label: "February" },
          { value: "3", label: "March" }, { value: "4", label: "April" },
          { value: "5", label: "May" }, { value: "6", label: "June" },
          { value: "7", label: "July" }, { value: "8", label: "August" },
          { value: "9", label: "September" }, { value: "10", label: "October" },
          { value: "11", label: "November" }, { value: "12", label: "December" },
        ],
      },
    ],
  },
  {
    key: "risk_acceptances",
    label: "Risk Acceptances",
    description: "Formal risk acceptance records with rationale and approvals",
    getCount: () => 0,
    filters: [
      {
        key: "riskAcceptanceStatus",
        label: "Status",
        type: "select",
        options: [
          { value: "", label: "All statuses" },
          { value: "PROPOSED", label: "Proposed" },
          { value: "CCRO_REVIEW", label: "CCRO Review" },
          { value: "AWAITING_APPROVAL", label: "Awaiting Approval" },
          { value: "APPROVED", label: "Approved" },
          { value: "REJECTED", label: "Rejected" },
          { value: "EXPIRED", label: "Expired" },
        ],
      },
    ],
  },
];

export default function ExportCentrePage() {
  const store = useAppStore.getState();
  const risks = useAppStore((s) => s.risks);
  const controls = useAppStore((s) => s.controls);
  const regulations = useAppStore((s) => s.regulations);
  const outcomes = useAppStore((s) => s.outcomes);
  const ibs = useAppStore((s) => s.ibs);
  const processes = useAppStore((s) => s.processes);
  const actions = useAppStore((s) => s.actions);

  const liveStore = useMemo(
    () => ({ ...store, risks, controls, regulations, outcomes, ibs, processes, actions }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [risks, controls, regulations, outcomes, ibs, processes, actions]
  );

  const [selectedSections, setSelectedSections] = useState<Set<SectionKey>>(
    new Set<SectionKey>(["executive_summary", "risk_register", "controls", "compliance"])
  );
  const [expandedFilters, setExpandedFilters] = useState<Set<SectionKey>>(new Set());
  const [filters, setFilters] = useState<Record<string, string | boolean>>({});
  const [firmName, setFirmName] = useState("Updraft");
  const [packTitle, setPackTitle] = useState("CCRO Board Pack");
  const [watermark, setWatermark] = useState<"NONE" | "CONFIDENTIAL" | "DRAFT">("NONE");
  const [interactive, setInteractive] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSection(key: SectionKey) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleFilterExpand(key: SectionKey) {
    setExpandedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function setFilter(key: string, value: string | boolean) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerate() {
    if (selectedSections.size === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const processedFilters: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(filters)) {
        if (v === "" || v === null || v === undefined) continue;
        if ((k === "processMinMaturity" || k === "testPeriodYear" || k === "testPeriodMonth") && typeof v === "string") {
          processedFilters[k] = parseInt(v, 10);
        } else {
          processedFilters[k] = v;
        }
      }

      const res = await fetch("/api/export/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: Array.from(selectedSections),
          filters: processedFilters,
          options: { firmName, packTitle, watermark, interactive },
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "Export failed");
        throw new Error(msg);
      }

      const blob = await res.blob();
      const now = new Date();
      const filename = `CCRO_Pack_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.html`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/40">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-updraft-deep/10 flex items-center justify-center">
            <Download size={18} className="text-updraft-deep" />
          </div>
          <div>
            <h1 className="font-poppins font-semibold text-gray-900 text-lg">Export Centre</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Generate self-contained interactive HTML packs for board, auditors and regulators
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* ── Left: Section Checklist ─────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-700">Select Sections</p>
              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => setSelectedSections(new Set(SECTIONS.map((s) => s.key)))}
                  className="text-updraft-deep hover:underline"
                >
                  Select all
                </button>
                <button onClick={() => setSelectedSections(new Set())} className="text-gray-400 hover:underline">
                  Clear
                </button>
              </div>
            </div>

            {SECTIONS.map((sec) => {
              const isSelected = selectedSections.has(sec.key);
              const hasFilters = (sec.filters?.length ?? 0) > 0;
              const isFilterExpanded = expandedFilters.has(sec.key);
              const count = sec.getCount(liveStore as ReturnType<typeof useAppStore.getState>);

              return (
                <div
                  key={sec.key}
                  className={cn(
                    "rounded-xl border transition-colors",
                    isSelected ? "border-updraft-bright-purple/30 bg-white" : "border-gray-200 bg-gray-50/50"
                  )}
                >
                  <div className="flex items-start gap-3 p-4">
                    <input
                      type="checkbox"
                      id={`section-${sec.key}`}
                      checked={isSelected}
                      onChange={() => toggleSection(sec.key)}
                      className="mt-0.5 accent-updraft-deep"
                    />
                    <label
                      htmlFor={`section-${sec.key}`}
                      className={cn("flex-1 cursor-pointer", !isSelected && "opacity-60")}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{sec.label}</span>
                        {count > 0 && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {count === 1 && sec.key === "executive_summary" ? "summary" : `${count} items`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{sec.description}</p>
                    </label>

                    {isSelected && hasFilters && (
                      <button
                        type="button"
                        onClick={() => toggleFilterExpand(sec.key)}
                        className="text-gray-400 hover:text-gray-600 mt-0.5"
                        title="Filter options"
                      >
                        {isFilterExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>

                  {/* Filter panel */}
                  {isSelected && hasFilters && isFilterExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 grid grid-cols-2 gap-3">
                      {sec.filters!.map((f) => (
                        <div key={f.key}>
                          <label className="text-xs font-medium text-gray-500 block mb-1">{f.label}</label>
                          {f.type === "select" && (
                            <select
                              value={(filters[f.key] as string) ?? ""}
                              onChange={(e) => setFilter(f.key, e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
                            >
                              {f.options?.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {f.type === "toggle" && (
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="checkbox"
                                id={`filter-${f.key}`}
                                checked={(filters[f.key] as boolean) ?? false}
                                onChange={(e) => setFilter(f.key, e.target.checked)}
                                className="accent-updraft-deep"
                              />
                              <label htmlFor={`filter-${f.key}`} className="text-xs text-gray-600">
                                Enable
                              </label>
                            </div>
                          )}
                          {f.type === "date" && (
                            <input
                              type="date"
                              value={(filters[f.key] as string) ?? ""}
                              onChange={(e) => setFilter(f.key, e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Right: Options + Generate ───────────────────────────────────── */}
          <div className="space-y-4">
            {/* Options panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Pack Options</p>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Firm Name</label>
                <input
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Updraft"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Pack Title</label>
                <input
                  value={packTitle}
                  onChange={(e) => setPackTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="CCRO Board Pack"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Watermark</label>
                <select
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value as "NONE" | "CONFIDENTIAL" | "DRAFT")}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="NONE">None</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-700">Interactive features</p>
                  <p className="text-xs text-gray-400">Expandable rows, live search, TOC</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInteractive((v) => !v)}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    interactive ? "bg-updraft-deep" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      interactive ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Export Summary</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Sections</span>
                  <span className="font-medium text-gray-900">{selectedSections.size} / {SECTIONS.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Watermark</span>
                  <span className="font-medium text-gray-900">{watermark === "NONE" ? "None" : watermark}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Interactive</span>
                  <span className="font-medium text-gray-900">{interactive ? "Yes" : "No (static)"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Format</span>
                  <span className="font-medium text-gray-900">Self-contained HTML</span>
                </div>
              </div>
            </div>

            {/* Generate button */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || selectedSections.size === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-updraft-deep text-white rounded-xl font-medium text-sm hover:bg-updraft-bar disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating pack…
                </>
              ) : (
                <>
                  <Download size={16} />
                  Generate &amp; Download
                </>
              )}
            </button>

            {selectedSections.size === 0 && (
              <p className="text-xs text-center text-gray-400">Select at least one section to generate</p>
            )}

            {/* Help */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
              <div className="flex items-start gap-2">
                <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-medium text-gray-600">About the export</p>
                  <p>
                    The generated HTML file is fully self-contained — no internet connection required.
                    It includes all charts, styles and data inline.
                  </p>
                  <p>
                    Open in any modern browser. Use <kbd className="font-mono bg-white border border-gray-200 px-1 rounded">Ctrl+P</kbd> to print — all details auto-expand in print mode.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
