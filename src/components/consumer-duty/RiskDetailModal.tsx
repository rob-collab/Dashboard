"use client";

import { useMemo, useState, useEffect } from "react";
import Modal from "@/components/common/Modal";
import type { ConsumerDutyOutcome, RAGStatus } from "@/lib/types";
import { cn, ragBgColor, ragLabel, ragLabelShort } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Shield, Pencil, Check, X } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface RiskDetailModalProps {
  outcome: ConsumerDutyOutcome | null;
  open: boolean;
  onClose: () => void;
}

function getRagMovementIcon(current: RAGStatus, previous: RAGStatus | null | undefined) {
  if (!previous || current === previous) return <Minus size={16} className="text-gray-400" />;

  const ragOrder = { GOOD: 0, WARNING: 1, HARM: 2 };
  const currentLevel = ragOrder[current];
  const previousLevel = ragOrder[previous];

  if (currentLevel < previousLevel) {
    return <TrendingUp size={16} className="text-risk-green" />;
  }
  return <TrendingDown size={16} className="text-risk-red" />;
}

function getRagMovementLabel(current: RAGStatus, previous: RAGStatus | null | undefined): string {
  if (!previous) return "No previous data";
  if (current === previous) return "No change";

  const ragOrder = { GOOD: 0, WARNING: 1, HARM: 2 };
  const currentLevel = ragOrder[current];
  const previousLevel = ragOrder[previous];

  if (currentLevel < previousLevel) {
    return `Improved from ${ragLabelShort(previous)}`;
  }
  return `Deteriorated from ${ragLabelShort(previous)}`;
}

export default function RiskDetailModal({
  outcome,
  open,
  onClose,
}: RiskDetailModalProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const updateOutcome = useAppStore((s) => s.updateOutcome);
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");

  useEffect(() => {
    if (open && outcome) {
      setSummaryDraft(outcome.monthlySummary ?? "");
      setEditingSummary(false);
    }
  }, [open, outcome]);

  const movementIcon = useMemo(() =>
    outcome ? getRagMovementIcon(outcome.ragStatus, outcome.previousRAG) : null,
    [outcome]
  );

  const movementLabel = useMemo(() =>
    outcome ? getRagMovementLabel(outcome.ragStatus, outcome.previousRAG) : "",
    [outcome]
  );

  function handleSaveSummary() {
    if (!outcome) return;
    updateOutcome(outcome.id, { monthlySummary: summaryDraft.trim() || null });
    setEditingSummary(false);
  }

  function handleCancelSummary() {
    setSummaryDraft(outcome?.monthlySummary ?? "");
    setEditingSummary(false);
  }

  if (!outcome) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${outcome.outcomeId} — ${outcome.name}`}
      size="lg"
    >
      {/* Current RAG Status */}
      <div className="mb-6 rounded-xl bg-updraft-pale-purple/10 border border-updraft-pale-purple/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Status</p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
                  outcome.ragStatus === "GOOD" && "bg-risk-green/10 text-risk-green",
                  outcome.ragStatus === "WARNING" && "bg-risk-amber/10 text-risk-amber",
                  outcome.ragStatus === "HARM" && "bg-risk-red/10 text-risk-red"
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", ragBgColor(outcome.ragStatus))} />
                {ragLabel(outcome.ragStatus)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Movement</p>
            <div className="flex items-center gap-1.5 text-sm text-gray-700">
              {movementIcon}
              <span>{movementLabel}</span>
            </div>
          </div>
        </div>

        {/* Monthly Summary — editable by CCRO */}
        <div className="border-t border-updraft-pale-purple/30 pt-3 mt-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Monthly Summary</p>
            {isCCRO && !editingSummary && (
              <button
                onClick={() => setEditingSummary(true)}
                className="inline-flex items-center gap-1 text-xs text-updraft-bright-purple hover:text-updraft-deep transition-colors"
              >
                <Pencil size={11} />
                {outcome.monthlySummary ? "Edit" : "Add Summary"}
              </button>
            )}
          </div>
          {editingSummary ? (
            <div className="space-y-2">
              <textarea
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                rows={3}
                placeholder="Write a summary of this outcome for the current month..."
                className="w-full rounded-lg border border-updraft-light-purple bg-white px-3 py-2 text-sm outline-none focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple transition-colors"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleCancelSummary}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  onClick={handleSaveSummary}
                  className="inline-flex items-center gap-1 rounded-md bg-updraft-bright-purple px-2.5 py-1.5 text-xs font-medium text-white hover:bg-updraft-deep transition-colors"
                >
                  <Check size={12} />
                  Save
                </button>
              </div>
            </div>
          ) : outcome.monthlySummary ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {outcome.monthlySummary}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">
              {isCCRO ? "No summary yet — click Edit to add one" : "No summary available for this period"}
            </p>
          )}
        </div>
      </div>

      {/* Detailed Description */}
      {outcome.detailedDescription && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-updraft-bar" />
            <h4 className="text-sm font-semibold text-gray-700">Outcome Description</h4>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed pl-6 whitespace-pre-line">
            {outcome.detailedDescription}
          </p>
        </div>
      )}

      {/* Measures Summary */}
      {outcome.measures && outcome.measures.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Associated Measures ({outcome.measures.length})
          </h4>
          <div className="space-y-2">
            {outcome.measures.map((measure) => (
              <div
                key={measure.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm"
              >
                <div>
                  <span className="font-medium text-gray-700">{measure.measureId}</span>
                  <span className="text-gray-500 ml-2">{measure.name}</span>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    measure.ragStatus === "GOOD" && "bg-risk-green/10 text-risk-green",
                    measure.ragStatus === "WARNING" && "bg-risk-amber/10 text-risk-amber",
                    measure.ragStatus === "HARM" && "bg-risk-red/10 text-risk-red"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", ragBgColor(measure.ragStatus))} />
                  {ragLabelShort(measure.ragStatus)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder message if no additional details */}
      {!outcome.detailedDescription && !outcome.monthlySummary && (!outcome.measures || outcome.measures.length === 0) && (
        <div className="text-center py-8">
          <Shield size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No additional outcome details available</p>
          <p className="text-xs text-gray-400 mt-1">
            CCRO team can add a detailed description and measures
          </p>
        </div>
      )}
    </Modal>
  );
}
