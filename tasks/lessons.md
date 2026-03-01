# Lessons & Wins

Rules and patterns derived from real work on this codebase.
Review this file at the start of each session.

**Format:**
- `L00N` — a mistake or failure pattern. Rule to avoid repeating it.
- `W00N` — a win or pattern worth repeating. Note to reinforce it.
- `[PROMOTED → file]` — this entry has been baked into a permanent file; kept for history.

When adding entries mid-sprint, append at the bottom of the relevant section.
At sprint end, the Retrospective Agent reviews all new entries and recommends promotions.

---

## Mistakes (L-series)

### L001 — Silent deletion when editing large files
**What happened:** When modifying a component or page file, code was silently removed
(tabs, panels, imports, handlers) because the edit replaced a large block rather than
surgically targeting the change.
**Rule:** Before committing any modified file, run a mental diff: enumerate all
sections/tabs/imports that existed before and confirm each is still present or consciously
removed with a stated reason.
**Trigger:** Any Edit or Write to a file over ~100 lines.
**Status:** [PROMOTED → CLAUDE.md "Never Delete Existing Features" section]

---

### L002 — Intent confusion leads to wrong scope
**What happened:** A loosely-worded request ("improve X", "update Y", "fix Z") was
interpreted too broadly or too narrowly, causing the wrong things to change.
**Rule:** When a request is ambiguous, propose the interpretation back to the user before
writing any code. One sentence: "My reading is [X] — is that right?" Do not start work
until confirmed.
**Trigger:** Any request containing: improve, update, rework, fix, change, clean up,
refactor — without a specific file or behaviour called out.
**Status:** [PROMOTED → CLAUDE.md "Step 0: Understand Intent" section]

---

### L003 — Pushing ahead without replanning
**What happened:** After completing one step, the next step was started immediately without
checking whether the plan still made sense, causing compounding errors or unnecessary work.
**Rule:** After each implementation step, pause: (1) state what was done, (2) check it
against the checklist, (3) scan for unexpected side effects, (4) update the plan before
proceeding.
**Trigger:** Every step boundary in a multi-step plan.
**Status:** [PROMOTED → CLAUDE.md workflow step 2 review gates]

---

### L004 — Audit recommendation B3 is rejected by the user
**What happened:** AUDIT.md recommended defaulting the Risk Register to heatmap view for
the CEO role. User confirmed the table/list view is preferred because it shows all entries.
**Rule:** Do NOT implement B3 (CEO heatmap default). The table view is the intended default
for all roles. Do not change the risk register default view mode based on role.
**Trigger:** Any work touching risk-register default view, scoreMode, viewTab initial state,
or role-based view defaults.

---

### L005 — Audit recommendation B1 is rejected by the user
**What happened:** AUDIT.md recommended adding a "Board View" dashboard mode (fixed,
non-customisable one-page summary for CEO/executive roles).
**Rule:** Do NOT implement B1 (CEO Board View). The existing dashboard is the intended
surface for all roles. Do not add a second or alternative dashboard.
**Trigger:** Any work touching a "Board View", alternate dashboard mode, CEO-specific
layout, or fixed executive summary screen.

---

### L006 — Multi-task messages get partially handled
**What happened:** User sends a single message containing several distinct requests. Only
the most prominent or first one gets addressed; others are forgotten or deprioritised
without acknowledgement.
**Rule:** Before doing anything, decompose the full message into a numbered task inventory
and surface it back to the user for confirmation. Use TaskCreate for each item. Do not
start any item until the inventory is confirmed. Do not declare done until every item is
ticked.
**Trigger:** Any message with 2+ sentences that could each be instructions, or containing
"also", "and", lists, or mixed request types.
**Status:** [PROMOTED → CLAUDE.md "Step 0a: Decompose the Message First"]

### L007 — Authentication ≠ Authorisation in API routes
**What happened:** Horizon Scanning write endpoints used `getUserId()` which only checks
"are you logged in?". Any authenticated user (VIEWER, OWNER) could call POST/PATCH/DELETE
via direct API request, bypassing the UI-level role guards entirely.
**Rule:** `getUserId()` is for read-only/audit purposes only. Every API write endpoint must
use `requireCCRORole(req)` or `checkPermission(req, "permission:code")` — never just
`getUserId()`. Read endpoints that return sensitive fields must also check caller role.
**Trigger:** Any new or modified API route that writes to the DB, or any GET that returns
fields marked as role-restricted in the UI (e.g. `notes`, internal reviewer comments).

---

### L008 — GET endpoints can leak sensitive fields even with UI guards
**What happened:** The `notes` field on HorizonItem was correctly hidden from the UI for
non-CCRO roles, but the GET API returned it to all authenticated callers. Anyone with
network access and an auth token could read internal CCRO notes.
**Rule:** If a field is role-restricted in the UI, it must also be stripped at the API
layer. Pattern: fetch the full record, then map and null-out restricted fields based on
caller role before returning. Do not rely on the UI to hide sensitive data.
**Trigger:** Any field displayed with a "CCRO Team only" / "internal" label in the UI.

---

### L009 — `requireCCRORole` vs `checkPermission` — know which to use
**What happened:** The actions endpoint needed `checkPermission("create:action")` not
`requireCCRORole`, because OWNER role also has the `create:action` permission. Using
`requireCCRORole` would have silently blocked a valid use case.
**Rule:** Use `requireCCRORole` when the action is strictly CCRO-only (create/edit/delete
horizon items, link risks, etc.). Use `checkPermission(req, "code")` when the permission
is potentially granted to other roles (e.g. create:action, which OWNER can hold).
**Trigger:** Any new write endpoint — ask: "Could a non-CCRO role legitimately do this?"
If yes → `checkPermission`. If strictly CCRO → `requireCCRORole`.

---

### L010 — CEO is a distinct role; do not conflate with OWNER
**What happened:** The UAT review noted "CEO fully read-only" and "canChangeFocus for CEO".
Initial assumption was CEO = OWNER, but the DB schema has four roles: CCRO_TEAM, CEO,
OWNER, VIEWER — each with different permission profiles.
**Rule:** Always check the Role enum in `prisma/schema.prisma` before assuming which roles
exist. Do not guess or collapse roles. CEO has distinct permissions (e.g. can change focus,
cannot create horizon items).
**Trigger:** Any role check or permission guard — verify the exact enum before coding.

---

### L011 — Prop naming should reflect actual semantics, not historical origin
**What happened:** `HorizonInFocusSpotlight` received a `canManage` prop but only ever
used it to show/hide the "Change focus" button. When the logic changed (CEO ≠ full manage
rights), the prop name caused confusion about what the boolean actually meant.
**Rule:** Name props for their specific purpose, not a generic parent concept. If a prop
guards one specific action, name it for that action (`canChangeFocus`, `canCreateAction`)
rather than a broad capability (`canManage`, `isAdmin`). This makes behaviour obvious at
the call site and survives future permission splits cleanly.
**Trigger:** Any boolean prop named `canManage`, `isAdmin`, `hasAccess` — ask: "What
exactly does this gate?" and use that as the prop name.

---

### L012 — Never fabricate any seed data without express instruction or permission
**What happened:** Source documents for horizon scanning items (uploaded in a previous session)
were lost from context due to compaction. The seed was written from general knowledge,
producing plausible-sounding but incorrect content. Most critically, FCA CP26/7 was titled
"Consumer Duty: Fair Value and Sludge Practices" — but the real CP26/7 is about mandatory
credit information sharing (multi-bureau reporting). All 8 HIGH-priority items were wrong.
**Rule:** Do NOT generate or fabricate ANY seed data without express instruction or permission
from the user. This applies to all data, not just regulatory content:
1. If source data was provided in a previous session and may have been lost through context
   compaction, STOP — tell the user the data was lost and ask them to re-provide it
2. If asked to seed a module for the first time, ask the user to supply the data or
   explicitly confirm that placeholder/demo data is acceptable
3. Only use source documents, user-provided data, or explicitly approved placeholder content
4. Never fill gaps with plausible-sounding invented content — even for "demo" purposes
**Do NOT:** Generate anything that presents as real business data (names, figures, dates,
case references, regulatory citations, risk names, policy titles, etc.) without the user's
explicit sign-off. Invented data is at best misleading; in a compliance application it is
actively harmful.
**Trigger:** Any new seed block, any upsert of business/regulatory/compliance data, any
placeholder added to a new module — confirm with the user before writing.
**Status:** Active — check before writing any seed data.

---

### L013 — TypeScript Map AND Set iteration requires Array.from() at older targets
**What happened:** Used `for (const [, items] of byControl)` directly on a `Map<string, T[]>` in
`export-html-builder.ts`. TypeScript rejected it with: "Type 'Map<...>' can only be iterated
through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher."
Also applies to `Set` spread: `[...new Set(arr)]` fails with the same error (see L017, merged here).
**Rule:** `Array.from()` required for both `Map` AND `Set` spread/iteration at any target:
- `for (const [k, v] of Array.from(map))` ✓
- `Array.from(map.keys())` ✓
- `Array.from(new Set(arr))` ✓
- `[...new Set(arr)]` ✗
- `[...map.entries()]` ✗
**Trigger:** Any new `for...of` loop or spread over a `Map` or `Set` in TypeScript.
**Status:** Active.

---

<!-- Add new L-series entries here: L020, ... -->

### L018 — Context compaction silently drops open questions; "continue" does not cancel them
**What happened:** Open questions were asked of the user in a previous session. The conversation
was compacted. On resume, the user wrote "continue" — which I interpreted as permission to
proceed without waiting for answers. I proceeded based on assumptions rather than the user's
actual intent. The user lost their opportunity to answer and the work done was partly wrong-scoped.
**Root cause:** Treated compaction + "continue" as a clean slate. It is not. Open questions
survive compaction and must be re-surfaced.
**Rule:** At every session start (especially after compaction), check the session summary for
any open/unanswered questions. If found:
1. **Stop.** Do not proceed with any work that depends on those answers.
2. List every unanswered question explicitly, numbered.
3. Tell the user: "Before I proceed, I need to re-ask [N] questions from the previous session
   that were never answered:" — then list them.
4. Wait for answers.
"Continue" means "don't add new unnecessary delays" — it does NOT cancel open questions.
Data mapping questions, scope clarification questions, preference questions — all survive compaction.
**Trigger:** Any session resume where the compaction summary mentions "pending questions",
"asked the user", "waiting for answers", or any similar phrase. Also: any time a task list
item has status "asked user — no response".
**Status:** [PROMOTED → CLAUDE.md Step 0c]

---

### L017 — Set spread `[...new Set()]` fails at lower TypeScript targets
**Status:** [MERGED → L013] — L013 has been updated to cover both Map and Set.

### L014 — Motion components must respect prefers-reduced-motion
**What happened:** UAT flagged that Framer Motion animations in RiskTable, ActionDetailPanel, etc.
do not check `prefers-reduced-motion`. Screen reader and accessibility tool users may find animations
distracting or disorienting.
**Rule:** When adding animation to a component, honour the OS accessibility preference. Pattern:
```ts
import { useReducedMotion } from "framer-motion";
const prefersReduced = useReducedMotion();
// then: transition={prefersReduced ? { duration: 0 } : springConfig}
```
Or globally: set `AnimatePresence` and motion component durations to 0 when reduced motion is preferred.
**Trigger:** Any new Framer Motion component. Add `useReducedMotion` check to MotionList, MotionRow,
MotionSlidePanel, and page transition in layout.tsx in a future pass.
**Status:** Active — deferred to Phase 2 polish sprint.

---

### L015 — Spreading HTMLAttributes into motion.div causes type conflict
**What happened:** `MotionDiv` accepted `HTMLAttributes<HTMLDivElement>` via spread, which includes
`onDrag` typed as `DragEventHandler<HTMLDivElement>`. Framer Motion's `motion.div` redefines `onDrag`
with an incompatible signature (takes `MouseEvent | PointerEvent | TouchEvent`). TypeScript build failed.
**Rule:** Never spread `HTMLAttributes<HTMLDivElement>` into a `motion.div`. Accept only the specific
props the component actually needs (e.g. `children`, `className`, `onClick`).
**Trigger:** Any component that wraps `motion.div` or `motion.tr` and accepts pass-through HTML props.
**Status:** Active.

---

### L016 — Shared components have app-wide blast radius; UAT agent cannot catch visual rendering bugs
**What happened:** Applying glassmorphism to `Modal.tsx` changed every modal in the entire app.
`backdrop-blur` on the inner panel blurred the dark overlay directly behind it, producing a near-black
unreadable background. The UAT agent (code-reading only) approved it — it cannot render or see visual output.
The designer agent failed to run. A broken product was deployed to production.
**Rule 1:** Never apply visual changes to a shared component (`Modal.tsx`, `Sidebar.tsx`, etc.) without
explicitly listing every screen that uses it and confirming each is acceptable.
**Rule 2:** `backdrop-filter: blur()` on an element sitting over a dark backdrop (`bg-black/50+`) will
produce a dark smear, not frosted glass. Frosted glass only works when the element sits directly over
page content, not over an opaque overlay.
**Rule 3:** The UAT/designer agents are code reviewers, not browsers. They cannot catch CSS rendering
bugs. For any visual change, manually verify in a real browser before pushing to production.
**Trigger:** Any change to a component used in more than one place; any use of `backdrop-filter`.
**Status:** Active.

---

### W015 — Global CSS override strategy for dark mode (next-themes + .dark utility remapping)
**What happened:** Added dark mode MVP to a codebase with 263+ `bg-white` uses and 304+ `bg-gray-*` uses — without touching a single component file.
**Pattern:**
1. `darkMode: 'class'` in `tailwind.config.ts`
2. `next-themes` with `ThemeProvider attribute="class" defaultTheme="system" enableSystem` — adds `.dark` to `<html>`; handles localStorage + system pref + SSR flash
3. `suppressHydrationWarning` on `<html>` (required — next-themes modifies class server/client)
4. In `globals.css`, a `.dark {}` block with three sections:
   - **Section A**: CSS variable overrides (handles custom-class components like `.bento-card`, `.panel-surface` automatically)
   - **Section B**: Tailwind utility class remapping — `.dark .bg-white { background-color: ... !important; }` — covers all 263+ components without touching them
   - **Section C**: Component-specific overrides (shadows, inputs, recharts, modals)
5. Toggle: `useTheme()` from next-themes in the sidebar. Use a `mounted` state guard to avoid SSR mismatch — render the toggle only after `useEffect(() => setMounted(true), [])`.
**Why `!important` on utility overrides:** Tailwind utilities are all equal specificity. The `.dark` prefix alone doesn't win specificity — `!important` ensures the override always wins.
**RAG colours (green/amber/red):** Do NOT override. They remain vivid on dark backgrounds and provide better visual pop than overriding.
**Print styles:** Do NOT include in dark mode overrides. Ensure print styles use `!important` for `background: white` so they win over the `.dark` block.
**Applies to:** Any project-wide dark mode implementation without component-level `dark:` variants.
**Status:** [PROMOTED → tasks/patterns.md P012]

---

## Wins & Reusable Patterns (W-series)

### W001 — Dirty state from prop comparison, no shadow state needed
**What happened:** Implemented unsaved-changes detection in HorizonDetailPanel by comparing
current field state directly against the original `item` prop. No separate "original" copy
needed — props are already the source of truth for what was last saved.
**Pattern:**
```ts
const isDirty =
  title !== item.title ||
  summary !== item.summary ||
  deadline !== (item.deadline ? item.deadline.slice(0, 10) : "") ||
  notes !== (item.notes ?? "");
```
Keep field state as the mutable local copy; compare against the immutable prop to detect drift.
**Applies to:** Any edit panel/drawer that auto-saves or needs an unsaved-changes guard.

---

### W002 — Role-scoped field filtering: fetch everything, strip before return
**What happened:** For GET endpoints that must hide certain fields from some roles, the
cleanest pattern was: fetch the full Prisma record, then map and null-out sensitive fields
based on caller role — without writing two separate queries.
**Pattern:**
```ts
const isCCRO = user?.role === "CCRO_TEAM";
const safeItem = { ...item, notes: isCCRO ? item.notes : null };
return jsonResponse(serialiseDates(safeItem));
```
Simple, auditable, and keeps Prisma queries clean.
**Applies to:** Any GET endpoint returning records with role-restricted fields.

---

### W003 — Hydration-gated default toggle pattern
**What happened:** Multiple pages needed "default to My items if user owns any" logic, but
Zustand hydration is async. Setting initial state to "my" immediately caused a flash of
empty state before data loaded.
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
`viewModeSet` prevents the effect re-running on subsequent renders/hydration events.
CCRO Team always defaults to "all" (they're expected to see everything).
**Applies to:** Any list page that needs ownership-gated default filter.

---

### W004 — Silent owner filters should always be explicit toggles
**What happened:** Several pages (Risk Register, Processes) had invisible `if (isOwner) filter(ownerId)` logic with no UI indication. Users could not tell they were seeing a filtered view.
**Rule:** Never filter a list silently based on role without surfacing a visible All/My toggle to the user. The toggle is the feature — a silent filter is a UX bug.
**Pattern:** Replace `ownerRiskFilter = isOwner ? currentUser?.id : null` with explicit `viewMode` state + toggle UI (see W003).
**Applies to:** Any list page that previously had silent role-based filtering.

---

### W005 — Vertical timeline pattern for change history
**What happened:** Replaced a flat `ActionChangePanel` list with a full `ActionAccountabilityTimeline`
component. The timeline pattern (node dot + connecting line + coloured card per change) is
immediately readable, scales to any number of changes, and naturally communicates chronology.
**Pattern:**
- Outer container: `relative pl-7` (left padding for nodes)
- Connecting line: `absolute left-2.5 top-2.5 bottom-8 w-px bg-gray-200` (inside the container)
- Each node: `absolute -left-7 mt-2.5 h-5 w-5 rounded-full border-2 border-white shadow-sm`
- Node colour carries status meaning: amber=pending, green=approved, red=rejected, purple=update
- Summary banner above timeline: amber tint on drift/overdue, grey when clean
- Creation node pinned at the bottom with `bg-updraft-bar` colour for distinction
**Applies to:** Any entity that needs an approval workflow history (changes, proposals, reviews).

---

### W006 — Conditional deep-dive sections appended after parent section in HTML exports
**What happened:** Added per-risk spotlight and per-action spotlight sections to the HTML
export. Rather than a separate section key (which would require separate checkbox selection),
the deep-dives are appended immediately after their parent section's content — only when the
user enables the toggle in the parent section's filter panel.
**Pattern:**
```ts
if (key === "risk_register") {
  sectionBodies.push(renderRiskRegisterSection(...));
  if (opts.includeRiskDeepDives && data.riskDeepDives?.length) {
    sectionTOCItems.push(`<a class="toc-link" href="#sec-risk_deep_dives">↳ Risk Deep-Dives</a>`);
    sectionBodies.push(renderRiskDeepDivesSection(data.riskDeepDives));
  }
}
```
This keeps the export flow sequential and avoids users accidentally omitting the deep-dives
by not selecting a separate section key.
**Applies to:** Any export where optional detail sections enrich a parent section.

---

<!-- Add W-series entries here: W014, W015, ... -->

### W010 — Look up by unique reference field, not constructed ID, in seed scripts
**What happened:** RiskActionLink seed used hardcoded `actionId: "act-030"` — but when actions
are upserted by `reference`, if the record already existed with a cuid, the seed's `create.id`
is ignored and the cuid is kept. The link's `actionId` then doesn't match any real action, so
13/33 links were silently skipped.
**Rule:** In seed scripts that link across entities, always resolve the FK at runtime:
```typescript
const action = await prisma.action.findUnique({ where: { reference: link.actionRef } });
if (!action) { console.warn(`⚠ Action not found: ${link.actionRef}`); continue; }
// Now use action.id for the FK
```
**Applies to:** Any seed that creates cross-entity links where the linked entity is also upserted.

### W011 — Idempotent seed with upsert + try/catch for unique constraints
**What happened:** CEO prep seed needed to be safe to re-run (data already in DB from prior
sessions). Every write used `upsert({ where: { id }, update: {...}, create: { id, ... } })`.
For unique-constrained join tables without a natural ID (RiskControlLink, RiskActionLink),
wrapped `create` in `try/catch` to silently skip duplicates.
**Pattern:**
```typescript
try {
  await prisma.riskControlLink.create({ data: { riskId, controlId, linkedBy } });
  count++;
} catch (_) { /* duplicate — skip */ }
```
**Applies to:** Any seed script that creates join table records with unique constraints.

### W009 — SVG arc gauge via stroke-dashoffset + CSS transition
**What happened:** Built ArcGauge entirely in SVG with a single CSS `stroke-dashoffset`
transition — no JavaScript animation loop, no Framer Motion, no RAF.
**Pattern:**
- `arcLength = (240/360) * circumference` — the visible 240° sweep
- `stroke-dasharray: arcLength circumference` — dash covers the full sweep
- `stroke-dashoffset` starts at `arcLength` (0% fill), transitions to `arcLength * (1 - value/100)`
- `transform="rotate(150, cx, cy)"` — centres the 120° gap at 6 o'clock
- `transition: stroke-dashoffset 1s ease-out` — smooth browser animation, zero JS
- Trigger via `useEffect(() => setTimeout(() => setDisplayed(value), 50))` to defer render
**Why it works:** The initial render shows no arc; the timeout triggers a re-render with the
target dashoffset, and the CSS transition runs autonomously. No animation library needed.
**Applies to:** Any SVG arc/circle gauge, progress ring, or radial indicator.

### W007 — AnimatedNumber component pattern for useCountUp in .map()
**What happened:** `useCountUp` is a hook and can't be called inside a `.map()` callback. Created
`AnimatedNumber` as a React component that wraps `useCountUp` — this is a full component so it can
be used inside `.map()` without violating the Rules of Hooks.
**Pattern:**
```tsx
export function AnimatedNumber({ value, duration = 800, className }: Props) {
  const animated = useCountUp(value, duration);
  return <span className={className}>{animated}</span>;
}
// Usage inside .map():
<AnimatedNumber value={card.value} className="text-2xl font-bold" />
```
**Applies to:** Any hook that needs to be used inside a list render. Extract into a micro-component.

---

### W014 — react-grid-layout v2: use /legacy subpath for v1-compatible API
**What happened:** Installed `react-grid-layout@^2.2.2`. v2 is a major breaking change from v1:
`WidthProvider` no longer exists in the main entry point; `resizable.css` was merged into `styles.css`;
v2 ships its own TypeScript types so `@types/react-grid-layout` must NOT be installed.
**Rule:** Always import from `react-grid-layout/legacy` for the v1-compatible API:
```ts
import ReactGridLayout, { WidthProvider, type Layout as RGLLayout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";  // only this import — no resizable.css
const GridLayout = WidthProvider(ReactGridLayout);
```
And do NOT install `@types/react-grid-layout` — v2 has its own built-in types that will conflict.
**The `Layout` type is `readonly LayoutItem[]`**: use `Array.from(newLayout)` to convert to mutable
(follows the same principle as L013/L017 for Map/Set).
**Applies to:** Any project using `react-grid-layout >= 2.0.0`.

---

### W008 — glass-card CSS class has embedded padding/radius — use panel-surface for panels
**What happened:** `.glass-card` in globals.css has `border-radius: 24px; padding: 24px` baked in.
Applying it to a slide-out panel or modal inner div overrides the intended layout. Created `.panel-surface`
as a minimal variant (background + backdrop-filter only, no border/padding/radius) for panels.
**Pattern:** When applying glassmorphism to a component that manages its own layout, create a
minimal utility with only the frosted-glass visual properties. Leave radius/padding to the component.
**Applies to:** Any glassmorphism application to existing components.

---

### W012 — 4-zone page restructure via collapsible sections (no new routes)
**What happened:** QuarterlySummaryTab needed to surface coverage analytics (ArcGauge + trend
chart) above the existing per-control narrative cards without removing any existing feature.
Wrapping the existing cards in a collapsible Zone 4 (collapsed by default) and adding Zones 1-3
above gave users the high-level view by default while keeping full per-control access one click
away — zero information loss, significantly better first impression.
**Pattern:**
- Zone 1: always-visible overview (gauge + stat tiles + trend chart)
- Zone 2: alert section (untested controls), collapsible, auto-expands if items present
- Zone 3: CCRO-editable narrative (localStorage for demo, upgradeable to DB)
- Zone 4: existing detailed cards, collapsible, collapsed by default
`isPerControlExpanded` (false default) + `isUntestedExpanded` (auto-expands when items exist).
**Applies to:** Any tab/page that contains both high-level dashboard content and detailed card grids.
Wrap the detail cards in a collapsible Zone N rather than removing or replacing them.

---

### W013 — URL filter state: Suspense wrap + lazy initialiser + useEffect sync
**What happened:** Added full URL persistence to Horizon Scanning (5 filters) and tab write-back to Controls + Settings.
**Pattern:**
1. Wrap the page default export in `<Suspense><PageInner /></Suspense>` (required by Next.js 14 for `useSearchParams`)
2. Initialise each state with a lazy initialiser reading from `useSearchParams()`:
   `useState<T>(() => (searchParams.get("key") as T) || default)`
3. Sync all state → URL in a single `useEffect` with `router.replace(..., { scroll: false })` — no push (avoids creating history entries)
4. For tab-only pages (Controls, Settings): skip useEffect, just call `router.replace` directly inside the click handler
**Why it works:** Lazy initialisers run once (no re-render on URL change). `router.replace` is history-entry-preserving, so back/forward still works correctly. `{ scroll: false }` prevents the page jumping to top on each filter change.
**Applies to:** Any page with filters, tabs, or search that should survive a page refresh or be shareable via URL.

### L019 — Seed/migration upserts must never override DB-managed ordering fields
**What happened:** Re-running `seed-ceo-prep.ts` to restore outcome metadata also reset the seed
measures' `position` values back to their original `0–8`. These collided with the original real
measures at positions `1–6`, producing interleaved display order (`1.7, 1.1, 1.8, 1.2...`).
**Root cause:** The seed upsert `update` clause included `position: m.position`. Since the seed
treats position as a static value, any re-run overwrites whatever the DB had.
**Rule:** Seed `upsert` update clauses must NOT include `position`, `order`, `sequence`, or any
field whose value is managed post-seed (by migration, user reordering, or re-sequencing logic).
Only include those fields in the `create` clause (initial placement on fresh seed).
**Corollary — Verify order after every migration or seed re-run:** After any data migration
that touches positional data (moving records between parents, re-sequencing, seed re-run),
always verify the resulting display order in the DB before closing the task.
**Trigger:** Any `upsert` in a seed file that includes `position`, `order`, `sortOrder`, or similar.
**Status:** [PROMOTED → CLAUDE.md "Seed & Migration Rules" section]

---

### L020 — Data migration must audit ALL fields on deleted records, not just FK children
**What happened:** When migrating Consumer Duty measures from `cd-outcome-*` duplicates to real
`outcome-*` records, I correctly moved the FK children (measures, metrics, snapshots). But I
deleted the `cd-outcome-*` records without first applying their rich metadata (ragStatus,
previousRAG, monthlySummary, mitigatingActions, riskOwner, shortDesc, detailedDescription) to
the real records. Those real records had simpler original data. The rich CEO prep content was
lost until the seed was re-run to restore it.
**Rule:** Before deleting any record in a migration, enumerate every field on that record and
decide: (1) is it a FK child? → move it. (2) is it metadata on the record itself? → apply it
to the destination record BEFORE deleting the source. Never delete a record until you have
confirmed all its data has been preserved.
**Trigger:** Any migration that deletes source records (even "duplicates").
**Status:** [PROMOTED → CLAUDE.md "Seed & Migration Rules" section]

---

### L021 — Lessons must be written immediately after each mistake, not batched at sprint end
**What happened:** Multiple mistakes occurred this session (position collision, metadata loss,
measureId numbering) with no L-entries written until the user explicitly called it out. The
CLAUDE.md rule says "capture in real time" but in practice lessons were skipped mid-session.
**Rule:** The moment a user corrects an error, a rework is required, or an unexpected consequence
appears — stop and write the L-entry BEFORE continuing. Do not defer to sprint end. The entry
takes 60 seconds and prevents repetition across sessions. This is non-optional.
**Trigger:** Any user correction, any rework, any "that's not right" or "why did you do that".
**Status:** [PROMOTED → CLAUDE.md "During a sprint" section]

---

### L022 — CSS `forwards` animation with `transform` traps nested `position:fixed` overlays
**What happened:** `animate-slide-up-fade` on Modal's content div used `animation-fill-mode: forwards`
with a `to` keyframe of `transform: translateY(0); opacity: 1`. After the 0.25s animation ended,
`forwards` retained `transform: translateY(0)` on the element. Per CSS spec, any non-none `transform`
(even one with no visual effect) creates a **new containing block** for `position: fixed` descendants.
Result: the MetricDrillDown modal's `fixed inset-0` overlay was positioned relative to the content div
(clipped to its bounds) rather than the viewport — so it appeared trapped and cut off inside MIModal.

**Rule 1 — Never retain `transform` via `forwards` on a container that has fixed-position descendants:**
In `to` keyframes for entry animations, omit `transform` (or set it to `none`) when the element may contain
`position: fixed` children. With `forwards`, only the properties declared in `to` are retained — so omitting
`transform` in `to` means the element returns to its natural transform (`none`) after the animation.
```css
/* ❌ traps fixed children after animation */
@keyframes slide-up-fade {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }  /* ← retained by forwards */
}
/* ✅ safe — transform not retained */
@keyframes slide-up-fade {
  from { transform: translateY(16px); opacity: 0; }
  to   { opacity: 1; }  /* ← only opacity retained */
}
```

**Rule 2 — Never render a modal/overlay inside another modal's children:**
Two independent modal overlays must be React siblings (or portaled to `document.body`), never
parent/child. If a second modal is rendered inside the first's `children`, it inherits any
transform, overflow, or stacking context from the parent's content wrapper.
```tsx
/* ❌ nested — trapped by parent's content div */
<Modal>
  <SomeContent />
  <SecondModal open={...} />  {/* fixed overlay trapped inside first modal */}
</Modal>

/* ✅ sibling — fixed overlay escapes to viewport */
<>
  <Modal><SomeContent /></Modal>
  <SecondModal open={...} />
</>
```

**Trigger:** Any `position: fixed` element (modal, drawer, tooltip portal) rendered inside a container
that has a CSS animation using `forwards` fill-mode with `transform`. Also: any modal rendered inside
another modal's `children` prop — always check if it should be a sibling instead.

**Status:** Active.

---

### W016 — IIFE pattern for complex sectionMap entries with local variables
**What happened:** Sprint I needed local variables (`rsOrder`, `rsVisible`, etc.) per section
inside the `sectionMap` object literal. Using IIFEs `(() => { ... })()` as values in the object
cleanly scopes these variables without polluting the outer component scope.
**Rule:** When a sectionMap entry needs computed local variables, use an IIFE rather than
pre-computing at the top of the component. This keeps the logic colocated with its rendering,
avoids naming collisions, and is immediately obvious.
```tsx
"my-section": (() => {
  const visible = getOrder("my-section").filter(id => !hidden.has(id));
  return <div>{visible.map(...)}</div>;
})(),
```
**Trigger:** Any sectionMap entry that needs local variables.
**Status:** [PROMOTED → tasks/patterns.md P011]

---

### W017 — Prisma db push does not always regenerate client; run prisma generate explicitly
**What happened:** Sprint I added `elementOrder` + `hiddenElements` to the schema. Ran
`npx prisma db push` successfully. Build failed with "Object literal may only specify known
properties, and 'elementOrder' does not exist in type...". Root cause: `prisma db push`
did not trigger `prisma generate` in this environment.
**Rule:** After any schema change (`prisma db push` or `prisma migrate`), always explicitly
run `npx prisma generate` before `npx next build`. They are not guaranteed to be atomic.
**Trigger:** Any Prisma schema change.
**Status:** [PROMOTED → MEMORY.md Prisma 7 Gotchas]


### W018 — Auth guards: additive one-liner; always check imports first
**What happened:** Sprint J required auth guards on 8 GET endpoints. Each fix was a
one-liner (`getUserId(request)` + `if (!userId) return errorResponse("Unauthorised", 401)`)
because the import was already present in most files (since POST handlers already used it).
Only 2 files needed an import added (`controls/library/route.ts`, `settings/route.ts`).
**Pattern:** Before adding an auth guard to a GET handler, check if `getUserId` is already
imported — it usually is if the file also has a POST/PATCH/DELETE. If so, the guard is
literally 2 lines. Audit for missing GET guards by searching for files with `POST/PATCH/DELETE`
that check `getUserId` but whose `GET` handler doesn't.
**Also:** When adding an auth guard to a GET handler that previously had no `request` parameter
(e.g. `async function GET()`), always add the parameter: `async function GET(request: NextRequest)`.
**Applies to:** Any security hardening sprint touching API auth.

---

### W019 — AnimatedNumber is a named export (not default)
**What happened:** Sprint M — imported `AnimatedNumber` as a default export (`import AnimatedNumber from ...`); build failed with "Module has no default export". Only caught on first build run.
**Rule:** `AnimatedNumber` uses `export function AnimatedNumber(...)` — always import as `{ AnimatedNumber }`. ScrollReveal uses `export default function ScrollReveal(...)` — import as default.
**Check:** Before adding AnimatedNumber to a new file, look at one existing usage (e.g., risk-register/page.tsx line 21) to confirm the import form.
**Applies to:** Any file that adds AnimatedNumber for the first time.

---

### W020 — MotionTabContent reusable pattern for tab cross-fade
**What happened:** Sprint M — needed tab cross-fade on Compliance and Risk Acceptances pages. Created `src/components/motion/MotionTabContent.tsx` — thin wrapper around `AnimatePresence + motion.div` keyed on `tabKey`. Falls back to plain div for `prefers-reduced-motion`.
**Pattern:** For any page with `{activeTab === "x" && <Comp />}` block siblings, wrap them all in `<MotionTabContent tabKey={activeTab}>` to get free 150ms cross-fade. No restructuring needed.
**File:** `src/components/motion/MotionTabContent.tsx`
**Applies to:** Any tab-based page needing animation polish.

---

### W021 — hydratedAt key pattern for AnimatedNumber on pages without hydration guards
**What happened:** Sprint M M4 — pages with `if (!hydrated) return <Skeleton>` already re-fire AnimatedNumber naturally on hydration (component unmounts/remounts). For pages WITHOUT a hydration guard (e.g. Audit page), AnimatedNumber fires once on mount then may not re-fire if demo value matches DB value.
**Pattern:** On pages without hydration guards, add `const hydratedAt = useAppStore((s) => s._hydratedAt)` and pass `key={`stat-${hydratedAt?.getTime() ?? 0}`}` to AnimatedNumber. Causes a forced remount when hydration completes.
**Applies to:** Any page showing AnimatedNumber that renders immediately with demo data.

---

### W022 — api() body must be a plain object, not pre-serialized string
**What happened:** Sprint N — `handleLinkRegulation` and `handleUnlinkRegulation` used
`body: JSON.stringify({ regulationId })`. The `api()` helper already calls `JSON.stringify(body)`
internally, so passing a pre-serialized string double-encodes it: the server receives a JSON
string `"\"{'regulationId':...'}\"` instead of an object.
**Rule:** Always pass plain objects to `api()`: `body: { regulationId }` not
`body: JSON.stringify({ regulationId })`.
**Trigger:** Any new handler that calls `api()` with a POST/PATCH/DELETE body — check that the
body is a plain object, never a string.
**Status:** Active.

---

### W023 — Include join tables in the bulk list API from the start
**What happened:** Sprint N — `regulationLinks` was added to the `RiskRegulationLink` model
but not included in the `/api/risks` GET `include` block. The regulation panel's "Linked Risks"
section relied on store risks having `regulationLinks` populated, which they did not — making
the computed filter always return empty results until the include was added.
**Rule:** When adding a join table or one-to-many relation to an entity, always add it to the
corresponding bulk-list API include immediately. Do not wait until the UI needs it.
**Pattern:** Search for the entity's `findMany` call and add the new relation to its `include`
at the same time as the schema/type change.
**Trigger:** Any new Prisma relation added to an existing model.
**Status:** Active.

---

## Promotion Log

When the Retrospective Agent recommends a promotion and it is carried out, record it here
so there is a clear trail of what was absorbed into the permanent process.

| Entry | Promoted to | Date | Summary |
|---|---|---|---|
| L001 | CLAUDE.md | — | Never-delete rule |
| L002 | CLAUDE.md | — | Confirm-intent-first rule |
| L003 | CLAUDE.md | — | Replan-after-each-step rule |
| L006 | CLAUDE.md | 2026-02-26 | Decompose multi-task messages before starting |
| W015 | tasks/patterns.md P012 | 2026-02-27 | Global CSS dark mode strategy |
| W016 | tasks/patterns.md P011 | 2026-02-27 | IIFE pattern for sectionMap entries |
| W017 | MEMORY.md Prisma 7 Gotchas | 2026-02-27 | prisma generate after schema changes |
| L017 | Merged → L013 | 2026-02-27 | Set spread requires Array.from() — same rule as Map |
| L021 | CLAUDE.md "During a sprint" | 2026-02-27 | Stop immediately to write L-entry |

---

### W024 — Migration-first pattern for column type conversions
**What happened:** Sprint O O4 — converting DashboardNotification.type from String to a PostgreSQL enum required uppercasing existing DB values BEFORE pushing the schema. Running `npx prisma db push` directly would have failed (enum values must match exactly).
**Pattern:**
1. Write a migration script (`prisma/migrate-*.ts`) with `import "dotenv/config"` at the top
2. Run the migration: `npx tsx prisma/migrate-*.ts`  
3. Confirm it succeeded (rows updated)
4. THEN update schema.prisma with the enum
5. Run `npx prisma db push`
6. Run `npx prisma generate`
**Also:** Always add `import "dotenv/config"` as the FIRST import in any tsx script run outside Next.js — otherwise `process.env` will be empty.
**Status:** Active.

---

### W025 — useDashboardSectionMap hook pattern for large sectionMaps
**What happened:** Sprint O O1 — page.tsx had a 1079-line sectionMap inline. Extracted to `_useDashboardSectionMap.tsx` as a plain function (not a real hook) that takes all needed state as a props object and returns `Record<string, React.ReactNode>`.
**Pattern:**
- Define `SectionMapProps` interface with ALL state the sections need
- Export `useDashboardSectionMap(props: SectionMapProps): Record<string, React.ReactNode>`
- Destructure props at top: `const { risks, actions, ... } = props;`
- Call hook in parent component — ESLint treats `use*` functions as hooks (must call before early returns)
- Pass all computed state/callbacks as props — no store reads inside the hook
**Result:** page.tsx reduced by 1068 lines, all sections remain functional.
**Status:** Active.
