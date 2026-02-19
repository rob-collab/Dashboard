# Comprehensive Audit Report — CCRO Dashboard

**Date:** 18 February 2026
**Scope:** Full application audit — code quality, data integrity, security, UX, feature consistency, database

---

## Executive Summary

The CCRO Dashboard is architecturally sound with a well-designed Prisma schema (8.1/10), comprehensive seed data, and a consistent UI pattern library. However, six audit streams have uncovered **3 critical**, **8 high**, and **12 medium** issues that need attention before the platform can be considered production-ready for executive reliance.

The most urgent findings are:

1. **Data loss risk** — Risk Acceptances and Controls store mutations have no API sync (local-only, lost on refresh)
2. **Race conditions** — Reference number generation (R###, ACT-###, RA-###, etc.) across 6 endpoints can produce duplicates under concurrent use
3. **Inconsistent auth** — Several mutation endpoints lack authentication checks entirely

---

## Part 1: Critical Findings (Fix Immediately)

### C1. Missing `sync()` Calls — Data Loss Risk

**Severity:** CRITICAL | **Affected:** Risk Acceptances, Controls

The Zustand store uses an optimistic update + fire-and-forget `sync()` pattern. However, 7 store methods are missing `sync()` calls entirely — mutations are local-only and **lost on page refresh**.

| Store Method | Entity | Has sync()? |
|---|---|---|
| `addRiskAcceptance()` | Risk Acceptance | NO |
| `updateRiskAcceptance()` | Risk Acceptance | NO |
| `deleteRiskAcceptance()` | Risk Acceptance | NO |
| `addControl()` | Control | NO |
| `updateControl()` | Control | NO |
| `addTestingScheduleEntries()` | Testing Schedule | NO |
| `updateTestingScheduleEntry()` | Testing Schedule | NO |

**Impact:** Any risk acceptance or control created/edited via the store is silently discarded on refresh. Currently mitigated because most components call the API directly and update the store afterwards — but the store methods exist and could be called by future code.

**Fix:** Add `sync()` calls to all 7 methods in `src/lib/store.ts`, mirroring the pattern used by actions/risks/policies.

---

### C2. Race Condition in Reference Generation

**Severity:** CRITICAL | **Affected:** 6 API endpoints

All reference numbers (R###, ACT-###, RA-###, POL-###, CTRL-###, REG-###) are generated via a non-atomic read-then-write pattern:

```typescript
const last = await prisma.risk.findFirst({ orderBy: { reference: "desc" } });
const nextNum = last ? parseInt(last.reference.replace("R", ""), 10) + 1 : 1;
```

Two concurrent POST requests can read the same `last` record and generate **duplicate references**.

**Affected endpoints:**
- `POST /api/risks` — R###
- `POST /api/actions` — ACT-###
- `POST /api/risk-acceptances` — RA-###
- `POST /api/policies` — POL-###
- `POST /api/controls/library` — CTRL-###
- `POST /api/regulations` — REG-###

**Fix:** Add `@@unique([reference])` constraints in Prisma schema, wrap reference generation in a database transaction with retry-on-conflict, or use a database sequence.

---

### C3. Missing Authentication on Mutation Endpoints

**Severity:** CRITICAL | **Affected:** Multiple endpoints

Several mutation endpoints accept POST/PATCH/DELETE without any authentication check:

| Endpoint | Method | Auth Check |
|---|---|---|
| `/api/users` | POST | None |
| `/api/users/[id]` | PATCH | None |
| `/api/reports/[id]` | PATCH | None |
| `/api/reports/[id]` | DELETE | None |
| `/api/settings` | PUT | None |
| `/api/risk-categories` | PUT | None |
| `/api/priority-definitions` | PUT | None |
| `/api/sections/[id]` | PATCH | None — passes raw `body` directly to Prisma |
| `/api/audit` | POST | None — anyone can write fake audit entries |

**Impact:** Any authenticated user can modify any report, create users, change site branding, and inject false audit log entries. Middleware JWT protects against anonymous access, but any logged-in user can perform these actions regardless of role.

**Fix:** Add `requireCCRORole()` or appropriate role checks to all mutation endpoints. The audit log POST should never accept client-supplied `userId`/`userRole` — these should be derived from the session server-side.

---

## Part 2: High-Severity Findings

### H1. Risk Acceptance Field Updates Bypass Auth

**File:** `src/app/api/risk-acceptances/[id]/route.ts`

Workflow transitions (SUBMIT_FOR_REVIEW, APPROVE, etc.) correctly check roles. However, field updates (title, description, rationale) in the same PATCH handler have **no authorisation checks** — any user can modify any acceptance's content.

**Fix:** Apply same role checks to field updates.

---

### H2. "View As" Feature Enables Privilege Escalation

The "View As" user switcher sends `X-User-Id` of the viewed user with every API request. A VIEWER who "views as" a CCRO_TEAM member can then make API calls as that CCRO user, including approving changes and managing templates.

**Fix:** Either restrict "View As" to CCRO users only, make it read-only (block mutations), or always use `X-Auth-User-Id` (the real logged-in user) for authorisation checks.

---

### H3. Audit Trail Integrity Compromised

Two issues undermine the audit trail:

1. **POST /api/audit accepts user-supplied userId/userRole** — anyone can create fake audit entries attributed to other users
2. **"View As" logs the impersonated user**, not the actual user — forensic investigation would show false attribution

**Fix:** Server-side audit logging should always derive userId from the JWT session, never from client headers.

---

### H4. Missing Serialisation on Risk Categories

`GET /api/risk-categories` and `PUT /api/risk-categories` return raw Prisma objects without `serialiseDates()`. Any Date fields will be JavaScript Date objects rather than ISO strings, potentially causing client-side parsing issues.

**Fix:** Wrap responses in `serialiseDates()`.

---

### H5. List vs Detail Include Mismatches

Several entity types return different relation data from list and detail endpoints:

| Entity | List includes | Detail also includes |
|---|---|---|
| Actions | assignee, creator, changes, linkedMitigation, control | + `report` |
| Risks | controls, mitigations, riskOwner, changes | + `auditTrail` |
| Controls Library | Conditionally includes testingSchedule | Always includes testResults, quarterlySummaries |
| Reports | Only `creator` | + sections, outcomes, versions |

**Impact:** Frontend code may expect relations that aren't present on list items, causing undefined access errors.

**Fix:** Standardise includes or document which data is available at each level.

---

### H6. Sections PATCH — No Validation

`PATCH /api/sections/[id]` passes the raw request body directly to Prisma without any Zod validation:

```typescript
data: body  // No schema, no field filtering
```

**Fix:** Add Zod schema validation.

---

### H7. Consumer Duty & Components — Missing Input Validation

- `POST /api/consumer-duty` uses inline field checks instead of Zod
- `POST /api/components` stores `htmlContent`, `cssContent`, `jsContent` without sanitisation (XSS risk if rendered)

**Fix:** Add Zod schemas. Sanitise HTML/CSS/JS before storage.

---

### H8. Missing Audit Logs on Multiple Operations

The following endpoints perform mutations without creating audit log entries:

- Control CRUD (create, update, delete)
- Template CRUD
- Component CRUD
- Section modifications
- Regulation CRUD
- Policy control-links and regulatory-links

**Fix:** Add audit logging to all mutation endpoints for compliance.

---

## Part 3: Medium-Severity Findings

### M1. Cross-Entity Cleanup on Deletion

When deleting entities in the store, related data isn't cleaned up:

- `deleteRisk()` doesn't remove linked risk acceptances from store
- `deleteUser()` doesn't clean up assigned actions, owned risks, etc. in store (API handles it, but store is stale)
- `deleteOutcome()` has no API sync and doesn't clean up nested measures

**Fix:** Add cross-entity cleanup to store mutations, or call `hydrate()` after complex deletions.

---

### M2. No Scroll-to-Top Button

Long pages (Dashboard, Actions, Risk Register, Policies) have no mechanism to return to the top. Users scrolling through large datasets must manually scroll back.

**Fix:** Add a floating scroll-to-top button that appears when scrolled past the first viewport.

---

### M3. Empty States Missing

- **Risk Register** — No message when risks array is empty
- **Controls page** — No empty state for main content
- **Risk Acceptances** — Minimal text-only empty state (no icon or helpful guidance)

**Fix:** Add consistent empty states with icon + heading + description across all entity pages.

---

### M4. Search Missing from Key Pages

- **Risk Register** — No full-text search (only category and direction filters)
- **Risk Acceptances** — No search capability
- **Controls** — No comprehensive search across the library

**Fix:** Add search inputs following the pattern used on Actions and Audit pages.

---

### M5. Export Incomplete

Only 2 of 5 major entities support CSV export:

| Entity | Export? |
|---|---|
| Actions | CSV + HTML |
| Risk Acceptances | CSV |
| Risks | None |
| Controls | None |
| Control Test Results | None |

**Fix:** Add export endpoints for risks and controls.

---

### M6. RiskChange Approval UI Missing

The CCRO dashboard's PendingChangesPanel shows and handles ActionChange and ControlChange approvals, but **RiskChange** items, while displayed, lack a clear dedicated approval panel matching the pattern of `ActionChangePanel` and `ControlChangePanel`.

**Fix:** Ensure RiskChange approval flow is fully functional in the PendingChangesPanel.

---

### M7. Report Publishing — No Ownership Check

`POST /api/reports/[id]/publish` checks for a userId but doesn't verify the user owns the report or is CCRO. Any logged-in user can publish any report.

**Fix:** Add ownership or CCRO role check.

---

### M8. Transaction Safety Gaps

- Risk creation auto-creates linked Actions **outside a transaction** — if action creation fails mid-loop, risk exists with partial mitigations
- Risk acceptance creation creates history record in a separate call after the main create — not atomic
- Mitigation updates in `PATCH /api/risks/[id]` delete then recreate outside transaction

**Fix:** Wrap multi-step operations in `prisma.$transaction()`.

---

### M9. Missing Database Indexes

The schema has 45 indexes but is missing:
- `Policy.status` — frequently filtered
- `ConsumerDutyOutcome.reportId`
- `Control(businessAreaId, isActive)` composite

**Fix:** Add these indexes and run `prisma db push`.

---

### M10. No Migration Baseline

No `/prisma/migrations/` directory exists. Schema changes are applied via `prisma db push` which can be destructive.

**Fix:** Run `npx prisma migrate dev --name init_schema` to capture a baseline migration.

---

### M11. linkedActionIds Never Populated

`RiskAcceptance.linkedActionIds` is a `String[]` field in the schema but no API endpoint or seed data ever populates it.

**Fix:** Either implement the linkage or remove the field.

---

### M12. Error Handling Visibility

Several pages silently catch API errors without user feedback:
- Risk register imports
- Consumer duty MI imports
- Controls tab data fetching

**Fix:** Show toast errors for all failed API calls.

---

## Part 4: UX Improvements (Executive User Perspective)

### What Would Frustrate an Executive User

1. **No click-through from dashboard risk cards to individual risks** — partially implemented via `?risk=` param but not all sections use it
2. **Owner names aren't clickable** — on Actions, Policies, Risk Register — should link to user context
3. **No breadcrumbs** in detail panels — user loses context of where they are
4. **No "back to list" button** in side panels
5. **Risk references not clickable** in table rows — should open detail panel
6. **Date formatting inconsistency** — some use `formatDate()` utility, others use inline `.toLocaleDateString()`
7. **No keyboard shortcuts** — no Escape to close panels, no hotkeys for common actions
8. **Consumer Duty measure IDs not clickable** for direct navigation

### Visual Enhancement Opportunities

1. **Consistent page header styles** — Some pages use gradient backgrounds (Policies, Consumer Duty), others plain. Standardise.
2. **Card elevation consistency** — All use `bento-card` class, but some cards have background gradients and others don't
3. **Risk heatmap on mobile** — 5x5 grid may be cramped on phone screens
4. **Action detail as side panel** — Actions use inline editing, unlike the side-panel pattern for Risks and Acceptances. Inconsistent.
5. **Control detail as side panel** — Currently a collapsed/expandable view, not matching the side-panel pattern

---

## Part 5: Prioritised Fix Plan

### Sprint 1 — Critical Fixes (Data Integrity)

| # | Task | Files | Effort |
|---|---|---|---|
| 1 | Add `sync()` to 7 store methods | `src/lib/store.ts` | Small |
| 2 | Add auth checks to 9 unprotected endpoints | 6 API route files | Medium |
| 3 | Add unique constraints on reference fields | `prisma/schema.prisma` + `prisma db push` | Small |
| 4 | Fix audit POST to derive userId from session | `src/app/api/audit/route.ts` | Small |
| 5 | Add Zod validation to sections PATCH | `src/app/api/sections/[id]/route.ts` | Small |

### Sprint 2 — High-Severity Fixes

| # | Task | Files | Effort |
|---|---|---|---|
| 6 | Fix Risk Acceptance field update auth | `src/app/api/risk-acceptances/[id]/route.ts` | Small |
| 7 | Add serialiseDates to risk-categories | `src/app/api/risk-categories/route.ts` | Small |
| 8 | Add Zod validation to consumer-duty + components | 2 API route files | Small |
| 9 | Add audit logging to Control/Template/Component/Regulation ops | 6 API route files | Medium |
| 10 | Standardise list vs detail includes | 4 API route files | Medium |
| 11 | Restrict "View As" mutations | `src/lib/api-client.ts` or `src/app/layout.tsx` | Medium |
| 12 | Wrap multi-step operations in transactions | 3 API route files | Medium |

### Sprint 3 — UX & Consistency

| # | Task | Files | Effort |
|---|---|---|---|
| 13 | Add scroll-to-top button | New component + `src/app/layout.tsx` | Small |
| 14 | Add empty states to Risk Register, Controls, Risk Acceptances | 3 page files | Small |
| 15 | Add search to Risk Register and Risk Acceptances | 2 page files | Medium |
| 16 | Add CSV export for Risks and Controls | 2 new API routes | Medium |
| 17 | Fix RiskChange approval UI | `src/app/page.tsx` | Small |
| 18 | Add missing database indexes | `prisma/schema.prisma` | Small |
| 19 | Create migration baseline | CLI command | Small |
| 20 | Standardise date formatting | Multiple pages | Small |

### Sprint 4 — Polish & Enhancement

| # | Task | Files | Effort |
|---|---|---|---|
| 21 | Make owner names and references clickable | 5 page files | Small |
| 22 | Add breadcrumbs to detail panels | 3 component files | Medium |
| 23 | Standardise page header gradients | Multiple pages | Small |
| 24 | Add error toasts to silent catch blocks | 4 page files | Small |
| 25 | Implement linkedActionIds or remove field | Schema + API | Small |

---

## Part 6: Current Status Summary

### What's Working Well

- **Architecture** — Clean separation: Prisma 7 + Zustand + Next.js App Router
- **Hydration** — Parallel fetch of all entities with graceful fallback
- **Design system** — Consistent colours, typography, card patterns, status badges
- **Workflow enforcement** — Risk Acceptance state machine is server-enforced
- **Seed data** — Comprehensive, realistic, no orphans (9.5/10)
- **Schema design** — Proper cascades, referential integrity, 45 indexes (8.1/10)
- **Action creation flow** — Consistent mandatory fields across all 4 entry points
- **Change proposal system** — ActionChange and ControlChange have full approve/reject UI

### What Needs Attention

- **Store sync gaps** — 7 methods with no API sync (data loss risk)
- **Auth gaps** — 9 endpoints with no authentication
- **Race conditions** — Reference generation in 6 endpoints
- **UX gaps** — No scroll-to-top, inconsistent empty states, missing search
- **Audit trail** — Can be spoofed via client-supplied headers
- **Export coverage** — Only 2 of 5 entities exportable

---

## Appendix: Files Audited

**API Routes (20 route files, 76 handlers):**
All files under `src/app/api/` — every GET, POST, PATCH, DELETE handler reviewed.

**Store:** `src/lib/store.ts` (650+ lines, 37 sync() calls audited)

**Pages:** All 14 page files under `src/app/` reviewed for UX patterns.

**Components:** All 89 component files under `src/components/` catalogued, key components reviewed in depth.

**Schema:** `prisma/schema.prisma` (1,034 lines), `prisma/seed.ts` (811 lines)

**Types:** `src/lib/types.ts` (836 lines — all types verified against Prisma models)
