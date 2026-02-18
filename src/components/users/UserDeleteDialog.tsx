"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/common/Modal";
import type { User } from "@/lib/types";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AlertTriangle, Users, ChevronDown, ChevronRight } from "lucide-react";

interface DependencyGroup {
  category: string;
  model: string;
  field: string;
  count: number;
  items: Array<{ id: string; label: string }>;
}

interface DependencyResponse {
  groups: DependencyGroup[];
  totalCount: number;
}

interface UserDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  users: User[];
  onDeleted: (userId: string) => void;
}

export default function UserDeleteDialog({
  open,
  onClose,
  user,
  users,
  onDeleted,
}: UserDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deps, setDeps] = useState<DependencyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [customReassignments, setCustomReassignments] = useState<Record<string, string>>({});
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Available reassignment targets (exclude the user being deleted)
  const availableUsers = users.filter((u) => u.isActive && u.id !== user?.id);

  useEffect(() => {
    if (!open || !user) return;
    setError(null);
    setDeps(null);
    setReassignTo("");
    setCustomReassignments({});
    setExpandedGroup(null);
    setLoading(true);

    api<DependencyResponse>(`/api/users/${user.id}/dependencies`)
      .then((data) => setDeps(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dependencies"))
      .finally(() => setLoading(false));
  }, [open, user]);

  const handleDelete = useCallback(async () => {
    if (!user || !reassignTo) return;
    setDeleting(true);
    setError(null);

    try {
      // Build per-group overrides (only include non-default selections)
      const overrides: Record<string, string> = {};
      for (const [key, targetId] of Object.entries(customReassignments)) {
        if (targetId && targetId !== reassignTo) {
          overrides[key] = targetId;
        }
      }

      await api(`/api/users/${user.id}`, {
        method: "DELETE",
        body: {
          reassignTo,
          ...(Object.keys(overrides).length > 0 && { reassignments: overrides }),
        },
      });

      onDeleted(user.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }, [user, reassignTo, customReassignments, onDeleted, onClose]);

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete User"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!reassignTo || deleting || loading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
              !reassignTo || deleting || loading
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            )}
          >
            {deleting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <AlertTriangle size={14} />
                Delete User & Reassign
              </>
            )}
          </button>
        </>
      }
    >
      {/* User Info */}
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-600">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-red-700">
          This action is permanent. All entities owned by this user will be reassigned to the selected target user(s).
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-updraft-bar border-t-transparent" />
          <span className="ml-3 text-sm text-gray-500">Scanning dependencies...</span>
        </div>
      )}

      {/* Dependencies */}
      {deps && !loading && (
        <>
          {/* Bulk Reassignment */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Users size={14} className="inline mr-1.5 text-updraft-bar" />
              Reassign All To
            </label>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
            >
              <option value="">Select target user...</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace("_", " ")})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              All {deps.totalCount} linked entities will be reassigned to this user unless overridden below.
            </p>
          </div>

          {/* Dependency Groups */}
          {deps.groups.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">No dependencies found. This user can be safely deleted.</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[340px] overflow-y-auto rounded-lg border border-gray-200">
              {deps.groups.map((group) => {
                const key = `${group.model}.${group.field}`;
                const isExpanded = expandedGroup === key;
                return (
                  <div key={key} className="border-b border-gray-100 last:border-b-0">
                    <button
                      onClick={() => setExpandedGroup(isExpanded ? null : key)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-400 shrink-0" />
                      )}
                      <span className="flex-1 text-sm text-gray-700">{group.category}</span>
                      <span className="rounded-full bg-updraft-pale-purple/40 px-2 py-0.5 text-xs font-semibold text-updraft-deep">
                        {group.count}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 bg-gray-50/50">
                        {/* Per-group reassignment override */}
                        <div className="mb-2">
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Override target for this category
                          </label>
                          <select
                            value={customReassignments[key] || ""}
                            onChange={(e) =>
                              setCustomReassignments((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-updraft-light-purple"
                          >
                            <option value="">Use default ({availableUsers.find((u) => u.id === reassignTo)?.name || "—"})</option>
                            {availableUsers.map((u) => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Sample items */}
                        {group.items.length > 0 && (
                          <div className="space-y-1">
                            {group.items.map((item) => (
                              <p key={item.id} className="text-xs text-gray-500 truncate">
                                {item.label}
                              </p>
                            ))}
                            {group.count > group.items.length && (
                              <p className="text-[10px] text-gray-400 italic">
                                ...and {group.count - group.items.length} more
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
