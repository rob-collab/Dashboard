"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Layers, BarChart2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { Process } from "@/lib/types";
import ProcessListTable from "@/components/processes/ProcessListTable";
import ProcessDetailPanel from "@/components/processes/ProcessDetailPanel";
import ProcessFormDialog from "@/components/processes/ProcessFormDialog";
import ProcessInsightsPanel from "@/components/processes/ProcessInsightsPanel";
import { EmptyState } from "@/components/common/EmptyState";

export default function ProcessesPage() {
  const processes = useAppStore((s) => s.processes);
  const addProcess = useAppStore((s) => s.addProcess);
  const updateProcess = useAppStore((s) => s.updateProcess);
  const currentUser = useAppStore((s) => s.currentUser);
  const isCCRO = currentUser?.role === "CCRO_TEAM";
  const searchParams = useSearchParams();

  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-updraft-pale-purple/30 p-2">
            <Layers size={18} className="text-updraft-deep" />
          </div>
          <div>
            <h1 className="font-poppins font-semibold text-gray-900 text-lg">Process Library</h1>
            <p className="text-xs text-gray-500">{processes.filter((p) => p.status !== "RETIRED").length} active processes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={showInsights ? () => setShowInsights(false) : loadInsights}
            disabled={insightsLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <BarChart2 size={12} />
            {showInsights ? "Hide Insights" : insightsLoading ? "Loading…" : "Insights"}
          </button>
          {isCCRO && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-deep text-white px-3 py-1.5 text-xs font-medium hover:bg-updraft-bar transition-colors"
            >
              + New Process
            </button>
          )}
        </div>
      </div>

      {/* Insights panel */}
      {showInsights && insightsData && (
        <div className="px-6 pt-4 shrink-0">
          <ProcessInsightsPanel data={insightsData} onProcessClick={handleInsightsProcessClick} />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Table */}
        <div className={`flex-1 overflow-y-auto p-6 transition-all ${selectedProcess ? "hidden lg:block lg:pr-4" : ""}`}>
          {processes.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-8 w-8" />}
              heading="No processes yet"
              description="Start building your Process Library by adding your first process."
            />
          ) : (
            <ProcessListTable
              processes={processes}
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
      </div>

      {/* Create dialog */}
      <ProcessFormDialog
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSave={handleProcessCreate}
      />
    </div>
  );
}
