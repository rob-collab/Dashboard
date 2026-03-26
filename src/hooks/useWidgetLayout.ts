"use client";

import { useState, useEffect, useCallback } from "react";
import { resolveLayout, resolveWidgetOrder, WIDGET_REGISTRY } from "@/lib/widget-registry";
import type { WidgetId, WidgetSlot, WidgetLayoutV2 } from "@/lib/types";
import type { Role } from "@/lib/types";
import type { ResolvedSlot } from "@/lib/widget-registry";

// ── Kept for backward compat — existing test suite imports this ───────────────

export function mergeWidgetLayout(
  role: Role,
  savedSlots: WidgetSlot[] | null,
  hiddenWidgetIds: string[],
  pinnedWidgetIds: string[]
): ResolvedSlot[] {
  return resolveLayout(role, savedSlots ?? [], hiddenWidgetIds as WidgetId[], pinnedWidgetIds as WidgetId[]);
}

// ── Model B hook ──────────────────────────────────────────────────────────────

interface UseWidgetLayoutReturn {
  order: WidgetId[];
  heights: Partial<Record<WidgetId, number>>;
  hiddenIds: WidgetId[];
  pinnedIds: WidgetId[];
  editMode: boolean;
  toggleEditMode: () => void;
  onOrderChange: (newOrder: WidgetId[]) => void;
  onResize: (widgetId: WidgetId, newH: number) => void;
  onHide: (widgetId: WidgetId) => void;
  onShow: (widgetId: WidgetId) => void;
  isSaving: boolean;
  saveNow: () => void;
}

export function useWidgetLayout(
  userId: string | undefined,
  role: Role | undefined
): UseWidgetLayoutReturn {
  const [order, setOrder] = useState<WidgetId[]>([]);
  const [heights, setHeights] = useState<Partial<Record<WidgetId, number>>>({});
  const [hiddenIds, setHiddenIds] = useState<WidgetId[]>([]);
  const [pinnedIds, setPinnedIds] = useState<WidgetId[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load layout from API on mount
  useEffect(() => {
    if (!userId || !role) return;
    fetch("/api/dashboard-layout")
      .then((r) => r.json())
      .then((data) => {
        const hidden = (Array.isArray(data.hiddenSections) ? data.hiddenSections : []) as WidgetId[];
        const pinned = (Array.isArray(data.pinnedSections) ? data.pinnedSections : []) as WidgetId[];

        const rawGrid = data.layoutGrid as (Record<string, unknown>) | null;

        if (rawGrid && Array.isArray(rawGrid.order)) {
          // Model B format: { order, heights }
          const v2 = rawGrid as unknown as WidgetLayoutV2;
          const { order: resolvedOrder, hidden: resolvedHidden, pinned: resolvedPinned } =
            resolveWidgetOrder(role, v2.order as WidgetId[], hidden, pinned);
          setOrder(resolvedOrder);
          setHeights((v2.heights ?? {}) as Partial<Record<WidgetId, number>>);
          setHiddenIds(resolvedHidden);
          setPinnedIds(resolvedPinned);
        } else {
          // No saved layout or legacy slot format — fall back to role defaults
          const { order: defaultOrder, hidden: resolvedHidden, pinned: resolvedPinned } =
            resolveWidgetOrder(role, null, hidden, pinned);
          setOrder(defaultOrder);
          setHiddenIds(resolvedHidden);
          setPinnedIds(resolvedPinned);
        }
      })
      .catch(() => {
        const { order: defaultOrder } = resolveWidgetOrder(role, null, [], []);
        setOrder(defaultOrder);
      });
  }, [userId, role]);

  const persist = useCallback(
    (newOrder: WidgetId[], newHeights: Partial<Record<WidgetId, number>>, newHidden: WidgetId[]) => {
      if (!userId) return;
      setIsSaving(true);
      const layoutGrid: WidgetLayoutV2 = {
        order: newOrder,
        heights: newHeights as Record<string, number>,
      };
      fetch("/api/dashboard-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sectionOrder: newOrder,
          hiddenSections: newHidden,
          layoutGrid,
        }),
      })
        .then((res) => { if (!res.ok) console.error("[useWidgetLayout] persist failed:", res.status); })
        .catch((err) => console.error("[useWidgetLayout] persist error:", err))
        .finally(() => setIsSaving(false));
    },
    [userId]
  );

  const toggleEditMode = useCallback(() => setEditMode((v) => !v), []);

  const onOrderChange = useCallback(
    (newOrder: WidgetId[]) => {
      setOrder(newOrder);
      persist(newOrder, heights, hiddenIds);
    },
    [heights, hiddenIds, persist]
  );

  const onResize = useCallback(
    (widgetId: WidgetId, newH: number) => {
      const def = WIDGET_REGISTRY[widgetId];
      const h = def ? Math.max(def.minH, newH) : Math.max(2, newH);
      const newHeights = { ...heights, [widgetId]: h };
      setHeights(newHeights);
      persist(order, newHeights, hiddenIds);
    },
    [order, heights, hiddenIds, persist]
  );

  const onHide = useCallback(
    (widgetId: WidgetId) => {
      const newHidden = [...hiddenIds, widgetId] as WidgetId[];
      setHiddenIds(newHidden);
      persist(order, heights, newHidden);
    },
    [order, heights, hiddenIds, persist]
  );

  const onShow = useCallback(
    (widgetId: WidgetId) => {
      const newHidden = hiddenIds.filter((id) => id !== widgetId);
      setHiddenIds(newHidden);
      persist(order, heights, newHidden);
    },
    [order, heights, hiddenIds, persist]
  );

  const saveNow = useCallback(() => {
    persist(order, heights, hiddenIds);
  }, [order, heights, hiddenIds, persist]);

  return {
    order,
    heights,
    hiddenIds,
    pinnedIds,
    editMode,
    toggleEditMode,
    onOrderChange,
    onResize,
    onHide,
    onShow,
    isSaving,
    saveNow,
  };
}
