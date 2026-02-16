"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  Plus,
  Minus,
  ArrowRight,
  RefreshCcw,
  LayoutDashboard,
} from "lucide-react";
import type { ReportVersion } from "@/lib/types";
import type { RAGStatus } from "@/lib/types";
import { cn, ragLabelShort } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types for internal diff results                                           */
/* -------------------------------------------------------------------------- */

interface SnapshotSection {
  id: string;
  title: string | null;
  type: string;
  content: Record<string, unknown>;
  position: number;
}

interface SnapshotOutcome {
  id: string;
  name: string;
  ragStatus: RAGStatus;
  measures?: SnapshotMeasure[];
}

interface SnapshotMeasure {
  id: string;
  name: string;
  ragStatus: RAGStatus;
}

interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface SectionDiff {
  id: string;
  title: string;
  kind: "added" | "removed" | "modified";
  changes: FieldChange[];
}

interface RAGChange {
  entity: string;
  oldRAG: RAGStatus;
  newRAG: RAGStatus;
}

interface DiffResult {
  sectionDiffs: SectionDiff[];
  ragChanges: RAGChange[];
  summary: {
    sectionsAdded: number;
    sectionsRemoved: number;
    sectionsModified: number;
    measuresUpdated: number;
    ragChanges: number;
  };
}

/* -------------------------------------------------------------------------- */
/*  Diff helpers                                                              */
/* -------------------------------------------------------------------------- */

function extractSections(snap: Record<string, unknown>): SnapshotSection[] {
  if (Array.isArray(snap.sections)) return snap.sections as SnapshotSection[];
  return [];
}

function extractOutcomes(snap: Record<string, unknown>): SnapshotOutcome[] {
  if (Array.isArray(snap.outcomes)) return snap.outcomes as SnapshotOutcome[];
  return [];
}

function stringify(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  return JSON.stringify(val);
}

function diffFields(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): FieldChange[] {
  const allKeys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  const changes: FieldChange[] = [];
  for (const key of allKeys) {
    const aVal = stringify(a[key]);
    const bVal = stringify(b[key]);
    if (aVal !== bVal) {
      changes.push({ field: key, oldValue: aVal, newValue: bVal });
    }
  }
  return changes;
}

function computeDiff(
  leftSnap: Record<string, unknown>,
  rightSnap: Record<string, unknown>
): DiffResult {
  const leftSections = extractSections(leftSnap);
  const rightSections = extractSections(rightSnap);

  const leftMap = new Map(leftSections.map((s) => [s.id, s]));
  const rightMap = new Map(rightSections.map((s) => [s.id, s]));

  const sectionDiffs: SectionDiff[] = [];

  // Added sections (in right but not left)
  Array.from(rightMap.entries()).forEach(([id, sec]) => {
    if (!leftMap.has(id)) {
      sectionDiffs.push({
        id,
        title: sec.title || sec.type,
        kind: "added",
        changes: [],
      });
    }
  });

  // Removed sections (in left but not right)
  Array.from(leftMap.entries()).forEach(([id, sec]) => {
    if (!rightMap.has(id)) {
      sectionDiffs.push({
        id,
        title: sec.title || sec.type,
        kind: "removed",
        changes: [],
      });
    }
  });

  // Modified sections (in both)
  for (const [id, leftSec] of Array.from(leftMap.entries())) {
    const rightSec = rightMap.get(id);
    if (!rightSec) continue;
    const contentChanges = diffFields(
      leftSec.content as Record<string, unknown>,
      rightSec.content as Record<string, unknown>
    );
    const metaChanges: FieldChange[] = [];
    if (leftSec.title !== rightSec.title) {
      metaChanges.push({
        field: "title",
        oldValue: leftSec.title || "",
        newValue: rightSec.title || "",
      });
    }
    if (leftSec.position !== rightSec.position) {
      metaChanges.push({
        field: "position",
        oldValue: String(leftSec.position),
        newValue: String(rightSec.position),
      });
    }
    const allChanges = [...metaChanges, ...contentChanges];
    if (allChanges.length > 0) {
      sectionDiffs.push({
        id,
        title: rightSec.title || rightSec.type,
        kind: "modified",
        changes: allChanges,
      });
    }
  }

  // RAG changes in Consumer Duty
  const leftOutcomes = extractOutcomes(leftSnap);
  const rightOutcomes = extractOutcomes(rightSnap);
  const leftOutcomeMap = new Map(leftOutcomes.map((o) => [o.id, o]));
  const rightOutcomeMap = new Map(rightOutcomes.map((o) => [o.id, o]));

  const ragChanges: RAGChange[] = [];
  let measuresUpdated = 0;

  for (const [id, rightO] of Array.from(rightOutcomeMap.entries())) {
    const leftO = leftOutcomeMap.get(id);
    if (leftO && leftO.ragStatus !== rightO.ragStatus) {
      ragChanges.push({
        entity: rightO.name,
        oldRAG: leftO.ragStatus,
        newRAG: rightO.ragStatus,
      });
    }

    // Compare measures
    const leftMeasures = new Map(
      (leftO?.measures ?? []).map((m) => [m.id, m])
    );
    for (const rm of rightO.measures ?? []) {
      const lm = leftMeasures.get(rm.id);
      if (lm) {
        if (lm.ragStatus !== rm.ragStatus) {
          ragChanges.push({
            entity: rm.name,
            oldRAG: lm.ragStatus,
            newRAG: rm.ragStatus,
          });
        }
        if (lm.name !== rm.name || lm.ragStatus !== rm.ragStatus) {
          measuresUpdated++;
        }
      } else {
        measuresUpdated++;
      }
    }
  }

  return {
    sectionDiffs,
    ragChanges,
    summary: {
      sectionsAdded: sectionDiffs.filter((d) => d.kind === "added").length,
      sectionsRemoved: sectionDiffs.filter((d) => d.kind === "removed").length,
      sectionsModified: sectionDiffs.filter((d) => d.kind === "modified").length,
      measuresUpdated,
      ragChanges: ragChanges.length,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  RAG badge                                                                 */
/* -------------------------------------------------------------------------- */

function RAGBadge({ status }: { status: RAGStatus }) {
  const styles: Record<RAGStatus, string> = {
    GOOD: "bg-green-100 text-green-700",
    WARNING: "bg-amber-100 text-amber-700",
    HARM: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        styles[status]
      )}
    >
      {ragLabelShort(status)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  VersionCompare component                                                  */
/* -------------------------------------------------------------------------- */

interface VersionCompareProps {
  versions: ReportVersion[];
  reportId: string;
}

export default function VersionCompare({
  versions,
}: VersionCompareProps) {
  const sorted = useMemo(
    () => [...versions].sort((a, b) => b.version - a.version),
    [versions]
  );

  const [leftId, setLeftId] = useState<string>(sorted[1]?.id ?? "");
  const [rightId, setRightId] = useState<string>(sorted[0]?.id ?? "");

  const leftVersion = sorted.find((v) => v.id === leftId);
  const rightVersion = sorted.find((v) => v.id === rightId);

  const diff = useMemo<DiffResult | null>(() => {
    if (!leftVersion || !rightVersion) return null;
    return computeDiff(
      leftVersion.snapshotData,
      rightVersion.snapshotData
    );
  }, [leftVersion, rightVersion]);

  function swapVersions() {
    setLeftId(rightId);
    setRightId(leftId);
  }

  const kindStyle: Record<string, string> = {
    added: "border-green-200 bg-green-50/60",
    removed: "border-red-200 bg-red-50/60",
    modified: "border-amber-200 bg-amber-50/60",
  };

  const kindIcon: Record<string, React.ReactNode> = {
    added: <Plus size={15} className="text-green-600" />,
    removed: <Minus size={15} className="text-red-600" />,
    modified: <RefreshCcw size={15} className="text-amber-600" />,
  };

  const kindLabel: Record<string, string> = {
    added: "Added",
    removed: "Removed",
    modified: "Modified",
  };

  return (
    <div>
      {/* Version selectors */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Base version (left)
          </label>
          <div className="relative">
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-700 focus:border-updraft-bar focus:outline-none focus:ring-2 focus:ring-updraft-pale-purple/40 transition-colors"
            >
              <option value="" disabled>
                Select version
              </option>
              {sorted.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.version}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        <button
          onClick={swapVersions}
          title="Swap versions"
          className="mt-5 rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <RefreshCcw size={16} />
        </button>

        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Compare version (right)
          </label>
          <div className="relative">
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-700 focus:border-updraft-bar focus:outline-none focus:ring-2 focus:ring-updraft-pale-purple/40 transition-colors"
            >
              <option value="" disabled>
                Select version
              </option>
              {sorted.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.version}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Diff output */}
      {!diff ? (
        <p className="py-12 text-center text-sm text-gray-400">
          Select two versions to compare.
        </p>
      ) : diff.sectionDiffs.length === 0 && diff.ragChanges.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">
          No differences found between these versions.
        </p>
      ) : (
        <>
          {/* Section diffs */}
          {diff.sectionDiffs.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 font-poppins text-sm font-semibold text-gray-900">
                <LayoutDashboard size={16} className="text-updraft-bar" />
                Section Changes
              </h3>
              <div className="space-y-3">
                {diff.sectionDiffs.map((sd) => (
                  <div
                    key={sd.id}
                    className={cn(
                      "rounded-xl border p-4",
                      kindStyle[sd.kind]
                    )}
                  >
                    {/* Section header */}
                    <div className="mb-2 flex items-center gap-2">
                      {kindIcon[sd.kind]}
                      <span className="text-sm font-semibold text-gray-900">
                        {sd.title}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          sd.kind === "added" &&
                            "bg-green-200/70 text-green-800",
                          sd.kind === "removed" &&
                            "bg-red-200/70 text-red-800",
                          sd.kind === "modified" &&
                            "bg-amber-200/70 text-amber-800"
                        )}
                      >
                        {kindLabel[sd.kind]}
                      </span>
                    </div>

                    {/* Field-level changes for modified sections */}
                    {sd.kind === "modified" && sd.changes.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {sd.changes.map((c, ci) => (
                          <div
                            key={ci}
                            className="flex items-start gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs"
                          >
                            <span className="shrink-0 font-mono font-semibold text-gray-500">
                              {c.field}
                            </span>
                            <span className="truncate text-red-600 line-through">
                              {c.oldValue || "(empty)"}
                            </span>
                            <ArrowRight
                              size={12}
                              className="mt-0.5 shrink-0 text-gray-400"
                            />
                            <span className="truncate text-green-700 font-medium">
                              {c.newValue || "(empty)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RAG changes */}
          {diff.ragChanges.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 font-poppins text-sm font-semibold text-gray-900">
                <LayoutDashboard size={16} className="text-updraft-bar" />
                Consumer Duty RAG Changes
              </h3>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-2">Measure / Outcome</th>
                      <th className="px-4 py-2">Previous</th>
                      <th className="px-4 py-2" />
                      <th className="px-4 py-2">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.ragChanges.map((rc, i) => (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-gray-50 last:border-0",
                          i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        )}
                      >
                        <td className="px-4 py-2 font-medium text-gray-800">
                          {rc.entity}
                        </td>
                        <td className="px-4 py-2">
                          <RAGBadge status={rc.oldRAG} />
                        </td>
                        <td className="px-2 py-2">
                          <ArrowRight
                            size={14}
                            className="text-gray-400"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <RAGBadge status={rc.newRAG} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-xl border border-updraft-pale-purple/40 bg-updraft-pale-purple/10 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Change Summary
            </h4>
            <div className="flex flex-wrap gap-4 text-sm">
              {diff.summary.sectionsAdded > 0 && (
                <span className="flex items-center gap-1.5 text-green-700">
                  <Plus size={14} />
                  {diff.summary.sectionsAdded} section
                  {diff.summary.sectionsAdded !== 1 ? "s" : ""} added
                </span>
              )}
              {diff.summary.sectionsRemoved > 0 && (
                <span className="flex items-center gap-1.5 text-red-600">
                  <Minus size={14} />
                  {diff.summary.sectionsRemoved} section
                  {diff.summary.sectionsRemoved !== 1 ? "s" : ""} removed
                </span>
              )}
              {diff.summary.sectionsModified > 0 && (
                <span className="flex items-center gap-1.5 text-amber-600">
                  <RefreshCcw size={14} />
                  {diff.summary.sectionsModified} section
                  {diff.summary.sectionsModified !== 1 ? "s" : ""} modified
                </span>
              )}
              {diff.summary.measuresUpdated > 0 && (
                <span className="flex items-center gap-1.5 text-updraft-bar">
                  <LayoutDashboard size={14} />
                  {diff.summary.measuresUpdated} measure
                  {diff.summary.measuresUpdated !== 1 ? "s" : ""} updated
                </span>
              )}
              {diff.summary.ragChanges > 0 && (
                <span className="flex items-center gap-1.5 text-updraft-bright-purple">
                  <RefreshCcw size={14} />
                  {diff.summary.ragChanges} RAG change
                  {diff.summary.ragChanges !== 1 ? "s" : ""}
                </span>
              )}
              {diff.summary.sectionsAdded === 0 &&
                diff.summary.sectionsRemoved === 0 &&
                diff.summary.sectionsModified === 0 &&
                diff.summary.measuresUpdated === 0 &&
                diff.summary.ragChanges === 0 && (
                  <span className="text-gray-400">No changes</span>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
