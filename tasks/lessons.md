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

### L013 — TypeScript Map iteration requires Array.from() at older targets
**What happened:** Used `for (const [, items] of byControl)` directly on a `Map<string, T[]>` in
`export-html-builder.ts`. TypeScript rejected it with: "Type 'Map<...>' can only be iterated
through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher."
**Rule:** When iterating a `Map` with `for...of`, always wrap it: `for (const [, items] of Array.from(map))`.
This works at any target without config changes.
**Trigger:** Any new `for...of` loop over a `Map` or `Set` in TypeScript.
**Status:** Active.

---

<!-- Add new L-series entries here: L014, L015, ... -->

### L014 — Spreading HTMLAttributes into motion.div causes type conflict
**What happened:** `MotionDiv` accepted `HTMLAttributes<HTMLDivElement>` via spread, which includes
`onDrag` typed as `DragEventHandler<HTMLDivElement>`. Framer Motion's `motion.div` redefines `onDrag`
with an incompatible signature (takes `MouseEvent | PointerEvent | TouchEvent`). TypeScript build failed.
**Rule:** Never spread `HTMLAttributes<HTMLDivElement>` into a `motion.div`. Accept only the specific
props the component actually needs (e.g. `children`, `className`, `onClick`).
**Trigger:** Any component that wraps `motion.div` or `motion.tr` and accepts pass-through HTML props.
**Status:** Active.

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

<!-- Add W-series entries here: W007, W008, ... -->

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

### W008 — glass-card CSS class has embedded padding/radius — use panel-surface for panels
**What happened:** `.glass-card` in globals.css has `border-radius: 24px; padding: 24px` baked in.
Applying it to a slide-out panel or modal inner div overrides the intended layout. Created `.panel-surface`
as a minimal variant (background + backdrop-filter only, no border/padding/radius) for panels.
**Pattern:** When applying glassmorphism to a component that manages its own layout, create a
minimal utility with only the frosted-glass visual properties. Leave radius/padding to the component.
**Applies to:** Any glassmorphism application to existing components.

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
