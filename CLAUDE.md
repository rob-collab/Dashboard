# Meridian — Claude Instructions

## Project Vision: What Meridian Is and Who It's For

Meridian is an internal Governance, Risk & Compliance (GRC) platform built for
Updraft (Fairscore Ltd), a UK-regulated phased consolidation lender operating
under FCA supervision.

### The problem it solves
Compliance management at a regulated firm is typically fragmented across
spreadsheets, email threads, and manual tracking. Meridian replaces that with
a single source of truth — one place where risks, controls, actions, policies,
Consumer Duty obligations, SMCR records, and regulatory horizon items are all
connected to the same data model and auditable.

### The three users it serves
- **CCRO** — the power user and system owner. Needs full access to everything,
  fast decision-making on pending items, and confidence that the system reflects
  reality. Meridian is their operating environment.
- **OWNER** — functional owners who hold accountability for specific risks,
  controls, or CD outcomes. Not compliance specialists. Must find the interface
  so simple and specific that engagement is the path of least resistance.
- **CEO** — uses Meridian as a control panel, under time pressure. Needs a
  5-second answer to "is anything on fire?" and one-click drill-down when it is.

### The design principle
Every screen should direct attention, not list information. The right question
to ask of any UI change: "Does this help the intended user act faster and more
confidently, or does it add to their cognitive load?"

### Regulatory context
The system is built around the FCA regulatory regime:
- **Consumer Duty** — outcome health, metric tracking, evidence of fair treatment
- **SMCR** — Senior Manager responsibilities, certification, conduct rules
- **Horizon Scanning** — emerging regulatory changes, FCA publications
- **Risk & Controls** — inherent/residual risk scoring, control testing, RAG status
- **Actions** — remediation tracking, ownership, due dates, escalation

---

## Step 0a: Decompose the Message First

**Before anything else — before clarifying questions, before planning, before reading files —
scan the full message for every distinct task it contains.**

The user frequently sends messages with multiple requests in a single prompt. Every one of
them is a real task. Missing any is a failure.

**How to decompose:**
1. Read the entire message
2. List every discrete request, question, or instruction as a numbered inventory — even
   small ones buried in context or mentioned in passing
3. Surface the inventory back to the user immediately:
   > "I see [N] tasks here:
   > 1. ...
   > 2. ...
   > 3. ...
   > Is that the full list, or have I missed anything?"
4. Create a `TaskCreate` entry for each item — this is the working list for the session
5. Do NOT start implementing until the inventory is confirmed

**Triggers — always decompose when the message contains:**
- More than one sentence that could be an instruction
- Words like "also", "and", "as well", "plus", "another thing", "while you're at it"
- A list (numbered, bulleted, or comma-separated tasks)
- Background context followed by multiple questions
- Mixed request types (e.g. a fix AND a feature AND a question)

**After confirmation:** work through items in the order agreed, marking each `TaskUpdate`
complete before starting the next. Never declare the message handled until every item on
the confirmed inventory is done.

---

## Step 0b: Re-surface Unanswered Questions After Compaction

**This step fires FIRST at every session resume where a compaction summary is present.**

Context compaction silently discards open questions. "Continue" from the user does NOT
cancel questions that were never answered. Open questions survive compaction and must be
re-asked before any work begins.

**How to check:**
1. Read the compaction summary (or the system-reminder context at session start)
2. Look for any phrase like: "pending questions", "asked the user", "waiting for answers",
   "3 questions were posed", "no user response", or similar
3. If found, **stop immediately** — do not read files, do not plan, do not write code

**How to re-surface:**
> "Before I proceed, I need to re-ask [N] questions from the previous session that were
> never answered:
> 1. [exact question]
> 2. [exact question]
> ...
> Please answer these before I continue."

Then wait. Do not interpret "continue" as permission to skip unanswered questions.

**What counts as an open question:**
- Data mapping decisions ("which field maps to which?")
- Scope clarifications ("should this affect X or just Y?")
- User preference choices ("option A or option B?")
- Any question that, if wrong, would cause the wrong work to be done

**The rule in one sentence:** If a question was asked and never answered, it is still open —
regardless of compaction, session boundaries, or "continue" instructions.

---

## Step 0c: Understand Intent Before Any Work

**Before writing a single line of code or a plan, ask clarifying questions if ANY of the following are true:**

- The request touches more than one area of the UI or codebase
- It is not obvious which files will change
- The desired end-state is ambiguous (e.g. "improve", "fix", "update", "rework")
- A feature could reasonably be interpreted in two or more ways
- The request involves removing, replacing, or restructuring something

**How to ask:**
- Ask 1–3 focused questions, not an open-ended "what do you want?"
- Propose your interpretation first, then ask if it is correct
- Example: "My reading is that you want X on the Y page, leaving Z untouched — is that right?"
- Do NOT start implementing while waiting for an answer

Exceptions — skip questions only when the request is fully unambiguous and single-file.

---

## CRITICAL: Read the Complete File Before Any Edit

**Before editing any file — for any reason, of any size — call the Read tool on the entire
file. Not a range. Not the lines around the error. The whole file.**

This applies equally to:
- A 400-line feature implementation
- A one-line lint fix
- Removing an unused import
- Any other change that feels too small to need context

**Why:** A removed variable may have a setter still called elsewhere in the same file.
A deleted import may be referenced in a branch further down. A "trivial" fix seen in
isolation is frequently not trivial in context. This was the direct cause of two
consecutive broken deployments in March 2026 (L029).

**After reading the full file, before removing any identifier (variable, function,
import, state, prop, type):**
1. Grep the file for every usage of that identifier
2. Grep the codebase for cross-file usages
3. Only proceed once both searches return zero unexpected references

There is no exception for small tasks. There is no exception for lint fixes. There is
no exception for hotfixes. If you have not read the complete file, you may not edit it.

---

## Workflow: Every Change Request

For every change request (features, fixes, improvements):

0. **Read `tasks/lessons.md` AND `tasks/patterns.md` before planning** — before writing a single
   line of PLAN.md or code, scan both files for patterns relevant to the work about to start.

   - `tasks/lessons.md`: scan active L-entries. Ask: "Could I repeat the same class of mistake?"
   - `tasks/patterns.md`: scan the D-series design contract. Ask: "Does the work I'm about to do
     touch a panel, table, form, navigation, badge, or cross-entity reference? If so, which
     D-series rules apply?" Check specifically:
     - Any new panel → D007, D016, D018, D020 (structure, textareas, sizing, edit unlock)
     - Any cross-entity reference → D019 (EntityLink required)
     - Any many-to-many display → D024 (linked items chip layout)
     - Any panel with detail sections → D022 (collapsible sections)
     - Any new route or panel opened by URL → D023 (URL state)
     - Any table or list → D017 (text overflow truncation)
     - Any new stat/summary card → D004 (must be interactive filter)
     - Any UI text, labels, toast copy, or comments → D025 (UK British English required)
     - Any seed upsert or data migration → D026 (never override position in update clause)

   If a pattern is directly relevant, state it explicitly before writing the plan.

0.5. **Design intent — for any deliverable that touches visible UI** — before writing the plan,
   state three things explicitly (one sentence each):
   - **Who** is using this screen and what are they trying to accomplish?
   - **What is the one thing** we must get right for them? (the peak moment, the core task)
   - **What can we remove or defer** to reduce cognitive load?

   This is not a UX essay. It is three sentences that force the right thinking before a single
   component is designed. If you cannot answer all three, stop and ask before planning.

   Example:
   > Who: A compliance officer reviewing overdue actions at the start of their week.
   > One thing: They must be able to see what's overdue and who owns it in under 5 seconds.
   > Remove: The filter panel can be collapsed by default — most visits are a quick scan, not a deep filter session.

   Skip this step only for changes that are purely cosmetic (a label fix, a colour correction)
   or purely backend (an API route with no UI surface).

0.75. **Propose agent teams before writing the plan** — after reading lessons/patterns and stating
   design intent, assess whether this sprint warrants running as an agent team.

   **Propose agent teams when ANY of the following are true:**
   - The sprint has 3 or more independent deliverables that don't share state or ordering
   - The sprint touches 3 or more separate screens or feature areas simultaneously
   - A deliverable requires parallel build + review + regression checking that would
     be slow or context-heavy done sequentially in a single session
   - The sprint includes both backend (schema/API) and frontend work that could progress
     in parallel once the schema is agreed
   - A previous sprint of similar scope produced regressions that a parallel reviewer
     would have caught earlier

   **How to propose:**
   > "This sprint has [N] independent deliverables across [areas]. I'd suggest running
   > this as an agent team — one lead session for [X], parallel teammates for [Y] and [Z].
   > Want me to set that up, or proceed single-session?"

   **When NOT to propose agent teams:**
   - A single-file bug fix or cosmetic change
   - A tightly sequential chain where step 2 depends on step 1's output
   - A sprint with only 1–2 deliverables
   - The user has explicitly said to proceed without a team

   If the user approves, structure the plan with a section:
   ```
   ## Agent Team Structure
   - Lead: [responsibility]
   - Teammate A: [responsibility + which PLAN.md items]
   - Teammate B: [responsibility + which PLAN.md items]
   ```

1. **Write to PLAN.md first, then surface it and wait for approval** — before touching any code:
   a. Add the requested items to `PLAN.md` under a new sprint heading (or the current sprint if one is active). Include:
      - What is being changed and why
      - The design intent (who / one thing / remove) if UI-touching
      - Files to be modified/created
      - Agent team structure (if applicable — see step 0.75)
      - A checklist of acceptance criteria (`- [ ] ...`)
   b. **Surface the full plan to the user** — paste or summarise it in the conversation so they can read it
   c. **Wait for explicit approval** ("yes", "proceed", "looks good") before writing a single line of code
   d. If the user identifies any issue with the plan, update PLAN.md and surface the revised plan before proceeding

   **There is no exception to the approval gate.** A plan handed to you at the start of a session must still be surfaced and confirmed — plans can contain mistakes, omissions, or decisions the user did not intend. "Implement the following plan" is not the same as "I have read and approved every decision in this plan."

2. **Implement one deliverable at a time — senior developer review gate after each** — do not batch all changes into one pass. After each change — including hotfixes, lint fixes, and single-line edits — run all three layers before moving on. There is no fast path. A change that feels trivial still goes through the gate:

   **Layer 1 — Build & verify:**
   - State clearly what was just implemented
   - Verify it against the relevant checklist item(s)
   - Explicitly check: did anything break or get silently removed?
   - Tick done items, add newly discovered items, flag gaps in the plan

   **Layer 2 — Senior developer review:**
   - Does this implementation actually solve the problem it was designed to? Would a staff engineer approve it?
   - Are there edge cases or error paths that have not been handled?
   - Does the code follow existing patterns in the codebase (store pattern, UK spelling, brand colours, Prisma adapter, etc.)?
   - Has anything been discovered during implementation that should revise the plan — new risks, simpler approach, missing acceptance criteria?
   - **Design contract check**: Re-read the relevant D-series entries in `tasks/patterns.md` for
     everything this deliverable touches. Explicitly confirm or deny each:
     - Panels: correct flex structure (D007/D018)? pencil edit unlock (D020)? AutoResizeTextarea (D016)?
     - Cross-entity refs: all rendered as EntityLink (D019)? URL state wired (D023)?
     - Many-to-many: chip layout with add/remove (D024)? Collapsible sections (D022)?
     - Tables: truncation + title on all text cells (D017)? Bento cards are filters (D004)?
     If any D-series rule is violated, fix it before marking the deliverable done.
   - **System integration check**: Does this feature touch entities (actions, risks, controls, etc.) that already exist elsewhere in the app? If so, explicitly confirm it wires into the existing views and data — same store slices, same API routes, same navigation patterns. Do not create parallel data paths for the same entity.
   - **Consistency check**: Does this introduce any inconsistency in design (layout, colours, typography, component patterns) or data presentation (how the same field is labelled, formatted, or sorted) compared to existing screens? If yes, state the inconsistency and describe how you will harmonise it — either by matching the new work to the existing pattern, or by proposing a deliberate upgrade to both.

   **Layer 3 — UAT / UX review:**
   - What will an end user actually see or experience as a result of this change?
   - Is the experience better, the same, or worse than before this change?
   - Are there any behaviours or functions that have changed in a way the user would not expect?
   - What would a reasonable user expect to be able to do — and can they still do it?
   - Are there any side effects on adjacent features, flows, or roles?

   Only proceed to the next deliverable once all three layers are satisfied.

3. **Before committing/pushing, review PLAN.md** — go through every checklist item and confirm it is done. Tick completed items (`- [x]`). If something is incomplete, finish it or flag it explicitly to the user before pushing.

4. **Commit** — include PLAN.md in the commit so the plan and code stay in sync.

5. **Push** — only after all checklist items are ticked (or any gaps are explicitly acknowledged).

---

## Agent-Assisted Review Gates

Specialist sub-agents are stored in `.claude/agents/`. They are invoked at specific checkpoints
using the Agent tool with `subagent_type: general-purpose` or `subagent_type: Explore`, given
the relevant agent prompt as context. **Run all Tier 1 agents in parallel — never sequentially.**

### When to invoke which agent

| Agent | File | Invoke when |
|---|---|---|
| UAT Agent | `.claude/agents/uat-agent.md` | After every deliverable that changes visible UI |
| Regression Agent | `.claude/agents/regression-agent.md` | After every deliverable — sweeps adjacent screens for side-effects |
| Planning Agent | `.claude/agents/planning-agent.md` | After every deliverable (plan sync) AND at sprint boundaries (full drift review) |
| Designer Agent | `.claude/agents/designer-agent.md` | After every new screen, component, or visual change |
| Compliance Agent | `.claude/agents/compliance-agent.md` | After changes to risk/control/SMCR/obligations data model or logic |
| Retrospective Agent | `.claude/agents/retrospective-agent.md` | Sprint end only |

### Tiered usage

**Tier 1 — Every deliverable (run ALL in parallel):**
- Build: `npx next build` via Bash — zero errors required
- UAT agent: `Explore` subagent — CCRO end-user review of changed AND adjacent screens
- Regression agent: `Explore` subagent — system-wide side-effect sweep **including Step -1 file-scope audit**
- Planning sync: `general-purpose` subagent — quick check: does this deliverable match PLAN.md?
  Tick completed items; flag if implementation drifted from the plan; propose PLAN.md updates if needed

**When using subagent-driven-development (SDD):**
The SDD skill runs its own implementer → spec reviewer → code quality reviewer loop. The regression
agent is NOT part of that loop by default — but it is REQUIRED here regardless. After the code
quality reviewer approves, run the regression agent before marking the task complete. Provide it:
1. The git diff of changed files (`git diff HEAD~1 HEAD --name-only`)
2. The task's stated file list from the plan
3. The entity types touched

If the regression agent returns REGRESSION CONFIRMED (including a file-scope violation from Step -1),
the implementer must fix it before the task is marked complete. This is not optional and is not
satisfied by spec or quality review passing.

**Tier 2 — New screens, components, or significant visual changes (add to Tier 1):**
- Designer agent: `Explore` subagent — design system adherence + UX quality

**Tier 3 — Domain logic changes (risk, controls, SMCR, obligations, audit):**
- Compliance agent: `general-purpose` subagent

**Sprint boundary (Tier 4 — in addition to all above):**
- Planning agent (full): `general-purpose` subagent — comprehensive sprint drift review
- Retrospective agent: `general-purpose` subagent — lessons and wins

### How to invoke — always provide entity context

When invoking UAT, Regression, or Designer agents, always include in your prompt:

```
1. The files directly changed in this deliverable
2. Which data entities those files touch (e.g. "risks, controls, actions")
3. "Also check these adjacent screens that use the same entities: [list them]"
```

This is not optional. Agents reviewing only the changed file in isolation will miss
regressions and consistency drift. The adjacent screen list should come from a quick
grep of the codebase for the entity types identified.

Example prompt structure:
```
[paste contents of .claude/agents/uat-agent.md]

Deliverable: [what was built]
Changed files: [list]
Entities touched: [e.g. Regulation, ComplianceStatus, controlLinks]
Adjacent screens to also check: [e.g. compliance/page.tsx, risk-register, action panels]
```

### When an agent returns FAIL, BLOCK, or RISKS IDENTIFIED

**This is a mandatory loop — not a suggestion:**

1. **STOP** — do not proceed to the next deliverable
2. Add a rework item to PLAN.md: `- [ ] REWORK: [agent finding summary]`
3. Identify the root cause (use systematic-debugging skill if needed)
4. Implement the fix
5. Re-run **only** the agent(s) that flagged the issue (on the same files + adjacent screens)
6. Only proceed when every agent returns PASS / CLEAR / CONSISTENT

**Never mark a deliverable done while any agent finding is outstanding.** "I'll fix it in the
next deliverable" is not acceptable — fix it now, re-run the agent, confirm it's resolved.

### Design iteration when problems are found

If an agent finds a design problem (BLOCK, UX ISSUE, VISUAL CRAFT ISSUE):

1. Do not patch cosmetically — understand the root cause
2. Update PLAN.md to reflect the revised design (acceptance criteria may need to change)
3. Re-implement from the revised spec
4. Re-run Designer + UAT agents — confirm the fix doesn't introduce new issues

Agent findings are consolidated before proceeding. Any FAIL (UAT), REGRESSION CONFIRMED
(Regression), NON-COMPLIANT (Compliance), or BLOCK (Designer) blocks progress until resolved.

---

## PLAN.md Conventions
- Active sprint: `## CURRENT SPRINT: <name>` — mark `✅ COMPLETE` when done
- Completed sprints: move to `## PREVIOUSLY COMPLETED` section
- Checklist syntax: `- [ ]` pending, `- [x]` done
- Update `Last updated:` date on every edit

---

## General Preferences
- UK British spelling throughout (colour, authorised, sanitised, etc.)
- Comprehensive review before declaring done
- Build must pass (`npx next build`) before pushing
- Review `tasks/lessons.md` at the start of each session for patterns relevant to the current work

---

## CRITICAL: Bento Cards Must Be Interactive Filters

**Every summary/stat card (bento card) MUST be a clickable filter, not a cosmetic display.**

When a bento card shows a count, category, or status (e.g. "5 HIGH risks", "3 Actions Overdue",
"2 In Focus"), clicking it MUST filter the view below to show only that subset of data.
This is a non-negotiable product requirement — it is the entire point of surfacing the number.

**Before building any bento card or summary stat:**
- Confirm what it filters and how (which list/table, which filter field, which value)
- Wire the click handler to the relevant filter state
- Ensure the filtered state is visually indicated (active/selected styling on the card)
- Ensure clicking again (or clicking a different card) resets or changes the filter

**Never build a read-only bento card.** If you cannot determine what it should filter,
ask before building it.

---

## CRITICAL: All Elements Must Be Editable and Persist

**Every UI element that displays data must be editable by the CCRO Team, and all edits
must persist to the database. There are no cosmetic-only views.**

Rules:
- **CCRO Team** can edit every element on every screen — name, description, scores,
  status, dates, assignments, notes, linked items, everything
- **Other roles** follow their assigned permissions (as defined in `src/lib/permissions.ts`)
- **All changes must call the relevant API** (PATCH/POST/DELETE) and update the persistent
  DB record — not just the local Zustand store
- **The store is updated optimistically** but the API call is never fire-and-forget for
  user-initiated edits — use explicit save with confirmation toast, not silent background sync
- If a panel, card, or section displays a field, there must be an edit path for that field
  accessible to CCRO Team. Read-only display for CCRO is a bug, not a design choice.

**Before building any UI component:** ask "Can the CCRO Team edit this? Does saving it
call the API and persist to the DB?" If either answer is no, fix it before shipping.

---

## CRITICAL: Flag Conflicts Before Implementing

**Before writing any code for a new feature or change, explicitly check and call out:**

1. **Override risk**: Will this change override, undo, or conflict with a previous
   implementation? (e.g. restyling a component that was deliberately designed, changing
   a data pathway that was explicitly agreed, reverting a bug fix)

2. **Standard conflict**: Does anything in the prompt risk introducing inconsistency
   with an already-agreed design standard, data schema, API contract, or navigation
   pattern? (e.g. a new filter that bypasses the existing filter state, a new modal that
   duplicates an existing panel, a new field that duplicates an existing field with a
   different name)

3. **Pathway conflict**: Does this create a parallel data path for an entity that already
   has one? (e.g. creating a second way to raise actions from risks when one already exists)

**How to flag:** Before the plan, state explicitly:
> "⚠️ Conflict check: [describe any conflicts found, or 'None identified']"

If a conflict is identified, describe it and propose how to resolve it (align with existing
standard, or propose a deliberate upgrade) BEFORE proceeding. Do not silently implement
something that conflicts with previous work.

---

## CRITICAL: Never Delete Existing Features

**Do NOT remove, delete, or disable any existing feature, UI component, tab, route, API endpoint, or functionality unless the user explicitly and unambiguously requests it.**

- If a feature is being replaced, keep the original until the replacement is confirmed working
- If you are refactoring a file, preserve all existing tabs, panels, imports, and logic
- If you are unsure whether something is still needed, KEEP IT and ask
- When adding new code to a file, audit your changes to confirm nothing has been silently removed
- Before committing any modification to an existing file, diff the before/after and explicitly state in the commit message if anything was removed

**Deletion detection checklist** — run this before every commit on a modified file:
- [ ] Are all tabs/panels still present?
- [ ] Are all imports still present (or deliberately removed with a stated reason)?
- [ ] Are all API route handlers still intact?
- [ ] Are all Zustand store slices still intact?
- [ ] Does the page/component still render the same sections it did before?

---

## CRITICAL: Two Detail Panel Archetypes — PanelPortal Rules

This app has two fundamentally different detail panel patterns. Confusing them silently breaks the UI (build passes, feature invisible). Before touching any `*DetailPanel`:

**Overlay panels** — slides in from the right, dark backdrop, covers the page. Root element is `fixed right-0 top-0 bottom-0 z-50` (or similar). **MUST use `<PanelPortal>`** to escape parent CSS transforms. Covers: ProcessDetailPanel, PolicyDetailPanel, RiskDetailPanel, HorizonDetailPanel, ActionDetailPanel, RiskAcceptanceDetailPanel, RegCalEventDetailPanel.

**Inline split-pane panels** — renders as a flex column inside a sibling flex container alongside a list. Root element is `flex flex-col h-full`. **Must NOT use `<PanelPortal>`** — teleporting to `document.body` leaves the container empty. Covers: IBSDetailPanel.

**Checklist before modifying any `*DetailPanel`:**
- [ ] Is the panel's root element `fixed ...` or `flex flex-col h-full`?
- [ ] If `fixed` → PanelPortal is correct. If `flex flex-col h-full` → remove PanelPortal.
- [ ] Did you copy structure from another panel? Verify the archetype matches.
- [ ] After any change, manually click an item to open the panel — don't rely on build alone.

---

## CRITICAL: Seed & Migration Rules

**These rules prevent data ordering corruption and silent metadata loss during seed operations and migrations.**

### Rule 1 — Never include ordering fields in seed upsert `update` clauses

Seed scripts use `prisma.MODEL.upsert({ where: { id }, update: {...}, create: {...} })`.
The `update` clause runs on every re-seed. If `position`, `order`, `sequence`, or any
display-ordering field is in the `update` clause, re-running the seed will overwrite
DB-managed positions and corrupt display order.

**The rule:**
- `position`, `order`, `sequence`, `sortIndex`, and all ordering fields belong in `create` only
- Never put them in `update`
- After any seed re-run or migration, verify display order in the UI before pushing

**Diagnostic:** If items appear interleaved (e.g. `1.7, 1.1, 1.8, 1.2...`), check whether
the seed reset positions on re-run. Fix with a targeted `UPDATE` query to derive positions
from the display ID or intended order.

### Rule 2 — Audit ALL fields before deleting records in a migration

Before any `DELETE` in a migration script, enumerate every field on the record and classify each:
- **FK child rows** (e.g. measures pointing to this outcome) → move them (update FK) BEFORE deletion
- **Metadata on the record itself** (e.g. ragStatus, narrative, commentary, dates) → copy to the
  destination record BEFORE deleting the source

Never delete a record assuming only FK children need moving. Rich metadata on the record
itself is silently lost unless explicitly preserved.

**Checklist before any `DELETE` in a migration:**
- [ ] Have I listed every column on this model?
- [ ] Have I identified which columns hold data that must be preserved?
- [ ] Have I written those values to the destination record BEFORE this DELETE?
- [ ] Have I verified the destination record has the expected data AFTER the DELETE?

---

## Continuous Learning System

### During a sprint — capture in real time

**When a mistake happens (user corrects, rework required, wrong scope):**
**STOP IMMEDIATELY and write the L-entry before doing anything else.** Do not finish the
current task first. Do not defer to sprint end. The entry takes 60 seconds and prevents
repetition across sessions. This is non-optional.
1. Identify the root cause class — not the specific instance, the general pattern
2. Add an `L00N` entry to `tasks/lessons.md` (append to the Mistakes section)
3. Note the trigger condition and the rule to prevent recurrence
4. Do NOT immediately promote — let the retrospective decide if it's general enough

**When something works notably well:**
1. Note it as a `W00N` entry in `tasks/lessons.md` (append to the Wins section)
2. Describe what worked and why — be specific enough that it's reusable
3. Again, let the retrospective decide whether to promote

### At sprint end — document first, then retrospective

**Step 1 — Document lessons before anything else.**
Before running the Retrospective Agent or declaring a sprint complete, manually reflect
on the sprint and write any new lessons:
- What went wrong, required rework, or surprised you? → Add an `L00N` entry
- What worked well and is worth repeating? → Add a `W00N` entry
- Did any existing lesson prove relevant? Note it in the entry if so
This is not optional. Every sprint should produce at least one L or W entry.

**Step 2 — Run the Retrospective Agent.**
Run the Retrospective Agent (`.claude/agents/retrospective-agent.md`) as a
`general-purpose` subagent. It reads lessons, wins, agent outputs, commits, and PLAN.md
from the sprint and recommends what to promote and where.

**Promotion targets:**

| Learning type | Promote to |
|---|---|
| Process rule that should always apply | `CLAUDE.md` — add to the relevant section |
| An agent missed something it should catch | `.claude/agents/NAME.md` — add new criterion |
| Architectural or domain knowledge | `MEMORY.md` — add to the relevant section |
| Reusable implementation pattern | `tasks/patterns.md` — add a P00N entry |
| Project-specific "never do this" | Stays in `tasks/lessons.md` as a standing rule |

**After promoting:**
- Mark the source entry in `tasks/lessons.md` as `[PROMOTED → file]`
- Add a row to the `tasks/lessons.md` Promotion Log

### The promotion principle

A lesson earns promotion when:
- It has recurred (or would have recurred) in more than one context
- The promoted location is where it will actually be read before the relevant work starts
- The wording in the target file is action-oriented and specific (not "be careful")

Do NOT promote speculatively. A lesson that only applies to one rejected feature stays
as an L-entry — it should not clutter CLAUDE.md with specifics.

### Session start

At the start of every session:
1. Review `tasks/lessons.md` — active rules (non-promoted L-entries) and any W-entries
2. Review `tasks/patterns.md` — if the current task resembles a known pattern, use it
3. Both files are short by design — if they grow past ~200 lines, the retrospective
   should distil and prune them

---

## Declaring Work Complete

Never tell the user that changes are implemented or a sprint is done without first completing ALL of the following:

1. **Read PLAN.md in full** — go through every checklist item in the current sprint
2. **Confirm every item is ticked `- [x]`** — if any item is unticked, finish it or explicitly flag it as a known gap before saying anything is done
3. **Run `npx next build`** — zero errors, zero type errors required
4. **Final UAT pass** — describe what an end user will see and experience, what has changed compared to before, whether it is an improvement, and whether any existing behaviour has changed unexpectedly
5. **Document lessons** — write any new L or W entries to `tasks/lessons.md` before closing the sprint. If nothing new was learned, state that explicitly. Do not skip this step.

Do not say "done", "complete", "implemented", or any equivalent until steps 1–5 are all satisfied.

---

## Verification Before Done

Never mark a task complete without proving it works:
- Run `npx next build` — zero errors, zero type errors
- For UI changes: describe what the user will see and confirm it matches intent
- For API changes: confirm request/response shape has not regressed
- Ask: "Would a staff engineer approve this?"
