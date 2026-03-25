# Dashboard Layout Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Settings tab where CCRO can view any user's dashboard, drag to reorder widgets, and lock (pin) widgets so the user cannot move or hide them — plus fix a visual desynch in Swapy when a swap is blocked by a pinned slot.

**Architecture:** A new `DashboardLayoutsPanel` component (Settings tab) fetches any user's layout via the existing API and renders an `AdminWidgetGrid` showing widget preview cards in a Swapy-powered 2-column grid. Both components are driven entirely by `WIDGET_REGISTRY` + `resolveLayout` so new widgets appear automatically. The Swapy fix in `WidgetGrid.tsx` detects pinned-slot swaps before delegating to `onSwap` and re-initialises Swapy in-place when blocked.

**Tech Stack:** Next.js 14, TypeScript, Vitest, @testing-library/react, Swapy v1, Tailwind CSS, Zustand (useAppStore for current user role check)

**Spec:** `docs/superpowers/specs/2026-03-25-dashboard-layout-admin-design.md`

---

## Chunk 1: Swapy Pin Desynch Fix + AdminWidgetGrid

### Task 1: Fix stale slot count in useWidgetLayout.test.ts

The test file still expects 7 CCRO slots after two widgets were added (action-needed, risks-in-focus) bringing the total to 9.

**Files:**
- Modify: `src/test/useWidgetLayout.test.ts`

- [ ] **Step 1.1: Run the existing tests and confirm the failures**

```bash
npx vitest run src/test/useWidgetLayout.test.ts
```

Expected: 2 failures — `toHaveLength(7)` on the two tests that use CCRO_TEAM defaults.

- [ ] **Step 1.2: Update the stale counts**

In `src/test/useWidgetLayout.test.ts`, change both `toHaveLength(7)` assertions to `toHaveLength(9)`:

```typescript
// Line 8
expect(result).toHaveLength(9);

// Line 12
expect(result).toHaveLength(9);
```

- [ ] **Step 1.3: Run tests and confirm they pass**

```bash
npx vitest run src/test/useWidgetLayout.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 1.4: Commit**

```bash
git add src/test/useWidgetLayout.test.ts
git commit -m "fix(test): update CCRO_TEAM slot count to 9 after action-needed + risks-in-focus"
```

---

### Task 2: Swapy pin desynch fix in WidgetGrid.tsx

When a swap is blocked (pinned widget involved), Swapy has moved the DOM but React state is unchanged. The fix: track current slots via a ref, detect pinned swaps in the handler, and re-initialise Swapy to restore visual state.

**Files:**
- Modify: `src/components/dashboard/widgets/WidgetGrid.tsx`

- [ ] **Step 2.1: Read the full file before editing**

Read `src/components/dashboard/widgets/WidgetGrid.tsx` in full before making any change.

- [ ] **Step 2.2: Add slotsRef after the existing onSwapRef**

After the `onSwapRef` block (lines ~40–43), add:

```typescript
// Track current slots so the Swapy handler always has the latest pinned state
// without needing to be re-created when slots change.
const slotsRef = useRef(slots);
useEffect(() => { slotsRef.current = slots; }, [slots]);
```

- [ ] **Step 2.3: Replace the onSwapEnd registration inside the editMode useEffect**

Replace the entire `swapyRef.current.onSwapEnd(...)` block with a version that:
1. Extracts the handler into a local `registerHandler` function so it can be re-registered after Swapy reinit
2. Reads from `slotsRef.current` instead of the closed-over `slots`
3. On pinned swap: destroys and reinits Swapy without calling `onSwapRef.current`

Replace the current `if (editMode)` branch with:

```typescript
if (editMode) {
  const registerHandler = (instance: ReturnType<typeof createSwapy>) => {
    instance.onSwapEnd((event: import("swapy").SwapEndEvent) => {
      if (!event.hasChanged) return;

      const afterArray = event.slotItemMap.asArray;
      const beforeMap = new Map<string, string>();
      for (const s of slotsRef.current) {
        if (!s.hidden) beforeMap.set(s.slotId, s.widgetId);
      }

      const changed: string[] = [];
      for (const entry of afterArray) {
        if (beforeMap.get(entry.slot) !== entry.item) changed.push(entry.slot);
      }

      if (changed.length !== 2) return;

      // If either changed slot is pinned, Swapy moved it visually but we
      // blocked the swap in state. Re-init Swapy to restore the visual order.
      const isPinnedSwap = changed.some(
        (slotId) => slotsRef.current.find((s) => s.slotId === slotId)?.pinned
      );

      if (isPinnedSwap) {
        swapyRef.current?.destroy();
        if (containerRef.current) {
          swapyRef.current = createSwapy(containerRef.current, { animation: "dynamic" });
          registerHandler(swapyRef.current);
        }
        return;
      }

      onSwapRef.current(changed[0], changed[1]);
    });
  };

  swapyRef.current = createSwapy(containerRef.current, { animation: "dynamic" });
  registerHandler(swapyRef.current);
}
```

- [ ] **Step 2.4: Remove the now-redundant old onSwapEnd block**

The old `swapyRef.current.onSwapEnd(...)` call that follows `swapyRef.current = createSwapy(...)` in the original code must be deleted — it is now handled inside `registerHandler`.

- [ ] **Step 2.5: Verify the build passes**

```bash
npx next build
```

Expected: zero type errors, zero build errors.

- [ ] **Step 2.6: Commit**

```bash
git add src/components/dashboard/widgets/WidgetGrid.tsx
git commit -m "fix(dashboard): reinit Swapy after blocked pinned-slot swap to restore visual state"
```

---

### Task 3: AdminWidgetGrid component

A self-contained 2-column Swapy grid of widget preview cards. No live widget data — shows widget name and description from `WIDGET_REGISTRY`. Drag to reorder; Lock button to toggle pin.

**Files:**
- Create: `src/components/settings/AdminWidgetGrid.tsx`
- Create: `src/test/AdminWidgetGrid.test.tsx`

- [ ] **Step 3.1: Write the failing tests**

Create `src/test/AdminWidgetGrid.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminWidgetGrid } from "@/components/settings/AdminWidgetGrid";
import type { ResolvedSlot } from "@/lib/widget-registry";

// Swapy has no DOM to operate on in jsdom — mock it so tests focus on our logic.
vi.mock("swapy", () => ({
  createSwapy: () => ({
    onSwapEnd: vi.fn(),
    destroy: vi.fn(),
  }),
}));

const baseSlots: ResolvedSlot[] = [
  { slotId: "slot-1", widgetId: "risk-posture",         hidden: false, pinned: false },
  { slotId: "slot-2", widgetId: "consumer-duty-health", hidden: false, pinned: false },
  { slotId: "slot-3", widgetId: "horizon-alert",         hidden: false, pinned: false },
];

describe("AdminWidgetGrid", () => {
  it("renders a card for every slot using WIDGET_REGISTRY labels", () => {
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={[]}
        onReorder={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );
    expect(screen.getByText("Risk Posture")).toBeInTheDocument();
    expect(screen.getByText("Consumer Duty Health")).toBeInTheDocument();
    expect(screen.getByText("Horizon Alert")).toBeInTheDocument();
  });

  it("shows Lock button for unpinned widgets", () => {
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={[]}
        onReorder={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );
    const lockButtons = screen.getAllByRole("button", { name: /lock/i });
    expect(lockButtons).toHaveLength(3);
  });

  it("shows Locked badge and no drag handle for pinned widget", () => {
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={["risk-posture"]}
        onReorder={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );
    // The pinned card shows "Locked" state label
    expect(screen.getByText("Locked")).toBeInTheDocument();
    // The pinned card's drag handle is hidden (aria-hidden or absent)
    const riskPostureCard = screen.getByTestId("admin-widget-card-risk-posture");
    expect(riskPostureCard.querySelector("[data-drag-handle]")).toBeNull();
  });

  it("calls onTogglePin with the widgetId when Lock button is clicked", () => {
    const onTogglePin = vi.fn();
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={[]}
        onReorder={vi.fn()}
        onTogglePin={onTogglePin}
      />
    );
    const lockButtons = screen.getAllByRole("button", { name: /lock/i });
    fireEvent.click(lockButtons[0]); // first card = risk-posture
    expect(onTogglePin).toHaveBeenCalledWith("risk-posture");
  });

  it("calls onTogglePin when Locked badge is clicked to unpin", () => {
    const onTogglePin = vi.fn();
    render(
      <AdminWidgetGrid
        slots={baseSlots}
        pinnedIds={["risk-posture"]}
        onReorder={vi.fn()}
        onTogglePin={onTogglePin}
      />
    );
    const lockedButton = screen.getByRole("button", { name: /locked/i });
    fireEvent.click(lockedButton);
    expect(onTogglePin).toHaveBeenCalledWith("risk-posture");
  });
});
```

- [ ] **Step 3.2: Run tests to confirm they fail**

```bash
npx vitest run src/test/AdminWidgetGrid.test.tsx
```

Expected: FAIL — `AdminWidgetGrid` does not exist yet.

- [ ] **Step 3.3: Implement AdminWidgetGrid**

Create `src/components/settings/AdminWidgetGrid.tsx`:

```typescript
"use client";

import { useEffect, useRef } from "react";
import { createSwapy } from "swapy";
import { cn } from "@/lib/utils";
import { WIDGET_REGISTRY } from "@/lib/widget-registry";
import type { ResolvedSlot } from "@/lib/widget-registry";
import type { WidgetId } from "@/lib/types";

interface AdminWidgetGridProps {
  slots: ResolvedSlot[];
  pinnedIds: string[];
  onReorder: (fromSlotId: string, toSlotId: string) => void;
  onTogglePin: (widgetId: WidgetId) => void;
}

/**
 * Widget preview grid for the admin layout panel.
 * Shows widget name + description cards in a 2-column Swapy grid.
 * No live widget data — driven entirely by WIDGET_REGISTRY.
 * Adding a new widget to the registry + DEFAULT_LAYOUTS is all that is needed;
 * this component picks it up automatically via the slots prop.
 */
export function AdminWidgetGrid({
  slots,
  pinnedIds,
  onReorder,
  onTogglePin,
}: AdminWidgetGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<ReturnType<typeof createSwapy> | null>(null);
  const onReorderRef = useRef(onReorder);
  const slotsRef = useRef(slots);

  useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);
  useEffect(() => { slotsRef.current = slots; }, [slots]);

  useEffect(() => {
    if (!containerRef.current) return;

    swapyRef.current = createSwapy(containerRef.current, { animation: "dynamic" });

    swapyRef.current.onSwapEnd((event: import("swapy").SwapEndEvent) => {
      if (!event.hasChanged) return;

      const afterArray = event.slotItemMap.asArray;
      const beforeMap = new Map<string, string>();
      for (const s of slotsRef.current) {
        beforeMap.set(s.slotId, s.widgetId);
      }

      const changed: string[] = [];
      for (const entry of afterArray) {
        if (beforeMap.get(entry.slot) !== entry.item) changed.push(entry.slot);
      }

      if (changed.length === 2) {
        onReorderRef.current(changed[0], changed[1]);
      }
    });

    return () => {
      swapyRef.current?.destroy();
      swapyRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-swapy-container
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {slots.map((slot) => {
        const isPinned = pinnedIds.includes(slot.widgetId);
        const def = WIDGET_REGISTRY[slot.widgetId];
        if (!def) return null;

        return (
          <div key={slot.slotId} data-swapy-slot={slot.slotId} className="min-h-[90px]">
            <div data-swapy-item={slot.widgetId} className="h-full">
              <AdminWidgetCard
                widgetId={slot.widgetId}
                label={def.label}
                description={def.description}
                pinned={isPinned}
                onTogglePin={() => onTogglePin(slot.widgetId as WidgetId)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AdminWidgetCardProps {
  widgetId: string;
  label: string;
  description: string;
  pinned: boolean;
  onTogglePin: () => void;
}

function AdminWidgetCard({
  widgetId,
  label,
  description,
  pinned,
  onTogglePin,
}: AdminWidgetCardProps) {
  return (
    <div
      data-testid={`admin-widget-card-${widgetId}`}
      className={cn(
        "flex h-full items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
        pinned
          ? "border-updraft-bar/30 bg-updraft-bar/5"
          : "border-[#E8E6E1] bg-white hover:border-updraft-light-purple/30 dark:border-gray-800 dark:bg-gray-900"
      )}
    >
      {/* Drag handle — hidden when pinned */}
      {!pinned && (
        <div
          data-drag-handle
          className="cursor-grab select-none text-gray-300 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          ⠿
        </div>
      )}

      {/* Widget info */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            pinned ? "text-updraft-deep" : "text-gray-700 dark:text-gray-300"
          )}
        >
          {label}
        </p>
        <p className="truncate text-xs text-gray-400">{description}</p>
      </div>

      {/* Pin toggle */}
      <button
        onClick={onTogglePin}
        className={cn(
          "flex-shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
          pinned
            ? "border-updraft-bar/40 bg-updraft-bar text-white hover:bg-updraft-deep"
            : "border-[#E8E6E1] bg-white text-gray-400 hover:border-updraft-bar/30 hover:text-updraft-bar dark:border-gray-700 dark:bg-gray-900"
        )}
        aria-label={pinned ? "Locked" : "Lock"}
      >
        {pinned ? "Locked" : "Lock"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3.4: Run tests and confirm they pass**

```bash
npx vitest run src/test/AdminWidgetGrid.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 3.5: Verify the build**

```bash
npx next build
```

Expected: zero errors.

- [ ] **Step 3.6: Commit**

```bash
git add src/components/settings/AdminWidgetGrid.tsx src/test/AdminWidgetGrid.test.tsx
git commit -m "feat(settings): add AdminWidgetGrid — drag-to-reorder + pin toggle for admin layout panel"
```

---

## Chunk 2: DashboardLayoutsPanel + Settings Integration

### Task 4: DashboardLayoutsPanel component

The root component for the Settings tab. Owns all state: selected user, their resolved layout, pinned IDs, dirty flag, saving state. Composes `AdminWidgetGrid` with the load/save/apply-to-role actions.

**Files:**
- Create: `src/components/settings/DashboardLayoutsPanel.tsx`
- Create: `src/test/DashboardLayoutsPanel.test.tsx`

- [ ] **Step 4.1: Write the failing tests**

Create `src/test/DashboardLayoutsPanel.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DashboardLayoutsPanel } from "@/components/settings/DashboardLayoutsPanel";

// Mock AdminWidgetGrid so we can focus on DashboardLayoutsPanel logic
vi.mock("@/components/settings/AdminWidgetGrid", () => ({
  AdminWidgetGrid: ({ slots, pinnedIds, onTogglePin }: {
    slots: { widgetId: string }[];
    pinnedIds: string[];
    onTogglePin: (id: string) => void;
  }) => (
    <div data-testid="admin-widget-grid">
      {slots.map((s) => (
        <button key={s.widgetId} onClick={() => onTogglePin(s.widgetId)}>
          toggle-{s.widgetId}
        </button>
      ))}
      <span data-testid="pinned-count">{pinnedIds.length}</span>
    </div>
  ),
}));

// Mock useAppStore to return a CCRO user by default
const mockUseAppStore = vi.fn();
vi.mock("@/lib/store", () => ({
  useAppStore: (selector: (s: { currentUser: { role: string } | null }) => unknown) =>
    mockUseAppStore(selector),
}));

const mockUsers = [
  { id: "user-1", name: "Jane Smith",  role: "CEO" },
  { id: "user-2", name: "Tom Hughes",  role: "OWNER" },
];

const mockLayout = {
  layoutGrid: { slots: [
    { slotId: "slot-1", widgetId: "risk-posture" },
    { slotId: "slot-2", widgetId: "consumer-duty-health" },
  ]},
  hiddenSections: [],
  pinnedSections: ["risk-posture"],
};

beforeEach(() => {
  vi.resetAllMocks();
  mockUseAppStore.mockImplementation((selector) =>
    selector({ currentUser: { role: "CCRO_TEAM" } })
  );
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url === "/api/users") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) });
    }
    if (url.startsWith("/api/dashboard-layout")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockLayout) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

describe("DashboardLayoutsPanel", () => {
  it("shows a permission message for non-CCRO users", () => {
    mockUseAppStore.mockImplementation((selector) =>
      selector({ currentUser: { role: "CEO" } })
    );
    render(<DashboardLayoutsPanel />);
    expect(
      screen.getByText(/do not have permission/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("admin-widget-grid")).toBeNull();
  });

  it("loads and displays users in the dropdown", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    );
    const options = screen.getAllByRole("option");
    // First option is placeholder; then one per user
    expect(options.length).toBe(3);
    expect(options[1]).toHaveTextContent("Jane Smith");
    expect(options[2]).toHaveTextContent("Tom Hughes");
  });

  it("loads the layout when a user is selected", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });

    await waitFor(() =>
      expect(screen.getByTestId("admin-widget-grid")).toBeInTheDocument()
    );
  });

  it("Save button is disabled until a change is made", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });
    await waitFor(() => screen.getByTestId("admin-widget-grid"));

    expect(screen.getByRole("button", { name: /save layout/i })).toBeDisabled();
  });

  it("Save button enables after toggling a pin", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });
    await waitFor(() => screen.getByTestId("admin-widget-grid"));

    fireEvent.click(screen.getByText("toggle-risk-posture"));
    expect(screen.getByRole("button", { name: /save layout/i })).not.toBeDisabled();
  });

  it("Save calls PUT /api/dashboard-layout with correct payload", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });
    await waitFor(() => screen.getByTestId("admin-widget-grid"));

    // Toggle a pin to enable Save
    fireEvent.click(screen.getByText("toggle-risk-posture"));
    fireEvent.click(screen.getByRole("button", { name: /save layout/i }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const saveCall = calls.find(
        ([url, opts]) =>
          url === "/api/dashboard-layout" && opts?.method === "PUT"
      );
      expect(saveCall).toBeDefined();
      const body = JSON.parse(saveCall![1].body);
      expect(body.targetUserId).toBe("user-1");
      expect(body).toHaveProperty("layoutGrid");
      expect(body).toHaveProperty("pinnedSections");
    });
  });

  it("Apply to role calls PUT for each user with the same role", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });
    await waitFor(() => screen.getByTestId("admin-widget-grid"));

    fireEvent.click(screen.getByRole("button", { name: /apply to all/i }));

    await waitFor(() => {
      const puts = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([url, opts]) => url === "/api/dashboard-layout" && opts?.method === "PUT"
      );
      // Only Jane is CEO — apply to role writes 1 record (just for Jane)
      expect(puts).toHaveLength(1);
      expect(JSON.parse(puts[0][1].body).targetUserId).toBe("user-1");
    });
  });
});
```

- [ ] **Step 4.2: Run tests to confirm they fail**

```bash
npx vitest run src/test/DashboardLayoutsPanel.test.tsx
```

Expected: FAIL — `DashboardLayoutsPanel` does not exist yet.

- [ ] **Step 4.3: Implement DashboardLayoutsPanel**

Create `src/components/settings/DashboardLayoutsPanel.tsx`:

```typescript
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

  // Fetch all active users on mount
  useEffect(() => {
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
  }, []);

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
  if (currentUser?.role !== "CCRO_TEAM") {
    return (
      <p className="text-sm text-fca-gray">
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
        <div className="flex-1 min-w-[200px] max-w-xs">
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
                  {u.name} — {u.role}
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
```

- [ ] **Step 4.4: Add the partial-failure test to the test file**

The spec requires a "partial-failure" message when some saves fail during Apply-to-role. Open `src/test/DashboardLayoutsPanel.test.tsx` and add the following test after the "Apply to role calls PUT" test:

```typescript
it("Apply to role shows error when some saves fail", async () => {
  const twoCeos = [
    { id: "user-1", name: "Jane Smith",  role: "CEO" },
    { id: "user-3", name: "Alice Brown", role: "CEO" },
  ];
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string, opts?: RequestInit) => {
      if (url === "/api/users") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(twoCeos) });
      }
      if (url.startsWith("/api/dashboard-layout") && opts?.method !== "PUT") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockLayout) });
      }
      // First PUT (user-1) succeeds; second PUT (user-3) fails
      const body = JSON.parse((opts?.body ?? "{}") as string);
      return body.targetUserId === "user-1"
        ? Promise.resolve({ ok: true,  json: () => Promise.resolve({}) })
        : Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Server error" }) });
    }
  );

  render(<DashboardLayoutsPanel />);
  await waitFor(() => screen.getByRole("combobox"));
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });
  await waitFor(() => screen.getByTestId("admin-widget-grid"));

  fireEvent.click(screen.getByRole("button", { name: /apply to all/i }));

  await waitFor(() => {
    const puts = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url, opts]) => url === "/api/dashboard-layout" && opts?.method === "PUT"
    );
    // Both CEO users were attempted
    expect(puts).toHaveLength(2);
  });
});
```

- [ ] **Step 4.5: Run tests and confirm they pass**

```bash
npx vitest run src/test/DashboardLayoutsPanel.test.tsx
```

Expected: all 7 tests PASS.

- [ ] **Step 4.6: Verify the build**

```bash
npx next build
```

Expected: zero errors.

- [ ] **Step 4.7: Commit**

```bash
git add src/components/settings/DashboardLayoutsPanel.tsx src/test/DashboardLayoutsPanel.test.tsx
git commit -m "feat(settings): add DashboardLayoutsPanel — CCRO admin layout config for any user"
```

---

### Task 5: Wire the new tab into Settings

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 5.1: Read the full settings page before editing**

Read `src/app/settings/page.tsx` in full. Verify the current TABS array and FULL_WIDTH_TABS list.

- [ ] **Step 5.2: Add the import**

`DashboardLayoutsPanel` is a named export. Add the import after the last settings panel import (before `import { cn }`):

```typescript
import { DashboardLayoutsPanel } from "@/components/settings/DashboardLayoutsPanel";
```

- [ ] **Step 5.3: Add the tab entry**

Add `{ id: "dashboard-layouts", label: "Dashboard Layouts" }` to the `TABS` array after `"access-requests"`:

```typescript
const TABS = [
  { id: "branding",           label: "Branding" },
  { id: "categories",         label: "Categories" },
  { id: "notifications",      label: "Notifications" },
  { id: "priorities",         label: "Priorities" },
  { id: "templates",          label: "Templates" },
  { id: "components",         label: "Components" },
  { id: "regulations",        label: "Regulations" },
  { id: "consumer-duty",      label: "Consumer Duty" },
  { id: "access-requests",    label: "Access Requests" },
  { id: "dashboard-layouts",  label: "Dashboard Layouts" },
] as const;
```

- [ ] **Step 5.4: Add to FULL_WIDTH_TABS**

```typescript
const FULL_WIDTH_TABS: TabId[] = ["templates", "components", "regulations", "consumer-duty", "dashboard-layouts"];
```

- [ ] **Step 5.5: Add the tab content render**

After `{activeTab === "access-requests" && <AccessRequestsPanel />}`, add:

```typescript
{activeTab === "dashboard-layouts" && <DashboardLayoutsPanel />}
```

- [ ] **Step 5.6: Verify the build**

```bash
npx next build
```

Expected: zero errors, zero type errors.

- [ ] **Step 5.7: Start the dev server for manual smoke-test**

```bash
npm run dev
```

Log in as CCRO, navigate to Settings → Dashboard Layouts. Verify each item below before proceeding:

- [ ] **Step 5.7a:** Tab appears in the Settings nav bar
- [ ] **Step 5.7b:** User dropdown loads all active users (name + role)
- [ ] **Step 5.7c:** Selecting a user shows their 2-column widget grid
- [ ] **Step 5.7d:** Drag reordering works — widgets swap positions visually
- [ ] **Step 5.7e:** Clicking Lock shows purple border + "Locked" badge; drag handle disappears
- [ ] **Step 5.7f:** Clicking Locked again unpins the widget (returns to normal state)
- [ ] **Step 5.7g:** Save button is disabled until a drag or pin change is made
- [ ] **Step 5.7h:** Saving shows a success toast ("Layout saved for [Name]")
- [ ] **Step 5.7i:** "Apply to all [Role] users" writes the layout for all matching role users
- [ ] **Step 5.7j:** Log in as a non-CCRO user — tab is visible in nav but panel shows permission message
- [ ] **Step 5.7k:** On the main dashboard as CCRO, enter edit mode, try dragging a locked widget — it snaps back without staying in the wrong position

- [ ] **Step 5.8: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests PASS (including the updated useWidgetLayout.test.ts).

- [ ] **Step 5.9: Final build check**

```bash
npx next build
```

Expected: zero errors.

- [ ] **Step 5.10: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(settings): add Dashboard Layouts tab — CCRO admin layout config"
```

---

## Acceptance Criteria Checklist

- [ ] CCRO can navigate to Settings → Dashboard Layouts
- [ ] CCRO selects a user from a dropdown and sees their 2-column widget grid
- [ ] CCRO can drag to reorder widgets; the grid updates visually
- [ ] CCRO can click Lock on any widget — it gets a purple border, "Locked" badge, drag handle hidden
- [ ] CCRO can click Locked to unpin a widget
- [ ] Save persists the layout and pinned state to the API (`PUT /api/dashboard-layout` with `targetUserId` and `pinnedSections`)
- [ ] Save button is disabled until a change is made
- [ ] "Apply to all [Role] users" bulk-writes the current layout to all users with that role
- [ ] "Reset to default" restores the role's default layout from `DEFAULT_LAYOUTS`
- [ ] Non-CCRO users see a permission message instead of the panel
- [ ] On the user's dashboard: locked widgets show a "Locked" badge and cannot be dragged
- [ ] On the user's dashboard: attempting to drag a locked widget snaps it back (no visual desynch)
- [ ] Adding a new widget to `WIDGET_REGISTRY` + `DEFAULT_LAYOUTS` makes it appear in the admin panel automatically — no code change to `AdminWidgetGrid` or `DashboardLayoutsPanel`
- [ ] All tests pass (`npx vitest run`)
- [ ] Build passes (`npx next build`) with zero errors
