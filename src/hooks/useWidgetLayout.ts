"use client";

import { useState, useEffect, useCallback } from "react";
import { resolveLayout } from "@/lib/widget-registry";
import type { WidgetSlot, WidgetLayoutGrid } from "@/lib/types";
import type { Role } from "@/lib/types";
import type { ResolvedSlot } from "@/lib/widget-registry";

// ── Pure helper (exported for tests) ─────────────────────────────────────────

export function mergeWidgetLayout(
  role: Role,
  savedSlots: WidgetSlot[] | null,
  hiddenWidgetIds: string[],
  pinnedWidgetIds: string[]
): ResolvedSlot[] {
  return resolveLayout(role, savedSlots ?? [], hiddenWidgetIds, pinnedWidgetIds);
}

// ── React hook ───────────────────────────────────────────────────────────────

interface UseWidgetLayoutReturn {
  slots: ResolvedSlot[];
  editMode: boolean;
  toggleEditMode: () => void;
  onSwap: (fromSlotId: string, toSlotId: string) => void;
  onHide: (widgetId: string) => void;
  onShow: (widgetId: string) => void;
  isSaving: boolean;
}

export function useWidgetLayout(
  userId: string | undefined,
  role: Role | undefined
): UseWidgetLayoutReturn {
  const [slots, setSlots] = useState<ResolvedSlot[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load layout from API on mount
  useEffect(() => {
    if (!userId || !role) return;
    fetch("/api/dashboard-layout")
      .then((r) => r.json())
      .then((data) => {
        // layoutGrid may be: null | RGLLayoutItem[] (legacy) | WidgetLayoutGrid (new)
        // In all cases, rawGrid?.slots ?? [] gracefully falls back to role defaults.
        const rawGrid = data.layoutGrid as WidgetLayoutGrid | null;
        const savedSlots: WidgetSlot[] = rawGrid?.slots ?? [];
        const hidden: string[] = Array.isArray(data.hiddenSections) ? data.hiddenSections : [];
        const pinned: string[] = Array.isArray(data.pinnedSections) ? data.pinnedSections : [];
        setHiddenIds(hidden);
        setPinnedIds(pinned);
        setSlots(mergeWidgetLayout(role, savedSlots, hidden, pinned));
      })
      .catch(() => {
        // Fall back to role defaults on API error
        setSlots(mergeWidgetLayout(role, [], [], []));
      });
  }, [userId, role]);

  // Persist layout to API
  const persist = useCallback(
    (newSlots: ResolvedSlot[], newHidden: string[]) => {
      if (!userId) return;
      setIsSaving(true);
      const body = {
        userId,
        sectionOrder: newSlots.map((s) => s.widgetId),
        hiddenSections: newHidden,
        layoutGrid: { slots: newSlots.map(({ slotId, widgetId }) => ({ slotId, widgetId })) },
      };
      fetch("/api/dashboard-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).finally(() => setIsSaving(false));
    },
    [userId]
  );

  const toggleEditMode = useCallback(() => setEditMode((v) => !v), []);

  const onSwap = useCallback(
    (fromSlotId: string, toSlotId: string) => {
      setSlots((prev) => {
        const next = [...prev];
        const fromIdx = next.findIndex((s) => s.slotId === fromSlotId);
        const toIdx = next.findIndex((s) => s.slotId === toSlotId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        // Don't swap pinned slots
        if (next[fromIdx].pinned || next[toIdx].pinned) return prev;
        [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
        // Restore original slotIds after swap
        next[fromIdx] = { ...next[fromIdx], slotId: fromSlotId };
        next[toIdx]   = { ...next[toIdx],   slotId: toSlotId };
        persist(next, hiddenIds);
        return next;
      });
    },
    [hiddenIds, persist]
  );

  const onHide = useCallback(
    (widgetId: string) => {
      const newHidden = [...hiddenIds, widgetId];
      setHiddenIds(newHidden);
      setSlots((prev) => prev.map((s) => s.widgetId === widgetId ? { ...s, hidden: true } : s));
      persist(slots, newHidden);
    },
    [hiddenIds, slots, persist]
  );

  const onShow = useCallback(
    (widgetId: string) => {
      const newHidden = hiddenIds.filter((id) => id !== widgetId);
      setHiddenIds(newHidden);
      setSlots((prev) => prev.map((s) => s.widgetId === widgetId ? { ...s, hidden: false } : s));
      persist(slots, newHidden);
    },
    [hiddenIds, slots, persist]
  );

  return { slots, editMode, toggleEditMode, onSwap, onHide, onShow, isSaving };
}
