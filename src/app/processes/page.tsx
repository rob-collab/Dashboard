"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Layers, BarChart2, ShieldCheck, Library, FileText, Download, Upload, X, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { parseCsv } from "@/lib/parse-csv";
import { toast } from "sonner";
import type { Process } from "@/lib/types";
import ProcessListTable from "@/components/processes/ProcessListTable";
import ProcessDetailPanel from "@/components/processes/ProcessDetailPanel";
import ProcessFormDialog from "@/components/processes/ProcessFormDialog";
import ProcessInsightsPanel from "@/components/processes/ProcessInsightsPanel";
import { EmptyState } from "@/components/common/EmptyState";
import { PageLoadingState } from "@/components/common/LoadingState";
import HistoryTab from "@/components/common/HistoryTab";
import IBSRegistryTab from "@/components/or/IBSRegistryTab";
import ORDashboard from "@/components/or/ORDashboard";
import SelfAssessmentTab from "@/components/or/SelfAssessmentTab";
import { cn } from "@/lib/utils";

type Tab = "processes" | "ibs" | "or-overview" | "self-assessment" | "history";

const VALID_TABS: Tab[] = ["processes", "ibs", "or-overview", "self-assessment", "history"];

function getTabFromParam(param: string | null): Tab {
  if (param && VALID_TABS.includes(param as Tab)) return param as Tab;
  return "processes";
}

export default function ProcessesPage() {
  const hydrated = useAppStore((s) => s._hydrated);
  const processes = useAppStore((s) => s.processes);
  const addProcess = useAppStore((s) => s.addProcess);
  const updateProcess = useAppStore((s) => s.updateProcess);
  const currentUser = useAppStore((s) => s.currentUser);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  // My/All toggle — explicit, replaces the silent OWNER-only filter
  const myProcessesCount = processes.filter((p) => p.ownerId === currentUser?.id).length;
  const [viewMode, setViewMode] = useState<"all" | "my">("all");
  const [viewModeSet, setViewModeSet] = useState(false);
  useEffect(() => {
    if (!hydrated || viewModeSet) return;
    if (!isCCRO && currentUser?.id) {
      const owned = processes.filter((p) => p.ownerId === currentUser.id);
      setViewMode(owned.length > 0 ? "my" : "all");
    }
    setViewModeSet(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const displayProcesses = viewMode === "my" && currentUser?.id
    ? processes.filter((p) => p.ownerId === currentUser.id)
    : processes;
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>(() =>
    getTabFromParam(searchParams.get("tab"))
  );

  // ID of IBS to auto-open when navigating from OR Dashboard
  const [initialIbsId, setInitialIbsId] = useState<string | null>(null);

  // Sync activeTab from URL
  useEffect(() => {
    setActiveTab(getTabFromParam(searchParams.get("tab")));
  }, [searchParams]);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "processes") {
      params.delete("tab");
      params.delete("process");
      setSelectedProcess(null);
    } else if (tab === "history") {
      params.set("tab", "history");
      params.delete("process");
      setSelectedProcess(null);
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(qs ? `/processes?${qs}` : "/processes", { scroll: false });
  }

  function handleDashboardIbsClick(id: string) {
    setInitialIbsId(id);
    handleTabChange("ibs");
  }

  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  // PV1: CSV export/import state
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const [insightsData, setInsightsData] = useState<Parameters<typeof ProcessInsightsPanel>[0]["data"] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Open process from URL param (e.g. EntityLink navigation)
  useEffect(() => {
    const processId = searchParams.get("process");
    if (processId && processes.length > 0) {
      const p = processes.find((proc) => proc.id === processId);
      if (p) setSelectedProcess(p);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, processes.length]);

  // Sync selected process with store updates
  useEffect(() => {
    if (!selectedProcess) return;
    const updated = processes.find((p) => p.id === selectedProcess.id);
    if (updated) setSelectedProcess(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processes]);

  // Write ?process=<id> to URL when panel opens; clear when it closes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedProcess) {
      if (params.get("process") !== selectedProcess.id) {
        params.set("process", selectedProcess.id);
        router.replace(`/processes?${params.toString()}`, { scroll: false });
      }
    } else {
      if (params.has("process")) {
        params.delete("process");
        router.replace(`/processes?${params.toString()}`, { scroll: false });
      }
    }
  // searchParams deliberately excluded — read once per panel state change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProcess?.id]);

  async function loadInsights() {
    setInsightsLoading(true);
    try {
      const data = await api<Parameters<typeof ProcessInsightsPanel>[0]["data"]>("/api/processes/insights");
      setInsightsData(data);
      setShowInsights(true);
    } catch {
      setShowInsights(false);
    } finally {
      setInsightsLoading(false);
    }
  }

  function handleProcessUpdate(updated: Process) {
    updateProcess(updated.id, updated);
    setSelectedProcess(updated);
  }

  function handleProcessCreate(created: Process) {
    addProcess(created);
    setSelectedProcess(created);
  }

  function handleProcessClick(p: Process) {
    setSelectedProcess(p);
  }

  function handleInsightsProcessClick(id: string) {
    const p = processes.find((proc) => proc.id === id);
    if (p) setSelectedProcess(p);
  }

  function handleExport() {
    const url = "/api/processes/export";
    const a = document.createElement("a");
    a.href = url;
    a.download = `processes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setImportRows(rows);
    };
    reader.readAsText(file);
  }

  async function handleImportSubmit() {
    if (importRows.length === 0) return;
    setImportLoading(true);
    try {
      const result = await api<{ created: number; updated: number; errors: string[] }>("/api/processes/import", {
        method: "POST",
        body: { rows: importRows },
      });
      setImportResult(result);
      if (result.created > 0 || result.updated > 0) {
        toast.success(`Import complete: ${result.created} created, ${result.updated} updated`);
      }
    } catch {
      toast.error("Import failed — check the file format and try again");
    } finally {
      setImportLoading(false);
    }
  }

  if (!hydrated) return <PageLoadingState />;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-updraft-pale-purple/30 p-2">
            <Layers size={18} className="text-updraft-deep" />
          </div>
          <div>
            <h1 className="font-poppins font-semibold text-gray-900 text-lg">Processes &amp; IBS</h1>
            <p className="text-xs text-gray-500">
              {processes.filter((p) => p.status !== "RETIRED").length} active processes · FCA PS21/3 · CMORG v3
            </p>
          </div>
        </div>
        {activeTab === "processes" && (
          <div className="flex items-center gap-2">
            <button
              onClick={showInsights ? () => setShowInsights(false) : loadInsights}
              disabled={insightsLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <BarChart2 size={12} />
              {showInsights ? "Hide Insights" : insightsLoading ? "Loading…" : "Insights"}
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={12} />
              Export CSV
            </button>
            {isCCRO && (
              <button
                onClick={() => { setShowImport(true); setImportRows([]); setImportFileName(""); setImportResult(null); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload size={12} />
                Import CSV
              </button>
            )}
            {isCCRO && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-deep text-white px-3 py-1.5 text-xs font-medium hover:bg-updraft-bar transition-colors"
              >
                + New Process
              </button>
            )}
          </div>
        )}
      </div>

      {/* Page tab bar */}
      <div className="flex gap-1 px-6 border-b border-gray-200 bg-white shrink-0">
        <button
          key="processes"
          type="button"
          onClick={() => handleTabChange("processes")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "processes"
              ? "border-updraft-bright-purple text-updraft-deep"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Processes
        </button>

        {/* Divider between Process and OR tabs */}
        <span className="flex items-center px-1 text-gray-300 text-sm select-none">|</span>

        <button
          key="ibs"
          type="button"
          onClick={() => handleTabChange("ibs")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "ibs"
              ? "border-updraft-bright-purple text-updraft-deep"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <Library size={14} />
          IBS Registry
        </button>
        <button
          key="or-overview"
          type="button"
          onClick={() => handleTabChange("or-overview")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "or-overview"
              ? "border-updraft-bright-purple text-updraft-deep"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <ShieldCheck size={14} />
          Resilience Overview
        </button>
        <button
          key="self-assessment"
          type="button"
          onClick={() => handleTabChange("self-assessment")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "self-assessment"
              ? "border-updraft-bright-purple text-updraft-deep"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <FileText size={14} />
          Self-Assessment
        </button>

        {/* Divider before History */}
        <span className="flex items-center px-1 text-gray-300 text-sm select-none">|</span>

        <button
          key="history"
          type="button"
          onClick={() => handleTabChange("history")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "history"
              ? "border-updraft-bright-purple text-updraft-deep"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          History
        </button>
      </div>

      {/* History tab */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto p-6">
          <HistoryTab
            entityTypes={["process"]}
            title="Process Library History"
            description="Audit trail of process changes, version updates and link events."
          />
        </div>
      )}

      {/* IBS Registry tab */}
      {activeTab === "ibs" && (
        <div className="h-full flex overflow-hidden">
          <IBSRegistryTab isCCRO={isCCRO} initialIbsId={initialIbsId} />
        </div>
      )}

      {/* Resilience Overview tab */}
      {activeTab === "or-overview" && (
        <div className="flex-1 overflow-y-auto p-6">
          <ORDashboard onSelectIbs={handleDashboardIbsClick} />
        </div>
      )}

      {/* Self-Assessment tab */}
      {activeTab === "self-assessment" && (
        <div className="flex-1 overflow-y-auto p-6">
          <SelfAssessmentTab isCCRO={isCCRO} />
        </div>
      )}

      {/* Insights panel — only on processes tab */}
      {activeTab === "processes" && showInsights && insightsData && (
        <div className="px-6 pt-4 shrink-0">
          <ProcessInsightsPanel data={insightsData} onProcessClick={handleInsightsProcessClick} />
        </div>
      )}

      {/* My/All toggle — Processes tab */}
      {activeTab === "processes" && (
        <div className="px-6 pt-2 shrink-0">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
            <button
              onClick={() => setViewMode("all")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "all"
                  ? "bg-updraft-pale-purple/40 text-updraft-deep"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              All Processes
            </button>
            <button
              onClick={() => myProcessesCount > 0 && setViewMode("my")}
              disabled={myProcessesCount === 0}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "my"
                  ? "bg-updraft-pale-purple/40 text-updraft-deep"
                  : myProcessesCount === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              My Processes
              {myProcessesCount > 0 && (
                <span className="rounded-full bg-updraft-bright-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-updraft-bright-purple">
                  {myProcessesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main content — Processes tab */}
      {activeTab === "processes" && <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Table */}
        <div className={`flex-1 overflow-y-auto p-6 transition-all ${selectedProcess ? "hidden lg:block lg:pr-4" : ""}`}>
          {displayProcesses.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-8 w-8" />}
              heading="No processes yet"
              description="Start building your Process Library by adding your first process."
            />
          ) : (
            <ProcessListTable
              processes={displayProcesses}
              onProcessClick={handleProcessClick}
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedProcess && (
          <div className="w-full lg:w-[520px] shrink-0 border-l border-gray-200 overflow-y-auto bg-white">
            <ProcessDetailPanel
              process={selectedProcess}
              onUpdate={handleProcessUpdate}
              onClose={() => setSelectedProcess(null)}
            />
          </div>
        )}
      </div>} {/* end activeTab === "processes" */}

      {/* Create dialog */}
      <ProcessFormDialog
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSave={handleProcessCreate}
      />

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Import Processes (CSV)</h2>
              <button onClick={() => setShowImport(false)} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Upload a CSV file matching the export format. Rows with a matching Reference will be updated; new References will be created.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportFileChange}
                className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-updraft-pale-purple/30 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-updraft-deep hover:file:bg-updraft-pale-purple/50 file:cursor-pointer"
              />
              {importRows.length > 0 && !importResult && (
                <p className="text-xs text-gray-500">
                  {importRows.length} row{importRows.length !== 1 ? "s" : ""} parsed from <span className="font-medium">{importFileName}</span>
                </p>
              )}
              {importResult && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1 text-xs">
                  <p className="font-medium text-gray-800">{importResult.created} created, {importResult.updated} updated</p>
                  {importResult.errors.length > 0 && (
                    <ul className="text-risk-red space-y-0.5 max-h-32 overflow-y-auto">
                      {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
              {!importResult && (
                <button
                  onClick={handleImportSubmit}
                  disabled={importRows.length === 0 || importLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-deep text-white px-4 py-2 text-sm font-medium hover:bg-updraft-bar disabled:opacity-50 transition-colors"
                >
                  {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {importLoading ? "Importing…" : "Import"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
