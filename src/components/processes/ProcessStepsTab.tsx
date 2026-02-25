"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X, Save, ListOrdered } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Process, ProcessStep } from "@/lib/types";
import { useAppStore } from "@/lib/store";

interface Props {
  process: Process;
  onUpdate: (p: Process) => void;
  isCCRO: boolean;
}

interface StepFormState {
  title: string;
  description: string;
  responsibleRole: string;
  accountableRole: string;
  slaDays: string;
}

const EMPTY_FORM: StepFormState = {
  title: "",
  description: "",
  responsibleRole: "",
  accountableRole: "",
  slaDays: "",
};

export default function ProcessStepsTab({ process, onUpdate, isCCRO }: Props) {
  const users = useAppStore((s) => s.users);
  const activeUsers = users.filter((u) => u.isActive);
  const steps = [...(process.steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<StepFormState>(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StepFormState>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openEdit(step: ProcessStep) {
    setEditingId(step.id);
    setEditForm({
      title: step.title,
      description: step.description ?? "",
      responsibleRole: step.responsibleRole ?? "",
      accountableRole: step.accountableRole ?? "",
      slaDays: step.slaDays != null ? String(step.slaDays) : "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  }

  async function handleAdd() {
    if (!addForm.title.trim()) {
      toast.error("Step title is required");
      return;
    }
    setAddSaving(true);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/steps`, {
        method: "POST",
        body: {
          title: addForm.title.trim(),
          description: addForm.description.trim() || null,
          responsibleRole: addForm.responsibleRole.trim() || null,
          accountableRole: addForm.accountableRole.trim() || null,
          slaDays: addForm.slaDays ? Number(addForm.slaDays) : null,
          stepOrder: steps.length + 1,
        },
      });
      onUpdate(result);
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
      toast.success("Step added");
    } catch {
      toast.error("Failed to add step");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleEdit(step: ProcessStep) {
    if (!editForm.title.trim()) {
      toast.error("Step title is required");
      return;
    }
    setEditSaving(true);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/steps`, {
        method: "PATCH",
        body: {
          stepId: step.id,
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          responsibleRole: editForm.responsibleRole.trim() || null,
          accountableRole: editForm.accountableRole.trim() || null,
          slaDays: editForm.slaDays ? Number(editForm.slaDays) : null,
        },
      });
      onUpdate(result);
      cancelEdit();
      toast.success("Step updated");
    } catch {
      toast.error("Failed to update step");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(stepId: string) {
    setDeletingId(stepId);
    try {
      const result = await api<Process>(`/api/processes/${process.id}/steps`, {
        method: "DELETE",
        body: { stepId },
      });
      onUpdate(result);
      toast.success("Step removed");
    } catch {
      toast.error("Failed to remove step");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {steps.length} step{steps.length !== 1 ? "s" : ""}
        </p>
        {isCCRO && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-deep text-white px-3 py-1.5 text-xs font-medium hover:bg-updraft-bar transition-colors"
          >
            <Plus size={12} /> Add Step
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-xl border border-updraft-bright-purple/30 bg-updraft-pale-purple/10 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            New Step
          </p>
          <StepFormFields
            form={addForm}
            onChange={(k, v) => setAddForm((f) => ({ ...f, [k]: v }))}
            users={activeUsers}
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); }}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X size={12} /> Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={addSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-deep text-white px-3 py-1.5 text-xs font-medium hover:bg-updraft-bar transition-colors disabled:opacity-50"
            >
              <Save size={12} /> {addSaving ? "Saving…" : "Save Step"}
            </button>
          </div>
        </div>
      )}

      {/* Steps list */}
      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <ListOrdered size={36} className="text-gray-200" />
          <p className="text-sm font-medium text-gray-400">No process steps defined yet.</p>
          {isCCRO && (
            <p className="text-xs text-gray-400">
              Use &ldquo;Add Step&rdquo; above to document this process step by step.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map((step) => {
            const isEditing = editingId === step.id;
            return (
              <div
                key={step.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                {isEditing ? (
                  <div className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Edit Step {step.stepOrder}
                    </p>
                    <StepFormFields
                      form={editForm}
                      onChange={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))}
                      users={activeUsers}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <X size={12} /> Cancel
                      </button>
                      <button
                        onClick={() => handleEdit(step)}
                        disabled={editSaving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-deep text-white px-3 py-1.5 text-xs font-medium hover:bg-updraft-bar transition-colors disabled:opacity-50"
                      >
                        <Save size={12} /> {editSaving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-3">
                    {/* Step order badge */}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-updraft-pale-purple/50 text-xs font-bold text-updraft-deep">
                      {step.stepOrder}
                    </span>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                      {step.description && (
                        <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">
                          {step.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        {step.responsibleRole && (
                          <span className="text-[10px] text-gray-500">
                            <span className="font-semibold text-gray-600">Responsible:</span>{" "}
                            {step.responsibleRole}
                          </span>
                        )}
                        {step.accountableRole && (
                          <span className="text-[10px] text-gray-500">
                            <span className="font-semibold text-gray-600">Accountable:</span>{" "}
                            {step.accountableRole}
                          </span>
                        )}
                        {step.slaDays != null && (
                          <span className="text-[10px] text-gray-500">
                            <span className="font-semibold text-gray-600">SLA:</span>{" "}
                            {step.slaDays} day{step.slaDays !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    {isCCRO && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(step)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Edit step"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(step.id)}
                          disabled={deletingId === step.id}
                          className={cn(
                            "rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors",
                            deletingId === step.id && "opacity-50",
                          )}
                          title="Delete step"
                        >
                          <Trash2 size={13} />
                        </button>
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

function StepFormFields({
  form,
  onChange,
  users,
}: {
  form: StepFormState;
  onChange: (key: keyof StepFormState, value: string) => void;
  users: { id: string; name: string }[];
}) {
  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple";
  const label = "block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5";

  // Check if current value matches a user name; if not it's a legacy free-text value
  const isKnownResponsible = users.some((u) => u.name === form.responsibleRole);
  const isKnownAccountable = users.some((u) => u.name === form.accountableRole);

  return (
    <div className="space-y-2">
      <div>
        <label className={label}>
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Step title"
          className={input}
        />
      </div>
      <div>
        <label className={label}>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Optional description"
          rows={2}
          className={cn(input, "resize-none")}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Responsible Role</label>
          <select
            value={isKnownResponsible ? form.responsibleRole : ""}
            onChange={(e) => onChange("responsibleRole", e.target.value)}
            className={input}
          >
            <option value="">— Not assigned —</option>
            {!isKnownResponsible && form.responsibleRole && (
              <option value={form.responsibleRole}>{form.responsibleRole} (legacy)</option>
            )}
            {users.map((u) => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Accountable Role</label>
          <select
            value={isKnownAccountable ? form.accountableRole : ""}
            onChange={(e) => onChange("accountableRole", e.target.value)}
            className={input}
          >
            <option value="">— Not assigned —</option>
            {!isKnownAccountable && form.accountableRole && (
              <option value={form.accountableRole}>{form.accountableRole} (legacy)</option>
            )}
            {users.map((u) => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="w-1/2">
        <label className={label}>SLA (days)</label>
        <input
          type="number"
          min={0}
          value={form.slaDays}
          onChange={(e) => onChange("slaDays", e.target.value)}
          placeholder="e.g. 2"
          className={input}
        />
      </div>
    </div>
  );
}
