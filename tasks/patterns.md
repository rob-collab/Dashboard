# Reusable Patterns

Stable patterns confirmed to work well in this codebase. Serves two purposes:
1. **Design contract** — parallel sessions read this before touching shared surfaces
2. **Reusable wins** — promoted W-series entries from lessons.md

Review before starting any new screen, component, or data feature.

---

## DESIGN CONTRACT (shared by all parallel sessions)

> **Rule for parallel sessions:** Do NOT change anything in this section without first
> syncing with the lead session. Changes here have app-wide blast radius.
> When in doubt, ask — do not implement.

---

### D001 — Brand Colour System

| Token | Hex | Usage |
|---|---|---|
| `updraft-deep` | `#311B92` | Headings, active sidebar items, heavy emphasis |
| `updraft-bar` | `#673AB7` | Primary buttons, icon accents, active borders |
| `updraft-dark-purple` | `#4A148C` | Extra heavy emphasis, rarely used directly |
| `updraft-bright-purple` | `#7B1FA2` | Focus rings, hover states, button hovers |
| `updraft-medium-purple` | `#9C27B0` | Gradient midpoint |
| `updraft-light-purple` | `#BA68C8` | Subtle backgrounds, secondary accents |
| `updraft-pale-purple` | `#E1BEE7` | Highlight animations, very light tints |

**Risk/RAG colours:**

| Token | Hex | Usage |
|---|---|---|
| `risk-green` | `#10B981` | GOOD status — text, bg, borders |
| `risk-amber` | `#F59E0B` | WARNING status — text, bg, borders |
| `risk-red` | `#DC2626` | HARM status — text, bg, borders |

**Surface CSS variables (from globals.css):**

```css
--background:    #F8F7F4   /* page background */
--surface-warm:  #FEFDFB   /* card/panel bg */
--surface-muted: #F8F7F4   /* secondary backgrounds */
--border-warm:   #E8E6E1   /* card borders */
--foreground:    #1A1A2E   /* primary text */
--text-secondary:#6B6B6B   /* secondary text */
```

**File:** `tailwind.config.ts` (lines 11–25)

---

### D002 — Typography System

| Class | Font | Weight | Use |
|---|---|---|---|
| `font-poppins` | Plus Jakarta Sans | 500–800 | Headings, modal titles, section labels, card titles |
| `font-inter` (default) | DM Sans | 400–700 | Body text, table content, form labels, descriptions |

**Standard heading combos:**
- Page title: `text-xl font-bold text-gray-900 font-poppins`
- Section heading: `text-base font-semibold text-gray-900 font-poppins`
- Panel title: `text-lg font-semibold text-gray-900 font-poppins`
- Card title: `text-sm font-semibold text-gray-900`
- Body: `text-sm text-gray-600`
- Muted/secondary: `text-xs text-gray-500`

**File:** `src/app/globals.css` (lines 5, 20), `tailwind.config.ts` (lines 39–42)

---

### D003 — Component Sizing & Spacing Contract

**Standard padding:**
- Card/panel content: `p-6`
- Panel/modal header: `px-6 py-4`
- Panel/modal footer: `px-6 py-3`
- Table cell: `px-3 py-2`
- Input field: `px-3 py-1.5` (sm) or `px-3 py-2` (md)

**Standard gaps:**
- Tight (icon + label): `gap-2`
- Item list: `gap-3`
- Section spacing: `gap-4`
- Large sections: `gap-6`

**Width patterns:**
- Sidebar (collapsed/expanded): `w-64` / `w-80`
- Slide-out detail panel: `w-96` (24rem)
- Large panel: `w-[32rem]` or `max-w-2xl`
- Max page content: `max-w-7xl`

**Height patterns:**
- Modal max height: `max-h-[90vh]`
- Scrollable area: must have `min-h-0` in flex context
- Never set a fixed height on content panels — let content dictate

---

### D004 — Bento Card Pattern

Every summary/stat card MUST be an interactive filter, not a read-only display.
See CLAUDE.md — this is a non-negotiable product requirement.

**CSS class:** `.bento-card` (defined in `src/app/globals.css` lines 114–133)
- Warm surface (`#FEFDFB`), warm border (`#E8E6E1`)
- Layered box-shadow (depth effect)
- Hover: `-translate-y-0.5` + elevated shadow

**Standard card structure:**
```tsx
<div className="bento-card">
  <div className="flex items-center gap-2 mb-2">
    <Icon size={18} className="text-updraft-bar" />
    <h3 className="text-sm font-semibold text-gray-900">Label</h3>
  </div>
  <div className="text-2xl font-bold text-risk-green">42</div>
</div>
```

**Interactive (filter) card — selected state:**
```tsx
<div className={cn(
  "bento-card cursor-pointer text-left border-l-[3px] border-l-risk-green",
  isSelected && "ring-2 ring-risk-green/40 bg-risk-green/5"
)}>
```

Use `risk-green / risk-amber / risk-red / updraft-bar` for the left border accent.

---

### D005 — Button Variants

**Component:** `src/components/common/Button.tsx`

| Variant | Usage | Classes |
|---|---|---|
| `primary` | Main CTA | `bg-updraft-bar text-white hover:bg-updraft-bright-purple` |
| `secondary` | Secondary action | `bg-white text-gray-700 border border-gray-200 hover:bg-gray-50` |
| `danger` | Destructive action | `bg-risk-red text-white hover:bg-red-700` |
| `ghost` | Low-emphasis action | `bg-transparent text-gray-600 hover:bg-gray-100` |

**Sizes:** `sm` (`px-3 py-1.5 text-xs`), `md` (`px-4 py-2 text-sm`), `lg` (`px-5 py-2.5 text-base`)

**Never** build ad-hoc button styles — always use the `<Button>` component.

---

### D006 — Modal Pattern

**Component:** `src/components/common/Modal.tsx`

| Size prop | Max-width | Use for |
|---|---|---|
| `sm` | `max-w-sm` (384px) | Confirmations, simple prompts |
| `md` | `max-w-lg` (512px) | Standard forms |
| `lg` | `max-w-2xl` (672px) | Complex forms, multi-field |
| `xl` | `max-w-4xl` (896px) | Tables, bulk editors, previews |

Features: focus trap, Escape to close, ARIA labels, `max-h-[90vh]` with scrollable content area.

**Never** build an inline overlay/modal from scratch — always use `<Modal>`.
**Never** apply `backdrop-filter: blur()` to the inner modal panel (L016).

---

### D007 — Slide-Out Panel Pattern

**Component:** `src/components/motion/MotionSlidePanel.tsx`

- Spring animation: `stiffness: 320, damping: 30`
- Slides from right (`x: "100%"` → `x: 0`)
- Standard panel surface: `.panel-surface` class (frosted glass, no border/radius/padding)

**Panel internal structure (required):**
```tsx
{/* Header */}
<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
  <h2 className="text-lg font-semibold text-gray-900 font-poppins">{title}</h2>
  <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100">
    <X size={18} />
  </button>
</div>

{/* Scrollable content */}
<div className="px-6 py-4 flex-1 overflow-y-auto min-h-0">
  {children}
</div>

{/* Footer */}
<div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3 bg-gray-50 shrink-0">
  {actions}
</div>
```

**Width:** default `w-96`. Use `w-[32rem]` for panels with richer content.

---

### D008 — Form / Input Pattern

**Standard input:**
```tsx
<input
  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg
             focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 bg-white
             disabled:bg-slate-50 disabled:text-slate-600"
/>
```

**Textarea:** use `<AutoResizeTextarea>` from `src/components/common/AutoResizeTextarea.tsx`
(expands with content — never set a fixed height on textareas).

**Select:** `w-full rounded-lg border border-gray-200 px-3 py-2 text-sm`

**Searchable select:** use `<SearchableSelect>` from `src/components/common/SearchableSelect.tsx`

**Error state:** `border-red-500 focus:ring-red-500` + `<p className="text-xs text-red-600 mt-1">message</p>`

**Field label:** `<label className="text-xs font-medium text-gray-700">`

---

### D009 — Status / Badge Pattern

**RAG status:** use `<RAGBadge>` from `src/components/common/RAGBadge.tsx`
- Sizes: `sm | md | lg`
- Statuses: `GOOD | WARNING | HARM`
- Never build inline RAG status — always use the component

**Report/entity status:** use `<StatusBadge>` from `src/components/common/StatusBadge.tsx`

**Colour utility functions** (in `src/lib/utils.ts`):
- `ragColor(status)` → Tailwind text class
- `ragBgColor(status)` → Tailwind bg class
- `statusColor(status)` → combined bg + text classes

**Score badge:** `src/components/risk-register/ScoreBadge.tsx`
— inline coloured rectangle with score + level label.

---

### D010 — Table Pattern

**Wrapper:** `<div className="overflow-x-auto">`

**Table:** `<table className="w-full text-sm border-collapse table-scroll">`

**Header cell:** `px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide`

**Data cell:** `border border-gray-200 px-3 py-2`

**Row hover:** `hover:bg-gray-50/50`

**Overdue row:** add `.row-overdue` class — red-tinted left gradient

**Scrollbar styling:** `.table-scroll` class (defined in globals.css) — 6px custom scrollbar.

---

### D011 — Toast / Notification Pattern

**Library:** Sonner (`import { toast } from "sonner"`)

```tsx
toast.success("Changes saved successfully");
toast.error(err instanceof Error ? err.message : "Failed to save changes");
toast.info("Processing...");
```

**Never** use `alert()`, `confirm()`, or browser dialogs.
**Always** show a toast after any user-initiated save, delete, or bulk action.

---

### D012 — Navigation Structure

**Routes (do not add new top-level routes without discussion):**
```
/                     Dashboard
/risk-register        Risk Register
/risk-acceptances     Risk Acceptances
/compliance           Compliance (multi-tab)
/consumer-duty        Consumer Duty
/horizon-scanning     Horizon Scanning
/controls             Controls
/processes            Processes & IBS
/regulatory-calendar  Regulatory Calendar
/actions              Actions
/change-requests      Change Requests
/reports              Reports
/exports              Export Centre
/audit                Audit Trail
/settings             Settings
/users                User Management
```

**Sidebar groups:**
1. Dashboard
2. Risk Management (Risk Register, Acceptances)
3. Compliance & Controls (Compliance, Consumer Duty, Horizon, Controls, Processes, Reg Calendar)
4. Execution (Actions, Change Requests)
5. Administration (Reports, Export, Audit, Settings, Users)

**Admin pages** are wrapped in `<RoleGuard>` — only CCRO_TEAM.
**Policy page** (`/policies`) redirects to `/compliance?tab=policies`.

---

### D013 — Animation & Motion

**Framer Motion slide panel:** spring `{ stiffness: 320, damping: 30 }`, always check `useReducedMotion()`.

**CSS utility animations (globals.css):**
- `animate-fade-in` — backdrop/overlay fade (0.2s)
- `animate-slide-up` — modal panel entry (0.25s easeOut)
- `animate-slide-up-fade` — modal content entry (0.25s easeOut)
- `animate-pop-in` — badge pop (0.45s spring)
- `.card-entrance` / `.card-entrance-N` — staggered card reveal (N=1–6)
- `.skeleton-shimmer` — loading skeleton (1.4s shimmer)

**Glass effects:**
- `.glass-card` — includes `border-radius: 24px; padding: 24px` (do not apply to panels/modals)
- `.panel-surface` — glass bg only, no radius/padding (use for panels)
- Never apply `backdrop-filter: blur()` to an element that sits over an opaque dark overlay (L016)

---

### D015 — Back Button: Always Present, Always Positioned Bottom-Left

**Component:** `src/components/common/NavigationBackButton.tsx`
**Rendered in:** `src/app/layout.tsx` (AppShell) — global, one instance across all pages

**Visual spec (do not deviate):**
- Floating pill: `rounded-full bg-updraft-bright-purple px-4 py-2.5 text-sm font-semibold text-white shadow-lg`
- Hover: `hover:bg-updraft-deep hover:shadow-xl`
- Icon: `<ArrowLeft size={16} />` + label "Back"
- Position: `fixed bottom-6 z-50`
- Left offset — dynamically tracks sidebar state:
  - Sidebar open: `left: calc(16rem + 1.5rem)` (264px)
  - Sidebar closed: `left: calc(4rem + 1.5rem)` (88px)

**Behaviour:**
- Appears whenever the `navigationStack` in the Zustand store has entries
- `navigationStack` is populated by two mechanisms:
  1. **EntityLink click-throughs** — `EntityLink.tsx` pushes `window.location.pathname + window.location.search` before navigating (preserves full URL including open panel state)
  2. **General route changes** — `layout.tsx` route-tracking effect pushes the previous pathname on any route change, unless suppressed (back navigation) or EntityLink already handled it
- Pressing Back: pops the stack, sets `_suppressNavPush = true` to prevent double-push, then `router.push(prev)` (soft nav — no reload)
- After pressing Back, the button disappears if the stack is now empty

**Duplicate prevention:**
EntityLink pushes the full URL (with query params). The layout effect tracks Next.js `pathname` (path only). Before pushing, the layout checks: if `navigationStack.at(-1).split("?")[0] === prevPathname` → skip (EntityLink already covered it).

**Design rule:**
> Every route change within the app must be reachable via the Back button. Never build a navigation action that bypasses both EntityLink and the route-tracking effect. If you are using `window.location.href = ...` (hard nav), switch to `router.push()` — hard nav wipes Zustand state including the stack.

---

### D016 — Text Boxes: Always Auto-Resize, Never Fixed Height

**Component:** `src/components/common/AutoResizeTextarea.tsx`

**Rule:** Every `<textarea>` in a detail panel, slide-out drawer, or form dialog **must** use `<AutoResizeTextarea>` — never a plain `<textarea rows={N}>`. Fixed-height textareas cut off content and force scrolling inside a small box, which is poor UX for a data-rich compliance tool.

**How to use:**
```tsx
import AutoResizeTextarea from "@/components/common/AutoResizeTextarea";

// Replace this:
<textarea rows={3} value={val} onChange={...} className="..." />

// With this:
<AutoResizeTextarea minRows={3} value={val} onChange={...} className="..." />
```

Props are identical to a standard `<textarea>` plus `minRows?: number` (default: 2).

**How it works:** On every `value` change, it resets height to `auto`, reads `scrollHeight`, and sets that as the explicit height. `resize-none overflow-hidden` removes the manual resize handle and scrollbar — the box is always exactly tall enough for its content.

**Where already applied:** `RiskDetailPanel`, `ActionDetailPanel` (proposal forms), `HorizonDetailPanel` (3 fields), `RegulationDetailPanel` (5 fields).

**Where NOT yet applied (known gaps):** `RiskAcceptanceDetailPanel`, `RegCalEventDetailPanel`, `ConductRulesPanel`, `OutcomeFormDialog`, `BulkHistoricalEntry`, `AttestationTab`. These are scheduled for remediation — do not add new fixed-height textareas to any file.

**Exception:** Bulk data entry forms (CSV import, historical test entry) may retain fixed heights where the user is expected to enter large volumes of text and a stable-height grid is intentional. Confirm with the lead session before using `rows=N` anywhere new.

---

### D017 — Text Overflow: Always Truncate in Tables and List Views

**Rule:** Any text rendered inside a `<td>` or list row that could exceed the column width **must** be truncated with a tooltip. Never render raw text that can push a column out of shape or wrap uncontrollably.

**Standard pattern for table cells:**
```tsx
<td className="border border-gray-200 px-3 py-2 max-w-[200px]">
  <span className="block truncate" title={fullText}>
    {fullText}
  </span>
</td>
```

- `max-w-[Xpx]` — set per column based on available width. Common values:
  - Name/title column: `max-w-[280px]`
  - Description/notes: `max-w-[200px]`
  - Owner/assignee: `max-w-[120px]`
  - Reference/code: `max-w-[80px]` (usually no overflow risk)
- `truncate` — applies `overflow: hidden; white-space: nowrap; text-overflow: ellipsis`
- `title={fullText}` — native browser tooltip shows full text on hover; no extra library needed

**For multi-line preview (e.g. description column):**
```tsx
<td className="border border-gray-200 px-3 py-2 max-w-[240px]">
  <span className="line-clamp-2 text-sm text-gray-600" title={fullText}>
    {fullText}
  </span>
</td>
```
`line-clamp-2` shows up to 2 lines then ellipsis. Use for columns where 1-line truncation loses too much context.

**Already protected:** `RiskTable` (name: `max-w-[280px] truncate`, owner: `max-w-[120px] truncate`).

**Unprotected (known gaps):** `DataTable` (generic editable table in `src/components/sections/DataTable.tsx`) — read-mode cells have no overflow protection. Fix is additive: wrap the cell text in `<span className="block truncate" title={cell}>`.

**Do NOT:**
- Render raw `{cell}` or `{text}` inside a `<td>` without checking if it can overflow
- Use `overflow-hidden` on the `<td>` itself without also setting `max-w-*` — the cell will grow to content without a width constraint
- Skip the `title` attribute — users must be able to see the full text somehow

---

### D018 — Panel Sizing: Content-Driven, Minimal Scroll

**Width — responsive, not fixed:**

| Panel type | Width |
|---|---|
| Standard detail panel | `w-[min(800px,95vw)]` |
| Compact detail panel (single entity, fewer fields) | `sm:w-[480px]` or `sm:w-[560px]` |
| Rich detail panel (many linked items, tables) | `w-[min(800px,95vw)]` |
| Full-page drawer | `max-w-3xl` |

Use `min()` to cap width on large screens while staying within viewport on small screens. Never hardcode a fixed pixel width without a `vw` fallback.

**Height — always flex, never fixed:**
```tsx
// Panel container — always this structure:
<div className="fixed inset-y-0 right-0 z-50 flex flex-col {width}">
  {/* Header — never scrolls */}
  <div className="shrink-0 flex items-center justify-between border-b border-gray-200 px-6 py-4">
    ...
  </div>

  {/* Content — scrolls if needed, but aim to minimise scroll */}
  <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
    ...
  </div>

  {/* Footer — never scrolls */}
  <div className="shrink-0 flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3 bg-gray-50">
    ...
  </div>
</div>
```

- `flex-1 min-h-0` on the content area — allows it to fill remaining space and scroll only when content exceeds it
- `shrink-0` on header and footer — they never compress
- `overflow-y-auto` on content only — not on header/footer

**Content density principle:**
> Panels should show as much content as possible without scrolling. Prefer collapsible sections (`<CollapsibleSection>`) over stacking all content in one long scroll. Use `<AutoResizeTextarea>` (D016) so text fields don't wastefully reserve empty space. Group related fields into compact rows (`grid grid-cols-2 gap-3`) rather than stacking everything vertically.

**Do NOT:**
- Set a fixed `h-[Npx]` or `max-h-[Npx]` on a content panel (use `max-h-[90vh]` only on modals)
- Use `overflow-y: scroll` (forces scrollbar always visible) — use `overflow-y: auto`
- Nest a scrollable div inside another scrollable div (double-scroll UX is confusing)

---

### D014 — Shared File Ownership (for parallel sessions)

These files are HIGH BLAST RADIUS — only ONE session should edit them at a time.
If your session needs a change here, coordinate with the lead session first.

| File | Why it's shared | Who edits |
|---|---|---|
| `src/lib/types.ts` | All TypeScript types — change here breaks everywhere | Lead session |
| `prisma/schema.prisma` | Database schema — migrations required | Lead session |
| `src/lib/store.ts` | Zustand store shape — all components depend on it | Lead session |
| `src/app/globals.css` | All CSS variables, utility classes, animations | Lead session |
| `tailwind.config.ts` | Brand colours, font config | Lead session |
| `src/components/common/*` | Shared components — used app-wide | Lead session |
| `src/components/layout/*` | Sidebar, header — used on every page | Lead session |
| `tasks/patterns.md` | This file | Lead session |
| `PLAN.md` | Sprint plan | Lead session |

---

## DATA & STATE PATTERNS (promoted from W-series)

### P001 — Dirty state from prop comparison (promoted from W001)
**Context:** Edit panel/drawer that needs unsaved-changes detection.
**Pattern:** Compare local field state against the original prop — no shadow copy needed.
```ts
const isDirty =
  title !== item.title ||
  summary !== item.summary ||
  deadline !== (item.deadline ? item.deadline.slice(0, 10) : "") ||
  notes !== (item.notes ?? "");
```
**Why it works:** Props are the source of truth for the last-saved state.
**Don't use when:** The form creates a new entity (no original prop to compare against).

---

### P002 — Role-scoped field filtering at API layer (promoted from W002)
**Context:** GET endpoints that must hide fields from some roles.
**Pattern:** Fetch full record, strip sensitive fields based on caller role before returning.
```ts
const isCCRO = user?.role === "CCRO_TEAM";
const safeItem = { ...item, notes: isCCRO ? item.notes : null };
return jsonResponse(serialiseDates(safeItem));
```
**Don't use when:** The entire record is restricted — use auth guard at route level instead.

---

### P003 — Hydration-gated default filter (promoted from W003)
**Context:** List page needing "default to My items if user owns any" — but store is async.
**Pattern:**
```ts
const [viewMode, setViewMode] = useState<"all" | "my">("all");
const [viewModeSet, setViewModeSet] = useState(false);
useEffect(() => {
  if (!hydrated || viewModeSet) return;
  if (!isCCROTeam && currentUser?.id) {
    const owned = items.filter((i) => i.ownerId === currentUser.id);
    setViewMode(owned.length > 0 ? "my" : "all");
  }
  setViewModeSet(true);
}, [hydrated]);
```
**Don't use when:** CCRO Team — they always see all. Only apply to OWNER/VIEWER roles.

---

### P004 — FK resolution in seed scripts (promoted from W010)
**Context:** Seed scripts that link across entities where the linked entity is also upserted.
**Pattern:** Resolve FK by unique reference field at runtime, never use hardcoded IDs.
```ts
const action = await prisma.action.findUnique({ where: { reference: link.actionRef } });
if (!action) { console.warn(`⚠ Action not found: ${link.actionRef}`); continue; }
```

---

### P005 — Idempotent seed for join tables (promoted from W011)
**Context:** Seed creating join table records with unique constraints.
**Pattern:** `upsert` for entities with natural IDs; `try/catch` around `create` for join tables.
```ts
try {
  await prisma.riskControlLink.create({ data: { riskId, controlId, linkedBy } });
} catch (_) { /* duplicate — skip */ }
```

---

## UI & COMPONENT PATTERNS

### P006 — AnimatedNumber for hook-in-map problem (promoted from W007)
**Context:** Needing `useCountUp` or similar hooks inside a `.map()` callback.
**Pattern:** Extract into a micro-component that wraps the hook.
```tsx
export function AnimatedNumber({ value, duration = 800, className }: Props) {
  const animated = useCountUp(value, duration);
  return <span className={className}>{animated}</span>;
}
// Safe to use inside .map()
<AnimatedNumber value={card.value} className="text-2xl font-bold" />
```

---

### P007 — glass-card vs panel-surface (promoted from W008)
**Context:** Applying frosted glass to panels, modals, or drawers.
**Pattern:** Use `.panel-surface` (bg + blur only) for any component that manages its own
layout. `.glass-card` includes fixed `padding: 24px; border-radius: 24px` — never apply it
to panels or it will conflict with the panel's own layout.

---

### P008 — SVG arc gauge (promoted from W009)
**Context:** Radial/arc progress indicators.
**Pattern:** Single SVG `stroke-dashoffset` + CSS transition — no JS animation loop.
```
arcLength = (240/360) * circumference
stroke-dasharray: arcLength circumference
stroke-dashoffset: transitions from arcLength (0%) to arcLength*(1-value/100) (fill)
transform="rotate(150, cx, cy)"  →  120° gap centred at 6 o'clock
transition: stroke-dashoffset 1s ease-out
```
Trigger via `useEffect + setTimeout(50ms)` to defer render and let CSS transition fire.

---

### P009 — Vertical timeline for approval/change history (promoted from W005)
**Context:** Showing ordered events (approvals, changes, reviews) for an entity.
**Pattern:**
- Outer: `relative pl-7`
- Line: `absolute left-2.5 top-2.5 bottom-8 w-px bg-gray-200`
- Node dot: `absolute -left-7 mt-2.5 h-5 w-5 rounded-full border-2 border-white shadow-sm`
- Node colour = semantic meaning: amber=pending, green=approved, red=rejected, purple=update
- Creation node pinned at bottom with `bg-updraft-bar`

---

### P010 — 4-zone collapsible page layout (promoted from W012)
**Context:** Tab/page needing both high-level dashboard content AND detailed card grids.
**Pattern:** Never replace the detail cards — wrap them in collapsible Zone N.
```
Zone 1: Always-visible overview (gauges, stat tiles, trend chart)
Zone 2: Alert section (auto-expands if items exist)
Zone 3: CCRO-editable narrative
Zone 4: Detailed cards — collapsible, collapsed by default
```
`isDetailExpanded = false` default. `isAlertExpanded` auto-true when items present.

---

## API & DATABASE PATTERNS

See `MEMORY.md` for Prisma 7 gotchas, adapter pattern, and multi-column orderBy syntax.

---

## PROCESS & WORKFLOW PATTERNS

See `tasks/lessons.md` for L-series (mistake rules) and `CLAUDE.md` for mandatory workflow.

---

## Promotion Log

| Entry | Promoted to | Date | Summary |
|---|---|---|---|
| W001 | P001 | 2026-02-27 | Dirty state from prop comparison |
| W002 | P002 | 2026-02-27 | Role-scoped field filtering |
| W003 | P003 | 2026-02-27 | Hydration-gated default filter |
| W010 | P004 | 2026-02-27 | FK resolution in seed scripts |
| W011 | P005 | 2026-02-27 | Idempotent seed for join tables |
| W007 | P006 | 2026-02-27 | AnimatedNumber micro-component |
| W008 | P007 | 2026-02-27 | glass-card vs panel-surface |
| W009 | P008 | 2026-02-27 | SVG arc gauge pattern |
| W005 | P009 | 2026-02-27 | Vertical timeline pattern |
| W012 | P010 | 2026-02-27 | 4-zone collapsible page layout |
