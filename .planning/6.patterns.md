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

### D019 — EntityLink: Every Data Reference Must Be Clickable

**Rule:** Any field in a panel, table, card, or list that references an entity that exists elsewhere in the app **must** be rendered as an `<EntityLink>`, not plain text. This applies everywhere — panels, tables, bento cards, timeline entries, badges, linked-item lists.

If a user can see a reference to a risk, action, control, policy, regulation, process, or risk acceptance, they must be able to click through to it directly from where they are.

**Component:** `src/components/common/EntityLink.tsx`
**URL builders:** `src/lib/navigation.ts`

**Supported entity types:**
| Type | Navigates to |
|---|---|
| `risk` | `/risk-register?risk={id}` |
| `action` | `/actions?action={id}` |
| `control` | `/controls?tab=library&control={id}` |
| `policy` | `/compliance?tab=policies&policy={id}` |
| `regulation` | `/compliance?tab=regulatory-universe&regulation={id}` |
| `risk-acceptance` | `/risk-acceptances?acceptance={id}` |
| `process` | `/processes?process={id}` |

**How to use:**
```tsx
import EntityLink from "@/components/common/EntityLink";

// Reference badge with code + name:
<EntityLink type="risk" id={risk.id} reference={risk.reference} label={risk.title} />

// Reference badge with code only:
<EntityLink type="control" id={ctrl.id} reference={ctrl.reference} />
```

**What it does automatically:**
- Renders a colour-coded badge per entity type (each type has its own bg/text/hover colour in `ENTITY_BADGE_STYLES`)
- Pushes current URL onto `navigationStack` before navigating → Back button appears
- Uses `router.push()` (soft nav) — Zustand state preserved

**Many-to-many relationships:**
When an entity has a list of linked entities (e.g. a Risk has many linked Controls, a Control has many linked Risks), render each linked item as an `<EntityLink>`. Never render linked items as plain text or unclickable badges.

```tsx
// ✓ Correct — every linked control is clickable
{risk.linkedControls.map(ctrl => (
  <EntityLink key={ctrl.id} type="control" id={ctrl.id} reference={ctrl.reference} label={ctrl.name} />
))}

// ✗ Wrong — plain text, no click-through
{risk.linkedControls.map(ctrl => (
  <span key={ctrl.id}>{ctrl.reference}</span>
))}
```

**Where EntityLink is NOT yet used but should be (known gaps):** Any newly built feature that displays cross-entity references. Before shipping a new panel or table, check every field: if it references another entity, it must be an EntityLink.

**Adding a new entity type:**
1. Add the type to `NavigableEntity` in `src/lib/navigation.ts`
2. Add a URL builder to `URL_BUILDERS`
3. Add badge styles to `ENTITY_BADGE_STYLES`
4. The rest (stack push, routing) is automatic

---

### D020 — CCRO Edit Unlock: Pencil Icon in Every Panel and Card

**Rule:** Every panel, slide-out drawer, and data card that displays fields must have an edit path accessible to the CCRO Team. The standard pattern is a **pencil icon in the panel header** that unlocks edit mode. Read-only display for CCRO Team is a bug, not a design choice.

**Standard edit-unlock pattern:**
```tsx
const [isEditing, setIsEditing] = useState(false);

{/* Panel header — always has pencil for CCRO */}
<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
  <h2 className="text-lg font-semibold text-gray-900 font-poppins">{title}</h2>
  <div className="flex items-center gap-2">
    {canEdit && !isEditing && (
      <button
        onClick={() => setIsEditing(true)}
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Edit"
      >
        <Pencil size={15} />
      </button>
    )}
    {isEditing && (
      <button
        onClick={() => { resetFields(); setIsEditing(false); }}
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
        aria-label="Cancel editing"
      >
        <X size={15} />
      </button>
    )}
    <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100">
      <X size={18} />
    </button>
  </div>
</div>

{/* Fields switch between read and edit mode */}
{isEditing ? (
  <AutoResizeTextarea value={description} onChange={...} className="..." />
) : (
  <p className="text-sm text-gray-700">{description || "—"}</p>
)}

{/* Footer save/cancel — only when editing */}
{isEditing && (
  <div className="shrink-0 flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3 bg-gray-50">
    <button onClick={() => { resetFields(); setIsEditing(false); }} className="...">Cancel</button>
    <button onClick={handleSave} disabled={isSaving} className="...">
      {isSaving ? "Saving..." : "Save Changes"}
    </button>
  </div>
)}
```

**`canEdit` permission check:**
```tsx
const isCCROTeam = currentUser?.role === "CCRO_TEAM";
// or use the permission helper:
const { can } = usePermissionSet();
const canEdit = can("edit:risk"); // or relevant permission code
```

**Rules:**
- CCRO Team can always edit every field on every screen — no exceptions
- Other roles follow permissions defined in `src/lib/permissions.ts`
- All saves must call the relevant API (PATCH/POST) — not just update local store
- Show a success toast after every save; show an error toast if the API fails
- If the user has unsaved changes and tries to close the panel, warn them (use `isDirty` check — see P001)
- `isEditing` state is local (not in the store) — it resets when the panel closes

**Where already implemented:** `RiskDetailPanel`, `HorizonDetailPanel`, `RegulationDetailPanel`, `ActionDetailPanel` (proposal forms).

**Where NOT yet implemented (known gaps):** Any newly built panel. Before shipping, confirm: does CCRO Team have a pencil somewhere? If no, it's incomplete.

---

### D021 — Permission Checking in Components

**Hook:** `usePermissionSet()` from `src/lib/usePermission.ts`

```tsx
const { can, role, isCCROTeam } = usePermissionSet();

// Check a specific permission:
const canCreate = can("create:action");
const canDelete = can("delete:risk");

// Role shorthand:
if (isCCROTeam) { /* show admin controls */ }
```

**Permission codes** are defined in `src/lib/permissions.ts`. Check there before writing a new permission guard — the code you need probably already exists.

**Roles in the system** (from `prisma/schema.prisma` Role enum):
- `CCRO_TEAM` — full access to everything
- `CEO` — read + limited actions (e.g. can change horizon focus, cannot create items)
- `OWNER` — owns specific risks/controls, can create actions
- `VIEWER` — read-only

**Never** assume CEO = OWNER. They are distinct roles with different permission profiles. Always check the Role enum before writing a role guard (L010).

**API routes** use `requireCCRORole(req)` or `checkPermission(req, "code")` — never just `getUserId()` for write endpoints (L007, L009).

---

### D022 — Collapsible Section Pattern

**Component:** `<CollapsibleSection>` — find in `src/components/common/CollapsibleSection.tsx`

**When to use:** Any panel or page that has more content than fits comfortably on screen. Group related fields into named sections; collapse the lower-priority ones by default so the user sees the most important data first without scrolling.

**Standard usage:**
```tsx
<CollapsibleSection title="Linked Controls" defaultOpen={linkedControls.length > 0}>
  {/* content */}
</CollapsibleSection>
```

**`defaultOpen` rules:**
| Condition | defaultOpen |
|---|---|
| Section contains critical/primary data (description, status, scores) | `true` |
| Section contains secondary data (notes, history, metadata) | `false` |
| Section contains alerts or items requiring action | `true` if items exist, `false` if empty |
| Section is a long list of linked items | `false` — user expands when needed |

**Auto-expand when items exist:**
```tsx
// Expand automatically only if there's something to show
<CollapsibleSection title="Breaches" defaultOpen={breaches.length > 0}>
```

**Ordering within a panel (top to bottom):**
1. Primary identity fields (name, reference, status, owner) — always visible, not collapsible
2. Key data (scores, dates, description) — `defaultOpen: true`
3. Linked entities (risks, controls, actions) — `defaultOpen: false` unless count > 0
4. Workflow / decision sections (approvals, routing) — `defaultOpen: true` only when action required
5. History / audit trail — `defaultOpen: false`

**Never** put all fields in one flat scroll. If a panel has more than ~6 fields, group them.

---

### D023 — URL State for Panels

**Rule:** Every detail panel that can be navigated to via `EntityLink` **must** be openable directly from a URL. The URL is the persistence layer for panel state — it allows the Back button to restore the exact open panel, and allows users to bookmark or share a deep link.

**Standard URL pattern:**
```
/risk-register?risk={id}
/actions?action={id}
/controls?tab=library&control={id}
/compliance?tab=policies&policy={id}
```

**How to read panel ID from URL on mount:**
```tsx
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

// Inner component (inside Suspense boundary — required for useSearchParams in Next.js App Router)
function PageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(
    searchParams.get("risk") // or "action", "control", etc.
  );

  function openPanel(id: string) {
    setOpenId(id);
    // Write back to URL so Back button restores this exact state
    router.replace(`?risk=${id}`, { scroll: false });
  }

  function closePanel() {
    setOpenId(null);
    router.replace("?", { scroll: false }); // clear param
  }
}

// Outer page wraps in Suspense (required)
export default function Page() {
  return (
    <Suspense>
      <PageInner />
    </Suspense>
  );
}
```

**Why `router.replace()` not `router.push()`:**
`replace` updates the URL without adding a new browser history entry. The panel open/close is not itself a "navigation" — it is state within the page. Only the initial arrival at the page is a navigation (which EntityLink's `router.push()` already recorded on the stack).

**EntityLink target URLs** are defined in `src/lib/navigation.ts`. When adding a new panel, add its URL pattern there first so EntityLink can navigate to it correctly.

**What if the URL param references a deleted or missing entity?**
Silently ignore it — set `openId = null` if the entity is not found in the store after hydration. Do not error or crash.

---

### D024 — Linked Items Section: Chips + Add + Remove

**Rule:** Any panel section that shows a many-to-many relationship (e.g. "Linked Controls on this Risk", "Linked Risks for this Action") must follow this layout. Every linked item is an `<EntityLink>` chip. CCRO Team can add and remove links.

**Standard layout:**
```tsx
<CollapsibleSection title="Linked Controls" defaultOpen={linkedControls.length > 0}>
  <div className="space-y-2">
    {/* Chip list of EntityLinks */}
    <div className="flex flex-wrap gap-1.5">
      {linkedControls.map((ctrl) => (
        <div key={ctrl.id} className="flex items-center gap-1">
          <EntityLink type="control" id={ctrl.id} reference={ctrl.reference} label={ctrl.name} />
          {canEdit && (
            <button
              onClick={() => handleUnlink(ctrl.id)}
              className="rounded p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label={`Remove ${ctrl.reference}`}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      {linkedControls.length === 0 && (
        <p className="text-xs text-gray-400 italic">None linked</p>
      )}
    </div>

    {/* Add link button — CCRO only */}
    {canEdit && (
      <button
        onClick={() => setLinkPickerOpen(true)}
        className="flex items-center gap-1.5 text-xs text-updraft-bar hover:text-updraft-deep font-medium mt-1"
      >
        <Plus size={13} />
        Add control
      </button>
    )}
  </div>
</CollapsibleSection>
```

**Link picker:** Use `<SearchableSelect>` or a `<Modal size="md">` containing a filtered list of available entities. Show only entities not already linked. On confirm, call the relevant API to create the link.

**API pattern for linking:**
```tsx
// Add link
await api.post(`/api/risks/${riskId}/controls`, { controlId });
// Remove link
await api.delete(`/api/risks/${riskId}/controls/${controlId}`);
// Always update local store optimistically, then sync
```

**Ordering:** Sort linked items by reference code (alphabetical) for consistency.

**Empty state:** Always show `"None linked"` in italic grey — never render an empty section with no indication. An empty chip list with no label looks broken.

---

### D025 — Language: UK British English Throughout

**Rule:** Every word of UI text, code comments, variable names, field labels, error messages,
toast copy, aria-labels, and documentation in this codebase must use **UK British English**.
There are no exceptions — not even for incidental copy, placeholder text, or seed data strings.

**Common differences (US → UK):**

| US (wrong) | UK (correct) |
|---|---|
| color | colour |
| authorize | authorise |
| authorized | authorised |
| authorization | authorisation |
| sanitize | sanitise |
| recognize | recognise |
| organize | organise |
| organization | organisation |
| analyze | analyse |
| behavior | behaviour |
| center | centre |
| license (verb) | licence (noun) / license (verb) |
| program | programme (project/scheme) |
| defense | defence |
| offense | offence |
| fulfill | fulfil |
| labeled | labelled |
| traveling | travelling |
| canceled | cancelled |

**In code:** Use British spellings in variable names, interface property names, and comments.
```tsx
// ✓ Correct
const [selectedColour, setSelectedColour] = useState("");
const isAuthorised = user.role === "CCRO_TEAM";
interface ColourScheme { primaryColour: string; }

// ✗ Wrong
const [selectedColor, setSelectedColor] = useState("");
const isAuthorized = user.role === "CCRO_TEAM";
```

**In UI copy:** All toast messages, labels, placeholder text, empty state copy, and modal content.
```tsx
// ✓ Correct
toast.success("Changes saved successfully");
<p className="text-gray-400">No authorised users found</p>
placeholder="Search by organisation name..."

// ✗ Wrong
toast.success("Changes saved successfully");  // fine — "saved" is same
<p className="text-gray-400">No authorized users found</p>  // wrong
```

**Seed data and DB values:** Narrative strings, status labels, and sample data in `prisma/seed*.ts`
must also use British English.

**Before shipping any text-bearing component:** do a quick search for the most common
offenders: `color`, `authorization`, `organize`, `behavior`, `center`.

---

### D026 — Sequential Display Ordering: Never Let Seeds Override It

**Rule:** Anywhere a list is displayed in a specific order, that order is owned by the DB
(`position` field or equivalent). Seed scripts must NEVER overwrite the `position` field
on re-run — put `position` in the `create` clause only, never in `update`.

**The problem this prevents:**
Re-running a seed with `position` in the `update` clause resets positions to seed-time values,
colliding with any DB-managed ordering done post-migration and producing interleaved display
(e.g. `1.7, 1.1, 1.8, 1.2...`).

**Correct seed upsert pattern:**
```typescript
await prisma.model.upsert({
  where: { id: item.id },
  // ✓ update: only content fields
  update: {
    name: item.name,
    description: item.description,
    // NOTE: position intentionally excluded — DB-managed
  },
  // ✓ create: includes position (first insert only)
  create: {
    id: item.id,
    name: item.name,
    description: item.description,
    position: item.position,
  },
});
```

**Ordering fields that must NEVER appear in seed `update`:**
`position`, `order`, `sortIndex`, `sequence`, `displayOrder`, `rank`

**After any migration or seed re-run:** always verify display order in the UI.
If items appear interleaved, fix with a targeted `UPDATE` query:
```sql
UPDATE "your_table"
SET position = CAST(SPLIT_PART("displayId", '.', 2) AS INTEGER)
WHERE ...;
```
Or re-derive positions from the intended canonical order.

**For migrations specifically:** before running any `DELETE`, enumerate EVERY field on the
record and check whether any ordering metadata lives on the record itself (not just FK children).
If yes, copy those values to the destination record BEFORE deleting the source. See also
CLAUDE.md — Seed & Migration Rules.

---

### D027 — Modal Layering: Siblings Not Children; No Retained Transform on Containers

**Rule 1 — Independent modals must always be React siblings, never parent/child.**

Two overlay modals are independent UI surfaces. Rendering one inside the other's `children`
prop makes the inner modal a descendant of the outer's scrollable content div, which may have
stacking context or containment constraints (overflow, transform, z-index) that trap the
inner overlay.

```tsx
/* ❌ wrong — SecondModal is inside Modal's content div */
<Modal open={open} onClose={onClose}>
  <SomeContent />
  <SecondModal open={!!selected} onClose={() => setSelected(null)} />
</Modal>

/* ✅ correct — siblings rendered at the same level */
<>
  <Modal open={open} onClose={onClose}>
    <SomeContent />
  </Modal>
  <SecondModal open={!!selected} onClose={() => setSelected(null)} />
</>
```

**Rule 2 — Never retain a non-none `transform` on a container via `animation-fill-mode: forwards`.**

A CSS `transform` (including `translateY(0)`) creates a new containing block for all
`position: fixed` descendants, regardless of visual effect. If a container's entry animation
ends with `transform: translateY(0)` and uses `forwards` fill, it permanently holds that
transform — trapping any nested fixed overlay inside the container's bounds.

Fix: omit `transform` from the animation's `to` keyframe. The browser interpolates the
property back to the element's natural value (`none`), and `forwards` only retains properties
explicitly declared in `to`.

```css
/* ❌ wrong — forwards retains transform: translateY(0), trapping fixed children */
@keyframes slide-up-fade {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.animate-slide-up-fade { animation: slide-up-fade 0.25s ease-out forwards; }

/* ✅ correct — only opacity retained; transform returns to none */
@keyframes slide-up-fade {
  from { transform: translateY(16px); opacity: 0; }
  to   { opacity: 1; }
}
.animate-slide-up-fade { animation: slide-up-fade 0.25s ease-out forwards; }
```

**Applies to:** Any new modal, drawer, tooltip, popover, or other `position: fixed` overlay.
Before adding one, ask: "Is it a child of anything that has a CSS transform or animation?"
If yes, move it to be a sibling or portal it to `document.body`.

**Files:** `src/components/common/Modal.tsx`, `src/app/globals.css`

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
| L019 | D026 | 2026-02-27 | Sequential ordering — seed upserts must not override position |
| L020 | D026 | 2026-02-27 | Migration metadata audit — enumerate all fields before delete |
| House rule | D025 | 2026-02-27 | UK British English throughout |
