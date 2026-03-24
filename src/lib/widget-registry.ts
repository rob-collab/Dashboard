import type { WidgetId, WidgetSlot, Role } from "@/lib/types";

export interface WidgetDef {
  label: string;
  description: string;
}

export const WIDGET_REGISTRY: Record<WidgetId, WidgetDef> = {
  "approval-queue":       { label: "Approval Queue",       description: "Items awaiting CCRO sign-off" },
  "risk-posture":         { label: "Risk Posture",          description: "Category sparklines vs appetite" },
  "controls-heartbeat":   { label: "Controls Heartbeat",   description: "Waffle grid of latest test results" },
  "consumer-duty-health": { label: "Consumer Duty Health", description: "CD outcome ring by measure count" },
  "horizon-alert":        { label: "Horizon Alert",        description: "Upcoming FCA deadlines and actions" },
  "action-momentum":      { label: "Action Momentum",      description: "P1/P2/P3 volume trend over time" },
  "my-runway":            { label: "My Runway",            description: "30-day personal item timeline" },
  "firm-status":          { label: "Firm Status",          description: "4 independent domain health indicators" },
  "action-needed":        { label: "Action Needed",        description: "Personal overdue items and reviews" },
  "my-portfolio":         { label: "My Portfolio",         description: "Owned risks, controls, and CD measures" },
};

type DefaultLayout = WidgetSlot[];

export const DEFAULT_LAYOUTS: Partial<Record<Role, DefaultLayout>> & { CEO: DefaultLayout; VIEWER: DefaultLayout } = {
  CCRO_TEAM: [
    { slotId: "slot-1", widgetId: "approval-queue" },
    { slotId: "slot-2", widgetId: "risk-posture" },
    { slotId: "slot-3", widgetId: "controls-heartbeat" },
    { slotId: "slot-4", widgetId: "consumer-duty-health" },
    { slotId: "slot-5", widgetId: "horizon-alert" },
    { slotId: "slot-6", widgetId: "action-momentum" },
    { slotId: "slot-7", widgetId: "my-runway" },
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
