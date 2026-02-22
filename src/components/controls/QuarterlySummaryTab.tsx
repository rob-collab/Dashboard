"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type {
  QuarterlySummaryRecord,
  TestingScheduleEntry,
  TestResultValue,
} from "@/lib/types";
import {
  TEST_RESULT_COLOURS,
  TEST_RESULT_LABELS,
} from "@/lib/types";
import { naturalCompare } from "@/lib/utils";
import GlossaryTooltip from "@/components/common/GlossaryTooltip";
import {
  Calendar,
  Save,
  Send,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Shield,
  Lock,
  FileText,
} from "lucide-react";

/* ── Quarter helpers ──────────────────────────────────────────────────────── */

function getQuarterMonths(quarter: string): { year: number; months: number[] } {
  const match = quarter.match(/Q(\d) (\d{4})/);
  if (!match) return { year: 2026, months: [1, 2, 3] };
  const q = parseInt(match[1]);
  const year = parseInt(match[2]);
  const startMonth = (q - 1) * 3 + 1;
  return { year, months: [startMonth, startMonth + 1, startMonth + 2] };
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const QUARTER_MONTH_RANGES: Record<number, string> = {
  1: "Jan\u2013Mar",
  2: "Apr\u2013Jun",
  3: "Jul\u2013Sep",
  4: "Oct\u2013Dec",
};

function buildQuarterOptions(): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQ = Math.ceil(currentMonth / 3);

  const options: string[] = [];
  let y = currentYear;
  let q = currentQ;

  /* Generate quarters backwards for ~2 years (8 quarters) */
  for (let i = 0; i < 9; i++) {
    options.push(`Q${q} ${y}`);
    q--;
    if (q === 0) {
      q = 4;
      y--;
    }
  }

  return options;
}

function formatQuarterLabel(quarter: string): string {
  const match = quarter.match(/Q(\d) (\d{4})/);
  if (!match) return quarter;
  const q = parseInt(match[1]);
  const year = match[2];
  return `${quarter} (${QUARTER_MONTH_RANGES[q] ?? ""} ${year})`;
}

/* ── Status badge colours ─────────────────────────────────────────────────── */

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  SUBMITTED: { bg: "bg-blue-100", text: "text-blue-700", label: "Submitted" },
  APPROVED: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
};

/* ── Component ────────────────────────────────────────────────────────────── */

export default function QuarterlySummaryTab() {
  const testingSchedule = useAppStore((s) => s.testingSchedule);
  const currentUser = useAppStore((s) => s.currentUser);
  const users = useAppStore((s) => s.users);

  const isCCROTeam = currentUser?.role === "CCRO_TEAM";

  /* Quarter selector */
  const quarterOptions = useMemo(() => buildQuarterOptions(), []);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(
    quarterOptions[0] ?? "Q1 2026",
  );

  /* Fetched summaries */
  const [summaries, setSummaries] = useState<QuarterlySummaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  /* Local narrative edits: Map<scheduleEntryId, narrative> */
  const [narrativeEdits, setNarrativeEdits] = useState<Map<string, string>>(new Map());

  /* Per-card saving/error state */
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [cardErrors, setCardErrors] = useState<Map<string, string>>(new Map());
  const [cardSuccess, setCardSuccess] = useState<Map<string, string>>(new Map());

  /* Bulk approve state */
  const [bulkApproving, setBulkApproving] = useState(false);

  /* Collapsed cards */
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());

  /* ── Fetch summaries when quarter changes ──────────────────────────────── */

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api<QuarterlySummaryRecord[]>(
        `/api/controls/quarterly-summaries?quarter=${encodeURIComponent(selectedQuarter)}`,
      );
      setSummaries(data);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to load quarterly summaries.",
      );
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedQuarter]);

  useEffect(() => {
    fetchSummaries();
    /* Reset local state on quarter change */
    setNarrativeEdits(new Map());
    setCardErrors(new Map());
    setCardSuccess(new Map());
  }, [fetchSummaries]);

  /* ── Derived data ──────────────────────────────────────────────────────── */

  /* Active schedule entries */
  const activeEntries = useMemo(
    () => testingSchedule.filter((e) => e.isActive),
    [testingSchedule],
  );

  /* Map scheduleEntryId -> existing summary */
  const summaryByEntry = useMemo(() => {
    const map = new Map<string, QuarterlySummaryRecord>();
    for (const s of summaries) {
      map.set(s.scheduleEntryId, s);
    }
    return map;
  }, [summaries]);

  /* Quarter months for result lookup */
  const { year: qYear, months: qMonths } = useMemo(
    () => getQuarterMonths(selectedQuarter),
    [selectedQuarter],
  );

  /* Get test results for a schedule entry for the selected quarter months */
  const getQuarterResults = useCallback(
    (entry: TestingScheduleEntry): (TestResultValue | null)[] => {
      return qMonths.map((month) => {
        const result = entry.testResults?.find(
          (r) => r.periodYear === qYear && r.periodMonth === month,
        );
        return result?.result ?? null;
      });
    },
    [qYear, qMonths],
  );

  /* Check if any month has a FAIL */
  const hasFailure = useCallback(
    (entry: TestingScheduleEntry): boolean => {
      const results = getQuarterResults(entry);
      return results.some((r) => r === "FAIL");
    },
    [getQuarterResults],
  );

  /* Approval dashboard counts */
  const { draftCount, submittedCount, approvedCount } = useMemo(() => {
    let draft = 0;
    let submitted = 0;
    let approved = 0;

    for (const entry of activeEntries) {
      const summary = summaryByEntry.get(entry.id);
      if (!summary) {
        draft++; /* No summary yet = draft state */
      } else if (summary.status === "DRAFT") {
        draft++;
      } else if (summary.status === "SUBMITTED") {
        submitted++;
      } else if (summary.status === "APPROVED") {
        approved++;
      }
    }

    return { draftCount: draft, submittedCount: submitted, approvedCount: approved };
  }, [activeEntries, summaryByEntry]);

  /* ── Narrative helpers ─────────────────────────────────────────────────── */

  function getEffectiveNarrative(scheduleEntryId: string): string {
    if (narrativeEdits.has(scheduleEntryId)) {
      return narrativeEdits.get(scheduleEntryId) ?? "";
    }
    const existing = summaryByEntry.get(scheduleEntryId);
    return existing?.narrative ?? "";
  }

  function updateNarrative(scheduleEntryId: string, value: string) {
    setNarrativeEdits((prev) => {
      const next = new Map(prev);
      next.set(scheduleEntryId, value);
      return next;
    });
    /* Clear success/error on edit */
    clearCardMessage(scheduleEntryId);
  }

  /* ── Card state helpers ─────────────────────────────────────────────────── */

  function setCardSaving(id: string, saving: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (saving) next.add(id); else next.delete(id);
      return next;
    });
  }

  function setCardError(id: string, error: string) {
    setCardErrors((prev) => {
      const next = new Map(prev);
      next.set(id, error);
      return next;
    });
    setCardSuccess((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function setCardSuccessMsg(id: string, msg: string) {
    setCardSuccess((prev) => {
      const next = new Map(prev);
      next.set(id, msg);
      return next;
    });
    setCardErrors((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function clearCardMessage(id: string) {
    setCardErrors((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setCardSuccess((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  /* ── User lookup ────────────────────────────────────────────────────────── */

  function getUserName(userId: string | null | undefined): string {
    if (!userId) return "Unknown";
    const user = users.find((u) => u.id === userId);
    return user?.name ?? "Unknown";
  }

  function getTesterName(entry: TestingScheduleEntry): string {
    if (entry.assignedTester?.name) return entry.assignedTester.name;
    return getUserName(entry.assignedTesterId);
  }

  /* ── Toggle collapse ────────────────────────────────────────────────────── */

  function toggleCard(id: string) {
    setCollapsedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  /* ── Save / Submit / Approve handlers ──────────────────────────────────── */

  async function handleSaveDraft(entry: TestingScheduleEntry) {
    const narrative = getEffectiveNarrative(entry.id);
    const existing = summaryByEntry.get(entry.id);

    setCardSaving(entry.id, true);
    clearCardMessage(entry.id);

    try {
      if (existing) {
        /* PATCH existing */
        const updated = await api<QuarterlySummaryRecord>(
          `/api/controls/quarterly-summaries/${existing.id}`,
          { method: "PATCH", body: { narrative } },
        );
        setSummaries((prev) =>
          prev.map((s) => (s.id === existing.id ? updated : s)),
        );
      } else {
        /* POST new */
        const created = await api<QuarterlySummaryRecord>(
          "/api/controls/quarterly-summaries",
          {
            method: "POST",
            body: {
              scheduleEntryId: entry.id,
              quarter: selectedQuarter,
              narrative,
            },
          },
        );
        setSummaries((prev) => [...prev, created]);
      }

      /* Clear the local edit for this entry */
      setNarrativeEdits((prev) => {
        const next = new Map(prev);
        next.delete(entry.id);
        return next;
      });
      setCardSuccessMsg(entry.id, "Draft saved successfully.");
    } catch (err) {
      setCardError(
        entry.id,
        err instanceof Error ? err.message : "Failed to save draft.",
      );
    } finally {
      setCardSaving(entry.id, false);
    }
  }

  async function handleSubmit(entry: TestingScheduleEntry) {
    const narrative = getEffectiveNarrative(entry.id);
    if (!narrative.trim()) {
      setCardError(entry.id, "Please write a narrative before submitting.");
      return;
    }

    const existing = summaryByEntry.get(entry.id);
    setCardSaving(entry.id, true);
    clearCardMessage(entry.id);

    try {
      if (existing) {
        const updated = await api<QuarterlySummaryRecord>(
          `/api/controls/quarterly-summaries/${existing.id}`,
          { method: "PATCH", body: { narrative, status: "SUBMITTED" } },
        );
        setSummaries((prev) =>
          prev.map((s) => (s.id === existing.id ? updated : s)),
        );
      } else {
        /* Create then submit in one go — POST creates as draft, then PATCH to submitted */
        const created = await api<QuarterlySummaryRecord>(
          "/api/controls/quarterly-summaries",
          {
            method: "POST",
            body: {
              scheduleEntryId: entry.id,
              quarter: selectedQuarter,
              narrative,
            },
          },
        );
        const updated = await api<QuarterlySummaryRecord>(
          `/api/controls/quarterly-summaries/${created.id}`,
          { method: "PATCH", body: { status: "SUBMITTED" } },
        );
        setSummaries((prev) => [...prev, updated]);
      }

      setNarrativeEdits((prev) => {
        const next = new Map(prev);
        next.delete(entry.id);
        return next;
      });
      setCardSuccessMsg(entry.id, "Submitted for approval.");
    } catch (err) {
      setCardError(
        entry.id,
        err instanceof Error ? err.message : "Failed to submit.",
      );
    } finally {
      setCardSaving(entry.id, false);
    }
  }

  async function handleApprove(entry: TestingScheduleEntry) {
    const existing = summaryByEntry.get(entry.id);
    if (!existing) return;

    setCardSaving(entry.id, true);
    clearCardMessage(entry.id);

    try {
      const updated = await api<QuarterlySummaryRecord>(
        `/api/controls/quarterly-summaries/${existing.id}`,
        { method: "PATCH", body: { status: "APPROVED" } },
      );
      setSummaries((prev) =>
        prev.map((s) => (s.id === existing.id ? updated : s)),
      );
      setCardSuccessMsg(entry.id, "Approved successfully.");
    } catch (err) {
      setCardError(
        entry.id,
        err instanceof Error ? err.message : "Failed to approve.",
      );
    } finally {
      setCardSaving(entry.id, false);
    }
  }

  async function handleReturnToDraft(entry: TestingScheduleEntry) {
    const existing = summaryByEntry.get(entry.id);
    if (!existing) return;

    setCardSaving(entry.id, true);
    clearCardMessage(entry.id);

    try {
      const updated = await api<QuarterlySummaryRecord>(
        `/api/controls/quarterly-summaries/${existing.id}`,
        { method: "PATCH", body: { status: "DRAFT" } },
      );
      setSummaries((prev) =>
        prev.map((s) => (s.id === existing.id ? updated : s)),
      );
      setCardSuccessMsg(entry.id, "Returned to draft.");
    } catch (err) {
      setCardError(
        entry.id,
        err instanceof Error ? err.message : "Failed to return to draft.",
      );
    } finally {
      setCardSaving(entry.id, false);
    }
  }

  async function handleBulkApprove() {
    const submittedSummaries = summaries.filter((s) => s.status === "SUBMITTED");
    if (submittedSummaries.length === 0) return;

    setBulkApproving(true);

    try {
      const updates = await Promise.allSettled(
        submittedSummaries.map((s) =>
          api<QuarterlySummaryRecord>(
            `/api/controls/quarterly-summaries/${s.id}`,
            { method: "PATCH", body: { status: "APPROVED" } },
          ),
        ),
      );

      /* Update local state with successful approvals */
      const approvedIds = new Set<string>();
      updates.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          approvedIds.add(submittedSummaries[idx].id);
        }
      });

      setSummaries((prev) =>
        prev.map((s) =>
          approvedIds.has(s.id)
            ? { ...s, status: "APPROVED" as const, approvedById: currentUser?.id ?? null, approvedAt: new Date().toISOString() }
            : s,
        ),
      );

      const failCount = updates.filter((r) => r.status === "rejected").length;
      if (failCount > 0) {
        setFetchError(`${approvedIds.size} approved, ${failCount} failed. Please retry the failed items.`);
      }
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Bulk approval failed.",
      );
    } finally {
      setBulkApproving(false);
    }
  }

  /* ── Render helpers ─────────────────────────────────────────────────────── */

  function renderResultDot(result: TestResultValue | null, monthIdx: number) {
    if (!result) {
      return (
        <div key={monthIdx} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-200" />
          <span className="text-xs text-gray-400">{MONTH_NAMES[qMonths[monthIdx] - 1]}</span>
        </div>
      );
    }

    const colours = TEST_RESULT_COLOURS[result];
    return (
      <div key={monthIdx} className="flex items-center gap-1.5">
        <span className={`w-3 h-3 rounded-full ${colours.dot}`} />
        <span className={`text-xs font-medium ${colours.text}`}>
          {MONTH_NAMES[qMonths[monthIdx] - 1]}: {TEST_RESULT_LABELS[result]}
        </span>
      </div>
    );
  }

  function renderStatusBadge(status: string) {
    const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
        {status === "APPROVED" && <Lock className="w-3 h-3" />}
        {style.label}
      </span>
    );
  }

  /* ── Main render ────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-poppins font-semibold text-updraft-deep">
            Quarterly Summary
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Summarise quarterly testing outcomes and submit for CCRO approval.
          </p>
        </div>
      </div>

      {/* Quarter selector */}
      <div className="bento-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-updraft-deep" />
            <span className="text-sm font-medium text-gray-700">Quarter:</span>
          </div>

          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
          >
            {quarterOptions.map((q) => (
              <option key={q} value={q}>
                {formatQuarterLabel(q)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Approval dashboard (CCRO_TEAM only) */}
      {isCCROTeam && (
        <div className="bento-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-poppins font-semibold text-updraft-deep flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Approval Dashboard
            </h3>
            {submittedCount > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={bulkApproving}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colours"
              >
                {bulkApproving ? (
                  <>
                    <Send className="w-4 h-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Approve All Submitted ({submittedCount})
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
              <p className="text-2xl font-poppins font-bold text-gray-700">{draftCount}</p>
              <p className="text-xs text-gray-500 mt-1">Draft</p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
              <p className="text-2xl font-poppins font-bold text-blue-700">{submittedCount}</p>
              <p className="text-xs text-blue-600 mt-1">Awaiting Approval</p>
            </div>
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
              <p className="text-2xl font-poppins font-bold text-green-700">{approvedCount}</p>
              <p className="text-xs text-green-600 mt-1">Approved</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bento-card p-8 text-center text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-updraft-deep/30 border-t-updraft-deep rounded-full animate-spin mb-2" />
          <p className="text-sm">Loading quarterly summaries...</p>
        </div>
      )}

      {/* Fetch error */}
      {fetchError && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          {fetchError}
        </div>
      )}

      {/* Empty state */}
      {!loading && activeEntries.length === 0 && (
        <div className="bento-card p-8 text-center text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No controls are currently in the testing schedule.</p>
          <p className="text-sm mt-1">
            Add controls to the testing schedule to begin writing quarterly summaries.
          </p>
        </div>
      )}

      {/* Summary cards */}
      {!loading && activeEntries.length > 0 && (
        <div className="space-y-4">
          {activeEntries
            .sort((a, b) =>
              naturalCompare(a.control?.controlRef ?? "", b.control?.controlRef ?? ""),
            )
            .map((entry) => {
              const summary = summaryByEntry.get(entry.id);
              const status = summary?.status ?? "DRAFT";
              const isApproved = status === "APPROVED";
              const isSubmitted = status === "SUBMITTED";
              const isSaving = savingIds.has(entry.id);
              const cardError = cardErrors.get(entry.id);
              const cardSuccessMsg = cardSuccess.get(entry.id);
              const isCollapsed = collapsedCards.has(entry.id);

              const quarterResults = getQuarterResults(entry);
              const hasFail = hasFailure(entry);
              const narrative = getEffectiveNarrative(entry.id);

              const controlRef = entry.control?.controlRef ?? "—";
              const controlName = entry.control?.controlName ?? "Unknown Control";
              const businessArea = entry.control?.businessArea?.name ?? "Unassigned";
              const testerName = getTesterName(entry);

              /* Can the current user edit this card? */
              const canEdit = !isApproved && (
                isCCROTeam ||
                currentUser?.id === entry.assignedTesterId ||
                currentUser?.id === summary?.authorId
              );

              /* Can approve? Only CCRO_TEAM */
              const canApprove = isCCROTeam && isSubmitted;

              return (
                <div
                  key={entry.id}
                  className={`bento-card overflow-hidden ${
                    hasFail ? "ring-1 ring-amber-300" : ""
                  }`}
                >
                  {/* Card header */}
                  <button
                    onClick={() => toggleCard(entry.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colours text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-updraft-deep text-sm">
                            {controlRef}
                          </span>
                          <span className="font-poppins font-semibold text-gray-800 text-sm truncate">
                            {controlName}
                          </span>
                          {renderStatusBadge(status)}
                          {hasFail && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <AlertTriangle className="w-3 h-3" />
                              Failure
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                          <span>{businessArea}</span>
                          <span className="text-gray-300">|</span>
                          <span>Tester: {testerName}</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Card body */}
                  {!isCollapsed && (
                    <div className="px-4 py-4 space-y-4">
                      {/* 2LOD Results row */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          <GlossaryTooltip term="2LOD">2LOD</GlossaryTooltip> Results
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                          {quarterResults.map((result, idx) =>
                            renderResultDot(result, idx),
                          )}
                        </div>
                      </div>

                      {/* Discrepancy warning */}
                      {hasFail && (
                        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>
                            2LOD testing found failure(s) this quarter — discrepancy to address in narrative.
                          </span>
                        </div>
                      )}

                      {/* Quarterly narrative */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          Quarterly Narrative
                        </label>
                        {isApproved ? (
                          <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[80px]">
                            {narrative || (
                              <span className="italic text-gray-400">No narrative recorded.</span>
                            )}
                          </div>
                        ) : (
                          <textarea
                            value={narrative}
                            onChange={(e) => updateNarrative(entry.id, e.target.value)}
                            disabled={!canEdit || isSaving}
                            placeholder="Summarise the quarterly testing outcomes, any discrepancies, and recommended actions..."
                            rows={4}
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30 resize-y disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                          />
                        )}
                      </div>

                      {/* Status and actions row */}
                      <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm">
                          {isApproved && summary?.approvedAt && (
                            <span className="text-gray-500 text-xs">
                              Approved by{" "}
                              <span className="font-medium text-gray-700">
                                {summary.approvedBy?.name ?? getUserName(summary.approvedById)}
                              </span>{" "}
                              on{" "}
                              <span className="font-medium text-gray-700">
                                {new Date(summary.approvedAt).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </span>
                          )}
                          {isSubmitted && !isCCROTeam && (
                            <span className="text-xs text-blue-600">
                              Awaiting CCRO approval
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Draft actions */}
                          {status === "DRAFT" && canEdit && (
                            <>
                              <button
                                onClick={() => handleSaveDraft(entry)}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colours"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {isSaving ? "Saving..." : "Save Draft"}
                              </button>
                              <button
                                onClick={() => handleSubmit(entry)}
                                disabled={isSaving || !narrative.trim()}
                                className="inline-flex items-center gap-1.5 rounded-md bg-updraft-deep px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-updraft-deep/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colours"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {isSaving ? "Submitting..." : "Submit for Approval"}
                              </button>
                            </>
                          )}

                          {/* Submitted actions (CCRO only) */}
                          {canApprove && (
                            <>
                              <button
                                onClick={() => handleReturnToDraft(entry)}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colours"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                {isSaving ? "Returning..." : "Return to Draft"}
                              </button>
                              <button
                                onClick={() => handleApprove(entry)}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colours"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isSaving ? "Approving..." : "Approve"}
                              </button>
                            </>
                          )}

                          {/* Approved but CCRO can return */}
                          {isApproved && isCCROTeam && (
                            <button
                              onClick={() => handleReturnToDraft(entry)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colours"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              {isSaving ? "Returning..." : "Reopen as Draft"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Per-card error/success */}
                      {cardError && (
                        <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          {cardError}
                        </div>
                      )}
                      {cardSuccessMsg && (
                        <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                          {cardSuccessMsg}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
