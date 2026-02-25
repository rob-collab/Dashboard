"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Modal from "@/components/common/Modal";
import SearchableSelect from "@/components/common/SearchableSelect";
import type { Action, ActionStatus, ActionPriority, Report, User } from "@/lib/types";
import { generateId, cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useHasPermission } from "@/lib/usePermission";

const RichTextEditor = dynamic(() => import("@/components/common/RichTextEditor"), { ssr: false });

interface ActionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (action: Action) => void;
  action?: Action;
  reports: Report[];
  users: User[];
  currentUserId: string;
  prefillSource?: string;
  prefillSectionTitle?: string;
  prefillControlId?: string;
  prefillConsumerDutyMIId?: string;
  prefillMetricName?: string;
  prefillRiskId?: string;
}

const STATUS_OPTIONS: { value: ActionStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PROPOSED_CLOSED", label: "Proposed Closed" },
];

export default function ActionFormDialog({
  open,
  onClose,
  onSave,
  action,
  reports,
  users,
  currentUserId,
  prefillSource,
  prefillSectionTitle,
  prefillControlId,
  prefillConsumerDutyMIId,
  prefillMetricName,
  prefillRiskId,
}: ActionFormDialogProps) {
  const isEdit = Boolean(action);
  const priorityDefinitions = useAppStore((s) => s.priorityDefinitions);
  const canBypassApproval = useHasPermission("can:bypass-approval");

  // Build priority options from DB definitions, fallback to hardcoded
  const PRIORITY_OPTIONS: { value: ActionPriority; label: string }[] =
    priorityDefinitions.length > 0
      ? priorityDefinitions.map((d) => ({ value: d.code as ActionPriority, label: `${d.code} — ${d.label}` }))
      : [
          { value: "P1", label: "P1 — Critical" },
          { value: "P2", label: "P2 — Important" },
          { value: "P3", label: "P3 — Routine" },
        ];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [reportId, setReportId] = useState("");
  const [source, setSource] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<ActionStatus>("OPEN");
  const [priority, setPriority] = useState<ActionPriority | "">("P2");
  const [consumerDutyMIId, setConsumerDutyMIId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (open) {
      if (action) {
        setTitle(action.title);
        setDescription(action.description);
        setIssueDescription(action.issueDescription || "");
        setReportId(action.reportId || "");
        setSource(action.source || "");
        setSectionId(action.sectionId || "");
        setSectionTitle(action.sectionTitle || "");
        setAssignedTo(action.assignedTo);
        setDueDate(action.dueDate ? action.dueDate.split("T")[0] : "");
        setStatus(action.status);
        setPriority(action.priority ?? "P2");
      } else {
        setTitle("");
        setDescription("");
        setIssueDescription(prefillMetricName ? `<p>Linked to: ${prefillMetricName}</p>` : "");
        setReportId("");
        setSource(prefillSource || "");
        setSectionId("");
        setSectionTitle(prefillSectionTitle || prefillMetricName || "");
        setAssignedTo("");
        setDueDate("");
        setStatus("OPEN");
        setPriority("P2");
        setConsumerDutyMIId(prefillConsumerDutyMIId || null);
      }
      setErrors({});
      setSaveState("idle");
    }
  }, [open, action, reports, prefillSource, prefillSectionTitle, prefillConsumerDutyMIId, prefillMetricName, prefillRiskId]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!assignedTo) newErrors.assignedTo = "Owner is required";
    const cleanedDesc = description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!cleanedDesc) newErrors.description = "Description is required";
    if (!dueDate) newErrors.dueDate = "Due date is required";
    if (!priority) newErrors.priority = "Priority is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || saveState !== "idle") return;

    const selectedReport = reports.find((r) => r.id === reportId);

    // Strip empty rich text (just a <p></p> tag)
    const cleanDesc = description === "<p></p>" ? "" : description;
    const cleanIssue = issueDescription === "<p></p>" ? "" : issueDescription;

    const saved: Action = {
      id: action?.id ?? `action-${generateId()}`,
      reference: action?.reference ?? "",
      reportId: reportId || null,
      reportPeriod: selectedReport ? `${selectedReport.title} — ${selectedReport.period}` : null,
      source: source.trim() || null,
      sectionId: sectionId || null,
      sectionTitle: sectionTitle || null,
      controlId: action?.controlId ?? prefillControlId ?? null,
      consumerDutyMIId: action?.consumerDutyMIId ?? consumerDutyMIId,
      title: title.trim(),
      description: cleanDesc,
      issueDescription: cleanIssue || null,
      status,
      approvalStatus: action?.approvalStatus ?? "APPROVED",
      priority: priority || null,
      assignedTo,
      createdBy: action?.createdBy ?? currentUserId,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      completedAt: status === "COMPLETED" ? (action?.completedAt ?? new Date().toISOString()) : null,
      createdAt: action?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaveState("saving");
    onSave(saved);
    await new Promise((r) => setTimeout(r, 400));
    setSaveState("saved");
    await new Promise((r) => setTimeout(r, 500));
    onClose();
  }

  const inputClasses =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "text-xs text-red-500 mt-1";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Action" : "New Action"}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="action-form"
            disabled={saveState !== "idle"}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
              !isEdit && !canBypassApproval ? "bg-amber-600 hover:bg-amber-700" : "bg-updraft-bright-purple hover:bg-updraft-deep"
            }`}
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : isEdit ? "Save Changes" : !canBypassApproval ? "Submit for Approval" : "Create Action"}
          </button>
        </>
      }
    >
      <form id="action-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="action-title" className={labelClasses}>Title <span className="text-red-500 ml-0.5">*</span></label>
          <input
            id="action-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Review Q3 complaint trends"
            className={inputClasses}
          />
          {errors.title && <p className={errorClasses}>{errors.title}</p>}
        </div>

        {/* Issue to be Addressed */}
        <div>
          <label className={labelClasses}>Issue to be Addressed</label>
          <RichTextEditor
            value={issueDescription}
            onChange={setIssueDescription}
            placeholder="Describe the issue this action is addressing..."
            minHeight="80px"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Explain why this action is needed. If linked to a risk, the risk reference will also be shown.
          </p>
        </div>

        {/* Description */}
        <div>
          <label className={labelClasses}>Description *</label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Detailed description of what needs to be done..."
            minHeight="100px"
          />
          {errors.description && <p className={errorClasses}>{errors.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Report (optional) */}
          <div>
            <label htmlFor="action-report" className={labelClasses}>Report (optional)</label>
            <select
              id="action-report"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              className={inputClasses}
            >
              <option value="">— Not linked to report —</option>
              {reports.map((r) => (
                <option key={r.id} value={r.id}>{r.title} — {r.period}</option>
              ))}
            </select>
            {errors.reportId && <p className={errorClasses}>{errors.reportId}</p>}
          </div>

          {/* Source (optional) */}
          <div>
            <label htmlFor="action-source" className={labelClasses}>
              Source {prefillSource ? "" : "(optional)"}
            </label>
            <input
              id="action-source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., Board meeting, External audit"
              readOnly={!!prefillSource}
              className={cn(inputClasses, prefillSource && "bg-gray-50 text-gray-500")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Assigned To */}
          <div>
            <label htmlFor="action-owner" className={labelClasses}>Assigned To <span className="text-red-500 ml-0.5">*</span></label>
            <SearchableSelect
              id="action-owner"
              value={assignedTo}
              onChange={(v) => { setAssignedTo(v); if (errors.assignedTo) setErrors((p) => ({ ...p, assignedTo: "" })); }}
              options={users.filter((u) => u.isActive).map((u) => ({
                value: u.id,
                label: u.name,
                sublabel: u.role === "CCRO_TEAM" ? "CCRO" : u.role === "OWNER" ? "Risk Owner" : "Reviewer",
              }))}
              placeholder="Search and select owner..."
            />
            {errors.assignedTo && <p className={errorClasses}>{errors.assignedTo}</p>}
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="action-due" className={labelClasses}>Due Date *</label>
            <input
              id="action-due"
              type="date"
              value={dueDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClasses}
            />
            {errors.dueDate && <p className={errorClasses}>{errors.dueDate}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label htmlFor="action-priority" className={labelClasses}>Priority *</label>
            <select
              id="action-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as ActionPriority | "")}
              className={inputClasses}
            >
              <option value="">Select priority...</option>
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.priority && <p className={errorClasses}>{errors.priority}</p>}
          </div>

          {/* Status (only visible in edit mode) */}
          {isEdit && (
            <div>
              <label htmlFor="action-status" className={labelClasses}>Status</label>
              <select
                id="action-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ActionStatus)}
                className={inputClasses}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
