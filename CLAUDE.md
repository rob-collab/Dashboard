# CCRO Dashboard — Claude Instructions

## Workflow: Every Change Request

For every change request (features, fixes, improvements):

1. **Write to PLAN.md first** — before touching any code, add the requested items to `PLAN.md` under a new sprint heading (or the current sprint if one is active). Include:
   - What is being changed and why
   - Files to be modified/created
   - A checklist of acceptance criteria (`- [ ] ...`)

2. **Implement** — do the work.

3. **Before committing/pushing, review PLAN.md** — go through every checklist item and confirm it is done. Tick completed items (`- [x]`). If something is incomplete, finish it or flag it explicitly to the user before pushing.

4. **Commit** — include PLAN.md in the commit so the plan and code stay in sync.

5. **Push** — only after all checklist items are ticked (or any gaps are explicitly acknowledged).

## PLAN.md Conventions
- Active sprint: `## CURRENT SPRINT: <name>` — mark `✅ COMPLETE` when done
- Completed sprints: move to `## PREVIOUSLY COMPLETED` section
- Checklist syntax: `- [ ]` pending, `- [x]` done
- Update `Last updated:` date on every edit

## General Preferences
- Autonomous execution — no confirmation prompts needed for routine work
- UK British spelling throughout (colour, authorised, sanitised, etc.)
- Comprehensive review before declaring done
- Build must pass (`npx next build`) before pushing

## CRITICAL: Never Delete Existing Features
**Do NOT remove, delete, or disable any existing feature, UI component, tab, route, API endpoint, or functionality unless the user explicitly and unambiguously requests it.**

- If a feature is being replaced, keep the original until the replacement is confirmed working
- If you are refactoring a file, preserve all existing tabs, panels, imports, and logic
- If you are unsure whether something is still needed, KEEP IT and ask
- When adding new code to a file, audit your changes to confirm nothing has been silently removed
- Before committing any modification to an existing file, diff the before/after and explicitly state in the commit message if anything was removed
