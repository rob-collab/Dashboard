"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  FileText,
  Calendar,
  User,
  Mail,
} from "lucide-react";
import Modal from "@/components/common/Modal";
import type { Report, Section, ConsumerDutyOutcome, ReportVersion } from "@/lib/types";
import { cn, formatDate, formatDateShort } from "@/lib/utils";
import { getLastPublishDate, getStaleMeasures } from "@/lib/stale-utils";

interface PublishDialogProps {
  report: Report;
  sections: Section[];
  outcomes: ConsumerDutyOutcome[];
  versions?: ReportVersion[];
  open: boolean;
  onClose: () => void;
  onPublish: (publishNote: string) => void;
}

interface ValidationCheck {
  label: string;
  passed: boolean;
  description: string;
}

/** Minimal placeholder-text detector */
function containsPlaceholder(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("[placeholder") ||
    lower.includes("lorem ipsum") ||
    lower.includes("tbd") ||
    lower.includes("[insert") ||
    lower.includes("xxx")
  );
}

/** Very basic broken-link detector (markdown-style) */
function hasBrokenLink(text: string): boolean {
  const linkPattern = /\[([^\]]*)\]\(([^)]*)\)/g;
  let match;
  while ((match = linkPattern.exec(text)) !== null) {
    const href = match[2];
    if (!href || href === "#" || href.startsWith("{{")) return true;
  }
  return false;
}

function runValidation(
  sections: Section[],
  outcomes: ConsumerDutyOutcome[]
): ValidationCheck[] {
  // 1. All required sections present (at least one TEXT_BLOCK — Consumer Duty is now always included)
  const hasText = sections.some((s) => s.type === "TEXT_BLOCK");
  const requiredSections = hasText;

  // 2. No placeholder text in any section content
  const allContentStr = sections
    .map((s) => JSON.stringify(s.content))
    .join(" ");
  const noPlaceholders = !containsPlaceholder(allContentStr);

  // 3. All Consumer Duty measures have a RAG status
  const allMeasuresHaveRAG = outcomes.every((o) => {
    if (!o.measures || o.measures.length === 0) return true;
    return o.measures.every(
      (m) => m.ragStatus === "GOOD" || m.ragStatus === "WARNING" || m.ragStatus === "HARM"
    );
  });

  // 4. No broken links
  const noBrokenLinks = !hasBrokenLink(allContentStr);

  return [
    {
      label: "All required sections present",
      passed: requiredSections,
      description: requiredSections
        ? "Required section types found (Consumer Duty is always included)"
        : "Missing required section type (TEXT_BLOCK)",
    },
    {
      label: "No placeholder text detected",
      passed: noPlaceholders,
      description: noPlaceholders
        ? "All section content appears complete"
        : "Placeholder text found in one or more sections",
    },
    {
      label: "All CD measures have RAG status",
      passed: allMeasuresHaveRAG,
      description: allMeasuresHaveRAG
        ? "Every measure has a valid RAG rating assigned"
        : "One or more measures are missing a RAG status",
    },
    {
      label: "No broken links",
      passed: noBrokenLinks,
      description: noBrokenLinks
        ? "All detected links appear valid"
        : "One or more links are incomplete or broken",
    },
  ];
}

export default function PublishDialog({
  report,
  sections,
  outcomes,
  versions = [],
  open,
  onClose,
  onPublish,
}: PublishDialogProps) {
  const [publishNote, setPublishNote] = useState("");
  const [notifyExCo, setNotifyExCo] = useState(false);
  const [notifyMetricOwners, setNotifyMetricOwners] = useState(false);

  const lastPublishDate = useMemo(
    () => getLastPublishDate(versions, report.id),
    [versions, report.id]
  );

  const staleMeasures = useMemo(
    () => getStaleMeasures(outcomes, lastPublishDate),
    [outcomes, lastPublishDate]
  );

  const checks = useMemo(
    () => runValidation(sections, outcomes),
    [sections, outcomes]
  );

  const warningCount = checks.filter((c) => !c.passed).length;

  function handlePublish() {
    onPublish(publishNote.trim());
    setPublishNote("");
    setNotifyExCo(false);
    setNotifyMetricOwners(false);
  }

  const footer = (
    <>
      <button
        onClick={onClose}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        onClick={handlePublish}
        className="inline-flex items-center gap-2 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-updraft-dark-purple"
      >
        <Send size={15} />
        Publish Report
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish Report"
      size="lg"
      footer={footer}
      preventBackdropClose
    >
      {/* Report info summary */}
      <div className="mb-5 rounded-xl border border-updraft-pale-purple/40 bg-updraft-pale-purple/10 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <FileText size={16} className="mt-0.5 shrink-0 text-updraft-bar" />
            <div>
              <p className="text-xs font-medium text-gray-500">Report</p>
              <p className="text-sm font-semibold text-gray-900">
                {report.title}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar size={16} className="mt-0.5 shrink-0 text-updraft-bar" />
            <div>
              <p className="text-xs font-medium text-gray-500">Period</p>
              <p className="text-sm font-semibold text-gray-900">
                {report.period}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User size={16} className="mt-0.5 shrink-0 text-updraft-bar" />
            <div>
              <p className="text-xs font-medium text-gray-500">Published by</p>
              <p className="text-sm font-semibold text-gray-900">
                {report.creator?.name ?? report.createdBy}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar size={16} className="mt-0.5 shrink-0 text-updraft-bar" />
            <div>
              <p className="text-xs font-medium text-gray-500">Date / Time</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stale data warning */}
      {staleMeasures.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50/60 p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {staleMeasures.length} measure{staleMeasures.length > 1 ? "s" : ""} not updated since last publish
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                The following measures have not been refreshed since the report was last published. You can still publish, but these will be flagged as stale.
              </p>
            </div>
          </div>
          <ul className="ml-7 space-y-1 mt-2">
            {staleMeasures.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-xs text-red-700">
                <span className="font-semibold">{m.measureId} {m.name}</span>
                <span className="text-red-500">
                  {m.lastUpdatedAt ? `Last updated ${formatDateShort(m.lastUpdatedAt)}` : "Never updated"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pre-publish validation checklist */}
      <div className="mb-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 font-poppins">
          Pre-publish validation
        </h3>
        <div className="space-y-2">
          {checks.map((check, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                check.passed
                  ? "border-green-200 bg-green-50/60"
                  : "border-amber-200 bg-amber-50/60"
              )}
            >
              {check.passed ? (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-green-600"
                />
              ) : (
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-500"
                />
              )}
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    check.passed ? "text-green-800" : "text-amber-800"
                  )}
                >
                  {check.label}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    check.passed ? "text-green-600" : "text-amber-600"
                  )}
                >
                  {check.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {warningCount > 0 && (
          <p className="mt-2 text-xs text-amber-600">
            {warningCount} validation warning{warningCount > 1 ? "s" : ""} found
            &mdash; please resolve before publishing.
          </p>
        )}
      </div>

      {/* Publish note */}
      <div className="mb-5">
        <label
          htmlFor="publish-note"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Publish note{" "}
          <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="publish-note"
          rows={3}
          value={publishNote}
          onChange={(e) => setPublishNote(e.target.value)}
          placeholder="Add a note about this version, e.g. key changes..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-updraft-bar focus:outline-none focus:ring-2 focus:ring-updraft-pale-purple/40 transition-colors"
        />
      </div>

      {/* Notification checkboxes */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900 font-poppins">
          Notifications{" "}
          <span className="font-normal text-gray-400">(optional)</span>
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyExCo}
              onChange={(e) => setNotifyExCo(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bar"
            />
            <Mail size={14} className="text-gray-400" />
            Email ExCo board members
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyMetricOwners}
              onChange={(e) => setNotifyMetricOwners(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bar"
            />
            <Mail size={14} className="text-gray-400" />
            Notify metric owners
          </label>
        </div>
      </div>
    </Modal>
  );
}
