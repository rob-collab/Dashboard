"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Search, Filter, ClipboardEdit, Plus, Upload, Pencil, Trash2, Shield } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import OutcomeCard from "@/components/consumer-duty/OutcomeCard";
import MeasurePanel from "@/components/consumer-duty/MeasurePanel";
import MIModal from "@/components/consumer-duty/MIModal";
import OutcomeFormDialog from "@/components/consumer-duty/OutcomeFormDialog";
import MeasureFormDialog from "@/components/consumer-duty/MeasureFormDialog";
import CSVUploadDialog from "@/components/consumer-duty/CSVUploadDialog";
import MIImportDialog from "@/components/consumer-duty/MIImportDialog";
import AdminRAGPanel from "@/components/consumer-duty/AdminRAGPanel";
import { cn, ragBgColor, ragLabelShort } from "@/lib/utils";
import type { ConsumerDutyMeasure, ConsumerDutyOutcome, ConsumerDutyMI, RAGStatus } from "@/lib/types";

type RagFilterValue = RAGStatus | "ALL" | "ATTENTION";

const RAG_FILTERS: { value: RAGStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "GOOD", label: "Green" },
  { value: "WARNING", label: "Amber" },
  { value: "HARM", label: "Red" },
];

function ConsumerDutyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const outcomes = useAppStore((s) => s.outcomes);
  const currentUser = useAppStore((s) => s.currentUser);
  const updateMeasureMetrics = useAppStore((s) => s.updateMeasureMetrics);
  const addOutcome = useAppStore((s) => s.addOutcome);
  const updateOutcome = useAppStore((s) => s.updateOutcome);
  const deleteOutcome = useAppStore((s) => s.deleteOutcome);
  const addMeasure = useAppStore((s) => s.addMeasure);
  const updateMeasure = useAppStore((s) => s.updateMeasure);
  const deleteMeasure = useAppStore((s) => s.deleteMeasure);
  const bulkAddMeasures = useAppStore((s) => s.bulkAddMeasures);

  const isMetricOwner = currentUser?.role === "METRIC_OWNER";
  const isCCROTeam = currentUser?.role === "CCRO_TEAM";
  const canEdit = isMetricOwner || isCCROTeam;

  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<ConsumerDutyMeasure | null>(null);
  const [ragFilter, setRagFilter] = useState<RagFilterValue>(() => {
    const param = searchParams.get("rag");
    if (param === "GOOD" || param === "WARNING" || param === "HARM" || param === "ATTENTION") return param;
    return "ALL";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "my" | "admin">("all");

  // Management dialog state
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState<ConsumerDutyOutcome | undefined>(undefined);
  const [measureDialogOpen, setMeasureDialogOpen] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<ConsumerDutyMeasure | undefined>(undefined);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [miImportDialogOpen, setMiImportDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const selectedOutcome = outcomes.find((o) => o.id === selectedOutcomeId);

  // URL-synced RAG filter (for filter bar)
  const handleRagFilter = useCallback((value: RagFilterValue) => {
    setRagFilter(value);
    router.replace(value === "ALL" ? "/consumer-duty" : `/consumer-duty?rag=${value}`, { scroll: false });
  }, [router]);

  // Stat card click — toggle (click active card resets to ALL)
  const handleStatRagClick = useCallback((value: RAGStatus | "ALL") => {
    handleRagFilter(ragFilter === value ? "ALL" : value);
  }, [ragFilter, handleRagFilter]);

  // Measures assigned to the current user
  const myMeasures = useMemo(() => {
    if (!currentUser) return [];
    const assigned = currentUser.assignedMeasures;
    return outcomes.flatMap((o) =>
      (o.measures ?? []).filter((m) => assigned.includes(m.measureId))
    );
  }, [outcomes, currentUser]);

  const filteredOutcomes = useMemo(() => {
    let filtered = outcomes;
    if (ragFilter === "ATTENTION") {
      filtered = filtered.filter((o) => o.ragStatus === "WARNING" || o.ragStatus === "HARM");
    } else if (ragFilter !== "ALL") {
      filtered = filtered.filter((o) => o.ragStatus === ragFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.shortDesc.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [outcomes, ragFilter, searchQuery]);

  // Summary stats
  const goodCount = outcomes.filter((o) => o.ragStatus === "GOOD").length;
  const warningCount = outcomes.filter((o) => o.ragStatus === "WARNING").length;
  const harmCount = outcomes.filter((o) => o.ragStatus === "HARM").length;
  const totalMeasures = outcomes.reduce((acc, o) => acc + (o.measures?.length ?? 0), 0);

  // Can the current user edit a particular measure?
  const canEditMeasure = (measure: ConsumerDutyMeasure): boolean => {
    if (isCCROTeam) return true;
    if (isMetricOwner && currentUser) {
      return currentUser.assignedMeasures.includes(measure.measureId);
    }
    return false;
  };

  const handleSaveMetrics = (measureId: string, metrics: ConsumerDutyMI[]) => {
    updateMeasureMetrics(measureId, metrics);
    logAuditEvent({
      action: "update_mi",
      entityType: "consumer_duty_measure",
      entityId: measureId,
      changes: { metricsUpdated: metrics.length },
    });
    setSelectedMeasure(null);
  };

  // CRUD handlers
  const handleSaveOutcome = (outcome: ConsumerDutyOutcome) => {
    if (editingOutcome) {
      updateOutcome(outcome.id, outcome);
      logAuditEvent({ action: "update_outcome", entityType: "consumer_duty_outcome", entityId: outcome.id, changes: { name: outcome.name } });
    } else {
      addOutcome(outcome);
      logAuditEvent({ action: "add_outcome", entityType: "consumer_duty_outcome", entityId: outcome.id, changes: { name: outcome.name } });
    }
    setEditingOutcome(undefined);
  };

  const handleDeleteOutcome = (id: string) => {
    if (deleteConfirmId === id) {
      deleteOutcome(id);
      logAuditEvent({ action: "delete_outcome", entityType: "consumer_duty_outcome", entityId: id });
      setDeleteConfirmId(null);
      if (selectedOutcomeId === id) setSelectedOutcomeId(null);
    } else {
      setDeleteConfirmId(id);
    }
  };

  const handleSaveMeasure = (outcomeId: string, measure: ConsumerDutyMeasure) => {
    if (editingMeasure) {
      updateMeasure(measure.id, measure);
      logAuditEvent({ action: "update_measure", entityType: "consumer_duty_measure", entityId: measure.id, changes: { name: measure.name } });
    } else {
      addMeasure(outcomeId, measure);
      logAuditEvent({ action: "add_measure", entityType: "consumer_duty_measure", entityId: measure.id, changes: { name: measure.name, outcomeId } });
    }
    // Sync inline metrics if provided
    if (measure.metrics && measure.metrics.length > 0) {
      updateMeasureMetrics(measure.id, measure.metrics);
    }
    setEditingMeasure(undefined);
  };

  const handleDeleteMeasure = (measure: ConsumerDutyMeasure) => {
    if (deleteConfirmId === measure.id) {
      deleteMeasure(measure.id);
      logAuditEvent({ action: "delete_measure", entityType: "consumer_duty_measure", entityId: measure.id });
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(measure.id);
    }
  };

  const handleCSVImport = async (
    items: { outcomeId: string; measure: ConsumerDutyMeasure }[],
    mode?: "append" | "replace",
    affectedOutcomeIds?: string[]
  ) => {
    if (mode === "replace" && affectedOutcomeIds?.length) {
      // Call bulk-replace API — transactionally delete existing then insert
      try {
        await fetch("/api/consumer-duty/measures/bulk-replace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outcomeIds: affectedOutcomeIds, measures: items }),
        });
      } catch {
        // Fallback to local-only if API unreachable
      }
      // Refresh store from API
      useAppStore.getState().hydrate();
      logAuditEvent({ action: "bulk_replace_measures", entityType: "consumer_duty_measure", changes: { count: items.length, mode: "replace", outcomeIds: affectedOutcomeIds } });
    } else {
      bulkAddMeasures(items);
      logAuditEvent({ action: "bulk_add_measures", entityType: "consumer_duty_measure", changes: { count: items.length } });
    }
  };

  const handleMIImport = (updates: { measureId: string; metrics: ConsumerDutyMI[] }[]) => {
    for (const { measureId, metrics } of updates) {
      updateMeasureMetrics(measureId, metrics);
    }
    logAuditEvent({ action: "bulk_import_mi", entityType: "consumer_duty_mi", changes: { count: updates.reduce((sum, u) => sum + u.metrics.length, 0) } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-updraft-pale-purple/40 p-2.5">
              <ShieldCheck className="h-6 w-6 text-updraft-bright-purple" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Consumer Duty Dashboard</h1>
              <p className="text-sm text-fca-gray mt-0.5">FCA Consumer Duty outcomes and measures overview</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* CCRO Team management buttons */}
          {isCCROTeam && (
            <>
              <button
                onClick={() => { setEditingOutcome(undefined); setOutcomeDialogOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Plus size={14} />
                Add Outcome
              </button>
              <button
                onClick={() => { setEditingMeasure(undefined); setMeasureDialogOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Plus size={14} />
                Add Measure
              </button>
              <button
                onClick={() => setCsvDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload size={14} />
                Import Measures
              </button>
              <button
                onClick={() => setMiImportDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-3 py-2 text-xs font-medium text-white hover:bg-updraft-deep transition-colors"
              >
                <Upload size={14} />
                Import MI
              </button>
            </>
          )}
          {/* View toggle for metric owners */}
          {canEdit && (
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 ml-2">
              <button
                onClick={() => setViewMode("all")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "all"
                    ? "bg-updraft-pale-purple/40 text-updraft-deep"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                All Outcomes
              </button>
              <button
                onClick={() => setViewMode("my")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "my"
                    ? "bg-updraft-pale-purple/40 text-updraft-deep"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <ClipboardEdit size={12} />
                My Measures
                {myMeasures.length > 0 && (
                  <span className="rounded-full bg-updraft-bright-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-updraft-bright-purple">
                    {myMeasures.length}
                  </span>
                )}
              </button>
              {isCCROTeam && (
                <button
                  onClick={() => setViewMode("admin")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    viewMode === "admin"
                      ? "bg-updraft-pale-purple/40 text-updraft-deep"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <Shield size={12} />
                  RAG Admin
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary cards — clickable with active highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleStatRagClick("ALL")}
          className={cn(
            "bento-card cursor-pointer text-left",
            ragFilter === "ALL" && "ring-2 ring-updraft-bright-purple/30"
          )}
        >
          <p className="text-xs text-fca-gray">Total Outcomes</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">{outcomes.length}</p>
          <p className="text-xs text-fca-gray mt-1">{totalMeasures} measures tracked</p>
        </button>
        <button
          onClick={() => handleStatRagClick("GOOD")}
          className={cn(
            "bento-card cursor-pointer text-left",
            ragFilter === "GOOD" && "ring-2 ring-updraft-bright-purple/30"
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", ragBgColor("GOOD"))} />
            <p className="text-xs text-fca-gray">Green</p>
          </div>
          <p className="text-2xl font-bold text-risk-green mt-1">{goodCount}</p>
          <p className="text-xs text-fca-gray mt-1">good customer outcome</p>
        </button>
        <button
          onClick={() => handleStatRagClick("WARNING")}
          className={cn(
            "bento-card cursor-pointer text-left",
            (ragFilter === "WARNING" || ragFilter === "ATTENTION") && "ring-2 ring-updraft-bright-purple/30"
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", ragBgColor("WARNING"))} />
            <p className="text-xs text-fca-gray">Amber</p>
          </div>
          <p className="text-2xl font-bold text-risk-amber mt-1">{warningCount}</p>
          <p className="text-xs text-fca-gray mt-1">possible detriment</p>
        </button>
        <button
          onClick={() => handleStatRagClick("HARM")}
          className={cn(
            "bento-card cursor-pointer text-left",
            (ragFilter === "HARM" || ragFilter === "ATTENTION") && "ring-2 ring-updraft-bright-purple/30"
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", ragBgColor("HARM"))} />
            <p className="text-xs text-fca-gray">Red</p>
          </div>
          <p className="text-2xl font-bold text-risk-red mt-1">{harmCount}</p>
          <p className="text-xs text-fca-gray mt-1">harm identified</p>
        </button>
      </div>

      {/* ADMIN RAG VIEW */}
      {viewMode === "admin" && isCCROTeam ? (
        <AdminRAGPanel
          outcomes={outcomes}
          onUpdateOutcomeRAG={(id, rag) => updateOutcome(id, { ragStatus: rag })}
          onUpdateMeasureRAG={(id, rag) => updateMeasure(id, { ragStatus: rag })}
        />
      ) : /* MY MEASURES VIEW */
      viewMode === "my" && canEdit ? (
        <div className="space-y-4">
          <div className="bento-card">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardEdit size={18} className="text-updraft-bright-purple" />
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Assigned Measures</h2>
              <span className="rounded-full bg-updraft-pale-purple/40 px-2 py-0.5 text-xs font-medium text-updraft-bar">
                {myMeasures.length}
              </span>
            </div>
            {myMeasures.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardEdit size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">No measures assigned to you</p>
                <p className="text-xs text-gray-400 mt-1">Contact the CCRO team to get measures assigned</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {myMeasures.map((measure) => (
                  <button
                    key={measure.id}
                    type="button"
                    onClick={() => setSelectedMeasure(measure)}
                    className={cn(
                      "group relative flex flex-col gap-2 rounded-xl border border-white/40 bg-white/50 backdrop-blur-lg p-4 text-left",
                      "shadow-sm transition-all duration-200 ease-out",
                      "hover:-translate-y-0.5 hover:border-updraft-bright-purple/40 hover:shadow-md hover:shadow-updraft-bright-purple/5",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          ragBgColor(measure.ragStatus),
                          measure.ragStatus === "HARM" && "rag-pulse"
                        )}
                      />
                      <span className="text-xs font-medium text-updraft-bar/70 uppercase tracking-wide">
                        {measure.measureId}
                      </span>
                      <span
                        className={cn(
                          "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight",
                          measure.ragStatus === "GOOD" && "bg-risk-green/10 text-risk-green",
                          measure.ragStatus === "WARNING" && "bg-risk-amber/10 text-risk-amber",
                          measure.ragStatus === "HARM" && "bg-risk-red/10 text-risk-red"
                        )}
                      >
                        {ragLabelShort(measure.ragStatus)}
                      </span>
                    </div>
                    <h5 className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-updraft-deep transition-colors">
                      {measure.name}
                    </h5>
                    <p className="text-xs leading-relaxed text-gray-500 line-clamp-2">
                      {measure.summary}
                    </p>
                    {measure.metrics && measure.metrics.length > 0 && (
                      <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                          {measure.metrics.length} {measure.metrics.length === 1 ? "metric" : "metrics"}
                        </span>
                        <span className="text-[10px] font-medium text-updraft-bright-purple opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to edit
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-xl bg-gradient-to-r from-updraft-bright-purple to-updraft-light-purple opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ALL OUTCOMES VIEW */}
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search outcomes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
              <Filter size={14} className="ml-2 text-gray-400" />
              {RAG_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => handleRagFilter(f.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    ragFilter === f.value
                      ? "bg-updraft-pale-purple/40 text-updraft-deep"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Outcomes grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOutcomes.map((outcome) => (
              <div key={outcome.id} className="relative group/outcome">
                <OutcomeCard
                  outcome={outcome}
                  selected={outcome.id === selectedOutcomeId}
                  onClick={() =>
                    setSelectedOutcomeId(outcome.id === selectedOutcomeId ? null : outcome.id)
                  }
                />
                {isCCROTeam && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/outcome:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingOutcome(outcome); setOutcomeDialogOpen(true); }}
                      className="rounded-full bg-white/90 p-1 text-gray-400 hover:text-updraft-bright-purple shadow-sm transition-colors"
                      title="Edit outcome"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteOutcome(outcome.id); }}
                      className={cn(
                        "rounded-full p-1 shadow-sm transition-colors",
                        deleteConfirmId === outcome.id
                          ? "bg-risk-red text-white"
                          : "bg-white/90 text-gray-400 hover:text-risk-red"
                      )}
                      title={deleteConfirmId === outcome.id ? "Click again to confirm" : "Delete outcome"}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredOutcomes.length === 0 && (
            <div className="bento-card text-center py-12">
              <ShieldCheck size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No outcomes match your filters</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
            </div>
          )}

          {/* Measures panel */}
          {selectedOutcome && selectedOutcome.measures && (
            <div className="animate-slide-up">
              <MeasurePanel
                measures={selectedOutcome.measures}
                onMeasureClick={(m) => setSelectedMeasure(m)}
                onEditMeasure={isCCROTeam ? (m) => { setEditingMeasure(m); setMeasureDialogOpen(true); } : undefined}
                onDeleteMeasure={isCCROTeam ? handleDeleteMeasure : undefined}
              />
            </div>
          )}

          {/* All measures table */}
          <div className="bento-card">
            <h2 className="text-lg font-bold text-updraft-deep font-poppins mb-4">All Measures Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Outcome</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Measure</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Owner</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">RAG</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Metrics</th>
                    {isCCROTeam && (
                      <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 w-20">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {outcomes.flatMap((outcome) =>
                    (outcome.measures ?? []).map((measure) => (
                      <tr
                        key={measure.id}
                        className="hover:bg-gray-50/50 cursor-pointer group"
                        onClick={() => setSelectedMeasure(measure)}
                      >
                        <td className="border border-gray-200 px-3 py-2 text-gray-600">{outcome.name}</td>
                        <td className="border border-gray-200 px-3 py-2">
                          <span className="font-medium text-gray-800">{measure.measureId}</span>
                          <span className="text-gray-500 ml-2">{measure.name}</span>
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-gray-500">{measure.owner ?? "—"}</td>
                        <td className="border border-gray-200 px-3 py-2">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                            measure.ragStatus === "GOOD" && "bg-risk-green/10 text-risk-green",
                            measure.ragStatus === "WARNING" && "bg-risk-amber/10 text-risk-amber",
                            measure.ragStatus === "HARM" && "bg-risk-red/10 text-risk-red"
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", ragBgColor(measure.ragStatus))} />
                            {ragLabelShort(measure.ragStatus)}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-gray-500">{measure.metrics?.length ?? 0}</td>
                        {isCCROTeam && (
                          <td className="border border-gray-200 px-3 py-2">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingMeasure(measure); setMeasureDialogOpen(true); }}
                                className="rounded p-1 text-gray-400 hover:text-updraft-bright-purple hover:bg-updraft-pale-purple/20 transition-colors"
                                title="Edit measure"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteMeasure(measure); }}
                                className={cn(
                                  "rounded p-1 transition-colors",
                                  deleteConfirmId === measure.id
                                    ? "text-white bg-risk-red"
                                    : "text-gray-400 hover:text-risk-red hover:bg-red-50"
                                )}
                                title={deleteConfirmId === measure.id ? "Click again to confirm" : "Delete measure"}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MI Modal - editable for owned measures */}
      <MIModal
        measure={selectedMeasure}
        open={!!selectedMeasure}
        onClose={() => setSelectedMeasure(null)}
        editable={selectedMeasure ? canEditMeasure(selectedMeasure) : false}
        isCCRO={isCCROTeam}
        onSave={handleSaveMetrics}
        onSaveAppetite={(miId, appetite, appetiteOperator) => {
          if (!selectedMeasure) return;
          const updatedMetrics = (selectedMeasure.metrics ?? []).map((m) =>
            m.id === miId ? { ...m, appetite, appetiteOperator } : m
          );
          updateMeasureMetrics(selectedMeasure.id, updatedMetrics);
        }}
      />

      {/* Outcome Form Dialog */}
      <OutcomeFormDialog
        open={outcomeDialogOpen}
        onClose={() => { setOutcomeDialogOpen(false); setEditingOutcome(undefined); }}
        onSave={handleSaveOutcome}
        outcome={editingOutcome}
        nextPosition={outcomes.length}
      />

      {/* Measure Form Dialog */}
      <MeasureFormDialog
        open={measureDialogOpen}
        onClose={() => { setMeasureDialogOpen(false); setEditingMeasure(undefined); }}
        onSave={handleSaveMeasure}
        measure={editingMeasure}
        outcomes={outcomes}
        defaultOutcomeId={selectedOutcomeId ?? undefined}
      />

      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        open={csvDialogOpen}
        onClose={() => setCsvDialogOpen(false)}
        onImport={handleCSVImport}
        outcomes={outcomes}
      />

      {/* MI Import Dialog */}
      <MIImportDialog
        open={miImportDialogOpen}
        onClose={() => setMiImportDialogOpen(false)}
        onImport={handleMIImport}
        measures={outcomes.flatMap((o) => o.measures ?? [])}
      />
    </div>
  );
}

export default function ConsumerDutyPage() {
  return (
    <Suspense>
      <ConsumerDutyContent />
    </Suspense>
  );
}
