"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import type { User, Role } from "@/lib/types";
import { api, ApiError } from "@/lib/api-client";

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  user?: User;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "CCRO_TEAM", label: "CCRO Team" },
  { value: "CEO", label: "CEO" },
  { value: "OWNER", label: "Owner" },
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form whenever the dialog opens or the user prop changes
  useEffect(() => {
    if (open) {
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setRole(user.role);
        setMeasuresInput(user.assignedMeasures.join(", "));
      } else {
        setName("");
        setEmail("");
        setRole("VIEWER");
        setMeasuresInput("");
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [open, user]);

  function validateField(field: "name" | "email") {
    setErrors((prev) => {
      const next = { ...prev };
      if (field === "name") {
        if (!name.trim()) next.name = "Name is required";
        else delete next.name;
      }
      if (field === "email") {
        if (!email.trim()) next.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Please enter a valid email address";
        else delete next.email;
      }
      return next;
    });
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const assignedMeasures = measuresInput
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    setSubmitting(true);
    setSubmitError(null);

    try {
      let serverUser: User;

      const normalisedEmail = email.trim().toLowerCase();

      if (isEdit && user) {
        // Update existing user — PATCH persists to DB immediately
        serverUser = await api<User>(`/api/users/${user.id}`, {
          method: "PATCH",
          body: {
            name: name.trim(),
            email: normalisedEmail,
            role,
            assignedMeasures,
          },
        });
      } else {
        // Create new user — POST to DB; server generates the ID
        serverUser = await api<User>("/api/users", {
          method: "POST",
          body: {
            name: name.trim(),
            email: normalisedEmail,
            role,
            assignedMeasures,
            isActive: true,
          },
        });
      }

      onSave(serverUser);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setSubmitError("A user with this email address already exists.");
        } else if (err.status === 403) {
          setSubmitError("You don't have permission to manage users.");
        } else if (err.status === 400) {
          setSubmitError("Please check your inputs and try again.");
        } else {
          setSubmitError("Failed to save user. Please try again.");
        }
      } else {
        setSubmitError("Could not reach the server. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
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
            disabled={submitting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Add User"}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Submit error banner */}
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="user-name" className={labelClasses}>
            Name <span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            id="user-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => validateField("name")}
            placeholder="e.g. Jane Smith"
            className={inputClasses}
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "user-name-error" : undefined}
          />
          {errors.name && <p id="user-name-error" className={errorClasses}>{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="user-email" className={labelClasses}>
            Email <span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            id="user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            onBlur={() => validateField("email")}
            placeholder="e.g. jane@updraft.com"
            autoCapitalize="none"
            autoCorrect="off"
            className={inputClasses}
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "user-email-error" : undefined}
          />
          {errors.email && <p id="user-email-error" className={errorClasses}>{errors.email}</p>}
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

      </form>
    </Modal>
  );
}
