# CCRO Dashboard — Full Audit Report
**Date:** 25 February 2026
**Scope:** Code quality, feature regression, UX, persona analysis, recommendations
**Status:** Assessment only — no code changes made

---

## GIT REGRESSION ANALYSIS — METHODOLOGY NOTE

Regressions R1–R7 in Part 1 were found primarily by reading the **live code** (permissions.ts, sidebar config, notification logic). After the audit was drafted, a deeper git diff pass was run on the high-deletion commits. Here is what that pass found:

**Confirmed intentional changes (not regressions):**
- `307d540` — Dashboard Consumer Duty section (verbose outcome list) replaced with `ConsumerDutySummaryWidget` (animated compact widget). The old code showed every outcome + every measure with RAG dots and inline links. The new widget is more visually refined but shows less detail. Whether this is a regression depends on preference — the full detail is still one click away at `/consumer-duty`.
- `307d540` — OR Dashboard stat cards (`StatCard`) replaced with `Link`-wrapped versions. Same data, now clickable. This is an improvement, not a regression.
- `988a18c` — History tab added to Controls page. The `exco-dashboard` tab string was present in the old type union and list and was carried forward correctly. No ExCo tabs were removed.
- `2362126` — Actions page flat `filteredActions.map()` replaced with grouped collapsible sections. All filters, search, bulk ops, and expand-detail were preserved.
- `RegulatoryCalendarWidget.tsx` — The old simple add-form was replaced with a full inline edit/create/delete accordion UI. No functionality was lost; it was expanded.

**Only one file was ever hard-deleted across the entire git history:** `src/lib/demo-data.ts` — replaced by the Prisma seed system. Intentional.

**Conclusion:** No features were accidentally deleted via code changes. The regressions identified (R1–R7) are all **permission configuration gaps** and **missing workflow connections** — they were never built, not removed.

---

## HOW TO READ THIS DOCUMENT

Each issue has:
- **What it is** — a plain description
- **Why it matters** — who it affects and what the cost is
- **Proposed fix** — what we would change, in plain English, precise enough to implement

Severity ratings: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low

---

## PART 1 — FEATURE REGRESSION ANALYSIS
*What we used to have that we may have accidentally lost*

---

### R1 — ExCo Dashboard is inaccessible to the VIEWER role
**Severity:** 🟠 High

The Controls page has an "ExCo View" tab explicitly configured for the VIEWER role. This was built so that executive-level staff or non-CCRO reviewers could see a curated, read-only controls dashboard. However, the VIEWER role does not have the `page:controls` permission in `src/lib/permissions.ts`. This means any VIEWER who navigates to `/controls` will be redirected by the RoleGuard before they ever see the tab. The ExCo View tab and ExCo Config tab are effectively orphaned.

**Proposed fix:** Add `page:controls` permission for the VIEWER role in `DEFAULT_ROLE_PERMISSIONS`, limited to the ExCo View tab only. The tab-level `roles` array already restricts what they see inside the page — we just need the door to open.

---

### R2 — CEO role cannot see Operational Resilience
**Severity:** 🟠 High

The OR module (IBS registry, scenario testing, self-assessment) is the most regulatory-critical section of the dashboard — it evidences FCA PS21/3 compliance. The CEO role has no `page:operational-resilience` permission. A CEO logging in cannot see whether the firm has passed its scenario tests, what the current self-assessment status is, or whether any IBS has resource gaps. This is precisely the board-level visibility the module was designed to provide.

**Proposed fix:** Add `page:operational-resilience` to the CEO role's permissions. The OR module is read-only for non-CCRO users already (create/edit buttons are gated by `CCRO_TEAM` role checks inside the components), so this is safe to grant.

---

### R3 — Change Request badge not shown to non-CCRO users
**Severity:** 🟡 Medium

The sidebar Change Requests nav item has `badgeKey: "changeRequests"`, but in the badge computation logic, `changeRequests` is only included in the return value for CCRO users (`canViewPending`). A Risk Owner who has proposed a field change gets no badge count indicating their proposal is pending. They have to remember to go check Change Requests manually. The page itself correctly shows their own changes in read-only mode — the badge is just missing.

**Proposed fix:** Include the user's own pending proposed changes in the badge count returned for non-CCRO users. A count of 1 or more pending proposals on the sidebar item would surface this without exposing CCRO-only data.

---

### R4 — No feedback to the proposer when a Change Request is approved or rejected
**Severity:** 🟠 High

The change proposal workflow (Risk Owner proposes a field change → CCRO approves or rejects) is complete from the CCRO's perspective. But from the proposer's perspective, once they submit a change, nothing tells them the outcome. There is no notification in the bell drawer, no email, no dashboard widget. They find out by accident the next time they look at the entity. This breaks the collaborative intent of the workflow and is likely to cause repeated submissions or confusion.

**Proposed fix:** When a change is approved or rejected via `PATCH /api/[entity]/[id]/changes/[changeId]`, trigger a bell notification for the original proposer. The notification should say "Your proposed change to [entity name] was [approved / rejected]" and link to the entity. No email required — the in-app notification is sufficient.

---

### R5 — `/templates` and `/components-lib` routes exist but are not linked from the sidebar
**Severity:** ⚪ Low

Both pages exist as standalone routes. They are now only reachable via Settings tabs. If a user bookmarks the old URL or receives a link to `/templates`, they land on a page that has no sidebar navigation context. The pages themselves work, but the navigation is orphaned. Not a regression that affects core workflows, but worth tidying.

**Proposed fix:** Either redirect `/templates` → `/settings?tab=templates` and `/components-lib` → `/settings?tab=components`, or add them back to the sidebar under Administration. The redirect approach is simpler.

---

### R6 — Dashboard `riskRegister` badge key is declared but never populated for any role
**Severity:** ⚪ Low

The Risk Register sidebar item has `badgeKey: "riskRegister"`. The badge computation function does not include `riskRegister` in its return value for either CCRO or non-CCRO users. So the badge key exists in the config but always resolves to zero. This is harmless but indicates dead code.

**Proposed fix:** Either remove `badgeKey: "riskRegister"` from the nav config, or define what should appear there (e.g., count of risks overdue for review, or risks above appetite). The latter would be genuinely useful for CCRO users.

---

### R7 — Email action reminders exist but have no UI trigger
**Severity:** 🟡 Medium

There is a `POST /api/actions/remind` route that sends reminder emails for overdue actions. This was built as a Vercel cron trigger. However, there is no manual "Send Reminders" button on the Actions page that a CCRO user could press. If the cron is not configured on Vercel, reminders never fire. There is no indicator on the actions page that reminders are or are not being sent.

**Proposed fix:** Add a "Send Reminders" button (CCRO only) on the Actions page that calls the remind route. Show a timestamp of "Last sent: X" so the CCRO knows the system is working.

---

## PART 2 — TECHNICAL CODE QUALITY

---

### T1 — Fire-and-forget sync gives users no feedback on failed saves
**Severity:** 🟠 High

The store uses a pattern where local state is updated optimistically and an API call fires in the background. If the API call fails after retries, a toast appears — but by then the user may have navigated away. More critically, the user has no way to know if a save is in-flight versus completed versus failed at the moment they perform an action. There is no "Saving..." indicator, no "Saved" confirmation, and no "Failed — click to retry" state on individual entities.

**Proposed fix:** For high-stakes operations (creating a risk, approving a change, submitting an assessment), show a brief "Saving…" state on the submit button, then confirm "Saved" or surface the error inline. The fire-and-forget pattern can remain for low-stakes updates (reordering, toggling visibility), but entity creates and approvals need confirmed feedback.

---

### T2 — No "unsaved changes" guard on form navigation
**Severity:** 🟡 Medium

Several panels and modals have multi-field forms where the user can edit several fields before saving. If they click away (or press the browser back button), the changes are silently discarded. There is no "You have unsaved changes — are you sure?" prompt.

**Proposed fix:** Add a `useEffect` to forms with editable state that registers a `beforeunload` handler when the form is dirty. For in-app navigation (back button, sidebar click), track dirty state and show a simple confirmation dialog.

---

### T3 — Loading states are inconsistent across the application
**Severity:** 🟡 Medium

Some pages show skeleton loaders or spinners while data is hydrating. Others render an empty table immediately, then populate it, causing a jarring layout shift. For example, the Compliance Regulatory Universe table can flash empty before populating. The Processes page has a similar issue. The inconsistency makes the app feel unreliable even when it is not.

**Proposed fix:** Standardise on a single loading pattern: a skeleton of the eventual layout (not a spinner in the middle of the page) while `_hydrated` is false. The store already exposes `_hydrated` — pages should check this before rendering table content.

---

### T4 — The sidebar has too many items, especially under "Compliance & Controls"
**Severity:** 🟠 High

The "Compliance & Controls" group has seven items: Compliance, Policies, SM&CR, Reg Calendar, Controls, Process Library, Operational Resilience. Policies, SM&CR, and Reg Calendar are sub-sections of Compliance — they navigate directly to a tab within the Compliance page. This creates a confusing mixture of "top-level pages" and "tabs within a page" all looking the same in the sidebar. Users who click "Policies" don't necessarily realise they have just opened the Compliance page on a specific tab.

**Proposed fix:** Remove Policies, SM&CR, and Reg Calendar from the top-level sidebar. Instead, add a chevron/expand on the "Compliance" sidebar item that reveals its tabs inline. The sidebar already supports group labels — this is a natural extension. Alternatively, show these as indented child items under Compliance with a visual distinction (smaller text, indent, no icon).

---

### T5 — Dashboard is too dense and the "Edit Layout" experience does not scale
**Severity:** 🟡 Medium

The dashboard has 19 configurable sections. Even after role-based hiding, the CCRO sees 19 sections and can scroll indefinitely. The "Edit Layout" panel lists all 19 sections as a toggleable list. Users have no guidance on what each section is for, which are "must haves" vs "nice to haves", or what order makes sense. In practice, no user is going to curate 19 sections — they accept whatever defaults they get.

**Proposed fix:** Reduce the dashboard to a curated set of 6–8 sections per role. The remaining sections should be accessible via dedicated pages, not squashed onto the dashboard. The "Edit Layout" panel should show section descriptions (already in `dashboard-sections.ts`) and offer a "Reset to defaults" button.

---

### T6 — The `dashboard` badge key on the sidebar Dashboard item is ambiguous
**Severity:** ⚪ Low

The Dashboard nav item has `badgeKey: "dashboard"`. For CCRO users, this resolves to a `total` count that aggregates many different categories of pending items. This means the badge on the Dashboard item is a vague count of "things needing attention" — similar to the bell icon count. The two numbers are not always in sync (bell counts live notifications, sidebar badge counts are computed differently). This creates confusion about what "badge = 12" on the dashboard nav actually means.

**Proposed fix:** Remove the `dashboard` badge key from the sidebar Dashboard nav item. The bell icon (notification drawer) already serves this purpose. Having both creates noise.

---

### T7 — Regulatory Calendar appears in three places with inconsistent naming
**Severity:** 🟡 Medium

The Regulatory Calendar is accessible from:
1. Sidebar → "Reg Calendar" (links to `/compliance?tab=regulatory-calendar`)
2. Compliance page → "Regulatory Calendar" tab (the full widget)
3. Compliance Overview section (which links to the tab)

The sidebar calls it "Reg Calendar" (abbreviated). The tab calls it "Regulatory Calendar" (full). The widget has its own heading. This fragmentation makes it hard to explain to users ("Go to Regulatory Calendar" — but which one?). It also means the sidebar has a dedicated entry for something that is just a tab, while more important items (like OR) don't get that treatment.

**Proposed fix:** Remove "Reg Calendar" from the top-level sidebar (as part of T4). Ensure the Compliance → Regulatory Calendar tab is the single canonical place. Mention it on the Compliance Overview so users know it exists.

---

### T8 — History tabs rely on the audit log but not all writes go through audit logging
**Severity:** 🟡 Medium

History tabs were added to Controls, Risk Register, Actions, Consumer Duty, and Processes. They pull from the `audit_log` table. The audit log is populated via `logAuditEvent()` calls in API routes. However, not every field update triggers an audit log entry — some updates happen silently (e.g., inline edits to testing schedule entries, resource map updates in OR). Users who look at a History tab and see gaps will distrust the data.

**Proposed fix:** Audit the API routes for each entity type and ensure every PATCH/POST/DELETE that represents a meaningful user action writes to the audit log with the before/after values. The `logAuditEvent()` function is already available — it just needs to be called consistently.

---

### T9 — The OWNER role can create and edit risks without an approval workflow
**Severity:** 🟡 Medium

Risks have an `approvalStatus` field (PENDING, APPROVED, REJECTED). New risks submitted by an OWNER show as PENDING and require CCRO approval. However, edits to existing risks by an OWNER go through the change-proposal workflow (propose a field change, wait for CCRO to approve). This is correct. But the system allows an OWNER to create a new risk that immediately appears in the register as PENDING — visible to everyone — before a CCRO has reviewed it. For some organisations this is fine; for others, PENDING risks should be hidden until approved.

**Proposed fix:** Confirm whether PENDING risks should be visible to all users or only the submitter and CCRO. If the latter, add a visibility filter to the risk register that hides PENDING risks for non-owners and non-CCRO users.

---

## PART 3 — PERSONA ANALYSIS

---

## PERSONA A: CCRO Team
*Chief Compliance & Risk Officers and their immediate team. Full system access. Responsible for oversight, evidence, and regulatory submissions.*

### What they need to do each morning:
- What has changed since yesterday? (new risks proposed, actions gone overdue, changes needing approval)
- What is the regulatory posture right now? (are we compliant, what's red?)
- What needs my decision today? (pending approvals, change requests, access requests)
- Is anything going to hit a deadline this week?

### What works well:
- The notification bell surfaces overdue items
- The Change Requests page consolidates pending field changes across entities
- The Compliance page has breadth (Regulatory Universe, Coverage, Roadmap, Assessment Log)
- The OR module gives a structured view of PS21/3 readiness
- The Export Centre and report editor are genuinely powerful
- Audit trail is comprehensive

### What is frustrating:

**Problem 1 — The dashboard is not a briefing**
The 19-section dashboard is a status board, not a decision surface. A CCRO arriving in the morning wants to know: "What's changed? What do I need to decide?" The "Action Required" widget exists, but it is buried below the Welcome Banner, Notification Banners, and Priority Action Cards. The most decision-critical content is not at the top.

**Proposed fix:** For the CCRO role, restructure the default dashboard layout to show (in order): (1) Action Required — things that need a decision today; (2) Proposed Changes — pending approvals; (3) Compliance Health — current posture; (4) Risk in Focus — board-level visibility. Everything else goes below the fold or onto dedicated pages.

---

**Problem 2 — No "what's changed since my last visit" view**
The audit trail shows everything ever. The history tabs show per-entity history. But there is no "last 24 hours" or "since your last login" feed. The CCRO has to open every area manually to discover if anything changed.

**Proposed fix:** Add a "Recent Activity" section to the dashboard (it exists already in the section registry) that shows the last 10–15 audit log entries from the past 24 hours, with links to the affected entities. This exists as a section but may not be prominent enough in the default layout.

---

**Problem 3 — Approving a change requires too many clicks**
To approve a proposed change, the CCRO must: navigate to Change Requests → find the right entity type tab → find the change card → click Approve → enter a note → confirm. If there are 10 pending changes, this is 50+ clicks. There is no bulk approve for routine changes.

**Proposed fix:** Add a "Bulk Approve" button for CCRO on the Change Requests page that applies to all selected items at once, with a single shared note. Low-risk field changes (status updates, date changes) do not warrant individual review — the CCRO should be able to sweep them.

---

**Problem 4 — The OR self-assessment submission workflow is unclear**
The Self-Assessment tab shows a readiness score and a status (DRAFT / SUBMITTED / APPROVED). But it is not obvious what "Submit for Board Approval" means in practice — does it send an email? Does it notify someone? What does the board approver do? The UI shows a button but gives no process context.

**Proposed fix:** Add a brief help text beside the "Submit for Board Approval" button explaining what happens next ("The Board Approver will receive a notification to review and confirm the assessment"). Make the board approver field mandatory before submission is allowed.

---

### What is missing:
- A "regulator-ready evidence pack" for a single risk or control — something the CCRO could hand to an FCA supervisor showing the full audit trail, test results, links, and narrative for one entity
- A cross-entity "coverage map" showing: this regulation → these policies → these controls → these processes (the Coverage tab does this, but it is buried in the Compliance section and hard to navigate)
- An automated "morning briefing" email or in-app digest summarising changes since yesterday

---

## PERSONA B: CEO / Executive
*Board-level visibility only. Cannot create or edit. Needs to see Red/Amber risks, operational resilience status, Consumer Duty posture at a glance.*

### What they need:
- "Is there anything red I should know about?"
- "What is our OR readiness status for the next FCA visit?"
- "Are we meeting our Consumer Duty obligations?"
- "What risks are in focus for the board?"

### What works well:
- Risk in Focus toggle (can star risks for board-level attention)
- Risk heatmap gives a visual spread of the register
- Consumer Duty outcomes page gives a clear RAG view
- Reports are accessible and well-formatted

### What is frustrating:

**Problem 1 — Cannot see Operational Resilience**
This is the most significant gap for a CEO persona. The OR module shows FCA PS21/3 compliance status, IBS readiness, and scenario test outcomes. The CEO has no permission to access it. They could ask the CCRO verbally, or wait for a report, but they cannot self-serve the most regulatory-critical module in the system.

**Proposed fix:** Grant CEO read-only access to `/operational-resilience` (see R2 above).

---

**Problem 2 — Cannot see Controls**
A CEO might reasonably want to know whether the firm's controls are passing their tests. The ExCo View tab was built exactly for this purpose — a simplified, curated controls dashboard. But the CEO role has no access to the Controls page.

**Proposed fix:** Grant CEO read-only access to `/controls`, restricted by the tab-level role filter to show only the ExCo View tab (which already enforces `CCRO_TEAM | VIEWER` — update this to include `CEO`).

---

**Problem 3 — The Risk Register default view is too operational**
The CEO sees the full risk table with all columns, filter chips, the heatmap toggle, and all the same controls a CCRO would use. This is overwhelming for someone who just wants to see "what are the top 5 risks?". The "Risks in Focus" dashboard section helps, but it requires the CCRO to have starred the right risks.

**Proposed fix:** For the CEO role, default the risk register to the Heatmap view (not the table) and hide the filter/search bar. The heatmap gives the visual spread they need without operational noise. They can still click cells to drill into individual risks.

---

**Problem 4 — No single executive summary screen**
Every section of the application has its own page. A CEO wanting a full picture must visit: Dashboard → Risk Register → Consumer Duty → Compliance → OR (currently blocked). There is no single "Board View" that stitches together: 3 key risks, 2 compliance gaps, OR readiness %, Consumer Duty RAG, and any actions overdue.

**Proposed fix:** Add a "Board View" dashboard mode (toggle next to Edit Layout) that shows a fixed, non-customisable one-page summary: Risk in Focus list, Compliance health RAG, Consumer Duty summary, OR readiness score, overdue actions count. This is read-only and always the same layout regardless of user preferences.

---

## PERSONA C: Risk Owner (OWNER role)
*Manages a portfolio of risks. Responsible for accurate risk descriptions, mitigation status, and assigned actions.*

### What they need:
- See the risks assigned to me
- Update my risks (with CCRO approval for material changes)
- Track actions linked to my risks
- Understand my approval status — have my proposed changes been reviewed?

### What works well:
- Can create risks and propose changes to existing ones
- Actions page shows their assigned actions
- Risk detail panel shows linked actions and controls
- History tab shows what changed

### What is frustrating:

**Problem 1 — No "My Risks" filter that persists**
The Risk Register shows all risks. A Risk Owner with 5 risks out of 50 has to filter by owner every time they land on the page. The filter resets on navigation (URL-based persistence should handle this, but if the user clicks the sidebar link fresh, filters reset). There is no "My Risks" quick filter at the top of the page.

**Proposed fix:** Add a "My Risks" toggle/chip at the top of the Risk Register that filters to `ownerId === currentUser.id`. This should be the default view for OWNER role users when no URL filter is set.

---

**Problem 2 — No feedback when a proposed change is approved or rejected**
If I propose a change to a risk's residual score on Monday, I have no idea what happened to it until I go look at the Change Requests page. There is no notification (R4 above). This is the single biggest frustration in the change proposal workflow.

**Proposed fix:** See R4.

---

**Problem 3 — The change proposal form has no context**
When an OWNER clicks "Suggest a Change" on a risk field, a small form appears. It asks for the new value and a rationale. But the form does not explain the workflow ("After you submit, the CCRO will review this. Changes typically take X business days."). First-time users do not know what happens next.

**Proposed fix:** Add a brief workflow description to the change proposal form: "Your proposed change will be reviewed by the CCRO team. You will be notified when it is approved or rejected."

---

**Problem 4 — Cannot see who the CCRO is**
If an OWNER's change is stuck pending for a long time, they have no in-app way to know who to contact. The Users page is CCRO-only. There is no "contact your CCRO" info surfaced to OWNERs.

**Proposed fix:** On the Change Requests page (the proposer's read-only view), show a note: "Questions? Contact [CCRO name] at [email]" — using the first active CCRO_TEAM user's contact details.

---

**Problem 5 — Direction of Travel is not explained**
The risk form has a "Direction of Travel" field (IMPROVING / STABLE / WORSENING). There is no tooltip or explanation. A new OWNER is likely to set this based on gut feel rather than a defined assessment method.

**Proposed fix:** Add a `GlossaryTooltip` on the Direction of Travel field explaining: "Is this risk getting better or worse since the last review? Compare today's residual score to the previous quarter."

---

## PERSONA D: Process Owner
*Manages a set of business processes. Responsible for process documentation quality, control links, and review cycle.*

### What they need:
- See the processes I own
- Keep process documentation up to date (description, steps, links to controls/policies)
- Understand maturity level and what is needed to improve it
- Be notified when a process is overdue for review

### What works well:
- Process Library table with maturity bar gives a visual summary
- 7-tab Process Detail Panel covers all aspects of a process
- Maturity card on the Overview tab shows exactly what's needed to reach the next level
- Process Insights panel gives coverage gap analysis
- IBS linkage supports PS21/3 evidence

### What is frustrating:

**Problem 1 — No "My Processes" view**
The Process Library shows all processes. A Process Owner managing 3 processes sees all 20. There is no "My Processes" filter and no dashboard widget telling them which of their processes needs attention.

**Proposed fix:** Add a "My Processes" quick filter on the Process Library page (same pattern as "My Risks" recommendation above). For OWNER role users, default to this filter on page load.

---

**Problem 2 — Maturity scoring is explained but not actionable enough**
The maturity card says "To reach Level 3: link to ≥1 policy or regulation; set a review date". This is correct and useful. But the user cannot act on it from within the card — they have to switch to the Policies or Regulations tab, find the right item, and link it manually. The gap between "what's needed" and "how to do it" requires multiple tab switches.

**Proposed fix:** Make each maturity requirement in the card a direct call-to-action. For example: "Link to a policy [+ Link a policy]" — clicking the bracketed action jumps to the Policies tab with the link picker already open. This reduces the mental overhead of translating the requirement into navigation steps.

---

**Problem 3 — Process review reminders only go to the CCRO**
The notification drawer shows "X processes overdue for review" — but this notification is computed in `useNotifications()` which runs in every user's session. However, the notification links to `/processes` which shows all processes. A Process Owner sees this notification but clicking it shows ALL overdue processes, not just theirs.

**Proposed fix:** Make the "processes overdue for review" notification link include the owner filter: `/processes?owner=me`. Or, show the notification only to the CCRO (as a management view) and separately show OWNER-specific "Your process X is overdue for review" notifications.

---

**Problem 4 — No process export**
A Process Owner might want to export their process documentation for a management review, an audit, or to share with a team. The Processes page has no export function. Other pages (controls, actions, risk acceptances) all have CSV or HTML exports.

**Proposed fix:** Add an "Export" button to the Process Detail Panel (CCRO and OWNER) that generates a clean one-page HTML or PDF of the process: overview fields, steps table, linked controls/policies/regulations, maturity score.

---

## PERSONA E: Control Owner
*Maintains a set of controls. Responsible for attestation, test result entry, and keeping control descriptions accurate.*

### What they need:
- See the controls I own
- Complete quarterly attestations
- View test results for my controls
- Understand which risks my controls are addressing

### What works well:
- Attestation tab with quarterly form
- Testing Schedule tab shows assignment
- Control detail modal shows linked risks and test history with the performance chart
- ExCo View provides a curated dashboard (if they can access it)

### What is frustrating:

**Problem 1 — Attestation form lacks context**
The Attestation tab asks the Control Owner to confirm they've reviewed and attested to their controls for the quarter. The form is functional but bare: it lists controls with a checkbox. There is no context about what each control does, what the latest test result was, or whether there are outstanding issues. The Control Owner is attesting without the information needed to make an informed attestation.

**Proposed fix:** In the Attestation tab, expand each control row to show: last test result (PASS/FAIL/PARTIALLY), latest test date, and a link to the control detail. The Control Owner can then attest with full awareness of the control's status.

---

**Problem 2 — Cannot see which risks their controls address from the controls page**
The Control Library tab shows control details and linked risks (in the detail modal). But a Control Owner scanning the library table sees: control ref, name, business area, type, frequency, latest test result. They cannot see "how many risks does this control address?" at a glance, or whether any of those risks are above appetite. They must click into each control to find out.

**Proposed fix:** Add a "Risks" column to the Controls Library table showing the count of linked risks. A tooltip or hover state shows the risk references. If any linked risk is above appetite, colour the count red.

---

**Problem 3 — No notification when a control test is overdue**
The Testing Schedule tab shows which controls have upcoming or overdue tests. But there is no in-app notification to the assigned tester when their test is due. The notification drawer covers overdue actions, overdue processes, and overdue scenarios — but not overdue control tests for the assigned tester specifically.

**Proposed fix:** Add an "Overdue control tests assigned to you" notification category to `useNotifications()`. For OWNER/VIEWER role users, filter by `assignedTesterId === currentUser.id`. For CCRO, show all overdue tests.

---

**Problem 4 — ExCo Dashboard is inaccessible to VIEWER and CEO**
See R1 and R2. The ExCo View tab was designed for executive visibility of controls. It is currently inaccessible to the roles it was built for.

---

## PART 4 — CROSS-CUTTING UX ISSUES

---

### UX1 — The back button behaviour is unpredictable
**Severity:** 🟠 High

The NavigationBackButton shows whenever `window.history.length > 1`. This means:
- If you open the app in a new tab and immediately navigate, the back button appears on the second page — but pressing it exits the app entirely (back to the browser new tab page or wherever you came from)
- If you deep-link directly to `/risk-register?risk=RK-001`, the back button appears but pressing it takes you somewhere unrelated to the app

The button's behaviour depends entirely on the browser's own history, not the app's navigation stack. The custom `navigationStack` in the store is only populated when navigating via `EntityLink` — which is a small fraction of navigation events.

**Proposed fix:** Remove the browser-history-based fallback. Only show the back button when the custom `navigationStack` has entries. Instead, rely on the EntityLink navigation stack for deliberate deep-link navigation, and let the browser back button (in the browser chrome) handle general back navigation. This is more predictable, even if the in-app back button is less prominent.

---

### UX2 — Notification bell and sidebar dashboard badge count the same things differently
**Severity:** 🟡 Medium

The notification bell in the top right and the badge on the Dashboard sidebar item both count "things needing attention". But they are computed differently — the bell uses `useNotifications()` which includes overdue actions, due-soon actions, compliance gaps, etc. The sidebar badge uses a separate computation that includes different categories. A CCRO might see "bell = 12, dashboard badge = 7" and not understand why the numbers differ.

**Proposed fix:** Remove the dashboard sidebar badge (see T6). The bell icon is the canonical notification surface. Having two different counts for "attention needed" creates confusion.

---

### UX3 — Empty states are inconsistent in quality
**Severity:** ⚪ Low

Some empty states are helpful ("No processes found — Create your first process" with a button). Others are bare ("No results"). The most commonly encountered empty state — the History tab when no audit events exist — just shows "No history for this period" with no guidance on why there might be no history (the entity may be new, or audit logging may not have captured events for this area).

**Proposed fix:** Standardise empty states across all tabs and tables. Each empty state should: (1) explain why there is no data (entity is new, filter is too narrow, feature not yet used); (2) offer a next step (create, widen filter, or link to relevant settings). Add this to the History tab specifically.

---

### UX4 — The Global Search (Cmd+K) does not search processes, IBS, or OR data
**Severity:** 🟡 Medium

The GlobalSearch command palette searches risks, policies, controls, actions, regulations, and users. It does not search processes, IBS records, resilience scenarios, risk acceptances, or regulatory calendar events. As the process library and OR module have grown significantly, these are now major entity types that users might search for.

**Proposed fix:** Add processes, IBS records, and risk acceptances to the GlobalSearch index. These are already in the Zustand store so no additional API calls are needed — it is a matter of extending the search logic in `GlobalSearch.tsx`.

---

### UX5 — The Compliance Overview tab does not navigate to the correct subtab reliably
**Severity:** 🟡 Medium

The Compliance Overview shows summary cards (e.g., "12 regulations with gaps — View →"). Clicking "View" navigates to the Regulatory Universe tab, which works. But the sidebar "Reg Calendar" link navigates to `/compliance?tab=regulatory-calendar`. When the user is already on the Compliance page, clicking "Reg Calendar" in the sidebar was previously broken (fixed in a bug fix commit). It is now fixed, but the fix (`useEffect([searchParams])`) only runs when searchParams change — which only works if the search param actually changes. If the user is already on the regulatory-calendar tab and clicks the sidebar "Reg Calendar" link, nothing happens (same URL, no change event). This is a subtle but real UX gap.

**Proposed fix:** Force a tab change when the sidebar Compliance sub-items are clicked, regardless of current tab state. This could be done by adding a unique timestamp or by moving the tab sync logic to respond to a router event rather than searchParams change.

---

### UX6 — The Actions page status grouping collapses "Completed" by default, but there is no memory
**Severity:** ⚪ Low

The recent Actions UX upgrade added collapsible status groups, with "Completed" collapsed by default. This is good design. But if a user expands "Completed" to view historical items and then navigates away, the group reverts to collapsed on return. The expanded/collapsed state is not persisted.

**Proposed fix:** Persist group collapsed/expanded state in `localStorage` (keyed to the user ID, not per-session). This is a one-line change per group toggle.

---

### UX7 — Form validation errors are not always shown inline
**Severity:** 🟡 Medium

Some forms (e.g., the Action form dialog, the Risk form) use Zod validation server-side. When validation fails, a toast notification appears ("Please check your inputs"). But the toast does not tell the user which field is wrong. They must guess. Other forms do show inline field errors. The inconsistency means some forms feel broken (toast appears, no indication of what went wrong) while others feel polished (red border and error text on the failing field).

**Proposed fix:** Move validation to the client side using `react-hook-form` with the Zod resolver (`@hookform/resolvers/zod`). Both libraries are already installed. Client-side validation shows inline errors immediately without a round-trip. The server-side Zod validation can remain as a second line of defence.

---

### UX8 — The Reports section is powerful but discovery is poor
**Severity:** 🟡 Medium

The Reports page lists reports as cards. There is no indication of which report is the "current" one, which is the most recently published version, or whether any report is overdue. The report creation flow (New Report → add sections → publish) is powerful but not guided. A new CCRO would not know where to start.

**Proposed fix:** On the Reports page, surface a "Current Period" report prominently at the top if one exists for the current quarter. Show a status pill (DRAFT / PUBLISHED / OVERDUE). Add a "Start this quarter's report" CTA if no report exists for the current period. This gives a clear entry point for the most common use case.

---

### UX9 — The Export Centre has no "recent exports" history
**Severity:** ⚪ Low

The Export Centre generates an HTML pack on demand. Each generation is stateless — there is no record of what was exported, when, and by whom. For audit purposes, it is sometimes necessary to know what information was packaged and shared externally.

**Proposed fix:** Log export events to the audit trail (entityType: 'export', action: 'generate', changes: { sections, firmName }). This does not require storing the export file — just the parameters.

---

### UX10 — Process steps have no "Responsible Role" autocomplete or standardisation
**Severity:** ⚪ Low

Process steps have a "Responsible Role" free-text field. This means the same role can be entered as "Chief Risk Officer", "CRO", "Head of Risk", or "2nd Line Risk" across different processes, making it impossible to aggregate or search by role. There is no dropdown or autocomplete.

**Proposed fix:** Make the "Responsible Role" field a searchable select that auto-completes from a list of existing role strings already in the database (built dynamically from all current process step entries). This is similar to the SearchableSelect component already used elsewhere.

---

## PART 5 — PRIORITISED RECOMMENDATIONS

The following table summarises all issues by priority for implementation planning:

### Must Fix (blocking core workflows or regulatory credibility)

| # | Issue | Type | Effort |
|---|-------|------|--------|
| R2 | CEO cannot see OR module | Regression | Small |
| R1 | VIEWER/CEO cannot access ExCo Dashboard | Regression | Small |
| R4 | No notification when a change request is resolved | Regression | Medium |
| T1 | No save confirmation on critical operations | Technical | Medium |
| UX1 | Back button behaviour is unpredictable | UX | Medium |

### Should Fix (significant friction, regular occurrence)

| # | Issue | Type | Effort |
|---|-------|------|--------|
| R3 | Change Requests badge missing for non-CCRO | Regression | Small |
| R7 | Action email reminders have no UI trigger | Regression | Small |
| T4 | Sidebar has too many items, Compliance group especially | Technical | Medium |
| T7 | Regulatory Calendar naming/location is inconsistent | Technical | Small |
| UX2 | Bell and Dashboard badge count the same things differently | UX | Small |
| UX4 | Global Search misses processes, IBS, risk acceptances | UX | Small |
| ~~UX7~~ | ~~Form validation errors are not shown inline~~ — **DONE (should fix sprint)** | UX | Medium |
| ~~A1~~ | ~~CCRO: Dashboard is not a morning briefing~~ — **DONE (should fix sprint)** | Persona | Medium |
| ~~A3~~ | ~~CCRO: Bulk approve on Change Requests~~ — **DONE (should fix sprint)** | Persona | Medium |
| C1 | Risk Owner: No "My Risks" filter as default | Persona | Small |
| C2 | Risk Owner: No feedback on proposed changes | Persona | Medium |
| D1 | Process Owner: No "My Processes" filter | Persona | Small |
| D3 | Process Owner: Review notifications go to wrong person | Persona | Small |
| ~~E1~~ | ~~Control Owner: Attestation has no context~~ — **DONE (should fix sprint)** | Persona | Medium |
| E3 | Control Owner: No notification when test is overdue | Persona | Small |

### Nice to Have (polish and completeness)

| # | Issue | Type | Effort |
|---|-------|------|--------|
| R5 | `/templates` and `/components-lib` routes are orphaned | Regression | Small |
| R6 | `riskRegister` badge key is dead code | Technical | Small |
| ~~T2~~ | ~~No unsaved changes guard~~ — **DONE (sprints 2)** | Technical | Medium |
| ~~T3~~ | ~~Loading states inconsistent~~ — **DONE (sprint 1)** | Technical | Medium |
| T5 | Dashboard too dense | Technical | Large |
| T6 | Dashboard badge on sidebar nav is ambiguous | Technical | Small |
| ~~T8~~ | ~~Not all API writes go through audit logging~~ — **DONE (sprint 1)** | Technical | Medium |
| T9 | OWNER-created PENDING risks visible before CCRO approval | Technical | Small |
| ~~UX3~~ | ~~Empty states inconsistent in quality~~ — **DONE (sprint 1)** | UX | Small |
| UX5 | Compliance sidebar tab links have edge-case bug | UX | Small |
| ~~UX6~~ | ~~Actions group expand/collapse state not persisted~~ — **DONE (prior sprint)** | UX | Small |
| ~~UX8~~ | ~~Reports page discovery is poor~~ — **DONE (sprint 1)** | UX | Small |
| ~~UX9~~ | ~~Export Centre has no audit trail~~ — **DONE (prior sprint)** | UX | Small |
| ~~UX10~~ | ~~Process step roles are free text with no standardisation~~ — **DONE (sprint 1)** | UX | Small |
| ~~B1~~ | ~~CEO: No single Board View dashboard mode~~ — **REJECTED: existing dashboard is sufficient; no second dashboard wanted** | Persona | Large |
| ~~B3~~ | ~~CEO: Risk Register default view wrong for executives~~ — **REJECTED: table view is the preferred default for all roles** | Persona | Small |
| ~~C3~~ | ~~Risk Owner: Change proposal has no workflow explanation~~ — **DONE (prior sprint)** | Persona | Small |
| ~~D2~~ | ~~Process Owner: Maturity requirements not actionable~~ — **DONE (sprint 3)** | Persona | Medium |
| ~~D4~~ | ~~Process Owner: No process export~~ — **DONE (sprint 3)** | Persona | Medium |

---

## WHAT TO DO NEXT

The audit above should be reviewed with you before any implementation begins. Once we agree which items to address, each group would become a sprint entry in PLAN.md.

Recommended first sprint: the five "Must Fix" items (R1, R2, R4, R1+R2 permissions, back button). These are all low-to-medium effort and address either regulatory credibility gaps (CEO can't see OR) or broken workflow loops (no feedback on change requests).

---

*Audit completed 25 February 2026. No code was modified during this assessment.*
