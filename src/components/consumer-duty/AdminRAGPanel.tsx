"use client";

import { useState, useCallback, Fragment } from "react";
import type { ConsumerDutyOutcome, RAGStatus } from "@/lib/types";
import { cn, ragBgColor, ragLabelShort } from "@/lib/utils";
import { Check } from "lucide-react";

interface AdminRAGPanelProps {
  outcomes: ConsumerDutyOutcome[];
  onUpdateOutcomeRAG: (id: string, ragStatus: RAGStatus) => void;
  onUpdateMeasureRAG: (id: string, ragStatus: RAGStatus) => void;
}

const RAG_OPTIONS: RAGStatus[] = ["GOOD", "WARNING", "HARM"];
const RAG_STYLES: Record<RAGStatus, { base: string; active: string }> = {
  GOOD: {
    base: "border-risk-green/40 text-risk-green hover:bg-risk-green/10",
    active: "!bg-risk-green !text-white ring-2 ring-risk-green/30",
  },
  WARNING: {
    base: "border-risk-amber/40 text-risk-amber hover:bg-risk-amber/10",
    active: "!bg-risk-amber !text-white ring-2 ring-risk-amber/30",
  },
  HARM: {
    base: "border-risk-red/40 text-risk-red hover:bg-risk-red/10",
    active: "!bg-risk-red !text-white ring-2 ring-risk-red/30",
  },
};

export default function AdminRAGPanel({
  outcomes,
  onUpdateOutcomeRAG,
  onUpdateMeasureRAG,
}: AdminRAGPanelProps) {
  const [savedId, setSavedId] = useState<string | null>(null);

  const showSaved = useCallback((id: string) => {
    setSavedId(id);
    setTimeout(() => setSavedId(null), 1500);
  }, []);

  return (
    <div className="bento-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-24">
                Level
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Name
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 w-28">
                Current
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 w-44">
                Change To
              </th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((outcome) => (
              <Fragment key={outcome.id}>
                {/* Outcome row */}
                <tr
                  className="border-b border-gray-100 bg-updraft-pale-purple/5"
                >
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-updraft-pale-purple/40 px-2 py-0.5 text-[10px] font-bold text-updraft-bar uppercase tracking-wider">
                      Outcome
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {outcome.outcomeId} — {outcome.name}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          outcome.ragStatus === "GOOD" &&
                            "bg-risk-green/15 text-risk-green",
                          outcome.ragStatus === "WARNING" &&
                            "bg-risk-amber/10 text-risk-amber",
                          outcome.ragStatus === "HARM" &&
                            "bg-risk-red/10 text-risk-red"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            ragBgColor(outcome.ragStatus)
                          )}
                        />
                        {ragLabelShort(outcome.ragStatus)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      {RAG_OPTIONS.map((rag) => {
                        const isActive = outcome.ragStatus === rag;
                        return (
                          <button
                            key={rag}
                            type="button"
                            onClick={() => {
                              if (!isActive) {
                                onUpdateOutcomeRAG(outcome.id, rag);
                                showSaved(outcome.id);
                              }
                            }}
                            className={cn(
                              "rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all duration-150",
                              RAG_STYLES[rag].base,
                              isActive && RAG_STYLES[rag].active
                            )}
                          >
                            {ragLabelShort(rag).charAt(0)}
                          </button>
                        );
                      })}
                      {savedId === outcome.id && (
                        <Check size={14} className="text-risk-green animate-in fade-in" />
                      )}
                    </div>
                  </td>
                </tr>

                {/* Measure rows */}
                {(outcome.measures ?? []).map((measure) => (
                  <tr
                    key={measure.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-2 pl-8">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                        Measure
                      </span>
                    </td>
                    <td className="px-4 py-2 pl-8 text-gray-600">
                      <span className="font-medium text-gray-500 mr-1.5">
                        {measure.measureId}
                      </span>
                      {measure.name}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            measure.ragStatus === "GOOD" &&
                              "bg-risk-green/15 text-risk-green",
                            measure.ragStatus === "WARNING" &&
                              "bg-risk-amber/10 text-risk-amber",
                            measure.ragStatus === "HARM" &&
                              "bg-risk-red/10 text-risk-red"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              ragBgColor(measure.ragStatus)
                            )}
                          />
                          {ragLabelShort(measure.ragStatus)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-1">
                        {RAG_OPTIONS.map((rag) => {
                          const isActive = measure.ragStatus === rag;
                          return (
                            <button
                              key={rag}
                              type="button"
                              onClick={() => {
                                if (!isActive) {
                                  onUpdateMeasureRAG(measure.id, rag);
                                  showSaved(measure.id);
                                }
                              }}
                              className={cn(
                                "rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all duration-150",
                                RAG_STYLES[rag].base,
                                isActive && RAG_STYLES[rag].active
                              )}
                            >
                              {ragLabelShort(rag).charAt(0)}
                            </button>
                          );
                        })}
                        {savedId === measure.id && (
                          <Check size={14} className="text-risk-green animate-in fade-in" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
