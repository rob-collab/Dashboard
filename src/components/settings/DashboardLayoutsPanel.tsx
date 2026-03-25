"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { resolveLayout, DEFAULT_LAYOUTS } from "@/lib/widget-registry";
import { AdminWidgetGrid } from "@/components/settings/AdminWidgetGrid";
import type { ResolvedSlot } from "@/lib/widget-registry";
import type { Role, WidgetId, WidgetLayoutGrid } from "@/lib/types";

interface UserSummary {
  id: string;
  name: string;
  role: Role;
}

/**
 * Settings tab — CCRO only.
 * Select a user → see their widget grid → drag to reorder → lock (pin) widgets → save.
 * Future-proof: driven entirely by resolveLayout + WIDGET_REGISTRY; new widgets appear
 * automatically as they are added to DEFAULT_LAYOUTS.
 */
export function DashboardLayoutsPanel() {
  const currentUser = useAppStore((s) => s.currentUser);

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [slots, setSlots] = useState<ResolvedSlot[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // CCRO-only guard — check before fetching to avoid unnecessary API calls
  const isCCRO = currentUser?.role === "CCRO_TEAM";

  // Fetch all active users on mount
  useEffect(() => {
    if (!isCCRO) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: UserSummary[]) => {
        setUsers(data);
        setLoadingUsers(false);
      })
      .catch(() => {
        setUsersError("Could not load users");
        setLoadingUsers(false);
      });
  }, [isCCRO]);

  // Fetch layout when a user is selected
  useEffect(() => {
    if (!selectedUserId) return;
    const user = users.find((u) => u.id === selectedUserId);
    if (!user) return;

    setLoadingLayout(true);
    setLayoutError(null);

    fetch(`/api/dashboard-layout?userId=${selectedUserId}`)
      .then((r) => r.json())
      .then((data) => {
        const rawGrid = data.layoutGrid as WidgetLayoutGrid | null;
        const savedSlots = rawGrid?.slots ?? [];
        const hidden: string[] = Array.isArray(data.hiddenSections) ? data.hiddenSections : [];
        const pinned: string[] = Array.isArray(data.pinnedSections) ? data.pinnedSections : [];
        setPinnedIds(pinned);
        setSlots(resolveLayout(user.role, savedSlots, hidden as WidgetId[], pinned as WidgetId[]));
        setLoadingLayout(false);
        setIsDirty(false);
      })
      .catch(() => {
        setLayoutError("Could not load layout for this user");
        setLoadingLayout(false);
      });
  }, [selectedUserId, users]);

  function handleReorder(fromSlotId: string, toSlotId: string) {
    setSlots((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((s) => s.slotId === fromSlotId);
      const toIdx = next.findIndex((s) => s.slotId === toSlotId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
      next[fromIdx] = { ...next[fromIdx], slotId: fromSlotId };
      next[toIdx]   = { ...next[toIdx],   slotId: toSlotId };
      return next;
    });
    setIsDirty(true);
  }

  function handleTogglePin(widgetId: WidgetId) {
    setPinnedIds((prev) =>
      prev.includes(widgetId)
        ? prev.filter((id) => id !== widgetId)
        : [...prev, widgetId]
    );
    setIsDirty(true);
  }

  function handleResetToDefault() {
    const user = users.find((u) => u.id === selectedUserId);
    if (!user) return;
    const defaults =
      DEFAULT_LAYOUTS[user.role as keyof typeof DEFAULT_LAYOUTS] ?? DEFAULT_LAYOUTS.CEO;
    setSlots(defaults.map((s) => ({ ...s, hidden: false, pinned: false })));
    setPinnedIds([]);
    setIsDirty(true);
  }

  async function handleSave() {
    if (!selectedUserId || isSaving) return;
    const user = users.find((u) => u.id === selectedUserId);
    setIsSaving(true);
    try {
      const res = await fetch("/api/dashboard-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          layoutGrid: {
            slots: slots.map(({ slotId, widgetId }) => ({ slotId, widgetId })),
          },
          sectionOrder: slots.map((s) => s.widgetId),
          pinnedSections: pinnedIds,
        }),
      });
      if (!res.ok) throw new Error();
      setIsDirty(false);
      toast.success(`Layout saved for ${user?.name}`);
    } catch {
      toast.error("Failed to save layout");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApplyToRole() {
    if (!selectedUserId) return;
    const selectedUser = users.find((u) => u.id === selectedUserId);
    if (!selectedUser) return;

    const roleUsers = users.filter((u) => u.role === selectedUser.role);
    const payload = {
      layoutGrid: {
        slots: slots.map(({ slotId, widgetId }) => ({ slotId, widgetId })),
      },
      sectionOrder: slots.map((s) => s.widgetId),
      pinnedSections: pinnedIds,
    };

    let succeeded = 0;
    let failed = 0;
    for (const u of roleUsers) {
      try {
        const res = await fetch("/api/dashboard-layout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, targetUserId: u.id }),
        });
        if (res.ok) succeeded++; else failed++;
      } catch {
        failed++;
      }
    }
    if (failed === 0) {
      toast.success(`Layout applied to all ${selectedUser.role} users (${succeeded} updated)`);
    } else {
      toast.error(`Applied to ${succeeded} of ${roleUsers.length} users — ${failed} failed`);
    }
  }

  // CCRO-only guard
  if (!isCCRO) {
    return (
      <p className="text-sm text-gray-500">
        You do not have permission to configure dashboard layouts.
      </p>
    );
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-5">
      {/* Top bar: user selector + actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* User dropdown */}
        <div className="min-w-[200px] max-w-xs flex-1">
          {usersError ? (
            <p className="text-sm text-red-500">{usersError}</p>
          ) : (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingUsers}
              className="w-full rounded-lg border border-[#E8E6E1] bg-white px-3 py-2 text-sm text-gray-700 focus:border-updraft-bar focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="">
                {loadingUsers ? "Loading users…" : "Select a user…"}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.role}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedUserId && (
          <>
            <button
              onClick={handleApplyToRole}
              className="rounded-lg border border-[#E8E6E1] bg-white px-3 py-2 text-sm text-gray-500 transition-colors hover:border-updraft-bar/30 hover:text-updraft-bar dark:border-gray-700 dark:bg-gray-900"
            >
              Apply to all {selectedUser?.role} users
            </button>
            <button
              onClick={handleResetToDefault}
              className="rounded-lg border border-[#E8E6E1] bg-white px-3 py-2 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900"
            >
              Reset to default
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="rounded-lg bg-updraft-bar px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-updraft-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save layout"}
            </button>
          </>
        )}
      </div>

      {/* Grid area */}
      {selectedUserId && (
        <>
          {loadingLayout && (
            <p className="text-sm text-gray-400">Loading layout…</p>
          )}
          {layoutError && (
            <p className="text-sm text-red-500">{layoutError}</p>
          )}
          {!loadingLayout && !layoutError && (
            <>
              <p className="text-xs text-gray-400">
                Drag widgets to reorder · Click Lock to prevent the user from moving or hiding a widget
              </p>
              <AdminWidgetGrid
                slots={slots}
                pinnedIds={pinnedIds}
                onReorder={handleReorder}
                onTogglePin={handleTogglePin}
              />
              <div className="rounded-lg border border-updraft-bar/20 bg-updraft-bar/5 px-4 py-3">
                <p className="text-xs font-semibold text-updraft-bar">
                  What locking does
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Locked widgets are fixed in {selectedUser?.name ?? "the user"}&apos;s dashboard
                  — they cannot be moved or hidden. All other widgets they can rearrange freely.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
