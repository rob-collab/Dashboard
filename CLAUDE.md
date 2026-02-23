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
