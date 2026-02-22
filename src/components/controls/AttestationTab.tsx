"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type {
  ControlRecord,
  ControlAttestation,
  TestingScheduleEntry,
  TestResultValue,
  ControlBusinessArea,
} from "@/lib/types";
import {
  CD_OUTCOME_LABELS,
  CONTROL_FREQUENCY_LABELS,
  TEST_RESULT_LABELS,
  TEST_RESULT_COLOURS,
} from "@/lib/types";
import { api } from "@/lib/api-client";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  MessageSquare,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Filter,
  Save,
} from "lucide-react";

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

/* ── Types ──────────────────────────────────────────────────────────────────── */

type AttestationEdit = {
  attested: boolean;
  comments: string;
  issuesFlagged: boolean;
  issueDescription: string;
};

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function getLatestTestResult(
  entry: TestingScheduleEntry,
): { result: TestResultValue; year: number; month: number } | null {
  const results = entry.testResults
    ?.slice()
    .sort(
      (a, b) =>
        b.periodYear - a.periodYear || b.periodMonth - a.periodMonth,
    );
  return results?.[0]
    ? {
        result: results[0].result,
        year: results[0].periodYear,
        month: results[0].periodMonth,
      }
    : null;
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function AttestationTab() {
  const currentUser = useAppStore((s) => s.currentUser);
  const controls = useAppStore((s) => s.controls);
  const controlBusinessAreas = useAppStore((s) => s.controlBusinessAreas);
  const testingSchedule = useAppStore((s) => s.testingSchedule);
  const users = useAppStore((s) => s.users);

  /* Period selector — defaults to current month/year */
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    now.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    now.getFullYear(),
  );

  /* Attestation data fetched from API for the selected period */
  const [attestations, setAttestations] = useState<ControlAttestation[]>([]);
  const [loadingAttestations, setLoadingAttestations] = useState(false);

  /* Local edits map: controlId -> AttestationEdit */
  const [edits, setEdits] = useState<Map<string, AttestationEdit>>(
    new Map(),
  );

  /* Track which edits have been touched (changed from initial state) */
  const [touched, setTouched] = useState<Set<string>>(new Set());

  /* Saving state */
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* Comments expansion */
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set(),
  );

  /* Year range for dropdown */
  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, []);

  const isOwner = currentUser?.role === "OWNER";
  const isCCROTeam = currentUser?.role === "CCRO_TEAM";

  /* ── Fetch attestations when period changes ──────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    async function fetchAttestations() {
      setLoadingAttestations(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
        const data = await api<ControlAttestation[]>(
          `/api/controls/attestations?periodYear=${selectedYear}&periodMonth=${selectedMonth}`,
        );
        if (!cancelled) {
          setAttestations(data);
        }
      } catch {
        if (!cancelled) {
          setAttestations([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAttestations(false);
        }
      }
    }

    fetchAttestations();

    return () => {
      cancelled = true;
    };
  }, [selectedYear, selectedMonth]);

  /* ── Owner: filtered controls ────────────────────────────────────────────── */

  const ownerControls = useMemo(() => {
    if (!isOwner || !currentUser) return [];
    return controls.filter(
      (c) => c.controlOwnerId === currentUser.id && c.isActive,
    );
  }, [controls, currentUser, isOwner]);

  /* ── Pre-populate edits from fetched attestations ────────────────────────── */

  useEffect(() => {
    const newEdits = new Map<string, AttestationEdit>();
    const relevantControls = isOwner ? ownerControls : controls;

    for (const control of relevantControls) {
      const existing = attestations.find(
        (a) => a.controlId === control.id,
      );
      if (existing) {
        newEdits.set(control.id, {
          attested: existing.attested,
          comments: existing.comments ?? "",
          issuesFlagged: existing.issuesFlagged,
          issueDescription: existing.issueDescription ?? "",
        });
      } else {
        newEdits.set(control.id, {
          attested: false,
          comments: "",
          issuesFlagged: false,
          issueDescription: "",
        });
      }
    }

    setEdits(newEdits);
    setTouched(new Set());
  }, [attestations, isOwner, ownerControls, controls]);

  /* ── Edit handlers ─────────────────────────────────────────────────────── */

  const updateEdit = useCallback(
    (
      controlId: string,
      field: keyof AttestationEdit,
      value: boolean | string,
    ) => {
      setEdits((prev) => {
        const next = new Map(prev);
        const current = next.get(controlId) ?? {
          attested: false,
          comments: "",
          issuesFlagged: false,
          issueDescription: "",
        };

        const updated = { ...current, [field]: value };

        // If un-flagging issue, clear description
        if (field === "issuesFlagged" && value === false) {
          updated.issueDescription = "";
        }

        next.set(controlId, updated);
        return next;
      });

      setTouched((prev) => {
        const next = new Set(prev);
        next.add(controlId);
        return next;
      });

      setSaveSuccess(false);
      setSaveError(null);
    },
    [],
  );

  function toggleComments(controlId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(controlId)) {
        next.delete(controlId);
      } else {
        next.add(controlId);
      }
      return next;
    });
  }

  /* ── Owner view: progress calculation ──────────────────────────────────── */

  const ownerAttestedCount = useMemo(() => {
    if (!isOwner) return 0;
    let count = 0;
    for (const control of ownerControls) {
      const edit = edits.get(control.id);
      if (edit?.attested) count++;
    }
    return count;
  }, [isOwner, ownerControls, edits]);

  /* ── Owner view: business areas for the user ───────────────────────────── */

  const ownerBusinessAreaNames = useMemo(() => {
    if (!isOwner) return "";
    const areaIds = new Set(ownerControls.map((c) => c.businessAreaId));
    const names = controlBusinessAreas
      .filter((ba) => areaIds.has(ba.id))
      .map((ba) => ba.name);
    return names.length > 0 ? names.join(", ") : "No assigned areas";
  }, [isOwner, ownerControls, controlBusinessAreas]);

  /* ── Owner view: testing schedule lookup ───────────────────────────────── */

  const scheduleByControlId = useMemo(() => {
    const map = new Map<string, TestingScheduleEntry>();
    for (const entry of testingSchedule) {
      if (entry.isActive) {
        map.set(entry.controlId, entry);
      }
    }
    return map;
  }, [testingSchedule]);

  /* ── Owner view: validation ────────────────────────────────────────────── */

  const validationErrors = useMemo(() => {
    if (!isOwner) return [];
    const errors: { controlId: string; message: string }[] = [];

    for (const control of ownerControls) {
      const edit = edits.get(control.id);
      if (edit?.issuesFlagged && !edit.issueDescription.trim()) {
        errors.push({
          controlId: control.id,
          message: `${control.controlRef}: Issue flagged but no description provided`,
        });
      }
    }

    return errors;
  }, [isOwner, ownerControls, edits]);

  /* ── Owner view: submit handler ────────────────────────────────────────── */

  async function handleSubmitAll() {
    if (validationErrors.length > 0) {
      setSaveError(
        "Cannot submit: please add a description for all flagged issues.",
      );
      return;
    }

    const payload: {
      controlId: string;
      periodYear: number;
      periodMonth: number;
      attested: boolean;
      comments: string;
      issuesFlagged: boolean;
      issueDescription: string;
    }[] = [];

    for (const control of ownerControls) {
      const edit = edits.get(control.id);
      if (!edit) continue;
      // Only include controls that have been touched or already attested
      if (!touched.has(control.id) && !edit.attested) continue;

      payload.push({
        controlId: control.id,
        periodYear: selectedYear,
        periodMonth: selectedMonth,
        attested: edit.attested,
        comments: edit.comments,
        issuesFlagged: edit.issuesFlagged,
        issueDescription: edit.issueDescription,
      });
    }

    if (payload.length === 0) {
      setSaveError("No attestations to submit. Please attest at least one control.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await api("/api/controls/attestations", {
        method: "POST",
        body: { attestations: payload },
      });
      setSaveSuccess(true);
      setTouched(new Set());

      // Refresh attestations
      const data = await api<ControlAttestation[]>(
        `/api/controls/attestations?periodYear=${selectedYear}&periodMonth=${selectedMonth}`,
      );
      setAttestations(data);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to submit attestations. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ── CCRO view: group controls by business area ────────────────────────── */

  const ccroGroupedByArea = useMemo(() => {
    if (!isCCROTeam) return [];

    const areaMap = new Map<
      string,
      {
        area: ControlBusinessArea;
        controls: ControlRecord[];
        attestedCount: number;
      }
    >();

    // Initialise from known business areas
    for (const area of controlBusinessAreas) {
      areaMap.set(area.id, { area, controls: [], attestedCount: 0 });
    }

    for (const control of controls) {
      if (!control.isActive) continue;
      const areaId = control.businessAreaId;
      if (!areaMap.has(areaId)) {
        const fallbackArea: ControlBusinessArea = {
          id: areaId,
          name: "Unassigned",
          sortOrder: 999,
          isActive: true,
          createdAt: "",
        };
        areaMap.set(areaId, { area: fallbackArea, controls: [], attestedCount: 0 });
      }
      const group = areaMap.get(areaId)!;
      group.controls.push(control);

      const existing = attestations.find((a) => a.controlId === control.id);
      if (existing?.attested) {
        group.attestedCount++;
      }
    }

    return Array.from(areaMap.values())
      .filter((g) => g.controls.length > 0)
      .sort((a, b) => a.area.sortOrder - b.area.sortOrder);
  }, [isCCROTeam, controls, controlBusinessAreas, attestations]);

  /* ── CCRO view: overall totals ─────────────────────────────────────────── */

  const ccroTotals = useMemo(() => {
    if (!isCCROTeam) return { total: 0, attested: 0 };
    const total = ccroGroupedByArea.reduce(
      (sum, g) => sum + g.controls.length,
      0,
    );
    const attested = ccroGroupedByArea.reduce(
      (sum, g) => sum + g.attestedCount,
      0,
    );
    return { total, attested };
  }, [isCCROTeam, ccroGroupedByArea]);

  /* ── CCRO view: issues flagged ─────────────────────────────────────────── */

  const flaggedIssues = useMemo(() => {
    if (!isCCROTeam) return [];
    return attestations
      .filter((a) => a.issuesFlagged)
      .map((a) => {
        const control = controls.find((c) => c.id === a.controlId);
        const area = controlBusinessAreas.find(
          (ba) => ba.id === control?.businessAreaId,
        );
        const flaggedByUser =
          a.attestedBy ?? users.find((u) => u.id === a.attestedById);
        return {
          attestation: a,
          control,
          areaName: area?.name ?? "Unknown",
          flaggedByName: flaggedByUser?.name ?? "Unknown",
        };
      });
  }, [isCCROTeam, attestations, controls, controlBusinessAreas, users]);

  /* ── CCRO view: overdue (controls with no attestation for this period) ── */

  const overdueControls = useMemo(() => {
    if (!isCCROTeam) return [];
    const attestedControlIds = new Set(
      attestations.filter((a) => a.attested).map((a) => a.controlId),
    );
    return controls
      .filter((c) => c.isActive && !attestedControlIds.has(c.id))
      .map((c) => {
        const area = controlBusinessAreas.find(
          (ba) => ba.id === c.businessAreaId,
        );
        const owner = c.controlOwner ?? users.find((u) => u.id === c.controlOwnerId);
        return {
          control: c,
          areaName: area?.name ?? "Unknown",
          ownerName: owner?.name ?? "Unassigned",
        };
      });
  }, [isCCROTeam, attestations, controls, controlBusinessAreas, users]);

  /* ── CCRO review state ────────────────────────────────────────────────── */

  type CCROReviewFilter = "ALL" | "PENDING" | "AGREED" | "DISAGREED";
  const [ccroFilter, setCCROFilter] = useState<CCROReviewFilter>("ALL");
  const [ccroReviewEdits, setCCROReviewEdits] = useState<
    Map<string, { agreement: boolean | null; comments: string }>
  >(new Map());
  const [ccroSavingId, setCCROSavingId] = useState<string | null>(null);
  const [ccroSaveSuccess, setCCROSaveSuccess] = useState<string | null>(null);

  /* ── CCRO review: summary counts ─────────────────────────────────────── */

  const ccroReviewCounts = useMemo(() => {
    if (!isCCROTeam) return { pending: 0, agreed: 0, disagreed: 0 };
    let pending = 0;
    let agreed = 0;
    let disagreed = 0;
    for (const a of attestations) {
      if (!a.attested) continue;
      if (a.ccroAgreement === null || a.ccroAgreement === undefined) pending++;
      else if (a.ccroAgreement === true) agreed++;
      else disagreed++;
    }
    return { pending, agreed, disagreed };
  }, [isCCROTeam, attestations]);

  /* ── CCRO review: filtered attestations ──────────────────────────────── */

  const ccroReviewAttestations = useMemo(() => {
    if (!isCCROTeam) return [];
    const attested = attestations.filter((a) => a.attested);

    return attested
      .filter((a) => {
        if (ccroFilter === "PENDING")
          return a.ccroAgreement === null || a.ccroAgreement === undefined;
        if (ccroFilter === "AGREED") return a.ccroAgreement === true;
        if (ccroFilter === "DISAGREED") return a.ccroAgreement === false;
        return true;
      })
      .map((a) => {
        const control = controls.find((c) => c.id === a.controlId);
        const area = controlBusinessAreas.find(
          (ba) => ba.id === control?.businessAreaId,
        );
        const ownerUser =
          a.attestedBy ?? users.find((u) => u.id === a.attestedById);
        return {
          attestation: a,
          control,
          areaName: area?.name ?? "Unknown",
          ownerName: ownerUser?.name ?? "Unknown",
        };
      });
  }, [isCCROTeam, attestations, controls, controlBusinessAreas, users, ccroFilter]);

  /* ── CCRO review: get/set edit state ─────────────────────────────────── */

  function getCCROEdit(attestationId: string, attestation: ControlAttestation) {
    const existing = ccroReviewEdits.get(attestationId);
    if (existing) return existing;
    return {
      agreement: attestation.ccroAgreement ?? null,
      comments: attestation.ccroComments ?? "",
    };
  }

  function updateCCROEdit(
    attestationId: string,
    field: "agreement" | "comments",
    value: boolean | null | string,
  ) {
    setCCROReviewEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(attestationId) ?? { agreement: null, comments: "" };
      next.set(attestationId, { ...current, [field]: value });
      return next;
    });
    setCCROSaveSuccess(null);
  }

  /* ── CCRO review: save handler ──────────────────────────────────────── */

  async function handleCCROReviewSave(attestationId: string) {
    const edit = ccroReviewEdits.get(attestationId);
    if (!edit || edit.agreement === null) return;

    setCCROSavingId(attestationId);
    setCCROSaveSuccess(null);

    try {
      await api(`/api/controls/attestations/${attestationId}`, {
        method: "PATCH",
        body: {
          ccroAgreement: edit.agreement,
          ccroComments: edit.comments || undefined,
        },
      });
      setCCROSaveSuccess(attestationId);

      // Refresh attestations
      const data = await api<ControlAttestation[]>(
        `/api/controls/attestations?periodYear=${selectedYear}&periodMonth=${selectedMonth}`,
      );
      setAttestations(data);
    } catch {
      setSaveError("Failed to save CCRO review. Please try again.");
    } finally {
      setCCROSavingId(null);
    }
  }

  /* ── Guard: no user ────────────────────────────────────────────────────── */

  if (!currentUser) {
    return (
      <div className="bento-card p-8 text-center text-gray-500">
        Please log in to view attestations.
      </div>
    );
  }

  if (!isOwner && !isCCROTeam) {
    return (
      <div className="bento-card p-8 text-center text-gray-500">
        <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>Attestation is available for Business Owners and CCRO Team members.</p>
      </div>
    );
  }

  /* ── Period selector (shared between views) ────────────────────────────── */

  const periodSelector = (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-updraft-deep" />
        <span className="text-sm font-medium text-gray-700">Period:</span>
      </div>

      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(Number(e.target.value))}
        className="rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
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
        className="rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
      >
        {yearOptions.map((yr) => (
          <option key={yr} value={yr}>
            {yr}
          </option>
        ))}
      </select>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════════════ */
  /* ═══ OWNER VIEW ═══════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════════════════ */

  if (isOwner) {
    const progressPct =
      ownerControls.length > 0
        ? Math.round((ownerAttestedCount / ownerControls.length) * 100)
        : 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-poppins font-semibold text-updraft-deep flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            My Controls — Monthly Attestation
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Logged in as: {currentUser.name} &middot; {ownerBusinessAreaNames}
          </p>
        </div>

        {/* Period selector */}
        <div className="bento-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {periodSelector}

            {/* Submit button */}
            <button
              onClick={handleSubmitAll}
              disabled={saving || touched.size === 0}
              className="inline-flex items-center gap-2 rounded-md bg-updraft-deep px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-updraft-deep/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <ShieldCheck className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Submit All Attestations
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bento-card p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Attested</span>
            <span className="text-gray-500">
              {ownerAttestedCount}/{ownerControls.length}
              {ownerControls.length > 0 && ` (${progressPct}%)`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-300 bg-updraft-deep"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Error / success messages */}
        {saveError && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            Attestations submitted successfully.
          </div>
        )}

        {/* Validation warnings */}
        {validationErrors.length > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
            <p className="font-medium">Validation Warnings:</p>
            {validationErrors.map((err) => (
              <p key={err.controlId} className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                {err.message}
              </p>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loadingAttestations && (
          <div className="bento-card p-8 text-center text-gray-500">
            <Clock className="w-6 h-6 mx-auto mb-2 animate-spin text-updraft-deep" />
            Loading attestations...
          </div>
        )}

        {/* Control cards */}
        {!loadingAttestations && ownerControls.length === 0 ? (
          <div className="bento-card p-8 text-center text-gray-500">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No controls are assigned to you.</p>
            <p className="text-sm mt-1">
              Contact the CCRO team if you believe this is an error.
            </p>
          </div>
        ) : (
          !loadingAttestations && (
            <div className="space-y-4">
              {ownerControls.map((control) => {
                const edit = edits.get(control.id) ?? {
                  attested: false,
                  comments: "",
                  issuesFlagged: false,
                  issueDescription: "",
                };
                const existingAttestation = attestations.find(
                  (a) => a.controlId === control.id,
                );
                const scheduleEntry = scheduleByControlId.get(control.id);
                const latestTest = scheduleEntry
                  ? getLatestTestResult(scheduleEntry)
                  : null;
                const isCommentsExpanded = expandedComments.has(control.id);
                const areaName =
                  control.businessArea?.name ??
                  controlBusinessAreas.find(
                    (ba) => ba.id === control.businessAreaId,
                  )?.name ??
                  "Unknown";

                return (
                  <div key={control.id} className="bento-card p-5 space-y-4">
                    {/* Control header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-updraft-deep">
                            {control.controlRef}
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            {control.controlName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          <span>
                            {CD_OUTCOME_LABELS[control.consumerDutyOutcome]}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span>
                            {CONTROL_FREQUENCY_LABELS[control.controlFrequency]}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span>{areaName}</span>
                        </div>
                      </div>

                      {/* Already attested indicator */}
                      {existingAttestation?.attested && (
                        <div className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs text-green-700 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Attested{" "}
                          {new Date(
                            existingAttestation.attestedAt,
                          ).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </div>

                    {/* Control description */}
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {control.controlDescription}
                    </p>

                    {/* 2LOD Testing info */}
                    {scheduleEntry && (
                      <div className="rounded-md bg-updraft-pale-purple/30 border border-updraft-pale-purple px-3 py-2.5 text-sm space-y-1">
                        <div className="flex items-center gap-2 text-updraft-deep font-medium">
                          <ShieldCheck className="w-4 h-4" />
                          2LOD Testing: This control is on the CCRO testing
                          schedule
                        </div>
                        {latestTest && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 ml-6">
                            Last 2LOD result:{" "}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TEST_RESULT_COLOURS[latestTest.result].bg} ${TEST_RESULT_COLOURS[latestTest.result].text}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${TEST_RESULT_COLOURS[latestTest.result].dot}`}
                              />
                              {TEST_RESULT_LABELS[latestTest.result]}
                            </span>
                            <span className="text-gray-400">
                              ({MONTH_NAMES[latestTest.month - 1]}{" "}
                              {latestTest.year})
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attestation controls */}
                    <div className="space-y-3 border-t border-gray-100 pt-4">
                      {/* Attest checkbox */}
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={edit.attested}
                          onChange={(e) =>
                            updateEdit(
                              control.id,
                              "attested",
                              e.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-gray-300 text-updraft-deep focus:ring-updraft-deep/30 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-800 group-hover:text-updraft-deep transition-colors">
                          I confirm this control was operated
                        </span>
                      </label>

                      {/* Flag issue checkbox */}
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={edit.issuesFlagged}
                          onChange={(e) =>
                            updateEdit(
                              control.id,
                              "issuesFlagged",
                              e.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500/30 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-800 group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          Flag an issue
                        </span>
                      </label>

                      {/* Issue description textarea (shown when issue flagged) */}
                      {edit.issuesFlagged && (
                        <div className="ml-8">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Issue Description{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={edit.issueDescription}
                            onChange={(e) =>
                              updateEdit(
                                control.id,
                                "issueDescription",
                                e.target.value,
                              )
                            }
                            placeholder="Describe the issue observed..."
                            rows={3}
                            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30 resize-y ${
                              edit.issuesFlagged &&
                              !edit.issueDescription.trim()
                                ? "border-amber-300 bg-amber-50/50"
                                : "border-gray-300"
                            }`}
                          />
                          {edit.issuesFlagged &&
                            !edit.issueDescription.trim() && (
                              <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                A description is required when flagging an
                                issue.
                              </p>
                            )}
                        </div>
                      )}

                      {/* Optional comments toggle + textarea */}
                      <div>
                        <button
                          onClick={() => toggleComments(control.id)}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                            isCommentsExpanded
                              ? "text-updraft-deep"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {isCommentsExpanded
                            ? "Hide comments"
                            : edit.comments
                              ? "View/edit comments"
                              : "Add comments"}
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              isCommentsExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isCommentsExpanded && (
                          <textarea
                            value={edit.comments}
                            onChange={(e) =>
                              updateEdit(
                                control.id,
                                "comments",
                                e.target.value,
                              )
                            }
                            placeholder="Optional comments..."
                            rows={2}
                            className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30 resize-y"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════ */
  /* ═══ CCRO TEAM VIEW ═══════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════════════════ */

  const ccroProgressPct =
    ccroTotals.total > 0
      ? Math.round((ccroTotals.attested / ccroTotals.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-poppins font-semibold text-updraft-deep flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Attestation Overview
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Cross-area attestation status for the selected period.
        </p>
      </div>

      {/* Period selector */}
      <div className="bento-card p-4">{periodSelector}</div>

      {/* Loading state */}
      {loadingAttestations && (
        <div className="bento-card p-8 text-center text-gray-500">
          <Clock className="w-6 h-6 mx-auto mb-2 animate-spin text-updraft-deep" />
          Loading attestation data...
        </div>
      )}

      {!loadingAttestations && (
        <>
          {/* Overall progress */}
          <div className="bento-card p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">
                Overall Attestation Progress
              </span>
              <span className="text-gray-500">
                {ccroTotals.attested}/{ccroTotals.total} attested
                {ccroTotals.total > 0 && ` (${ccroProgressPct}%)`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  ccroProgressPct === 100
                    ? "bg-green-500"
                    : ccroProgressPct >= 75
                      ? "bg-updraft-deep"
                      : ccroProgressPct >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                }`}
                style={{ width: `${ccroProgressPct}%` }}
              />
            </div>
          </div>

          {/* By Business Area */}
          <div className="bento-card p-5">
            <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4">
              By Business Area
            </h3>

            {ccroGroupedByArea.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                No active controls found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {ccroGroupedByArea.map(({ area, controls: areaControls, attestedCount }) => {
                  const total = areaControls.length;
                  const pct =
                    total > 0
                      ? Math.round((attestedCount / total) * 100)
                      : 0;
                  const isComplete = pct === 100;

                  return (
                    <div
                      key={area.id}
                      className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      {/* Status icon */}
                      <div className="shrink-0">
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        )}
                      </div>

                      {/* Area info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">
                            {area.name}
                          </span>
                          <span className="text-xs text-gray-500 ml-2 shrink-0">
                            {attestedCount}/{total} ({pct}%)
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1.5">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isComplete ? "bg-green-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Issues Flagged */}
          <div className="bento-card p-5">
            <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Issues Flagged
              {flaggedIssues.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {flaggedIssues.length}
                </span>
              )}
            </h3>

            {flaggedIssues.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                No issues flagged for this period.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 space-y-0">
                {flaggedIssues.map(
                  ({ attestation, control, areaName, flaggedByName }) => (
                    <div
                      key={attestation.id}
                      className="py-3 first:pt-0 last:pb-0 space-y-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-updraft-deep">
                          {control?.controlRef ?? "—"}
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {control?.controlName ?? "Unknown Control"}
                        </span>
                        <span className="text-xs text-gray-400">
                          &middot; {areaName}
                        </span>
                      </div>

                      {/* Issue description */}
                      <div className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-900">
                        {attestation.issueDescription || "No description provided."}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          Flagged by {flaggedByName}
                        </span>
                        <span className="text-gray-300">&middot;</span>
                        <span>
                          {new Date(attestation.attestedAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Overdue Attestations */}
          <div className="bento-card p-5">
            <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              Overdue Attestations
              {overdueControls.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {overdueControls.length}
                </span>
              )}
            </h3>

            {overdueControls.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
                All controls have been attested for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="pb-2 pr-4">Ref</th>
                      <th className="pb-2 pr-4">Control Name</th>
                      <th className="pb-2 pr-4">Business Area</th>
                      <th className="pb-2">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {overdueControls.map(
                      ({ control, areaName, ownerName }) => (
                        <tr
                          key={control.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="py-2.5 pr-4">
                            <span className="font-mono font-medium text-updraft-deep text-xs">
                              {control.controlRef}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-800">
                            {control.controlName}
                          </td>
                          <td className="py-2.5 pr-4 text-gray-600">
                            {areaName}
                          </td>
                          <td className="py-2.5 text-gray-600">
                            {ownerName}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── CCRO Review Section ─────────────────────────────────────────── */}
          <div className="bento-card p-5">
            <h3 className="text-sm font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-updraft-deep" />
              CCRO Review
            </h3>

            {/* Review summary stat cards */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {ccroReviewCounts.pending}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">
                  Pending Review
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {ccroReviewCounts.agreed}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">
                  CCRO Agrees
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {ccroReviewCounts.disagreed}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">
                  CCRO Disagrees
                </div>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              {(
                [
                  { key: "ALL", label: "All" },
                  { key: "PENDING", label: "Pending" },
                  { key: "AGREED", label: "Agreed" },
                  { key: "DISAGREED", label: "Disagreed" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCCROFilter(key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    ccroFilter === key
                      ? "bg-updraft-deep text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Review table / cards */}
            {ccroReviewAttestations.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                {ccroFilter === "ALL"
                  ? "No attested controls to review for this period."
                  : `No ${ccroFilter.toLowerCase()} attestations for this period.`}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 space-y-0">
                {ccroReviewAttestations.map(
                  ({ attestation, control, areaName, ownerName }) => {
                    const edit = getCCROEdit(attestation.id, attestation);
                    const isSaving = ccroSavingId === attestation.id;
                    const justSaved = ccroSaveSuccess === attestation.id;
                    const isReviewed =
                      attestation.ccroAgreement !== null &&
                      attestation.ccroAgreement !== undefined;

                    return (
                      <div
                        key={attestation.id}
                        className="py-4 first:pt-0 last:pb-0 space-y-3"
                      >
                        {/* Control info row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-semibold text-updraft-deep">
                                {control?.controlRef ?? "\u2014"}
                              </span>
                              <span className="text-sm font-medium text-gray-800">
                                {control?.controlName ?? "Unknown Control"}
                              </span>
                              <span className="text-xs text-gray-400">
                                &middot; {areaName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span>Owner: {ownerName}</span>
                              {attestation.attested && (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Attested
                                </span>
                              )}
                              {attestation.issuesFlagged && (
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <AlertTriangle className="w-3 h-3" />
                                  Issue flagged
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Current review status badge */}
                          {isReviewed && !ccroReviewEdits.has(attestation.id) && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
                                attestation.ccroAgreement
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {attestation.ccroAgreement ? (
                                <>
                                  <ThumbsUp className="w-3 h-3" />
                                  Agrees
                                </>
                              ) : (
                                <>
                                  <ThumbsDown className="w-3 h-3" />
                                  Disagrees
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Owner comments */}
                        {attestation.comments && (
                          <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-700">
                            <span className="text-xs font-medium text-gray-500 block mb-0.5">
                              Owner Comments:
                            </span>
                            {attestation.comments}
                          </div>
                        )}

                        {/* Issue description */}
                        {attestation.issuesFlagged &&
                          attestation.issueDescription && (
                            <div className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-900">
                              <span className="text-xs font-medium text-amber-700 block mb-0.5">
                                Issue Description:
                              </span>
                              {attestation.issueDescription}
                            </div>
                          )}

                        {/* Existing CCRO review display (if reviewed and not editing) */}
                        {isReviewed &&
                          attestation.ccroComments &&
                          !ccroReviewEdits.has(attestation.id) && (
                            <div
                              className={`rounded-md px-3 py-2 text-sm ${
                                attestation.ccroAgreement
                                  ? "bg-green-50 border border-green-100 text-green-800"
                                  : "bg-red-50 border border-red-100 text-red-800"
                              }`}
                            >
                              <span className="text-xs font-medium block mb-0.5">
                                CCRO Comments:
                              </span>
                              {attestation.ccroComments}
                            </div>
                          )}

                        {/* Review action area */}
                        <div className="flex items-start gap-3 flex-wrap">
                          {/* Agree / Disagree radio buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateCCROEdit(attestation.id, "agreement", true)
                              }
                              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                edit.agreement === true
                                  ? "bg-green-600 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700"
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              Agree
                            </button>
                            <button
                              onClick={() =>
                                updateCCROEdit(
                                  attestation.id,
                                  "agreement",
                                  false,
                                )
                              }
                              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                edit.agreement === false
                                  ? "bg-red-600 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"
                              }`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                              Disagree
                            </button>
                          </div>

                          {/* Comment input */}
                          <div className="flex-1 min-w-[200px]">
                            <input
                              type="text"
                              value={edit.comments}
                              onChange={(e) =>
                                updateCCROEdit(
                                  attestation.id,
                                  "comments",
                                  e.target.value,
                                )
                              }
                              placeholder="Optional CCRO comments..."
                              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-updraft-deep/30"
                            />
                          </div>

                          {/* Save button */}
                          <button
                            onClick={() =>
                              handleCCROReviewSave(attestation.id)
                            }
                            disabled={
                              isSaving ||
                              edit.agreement === null ||
                              !ccroReviewEdits.has(attestation.id)
                            }
                            className="inline-flex items-center gap-1.5 rounded-md bg-updraft-deep px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-updraft-deep/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                          >
                            {isSaving ? (
                              <>
                                <Save className="w-3 h-3 animate-spin" />
                                Saving...
                              </>
                            ) : justSaved ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Saved
                              </>
                            ) : (
                              <>
                                <Save className="w-3 h-3" />
                                Save
                              </>
                            )}
                          </button>
                        </div>

                        {/* Reviewed-by info */}
                        {isReviewed && attestation.ccroReviewedAt && (
                          <div className="text-xs text-gray-400">
                            Reviewed by{" "}
                            {attestation.ccroReviewedBy?.name ??
                              users.find(
                                (u) => u.id === attestation.ccroReviewedById,
                              )?.name ??
                              "Unknown"}{" "}
                            on{" "}
                            {new Date(
                              attestation.ccroReviewedAt,
                            ).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
