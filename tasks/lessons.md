# Lessons Learned

Rules derived from real mistakes. Review this file at the start of each session.

---

## L001 — Silent deletion when editing large files
**What happened:** When modifying a component or page file, code was silently removed (tabs, panels, imports, handlers) because the edit replaced a large block rather than surgically targeting the change.
**Rule:** Before committing any modified file, run a mental diff: enumerate all sections/tabs/imports that existed before and confirm each is still present or consciously removed with a stated reason.
**Trigger:** Any Edit or Write to a file over ~100 lines.

---

## L002 — Intent confusion leads to wrong scope
**What happened:** A loosely-worded request ("improve X", "update Y", "fix Z") was interpreted too broadly or too narrowly, causing the wrong things to change.
**Rule:** When a request is ambiguous, propose the interpretation back to the user before writing any code. One sentence: "My reading is [X] — is that right?" Do not start work until confirmed.
**Trigger:** Any request containing: improve, update, rework, fix, change, clean up, refactor — without a specific file or behaviour called out.

---

## L003 — Pushing ahead without replanning
**What happened:** After completing one step, the next step was started immediately without checking whether the plan still made sense, causing compounding errors or unnecessary work.
**Rule:** After each implementation step, pause: (1) state what was done, (2) check it against the checklist, (3) scan for unexpected side effects, (4) update the plan before proceeding.
**Trigger:** Every step boundary in a multi-step plan.

---

<!-- Add new lessons below this line in format L00N -->
