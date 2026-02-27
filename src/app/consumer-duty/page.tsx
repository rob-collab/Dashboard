"use client";

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Search, Filter, ClipboardEdit, Plus, Upload, Pencil, Trash2, Shield, ChevronDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import OutcomeCard from "@/components/consumer-duty/OutcomeCard";
import MeasurePanel from "@/components/consumer-duty/MeasurePanel";
import MIModal from "@/components/consumer-duty/MIModal";
import OutcomeFormDialog from "@/components/consumer-duty/OutcomeFormDialog";
import MeasureFormDialog from "@/components/consumer-duty/MeasureFormDialog";
import CSVUploadDialog from "@/components/consumer-duty/CSVUploadDialog";
import MIImportDialog from "@/components/consumer-duty/MIImportDialog";
import RiskDetailModal from "@/components/consumer-duty/RiskDetailModal";
import MetricDrillDown from "@/components/consumer-duty/MetricDrillDown";
import { cn, ragBgColor, ragLabelShort, naturalCompare } from "@/lib/utils";
import type { ConsumerDutyMeasure, ConsumerDutyOutcome, ConsumerDutyMI, RAGStatus } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";
import GlossaryTooltip from "@/components/common/GlossaryTooltip";
import HistoryTab from "@/components/common/HistoryTab";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";

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

  const users = useAppStore((s) => s.users);
  const isOwner = currentUser?.role === "OWNER";
  const isCCROTeam = currentUser?.role === "CCRO_TEAM";
  const canEdit = isOwner || isCCROTeam;

  // Page-level tab: dashboard, manage (CCRO only), or history
  const [activeTab, setActiveTab] = useState<"dashboard" | "manage" | "history">(() => {
    const t = searchParams.get("tab");
    if (t === "history") return "history";
    if (t === "manage") return "manage";
    return "dashboard";
  });

  // Sync activeTab from URL
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "history") setActiveTab("history");
    else if (t === "manage") setActiveTab("manage");
    else setActiveTab("dashboard");
  }, [searchParams]);

  function handleTabChange(tab: "dashboard" | "manage" | "history") {
    setActiveTab(tab);
    if (tab === "history") {
      router.replace("/consumer-duty?tab=history", { scroll: false });
    } else if (tab === "manage") {
      router.replace("/consumer-duty?tab=manage", { scroll: false });
    } else {
      router.replace("/consumer-duty", { scroll: false });
    }
  }

  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<ConsumerDutyMeasure | null>(null);
  const [ragFilter, setRagFilter] = useState<RagFilterValue>(() => {
    const param = searchParams.get("rag");
    if (param === "GOOD" || param === "WARNING" || param === "HARM" || param === "ATTENTION") return param;
    return "ALL";
  });
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [viewMode, setViewMode] = useState<"all" | "my">("all");
  const [measureRagFilter, setMeasureRagFilter] = useState<RAGStatus | "ALL">("ALL");
  const [metricsRagFilter, setMetricsRagFilter] = useState<RAGStatus | "ALL">("ALL");
  const [selectedMetric, setSelectedMetric] = useState<ConsumerDutyMI | null>(null);

  // Management dialog state
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState<ConsumerDutyOutcome | undefined>(undefined);
  const [measureDialogOpen, setMeasureDialogOpen] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<ConsumerDutyMeasure | undefined>(undefined);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [miImportDialogOpen, setMiImportDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [riskDetailOutcome, setRiskDetailOutcome] = useState<ConsumerDutyOutcome | null>(null);

  // CD1: Collapsible section state — persisted to localStorage per user
  const collapsedKey = `cd-sections-${currentUser?.id ?? "anon"}`;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = { measures: true, metrics: true };
    try {
      const stored = JSON.parse(localStorage.getItem(collapsedKey) ?? "{}");
      return { ...defaults, ...stored };
    }
    catch { return defaults; }
  });
  function toggleSection(key: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(collapsedKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const selectedOutcome = outcomes.find((o) => o.id === selectedOutcomeId);

  // Deep-link: ?measure=xxx opens MI modal for that measure on first load
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  useEffect(() => {
    if (deepLinkHandled || outcomes.length === 0) return;
    const measureParam = searchParams.get("measure");
    if (measureParam) {
      for (const o of outcomes) {
        const found = (o.measures ?? []).find((m) => m.id === measureParam);
        if (found) {
          setSelectedMeasure(found);
          setSelectedOutcomeId(o.id);
          break;
        }
      }
      setDeepLinkHandled(true);
    }
  }, [outcomes, searchParams, deepLinkHandled]);

  // Debounced URL sync for ragFilter + searchQuery
  const cdSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (activeTab === "history" || activeTab === "manage") return; // don't overwrite tab params
    if (cdSyncTimerRef.current) clearTimeout(cdSyncTimerRef.current);
    cdSyncTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (ragFilter !== "ALL") params.set("rag", ragFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const qs = params.toString();
      router.replace(qs ? `/consumer-duty?${qs}` : "/consumer-duty", { scroll: false });
    }, 150);
    return () => { if (cdSyncTimerRef.current) clearTimeout(cdSyncTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ragFilter, searchQuery, activeTab]);

  // RAG filter handler (just set state — URL synced by effect above)
  const handleRagFilter = useCallback((value: RagFilterValue) => {
    setRagFilter(value);
  }, []);

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
    ).sort((a, b) => naturalCompare(a.measureId, b.measureId));
  }, [outcomes, currentUser]);

  const filteredOutcomes = useMemo(() => {
    let filtered = outcomes;
    // Outcome-level RAG filter
    if (ragFilter === "ATTENTION") {
      filtered = filtered.filter((o) => o.ragStatus === "WARNING" || o.ragStatus === "HARM");
    } else if (ragFilter !== "ALL") {
      filtered = filtered.filter((o) => o.ragStatus === ragFilter);
    }
    // Search across outcomes, measures, and metrics
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.shortDesc.toLowerCase().includes(q) ||
          o.outcomeId.toLowerCase().includes(q) ||
          (o.measures ?? []).some(
            (m) =>
              m.name.toLowerCase().includes(q) ||
              m.measureId.toLowerCase().includes(q) ||
              (m.owner && users.find((u) => u.id === m.owner)?.name.toLowerCase().includes(q)) ||
              (m.metrics ?? []).some((mi) => mi.metric.toLowerCase().includes(q))
          )
      );
    }
    return filtered;
  }, [outcomes, ragFilter, searchQuery, users]);

  // All measures flattened — sorted by measureId using natural sort (1.1 < 1.2 < 1.10 < 2.1)
  const allMeasures = useMemo(() => {
    const flat = outcomes.flatMap((o) => (o.measures ?? []).map((m) => ({ ...m, outcomeName: o.name })));
    return flat.sort((a, b) => naturalCompare(a.measureId, b.measureId));
  }, [outcomes]);
  const totalMeasures = allMeasures.length;

  // Filtered measures (for measure-level RAG filter)
  const filteredMeasures = useMemo(() => {
    if (measureRagFilter === "ALL") return allMeasures;
    return allMeasures.filter((m) => m.ragStatus === measureRagFilter);
  }, [allMeasures, measureRagFilter]);

  // Measure-level RAG stats
  const measureGoodCount = allMeasures.filter((m) => m.ragStatus === "GOOD").length;
  const measureWarningCount = allMeasures.filter((m) => m.ragStatus === "WARNING").length;
  const measureHarmCount = allMeasures.filter((m) => m.ragStatus === "HARM").length;

  // Outcome-level stats (still used for outcome grid filtering)
  const goodCount = outcomes.filter((o) => o.ragStatus === "GOOD").length;
  const warningCount = outcomes.filter((o) => o.ragStatus === "WARNING").length;
  const harmCount = outcomes.filter((o) => o.ragStatus === "HARM").length;

  // All metrics flattened from outcomes → measures → metrics, with measure context
  const allMetrics = useMemo(() => {
    return outcomes.flatMap((o) =>
      (o.measures ?? []).flatMap((m) =>
        (m.metrics ?? []).map((mi) => ({
          ...mi,
          measureId: m.measureId,
          measureName: m.name,
        }))
      )
    );
  }, [outcomes]);

  const filteredMetrics = useMemo(() => {
    if (metricsRagFilter === "ALL") return allMetrics;
    return allMetrics.filter((mi) => mi.ragStatus === metricsRagFilter);
  }, [allMetrics, metricsRagFilter]);

  const metricsGoodCount = allMetrics.filter((mi) => mi.ragStatus === "GOOD").length;
  const metricsWarningCount = allMetrics.filter((mi) => mi.ragStatus === "WARNING").length;
  const metricsHarmCount = allMetrics.filter((mi) => mi.ragStatus === "HARM").length;

  // Can the current user edit a particular measure?
  const canEditMeasure = (measure: ConsumerDutyMeasure): boolean => {
    if (isCCROTeam) return true;
    if (isOwner && currentUser) {
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
      const measures = items.map((item) => ({ ...item.measure, outcomeId: item.outcomeId }));
      try {
        await fetch("/api/consumer-duty/measures/bulk-replace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outcomeIds: affectedOutcomeIds, measures }),
        });
        // Refresh store from API
        await useAppStore.getState().hydrate();
      } catch (error) {
        console.error("Bulk replace failed:", error);
        // Fallback to local-only if API unreachable
        bulkAddMeasures(items);
      }
      logAuditEvent({ action: "bulk_replace_measures", entityType: "consumer_duty_measure", changes: { count: items.length, mode: "replace", outcomeIds: affectedOutcomeIds } });
    } else {
      bulkAddMeasures(items);
      logAuditEvent({ action: "bulk_add_measures", entityType: "consumer_duty_measure", changes: { count: items.length } });
    }
  };

  const handleMIImport = async (updates: { measureId: string; metrics: ConsumerDutyMI[] }[], month?: string) => {
    if (month) {
      // Historical import — call API directly with month param
      for (const { measureId, metrics } of updates) {
        try {
          await fetch("/api/consumer-duty/mi", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ measureId, metrics, month }),
          });
        } catch (err) {
          console.error("Historical MI import failed:", err);
        }
      }
      // Refresh store from API
      await useAppStore.getState().hydrate();
    } else {
      // Current month — use normal store sync
      for (const { measureId, metrics } of updates) {
        updateMeasureMetrics(measureId, metrics);
      }
    }
    logAuditEvent({ action: "bulk_import_mi", entityType: "consumer_duty_mi", changes: { count: updates.reduce((sum, u) => sum + u.metrics.length, 0), month: month ?? "current" } });
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
              <h1 className="text-2xl font-bold text-updraft-deep font-poppins">
                Consumer Duty Dashboard
              </h1>
              <p className="text-sm text-fca-gray mt-0.5">FCA Consumer Duty outcomes and measures overview</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                <Link
                  href="/settings?tab=consumer-duty"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors text-gray-500 hover:text-updraft-deep hover:bg-updraft-pale-purple/20"
                  title="Override RAG statuses — available in Settings"
                >
                  <Shield size={12} />
                  RAG Override →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Page tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["dashboard", ...(isCCROTeam ? ["manage"] : []), "history"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab as "dashboard" | "manage" | "history")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab
                ? "border-updraft-bright-purple text-updraft-deep"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {tab === "dashboard" ? "Dashboard" : tab === "manage" ? "Manage" : "History"}
          </button>
        ))}
      </div>

      {activeTab === "history" && (
        <HistoryTab
          entityTypes={["consumer_duty_outcome", "consumer_duty_measure", "consumer_duty_mi"]}
          title="Consumer Duty History"
          description="Audit trail of outcome, measure and MI changes."
        />
      )}

      {/* MANAGE TAB — CCRO Team only */}
      {activeTab === "manage" && isCCROTeam && (
        <div className="space-y-6">
          <div className="bento-card p-6">
            <h2 className="text-lg font-semibold text-updraft-deep font-poppins mb-4">Manage Consumer Duty</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Add Outcome */}
              <button
                onClick={() => { setEditingOutcome(undefined); setOutcomeDialogOpen(true); }}
                className="flex flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-updraft-light-purple hover:shadow-sm transition-all group"
              >
                <div className="rounded-lg bg-updraft-pale-purple/40 p-2.5 group-hover:bg-updraft-pale-purple/60 transition-colors">
                  <Plus size={18} className="text-updraft-bright-purple" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-updraft-deep">Add Outcome</p>
                  <p className="text-xs text-gray-500 mt-0.5">Create a new Consumer Duty outcome</p>
                </div>
              </button>

              {/* Add Measure */}
              <button
                onClick={() => { setEditingMeasure(undefined); setMeasureDialogOpen(true); }}
                className="flex flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-updraft-light-purple hover:shadow-sm transition-all group"
              >
                <div className="rounded-lg bg-updraft-pale-purple/40 p-2.5 group-hover:bg-updraft-pale-purple/60 transition-colors">
                  <Plus size={18} className="text-updraft-bright-purple" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-updraft-deep">Add Measure</p>
                  <p className="text-xs text-gray-500 mt-0.5">Add a measure to an existing outcome</p>
                </div>
              </button>

              {/* Import Measures CSV */}
              <button
                onClick={() => setCsvDialogOpen(true)}
                className="flex flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-updraft-light-purple hover:shadow-sm transition-all group"
              >
                <div className="rounded-lg bg-updraft-pale-purple/40 p-2.5 group-hover:bg-updraft-pale-purple/60 transition-colors">
                  <Upload size={18} className="text-updraft-bright-purple" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-updraft-deep">Import Measures CSV</p>
                  <p className="text-xs text-gray-500 mt-0.5">Bulk-import or replace measures from CSV</p>
                </div>
              </button>

              {/* Import MI */}
              <button
                onClick={() => setMiImportDialogOpen(true)}
                className="flex flex-col items-start gap-2 rounded-xl border border-updraft-bright-purple/30 bg-updraft-pale-purple/10 p-5 text-left hover:border-updraft-bright-purple hover:shadow-sm transition-all group"
              >
                <div className="rounded-lg bg-updraft-bright-purple/10 p-2.5 group-hover:bg-updraft-bright-purple/20 transition-colors">
                  <Upload size={18} className="text-updraft-bright-purple" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-updraft-deep">Import MI Data</p>
                  <p className="text-xs text-gray-500 mt-0.5">Upload management information metrics</p>
                </div>
              </button>

              {/* RAG Override */}
              <Link
                href="/settings?tab=consumer-duty"
                className="flex flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-updraft-light-purple hover:shadow-sm transition-all group"
              >
                <div className="rounded-lg bg-updraft-pale-purple/40 p-2.5 group-hover:bg-updraft-pale-purple/60 transition-colors">
                  <Shield size={18} className="text-updraft-bright-purple" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-updraft-deep">RAG Override</p>
                  <p className="text-xs text-gray-500 mt-0.5">Manually override RAG statuses in Settings</p>
                </div>
              </Link>

              {/* Audit Trail */}
              <Link
                href="/audit?q=consumer_duty"
                className="flex flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-updraft-light-purple hover:shadow-sm transition-all group"
              >
                <div className="rounded-lg bg-gray-100 p-2.5 group-hover:bg-gray-200 transition-colors">
                  <Filter size={18} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-updraft-deep">Audit Trail</p>
                  <p className="text-xs text-gray-500 mt-0.5">View all Consumer Duty change history</p>
                </div>
              </Link>
            </div>
          </div>

          {/* RAG Override note */}
          <div className="rounded-lg bg-updraft-pale-purple/20 border border-updraft-light-purple/30 p-4 text-xs text-updraft-bar">
            <p className="font-semibold mb-1">About RAG Override</p>
            <p>When the CCRO team sets a RAG status manually (overriding the worst-of-measures calculation), an &ldquo;Override&rdquo; badge appears on the outcome card. The tooltip shows the computed vs manually-set status. Override settings are managed in Settings → Consumer Duty.</p>
          </div>
        </div>
      )}

      {activeTab === "dashboard" && <>

      {/* Summary cards — measure-level RAG counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => { setMeasureRagFilter("ALL"); handleStatRagClick("ALL"); }}
          className={cn(
            "bento-card cursor-pointer text-left",
            measureRagFilter === "ALL" && ragFilter === "ALL" && "ring-2 ring-updraft-bright-purple/30"
          )}
        >
          <p className="text-xs text-fca-gray">Total Measures</p>
          <AnimatedNumber value={totalMeasures} className="text-2xl font-bold text-updraft-deep mt-1" />
          <p className="text-xs text-fca-gray mt-1">{outcomes.length} outcomes tracked</p>
        </button>
        <button
          onClick={() => { setMeasureRagFilter("GOOD"); handleStatRagClick("ALL"); }}
          className={cn(
            "bento-card cursor-pointer text-left border-l-[3px] border-l-risk-green",
            measureRagFilter === "GOOD" && "ring-2 ring-risk-green/40 bg-risk-green/5"
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn("h-3 w-3 rounded-full rag-glow", ragBgColor("GOOD"))} />
            <p className="text-xs text-fca-gray">Green Measures</p>
          </div>
          <AnimatedNumber value={measureGoodCount} className="text-2xl font-bold text-risk-green mt-1" />
          <p className="text-xs text-fca-gray mt-1">{goodCount} green outcome{goodCount !== 1 ? "s" : ""}</p>
        </button>
        <button
          onClick={() => { setMeasureRagFilter("WARNING"); handleStatRagClick("ALL"); }}
          className={cn(
            "bento-card cursor-pointer text-left border-l-[3px] border-l-risk-amber",
            measureRagFilter === "WARNING" && "ring-2 ring-risk-amber/40 bg-risk-amber/5"
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn("h-3 w-3 rounded-full", ragBgColor("WARNING"))} />
            <p className="text-xs text-fca-gray">Amber Measures</p>
          </div>
          <AnimatedNumber value={measureWarningCount} className="text-2xl font-bold text-risk-amber mt-1" />
          <p className="text-xs text-fca-gray mt-1">{warningCount} amber outcome{warningCount !== 1 ? "s" : ""}</p>
        </button>
        <button
          onClick={() => { setMeasureRagFilter("HARM"); handleStatRagClick("ALL"); }}
          className={cn(
            "bento-card cursor-pointer text-left border-l-[3px] border-l-risk-red",
            measureRagFilter === "HARM" && "ring-2 ring-risk-red/40 bg-risk-red/5"
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn("h-3 w-3 rounded-full rag-pulse", ragBgColor("HARM"))} />
            <p className="text-xs text-fca-gray">Red Measures</p>
          </div>
          <AnimatedNumber value={measureHarmCount} className="text-2xl font-bold text-risk-red mt-1" />
          <p className="text-xs text-fca-gray mt-1">{harmCount} red outcome{harmCount !== 1 ? "s" : ""}</p>
        </button>
      </div>

      {/* RAG status legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-risk-green shrink-0" />
          <span><span className="font-medium text-risk-green">Green</span> — Good customer outcome</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-risk-amber shrink-0" />
          <span><span className="font-medium text-risk-amber">Amber</span> — Possible detriment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-risk-red shrink-0" />
          <span><span className="font-medium text-risk-red">Red</span> — Customer harm identified</span>
        </div>
      </div>

      {/* Metric stat tiles (moved above outcomes grid) */}
      {allMetrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setMetricsRagFilter("ALL")}
            className={cn(
              "bento-card cursor-pointer text-left",
              metricsRagFilter === "ALL" && "ring-2 ring-updraft-bright-purple/30"
            )}
          >
            <p className="text-xs text-fca-gray">Total Metrics</p>
            <AnimatedNumber value={allMetrics.length} className="text-2xl font-bold text-updraft-deep mt-1" />
            <p className="text-xs text-fca-gray mt-1">{allMeasures.length} measures</p>
          </button>
          <button
            onClick={() => setMetricsRagFilter(metricsRagFilter === "GOOD" ? "ALL" : "GOOD")}
            className={cn(
              "bento-card cursor-pointer text-left border-l-[3px] border-l-risk-green",
              metricsRagFilter === "GOOD" && "ring-2 ring-risk-green/40 bg-risk-green/5"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full rag-glow", ragBgColor("GOOD"))} />
              <p className="text-xs text-fca-gray">Green Metrics</p>
            </div>
            <AnimatedNumber value={metricsGoodCount} className="text-2xl font-bold text-risk-green mt-1" />
          </button>
          <button
            onClick={() => setMetricsRagFilter(metricsRagFilter === "WARNING" ? "ALL" : "WARNING")}
            className={cn(
              "bento-card cursor-pointer text-left border-l-[3px] border-l-risk-amber",
              metricsRagFilter === "WARNING" && "ring-2 ring-risk-amber/40 bg-risk-amber/5"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full", ragBgColor("WARNING"))} />
              <p className="text-xs text-fca-gray">Amber Metrics</p>
            </div>
            <AnimatedNumber value={metricsWarningCount} className="text-2xl font-bold text-risk-amber mt-1" />
          </button>
          <button
            onClick={() => setMetricsRagFilter(metricsRagFilter === "HARM" ? "ALL" : "HARM")}
            className={cn(
              "bento-card cursor-pointer text-left border-l-[3px] border-l-risk-red",
              metricsRagFilter === "HARM" && "ring-2 ring-risk-red/40 bg-risk-red/5"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full rag-pulse", ragBgColor("HARM"))} />
              <p className="text-xs text-fca-gray">Red Metrics</p>
            </div>
            <AnimatedNumber value={metricsHarmCount} className="text-2xl font-bold text-risk-red mt-1" />
          </button>
        </div>
      )}

      {/* Measure-level RAG quick view */}
      {measureRagFilter !== "ALL" && (
        <div className="bento-card animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-updraft-deep font-poppins">
              {measureRagFilter === "GOOD" ? "Green" : measureRagFilter === "WARNING" ? "Amber" : "Red"} Measures
              <span className="ml-2 text-xs font-normal text-gray-400">({filteredMeasures.length})</span>
            </h2>
            <button
              onClick={() => setMeasureRagFilter("ALL")}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear filter
            </button>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {filteredMeasures.map((m) => {
              const ownerName = m.owner ? users.find((u) => u.id === m.owner)?.name : null;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    const parentOutcome = outcomes.find((o) => (o.measures ?? []).some((om) => om.id === m.id));
                    const originalMeasure = parentOutcome?.measures?.find((om) => om.id === m.id);
                    if (originalMeasure) setSelectedMeasure(originalMeasure);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg bg-gray-50 p-2.5 text-left hover:bg-gray-100 transition-colors"
                >
                  <span className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    ragBgColor(m.ragStatus),
                    m.ragStatus === "GOOD" && "rag-glow",
                    m.ragStatus === "HARM" && "rag-pulse"
                  )} />
                  <span className="text-xs font-mono font-semibold text-updraft-deep shrink-0">{m.measureId}</span>
                  <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{m.name}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{m.outcomeName}</span>
                  {ownerName && <span className="text-[10px] text-gray-400 shrink-0">{ownerName}</span>}
                  <span className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                    m.ragStatus === "GOOD" && "bg-risk-green/15 text-risk-green",
                    m.ragStatus === "WARNING" && "bg-risk-amber/10 text-risk-amber",
                    m.ragStatus === "HARM" && "bg-risk-red/10 text-risk-red"
                  )}>
                    {ragLabelShort(m.ragStatus)}
                  </span>
                </button>
              );
            })}
            {filteredMeasures.length === 0 && (
              <p className="text-xs text-gray-400 py-4 text-center">No measures with this status</p>
            )}
          </div>
        </div>
      )}

      {/* ADMIN RAG VIEW */}
      {/* MY MEASURES VIEW */}
      {viewMode === "my" && canEdit ? (
        <div className="space-y-4">
          <div className="bento-card">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardEdit size={18} className="text-updraft-bright-purple" />
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Assigned Measures</h2>
              <span className="rounded-full bg-updraft-pale-purple/40 px-2 py-0.5 text-xs font-medium text-updraft-bar">
                {myMeasures.length}
              </span>
              <button
                onClick={() => toggleSection("myMeasures")}
                className="ml-auto p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label={collapsed.myMeasures ? "Expand" : "Collapse"}
              >
                <ChevronDown size={14} className={cn("transition-transform duration-200", collapsed.myMeasures && "-rotate-180")} />
              </button>
            </div>
            {!collapsed.myMeasures && (myMeasures.length === 0 ? (() => {
              const ccroTeam = users.filter((u) => u.role === "CCRO_TEAM" && u.isActive !== false);
              return (
                <div className="text-center py-12">
                  <ClipboardEdit size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No measures assigned to you</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Measures are assigned by your CCRO team. Ask them to assign you as the owner of specific measures.
                  </p>
                  {ccroTeam.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      {ccroTeam.map((u) => (
                        <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full bg-updraft-pale-purple/30 px-3 py-1 text-xs font-medium text-updraft-deep">
                          <span className="w-5 h-5 rounded-full bg-updraft-bright-purple/20 text-updraft-bright-purple text-[10px] font-bold flex items-center justify-center shrink-0">
                            {u.name.charAt(0)}
                          </span>
                          {u.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })() : (
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
                      measure.ragStatus === "GOOD" && "border-l-[3px] border-l-risk-green",
                      measure.ragStatus === "WARNING" && "border-l-[3px] border-l-risk-amber",
                      measure.ragStatus === "HARM" && "border-l-[3px] border-l-risk-red",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-3 w-3 shrink-0 rounded-full",
                          ragBgColor(measure.ragStatus),
                          measure.ragStatus === "HARM" && "rag-pulse",
                          measure.ragStatus === "GOOD" && "rag-glow"
                        )}
                      />
                      <span className="text-xs font-medium text-updraft-bar/70 uppercase tracking-wide">
                        {measure.measureId}
                      </span>
                      <span
                        className={cn(
                          "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight",
                          measure.ragStatus === "GOOD" && "bg-risk-green/15 text-risk-green",
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
            ))}
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
                placeholder="Search outcomes, measures, metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
              <Filter size={14} className="ml-2 text-gray-400" />
              <span className="text-[11px] text-gray-400 ml-0.5 mr-1 hidden sm:inline">
                <GlossaryTooltip term="RAG">RAG</GlossaryTooltip>:
              </span>
              {RAG_FILTERS.map((f) => {
                const isActive = ragFilter === f.value;
                const colourClasses =
                  f.value === "GOOD" ? (isActive ? "bg-risk-green/15 text-risk-green ring-1 ring-risk-green/30" : "text-risk-green hover:bg-risk-green/10") :
                  f.value === "WARNING" ? (isActive ? "bg-risk-amber/15 text-risk-amber ring-1 ring-risk-amber/30" : "text-risk-amber hover:bg-risk-amber/10") :
                  f.value === "HARM" ? (isActive ? "bg-risk-red/15 text-risk-red ring-1 ring-risk-red/30" : "text-risk-red hover:bg-risk-red/10") :
                  (isActive ? "bg-updraft-pale-purple/40 text-updraft-deep" : "text-gray-500 hover:text-gray-700");
                return (
                  <button
                    key={f.value}
                    onClick={() => handleRagFilter(f.value)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      colourClasses
                    )}
                  >
                    {f.value !== "ALL" && <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1.5", ragBgColor(f.value as RAGStatus))} />}
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outcomes grid */}
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outcomes</h3>
            <button
              onClick={() => toggleSection("outcomes")}
              className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label={collapsed.outcomes ? "Expand" : "Collapse"}
            >
              <ChevronDown size={14} className={cn("transition-transform duration-200", collapsed.outcomes && "-rotate-180")} />
            </button>
          </div>
          {!collapsed.outcomes && (<><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOutcomes.map((outcome) => (
              <div key={outcome.id} className="relative group/outcome">
                <OutcomeCard
                  outcome={outcome}
                  selected={outcome.id === selectedOutcomeId}
                  onClick={() =>
                    setSelectedOutcomeId(outcome.id === selectedOutcomeId ? null : outcome.id)
                  }
                  onViewDetails={setRiskDetailOutcome}
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
          )}</>)}

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">
                All Measures Summary
                <span className="ml-2 text-sm font-normal text-gray-400">({totalMeasures})</span>
              </h2>
              <button
                onClick={() => toggleSection("measures")}
                className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label={collapsed.measures ? "Expand" : "Collapse"}
              >
                <ChevronDown size={14} className={cn("transition-transform duration-200", collapsed.measures && "-rotate-180")} />
              </button>
            </div>
            {!collapsed.measures && <div className="overflow-x-auto">
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
                    (outcome.measures ?? []).map((measure) => ({ measure, outcome }))
                  ).sort((a, b) => naturalCompare(a.measure.measureId, b.measure.measureId))
                  .map(({ measure, outcome }) => (
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
                        <td className="border border-gray-200 px-3 py-2 text-gray-500">{(measure.owner && users.find((u) => u.id === measure.owner)?.name) || measure.owner || "—"}</td>
                        <td className="border border-gray-200 px-3 py-2">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                            measure.ragStatus === "GOOD" && "bg-risk-green/15 text-risk-green",
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
                    ))}
                </tbody>
              </table>
            </div>}
          </div>

          {/* All Metrics — collapsible table */}
          {allMetrics.length > 0 && (
            <div className="bento-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-updraft-deep font-poppins">
                  All Metrics
                  <span className="ml-2 text-sm font-normal text-gray-400">({filteredMetrics.length}{metricsRagFilter !== "ALL" ? ` of ${allMetrics.length}` : ""})</span>
                </h2>
                <button
                  onClick={() => toggleSection("metrics")}
                  className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label={collapsed.metrics ? "Expand" : "Collapse"}
                >
                  <ChevronDown size={14} className={cn("transition-transform duration-200", collapsed.metrics && "-rotate-180")} />
                </button>
              </div>
              {!collapsed.metrics && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Measure</th>
                        <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Metric</th>
                        <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Current Value</th>
                        <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Period</th>
                        <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">RAG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMetrics.length === 0 && (
                        <tr>
                          <td colSpan={5} className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-400">
                            No metrics with this status
                          </td>
                        </tr>
                      )}
                      {filteredMetrics.map((mi) => {
                        const latestSnapshot = (mi.snapshots ?? [])
                          .slice()
                          .sort((a, b) => b.month.localeCompare(a.month))[0];
                        const period = latestSnapshot?.month ?? "—";
                        return (
                          <tr
                            key={mi.id}
                            className="hover:bg-gray-50/50 cursor-pointer"
                            onClick={() => setSelectedMetric(mi)}
                          >
                            <td className="border border-gray-200 px-3 py-2">
                              <span className="font-mono text-xs font-semibold text-updraft-deep">{mi.measureId}</span>
                              <span className="text-xs text-gray-500 ml-1.5">{mi.measureName}</span>
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-800">{mi.metric}</td>
                            <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800">{mi.current}</td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-500 text-xs">{period}</td>
                            <td className="border border-gray-200 px-3 py-2">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                                mi.ragStatus === "GOOD" && "bg-risk-green/15 text-risk-green",
                                mi.ragStatus === "WARNING" && "bg-risk-amber/10 text-risk-amber",
                                mi.ragStatus === "HARM" && "bg-risk-red/10 text-risk-red"
                              )}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", ragBgColor(mi.ragStatus))} />
                                {ragLabelShort(mi.ragStatus)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
        onCreateAction={(miId, metricName) => {
          router.push(`/actions?newAction=true&consumerDutyMIId=${encodeURIComponent(miId)}&metricName=${encodeURIComponent(metricName)}&source=Consumer+Duty`);
        }}
      />

      {/* Metric Drill-Down Modal (from All Metrics table row click) */}
      <MetricDrillDown
        metric={selectedMetric}
        open={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        isCCRO={isCCROTeam}
        onSaveAppetite={(miId, appetite, appetiteOperator) => {
          const parentMeasure = allMeasures.find((m) => (m.metrics ?? []).some((mi) => mi.id === miId));
          if (!parentMeasure) return;
          const updatedMetrics = (parentMeasure.metrics ?? []).map((mi) =>
            mi.id === miId ? { ...mi, appetite, appetiteOperator } : mi
          );
          updateMeasureMetrics(parentMeasure.id, updatedMetrics);
          setSelectedMetric((prev) => prev?.id === miId ? { ...prev, appetite, appetiteOperator } : prev);
        }}
        onCreateAction={(miId, metricName) => {
          router.push(`/actions?newAction=true&consumerDutyMIId=${encodeURIComponent(miId)}&metricName=${encodeURIComponent(metricName)}&source=Consumer+Duty`);
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

      {/* Risk Detail Modal */}
      <RiskDetailModal
        outcome={riskDetailOutcome}
        open={!!riskDetailOutcome}
        onClose={() => setRiskDetailOutcome(null)}
      />

      </> /* end activeTab === "dashboard" */ }
    </div>
  );
}

export default function ConsumerDutyPage() {
  usePageTitle("Consumer Duty");
  return (
    <Suspense>
      <ConsumerDutyContent />
    </Suspense>
  );
}
