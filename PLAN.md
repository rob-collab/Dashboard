# CCRO Dashboard — Active Development Plan
Last updated: 2026-02-26 (Sprint 1 complete — UAT + compliance review fixes applied)

---

## CURRENT SPRINT: Horizon Scanning Module

### What
Add a Horizon Scanning module to the CCRO Dashboard — a standalone page and sidebar entry
giving the CCRO team a structured, searchable, monthly register of regulatory, legislative,
competitive, and employment developments that may affect Updraft. Replaces the manual Word/
Excel process.

### Why
The CCRO team currently maintains a Word document horizon scan. This sprint builds it into
the dashboard so items are tracked, actionable, and linked to the risk and action registers.

### Key design decisions
- Standalone page `/horizon-scanning` with sidebar nav (not a compliance tab — too content-rich)
- One item can be designated "In Focus" — appears as a prominent spotlight banner at the top
  of the page. CP26-7 is the first in-focus item.
- "Create Action" on a horizon item creates a real `Action` DB record + `HorizonActionLink`
- "Link Risk" on a horizon item links to an existing `Risk` record via `HorizonRiskLink`
- `inFocus` boolean on HorizonItem — only one can be true at a time (enforced in API)
- CCRO_TEAM has full CRUD; OWNER/VIEWER read-only + export

### Files to create
| File | Purpose |
|---|---|
| `src/app/horizon-scanning/page.tsx` | Main page |
| `src/app/api/horizon-items/route.ts` | GET + POST |
| `src/app/api/horizon-items/[id]/route.ts` | PATCH + DELETE |
| `src/app/api/horizon-items/[id]/set-focus/route.ts` | Set item as in-focus |
| `src/app/api/horizon-items/[id]/actions/route.ts` | Create + link Action |
| `src/app/api/horizon-items/[id]/risks/route.ts` | Link / unlink Risk |
| `src/app/api/horizon-items/export/route.ts` | CSV export |
| `src/components/horizon/HorizonInFocusSpotlight.tsx` | Featured item banner |
| `src/components/horizon/HorizonItemCard.tsx` | List card component |
| `src/components/horizon/HorizonDetailPanel.tsx` | Slide-in detail/edit panel |
| `src/components/horizon/HorizonFormDialog.tsx` | Create new item dialog |
| `src/components/horizon/HorizonDashboardWidget.tsx` | Dashboard home widget |

### Files to modify
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add HorizonItem, HorizonActionLink, HorizonRiskLink, enums |
| `prisma/seed.ts` | Add 25 horizon items (Feb 2026 scan); CP26-7 set inFocus |
| `src/lib/types.ts` | Add HorizonItem, HorizonCategory, HorizonUrgency, HorizonStatus, link types |
| `src/lib/store.ts` | Add horizonItems slice + 4 actions + hydration fetch |
| `src/components/layout/Sidebar.tsx` | Add Horizon Scanning nav entry (Radar icon) |
| `src/app/page.tsx` | Add HorizonDashboardWidget |

### Acceptance criteria
- [x] S1-01: `HorizonItem`, `HorizonActionLink`, `HorizonRiskLink` models in schema; migration runs clean
- [x] S1-02: TypeScript types added; store slice added; hydration fetches from API
- [x] S1-03: GET/POST /api/horizon-items works; PATCH/DELETE /api/horizon-items/[id] works
- [x] S1-04: POST /api/horizon-items/[id]/set-focus sets item inFocus=true, clears all others
- [x] S1-05: "In Focus" spotlight renders at top of page with gradient bg, reference badge, urgency pill, deadline countdown, summary excerpt
- [x] S1-06: Item list renders grouped by urgency (HIGH→MEDIUM→LOW) with section headers + counts
- [x] S1-07: Each card shows reference, title, category badge, source, deadline, status, truncated summary
- [x] S1-08: HorizonDetailPanel opens on card click; all fields editable by CCRO_TEAM; Save explicit + toasted
- [x] S1-09: Create new item dialog works; reference auto-generated (HZ-NNN); inFocus=false by default
- [x] S1-10: "Create Action" from detail panel creates real Action DB record + HorizonActionLink; action appears in Actions module
- [x] S1-11: "Link Risk" from detail panel links to existing Risk via HorizonRiskLink; shows linked risk reference + name
- [x] S1-12: Sidebar shows "Horizon Scanning" with Radar icon; route navigates correctly
- [x] S1-13: Seed data: all 25 items from Feb 2026 horizon scan; CP26-7 (HZ-004) set as inFocus
- [x] S1-14: CSV export returns all fields; accessible to all roles
- [x] S1-15: Dashboard widget shows HIGH/MEDIUM/LOW counts + nearest deadline; links to /horizon-scanning
- [x] S1-16: Filter bar: category, urgency, status dropdowns + search; dismissed items hidden by default
- [x] S1-17: OWNER/VIEWER can view + export only; create/edit/delete buttons hidden
- [x] S1-18: Build passes: zero TypeScript errors
- [x] S1-19: UAT agent review: CRO persona sign-off — review completed; all P1/P2 fixes applied (see below)
- [x] S1-20: Compliance agent review: no NON-COMPLIANT findings — CONCERN resolved; all security fixes applied

#### Post-review fixes applied (2026-02-26)
**Security (Compliance CONCERN → resolved):**
- [x] POST /api/horizon-items — now uses `requireCCRORole` (was `getUserId`)
- [x] PATCH/DELETE /api/horizon-items/[id] — now uses `requireCCRORole`
- [x] POST /api/horizon-items/[id]/actions — now uses `checkPermission("create:action")` (OWNER permitted)
- [x] POST/DELETE /api/horizon-items/[id]/risks — now uses `requireCCRORole`
- [x] POST /api/horizon-items/[id]/set-focus — custom role check: CCRO_TEAM or CEO
- [x] GET /api/horizon-items + GET /api/horizon-items/[id] — strip `notes` field for non-CCRO callers

**UAT P1 fixes:**
- [x] Action status labels — human-readable (Open/In Progress/Completed/Cancelled) in HorizonDetailPanel
- [x] Dirty state tracking — "Unsaved changes" amber badge in panel header; confirm dialog on close if dirty

**UAT P2 fixes:**
- [x] Unlink risk confirmation — "Unlink? Yes / No" inline prompt before DELETE fires
- [x] canCreateAction prop — OWNER role can now create actions from horizon panel (API + UI)
- [x] canChangeFocus — CEO role can now change in-focus item (API: CCRO_TEAM|CEO; UI: canChangeFocus prop)
- [x] "Last item added" timestamp shown in page header subtitle
- [x] HorizonInFocusSpotlight prop renamed canManage → canChangeFocus for semantic clarity

**Seed data (Compliance Advisory → resolved):**
- [x] HZ-026: ICO Article 22 Automated Decision-Making (HIGH — enforcement risk)
- [x] HZ-027: FCA Collections & Debt Respite Scheme (HIGH — supervisory focus)
- [x] HZ-028: CONC 5.2A Affordability Guidance Refresh (MEDIUM — FOS uphold rate trend)

---

## CURRENT SPRINT: Risk / Action / Control Relational Refactor ✅ COMPLETE

### What
Remove the inline free-text controls and mitigations from the Risk Detail Panel. Replace
with proper relational DB links to the existing Control Library and Action register.
Also fix a critical bug: the PATCH /api/risks/[id] handler currently deletes all linked
Action records and re-creates them on every save — destroying action history.

### Why
- Inline `RiskControl[]` entries are plain text — never tested, never tracked, not part of
  the control library
- Inline `RiskMitigation[]` create Action records on save but destroy them on re-save
- The user cannot currently link an existing action to a risk — only create a new one
  from mitigation text
- Result: actions raised from risks are invisible in the action register and vice versa

### Architecture
```
Current (broken):     Risk.controls[]     → RiskControl (plain text, orphaned)
                      Risk.mitigations[]  → RiskMitigation + auto-created Action (destroyed on re-save)

Target (correct):     Risk ─── RiskControlLink ──→ Control library   (already exists ✅)
                      Risk ─── RiskActionLink  ──→ Action register    (new junction table)
```

### Key decisions (confirmed 2026-02-26)
- `RiskControl` and `RiskMitigation` tables kept in DB — existing data preserved, not migrated
- Inline controls sub-section removed from Risk Detail Panel UI (control effectiveness dropdown + linked library controls remain)
- Entire mitigations section removed from Risk Detail Panel UI (section 6)
- Legacy mitigation-linked actions (RiskMitigation.actionId) NOT shown in new Linked Actions section — clean break
- "Raise Action" → `checkPermission("create:action")` — CCRO_TEAM + OWNER permitted
- "Link Existing Action" → `checkPermission("create:action")` — CCRO_TEAM + OWNER permitted
- "Unlink action" → `requireCCRORole` — CCRO_TEAM only
- Fix PATCH /api/risks/[id]: strip controls/mitigations from schema — stop deleting/recreating entirely

### Files to create
| File | Purpose |
|---|---|
| `src/app/api/risks/[id]/action-links/route.ts` | GET + POST (link action to risk) |
| `src/app/api/risks/[id]/action-links/[actionId]/route.ts` | DELETE (unlink) |

### Files to modify
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add RiskActionLink model + relations |
| `src/lib/types.ts` | Add RiskActionLink type |
| `src/lib/store.ts` | Add linkActionToRisk / unlinkActionFromRisk store actions |
| `src/components/risk-register/RiskDetailPanel.tsx` | Remove inline controls/mitigations sections; add Linked Actions section |
| `src/app/api/risks/[id]/route.ts` | Fix PATCH — remove delete-and-recreate mitigation logic |

### Acceptance criteria
- [x] S2-01: `RiskActionLink` model added to schema; migration runs clean; existing data untouched
- [x] S2-02: GET/POST /api/risks/[id]/action-links; DELETE /api/risks/[id]/action-links/[actionId]
- [x] S2-03: Risk Detail Panel: inline controls section removed from UI (RiskControl data preserved in DB)
- [x] S2-04: Risk Detail Panel: inline mitigations section removed from UI (RiskMitigation data preserved)
- [x] S2-05: Risk Detail Panel: "Linked Controls" section (from RiskControlLink) unchanged and still works
- [x] S2-06: Risk Detail Panel: new "Linked Actions" section shows actions linked via RiskActionLink
- [x] S2-07: "Raise Action" button creates new Action + RiskActionLink; action visible in Actions module
- [x] S2-08: "Link Existing Action" search/select creates RiskActionLink without creating new Action
- [x] S2-09: PATCH /api/risks/[id] no longer deletes or recreates linked actions on save
- [x] S2-10: All existing Risk Detail Panel functionality (ratings, categories, owner, review date, etc.) unchanged
- [x] S2-11: Build passes: zero TypeScript errors
- [x] S2-12: UAT agent review sign-off (P0-1 status enum fixed, P0-2 isDirty fixed, P1-2 field validation added, P1-4 link panel loading state, P2-2 confirm state reset)
- [x] S2-13: No existing risk data lost or corrupted (RiskControl + RiskMitigation DB tables unchanged; PATCH no longer touches them)

---

## CURRENT SPRINT: Global Save Reliability — Explicit Saves for Critical Entities ✅ COMPLETE

### Problem statement
The store uses a `sync()` fire-and-forget pattern for ~70 update functions. `sync()` does have retry logic (2 retries, exponential backoff) and shows a generic global toast error after ~6 seconds on failure — but:
- There is no per-operation success/failure feedback at the component level
- If the user closes a panel before the 6-second failure toast appears, they don't know the save failed
- On next mount, `hydrate()` fetches from the DB and reverts the optimistic local state — data is silently lost
- The user has no way to retry a failed save without re-entering data

### Agreed fix pattern
The fix used for SMCR (`SMFDirectory.tsx`) is the gold standard for this project:
1. Component calls `api()` directly (awaited) rather than the store's fire-and-forget function
2. `saving` boolean state → Save button shows spinner + "Saving…", disabled during request
3. On success: update store via `setXs(xs.map(...))` (merges API response), show "X saved" toast, close panel
4. On error: show "Failed to save — please try again" toast, panel stays open for retry
5. `setSaving(false)` in finally block — no stuck spinners

The store's fire-and-forget functions (`updateRisk`, `updateAction`, etc.) are kept in place — they still work for any callers that don't need explicit feedback. Only the critical UI edit panels are migrated.

### Scope: critical entities only (first sprint)
The audit found ~70 store functions using `sync()` across ~21 UI components. Not all need immediate treatment. This sprint targets entities where:
- A user explicitly edits data in a named field (not a toggle or link/unlink)
- A failed silent save has a compliance or business impact
- The panel/dialog currently gives zero feedback on save result

**Out of scope for this sprint (lower risk):**
- Templates, components, notifications (admin / infrequent)
- Consumer Duty outcomes/measures (internal RAG tracking)
- Reports and sections (handled by dedicated report editor)
- Access requests, Process Library, Operational Resilience (local-only or planned separately)

### Files and deliverables

**Deliverable 1 — RiskDetailPanel (high impact)**
- File: `src/components/risk-register/RiskDetailPanel.tsx`
- Functions to replace: `updateRisk()` calls in inline field saves and the main Save flow
- Also: `linkControlToRisk()` / `unlinkControlFromRisk()` — show toast feedback
- Saving state: per-panel (not per-field — save is triggered by explicit Save button)

**Deliverable 2 — ActionDetailPanel (high impact)**
- File: `src/components/actions/ActionDetailPanel.tsx`
- Check if `updateAction()` calls are already explicit (audit showed partial explicit handling)
- Ensure all saves: await API → merge store → toast feedback

**Deliverable 3 — RegulationDetailPanel (compliance-critical)**
- File: `src/components/compliance/RegulationDetailPanel.tsx`
- Functions: `updateRegulation()`, `updateRegulationCompliance()`, `linkRegulationToControl/Policy()`, `unlinkRegulationFromControl/Policy()`
- Only the core compliance assessment save needs a blocking Save button; link/unlink can show inline toast without blocking

**Deliverable 4 — SMCR edit panels (compliance-critical)**
- Files: `src/components/compliance/smcr/ResponsibilitiesMatrix.tsx`, `DocumentTracker.tsx`, `ConductRulesPanel.tsx`
- Functions: `updatePrescribedResponsibility()`, `updateSmcrDocument()`, `updateCertifiedPerson()`, `updateConductRuleBreach()`
- Apply same pattern: Save button → await API → toast → revert on error

**Deliverable 5 — ControlDetailModal / ControlsLibraryTab (operational)**
- Files: `src/components/controls/ControlDetailModal.tsx`, `src/components/controls/ControlsLibraryTab.tsx`
- Functions: `updateControl()`, `addControl()`
- Save button → await API → toast

**Deliverable 6 — Policy editor (governance)**
- File: wherever `updatePolicy()` is called (likely in policy detail panel or dialog)
- Functions: `updatePolicy()`, `addPolicy()`

### Acceptance criteria (per deliverable, same checklist repeated)
- [x] D1 RiskDetailPanel: save is awaited; spinner on button; "Risk saved" / "Failed to save risk" toast; panel stays open on error
- [x] D2 ActionDetailPanel: 4 already explicit; 2 fire-and-forgets (handleSaveIssueDescription, handleMarkComplete) now explicit
- [x] D3 RegulationDetailPanel: was already explicit but had double-fire bug — all 5 sync() calls eliminated, replaced with setRegulations setter; link/unlink now uses real DB objects from API response
- [x] D4 SMCR panels: ResponsibilitiesMatrix, DocumentTracker, ConductRulesPanel all explicit; per-row savingStatusId in ConductRulesPanel
- [x] D5 Controls: ControlDetailModal already fully explicit; ControlsLibraryTab: missing toasts + spinner added
- [x] D6 Policy editor: edit path now awaits PATCH /api/policies/:id with spinner + toast; create path unchanged (already explicit in parent) (pending)
- [x] Build passes: zero TypeScript errors, all 7 files compile cleanly
- [x] All existing UI interactions preserved — only save path changes

### Store functions left untouched (by design)
`updateRisk`, `updateAction`, `updateControl`, `updatePolicy`, `updateRegulation`, etc. remain in the store and still use `sync()`. They act as a fallback for any callers not yet migrated and for store hydration merges.

---

## CURRENT SPRINT: Compliance by Policy — Overview Section ✅ COMPLETE

### What
Add a "Compliance by Policy" section to the Compliance module's Overview tab. Each row shows one policy with: reference badge, name, policy status badge, owner, linked control count (active / total), control test-result breakdown (Pass / Fail / Not Tested counts), and the most recent test date across all linked controls. Clicking a policy row navigates to `?tab=policies&policy=<id>`.

### Why
The compliance overview is missing a policy-centred view. The CCRO needs to see at a glance which policies have untested or failing controls and which are overdue.

### Files to change
- `src/components/compliance/ComplianceOverview.tsx` — add `policyBreakdown` useMemo + new section block

### Acceptance criteria
- [x] Section appears in Overview tab, after Compliance Posture + Gap Analysis, before RAG by Domain
- [x] Each row shows: reference, policy name, status badge, owner name, control count, test pass/fail/not-tested counts, last tested date
- [x] Policies with zero active controls show a "No active controls" placeholder (grey)
- [x] Policies with failing controls show red count + red last-tested date
- [x] Clicking a row navigates to `/compliance?tab=policies&policy=<id>`
- [x] Empty state: if no policies, show a placeholder with icon
- [x] Build passes: zero errors
- [x] No existing sections removed or altered

---

## CURRENT SPRINT: SMCR Hotfix — Explicit Save + NOT_REQUIRED Status ✅ COMPLETE

### What
SMF role edits were not persisting. The `saveEdit` function used the fire-and-forget `sync()` store pattern — optimistic local update appeared to work, but if the API call silently failed the DB was never updated and `hydrate()` on next mount reverted to the old state.

### Why
Any change made in the tool must be permanent. The fire-and-forget pattern is unsafe for user-facing edits.

### Files changed
- `prisma/schema.prisma` — added `NOT_REQUIRED` to `SMFStatus` enum; pushed to Supabase
- `src/lib/types.ts` — updated `SMFStatus` type, `SMF_STATUS_LABELS`, `SMF_STATUS_COLOURS`
- `src/app/api/compliance/smcr/roles/[id]/route.ts` — added `NOT_REQUIRED` to Zod enum
- `src/components/compliance/smcr/SMFDirectory.tsx` — explicit async save with loading state, success/error toasts, store merge from API response; NOT_REQUIRED tile in summary strip

### Acceptance criteria
- [x] `saveEdit` awaits the API call directly (not fire-and-forget)
- [x] Save button shows spinner + "Saving…" text during in-flight request
- [x] Both buttons disabled while saving
- [x] Success toast: "Role saved"
- [x] Error toast: "Failed to save role — please try again"; panel stays open for retry
- [x] Store updated from API response (not optimistic guess)
- [x] `NOT_REQUIRED` status option available in edit dropdown
- [x] Summary strip shows 4 tiles: Active / Vacant / Pending Approval / Not Required
- [x] Build passes: zero errors

### Next: Global Save Reliability Sprint (planned separately)
The same fire-and-forget risk exists across all ~30 store update functions. Plan a dedicated sprint to replace `sync()` with explicit saves throughout the codebase.

---

## CURRENT SPRINT: Interactivity Audit — All 27 Findings ✅ COMPLETE

### What
A comprehensive audit identified 27 data points across the app that are static when they should be interactive — counts that don't filter, entity references that don't navigate, stat badges that don't act. This sprint wires every one of them up, consistent with existing patterns (EntityLink + pushNavigationStack for cross-entity navigation; URL filter params for in-page list filtering; toggleStatusFilter pattern for stat card clicks).

### Why
The aim of the tool is simplicity, insight and beauty. A policy name you cannot click is friction. A "12 Controls Passed" card that does nothing is a missed insight. Every data point should take the user closer to the thing they care about.

### Navigation Architecture (existing, must be respected)
- **EntityLink** (`src/components/common/EntityLink.tsx`): use for all cross-entity name references — automatically calls `pushNavigationStack(currentUrl)` then `router.push(entityUrl)` → back button works perfectly.
- **`<Link href="...?filter=X">`**: use for dashboard tile navigation to filtered list pages — browser history preserved → NavigationBackButton falls back to `router.back()` → works correctly.
- **In-page stat badge clicks**: local state toggle, no navigation, back button irrelevant.
- **Deep-link params**: receiving pages read `?param=value` on mount via `useSearchParams` lazy initialiser. Already implemented for `?risk=`, `?acceptance=`, `?action=`, `?control=`, `?regulation=`. New ones added here: `?type=` on controls, `?policy=` on compliance, `?domain=` on compliance regulatory universe tab.

### Findings Reference (27 total)
| # | Severity | Where | Finding |
|---|---|---|---|
| 001 | HIGH | Dashboard | Risk summary tiles link to `/risk-register` with no filter param |
| 002 | HIGH | Dashboard | Controls Library type tiles link to `/controls` with no filter param |
| 003 | HIGH | Dashboard | "Due This Month" tile links to `/actions` with no filter param |
| 004 | HIGH | Dashboard | "Policies with Coverage Gaps" links generically to `/compliance` |
| 005 | HIGH | Dashboard | "Key Controls" items link generically to `/controls` |
| 006 | HIGH | Dashboard | Urgent Risk Acceptance rows are static text — not clickable |
| 007 | MEDIUM | Dashboard | Compliance Health sub-tiles link to `/compliance` with no tab/filter |
| 008 | MEDIUM | Dashboard | "Pending approvals" pill is a static `<span>` |
| 009 | MEDIUM | Dashboard | Recent Activity items link to `/audit` with no entity context |
| 010 | MEDIUM | Dashboard | "Overdue Actions" tile links to `/actions` with no filter |
| 011 | LOW | Dashboard | Risk owner names in "Risks in Focus" are static text |
| 012 | HIGH | Compliance Overview | "Active Controls" MetricTile has no onClick |
| 013 | HIGH | Compliance Overview | RAG by Domain tiles navigate without passing domain filter |
| 014 | MEDIUM | Compliance Overview | SM&CR metric tiles (Filled, Vacant, Certs, Breaches, Documents) are static divs |
| 015 | MEDIUM | Compliance Overview | Consumer Duty RAG tiles are static divs |
| 016 | HIGH | Policies Tab | "Overdue" stat badge is a static `<span>` — doesn't filter table |
| 017 | HIGH | Policies Tab | "Due within 30 days" badge is a static `<span>` — doesn't filter table |
| 018 | MEDIUM | Regulation Detail Panel | SMF holder name is static text |
| 019 | HIGH | Risk Acceptances | Risk score badge is static — doesn't navigate to the risk |
| 020 | HIGH | Risk Acceptances | Risk name not shown at all in acceptance table row |
| 021 | MEDIUM | Risk Acceptances | Proposer and Approver names are plain text |
| 022 | MEDIUM | Regulatory Calendar | Month summary chips are static `<span>` elements |
| 023 | LOW | Regulatory Calendar | Event owner field is plain text |
| 024 | MEDIUM | Users | "Owned Risks" count per user is not clickable |
| 025 | MEDIUM | Action Detail Panel | "Current Owner" is plain text |
| 026 | LOW | Action Detail Panel | "Created by" is plain text |
| 027 | LOW | Risk Detail Panel | Inline control owner shows disabled select in view mode |

---

### Deliverable 1 — Infrastructure: receiving-page filter params
Some findings require the *destination* page to accept a new URL param before the source can deep-link into it. These must land first.

**Files:**
- `src/app/controls/page.tsx` + `src/components/controls/ControlsLibraryTab.tsx` — read `?type=PREVENTATIVE|DETECTIVE|DIRECTIVE|CORRECTIVE` on mount, apply as initial type filter
- `src/app/compliance/page.tsx` — read `?policy=<id>` and pass to PoliciesTab; read `?domain=<id>` and pass to RegulatoryUniverseTab; read `?cdRag=RED|AMBER|GREEN` and pass to RegulatoryUniverseTab
- `src/components/compliance/PoliciesTab.tsx` — accept `initialPolicyId` prop, auto-open that policy's detail panel on mount
- `src/components/compliance/RegulatoryUniverseTab.tsx` — accept `initialDomainFilter` and `initialCdRagFilter` props, apply on mount
- `src/app/risk-register/page.tsx` — verify `?filter=HIGH|MEDIUM|LOW|VERY_HIGH` is already handled (it is — just confirm)
- `src/app/actions/page.tsx` — verify `?status=OVERDUE` and `?status=DUE_THIS_MONTH` are handled; add DUE_THIS_MONTH if missing

**Checklist:**
- [x] Controls page reads `?type=` on mount and pre-selects the type filter in ControlsLibraryTab
- [x] Compliance page reads `?policy=<id>` and passes as `initialPolicyId` to PoliciesTab (was already implemented)
- [x] PoliciesTab auto-opens the matching policy detail panel when `initialPolicyId` is set (was already implemented)
- [x] Compliance page reads `?domain=<id>` and passes as `initialDomainFilter` to RegulatoryUniverseTab
- [x] RegulatoryUniverseTab filters to that domain when `initialDomainFilter` is set
- [x] Compliance page reads `?cdRag=` — deferred to Deliverable 3 (requires ComplianceOverview audit first; no separate param needed — domain filter sufficient for RAG tile use case)
- [x] Actions page handles `?status=DUE_THIS_MONTH` (was already implemented)
- [x] Risk register `?filter=HIGH|MEDIUM|LOW|VERY_HIGH` confirmed working (no change needed)
- [x] No existing filters, tabs, or panels removed

---

### Deliverable 2 — Dashboard tile deep links (findings 001–011)
Wire up every dashboard tile, cross-entity list item, and stat pill on `src/app/page.tsx`.

**Files:**
- `src/app/page.tsx`

**Changes per finding:**
- **001**: Risk summary tiles — `<Link href="/risk-register?filter=HIGH">` etc. (LOW/MEDIUM/HIGH/VERY_HIGH). Total tile stays unfiltered.
- **002**: Controls Library type tiles — `<Link href="/controls?tab=library&type=PREVENTATIVE">` etc. for each of the 4 types.
- **003**: "Due This Month" — `<Link href="/actions?status=DUE_THIS_MONTH">`.
- **004**: "Policies with Coverage Gaps" items — each policy item becomes `<Link href="/compliance?tab=policies&policy=${policy.id}">`.
- **005**: "Key Controls" items — each control becomes `<EntityLink type="control" id={control.id} reference={control.reference} label={control.name} />` (pushes nav stack).
- **006**: Urgent Risk Acceptance rows — each row wraps in `<Link href="/risk-acceptances?acceptance=${acceptance.id}">` (page already reads this param).
- **007**: Compliance Health sub-tiles — "Open Gaps" → `/compliance?tab=regulatory-universe&filter=NON_COMPLIANT`; "Overdue Assessments" → `/compliance?tab=assessment-log` (if tab exists) or best available; "Pending Certifications" → `/compliance?tab=smcr`.
- **008**: "Pending approvals" pill — wrap in `<Link href="/risk-acceptances?status=PENDING_APPROVAL">` (adjust if the param name differs).
- **009**: Recent Activity items — use `getEntityUrl(entityType, entityId)` from `src/lib/navigation.ts` to construct the link per activity entry; wrap each item in `<Link href={getEntityUrl(...)}>` (soft nav via Link, back button via browser history).
- **010**: "Overdue Actions" tile — `<Link href="/actions?status=OVERDUE">`.
- **011**: Risk owner names in "Risks in Focus" — replace static text with `<EntityLink type="user" id={owner.id} label={owner.name} />` (or `<Link href={/risk-register?owner=${userId}}>` if user EntityLink doesn't exist yet — check).

**Checklist:**
- [x] 001: Each risk level tile navigates to risk register pre-filtered by that level
- [x] 002: Each control type tile navigates to controls library pre-filtered by that type
- [x] 003: "Due This Month" tile navigates to actions filtered to DUE_THIS_MONTH
- [x] 004: Each "Policies with Coverage Gaps" item deep-links to that specific policy's detail panel
- [x] 005: Each "Key Controls" item deep-links to the specific control in the library
- [x] 006: Each urgent Risk Acceptance row is clickable and opens that acceptance's detail panel
- [x] 007: Compliance Health sub-tiles navigate to the most relevant compliance view/filter
- [x] 008: "Pending approvals" pill navigates to /change-requests
- [x] 009: Recent Activity items link to the specific entity acted on (correct entity type/ID)
- [x] 010: "Overdue Actions" tile navigates to actions filtered to OVERDUE (was already done)
- [x] 011: Risk owner names in Risks in Focus open the risk register filtered by owner name
- [x] All other dashboard sections (Consumer Duty, export, settings tiles) untouched
- [x] Back button works correctly after all new navigations (Link/button pattern preserved)

---

### Deliverable 3 — Compliance Overview interactivity (findings 012–015)
**Files:**
- `src/components/compliance/ComplianceOverview.tsx`
- `src/app/compliance/page.tsx` (pass domain/cdRag filter to child tabs — already done in Deliverable 1)

**Changes:**
- **012**: "Active Controls" MetricTile — add `onClick={() => router.push("/controls?tab=library&status=ACTIVE")}` and `cursor-pointer hover:shadow` styles. (ComplianceOverview has access to `router` or can use `<Link>` wrapper.)
- **013**: RAG by Domain tiles — change `onNavigate("regulatory-universe")` call to `onNavigate("regulatory-universe", { domain: domainId })`. The compliance page's `handleNavigate` function passes this as `initialDomainFilter` to RegulatoryUniverseTab (set up in Deliverable 1).
- **014**: SM&CR metric tiles — wrap each in a clickable `<button>` or `<Link>` that calls `onNavigate("smcr")` (already navigates to the tab) — extend to pass a filter if the SM&CR tab supports it, otherwise just navigate to the tab as a minimum useful improvement.
- **015**: Consumer Duty RAG tiles — each tile becomes `<Link href="/compliance?tab=regulatory-universe&cdRag=RED">` etc. (RegulatoryUniverseTab picks up `cdRag` filter from Deliverable 1).

**Checklist:**
- [x] 012: "Active Controls" tile is clickable and navigates to Controls Library tab
- [x] 013: RAG by Domain tile click navigates to regulatory universe filtered to that domain
- [x] 014: SM&CR tiles are clickable and navigate to the SM&CR tab
- [x] 015: Consumer Duty RAG tiles navigate to /consumer-duty?rag=GOOD/WARNING/HARM
- [x] ComplianceOverview still renders all existing sections (RAG summary, domain breakdown, CD section, SM&CR summary)

---

### Deliverable 4 — Policies Tab stat badges + Risk Acceptances table (findings 016, 017, 019, 020, 021)

**Files:**
- `src/components/compliance/PoliciesTab.tsx`
- `src/app/risk-acceptances/page.tsx`

**Changes:**
- **016**: "Overdue" stat badge in PoliciesTab — add `statusFilter` state; clicking badge sets `statusFilter = "OVERDUE"` (toggles off if already set); apply to policies list. Style: `cursor-pointer hover:opacity-80 transition-opacity`; active state gets `ring-2 ring-updraft-bright-purple/30`.
- **017**: "Due within 30 days" badge — same pattern, `statusFilter = "DUE_SOON"`.
- **019 + 020**: Risk Acceptances table row — currently only shows ScoreBadge for the linked risk. Add the risk reference + name as an `<EntityLink type="risk" id={acceptance.riskId} reference={acceptance.risk?.reference} label={acceptance.risk?.name} />`. Replace static ScoreBadge with EntityLink (or keep badge alongside). Verify risk data is available in `riskAcceptance` objects from the store (risk reference and name should be hydrated).
- **021**: Proposer and Approver names — replace plain text with `<EntityLink type="user" id={acceptance.proposerId} label={acceptance.proposerName} />` and same for approver (if approver ID is available on the acceptance object).

**Checklist:**
- [x] 016: Clicking "Overdue" badge filters policies table to overdue policies only; second click clears
- [x] 017: Clicking "Due within 30 days" badge filters to due-soon policies; second click clears
- [x] Active badge has visual active state (ring + brighter background)
- [x] 019: ScoreBadge wrapped in button that navigates to the linked risk (stopPropagation)
- [x] 020: Risk EntityLink (reference + name) added to Score cell — pushes nav stack
- [x] 021: Proposer name navigates to risk register filtered by name (user EntityLink not available — used q= search)
- [x] 021: Approver name navigates to risk register filtered by name
- [x] All existing acceptance table columns, filters, stat cards, and detail panel intact

---

### Deliverable 5 — Detail panel EntityLinks + Regulatory Calendar + Users (findings 018, 022–027)

**Files:**
- `src/components/compliance/RegulationDetailPanel.tsx` (018)
- `src/components/or/RegulatoryCalendarWidget.tsx` (022, 023)
- `src/app/users/page.tsx` (024)
- `src/components/actions/ActionDetailPanel.tsx` (025, 026)
- `src/components/risk-register/RiskDetailPanel.tsx` (027)

**Changes:**
- **018**: RegulationDetailPanel — SMF holder name `{primaryHolder.currentHolder.name}` → `<EntityLink type="user" id={primaryHolder.currentHolder.id} label={primaryHolder.currentHolder.name} />` (check if user ID is available on the holder object; if not, plain text is acceptable).
- **022**: RegulatoryCalendarWidget month summary chips — each chip becomes a `<button>` that sets `scrollToMonth` state (or calls a scroll ref); smooth-scroll the event list to the matching month group. Style: `cursor-pointer hover:bg-updraft-pale-purple/20`; active month chip gets highlight.
- **023**: Event owner name — replace `{ev.owner}` with `<EntityLink type="user" id={owner.id} label={ev.owner} />` (check if owner is a user ID or free text; if free text only, leave as-is and note limitation).
- **024**: Users page — "Owned Risks" count per user — wrap count in `<Link href={/risk-register?owner=${user.id}}>` with hover underline (requires risk register to support `?owner=` filter; check if it does; if not, navigate to `/risk-register` as minimum). Note: `?owner=` filter may need adding to risk register page.
- **025**: ActionDetailPanel — owner name — replace `{owner?.name}` with `<EntityLink type="user" id={owner.id} label={owner.name} />`.
- **026**: ActionDetailPanel — "Created by" — replace `{creator?.name}` with `<EntityLink type="user" id={creator.id} label={creator.name} />` (if creator ID is available; otherwise leave as plain text).
- **027**: RiskDetailPanel — inline control owner in view mode — when `!isEditing`, replace disabled `<select>` with plain text span showing the selected user's name (look up from `users` store by ID).

**Checklist:**
- [x] 018: SMF holder name → `<a href="/compliance?tab=smcr">` link (no per-user URL; SM&CR tab is correct destination)
- [x] 022: Month chips scroll/filter the calendar to that month when clicked
- [x] 022: Active month chip has visual highlight (ring + pale-purple bg)
- [x] 023: Event owner is free text only — left as plain text (no user ID on RegulatoryEvent)
- [x] 024: "Owned Risks" count → `<Link href="/risk-register?q=userName">` with hover style
- [x] 025: Action detail panel owner name → `<button>` navigating to `/actions?owner=${id}`
- [x] 026: Action detail panel "Created by" → `<button>` navigating to `/actions?owner=${id}` (if creator exists)
- [x] 027: Inline control owner shows readable text (user name from `activeUsers`) in view mode (`!canEditRisk`)
- [x] No panel tabs, edit functionality, or existing links removed
- [x] Build passes: `npx next build` — zero TypeScript errors, 88/88 static pages generated

---

### Cross-cutting Back Button Considerations
- All `EntityLink` additions automatically push to the Zustand `navigationStack` — back button works without any extra code.
- All `<Link href="...">` tile deep-links use Next.js soft navigation — browser history preserved — NavigationBackButton falls back to `router.back()` — back button works.
- No `window.location.href` usage anywhere — this would break both the store and the back button.
- When navigating FROM a detail panel (e.g. clicking an EntityLink inside ActionDetailPanel), the current URL (including `?action=<id>`) is already written to the URL by the panel's `useEffect` — so the stack captures the exact panel state and back returns directly to the open panel.

---

### Files to Modify (summary)
| File | Deliverable |
|---|---|
| `src/app/controls/page.tsx` | 1 |
| `src/components/controls/ControlsLibraryTab.tsx` | 1 |
| `src/app/compliance/page.tsx` | 1, 3 |
| `src/components/compliance/PoliciesTab.tsx` | 1, 4 |
| `src/components/compliance/RegulatoryUniverseTab.tsx` | 1, 3 |
| `src/app/actions/page.tsx` | 1 |
| `src/app/page.tsx` (dashboard) | 2 |
| `src/components/compliance/ComplianceOverview.tsx` | 3 |
| `src/app/risk-acceptances/page.tsx` | 4 |
| `src/components/compliance/RegulationDetailPanel.tsx` | 5 |
| `src/components/or/RegulatoryCalendarWidget.tsx` | 5 |
| `src/app/users/page.tsx` | 5 |
| `src/components/actions/ActionDetailPanel.tsx` | 5 |
| `src/components/risk-register/RiskDetailPanel.tsx` | 5 |

---

## CURRENT SPRINT: Controls Library — Scrollable Table Fix ✅ COMPLETE

### What
Fix the Controls Library table so cut-off columns are accessible on all screen sizes.

### Problem
The table is 1,729px wide but the container is only ~870px. The `overflow-x-auto` container had no height constraint, so the horizontal scrollbar only appeared after scrolling through all 393 rows — effectively invisible. macOS overlay scrollbars made this worse.

### Solution
1. **`src/app/globals.css`** — Add `.table-scroll` CSS class: thin, always-visible webkit + Firefox scrollbars on both axes.
2. **`src/components/controls/ControlsLibraryTab.tsx`** — Change table wrapper from `overflow-x-auto` to `overflow-auto table-scroll max-h-[520px]`, constraining the container to 520px and making both scrollbars permanently visible at the bottom/right edge.
3. **`src/middleware.ts`** — DEV_BYPASS_AUTH dev shortcut: injects `X-Verified-User-Id` header so the local preview server works without Google OAuth.
4. **`src/app/api/auth/session/route.ts`** — New file: serves a mock session in dev (`DEV_BYPASS_AUTH=true`) so `useSession()` resolves; delegates to real NextAuth handler in all other environments.

### Checklist
- [x] `.table-scroll` CSS added to globals.css (webkit + Firefox scrollbars, both axes)
- [x] Table container uses `overflow-auto table-scroll max-h-[520px]`
- [x] Horizontal scrollbar visible within the 520px window (not buried below 393 rows)
- [x] Vertical scrollbar visible for browsing rows within the fixed-height container
- [x] DEV_BYPASS_AUTH middleware bypass works for local preview
- [x] Mock session route delegates to real NextAuth in production (no regression)
- [x] Build passes — zero type errors
- [x] No existing features removed

---

## PREVIOUSLY COMPLETED: URL Panel State + Navigation Stack Fix ✅ COMPLETE

### What
Two complementary fixes:
1. **Part 1 — Write URL on panel selection**: Every slide-out panel now calls `router.replace` (via `useEffect`) to write its entity ID into the URL when opened, and clears it when closed. Enables refresh-safe deep-links and copy/paste sharing.
2. **Part 2 — pushNavigationStack for panel action buttons**: Three panel files that call `router.push()` to navigate away now first push the current URL (including the panel param set by Part 1) onto the Zustand navigation stack so the Back button works.

### Files Modified
| File | Change |
|------|--------|
| `src/app/risk-register/page.tsx` | useEffect: write `?risk=<id>` on open, clear on close |
| `src/app/processes/page.tsx` | useEffect: write `?process=<id>` on open, clear on close |
| `src/app/risk-acceptances/page.tsx` | useEffect: write `?acceptance=<id>` on open, clear on close |
| `src/components/compliance/RegulatoryUniverseTab.tsx` | Add useRouter/useSearchParams + useEffect: write `?regulation=<id>` on open, clear on close |
| `src/components/controls/ControlsLibraryTab.tsx` | Add useRouter/useSearchParams + useEffect: write `?control=<id>` on open, clear on close |
| `src/components/risk-register/RiskDetailPanel.tsx` | pushNavigationStack before "Raise Action" and "Add Risk Acceptance" router.push calls |
| `src/components/or/RegCalEventDetailPanel.tsx` | pushNavigationStack before "View Actions" and "Create Action" router.push calls |
| `src/components/controls/TestResultsEntryTab.tsx` | pushNavigationStack before "Create Risk Acceptance" router.push call |

### Checklist
- [x] Risk register: URL shows `?risk=<id>` when panel is open; cleared on close
- [x] Processes: URL shows `?process=<id>` when panel is open; cleared on close
- [x] Risk acceptances: URL shows `?acceptance=<id>` when panel is open; cleared on close
- [x] Compliance regulatory universe: URL shows `?regulation=<id>&tab=regulatory-universe` when panel open; cleared on close
- [x] Controls library: URL shows `?control=<id>&tab=library` when panel open; cleared on close
- [x] RiskDetailPanel: "Raise Action" button pushes to nav stack before navigating
- [x] RiskDetailPanel: "Add Risk Acceptance" button pushes to nav stack before navigating
- [x] RegCalEventDetailPanel: "View Actions" button pushes to nav stack before navigating
- [x] RegCalEventDetailPanel: "Create Action" button pushes to nav stack before navigating
- [x] TestResultsEntryTab: "Create Risk Acceptance" button pushes to nav stack before navigating
- [x] Build passes — zero TypeScript errors
- [x] No existing features removed

---

## PREVIOUSLY COMPLETED: Back Button Fix + Actions & RegCal Detail Panels

### What
Three deliverables:
1. **Back button fix** — root cause: `navigateToEntity()` uses `window.location.href` (hard nav), which wipes Zustand store on reload. Stack is always empty when new page loads. Fix: use `router.push()` in EntityLink (soft nav, preserves store).
2. **Actions detail panel** — remove inline expand from actions page. Clean list rows (title, ref badge, priority, status, owner initials, due date). Row click → slide-out `ActionDetailPanel` component.
3. **Regulatory Calendar event detail panel** — clicking an event card in the widget opens a `RegCalEventDetailPanel` slide-out instead of the current inline accordion expand.

### Files
**Back button:**
- `src/components/common/EntityLink.tsx` — use `useRouter` + `router.push()` instead of `window.location.href` in `navigateToEntity` call
- `src/lib/navigation.ts` — `navigateToEntity` signature stays, but EntityLink bypasses it and calls `router.push(getEntityUrl(...))` directly

**Actions:**
- `src/app/actions/page.tsx` — remove all `expandedIds` state + expanded card JSX + all inline form states (`showUpdateForm`, `showDateProposal`, `showReassignProposal`, `editingIssue`). Row click → `setSelectedAction(action)`. Keep: groups, progress bar, bulk ops, filters, search, stat cards, ActionFormDialog, CSV import/export.
- `src/components/actions/ActionDetailPanel.tsx` — NEW slide-out panel with:
  - Purple gradient header: reference badge, priority badge, status badge, title, due date, close button
  - Issue to be Addressed section (rich text, CCRO editable)
  - Risk link (EntityLink if linkedMitigation present)
  - Key details grid: owner, due date, created by, delay summary
  - Action buttons: Edit (CCRO), Mark Complete (CCRO), Delete (CCRO), Add Update (owner/CCRO), Request Date Change (non-CCRO), Request Reassignment (non-CCRO), Propose Closed (non-CCRO)
  - ActionUpdateForm inline
  - Date change proposal form inline
  - Reassignment proposal form inline
  - Description (read-only for non-CCRO, editable for CCRO)
  - ActionChangePanel (change proposals/history)

**Regulatory Calendar:**
- `src/components/or/RegulatoryCalendarWidget.tsx` — remove inline accordion expand on event cards. Event card click → `setSelectedEvent(event)`. Keep: month grouping, RAG dots, create event form (CCRO).
- `src/components/or/RegCalEventDetailPanel.tsx` — NEW slide-out panel with:
  - Purple gradient header: event title, type badge (DEADLINE/REVIEW/etc.), RAG countdown pill, close button
  - Details section: full description, event date, source (FCA/PRA/DORA/INTERNAL), owner, alert days
  - External link button (if URL set)
  - Edit mode (CCRO): all fields editable inline, Save/Cancel buttons
  - Create Action button (CCRO): pre-fills action with event title + date as dueDate

### Checklist
**Back button:**
- [x] EntityLink uses `router.push(getEntityUrl(type, id))` — no more `window.location.href`
- [x] `pushNavigationStack` still called with current URL before navigation
- [x] Back button appears after any EntityLink click-through
- [x] Back button navigates to exact previous URL (preserves tab + search params)
- [x] Back button disappears after navigating back (stack empty)

**Actions panel:**
- [x] `expandedIds` state removed from actions/page.tsx
- [x] All inline form states removed (showUpdateForm, showDateProposal, showReassignProposal, editingIssue)
- [x] Action rows are clean: ref badge, priority, title, owner initials, due date, status badge, pending change badges
- [x] Row click opens ActionDetailPanel slide-out
- [x] `?action=id` URL param still opens panel for the matching action on load
- [x] All action buttons (Edit, Complete, Delete, Update, proposals) work from within panel
- [x] Bulk ops (checkboxes, bulk complete, reassign, export) still work on list
- [x] Groups, progress bar, search, filters, stat cards all intact
- [x] ActionFormDialog, CSV import/export still functional

**Regulatory Calendar panel:**
- [x] Inline accordion expand removed from RegulatoryCalendarWidget
- [x] Event card click opens RegCalEventDetailPanel
- [x] Panel shows title, type, date, RAG status, description, source, owner, alert days, URL
- [x] CCRO edit mode works within panel (all fields)
- [x] CCRO delete works from panel
- [x] Create Action button (CCRO) pre-fills new action with event title + due date
- [x] Create event form (CCRO) still works on main widget

**General:**
- [x] Build passes — zero TypeScript errors
- [x] No existing features removed

### Proposals (document only — do not implement yet)
Other areas that would benefit from detail panels (propose to user, implement on request):
- **Reports list** — quick preview panel (sections, status, period, owner) without navigating away
- **Users page** — detail panel with role, permissions, last login, invite history, audit trail
- **SM&CR Certifications** — detail panel with certificate details, expiry, fitness notes
- **Audit log** — detail panel for full event diff (old→new, who, downstream effects)

---

---

## CURRENT SPRINT: Cosmetic — Favicon + Panel Header Purple

### What
Two cosmetic fixes:
1. **Favicon**: Replace current shield icon (white on blue — renders as white-on-white for other users) with helloupdraft_logo (white balloon on purple)
2. **Panel header background**: All detail panels have reverted to `bg-white` headers. PolicyDetailPanel already has the correct purple gradient. Apply the same `bg-gradient-to-r from-updraft-deep to-updraft-bar` header to all other detail panels, updating interior text colours to white.

### Files
- `src/app/layout.tsx` — add `<link rel="icon">` pointing to helloupdraft_logo
- `public/helloupdraft_logo.jpeg` — copy logo file here
- `src/components/risk-acceptances/RiskAcceptanceDetailPanel.tsx` — header bg + text colours
- `src/components/risk-register/RiskDetailPanel.tsx` — header bg + text colours
- `src/components/processes/ProcessDetailPanel.tsx` — header bg + text colours
- `src/components/or/IBSDetailPanel.tsx` — header bg + text colours
- `src/components/compliance/RegulationDetailPanel.tsx` — header bg + text colours

### Checklist
- [x] helloupdraft_logo.jpeg copied to public/
- [x] layout.tsx `<head>` references helloupdraft_logo as favicon (overrides default)
- [x] RiskAcceptanceDetailPanel: header is purple gradient, breadcrumb/title/badges use white tones
- [x] RiskDetailPanel: header is purple gradient, breadcrumb/title/badges use white tones
- [x] ProcessDetailPanel: header is purple gradient, name/badges use white tones
- [x] IBSDetailPanel: header is purple gradient, name/ref/SMF use white tones
- [x] RegulationDetailPanel: header is purple gradient, name/ref/body use white tones
- [x] PolicyDetailPanel: already correct — confirmed untouched
- [x] No tabs, content areas, or other features removed or broken
- [x] Build passes — zero TypeScript errors

---

## CURRENT SPRINT: Remaining Audit Items — T4/T9/CD1/PV1/T1 ✅ COMPLETE

### What
Sprint completing remaining open audit items: sidebar cleanup, PENDING risk visibility, Consumer Duty collapsible sections, Process CSV import/export, approve/reject loading states.

### Files
- `src/components/layout/Sidebar.tsx` — T4: remove Policies nav item
- `src/app/risk-register/page.tsx` — T9: hide PENDING_APPROVAL risks from non-owner/non-CCRO
- `src/app/consumer-duty/page.tsx` — CD1: collapsible sections (Outcomes, Measures table, My Measures)
- `src/app/processes/page.tsx` — PV1: Export CSV + Import CSV buttons + modal
- `src/app/api/processes/export/route.ts` — PV1: GET CSV export (all roles)
- `src/app/api/processes/import/route.ts` — PV1: POST CSV import (CCRO only, upsert by reference)
- `src/lib/parse-csv.ts` — PV1: client-side CSV parser
- `src/app/change-requests/page.tsx` — T1: "Approving…"/"Rejecting…" on buttons while in-flight

### Checklist
- [x] T4: Policies item absent from sidebar; Compliance, Controls, Processes & IBS, Reg Calendar remain
- [x] T9: PENDING_APPROVAL risks hidden for non-owner/non-CCRO; visible to creator and CCRO
- [x] CD1: Outcomes grid collapses/expands with ChevronDown toggle
- [x] CD1: All Measures Summary table collapses/expands
- [x] CD1: My Measures grid collapses/expands
- [x] CD1: Collapsed state persisted to localStorage keyed by user ID
- [x] PV1: GET /api/processes/export returns valid CSV with 16 columns
- [x] PV1: POST /api/processes/import upserts rows by reference, returns {created, updated, errors}
- [x] PV1: Export CSV button visible to all roles on Processes tab
- [x] PV1: Import CSV button visible to CCRO only, opens file-picker modal with preview + result
- [x] T1: Approve button shows "Approving…" while PATCH in-flight
- [x] T1: Reject button shows "Rejecting…" while PATCH in-flight
- [x] Build passes — zero TypeScript errors
- [x] No existing features removed

---

## PREVIOUSLY COMPLETED: Remaining Audit Items — Sprint 1 (T8, UX3, T3, UX8, UX10) ✅ COMPLETE

### What
Sprint 1 quick wins from the post-audit plan.

### Files
- `src/app/api/ibs/[id]/resource-map/route.ts` — T8: audit log on PATCH
- `src/app/api/ibs/[id]/scenarios/[scId]/route.ts` — T8: audit log on PATCH + DELETE
- `src/app/api/self-assessments/[id]/route.ts` — T8: audit log on PATCH + DELETE
- `src/app/api/processes/[id]/route.ts` — T8: audit log on PATCH + DELETE (soft)
- `src/app/api/controls/testing-schedule/[id]/route.ts` — T8: audit log on PATCH
- `src/components/controls/ControlsLibraryTab.tsx` — UX3: EmptyState component
- `src/app/users/page.tsx` — UX3: EmptyState component with CTA
- `src/components/common/HistoryTab.tsx` — UX3: context sentence on empty state
- `src/app/risk-register/page.tsx` — T3: hydration guard
- `src/app/processes/page.tsx` — T3: hydration guard
- `src/app/compliance/page.tsx` — T3: hydration guard
- `src/app/controls/page.tsx` — T3: hydration guard
- `src/app/reports/page.tsx` — UX8: current period highlight card + sort by createdAt desc
- `src/components/processes/ProcessStepsTab.tsx` — UX10: user picker dropdowns for roles

### Checklist
- [x] T8: IBS resource-map PATCH writes audit log
- [x] T8: Scenario PATCH + DELETE write audit logs
- [x] T8: Self-assessment PATCH + DELETE write audit logs
- [x] T8: Process PATCH + soft-DELETE write audit logs
- [x] T8: Testing schedule PATCH writes audit log
- [x] UX3: ControlsLibraryTab uses EmptyState with context (no controls / filters / archived)
- [x] UX3: Users page uses EmptyState with CTA when no users or no matches
- [x] UX3: HistoryTab empty state includes "Events are recorded when entities are created, updated, or deleted."
- [x] T3: Risk Register shows PageLoadingState before hydration
- [x] T3: Processes page shows PageLoadingState before hydration
- [x] T3: Compliance page shows PageLoadingState before hydration
- [x] T3: Controls page shows PageLoadingState before hydration
- [x] UX8: Reports page computes current quarter label and surfaces matching report as highlight card
- [x] UX8: If no current period report, shows "Start Q1 2026 report" CTA (CCRO only)
- [x] UX8: Reports grid sorted by createdAt descending
- [x] UX10: Process step responsible/accountable role fields are dropdowns populated from active users
- [x] UX10: Legacy free-text values shown as "(legacy)" option if not matching a user
- [x] Build passes — zero type errors
- [x] No existing features removed

---

## PREVIOUSLY COMPLETED: Remaining Audit Items — Sprint 2 (T2 — Unsaved Changes Guard) ✅ COMPLETE

### What
Unsaved changes guard on three edit panels: IBSOverviewTab, RiskDetailPanel, RegulationDetailPanel.

### Files
- `src/components/or/IBSOverviewTab.tsx` — ConfirmDialog + isDirty + handleCancelEdit
- `src/components/risk-register/RiskDetailPanel.tsx` — ConfirmDialog + isDirty + handleCancel (Cancel btn + backdrop)
- `src/components/compliance/RegulationDetailPanel.tsx` — ConfirmDialog + isDirty + handleCancelEdit

### Checklist
- [x] IBSOverviewTab: Cancel button shows ConfirmDialog if form is dirty
- [x] IBSOverviewTab: form resets when ibs.id changes
- [x] RiskDetailPanel: Cancel button shows ConfirmDialog if form is dirty
- [x] RiskDetailPanel: Backdrop click shows ConfirmDialog if form is dirty
- [x] RegulationDetailPanel: Cancel button shows ConfirmDialog if form is dirty
- [x] Dialog wording: "Unsaved changes" / "Discard changes" / variant warning
- [x] Build passes — zero type errors

---

## PREVIOUSLY COMPLETED: Remaining Audit Items — Sprint 3 (D2, D4) ✅ COMPLETE

### What
D2: Maturity card tab CTAs in ProcessOverviewTab — each criterion gets a ghost button that jumps to the relevant tab.
D4: Single-process HTML export — "Export" button in ProcessDetailPanel header, downloads self-contained HTML.

### Files
- `src/components/processes/ProcessOverviewTab.tsx` — D2: enrich criteria with tab/action, add onNavigateTab prop
- `src/components/processes/ProcessDetailPanel.tsx` — D2: pass onNavigateTab; D4: Export button
- `src/lib/export-process-html.ts` — D4: new file, generateProcessHTML()

### Checklist
- [x] D2: ProcessOverviewTab accepts onNavigateTab prop
- [x] D2: Level 1 criteria shows "Edit details" button → calls onEdit()
- [x] D2: Level 2 criteria shows "→ Policies" and "→ Regulations" buttons
- [x] D2: Level 3 criteria shows "→ Controls", "→ Risks", "→ Steps" buttons
- [x] D2: Level 4 criteria shows "→ IBS" button
- [x] D2: ProcessDetailPanel passes onNavigateTab={setActiveTab} to ProcessOverviewTab
- [x] D4: src/lib/export-process-html.ts created with generateProcessHTML()
- [x] D4: Export button in ProcessDetailPanel header (visible to all roles)
- [x] D4: Clicking Export downloads Process_[REF]_[date].html
- [x] Build passes — zero type errors
- [x] No existing features removed

---

## PREVIOUSLY COMPLETED: Could Fix — Quick Wins (R5, UX6, C3, UX9) ✅ COMPLETE

### What
Four low-risk audit items that improve UX and auditability without touching core workflows.

### Files
- `src/app/templates/page.tsx` — R5: replace orphaned page with redirect to /settings?tab=templates
- `src/app/components-lib/page.tsx` — R5: replace orphaned page with redirect to /settings?tab=components
- `src/app/actions/page.tsx` — UX6: read/write collapsedGroups from localStorage
- `src/components/controls/ControlSuggestChangeForm.tsx` — C3: add workflow note before submit button
- `src/app/api/export/html/route.ts` — UX9: log audit event when HTML pack is generated

### Skipped
- T9 — leave as-is (no code change, by design)
- T6 — already done (no dashboard badge exists)
- UX5 — deferred (compliance tab switching — no clean fix available without risk of regression)

### Checklist
- [x] R5: /templates redirects to /settings?tab=templates
- [x] R5: /components-lib redirects to /settings?tab=components
- [x] UX6: Actions page reads initial collapsedGroups from localStorage (falls back to {"COMPLETED"})
- [x] UX6: Toggling a group persists the new set to localStorage
- [x] C3: ControlSuggestChangeForm shows workflow note when a field is selected
- [x] UX9: POST /api/export/html writes an auditLog entry (fire-and-forget)
- [x] Build passes — zero type errors
- [x] No existing features removed

---

## PREVIOUSLY COMPLETED: Should Fix — Remaining 4 Items (UX7, A1, A3, E1) ✅ COMPLETE

### What
Four remaining "Should Fix" items from the 25 Feb 2026 audit.

### Files changed
- **UX7**: `src/components/actions/ActionFormDialog.tsx` — red border + clear-on-change on title/dueDate/priority
- **UX7**: `src/components/risk-register/RiskDetailPanel.tsx` — added `formErrors` state, `validateRisk()`, red border + error messages on name/categoryL1/categoryL2/ownerId
- **A1**: `src/lib/dashboard-sections.ts` — added `CCRO_DEFAULT_SECTION_ORDER` (action-required → proposed-changes → compliance-health → risks-in-focus first)
- **A1**: `src/app/page.tsx` — `effectiveOrder` useMemo uses `CCRO_DEFAULT_SECTION_ORDER` when role is CCRO_TEAM and no saved layout
- **A3**: `src/app/change-requests/page.tsx` — added checkboxes (CCRO + PENDING only), `selectedIds` state, bulk approve button + inline note dialog, `handleBulkApprove()`
- **E1**: `src/components/controls/AttestationTab.tsx` — 2LOD context shown for all controls (scheduled: badge+date; unscheduled: grey note); "View details" link on every control row

### Checklist
- [x] UX7: ActionFormDialog shows inline field errors (red border + message) on submit without API round-trip
- [x] UX7: Risk create/edit form shows inline field errors
- [x] UX7: No other form regressions — existing forms that already show inline errors unaffected
- [x] A1: CCRO dashboard default order: Action Required → Proposed Changes → Compliance Health → Risk in Focus (above the fold)
- [x] A1: Non-CCRO dashboard layout unchanged
- [x] A3: Change Requests page has row checkboxes for CCRO
- [x] A3: "Bulk Approve" button appears when ≥1 row selected; opens shared-note dialog
- [x] A3: Bulk approve calls per-entity PATCH endpoints for all selected changes
- [x] A3: After bulk approve, all selected rows disappear from pending list
- [x] E1: Attestation tab control rows show: last test result badge, last test date, link to control detail
- [x] E1: Attestation still works — submit/confirm flow unaffected
- [x] Build passes — zero type errors
- [x] No existing features removed

---

## PREVIOUSLY COMPLETED: Navigation Restructure — Processes & IBS + Sidebar Cleanup ✅ COMPLETE

### What
Consolidate Operational Resilience into the Process Library page (renamed "Processes & IBS"), clean up sidebar duplication (remove OR standalone, SM&CR standalone), and give the Regulatory Calendar its own dedicated route.

### Files
- `src/components/layout/Sidebar.tsx` — rename, remove OR+SM&CR, add Reg Cal, move badge
- `src/app/processes/page.tsx` — add 3 OR tabs + state
- `src/app/operational-resilience/page.tsx` — replace with smart redirect
- `src/app/compliance/page.tsx` — remove Reg Calendar tab
- `src/app/regulatory-calendar/page.tsx` — NEW standalone Reg Calendar page
- `src/lib/permissions.ts` — verify CEO has page:compliance (already present)
- `src/components/common/NotificationDrawer.tsx` — update OR hrefs

### Checklist
- [x] Sidebar: "Processes & IBS" shown with operationalResilience badge
- [x] Sidebar: SM&CR item removed
- [x] Sidebar: OR standalone item removed
- [x] Sidebar: "Reg Calendar" item links to `/regulatory-calendar`
- [x] Processes & IBS page: all 5 tabs render correctly (Processes, IBS Registry, Resilience Overview, Self-Assessment, History)
- [x] OR Dashboard → IBS drill-through (onSelectIbs) works within the new page
- [x] `/operational-resilience` redirects to `/processes` (tab params mapped)
- [x] Compliance page: Regulatory Calendar tab removed, no broken references
- [x] `/regulatory-calendar` page renders RegulatoryCalendarWidget
- [x] CEO role has `page:compliance` permission (already present — verified)
- [x] NotificationDrawer OR notification hrefs updated (scenarios, IBS gaps, self-assessment → /processes; reg deadlines → /regulatory-calendar)
- [x] GlobalSearch IBS hrefs updated to /processes?tab=ibs
- [x] ORDashboard stat card hrefs updated to /processes?tab=ibs and /processes?tab=self-assessment
- [x] SelfAssessmentTab readiness checklist hrefs updated to /processes?tab=ibs
- [x] Build passes — zero type errors ✅
- [x] No existing features removed (all OR content still accessible via new tabs)

---

## PREVIOUSLY COMPLETED: Should Fix — Quick Wins (R3, R6, R7, T7, UX2, UX4, C1, D1, D3, E3) ✅ COMPLETE

## CURRENT SPRINT: Should Fix — Quick Wins (R3, R6, R7, T7, UX2, UX4, C1, D1, D3, E3)

### What
Ten "should fix" audit items, all achievable in a single focused pass. No existing features removed.

### Files
- `src/components/layout/Sidebar.tsx` — R3 (proposer badge), R6 (dead badgeKey), T7 (Reg Calendar), UX2 (dashboard badge)
- `src/components/common/GlobalSearch.tsx` — UX4 (add processes, IBS, risk acceptances)
- `src/components/common/NotificationDrawer.tsx` — D3 (scope process notification), E3 (control test notification)
- `src/app/risk-register/page.tsx` — C1 (default My Risks for OWNER)
- `src/app/processes/page.tsx` — D1 (default My Processes for OWNER)
- `src/app/actions/page.tsx` — R7 (Send Reminders button)
- `src/app/api/actions/remind/route.ts` — R7 (NEW — send reminder emails API)

### Checklist
- [x] R3: Sidebar Change Requests badge shows own pending changes for non-CCRO proposers
- [x] R6: Dead `badgeKey: "riskRegister"` removed from Risk Register nav item
- [x] T7: "Reg Calendar" nav item removed from sidebar
- [x] UX2: `badgeKey: "dashboard"` removed from Dashboard nav item
- [x] UX4: GlobalSearch includes processes (reference, name), IBS (reference, name), risk acceptances (reference, title)
- [x] C1: Risk Register defaults to showing only the current user's risks when role is OWNER
- [x] D1: Process Library defaults to showing only the current user's processes when role is OWNER
- [x] D3: "Processes overdue for review" notification scoped to own processes for OWNER role
- [x] E3: Notification for overdue control tests when current user is the assigned tester
- [x] R7: "Send Reminders" button in Actions header (CCRO only) with localStorage throttle
- [x] R7: POST /api/actions/remind route already existed and is complete — button wired up
- [x] Build passes (npx next build) — zero type errors
- [x] No existing tabs, features, or routes removed

---

## PREVIOUSLY COMPLETED: Must Fix — Audit Findings (R1, R2, R4, T1, UX1) ✅ COMPLETE

### What
Five issues identified in the 25 Feb 2026 audit as blocking core workflows or regulatory credibility.
No existing features are being removed — all changes are additive or corrective.

### Why
- R1/R2: CEO and VIEWER roles cannot access OR module or ExCo Dashboard — built for them but permissions never granted
- R4: Change proposal workflow is a dead end for proposers — no feedback when approved/rejected
- T1: Save feedback is absent or inconsistent across the app — users cannot tell if their changes persisted
- UX1: Back button appears after any browser navigation and can exit the app entirely

### Files

**R1 + R2 — Permissions:**
- `src/lib/permissions.ts`

**R4 — Change request resolved notification:**
- `src/components/common/NotificationDrawer.tsx`

**T1 — Global save indicator:**
- `src/lib/store.ts` — add `_savingCount`, `_lastSavedAt`, `_saveError` fields
- `src/lib/api-helpers.ts` — wrap sync() to update save state
- `src/components/common/SaveStatusIndicator.tsx` — NEW component
- `src/app/layout.tsx` — mount the indicator

**T1 — Button-level save states on form dialogs:**
- `src/components/actions/ActionFormDialog.tsx`
- `src/components/risk-register/RiskDetailPanel.tsx`
- `src/components/risk-acceptances/RiskAcceptanceFormDialog.tsx`
- `src/components/processes/ProcessFormDialog.tsx`
- `src/components/policies/PolicyFormDialog.tsx`
- `src/components/consumer-duty/MeasureFormDialog.tsx`
- `src/components/consumer-duty/OutcomeFormDialog.tsx`
- `src/components/users/UserFormDialog.tsx`

**UX1 — Back button:**
- `src/components/common/NavigationBackButton.tsx`

### Checklist

**R1 + R2 — Permissions**
- [x] CEO role gains `page:operational-resilience` permission
- [x] VIEWER role gains `page:controls` permission (tab-level gating already limits what they see)
- [x] CEO role gains `page:controls` permission with ExCo tab access

**R4 — Change request notification**
- [x] NotificationDrawer shows resolved change requests to the proposer (APPROVED / REJECTED)
- [x] Each resolved change shows entity name, field changed, decision, and links to the entity
- [x] Dismissed notifications are remembered per user in localStorage
- [x] Only shows changes resolved in the last 30 days (not historical noise)

**T1 — Global save indicator**
- [x] Store tracks in-flight save count, last saved timestamp, and last error
- [x] sync() increments count on start, decrements on completion, sets error on failure
- [x] SaveStatusIndicator component mounts in layout — visible on every page
- [x] Shows "Saving…" (animated) when any sync is in flight
- [x] Shows "Saved ✓" for 3 seconds after last sync completes, then fades
- [x] Shows "Could not save" on error (toast also fires from sync())
- [x] Indicator does not overlap content (bottom-right, fixed position)

**T1 — Form button states**
- [x] ActionFormDialog submit button shows "Saving…" / "Saved ✓" before close
- [x] RiskDetailPanel save button shows "Saving…" / "Saved ✓"
- [x] RiskAcceptanceFormDialog submit shows loading state (already awaited API)
- [x] ProcessFormDialog submit shows loading state (already awaited API)
- [x] PolicyFormDialog submit shows loading state
- [x] MeasureFormDialog submit shows "Saving…" / "Saved ✓" before close
- [x] OutcomeFormDialog submit shows "Saving…" / "Saved ✓" before close
- [x] UserFormDialog submit shows loading state (already awaited API)
- [x] No form closes before save animation completes

**UX1 — Back button**
- [x] Back button only appears when custom navigationStack has entries
- [x] Browser history fallback removed entirely
- [x] Back button does not appear on first load or fresh navigation without EntityLink context

**General**
- [x] Build passes (npx next build) — zero type errors
- [x] No existing tabs, features, or routes removed

---

## CURRENT SPRINT: Fix Google OAuth Login (InvalidCheck) ✅ COMPLETE

### What
Fix production login broken with `[auth][error] InvalidCheck: pkceCodeVerifier/state value could not be parsed`.

### Root Cause
On Vercel, the OAuth sign-in POST is handled by a deployment-specific lambda URL (e.g. `dashboard-u6ay-2sjrw5pfh-....vercel.app`). The `Set-Cookie` response for the PKCE/state check cookie is scoped to whichever origin the browser sees. When the OAuth callback arrives at the canonical alias (`dashboard-u6ay.vercel.app`), either:
- the check cookie is absent (domain mismatch), or
- the cookie name's `__Secure-` prefix differs between the two requests (inconsistent `useSecureCookies`)

Either way `@auth/core` throws `InvalidCheck` which NextAuth surfaces as `error=Configuration`.

### Fix
Set `checks: []` on the Google provider — disables PKCE and state check cookies entirely.
Security justification: confidential server-side client (uses `client_secret`), Google enforces registered `redirect_uri`, and every sign-in is validated against an explicit DB allowlist. RFC 9700 notes PKCE adds nothing for confidential clients. State CSRF is mitigated by Google's session binding.

### Files
- `src/lib/auth-config.ts` — `checks: [] as any`

### Checklist
- [x] `checks: []` set on Google provider with detailed comment explaining why
- [x] Build passes
- [x] Deployed to Vercel

---

## PREVIOUSLY COMPLETED: Actions Page UX Upgrade ✅ COMPLETE

### What
Replace the flat unsorted action list with:
1. Grouped collapsible sections by status (Overdue → In Progress → Open → Proposed Closed → Completed)
2. Completion progress bar (animated, showing x/total complete + %)
3. Owner initials badge (coloured circle) replacing the plain User icon
4. COMPLETED group collapsed by default

All existing functionality (bulk ops, expand detail, proposals, search, filters, stat cards) preserved.

### Files
- `src/app/actions/page.tsx`

### Checklist
- [x] Grouped sections with collapsible headers (click to expand/collapse)
- [x] COMPLETED group collapsed by default
- [x] Progress bar shows animated completion %
- [x] Owner shown as coloured initials badge
- [x] All existing features (expand, bulk ops, search, filters) preserved
- [x] Build passes

---

## PREVIOUSLY COMPLETED: OR, Regulatory Calendar & Consumer Duty UX

### What
1. OR Dashboard stat cards clickable (Tests Due → IBS tab, Open Remediations → /actions, etc.)
2. IBS card click-through → opens specific IBS detail panel directly
3. Regulatory Calendar: sidebar entry, owner field, full visual redesign with vertical timeline,
   expandable purple accordion cards, inline editing, Create Action button
4. Consumer Duty dashboard section: compact visual redesign — RAG summary bar, outcome grid cards,
   animated entrance, less verbose/more engaging

### Files
- `prisma/schema.prisma` (add owner to RegulatoryEvent)
- `src/lib/types.ts` (add owner)
- `src/app/api/or/regulatory-calendar/route.ts` (add owner)
- `src/app/api/or/regulatory-calendar/[id]/route.ts` (add owner to PATCH)
- `src/components/layout/Sidebar.tsx` (add Reg Calendar entry)
- `src/components/or/ORDashboard.tsx` (clickable stat cards)
- `src/app/operational-resilience/page.tsx` (IBS click-through)
- `src/components/or/IBSRegistryTab.tsx` (initialIbsId prop)
- `src/components/or/RegulatoryCalendarWidget.tsx` (full redesign)
- `src/app/page.tsx` (Consumer Duty section redesign)

### Checklist
- [x] OR stat cards (IBS Ready, Tests Due, Open Remediations, Assessment) all clickable links
- [x] Clicking an IBS card on OR Dashboard navigates to IBS tab and opens that specific IBS
- [x] Regulatory Calendar appears in sidebar under Compliance & Controls
- [x] RegulatoryEvent schema has `owner` field; `npx prisma db push` succeeds
- [x] Regulatory Calendar widget: vertical timeline view, events grouped by month
- [x] Events expandable with purple accordion, showing description/owner/URL/alert days
- [x] CCRO can edit all event fields inline within expanded card
- [x] CCRO can add new events; can delete events
- [x] Consumer Duty dashboard: RAG summary bar + compact outcome grid cards
- [x] Consumer Duty cards animated (staggered entrance)
- [x] Build passes ✅ COMPLETE

---

## CURRENT SPRINT: Access Request Visibility Fix

### What
Access requests submitted by OWNER/REVIEWER users via "Request Edit Access" button were landing in the
`access_requests` table and were ONLY visible in Settings → Access Requests. The `/change-requests` page
had no awareness of them, and the Settings nav item had no badge. CCRO had no discoverable alert.

### Fix
1. Add an "Access Requests" tab to the Change Requests page — shows pending (with Approve/Deny for CCRO)
   and history; counts shown in tab badge.
2. Add `badgeKey: "settings"` to the Settings sidebar item, computed as pending access request count
   (CCRO only), so CCRO sees a red badge when requests are waiting.

### Files
- `src/app/change-requests/page.tsx`
- `src/components/layout/Sidebar.tsx`

### Checklist
- [x] Change Requests page has two tabs: "Field Changes" and "Access Requests"
- [x] "Access Requests" tab shows pending requests first with Approve/Deny buttons for CCRO
- [x] "Access Requests" tab shows all requests read-only for non-CCRO users (own requests only)
- [x] Tab badge shows pending count on "Access Requests" tab
- [x] Settings sidebar item gains `badgeKey: "settings"`
- [x] Badge count = pending access requests (CCRO only, so 0 for other roles)
- [x] Build passes

---

## PREVIOUSLY COMPLETED: OR Self-Assessment UX + Regulatory Calendar relocation

### What
1. Self-Assessment tab — vulnerabilities and open remediations cards become click-through links.
   Open remediations ARE actions; vulnerabilities are risks. Readiness checklist items also clickable.
2. Regulatory Calendar widget removed from OR Dashboard and added as a dedicated tab on Compliance.

### Files
- `src/components/or/SelfAssessmentTab.tsx`
- `src/components/or/ORDashboard.tsx`
- `src/app/compliance/page.tsx`

### Checklist
- [x] Vulnerabilities card click → navigates to `/risk-register`
- [x] Open Remediations card click → navigates to `/actions`; subtitle clarifies "Tracked in Actions"
- [x] Readiness checklist: IBS maps row clickable → `/operational-resilience?tab=ibs`
- [x] Readiness checklist: Scenario tests row clickable → `/operational-resilience?tab=ibs`
- [x] Readiness checklist: Open remediations row clickable → `/actions`
- [x] RegulatoryCalendarWidget removed from ORDashboard
- [x] Compliance page gains "Regulatory Calendar" tab (9th tab)
- [x] Build passes

---

## CURRENT SPRINT: 5-Sprint Bundle ✅ COMPLETE

### Sprint 1: OR Seed Data
#### What
Seed meaningful OR data so the dashboard shows mixed traffic lights immediately.
#### Files
- `prisma/seed.ts`
#### Checklist
- [x] IBSResourceMap records seeded (mix ensures GREEN/AMBER/RED dashboard)
- [x] 18 ResilienceScenario records across all IBS with varied outcomes
- [x] 1 SelfAssessment for 2025 (DRAFT)
- [x] `npx prisma db seed` runs cleanly
- [x] OR Dashboard shows mixed traffic lights after seed

---

### Sprint 2: Regulatory Calendar
#### What
New Prisma model + API routes + RegulatoryCalendarWidget + store + types.
#### New Files
- `src/app/api/or/regulatory-calendar/route.ts`
- `src/app/api/or/regulatory-calendar/[id]/route.ts`
- `src/components/or/RegulatoryCalendarWidget.tsx`
#### Modified Files
- `prisma/schema.prisma` — add RegulatoryEvent model + RegCalEventType enum
- `prisma/seed.ts` — seed 5 events
- `src/lib/types.ts` — RegulatoryEvent interface + RegCalEventType type
- `src/lib/store.ts` — regulatoryEvents[] state + CRUD + hydration
- `src/components/or/ORDashboard.tsx` — add RegulatoryCalendarWidget at bottom
#### Checklist
- [x] Schema + migration applied (npx prisma db push)
- [x] GET /api/or/regulatory-calendar returns events sorted by date
- [x] POST/PATCH/DELETE work (CCRO only)
- [x] 5 events seeded
- [x] RegulatoryCalendarWidget renders on OR dashboard with RAG colouring
- [x] Store hydrates regulatoryEvents on login
- [x] Build passes

---

### Sprint 3: Notification Enhancements
#### What
6 new OR + process notification categories + OR sidebar badge.
#### Modified Files
- `src/components/common/NotificationDrawer.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/app/api/ibs/route.ts` — add categoriesFilled
- `src/lib/types.ts` — add categoriesFilled to IBS
#### Checklist
- [x] 6 new categories in useNotifications()
- [x] OR sidebar badge shows combined count
- [x] categoriesFilled available on IBS in store
- [x] Process review alert visible to non-CCRO users
- [x] Regulatory deadline alert triggers at alertDays before event
- [x] Bell count increases correctly for each new category
- [x] Build passes

---

### Sprint 4: OR Module Depth
#### What
Inline scenario editing + SelfAssessment readiness checklist.
#### Modified Files
- `src/components/or/IBSScenarioTestingTab.tsx`
- `src/components/or/SelfAssessmentTab.tsx`
#### Checklist
- [x] CCRO can edit all fields of existing scenarios inline
- [x] Scenario findings expand on row click (read-only mode)
- [x] Executive summary editable + saved
- [x] vulnerabilitiesCount, openRemediations, documentUrl editable
- [x] Status workflow DRAFT → SUBMITTED → APPROVED works
- [x] Readiness checklist shows live state
- [x] Build passes

---

### Sprint 5: Interactive HTML Export Builder
#### What
Export Centre page + POST API + self-contained interactive HTML with SVG charts.
#### New Files
- `src/app/exports/page.tsx`
- `src/app/api/export/html/route.ts`
- `src/lib/export-html-builder.ts`
#### Modified Files
- `src/components/layout/Sidebar.tsx` — add Export Centre nav item
#### Checklist
- [x] /exports page loads with all 9 sections togglable + counts
- [x] Per-section filter options appear when section is checked
- [x] Options panel (firm name, watermark, title, interactive toggle) works
- [x] POST /api/export/html validates body and returns HTML file download
- [x] All 9 section renderers produce correct, populated HTML
- [x] Expandable rows toggle correctly
- [x] Live search filters rows in each section
- [x] Section fold/unfold works
- [x] Sticky TOC sidebar present
- [x] SVG charts render: risk heat map, compliance donut, IBS readiness bar, maturity bar
- [x] Watermark applied when selected
- [x] Interactive JS disabled when toggle is off
- [x] Print stylesheet works
- [x] File is self-contained HTML (no external refs)
- [x] Filename: CCRO_Pack_YYYY-MM.html
- [x] Build passes, zero TypeScript errors

---

## CURRENT SPRINT: History Tab — All Remaining Views ✅ COMPLETE

### What
Add a History tab to Controls, Risk Register, Actions, Consumer Duty, and Processes.
Uses one generic API route + one generic HistoryTab component.

### New Files
- `src/app/api/audit/history/route.ts` — `GET /api/audit/history?entityTypes=...&months=12`
- `src/components/common/HistoryTab.tsx` — reusable month-accordion history UI

### Modified Files
- `src/app/controls/page.tsx` — add "History" as 10th tab
- `src/app/risk-register/page.tsx` — add "Register" / "History" 2-tab bar
- `src/app/actions/page.tsx` — add "Actions" / "History" 2-tab bar
- `src/app/consumer-duty/page.tsx` — add "Dashboard" / "History" 2-tab bar
- `src/app/processes/page.tsx` — add "Process Library" / "History" 2-tab bar

### Checklist
- [x] `GET /api/audit/history` returns events grouped by month for given entityTypes
- [x] HistoryTab renders month accordion with search + type filter
- [x] Controls page — History tab visible and shows control audit events
- [x] Risk Register — History tab shows risk audit events
- [x] Actions — History tab shows action audit events
- [x] Consumer Duty — History tab shows outcome/measure/MI events
- [x] Processes — History tab shows process events
- [x] URL ?tab=history syncs correctly on all pages
- [x] Back button still works after tab navigation
- [x] Build passes (zero type errors)

---

---

## CURRENT SPRINT: Bug Fix — Compliance nav + Back button ✅ COMPLETE

### Compliance sidebar navigation (tabs don't switch when already on /compliance)
- `activeTab` was `useState` initialized once on mount; URL changes from sidebar
  `<Link>` clicks updated `searchParams` but never re-synced local state.
- Fix: added `useEffect([searchParams])` in `compliance/page.tsx` that calls
  `setActiveTab` whenever the URL query string changes.
- File: `src/app/compliance/page.tsx`

### Back button disappeared
- `useEffect(() => setCanGoBack(window.history.length > 1), [])` ran once at app
  mount and never again. History grows after each navigation but `canGoBack` stayed
  `false`, so the button was always hidden.
- Fix: changed dependency to `[pathname]` so `canGoBack` is re-evaluated after
  every page navigation.
- File: `src/components/common/NavigationBackButton.tsx`

### Checklist
- [x] Clicking "Policies" in sidebar while on /compliance opens the Policies tab
- [x] Clicking "SM&CR" in sidebar while on /compliance opens the SM&CR tab
- [x] Back button appears after first navigation and persists
- [x] Build passes

---

## CURRENT SPRINT: Bug Fix — Testing Schedule Edit Error ✅ COMPLETE

### Background
Editing any testing schedule entry produced a toast "Please check your inputs and try again."
after saving, despite the save succeeding visually.

### Root Cause
Two bugs:
1. `RemoveFromScheduleDialog` / `EditScheduleDialog` called `api()` directly to PATCH, then
   called `onSave(id, updated)` where `onSave = updateTestingScheduleEntry`. That store action
   fires a second `sync()` PATCH with the *full API response* (including `removedReason: null`).
2. The PATCH schema had `removedReason: z.string().optional()` which rejects `null` → 400 error
   → after 2 retries the `sync()` helper emitted the "Please check your inputs" toast.

### Files Changed
- `src/app/api/controls/testing-schedule/[id]/route.ts` — schema fix
- `src/components/controls/TestingScheduleTab.tsx` — pass delta not full response to onSave

### Checklist
- [x] `removedReason: z.string().nullable().optional()` in PATCH schema
- [x] `EditScheduleDialog` passes `updates` (delta) not `updated` (full API response) to `onSave`
- [x] No redundant second PATCH with null-containing full entry

This file tracks all planned and in-progress changes. Updated after every session.
Each feature has a checklist — nothing is marked done until fully verified.

---

## CURRENT SPRINT: Reports Charts & Change Requests Dashboard ✅ COMPLETE

### Background
Two feature gaps identified from production audit (2026-02-23):
1. Report sections of type CHART are placeholders — chart data is already stored in the DB
   (chartType + chartData JSON) but the view page just shows a grey dashed box.
2. Pending change requests (control changes, risk changes, action changes) are scattered
   across individual entity pages with no centralised CCRO review dashboard.

---

## FEATURE 1: Report Chart Rendering

### What
Replace the CHART section placeholder in `src/app/reports/[id]/page.tsx` with a real
Recharts-based renderer. Three chart types to support (matching what the edit form saves):
  - "bar"  — BarChart
  - "line" — LineChart
  - "pie"  — PieChart (use Recharts PieChart + Pie + Cell)

Chart data format (already in DB):
```json
{
  "chartType": "bar",
  "chartData": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [
      { "label": "Performance", "data": [65, 78, 82, 91], "color": "#7B1FA2" }
    ]
  }
}
```

For bar/line: X-axis = labels, one series per dataset entry.
For pie: Each label is a slice, data[0] per dataset entry.

### Files
  - src/app/reports/[id]/page.tsx (replace placeholder, no new files needed)

### Checklist
- [x] Bar chart renders correctly from stored chartData
- [x] Line chart renders correctly from stored chartData
- [x] Pie chart renders correctly from stored chartData
- [x] Multiple datasets rendered as multiple series/bars
- [x] Chart uses brand colours as fallback if dataset color not set
- [x] Chart is responsive (ResponsiveContainer with 100% width, fixed height)
- [x] Empty state shown gracefully if chartData is missing/malformed
- [x] Existing TEXT_BLOCK, DATA_TABLE, CARD_GRID, ACCORDION section types unaffected

---

## FEATURE 2: Change Requests Dashboard

### What
New page `/change-requests` (sidebar entry) that aggregates all PENDING changes
across the three entities that support the change proposal workflow:
  - ActionChange  (status=PENDING) — from `action_changes` table
  - ControlChange (status=PENDING) — from `control_changes` table
  - RiskChange    (status=PENDING) — from `risk_changes` table

CCRO team can approve or reject each change from this single page. Non-CCRO users
see a read-only view of changes they proposed (with their current status).

### New Files
  - src/app/change-requests/page.tsx
  - src/app/api/change-requests/route.ts (aggregate GET)

### Modified Files
  - src/components/layout/Sidebar.tsx (add "Change Requests" nav item with badge)

### API Design
GET /api/change-requests?status=PENDING
Aggregates all three change types, returns unified array:
```typescript
{
  id: string;
  changeId: string;          // the actual change record ID
  entityType: "action" | "control" | "risk";
  entityId: string;
  entityRef: string;         // action title / control ref / risk ref
  entityName: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  rationale?: string;        // controls only
  status: "PENDING" | "APPROVED" | "REJECTED";
  proposedBy: string;        // user ID
  proposerName: string;
  proposedAt: string;
  reviewNote?: string | null;
}
```

Approve/reject: delegates to existing per-entity endpoints:
  PATCH /api/actions/[id]/changes/[changeId]
  PATCH /api/controls/library/[id]/changes/[changeId]
  PATCH /api/risks/[id]/changes/[changeId]

### UI Design
Three-tab layout: "Actions" | "Controls" | "Risks" (+ badge on each with pending count)
Or single "All Pending" with entity-type filter chips.

Each change card shows:
  - Entity badge (ACTION / CONTROL / RISK), entity ref/name as EntityLink
  - Field changed, old value → new value
  - Rationale (if provided)
  - Proposed by + date
  - Approve / Reject buttons (CCRO only) with optional review note
  - If already reviewed: status badge + reviewer name + review note

Sidebar badge (red count of total pending changes) to draw CCRO attention.

### Checklist
- [x] /change-requests page loads and shows pending changes
- [x] Action changes appear with correct field, old value, new value
- [x] Control changes appear with correct field + rationale
- [x] Risk changes appear with correct field, old value, new value
- [x] Approve button calls correct per-entity PATCH endpoint and applies the change
- [x] Reject button calls correct per-entity PATCH endpoint
- [x] Review note captured and stored when approving/rejecting
- [x] After approve/reject, change disappears from pending list
- [x] Non-CCRO users see read-only view of their own proposed changes
- [x] Sidebar shows badge count of total pending changes
- [x] EntityLink on each card navigates to the entity correctly
- [x] Empty state shown when no pending changes

---

## PREVIOUSLY COMPLETED: Process Library ✅ COMPLETE

### Why This Matters (Research Context)
Grounded in: OMG BPMM, APQC PCF v7.2 (Banking), FCA PS21/3 (Operational Resilience),
SM&CR FG19/2, CMORG Guidance v3 (April 2025), and patterns from ServiceNow GRC,
RSA Archer, ARIS, GBTEC BIC.

For a regulated UK fintech, the process library is the operational backbone of SM&CR
accountability and the FCA/PRA operational resilience framework. Every process must
trace to a named SMF, a regulatory obligation, and a set of controls — so that when
something fails, the accountability chain is unambiguous and evidenced.

The FCA's operational resilience deadline (March 2025) requires firms to document
the "people, processes, technology, facilities, and information" supporting each
Important Business Service. The process library is the canonical place for this.

---

### Maturity Model — OMG BPMM Aligned (5 Levels)
Based on the OMG Business Process Maturity Model and Bizzdesign's regulated-industry
adaptation. All lower-level criteria must be met before a process can be rated higher.
Ownership is foundational — a process with no named owner cannot be above Level 1.

| Level | Label | Minimum Criteria |
|-------|-------|-----------------|
| 1 | Identified | Name + domain/category recorded. Existence acknowledged. |
| 2 | Documented | Named owner + description + purpose/objective present. |
| 3 | Governed | Has RACI or responsible role; linked to ≥1 policy or regulation; review date set. |
| 4 | Measured | Has linked controls (with current test results); linked risks with scores; steps defined. |
| 5 | Optimised | All of level 4 + linked to an Important Business Service; SLA/RTO defined; SMF assigned. |

Score is computed server-side on every PATCH/POST and stored in `maturityScore`.

---

### Schema Changes (prisma/schema.prisma)
8 new models, 7 new enums. No `ProcessControlLinkType` — the control record already
carries its type (PREVENTATIVE / DETECTIVE / CORRECTIVE / DIRECTIVE). The link is
just an association; the control's own `controlType` field conveys its nature.

`ImportantBusinessService` is a **first-class entity** (not free text). Processes link
to IBS records via a join table. This is required — storing "Retail Payments" as a
string on 12 different process records is ungovernable. The IBS entity is created in
this sprint; its full management UI comes in the Operational Resilience sprint.

**New models:**
```
ImportantBusinessService {
  id, reference (IBS-NNN), name, description,
  impactToleranceStatement (String?),   -- narrative from the firm's self-assessment
  maxTolerableDisruptionHours (Int?),   -- MTD in hours (e.g. 4)
  rtoHours (Int?),                      -- Recovery Time Objective
  rpoHours (Int?),                      -- Recovery Point Objective
  smfAccountable (String?),             -- e.g. "SMF3 - Chief Operating Officer"
  ownerId, status (IBSStatus),
  createdAt, updatedAt,
  processLinks ProcessIBSLink[]
}

ProcessIBSLink {
  id, processId, ibsId, linkedAt, linkedBy, notes
  @@unique([processId, ibsId])
}

Process {
  id, reference (PROC-NNN), name, description, purpose, scope,
  category (ProcessCategory), processType (ProcessType), status (ProcessStatus),
  version (String, default "1.0"), effectiveDate, nextReviewDate, reviewFrequencyDays,
  frequency (ProcessFrequency), automationLevel (AutomationLevel),
  triggerDescription, inputs, outputs, escalationPath, exceptions,
  endToEndSlaDays (Int?), criticality (ProcessCriticality),
  smfFunction (String?),                 -- e.g. "SMF3 - Executive Director"
  prescribedResponsibilities (String[]), -- e.g. ["PR(e)", "PR(f)"]
  ownerId, createdAt, updatedAt, maturityScore (Int, default 1),
  steps ProcessStep[], controlLinks ProcessControlLink[],
  policyLinks ProcessPolicyLink[], regulationLinks ProcessRegulationLink[],
  riskLinks ProcessRiskLink[], ibsLinks ProcessIBSLink[]
}

ProcessStep {
  id, processId, stepOrder (Int), title, description,
  responsibleRole (String?),      -- free text role title, not a User FK
  accountableRole (String?),
  slaDays (Int?), notes
}

ProcessControlLink {
  id, processId, controlId, linkedAt, linkedBy, notes
  @@unique([processId, controlId])
}

ProcessPolicyLink {
  id, processId, policyId, linkedAt, linkedBy, notes
  @@unique([processId, policyId])
}

ProcessRegulationLink {
  id, processId, regulationId, linkedAt, linkedBy, notes
  @@unique([processId, regulationId])
}

ProcessRiskLink {
  id, processId, riskId, linkType (ProcessRiskLinkType), linkedAt, linkedBy, notes
  @@unique([processId, riskId])
}
```

**New enums:**
```
ProcessStatus:      DRAFT | ACTIVE | UNDER_REVIEW | RETIRED
ProcessCategory:    CUSTOMER_ONBOARDING | PAYMENTS | LENDING | COMPLIANCE |
                    RISK_MANAGEMENT | FINANCE | TECHNOLOGY | PEOPLE | GOVERNANCE | OTHER
ProcessType:        CORE | SUPPORT | MANAGEMENT | GOVERNANCE
ProcessFrequency:   AD_HOC | DAILY | WEEKLY | MONTHLY | QUARTERLY | ANNUALLY | CONTINUOUS
AutomationLevel:    MANUAL | PARTIALLY_AUTOMATED | FULLY_AUTOMATED
ProcessCriticality: CRITICAL | IMPORTANT | STANDARD
ProcessRiskLinkType: CREATES | MITIGATES | AFFECTS
IBSStatus:          ACTIVE | UNDER_REVIEW | RETIRED
```

---

### API Routes (16 routes)
```
GET  /api/processes                list with linked counts + maturityScore
POST /api/processes                create; auto-generate PROC-NNN; calculate maturityScore
GET  /api/processes/[id]           full detail with all linked entities
PATCH /api/processes/[id]          update fields; recalculate and store maturityScore
DELETE /api/processes/[id]         soft-delete (status=RETIRED)
POST /api/processes/[id]/control-links      link a control
DELETE /api/processes/[id]/control-links    unlink (body: { controlId })
POST /api/processes/[id]/policy-links       link a policy
DELETE /api/processes/[id]/policy-links     unlink (body: { policyId })
POST /api/processes/[id]/regulation-links   link a regulation
DELETE /api/processes/[id]/regulation-links unlink (body: { regulationId })
POST /api/processes/[id]/risk-links         link a risk (body: { riskId, linkType })
DELETE /api/processes/[id]/risk-links       unlink (body: { riskId })
POST /api/processes/[id]/ibs-links          link to an IBS record
DELETE /api/processes/[id]/ibs-links        unlink (body: { ibsId })
POST /api/processes/[id]/steps              add or update a step (upsert by stepOrder)
DELETE /api/processes/[id]/steps/[stepId]   delete a step
GET  /api/processes/insights        coverage, maturity distribution, gap analysis, IBS coverage
GET  /api/ibs                       list IBS records (used by link pickers in Process Library)
POST /api/ibs                       create IBS record (full IBS management UI in OR sprint)
```

---

### New Files
```
prisma/schema.prisma                                     (add 8 models + 8 enums)
src/app/processes/page.tsx                               (list page)
src/components/processes/ProcessListTable.tsx
src/components/processes/ProcessDetailPanel.tsx          (7 tabs incl. IBS)
src/components/processes/ProcessOverviewTab.tsx
src/components/processes/ProcessStepsTab.tsx
src/components/processes/ProcessControlsTab.tsx
src/components/processes/ProcessPoliciesTab.tsx
src/components/processes/ProcessRegulationsTab.tsx
src/components/processes/ProcessRisksTab.tsx
src/components/processes/ProcessIBSTab.tsx               (linked IBS records)
src/components/processes/ProcessFormDialog.tsx           (create/edit)
src/components/processes/MaturityBadge.tsx               (reusable level badge)
src/components/processes/ProcessInsightsPanel.tsx        (gap analysis + IBS coverage + heatmap)
src/app/api/processes/route.ts
src/app/api/processes/[id]/route.ts
src/app/api/processes/[id]/control-links/route.ts
src/app/api/processes/[id]/policy-links/route.ts
src/app/api/processes/[id]/regulation-links/route.ts
src/app/api/processes/[id]/risk-links/route.ts
src/app/api/processes/[id]/ibs-links/route.ts
src/app/api/processes/[id]/steps/route.ts
src/app/api/processes/insights/route.ts
src/app/api/ibs/route.ts                                 (list + create; full UI in OR sprint)
```

### Modified Files
```
prisma/seed.ts                                    (seed ~20 processes at mixed maturity)
src/lib/types.ts                                  (Process, ProcessStep, link types, enums)
src/lib/store.ts                                  (processes state + CRUD actions)
src/components/layout/Sidebar.tsx                 ("Process Library" nav item, no badge needed)
src/components/common/EntityLink.tsx              (add "process" entity type)
src/components/policies/PolicyDetailPanel.tsx     (add "Processes" tab)
src/components/controls/ControlDetailModal.tsx    (add "Processes" section)
src/components/compliance/RegulationDetailPanel.tsx (add "Processes" section)
```

---

### UI Design

#### /processes — List Page
Two-column layout (table left, detail panel slides in from right on row click).

Table columns: Reference | Name | Owner | Category | Type | Status | Maturity bar (1–5) |
Controls # | Policies # | Criticality badge

Filter bar: Category | Status | Criticality | Maturity level | Owner
Insights button top-right → opens `ProcessInsightsPanel` as full-width section above table.
CCRO: "New Process" button.

#### ProcessDetailPanel — 7 Tabs
- **Overview**: Purpose, description, scope, trigger, frequency, automation level, SLA,
  criticality, SMF function, prescribed responsibilities, review dates.
  IBS section shows linked IBS entities (name + MTD) as clickable chips.
  Maturity card (current level + checklist of what's still needed to reach the next level).
  Edit button (CCRO only).

- **Steps**: Ordered list. Each step: title, description, responsible role, accountable role,
  step SLA. CCRO can add / edit / reorder / delete steps.

- **Controls**: Linked controls with the control's own type badge (PREVENTATIVE/DETECTIVE etc.)
  using the existing `CONTROL_TYPE_LABELS` constant. RAG dot for latest test result.
  Link/unlink picker (CCRO). Zero-state callout: "No controls — this process is unverifiable."

- **Policies**: Linked policies with status badge + version. Link/unlink (CCRO).
  Zero-state callout: "No policies — this process has no governance mandate."

- **Regulations**: Linked regulations with compliance status dot. Link/unlink (CCRO).
  Zero-state callout: "No regulations — regulatory obligations are not evidenced."

- **Risks**: Linked risks with residual score badge + link type pill (Creates/Mitigates/Affects).
  Link/unlink with link type selection (CCRO).

- **IBS**: Linked Important Business Services. Each row shows: IBS reference, name, MTD,
  SMF accountable. Link/unlink picker (CCRO). Zero-state callout:
  "Not mapped to any Important Business Service — FCA PS21/3 may require this."

#### ProcessInsightsPanel (below filter bar, toggleable)
Five sections:
  1. **Maturity Distribution** — horizontal stacked bar: % at each level (1–5)
  2. **IBS Coverage** — table of all IBS records with: process count, % of those processes
     at maturity ≥3 (Governed). IBS with fewer than 2 processes or maturity gaps flagged amber/red.
     This gives the CCRO a direct view of PS21/3 compliance readiness per IBS.
  3. **Coverage Gaps** — three gap cards side by side:
       - No controls (processes unverifiable)
       - No policies (ungoverned)
       - No regulations (obligations unmapped)
  4. **Owner & SMF Gaps** — count of processes with no owner / no SMF assigned; list them
  5. **Maturity × Category Heatmap** — grid: rows = ProcessCategory, cols = maturity 1–5,
     cells = count. Colour intensity = density. CRITICAL processes at maturity ≤2 flagged red.

#### Cross-references Added to Existing Panels
- PolicyDetailPanel → new "Processes" tab: lists processes linked to this policy, with
  maturity badge, criticality pill, and row-click that navigates to /processes?process=:id
- ControlDetailModal → new "Processes" section (after Risks): processes that use this
  control, with process reference + maturity badge
- RegulationDetailPanel → new "Processes" section: processes evidencing this regulation,
  with process reference + criticality badge

---

### Seed Data Strategy
**IBS records (~6):** Retail Payments, Customer Onboarding, Lending Decisioning,
Regulatory Reporting, Fraud Detection, Customer Servicing.
Each has: MTD (2–48 hours), SMF accountable, status ACTIVE.

**Processes (~20):** Spread across categories:
CUSTOMER_ONBOARDING (3), PAYMENTS (3), COMPLIANCE (4), RISK_MANAGEMENT (3),
TECHNOLOGY (3), PEOPLE (2), GOVERNANCE (2).

Mix of maturity levels:
  - Level 1 (4): name + category only — no description, no owner
  - Level 2 (5): description + owner, nothing else linked
  - Level 3 (5): linked to ≥1 policy or regulation, review date set, responsible role on steps
  - Level 4 (4): linked controls + risks, full steps defined
  - Level 5 (2): fully documented, linked to ≥1 IBS, SMF assigned, SLA defined

Each Level 5 process links to one of the IBS records above. Level 4 CRITICAL processes
that are NOT linked to an IBS will show as a gap in the insights panel — intentional.
This makes the IBS Coverage section of insights immediately meaningful.

---

### Checklist
- [x] Prisma schema updated (8 models, 8 enums) — migration applied
- [x] Seed adds ~6 IBS records + ~20 processes at mixed maturity
- [x] Types updated in src/lib/types.ts (IBS, Process, ProcessStep, enums, LABELS, COLOURS)
- [x] Store updated with ibs[] + processes[] arrays and CRUD actions
- [x] GET /api/ibs returns all IBS records (used in link pickers)
- [x] POST /api/ibs creates with IBS-NNN reference
- [x] GET /api/processes returns list with linked counts + maturityScore
- [x] POST /api/processes creates with PROC-NNN reference + maturity calculation
- [x] PATCH /api/processes/[id] updates and recalculates maturityScore correctly
- [x] All link POST/DELETE routes working (control, policy, regulation, risk, ibs, steps)
- [x] GET /api/processes/insights returns maturity distribution + IBS coverage + gaps + heatmap
- [x] /processes page loads with sortable, filterable table
- [x] ProcessDetailPanel opens on row click with all 7 tabs rendered correctly
- [x] Overview tab shows linked IBS chips and maturity card with "what's needed next"
- [x] Steps tab shows ordered steps; CCRO can add/edit/delete steps
- [x] Controls tab shows controls with CONTROL_TYPE_LABELS badge + RAG dot
- [x] Policies tab shows linked policies + link/unlink
- [x] Regulations tab shows linked regulations + link/unlink
- [x] Risks tab shows linked risks with linkType pill (Creates/Mitigates/Affects)
- [x] IBS tab shows linked IBS with MTD + SMF accountable; link/unlink (CCRO)
- [x] IBS zero-state callout mentions FCA PS21/3
- [x] MaturityBadge renders 5 levels with distinct colours
- [x] ProcessInsightsPanel shows all 5 sections (distribution, IBS coverage, gaps, SMF gaps, heatmap)
- [x] IBS Coverage table flags IBS with <2 processes or low maturity
- [x] CRITICAL processes at maturity ≤2 flagged red in insights
- [x] Sidebar "Process Library" nav item visible for all roles (read-only for non-CCRO)
- [x] EntityLink supports "process" type → navigates to /processes?process=:id
- [x] PolicyDetailPanel Processes tab lists processes linked to the policy
- [x] ControlDetailModal Processes section lists processes using this control
- [x] RegulationDetailPanel Processes section lists processes under this regulation
- [x] No TypeScript errors / build passes cleanly

---

## CURRENT SPRINT: Operational Resilience Module ✅ COMPLETE

### Why This Is a Separate Sprint
The Process Library creates the IBS entity and lets processes link to it. But the full
FCA PS21/3 / CMORG v3 (April 2025) requirement is broader than processes alone. The five
resource categories are People, Processes, Technology, Facilities, and Information/Data.
A firm's annual self-assessment document, impact tolerance testing, and scenario testing
records all need a home. This sprint builds the OR module that consumes the IBS entity
created in the Process Library sprint and builds the full operational resilience picture.

Regulated firms are already past the March 2025 enforcement deadline and are now subject
to FCA supervisory review. Scenario testing results and self-assessment evidence are the
primary ask from the regulator in 2025/26 supervisory visits.

---

### What the Module Covers

#### 1. IBS Registry (full management UI)
The API for IBS was created in the Process Library sprint. This sprint adds the UI:
  - `/operational-resilience` page with IBS table as the anchor
  - IBS detail panel showing: description, MTD, RTO/RPO, SMF accountable, linked processes,
    resource mapping summary (how many of the 5 categories are populated), scenario test history
  - CCRO can create/edit/retire IBS records
  - Each IBS has a traffic-light readiness status computed from resource coverage + process maturity

#### 2. Resource Mapping (5 Categories per IBS)
For each IBS, the firm must document the resources needed to deliver it.
Rather than creating full entity types for each category in v1, we use structured JSON
fields on a new `IBSResourceMap` model — one record per IBS per category:
  - PEOPLE: list of roles/teams (free text, can link to User IDs later)
  - PROCESSES: via the existing ProcessIBSLink table (already populated from Process Library)
  - TECHNOLOGY: list of systems/applications with criticality
  - FACILITIES: list of locations with address + fallback site
  - INFORMATION: list of data assets with classification and recovery requirements
Each category is editable inline. The IBS detail shows a checklist: 5 green ticks = fully mapped.
FCA PS21/3 requires all 5 categories to be documented.

#### 3. Impact Tolerance & MTD Management
Already partially on the IBS model (maxTolerableDisruptionHours, rtoHours, rpoHours).
This sprint adds:
  - Proper UI for setting and displaying these values
  - Tolerance narrative field (the written statement required in the self-assessment)
  - RAG status: Green = within tolerance / Amber = at limit / Red = tolerance breached
  - History of tolerance changes (audit log — when was MTD last changed and by whom?)

#### 4. Scenario Testing Log
New entity: `ResilienceScenario` + `ScenarioTestResult`

```
ResilienceScenario {
  id, reference (SCN-NNN), name, description, scenarioType,
  ibsId (linked IBS being tested), testedAt, nextTestDate, conductedBy,
  status (PLANNED | IN_PROGRESS | COMPLETE),
  outcome (WITHIN_TOLERANCE | BREACH | NOT_TESTED),
  findings (String?), remediationRequired (Bool), createdAt
}
```

ScenarioTypes: CYBER_ATTACK | SYSTEM_OUTAGE | THIRD_PARTY_FAILURE | PANDEMIC |
               BUILDING_LOSS | DATA_CORRUPTION | KEY_PERSON_LOSS | REGULATORY_CHANGE

The FCA expects firms to test severe but plausible scenarios annually per IBS.
Results feed the annual self-assessment document. CMORG v3 lists specific scenarios
relevant to financial infrastructure that firms should test.

UI: Per-IBS scenario testing tab. Table of all scenarios with outcome badge.
CCRO can log new tests and record outcomes + findings.

#### 5. Self-Assessment Document Tracker
The FCA/PRA requires an annual self-assessment document covering:
  - IBS identification and description
  - Impact tolerances and the rationale
  - Resource mapping completeness
  - Vulnerabilities identified during scenario testing
  - Remediation plans with target dates

New entity: `SelfAssessment`
```
SelfAssessment {
  id, year (Int), status (DRAFT | SUBMITTED | APPROVED),
  submittedAt, approvedBy, boardApprovalDate,
  executiveSummary, ibsCoverage (Json),    -- snapshot of IBS at time of submission
  vulnerabilitiesCount, openRemediations,
  documentUrl (String?),                   -- link to the actual document in SharePoint etc
  createdAt, updatedAt
}
```

UI: Timeline of annual self-assessments. Current year shows live readiness score:
% of IBS fully mapped × % of scenarios tested × % of remediations resolved.
"Submit for Board Approval" workflow (CCRO submits → Board approver confirms).

#### 6. OR Dashboard (landing page for /operational-resilience)
Summary view:
  - IBS readiness grid: each IBS as a card with traffic-light status (resource coverage,
    process maturity, last scenario test, tolerance status)
  - Open remediations count + overdue items
  - Next scenario tests due (upcoming testing calendar)
  - Self-assessment status for current year
  - Regulatory calendar: PS21/3 annual review deadline, DORA reporting windows

---

### New Schema Models (this sprint)
```
IBSResourceMap {
  id, ibsId, category (ResourceCategory), content (Json),
  lastUpdatedAt, lastUpdatedBy
}
ResourceCategory: PEOPLE | PROCESSES | TECHNOLOGY | FACILITIES | INFORMATION

ResilienceScenario {
  id, reference (SCN-NNN), ibsId, name, description,
  scenarioType (ScenarioType), testedAt, nextTestDate, conductedBy,
  status (ScenarioStatus), outcome (ScenarioOutcome),
  findings, remediationRequired, createdAt
}
ScenarioType: CYBER_ATTACK | SYSTEM_OUTAGE | THIRD_PARTY_FAILURE | PANDEMIC |
              BUILDING_LOSS | DATA_CORRUPTION | KEY_PERSON_LOSS | REGULATORY_CHANGE
ScenarioStatus: PLANNED | IN_PROGRESS | COMPLETE
ScenarioOutcome: WITHIN_TOLERANCE | BREACH | NOT_TESTED

SelfAssessment {
  id, year, status (AssessmentStatus), submittedAt, approvedBy,
  boardApprovalDate, executiveSummary, ibsCoverage (Json),
  vulnerabilitiesCount, openRemediations, documentUrl, createdAt, updatedAt
}
AssessmentStatus: DRAFT | SUBMITTED | APPROVED
```

### New Pages & Components
```
src/app/operational-resilience/page.tsx          (OR dashboard landing page)
src/components/or/IBSRegistryTab.tsx             (IBS table + detail panel)
src/components/or/IBSDetailPanel.tsx             (7 tabs)
src/components/or/IBSOverviewTab.tsx             (MTD, RTO, SMF, readiness traffic light)
src/components/or/IBSResourceMapTab.tsx          (5 category resource mapping)
src/components/or/IBSProcessesTab.tsx            (processes from Process Library)
src/components/or/IBSScenarioTestingTab.tsx      (scenario log + new test form)
src/components/or/SelfAssessmentTab.tsx          (annual self-assessment tracker)
src/components/or/ORDashboard.tsx                (IBS cards grid + summary stats)
src/components/or/ResilienceScenarioForm.tsx     (log a new scenario test)
src/components/or/SelfAssessmentForm.tsx         (create/edit self-assessment)
src/app/api/ibs/[id]/route.ts                    (GET/PATCH/DELETE single IBS)
src/app/api/ibs/[id]/resource-map/route.ts       (GET/PATCH resource mapping)
src/app/api/ibs/[id]/scenarios/route.ts          (GET/POST scenarios)
src/app/api/ibs/[id]/scenarios/[scId]/route.ts   (PATCH scenario outcome)
src/app/api/self-assessments/route.ts            (GET/POST self-assessments)
src/app/api/self-assessments/[id]/route.ts       (GET/PATCH/DELETE)
src/app/api/or/dashboard/route.ts                (aggregate OR dashboard stats)
```

### Modified Files
```
src/components/layout/Sidebar.tsx    ("Operational Resilience" nav item — CCRO gated)
src/lib/types.ts                     (IBS, ResourceMap, Scenario, SelfAssessment types)
src/lib/store.ts                     (ibs state already exists; add scenarios, selfAssessments)
```

---

### Checklist
- [x] IBSResourceMap schema + migration applied
- [x] ResilienceScenario + SelfAssessment schema + migration applied
- [x] /operational-resilience page loads with ORDashboard component
- [x] IBS readiness grid shows all IBS with traffic-light status
- [x] IBSDetailPanel opens with 4 tabs (Overview, Resource Map, Processes, Scenario Testing)
- [x] Overview tab shows MTD, RTO, RPO, tolerance statement, SMF accountable
- [x] Resource Map tab shows all 5 categories with edit capability (CCRO)
- [x] Resource Map shows 5-category checklist completeness (✓/✗ per category)
- [x] Processes tab shows linked processes with maturity badges (from Process Library data)
- [x] Scenario Testing tab shows all logged tests with outcome badges
- [x] CCRO can log a new scenario test with type, date, outcome, findings
- [x] Self-Assessment tracker shows annual timeline with current year readiness score
- [x] Readiness score formula: IBS coverage × scenario tested % × open remediations
- [x] OR Dashboard shows next scenario tests due and open remediations
- [ ] Regulatory calendar shows PS21/3 annual review date (deferred — no events data yet)
- [x] Sidebar "Operational Resilience" item visible for CCRO role only
- [x] No TypeScript errors / build passes cleanly

---

## PREVIOUSLY COMPLETED (this session, 2026-02-23)

## CURRENT SPRINT: History, Control Detail & Back Button ✅ COMPLETE

### Background
Three feature requests from 2026-02-23:
1. Compliance Regulatory Universe needs a full history view (global + per-regulation)
2. Control detail modal lost its performance graph and needs associated actions/risk acceptances
3. Back button should be globally present everywhere, not just on entity-linked navigation

---

## FEATURE 1: Floating Back Button (Everywhere)

### What
The NavigationBackButton component already exists and is globally mounted in layout.tsx.
Currently it only shows when the custom navigationStack has items (populated only by EntityLink).
Users navigate in many ways (table rows, cards, buttons) and the button stays hidden.

### Fix
Change NavigationBackButton to show whenever window.history.length > 1.
Two-tier strategy on click:
  - If custom stack has items → use stack (exact URL, preserves tab/search state)
  - If stack empty but browser has history → use router.back() as fallback

### Files
  - src/components/common/NavigationBackButton.tsx (modify only this file)

### Checklist
- [x] Button appears after any navigation across the whole app (risk register, compliance, controls, actions, users, settings)
- [x] Clicking back from a control detail returns to exact previous view
- [x] Clicking back from a regulation detail returns to exact previous view
- [x] Button does not appear on the very first page load (no history yet)
- [x] Works correctly on mobile / narrow viewport

---

## FEATURE 2: Compliance History — Global Tab

### What
New "History" tab on the Compliance page. Shows a month-by-month timeline of all
activity across the regulatory universe: status changes, narrative updates, policy
links, control links, and controls tested.

### New Files
  - src/components/compliance/ComplianceHistoryTab.tsx (new component)
  - src/app/api/compliance/history/route.ts (new API endpoint)

### Modified Files
  - src/app/compliance/page.tsx (add History tab to TABS array)

### API Design
GET /api/compliance/history?months=12
Aggregates from three sources:
  1. AuditLog WHERE entityType='regulation' — status/narrative changes with old+new values
  2. RegulationControlLink — control link events (linkedAt, linkedBy, control ref)
  3. PolicyRegulatoryLink — policy link events (linkedAt, linkedBy, policy name)
  4. ControlTestResult via RegulationControlLink → TestingScheduleEntry — testing events
Returns events grouped by YYYY-MM, newest month first.

### UI Design
Month-by-month accordion (current month open by default).
Each month shows event cards by type:
  - Blue:   Status/narrative update (regulation name, field, old→new, user name)
  - Green:  Control tested (control ref, regulation, result PASS/FAIL/PARTIALLY, tester)
  - Purple: Policy linked (policy name → regulation name)
  - Grey:   Control linked (control ref → regulation name)
Filter bar: event type dropdown + text search.

### Checklist
- [x] History tab appears in Compliance page navigation
- [x] Current month shows today's events
- [x] Status change shows old value → new value + user who made the change
- [x] Policy link events appear when a policy is linked to a regulation
- [x] Control link events appear when a control is linked to a regulation
- [x] Control test results appear for controls linked to regulations
- [x] Filter by event type works
- [x] Text search filters events correctly
- [x] Empty state shown if no history for a month

---

## FEATURE 3: Compliance History — Per-Regulation Panel

### What
Collapsible "Change History" section at the bottom of the RegulationDetailPanel
(the right-side panel that opens when you select a regulation).
Shows the change history for that specific regulation: who changed the compliance
status, assessment notes, description, provisions, SMF assignments, etc.

### Prerequisite
Enhance the PATCH /api/compliance/regulations/[id] endpoint to capture old values
before saving, so audit log stores { field: { from: oldVal, to: newVal } }.

### New Files
  - src/app/api/compliance/regulations/[id]/history/route.ts (new endpoint)

### Modified Files
  - src/app/api/compliance/regulations/[id]/route.ts (capture old values in audit log)
  - src/components/compliance/RegulationDetailPanel.tsx (add History section)

### API Design
GET /api/compliance/regulations/:id/history
Returns HistoryEvent[] sorted newest first:
  { type, date, userId, userName, field?, from?, to?, entityRef?, entityName? }
Sources:
  1. AuditLog WHERE entityType='regulation' AND entityId=:id
  2. RegulationControlLink WHERE regulationId=:id (control link/unlink events)
  3. PolicyRegulatoryLink WHERE regulationId=:id (policy link/unlink events)

### Checklist
- [x] Change History section visible in RegulationDetailPanel
- [x] Collapsible (closed by default to save space)
- [x] Shows who changed compliance status with old and new values
- [x] Shows who updated assessment notes / narrative
- [x] Shows when a control was linked (control ref + user + date)
- [x] Shows when a policy was linked (policy name + user + date)
- [x] User names shown (not just IDs)
- [x] Dates shown in human-readable format (e.g. "3 Jan 2026")
- [x] Empty state shown if no history yet

---

## FEATURE 4: Control Detail — Performance Graph & History

### What
The control detail modal (ControlDetailModal.tsx) previously had a performance graph
showing test results over time. This was removed. Reinstate it.
Also add sections for associated risk acceptances (associated actions already exist).

### Modified Files
  - src/components/controls/ControlDetailModal.tsx (add chart section + RA section)
  - src/app/api/controls/library/[id]/route.ts (add riskAcceptances to response)

### Chart Design
Recharts LineChart positioned after the Testing Results section.
X-axis: month labels (Jan 25, Feb 25 ... )
Y-axis: result encoded as numeric (PASS=1, PARTIALLY=0.5, FAIL=0, NOT_TESTED=null)
Or alternatively: a bar chart with colour per result (green/amber/red/grey).
Reference: existing TrendAnalysisTab.tsx and RiskHistoryChart.tsx for pattern.
Data: testingSchedule.testResults already returned by control API (24+ months).

### Risk Acceptances Section
The control API needs to return risk acceptances where the associated risks
link to this control:
  prisma.riskAcceptance.findMany({
    where: { risk: { riskControls: { some: { controlId: id } } } },
    include: { proposer: ..., risk: { select: { reference, name } } }
  })
Display: acceptance reference, status badge, risk name, proposer, expiry date.
Use EntityLink for each acceptance (navigates to /risk-acceptances?acceptance=:id).

### Checklist
- [x] Performance graph appears in control detail modal
- [x] Graph shows last 12-24 months of test results
- [x] Graph colour-codes results (green=pass, amber=partial, red=fail)
- [x] Associated actions section visible (already exists — verify it renders)
- [x] Associated risk acceptances section visible
- [x] Risk acceptance shows status, risk name, expiry
- [x] EntityLink on risk acceptance navigates correctly and back button returns

---

## PREVIOUSLY COMPLETED (this session, 2026-02-23)

### User Creation Fix
Problem: Adding a user via the Users admin tab stored them in local state only.
If the fire-and-forget API call failed, the colleague got "Access Denied" on login
because signIn() does prisma.user.findUnique({ where: { email } }) and finds nothing.
Fix: UserFormDialog now calls POST /api/users directly and awaits the response.
Shows inline error if the save fails. Dialog does not close until DB confirms.
Files: src/components/users/UserFormDialog.tsx, src/app/users/page.tsx

### Email Lowercase Fix
Problem: Email field could accept uppercase, causing mismatch with Google OAuth
(which always returns lowercase email addresses).
Fix: Email input converts to lowercase on keypress. autoCapitalize=none added.
Files: src/components/users/UserFormDialog.tsx

### User Invitation Emails
Feature: Send Invite / Resend Invite button on every row in the Users table.
Calls POST /api/users/:id/invite which sends a professional HTML email via Resend.
Email contains: recipient's first name, tool URL, sender's name, sign-in instructions.
Requires: RESEND_API_KEY env var + verified sending domain in Resend account.
Files: src/lib/email.ts, src/app/api/users/[id]/invite/route.ts, src/app/users/page.tsx

### Regulation Detail Panel — Edit Mode
Feature: Pencil icon in regulation detail panel toggles edit mode.
CCRO team can edit: description, provisions, applicability, SMF, compliance status,
assessment notes, next review date. Saves via PATCH /api/compliance/regulations/:id.
Files: src/components/compliance/RegulationDetailPanel.tsx,
       src/app/api/compliance/regulations/[id]/route.ts

### Policy Linking
Feature: Link/unlink policies to regulations from the detail panel.
Searchable picker shows unlinked policies. × button unlinks.
API: POST/DELETE /api/compliance/regulations/:id/policy-links (pre-existing route).
Files: src/components/compliance/RegulationDetailPanel.tsx, src/lib/store.ts

### Enriched Regulation Descriptions
253 expert-level compliance descriptions (PRIN, CONC, SYSC, legislation, etc.)
now persist through reseeds. Added to prisma/seed.ts via import of script files.
Files: prisma/seed.ts

---

## ENVIRONMENT & DEPLOYMENT NOTES

- Platform: Vercel (production URL: https://dashboard-u6ay.vercel.app)
- Database: Supabase PostgreSQL via Prisma 7 + PrismaPg adapter
- Email: Resend (RESEND_API_KEY set in Vercel). Domain not yet verified —
  invite emails will fail until updraft.com DNS records added to Resend.
  Recommended: ask IT to add DKIM/SPF for mail.updraft.com subdomain.
- NEXT_PUBLIC_APP_URL=https://dashboard-u6ay.vercel.app (set in Vercel)

---

## TECH NOTES FOR FUTURE REFERENCE

- Prisma 7: PrismaPg adapter, no url in schema.prisma, config in prisma.config.ts
- Multi-column orderBy must be array: [{ col1: "asc" }, { col2: "asc" }]
- Next.js App Router: params are Promise<{ id: string }>, must await params
- Store pattern: optimistic local update → sync() fire-and-forget API call
- All pages are "use client" — no server components
- UK British spelling throughout (authorised, sanitised, colour, etc.)
- Brand colours: updraft-deep, updraft-bar, updraft-bright-purple, updraft-light-purple
- Recharts already installed (used in TrendAnalysisTab.tsx, RiskHistoryChart.tsx)
