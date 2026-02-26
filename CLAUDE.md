# CCRO Dashboard — Claude Instructions

## Step 0: Understand Intent Before Any Work

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

## Workflow: Every Change Request

For every change request (features, fixes, improvements):

1. **Write to PLAN.md first** — before touching any code, add the requested items to `PLAN.md` under a new sprint heading (or the current sprint if one is active). Include:
   - What is being changed and why
   - Files to be modified/created
   - A checklist of acceptance criteria (`- [ ] ...`)

2. **Implement one deliverable at a time — senior developer review gate after each** — do not batch all changes into one pass. After each meaningful deliverable, run all three layers before moving on:

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

## Self-Improvement Loop

When the user corrects a mistake or points out something that went wrong:

1. Identify the root cause pattern (not just the specific instance)
2. Write a rule to `tasks/lessons.md` that prevents the same class of mistake
3. Confirm the lesson was written before moving on
4. Review `tasks/lessons.md` at the start of future sessions for active reminders

---

## Declaring Work Complete

Never tell the user that changes are implemented or a sprint is done without first completing ALL of the following:

1. **Read PLAN.md in full** — go through every checklist item in the current sprint
2. **Confirm every item is ticked `- [x]`** — if any item is unticked, finish it or explicitly flag it as a known gap before saying anything is done
3. **Run `npx next build`** — zero errors, zero type errors required
4. **Final UAT pass** — describe what an end user will see and experience, what has changed compared to before, whether it is an improvement, and whether any existing behaviour has changed unexpectedly

Do not say "done", "complete", "implemented", or any equivalent until steps 1–4 are all satisfied.

---

## Verification Before Done

Never mark a task complete without proving it works:
- Run `npx next build` — zero errors, zero type errors
- For UI changes: describe what the user will see and confirm it matches intent
- For API changes: confirm request/response shape has not regressed
- Ask: "Would a staff engineer approve this?"
