"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/common/Modal";
import type { Action, ActionStatus, Report, User } from "@/lib/types";
import { generateId } from "@/lib/utils";

interface ActionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (action: Action) => void;
  action?: Action;
  reports: Report[];
  users: User[];
  currentUserId: string;
}

const STATUS_OPTIONS: { value: ActionStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "OVERDUE", label: "Overdue" },
];

export default function ActionFormDialog({
  open,
  onClose,
  onSave,
  action,
  reports,
  users,
  currentUserId,
}: ActionFormDialogProps) {
  const isEdit = Boolean(action);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reportId, setReportId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<ActionStatus>("OPEN");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (action) {
        setTitle(action.title);
        setDescription(action.description);
        setReportId(action.reportId);
        setSectionId(action.sectionId || "");
        setSectionTitle(action.sectionTitle || "");
        setAssignedTo(action.assignedTo);
        setDueDate(action.dueDate ? action.dueDate.split("T")[0] : "");
        setStatus(action.status);
      } else {
        setTitle("");
        setDescription("");
        setReportId(reports[0]?.id || "");
        setSectionId("");
        setSectionTitle("");
        setAssignedTo("");
        setDueDate("");
        setStatus("OPEN");
      }
      setErrors({});
    }
  }, [open, action, reports]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!reportId) newErrors.reportId = "Report is required";
    if (!assignedTo) newErrors.assignedTo = "Owner is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const selectedReport = reports.find((r) => r.id === reportId);

    const saved: Action = {
      id: action?.id ?? `action-${generateId()}`,
      reportId,
      reportPeriod: selectedReport ? `${selectedReport.title} — ${selectedReport.period}` : "",
      sectionId: sectionId || null,
      sectionTitle: sectionTitle || null,
      title: title.trim(),
      description: description.trim(),
      status,
      assignedTo,
      createdBy: action?.createdBy ?? currentUserId,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      completedAt: status === "COMPLETED" ? (action?.completedAt ?? new Date().toISOString()) : null,
      createdAt: action?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(saved);
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
            className="rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
          >
            {isEdit ? "Save Changes" : "Create Action"}
          </button>
        </>
      }
    >
      <form id="action-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="action-title" className={labelClasses}>Title</label>
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

        {/* Description */}
        <div>
          <label htmlFor="action-desc" className={labelClasses}>Description</label>
          <textarea
            id="action-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the action..."
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Report */}
          <div>
            <label htmlFor="action-report" className={labelClasses}>Report</label>
            <select
              id="action-report"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              className={inputClasses}
            >
              <option value="">Select report...</option>
              {reports.map((r) => (
                <option key={r.id} value={r.id}>{r.title} — {r.period}</option>
              ))}
            </select>
            {errors.reportId && <p className={errorClasses}>{errors.reportId}</p>}
          </div>

          {/* Section title */}
          <div>
            <label htmlFor="action-section" className={labelClasses}>Section (optional)</label>
            <input
              id="action-section"
              type="text"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="e.g. Complaints Overview"
              className={inputClasses}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Assigned To */}
          <div>
            <label htmlFor="action-owner" className={labelClasses}>Assigned To</label>
            <select
              id="action-owner"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className={inputClasses}
            >
              <option value="">Select owner...</option>
              {users.filter((u) => u.isActive).map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, " ")})</option>
              ))}
            </select>
            {errors.assignedTo && <p className={errorClasses}>{errors.assignedTo}</p>}
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="action-due" className={labelClasses}>Due Date</label>
            <input
              id="action-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClasses}
            />
          </div>
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
      </form>
    </Modal>
  );
}
