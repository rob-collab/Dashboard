"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/common/Modal";
import type { User, Role } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { RISK_CATEGORIES } from "@/lib/risk-categories";
import { X } from "lucide-react";

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  user?: User;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "CCRO_TEAM", label: "CCRO Team" },
  { value: "METRIC_OWNER", label: "Metric Owner" },
  { value: "VIEWER", label: "Viewer" },
];

export default function UserFormDialog({
  open,
  onClose,
  onSave,
  user,
}: UserFormDialogProps) {
  const isEdit = Boolean(user);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [measuresInput, setMeasuresInput] = useState("");
  const [riskCategories, setRiskCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form whenever the dialog opens or the user prop changes
  useEffect(() => {
    if (open) {
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setRole(user.role);
        setMeasuresInput(user.assignedMeasures.join(", "));
        setRiskCategories(user.riskOwnerCategories ?? []);
      } else {
        setName("");
        setEmail("");
        setRole("VIEWER");
        setMeasuresInput("");
        setRiskCategories([]);
      }
      setErrors({});
    }
  }, [open, user]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const assignedMeasures = measuresInput
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const savedUser: User = {
      id: user?.id ?? `user-${generateId()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      assignedMeasures,
      riskOwnerCategories: riskCategories,
      isActive: user?.isActive ?? true,
      createdAt: user?.createdAt ?? new Date().toISOString(),
      lastLoginAt: user?.lastLoginAt ?? null,
    };

    onSave(savedUser);
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
      title={isEdit ? "Edit User" : "Add User"}
      size="md"
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
            form="user-form"
            className="rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
          >
            {isEdit ? "Save Changes" : "Add User"}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="user-name" className={labelClasses}>
            Name
          </label>
          <input
            id="user-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Smith"
            className={inputClasses}
          />
          {errors.name && <p className={errorClasses}>{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="user-email" className={labelClasses}>
            Email
          </label>
          <input
            id="user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. jane@updraft.com"
            className={inputClasses}
          />
          {errors.email && <p className={errorClasses}>{errors.email}</p>}
        </div>

        {/* Role */}
        <div>
          <label htmlFor="user-role" className={labelClasses}>
            Role
          </label>
          <select
            id="user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={inputClasses}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned Measures */}
        <div>
          <label htmlFor="user-measures" className={labelClasses}>
            Assigned Measures
          </label>
          <input
            id="user-measures"
            type="text"
            value={measuresInput}
            onChange={(e) => setMeasuresInput(e.target.value)}
            placeholder="e.g. 1.1, 1.3, 2.4"
            className={inputClasses}
          />
          <p className="text-xs text-gray-400 mt-1">
            Comma-separated list of measure IDs
          </p>
        </div>

        {/* Risk Owner Categories */}
        <div>
          <label className={labelClasses}>
            Risk Owner Categories
          </label>
          {riskCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {riskCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 rounded-full bg-updraft-pale-purple/40 px-2.5 py-0.5 text-xs font-medium text-updraft-deep"
                >
                  {cat}
                  <button
                    type="button"
                    onClick={() => setRiskCategories(riskCategories.filter((c) => c !== cat))}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value && !riskCategories.includes(e.target.value)) {
                setRiskCategories([...riskCategories, e.target.value]);
              }
            }}
            className={inputClasses}
          >
            <option value="">Add a risk category...</option>
            {RISK_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name} disabled={riskCategories.includes(c.name)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
