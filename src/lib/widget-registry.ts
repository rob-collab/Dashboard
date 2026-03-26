import type { WidgetId, WidgetSlot, Role } from "@/lib/types";

export interface WidgetDef {
  label: string;
  description: string;
  /** Default height in grid row units (rowHeight = 72px, gap = 16px). */
  defaultH: number;
  /** Minimum height the user can resize down to. */
  minH: number;
}

/** Grid constants shared by WidgetGrid and the bin-packing algorithm. */
export const GRID_ROW_HEIGHT = 72; // px per row unit
export const GRID_GAP = 16;        // px gap between widgets
export const GRID_COLS = 2;        // number of columns

export const WIDGET_REGISTRY: Record<WidgetId, WidgetDef> = {
  "approval-queue":       { label: "Approval Queue",       description: "Items awaiting CCRO sign-off",             defaultH: 5, minH: 3 },
  "risk-posture":         { label: "Risk Posture",          description: "Category sparklines vs appetite",           defaultH: 3, minH: 2 },
  "controls-heartbeat":   { label: "Controls Heartbeat",   description: "Waffle grid of latest test results",        defaultH: 6, minH: 3 },
  "consumer-duty-health": { label: "Consumer Duty Health", description: "CD outcome ring by measure count",          defaultH: 4, minH: 3 },
  "horizon-alert":        { label: "Horizon Alert",        description: "Upcoming FCA deadlines and actions",        defaultH: 4, minH: 3 },
  "action-momentum":      { label: "Action Momentum",      description: "P1/P2/P3 volume trend over time",           defaultH: 3, minH: 2 },
  "my-runway":            { label: "My Runway",            description: "30-day personal item timeline",             defaultH: 3, minH: 2 },
  "firm-status":          { label: "Firm Status",          description: "4 independent domain health indicators",    defaultH: 2, minH: 2 },
  "action-needed":        { label: "Action Needed",        description: "Personal overdue items and reviews",        defaultH: 4, minH: 3 },
  "my-portfolio":         { label: "My Portfolio",         description: "Owned risks, controls, and CD measures",    defaultH: 4, minH: 3 },
  "risks-in-focus":       { label: "Risks in Focus",       description: "Starred risks from the risk register",      defaultH: 5, minH: 3 },
};

type DefaultLayout = WidgetSlot[];

export const DEFAULT_LAYOUTS: Partial<Record<Role, DefaultLayout>> & { CEO: DefaultLayout; VIEWER: DefaultLayout } = {
  CCRO_TEAM: [
    { slotId: "slot-0", widgetId: "action-needed" },
    { slotId: "slot-1", widgetId: "approval-queue" },
    { slotId: "slot-2", widgetId: "risk-posture" },
    { slotId: "slot-3", widgetId: "controls-heartbeat" },
    { slotId: "slot-4", widgetId: "consumer-duty-health" },
    { slotId: "slot-5", widgetId: "horizon-alert" },
    { slotId: "slot-6", widgetId: "action-momentum" },
    { slotId: "slot-7", widgetId: "my-runway" },
    { slotId: "slot-8", widgetId: "risks-in-focus" },
  ],
  CEO: [
    { slotId: "slot-1", widgetId: "risk-posture" },
    { slotId: "slot-2", widgetId: "consumer-duty-health" },
    { slotId: "slot-3", widgetId: "horizon-alert" },
    { slotId: "slot-4", widgetId: "firm-status" },
  ],
  VIEWER: [
    { slotId: "slot-1", widgetId: "risk-posture" },
    { slotId: "slot-2", widgetId: "consumer-duty-health" },
    { slotId: "slot-3", widgetId: "horizon-alert" },
    { slotId: "slot-4", widgetId: "firm-status" },
  ],
  OWNER: [
    { slotId: "slot-1", widgetId: "action-needed" },
    { slotId: "slot-2", widgetId: "my-portfolio" },
    { slotId: "slot-3", widgetId: "my-runway" },
  ],
};

export interface ResolvedSlot extends WidgetSlot {
  hidden: boolean;
  pinned: boolean;
}

/**
 * Merge saved slot order with role defaults.
 * savedSlots: from layoutGrid API (may be empty or partial)
 * hiddenWidgetIds: from hiddenSections API field (bare WidgetId strings)
 * pinnedWidgetIds: from pinnedSections API field (bare WidgetId strings)
 */
export function resolveLayout(
  role: Role,
  savedSlots: WidgetSlot[],
  hiddenWidgetIds: WidgetId[],
  pinnedWidgetIds: WidgetId[] = []
): ResolvedSlot[] {
  const defaults = DEFAULT_LAYOUTS[role as keyof typeof DEFAULT_LAYOUTS] ?? DEFAULT_LAYOUTS.CEO;

  // Drop saved slots whose widgetId no longer exists in the registry (stale ids)
  const validSavedSlots = savedSlots.filter((s) => s.widgetId in WIDGET_REGISTRY);

  // If no saved layout, use defaults in full
  if (!validSavedSlots.length) {
    return defaults.map((slot) => ({
      ...slot,
      hidden: hiddenWidgetIds.includes(slot.widgetId),
      pinned: pinnedWidgetIds.includes(slot.widgetId),
    }));
  }

  // Saved layout present — use saved order, then append any default widgets
  // not present in the saved layout (handles new widgets added after layout was saved)
  const savedWidgetIds = new Set(validSavedSlots.map((s) => s.widgetId));
  const missing = defaults.filter((d) => !savedWidgetIds.has(d.widgetId));
  const base = [...validSavedSlots, ...missing];

  return base.map((slot) => ({
    ...slot,
    hidden: hiddenWidgetIds.includes(slot.widgetId),
    pinned: pinnedWidgetIds.includes(slot.widgetId),
  }));
}

// ── Model B: priority-order + bin-packing ─────────────────────────────────────

/** Role-default priority order for Model B. Highest priority = index 0. */
export const DEFAULT_WIDGET_ORDERS: Partial<Record<Role, WidgetId[]>> & { CEO: WidgetId[]; VIEWER: WidgetId[] } = {
  CCRO_TEAM: ["action-needed", "approval-queue", "risk-posture", "controls-heartbeat", "consumer-duty-health", "horizon-alert", "action-momentum", "my-runway", "risks-in-focus"],
  CEO:       ["risk-posture", "consumer-duty-health", "horizon-alert", "firm-status"],
  VIEWER:    ["risk-posture", "consumer-duty-health", "horizon-alert", "firm-status"],
  OWNER:     ["action-needed", "my-portfolio", "my-runway"],
};

export interface PackedWidget {
  id: WidgetId;
  col: number;    // 0 = left, 1 = right
  top: number;    // px offset from top of grid
  height: number; // px total height of this cell
}

/**
 * Greedy bin-packing: assigns each widget (in priority order) to whichever
 * column is currently shortest, guaranteeing no large column imbalance.
 */
export function binPack(
  orderedIds: WidgetId[],
  heights: Partial<Record<WidgetId, number>>
): { items: PackedWidget[]; totalHeight: number } {
  const colHeights: [number, number] = [0, 0];
  const items: PackedWidget[] = [];

  for (const id of orderedIds) {
    const def = WIDGET_REGISTRY[id];
    if (!def) continue;
    const h = heights[id] ?? def.defaultH;
    const heightPx = h * GRID_ROW_HEIGHT + Math.max(0, h - 1) * GRID_GAP;
    const col: 0 | 1 = colHeights[0] <= colHeights[1] ? 0 : 1;
    items.push({ id, col, top: colHeights[col], height: heightPx });
    colHeights[col] += heightPx + GRID_GAP;
  }

  const maxCol = Math.max(colHeights[0], colHeights[1]);
  return { items, totalHeight: maxCol > 0 ? maxCol - GRID_GAP : 0 };
}

/**
 * Merge a saved widget order with role defaults.
 * - Drops stale IDs no longer in WIDGET_REGISTRY
 * - Appends any new default widgets not yet in the saved order
 */
export function resolveWidgetOrder(
  role: Role,
  savedOrder: WidgetId[] | null,
  hiddenIds: WidgetId[],
  pinnedIds: WidgetId[]
): { order: WidgetId[]; hidden: WidgetId[]; pinned: WidgetId[] } {
  const defaults = DEFAULT_WIDGET_ORDERS[role as keyof typeof DEFAULT_WIDGET_ORDERS] ?? DEFAULT_WIDGET_ORDERS.CEO;
  const validSaved = (savedOrder ?? []).filter((id) => id in WIDGET_REGISTRY);
  const savedSet = new Set(validSaved);
  const merged = validSaved.length > 0
    ? [...validSaved, ...defaults.filter((id) => !savedSet.has(id))]
    : [...defaults];

  return {
    order: merged,
    hidden: hiddenIds.filter((id) => id in WIDGET_REGISTRY) as WidgetId[],
    pinned: pinnedIds.filter((id) => id in WIDGET_REGISTRY) as WidgetId[],
  };
}
