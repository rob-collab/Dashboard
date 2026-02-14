"use client";

import { useState, useMemo } from "react";
import { ShieldCheck, Search, Filter } from "lucide-react";
import { demoOutcomes } from "@/lib/demo-data";
import OutcomeCard from "@/components/consumer-duty/OutcomeCard";
import MeasurePanel from "@/components/consumer-duty/MeasurePanel";
import MIModal from "@/components/consumer-duty/MIModal";
import { cn, ragBgColor, ragLabel } from "@/lib/utils";
import type { ConsumerDutyMeasure, RAGStatus } from "@/lib/types";

const RAG_FILTERS: { value: RAGStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "GOOD", label: "Good" },
  { value: "WARNING", label: "Warning" },
  { value: "HARM", label: "Harm" },
];

export default function ConsumerDutyPage() {
  const outcomes = demoOutcomes;
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<ConsumerDutyMeasure | null>(null);
  const [ragFilter, setRagFilter] = useState<RAGStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedOutcome = outcomes.find((o) => o.id === selectedOutcomeId);

  const filteredOutcomes = useMemo(() => {
    let filtered = outcomes;
    if (ragFilter !== "ALL") {
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
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Total Outcomes</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">{outcomes.length}</p>
          <p className="text-xs text-fca-gray mt-1">{totalMeasures} measures tracked</p>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", ragBgColor("GOOD"))} />
            <p className="text-xs text-fca-gray">Good</p>
          </div>
          <p className="text-2xl font-bold text-risk-green mt-1">{goodCount}</p>
          <p className="text-xs text-fca-gray mt-1">outcomes on track</p>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", ragBgColor("WARNING"))} />
            <p className="text-xs text-fca-gray">Warning</p>
          </div>
          <p className="text-2xl font-bold text-risk-amber mt-1">{warningCount}</p>
          <p className="text-xs text-fca-gray mt-1">need attention</p>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", ragBgColor("HARM"))} />
            <p className="text-xs text-fca-gray">Harm</p>
          </div>
          <p className="text-2xl font-bold text-risk-red mt-1">{harmCount}</p>
          <p className="text-xs text-fca-gray mt-1">require action</p>
        </div>
      </div>

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
              onClick={() => setRagFilter(f.value)}
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
          <OutcomeCard
            key={outcome.id}
            outcome={outcome}
            selected={outcome.id === selectedOutcomeId}
            onClick={() =>
              setSelectedOutcomeId(outcome.id === selectedOutcomeId ? null : outcome.id)
            }
          />
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
              </tr>
            </thead>
            <tbody>
              {outcomes.flatMap((outcome) =>
                (outcome.measures ?? []).map((measure) => (
                  <tr
                    key={measure.id}
                    className="hover:bg-gray-50/50 cursor-pointer"
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
                        {ragLabel(measure.ragStatus)}
                      </span>
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-gray-500">{measure.metrics?.length ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MI Modal */}
      <MIModal
        measure={selectedMeasure}
        open={!!selectedMeasure}
        onClose={() => setSelectedMeasure(null)}
        editable={false}
      />
    </div>
  );
}
