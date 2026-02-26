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

<!-- Add new L-series entries here: L006, L007, ... -->

---

## Wins & Reusable Patterns (W-series)

<!-- Add W-series entries here: W001, W002, ... -->
<!-- Format:
### W001 — [Short title]
**What happened:** [What worked well and why]
**Pattern:** [The reusable rule or approach]
**Applies to:** [Where/when to use it again]
**Status:** [Raw | PROMOTED → file]
-->

---

## Promotion Log

When the Retrospective Agent recommends a promotion and it is carried out, record it here
so there is a clear trail of what was absorbed into the permanent process.

| Entry | Promoted to | Date | Summary |
|---|---|---|---|
| L001 | CLAUDE.md | — | Never-delete rule |
| L002 | CLAUDE.md | — | Confirm-intent-first rule |
| L003 | CLAUDE.md | — | Replan-after-each-step rule |
