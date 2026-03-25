# Design Spec: Dashboard Layout Admin Panel + Swapy Pin Fix

**Date:** 2026-03-25
**Status:** Approved

---

## Overview

Two coordinated deliverables:

1. **Dashboard Layouts admin panel** — a new Settings tab where CCRO can select any user, view their widget grid, drag to reorder widgets, pin (lock) specific widgets, and save. A secondary "Apply to all [Role] users" action bulk-writes a layout across everyone with a given role.

2. **Swapy pin desynch fix** — when a swap is blocked because a pinned widget is involved, Swapy has already physically moved the DOM but React state is unchanged, leaving the grid visually wrong. Fix: detect a pinned-swap in `WidgetGrid` before delegating to `onSwap`, and re-initialise Swapy in-place to reset the visual state.

---

## Design Intent

**Who:** CCRO configuring what other users see on their dashboards.
**One thing:** They must be able to see the user's actual widget grid, drag to rearrange, and lock specific widgets — without leaving Settings.
**Remove:** No live widget data rendered in the admin view — placeholder cards with widget name and description only. This removes data-loading complexity and keeps the intent clear.

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `src/components/settings/DashboardLayoutsPanel.tsx` | The new Settings tab component |
| `src/components/settings/AdminWidgetGrid.tsx` | Read-only-style grid with drag + pin controls, no live data |

### Modified files

| File | Change |
|---|---|
| `src/app/settings/page.tsx` | Add `dashboard-layouts` tab to `TABS` array; add to full-width list; render `<DashboardLayoutsPanel />` |
| `src/components/dashboard/widgets/WidgetGrid.tsx` | Add `slotsRef` + pinned-swap detection in `onSwapEnd`; reinitialise Swapy on blocked swap |

### Unchanged (intentionally)

- `src/app/api/dashboard-layout/route.ts` — already supports all required operations
- `src/lib/widget-registry.ts` — `resolveLayout` already handles new widgets automatically
- `src/hooks/useWidgetLayout.ts` — no changes needed for this sprint

---

## Component: `DashboardLayoutsPanel`

### Responsibilities

- Fetch all active users from `GET /api/users`
- Render a user dropdown (name + role badge)
- On user selection, fetch their layout via `GET /api/dashboard-layout?userId={id}`
- Derive the resolved slot list by calling `resolveLayout(user.role, savedSlots, hiddenIds, pinnedIds)`
- Render `<AdminWidgetGrid>` with the resolved slots
- Provide Save and Apply-to-role actions

### User dropdown

- Source: `GET /api/users` — returns `{ id, name, role }[]`
- Exclude the CCRO's own user (they manage their own view on the dashboard)
- Display: `"Jane Smith  ·  CEO"` — name + role in one line
- On selection: load that user's layout; reset any unsaved local state

### State

```typescript
selectedUserId: string | null
users: { id: string; name: string; role: Role }[]
slots: ResolvedSlot[]           // derived from resolveLayout; drives AdminWidgetGrid
pinnedIds: string[]             // widget IDs currently marked as pinned
isSaving: boolean
isDirty: boolean                // true once user has dragged or toggled a pin
```

`pinnedIds` is kept separate from `slots` to make the save payload explicit. On load, it is initialised from `pinnedSections` in the API response.

### Save action

Calls `PUT /api/dashboard-layout` with:

```json
{
  "targetUserId": "...",
  "layoutGrid": { "slots": [{ "slotId": "...", "widgetId": "..." }, ...] },
  "sectionOrder": ["widgetId", ...],
  "pinnedSections": ["widgetId", ...]
}
```

On success: show a toast "Layout saved for [Name]", set `isDirty = false`.
On error: show a toast "Failed to save layout", leave state unchanged.

### Apply to role action

- Reads `user.role` from the selected user
- Fetches all users with `GET /api/users`, filters to matching role
- Calls `PUT /api/dashboard-layout` for each user in sequence (not parallel, to avoid overwhelming the API)
- Shows a single toast on completion: "Layout applied to all [Role] users ([N] updated)"
- The button label reads: `"Apply to all [Role] users"` — role is dynamic from the selected user

### Reset to default action

- Replaces local `slots` with `DEFAULT_LAYOUTS[role]` mapped to `ResolvedSlot` (all `pinned: false`, `hidden: false`)
- Clears `pinnedIds`
- Sets `isDirty = true` (user still needs to Save to persist)

---

## Component: `AdminWidgetGrid`

### Responsibilities

- Render a 2-column grid of widget preview cards (no live data — name + description only)
- Support drag-to-reorder via Swapy (same library as dashboard — no new dependency)
- Render a "Lock / Locked" toggle on each card
- Pinned cards: no drag handle visible, purple border, "Locked" badge
- Non-pinned cards: drag handle, "Lock" button

### Props

```typescript
interface AdminWidgetGridProps {
  slots: ResolvedSlot[];
  pinnedIds: string[];
  onReorder: (fromSlotId: string, toSlotId: string) => void;
  onTogglePin: (widgetId: string) => void;
}
```

### Widget preview card

Each card shows:
- Widget label from `WIDGET_REGISTRY[widgetId].label`
- Widget description from `WIDGET_REGISTRY[widgetId].description`
- Drag handle (hidden if pinned)
- Lock toggle (active/inactive state)
- Purple border + "Locked" label when `pinnedIds.includes(widgetId)`

Cards do not import or render any actual widget component — they are purely display cards driven by `WIDGET_REGISTRY`.

### Future-proofing

`AdminWidgetGrid` iterates over `slots` which comes from `resolveLayout`. `resolveLayout` reads from `WIDGET_REGISTRY` and `DEFAULT_LAYOUTS`. Adding a new widget to the registry and role defaults is all that is needed — the admin grid picks it up automatically. No changes to `AdminWidgetGrid` or `DashboardLayoutsPanel` are ever needed when the widget library grows.

### Drag (Swapy)

- Initialise Swapy on mount (always active — no edit mode toggle needed in admin context)
- Destroy on unmount
- `onSwapEnd`: derive changed slot pair, call `onReorder(fromSlotId, toSlotId)`
- Pinned slots carry `data-swapy-slot` as usual; Swapy can still physically move them. The `onReorder` callback in `DashboardLayoutsPanel` ignores swaps involving pinned widgets. Because this is an admin view, visual desynch here is acceptable — the grid re-derives from state on re-render anyway. (The Swapy desynch fix below applies to the user-facing dashboard only.)

---

## Swapy Pin Desynch Fix (`WidgetGrid.tsx`)

### Problem

In `onSwapEnd`, `event.hasChanged` is `true` when Swapy moves the DOM. `onSwap` in `useWidgetLayout` returns `prev` (no state update) when a pinned slot is involved. React does not re-render. DOM is in the swapped position; React state shows the original order. The two are out of sync until the user exits and re-enters edit mode.

### Fix

Add a `slotsRef` to `WidgetGrid` that stays current:

```typescript
const slotsRef = useRef(slots);
useEffect(() => { slotsRef.current = slots; }, [slots]);
```

In `onSwapEnd`, before calling `onSwapRef.current`, check whether either changed slot belongs to a pinned widget:

```typescript
const isPinnedSwap = changed.some(
  (slotId) => slotsRef.current.find((s) => s.slotId === slotId)?.pinned
);

if (isPinnedSwap) {
  // Re-initialise Swapy to restore visual state from current DOM
  swapyRef.current?.destroy();
  swapyRef.current = createSwapy(containerRef.current!, { animation: "dynamic" });
  swapyRef.current.onSwapEnd(handleSwapEnd); // handleSwapEnd extracted to a named ref
  return;
}

onSwapRef.current(changed[0], changed[1]);
```

`handleSwapEnd` is extracted into a `useRef<(event: SwapEndEvent) => void>` and assigned before the Swapy initialisation, so re-registering after destroy does not create a circular dependency.

---

## Settings Page Integration

`src/app/settings/page.tsx` changes:

1. Add `{ id: "dashboard-layouts", label: "Dashboard Layouts" }` to `TABS`
2. Add `"dashboard-layouts"` to `FULL_WIDTH_TABS` (the panel needs full width for the grid)
3. Add `import DashboardLayoutsPanel from "@/components/settings/DashboardLayoutsPanel"`
4. Add `{activeTab === "dashboard-layouts" && <DashboardLayoutsPanel />}` to the tab content block
5. The tab is visible to all roles in the tab bar — this matches the existing pattern where no tab is hidden from the Settings nav; `AccessRequestsPanel` uses the same approach. `DashboardLayoutsPanel` renders a "You do not have permission to configure layouts" message for non-CCRO users. API calls enforce CCRO access server-side regardless.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `GET /api/users` fails | Show error state in dropdown: "Could not load users" |
| `GET /api/dashboard-layout?userId=...` fails | Show error state in grid: "Could not load layout for this user" — Reset to default still available |
| `PUT /api/dashboard-layout` fails | Toast error, `isDirty` remains true so user can retry |
| Apply-to-role partial failure | Toast: "Applied to [N] of [M] users — [X] failed" |
| Selected user has no saved layout | Falls back to `DEFAULT_LAYOUTS[role]` via `resolveLayout` — grid shows role default |

---

## Permissions

- `DashboardLayoutsPanel` wraps its content in a check against `useHasPermission("page:settings")` — same guard as the rest of Settings
- Save and Apply-to-role calls hit `PUT /api/dashboard-layout` which already enforces CCRO role server-side via `requireCCRORole`
- Non-CCRO users navigating to `?tab=dashboard-layouts` will see the tab but the panel renders a "You do not have permission to configure layouts" message

---

## Testing

| Test | Location |
|---|---|
| `AdminWidgetGrid` renders all slots from `resolveLayout` output | Component test |
| Pinned widget: no drag handle visible, "Locked" badge present | Component test |
| `onTogglePin` called when Lock button clicked | Component test |
| `onReorder` called with correct slot IDs after simulated swap | Component test |
| `DashboardLayoutsPanel` loads users on mount | Integration test |
| Save builds correct payload including `pinnedSections` | Integration test |
| Apply-to-role calls API once per matching user | Integration test |
| Swapy re-initialises after blocked pin swap in `WidgetGrid` | Unit test on `WidgetGrid` |
| New widget added to registry appears in admin grid without code change | `widget-registry.test.ts` — extend existing registry coverage test |
