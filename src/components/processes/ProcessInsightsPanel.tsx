"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { cn } from "@/lib/utils";
import {
  MATURITY_LABELS,
  MATURITY_COLOURS,
  PROCESS_CATEGORY_LABELS,
  type ProcessCategory,
} from "@/lib/types";

interface IBSCoverageRow {
  id: string;
  reference: string;
  name: string;
  smfAccountable: string | null;
  maxTolerableDisruptionHours: number | null;
  processCount: number;
  governedCount: number;
  criticalCount: number;
  lowMaturityCriticalCount: number;
  readiness: "GREEN" | "AMBER" | "RED" | "NONE";
}

interface GapProcess {
  id: string;
  reference: string;
  name: string;
  maturityScore: number;
  criticality?: string;
}

interface InsightsData {
  totalProcesses: number;
  maturityDistribution: Record<number, number>;
  ibsCoverage: IBSCoverageRow[];
  gaps: {
    noControls: GapProcess[];
    noPolicies: GapProcess[];
    noRegulations: GapProcess[];
  };
  ownerGaps: {
    noOwner: Array<{ id: string; reference: string; name: string; maturityScore: number }>;
    noSmf: Array<{ id: string; reference: string; name: string; maturityScore: number }>;
  };
  heatmap: Record<string, Record<number, number>>;
  criticalLowMaturity: Array<{ id: string; reference: string; name: string; maturityScore: number }>;
}

interface Props {
  data: InsightsData;
  onProcessClick: (id: string) => void;
}

function readinessDot(r: IBSCoverageRow["readiness"]) {
  switch (r) {
    case "GREEN": return "bg-green-500";
    case "AMBER": return "bg-amber-500";
    case "RED": return "bg-red-500";
    default: return "bg-gray-300";
  }
}

function readinessLabel(r: IBSCoverageRow["readiness"]) {
  switch (r) {
    case "GREEN": return "Ready";
    case "AMBER": return "At Risk";
    case "RED": return "Not Ready";
    default: return "None";
  }
}

function heatmapCellClass(count: number): string {
  if (count === 0) return "bg-gray-50 text-gray-300";
  if (count === 1) return "bg-blue-50 text-blue-600";
  if (count === 2) return "bg-blue-100 text-blue-700";
  return "bg-blue-200 text-blue-800";
}

const SECTION_HEADER = "text-xs font-semibold text-gray-500 uppercase tracking-wider";

export default function ProcessInsightsPanel({ data, onProcessClick }: Props) {
  const [showMoreControls, setShowMoreControls] = useState(false);
  const [showMorePolicies, setShowMorePolicies] = useState(false);
  const [showMoreRegulations, setShowMoreRegulations] = useState(false);

  const maturityLevels = [1, 2, 3, 4, 5];

  // Stacked bar total
  const matTotal = maturityLevels.reduce((acc, l) => acc + (data.maturityDistribution[l] ?? 0), 0) || 1;

  const CATEGORIES = Object.keys(PROCESS_CATEGORY_LABELS) as ProcessCategory[];

  return (
    <div className="space-y-6">
      {/* Critical Low Maturity Banner */}
      {data.criticalLowMaturity.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">
              {data.criticalLowMaturity.length} critical process{data.criticalLowMaturity.length !== 1 ? "es are" : " is"} at low maturity (L1 or L2) — review urgently.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {data.criticalLowMaturity.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onProcessClick(p.id)}
                  className="font-mono text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 px-2 py-0.5 rounded transition-colors"
                >
                  {p.reference}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section 1 — Maturity Distribution */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <h3 className={SECTION_HEADER}>Maturity Distribution</h3>
        </div>
        <div className="p-4 space-y-3">
          {/* Stacked bar */}
          <div className="flex rounded-full overflow-hidden h-6 w-full gap-0.5">
            {maturityLevels.map((level) => {
              const count = data.maturityDistribution[level] ?? 0;
              const pct = (count / matTotal) * 100;
              if (pct === 0) return null;
              const colours = MATURITY_COLOURS[level];
              return (
                <div
                  key={level}
                  className={cn("flex items-center justify-center text-[10px] font-bold transition-all", colours.bar, "text-white")}
                  style={{ width: `${pct}%`, minWidth: count > 0 ? "20px" : "0" }}
                  title={`L${level} ${MATURITY_LABELS[level]}: ${count}`}
                >
                  {pct >= 8 ? `${Math.round(pct)}%` : ""}
                </div>
              );
            })}
          </div>

          {/* Level breakdown */}
          <div className="grid grid-cols-5 gap-2">
            {maturityLevels.map((level) => {
              const count = data.maturityDistribution[level] ?? 0;
              const colours = MATURITY_COLOURS[level];
              return (
                <div key={level} className={cn("rounded-lg p-2 text-center", colours.bg)}>
                  <p className={cn("text-lg font-bold font-poppins", colours.text)}>{count}</p>
                  <p className={cn("text-[10px] font-semibold", colours.text)}>L{level}</p>
                  <p className={cn("text-[9px] mt-0.5", colours.text, "opacity-80")}>{MATURITY_LABELS[level]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 2 — IBS Coverage */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <h3 className={SECTION_HEADER}>IBS Coverage</h3>
        </div>
        {data.ibsCoverage.length === 0 ? (
          <p className="text-xs text-gray-400 italic p-4">No IBS records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-xs">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">IBS Name</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">MTD (h)</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Processes</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Governed (≥L3)</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {data.ibsCoverage.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-updraft-deep text-[10px]">{row.reference}</span>
                        <span className="text-gray-700 font-medium">{row.name}</span>
                      </div>
                      {row.smfAccountable && (
                        <p className="text-[10px] text-gray-400 mt-0.5">SMF: {row.smfAccountable}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600 font-medium">
                      {row.maxTolerableDisruptionHours != null ? `${row.maxTolerableDisruptionHours}h` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn(
                        "inline-flex items-center justify-center rounded-full text-[10px] font-bold px-2 py-0.5 min-w-[24px]",
                        row.processCount > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400",
                      )}>
                        {row.processCount}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn(
                        "inline-flex items-center justify-center rounded-full text-[10px] font-bold px-2 py-0.5 min-w-[24px]",
                        row.governedCount > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400",
                      )}>
                        {row.governedCount}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", readinessDot(row.readiness))} />
                        <span className="text-gray-600">{readinessLabel(row.readiness)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 3 — Coverage Gaps */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <h3 className={SECTION_HEADER}>Coverage Gaps</h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* No Controls */}
          <GapCard
            title="No Controls"
            borderColour="border-red-200"
            bgColour="bg-red-50"
            badgeBg="bg-red-100"
            badgeText="text-red-700"
            items={data.gaps.noControls}
            expanded={showMoreControls}
            onToggle={() => setShowMoreControls((v) => !v)}
            onProcessClick={onProcessClick}
          />
          {/* No Policies */}
          <GapCard
            title="No Policies"
            borderColour="border-amber-200"
            bgColour="bg-amber-50"
            badgeBg="bg-amber-100"
            badgeText="text-amber-700"
            items={data.gaps.noPolicies}
            expanded={showMorePolicies}
            onToggle={() => setShowMorePolicies((v) => !v)}
            onProcessClick={onProcessClick}
          />
          {/* No Regulations */}
          <GapCard
            title="No Regulations"
            borderColour="border-blue-200"
            bgColour="bg-blue-50"
            badgeBg="bg-blue-100"
            badgeText="text-blue-700"
            items={data.gaps.noRegulations}
            expanded={showMoreRegulations}
            onToggle={() => setShowMoreRegulations((v) => !v)}
            onProcessClick={onProcessClick}
          />
        </div>
      </section>

      {/* Section 4 — Owner & SMF Gaps */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <h3 className={SECTION_HEADER}>Owner & SMF Gaps</h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* No Owner */}
          <OwnerGapCard
            title="Processes without Owner"
            count={data.ownerGaps.noOwner.length}
            items={data.ownerGaps.noOwner}
            countColour={data.ownerGaps.noOwner.length > 0 ? "text-red-600" : "text-green-600"}
            onProcessClick={onProcessClick}
          />
          {/* No SMF */}
          <OwnerGapCard
            title="Processes without SMF"
            count={data.ownerGaps.noSmf.length}
            items={data.ownerGaps.noSmf}
            countColour={data.ownerGaps.noSmf.length > 0 ? "text-amber-600" : "text-green-600"}
            onProcessClick={onProcessClick}
          />
        </div>
      </section>

      {/* Section 5 — Maturity × Category Heatmap */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <h3 className={SECTION_HEADER}>Maturity × Category Heatmap</h3>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-40">Category</th>
                {maturityLevels.map((l) => (
                  <th key={l} className="text-center px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    <span>L{l}</span>
                    <br />
                    <span className="font-normal normal-case text-gray-400">{MATURITY_LABELS[l]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {CATEGORIES.map((cat) => {
                const catData = data.heatmap[cat] ?? {};
                return (
                  <tr key={cat} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                      {PROCESS_CATEGORY_LABELS[cat]}
                    </td>
                    {maturityLevels.map((level) => {
                      const count = catData[level] ?? 0;
                      // Warning indicator for critical processes at L1 or L2
                      const isCriticalLow = (level === 1 || level === 2) && count > 0;
                      return (
                        <td key={level} className="px-2 py-1.5 text-center">
                          <div className={cn(
                            "rounded-lg w-10 h-8 flex items-center justify-center mx-auto font-bold relative",
                            heatmapCellClass(count),
                          )}>
                            {count > 0 ? count : <span className="text-[10px]">—</span>}
                            {isCriticalLow && count > 0 && (
                              <span
                                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"
                                title="Critical processes at low maturity"
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            Red dot indicates critical processes at L1 or L2 maturity
          </p>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

interface GapCardProps {
  title: string;
  borderColour: string;
  bgColour: string;
  badgeBg: string;
  badgeText: string;
  items: GapProcess[];
  expanded: boolean;
  onToggle: () => void;
  onProcessClick: (id: string) => void;
}

function GapCard({ title, borderColour, bgColour, badgeBg, badgeText, items, expanded, onToggle, onProcessClick }: GapCardProps) {
  const visible = expanded ? items : items.slice(0, 5);
  const overflow = items.length - 5;

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", borderColour, bgColour)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">{title}</p>
        <span className={cn("inline-flex items-center justify-center rounded-full text-[10px] font-bold px-2 py-0.5 min-w-[24px]", badgeBg, badgeText)}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic">None — all covered</p>
      ) : (
        <ul className="space-y-1">
          {visible.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onProcessClick(p.id)}
                className="w-full text-left flex items-center gap-1.5 group"
              >
                <span className="font-mono text-[10px] font-bold text-updraft-deep shrink-0 group-hover:underline">
                  {p.reference}
                </span>
                <span className="text-[11px] text-gray-600 truncate group-hover:text-updraft-deep transition-colors">
                  {p.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {overflow > 0 && (
        <button
          onClick={onToggle}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-updraft-deep transition-colors"
        >
          {expanded ? (
            <><ChevronUp size={11} /> Show less</>
          ) : (
            <><ChevronDown size={11} /> Show {overflow} more</>
          )}
        </button>
      )}
    </div>
  );
}

interface OwnerGapCardProps {
  title: string;
  count: number;
  items: Array<{ id: string; reference: string; name: string; maturityScore: number }>;
  countColour: string;
  onProcessClick: (id: string) => void;
}

function OwnerGapCard({ title, count, items, countColour, onProcessClick }: OwnerGapCardProps) {
  const visibleItems = items.slice(0, 5);
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-600">{title}</p>
      <p className={cn("text-3xl font-bold font-poppins", countColour)}><AnimatedNumber value={count} /></p>
      {count === 0 ? (
        <p className="text-[11px] text-green-600 font-medium">All covered</p>
      ) : (
        <ul className="space-y-1 mt-1">
          {visibleItems.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onProcessClick(p.id)}
                className="w-full text-left flex items-center gap-1.5 group"
              >
                <span className="font-mono text-[10px] font-bold text-updraft-deep shrink-0 group-hover:underline">
                  {p.reference}
                </span>
                <span className="text-[11px] text-gray-600 truncate group-hover:text-updraft-deep transition-colors">
                  {p.name}
                </span>
              </button>
            </li>
          ))}
          {count > 5 && (
            <li className="text-[10px] text-gray-400 italic pl-0.5">…and {count - 5} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
