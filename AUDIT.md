# CCRO Dashboard — Full Audit Report
Last updated: 2026-02-27
Audit conducted across: Sprints J and K (this session)
Prior context: 8 specialist agents ran across the full codebase before this session

---

## 1. Scope and Methodology

This audit covered the entire CCRO Dashboard codebase from a security, product-correctness,
UX, and technical-quality perspective. It was conducted in two phases:

**Phase 1 — Specialist agent sweep (8 agents, all parallel):**
- Security & API authorisation agent
- CCRO editability & data-saving completeness agent
- Many-to-many click-through gaps agent
- Navigation, back button, and animation agent
- UX completeness, accessibility, and performance agent
- Designer + UAT full-codebase pass
- Compliance domain completeness agent
- General product completeness and technical debt agent

**Phase 2 — Sprint J (Security Hardening) + Sprint K (Critical UX Fixes):**
Findings from Phase 1 were triaged and implemented across two focused sprints.

All agents read source code directly from the filesystem. No manual test execution
or browser testing was performed. Findings are code-level, not behaviour-tested.

---

## 2. What Was Reviewed

### 2.1 Security Layer
- All API route handlers (`src/app/api/**/*.ts`) — 20 route files
- Middleware (`src/middleware.ts`) — JWT validation, session expiry, header injection
- Dev bypass mechanism (`DEV_BYPASS_AUTH`)
- XSS exposure points (`dangerouslySetInnerHTML` usage)
- Audit logging coverage on compliance-critical mutations
- Permission endpoint access controls

### 2.2 Data Persistence Layer
- Zustand store (`src/lib/store.ts`) — save state, error state, hydration
- `SaveStatusIndicator` — background sync error visibility
- All API route PUT/PATCH/POST/DELETE handlers for entity mutations
- ControlDetailModal link/unlink/delete operations

### 2.3 UX / Product Correctness
- All bento/stat cards across all pages — whether they are interactive filters or cosmetic
- Action status colour system (OPEN/IN_PROGRESS/OVERDUE/COMPLETED/PROPOSED_CLOSED)
- Risk register bento card completeness (VERY_HIGH/HIGH vs MEDIUM/LOW)
- Controls Dashboard Tab — stat cards, filter wiring, filtered panel rendering
- Tailwind class validity (`transition-colours` → `transition-colors`)

### 2.4 Access Control
- `GET /api/permissions` — permission matrix visibility
- `GET /api/reports`, `/api/audit`, `/api/settings`, `/api/controls/library`,
  `/api/actions`, `/api/users/[id]`, `/api/permissions/users/[id]` — auth guards

---

## 3. Findings and What Was Changed

### 3.1 CRITICAL — Unauthenticated API Endpoints (Sprint J, J1)
**Severity:** Critical
**Status:** Fixed in commit d05d4e9

**Finding:** 8 GET endpoints returned sensitive compliance data without authentication:
- `GET /api/reports` — full report library (no auth)
- `GET /api/controls/library` — full controls library (no auth)
- `GET /api/audit` — full audit log including user actions (no auth)
- `GET /api/settings` — application settings (no auth)
- `GET /api/users/[id]` — individual user profile (IDOR: no auth, no ownership check)
- `GET /api/permissions/users/[id]` — user-specific permission overrides (no auth)
- `GET /api/actions` — full action list (no auth)

**Fix applied:** Each GET handler now calls `getUserId(request)` at the top and returns 401
if no valid session is present. For `/api/users/[id]`, `getAuthUserId()` (strict variant)
was used. Pattern: 2 lines per endpoint, consistent with the existing authenticated routes.

---

### 3.2 CRITICAL — XSS Vulnerability in Report Sections (Sprint J, J2)
**Severity:** Critical
**Status:** Fixed in commit d05d4e9

**Finding:** `TextBlock.tsx` and `AccordionSection.tsx` both used `dangerouslySetInnerHTML`
with raw user-supplied content, with no sanitisation. A user who can edit report content
could inject script tags that would execute in all sessions viewing that report.

**Fix applied:** `sanitizeHTML()` from `src/lib/sanitize.ts` (isomorphic-dompurify) applied
to all `dangerouslySetInnerHTML` calls in both components. This matches the existing pattern
in `SectionRenderer.tsx`. DOMPurify strips all script tags, event handlers, and `javascript:`
URLs before the HTML is set on the DOM.

---

### 3.3 HIGH — Dev Auth Bypass Not Gated Behind NODE_ENV (Sprint J, J3)
**Severity:** High
**Status:** Fixed in commit d05d4e9

**Finding:** `DEV_BYPASS_AUTH` check in `src/middleware.ts` and `src/app/api/auth/session/route.ts`
had no `NODE_ENV !== 'production'` guard. If `DEV_BYPASS_AUTH=true` was accidentally set in a
production environment (e.g. via an env var copy-paste from dev), all auth would be bypassed.

**Fix applied:** Both files now check `process.env.NODE_ENV !== "production"` before evaluating
`DEV_BYPASS_AUTH`. Note: uses `!== "production"` (not `=== "development"`) to preserve
bypass functionality in test/staging environments.

---

### 3.4 HIGH — Missing Audit Log on Permission Changes (Sprint J, J4)
**Severity:** High (compliance-critical)
**Status:** Fixed in commit d05d4e9

**Finding:** Changes to role-level permissions (`PUT /api/permissions`) and user-level
permission overrides (`PUT /api/permissions/users/[id]`) were not being logged to the audit
trail. These are the most compliance-sensitive mutations in the system.

**Fix applied:** `auditLog()` added to both PUT handlers after successful `Promise.all(ops)`:
- `action: "update_role_permissions"` on the role permissions route
- `action: "update_user_permissions"` on the user permissions route
Both include the full permissions delta in the `changes` field.

---

### 3.5 MEDIUM — Missing Security Response Headers (Sprint J, J5)
**Severity:** Medium
**Status:** Fixed in commit d05d4e9

**Finding:** Authenticated responses from the middleware had no security headers.

**Fix applied:** Added to every authenticated response in `src/middleware.ts`:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

### 3.6 MEDIUM — GET /api/permissions Returns Permission Matrix to All Users (Sprint K, K8)
**Severity:** Medium
**Status:** Fixed in commit ce1eacb

**Finding:** The GET handler for `/api/permissions` returned the full role+user permission
matrix to any authenticated user (including VIEWER role). While this does not allow changes,
knowing the full permission structure of all roles and all user overrides is information
that only CCRO should have access to.

**Fix applied:** GET handler now calls `requireCCRORole(request)` — returns 403 for any
non-CCRO authenticated user. Only the Settings → Permissions UI (which is already CCRO-only)
calls this endpoint.

---

### 3.7 MEDIUM — Non-Functional Tailwind Class (Sprint K, K1)
**Severity:** Medium (silent failure — hover transitions broken)
**Status:** Fixed in commit ce1eacb

**Finding:** `transition-colours` (British spelling) was used in 39 places across 5 files.
Tailwind uses American English class names; `transition-colours` does not exist and silently
does nothing. All hover transitions on those elements were broken with no error.

**Fix applied:** Mass replacement to `transition-colors` across:
- `ComponentsPanel.tsx` (8 occurrences)
- `BusinessAreaDrillDown.tsx` (2 occurrences)
- `ControlsLibraryTab.tsx` (13 occurrences)
- `QuarterlySummaryTab.tsx` (9 occurrences)
- `ImportComponentDialog.tsx` (7 occurrences)

---

### 3.8 MEDIUM — Controls Dashboard Stat Cards Were Non-Functional Filters (Sprint K, K2)
**Severity:** Medium (product rule violation)
**Status:** Fixed in commit ce1eacb

**Finding:** The 5 status stat cards in `ControlsDashboardTab.tsx` (Pass/Fail/Partial/Not
Tested/Total) had a `statusFilter` state that was correctly set on click (with active visual
styling), but was **never applied to any rendered data**. The "active" ring appeared, but
nothing in the view changed.

**Fix applied:**
- Added `filteredAttentionItems` memo — filters the "Attention Required" panel by statusFilter
- Added `filteredBusinessAreaData` memo — filters the "Business Areas" list to only show areas
  with at least one control matching the selected status
- "Tested (6 Months)" card now navigates to the Testing Schedule tab via new
  `onNavigateToSchedule` prop (wired in `controls/page.tsx`)

**Verified not broken:** Consumer Duty RAG cards were already fully wired. Compliance
Overview MetricTiles navigate to tabs (appropriate for a multi-section summary page).

---

### 3.9 LOW — Missing Error Toasts in ControlDetailModal (Sprint K, K3)
**Severity:** Low (UX gap)
**Status:** Fixed in commit ce1eacb

**Finding:** `handleLinkAction`, `handleUnlinkAction`, `handleDeleteAction`,
`handleApproveChange`, `handleRejectChange` in `ControlDetailModal.tsx` had `console.error`
calls in their catch blocks but no user-visible feedback. A CCRO who encounters a network
error while linking actions would see nothing happen.

**Fix applied:** Added `toast.error("Failed to ... — please try again.")` to all 5 catch
blocks. Added `toast` import from `sonner`.

---

### 3.10 LOW — OPEN and COMPLETED Actions Visually Identical (Sprint K, K5)
**Severity:** Low (UX confusion)
**Status:** Fixed in commit ce1eacb

**Finding:** `STATUS_CONFIG` in both `ActionDetailPanel.tsx` and `actions/page.tsx` assigned
identical blue styling to OPEN and COMPLETED. A CRO scanning the action list could not
distinguish open from completed at a glance.

**Fix applied:** COMPLETED status now uses `text-green-600 bg-green-100 text-green-700`.
OPEN remains blue. Updated in both files to maintain consistency.

---

### 3.11 LOW — MEDIUM and LOW Risk Cards Missing from Risk Register (Sprint K, K7)
**Severity:** Low (product completeness)
**Status:** Fixed in commit ce1eacb

**Finding:** The bento stat cards on the Risk Register showed VERY_HIGH (red) and HIGH
(orange) but had no MEDIUM or LOW cards. The filter logic already handled MEDIUM and LOW;
the cards simply were not in the `cards` array.

**Fix applied:** Added `mediumCount` and `lowCount` computed memos and added MEDIUM (amber)
and LOW (green) bento cards. Skeleton loading count updated 6 → 8.

---

### 3.12 NOT APPLICABLE — Dashboard URL State (Sprint K, K4)
**Status:** No action taken

**Original finding:** Dashboard has no URL state persistence; filter state lost on
back-navigation.

**Investigation result:** The dashboard has no in-page filter state. All bento card
interactions `router.push()` to other pages which already have URL state persistence.
The dashboard is a stateless overview by design. No filter state can be "lost" because
there is none. The audit finding was based on a false premise.

---

### 3.13 ALREADY IMPLEMENTED — Background Sync Error Visibility (Sprint K, K6)
**Status:** No action taken

**Original finding:** `_saveError` exists in store but is never rendered to the user.

**Investigation result:** `src/components/common/SaveStatusIndicator.tsx` already reads
`_saveError` from the store and renders a "Could not save" pill (red, WifiOff icon) in the
bottom-right when the error is non-null. This component is mounted in `layout.tsx`. The
audit agent missed this existing implementation.

---

## 4. False Positives and Near-Misses

The 8-agent sweep produced several findings that turned out to be non-issues:
- **K4 (Dashboard URL state):** Dashboard has no filter state to persist — correct by design
- **K6 (Save error visibility):** Already fully implemented in `SaveStatusIndicator`
- **Compliance Overview MetricTiles "not filtering":** These navigate to tabs, which is
  appropriate for a multi-section summary page

These are documented to prevent wasted re-audit effort in future sprints.

---

## 5. Remaining Outstanding Issues

The following issues are planned but not yet implemented. See `PLAN.md` for full details.

### Sprint L — Click-Through & Navigation (High priority)
- **L1:** Owner/assignee names are plain text throughout the app — should be clickable
  filters that set the owner filter on the respective page
- **L2:** Horizon Item links to risks and actions need verification as EntityLink
- **L3:** Consumer Duty measure references not navigable
- **L4:** Native `confirm()` still used in `actions/page.tsx` and others — should use
  `<ConfirmDialog>` (already built, just not used here)
- **L5:** ConsumerDutyMeasure.owner is a free-text string, not an FK to User — should
  align with every other entity that uses FK-based ownership
- **L6:** Detail panels (Risk, Action, Control, Process, Horizon) missing entrance animations
- **L7:** ConfirmDialog and NotificationDrawer missing focus traps and ARIA attributes

### Sprint M — Animation Consistency (Medium priority)
- **M1:** Reports and Audit pages have no AnimatedNumber on stat tiles
- **M2:** ScrollReveal (scroll-triggered entrance animations) only used on dashboard —
  should apply to all long-scroll pages
- **M3–M7:** Chart animation, stagger, tab fade consistency across pages

### Sprint N — Domain Completeness (Medium priority)
- **N1:** Reports section — no edit path for published report HTML content
- **N2:** Audit log — no date range or entity type filter
- **N3:** Regulatory Calendar — no bulk CSV export
- **N4:** SMCR — mandatory certification renewal reminder workflow not wired
- **N5:** Consumer Duty — metric snapshot creation UI missing (data exists, no input form)
- **N6:** RiskMitigation status changes not surfaced in the Risk detail panel
- **N7:** Email notification system — documented in PLAN but not implemented

### Sprint O — Technical Debt (Lower priority)
- **O1:** `src/app/page.tsx` is 2,418 lines — extract section components, target < 400
- **O2:** Dead Supabase dependency (`@supabase/supabase-js`) in package.json
- **O3:** Missing DB indexes on `approvalStatus`, `periodYear/periodMonth`
- **O4:** `DashboardNotification.type` is an unvalidated string — should be Prisma enum
- **O5:** `@types/uuid` redundant (uuid@13 ships own types)
- **O6:** `isomorphic-dompurify` on RC release, not stable
- **O7:** `setTimeout` not cleaned up in `CDRadialRing` and `ActionRequiredSection`
- **O8:** CSS keyframe animations not gated behind `prefers-reduced-motion`
- **O9:** No branded 404 page (`not-found.tsx`)
- **O10:** Hardcoded `#fff` hex values in `ScoreBadge`, `RiskHeatmap`, `RiskHistoryChart`
- **O11:** `ExportPanel.tsx` uses inline styles inconsistently with rest of codebase
- **O12:** `RiskHeatmap` risk circles not keyboard-accessible (no tabIndex/role/onKeyDown)

---

## 6. Architecture and Design Observations

### What is working well
- **Auth middleware pattern** is solid: JWT → X-Verified-User-Id header → `getUserId()` in
  all routes. Now that all 8 unauthenticated endpoints are fixed, the pattern is consistent
  across every route handler.
- **Store pattern** (optimistic + fire-and-forget sync with error state) is well-designed.
  `SaveStatusIndicator` is the right abstraction level for background sync feedback.
- **Prisma 7 adapter pattern** is correctly implemented throughout.
- **Permission system** (role + user-override + permissions.ts enum) is well-structured and
  consistent.
- **Consumer Duty page** has excellent filter state management including URL sync, RAG
  filtering across outcome and measure dimensions, and debounced URL write-back.
- **Risk Register** is the most complete page — URL state, all filter types, bento card
  filters, score mode toggle, pagination-free list, all working correctly.
- **Controls section** has the deepest feature set: testing schedule, quarterly summaries,
  attestations, change requests, watched controls, business area drill-down.

### What needs attention
- **page.tsx (dashboard) is 2,418 lines** — this is a maintainability risk. Breaking it into
  section components (Sprint O1) will reduce cognitive load on future sessions.
- **URL state coverage is incomplete** — Risk Register, Actions, Controls, Compliance,
  Consumer Duty all have URL state. Reports, Audit, Processes, SMCR do not.
- **Animation consistency** — ScrollReveal (scroll-triggered) only on dashboard.
  AnimatedNumber (count-up) missing on Reports and Audit pages. Creates an inconsistent
  premium feel across the product.
- **Mobile responsiveness** — the dashboard grid degrades to a stacked list on mobile (correct
  behaviour), but many detail panels were not audited at small breakpoints.

---

## 7. Recommendations (Priority Order)

1. **Implement Sprint L** — click-through navigation is the biggest usability gap remaining.
   User names as plain text throughout is significant friction for a compliance tool where
   "who owns this?" is a primary workflow question.

2. **Implement L4 first** (replace `confirm()` with ConfirmDialog) — 2–3 files, quick win,
   and improves accessibility immediately.

3. **Address O1** (split page.tsx) — before adding more dashboard sections, extract existing
   ones. At 2,418 lines, the file risks incomplete context reads in AI-assisted sessions.

4. **Address O7** (setTimeout cleanup) — minor memory leak in CDRadialRing and
   ActionRequiredSection; worth fixing before any external demo or production scale-up.

5. **Defer Sprints M and N** until Sprint L is complete — animation polish and domain
   completeness are important but the navigation/click-through gaps matter more to a
   working CRO user.

6. **Run Sprint O as a dedicated refactor sprint** — do not mix with feature work, as it
   touches package.json, Prisma schema, and large files with high merge conflict risk.

---

## 8. Build Status

Both sprints passed zero-error builds:

| Sprint | Build | Pages |
|--------|-------|-------|
| J (Security Hardening) | ✅ PASS | 92/92 |
| K (Critical UX Fixes)  | ✅ PASS | 92/92 |

---

## 9. Commit History (This Audit)

| Commit | Description | Files |
|--------|-------------|-------|
| `d05d4e9` | Sprint J: Security hardening — auth guards, XSS fixes, headers | 13 |
| `3d36bf5` | Sprint J: Post-review — W018 lesson, K8 added to plan | 2 |
| `ce1eacb` | Sprint K: Critical UX fixes — transitions, filter wiring, toasts, colours | 13 |

Total files changed across J+K: **26 files**
Net: 273 insertions, 131 deletions

---

*Audit conducted 2026-02-27 by Claude Sonnet 4.6 with 8 specialist sub-agents.*
*All findings are code-level. Browser behaviour testing not performed.*
*For the full sprint plan and outstanding work, see `PLAN.md`.*
