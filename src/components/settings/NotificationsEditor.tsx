"use client";

import { useState } from "react";
import { Plus, Trash2, Bell, ToggleLeft, ToggleRight } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { DashboardNotification, Role } from "@/lib/types";

const TYPE_OPTIONS: { value: DashboardNotification["type"]; label: string; colour: string }[] = [
  { value: "info", label: "Info", colour: "bg-blue-100 text-blue-700" },
  { value: "warning", label: "Warning", colour: "bg-amber-100 text-amber-700" },
  { value: "urgent", label: "Urgent", colour: "bg-red-100 text-red-700" },
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "CCRO_TEAM", label: "CCRO Team" },
  { value: "OWNER", label: "Owner" },
  { value: "VIEWER", label: "Viewer" },
];

export default function NotificationsEditor() {
  const notifications = useAppStore((s) => s.notifications);
  const setNotifications = useAppStore((s) => s.setNotifications);

  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<DashboardNotification["type"]>("info");
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setMessage("");
    setType("info");
    setTargetRoles([]);
    setExpiresAt("");
    setShowForm(false);
  }

  async function handleCreate() {
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }
    setSaving(true);
    try {
      const created = await api<DashboardNotification>("/api/notifications", {
        method: "POST",
        body: {
          message: message.trim(),
          type,
          active: true,
          targetRoles,
          expiresAt: expiresAt || null,
        },
      });
      setNotifications([created, ...notifications]);
      resetForm();
      toast.success("Notification created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(n: DashboardNotification) {
    try {
      const updated = await api<DashboardNotification>(`/api/notifications/${n.id}`, {
        method: "PATCH",
        body: { active: !n.active },
      });
      setNotifications(notifications.map((x) => (x.id === n.id ? updated : x)));
      toast.success(updated.active ? "Notification enabled" : "Notification disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  function handleDelete(id: string) {
    setPendingDeleteId(id);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteConfirmed() {
    if (!pendingDeleteId) return;
    setDeleteConfirmOpen(false);
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await api(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications(notifications.filter((n) => n.id !== id));
      toast.success("Notification deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  function toggleRole(role: Role) {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">Announcement Banners</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Create notifications displayed on the dashboard for all or specific roles.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-updraft-deep text-white px-4 py-2 text-sm font-medium hover:bg-updraft-bar transition-colors"
        >
          <Plus size={14} />
          New Notification
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Enter notification message..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DashboardNotification["type"])}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Roles</label>
              <div className="flex gap-2 flex-wrap">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => toggleRole(r.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                      targetRoles.includes(r.value)
                        ? "bg-updraft-deep text-white border-updraft-deep"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">None selected = all roles</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !message.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-updraft-deep rounded-lg hover:bg-updraft-bar disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Existing Notifications */}
      {notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No announcement banners yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const typeConfig = TYPE_OPTIONS.find((t) => t.value === n.type) ?? TYPE_OPTIONS[0];
            const isExpired = n.expiresAt && new Date(n.expiresAt) < new Date();
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                  n.active && !isExpired ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60"
                )}
              >
                <button
                  onClick={() => handleToggle(n)}
                  className="mt-0.5 shrink-0"
                  title={n.active ? "Disable" : "Enable"}
                >
                  {n.active ? (
                    <ToggleRight className="h-5 w-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", typeConfig.colour)}>
                      {typeConfig.label}
                    </span>
                    {n.targetRoles && n.targetRoles.length > 0 && (
                      <span className="text-[10px] text-gray-400">
                        {(n.targetRoles as string[]).join(", ")}
                      </span>
                    )}
                    {isExpired && (
                      <span className="text-[10px] font-semibold text-red-500">Expired</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                    <span>Created {new Date(n.createdAt).toLocaleDateString("en-GB")}</span>
                    {n.expiresAt && (
                      <span>Expires {new Date(n.expiresAt).toLocaleDateString("en-GB")}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirmed}
        title="Delete notification"
        message="Are you sure you want to delete this announcement banner? This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
