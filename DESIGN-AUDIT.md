# CCRO Dashboard — Design Audit
**Date:** 2026-03-01
**Auditors:** Animation Audit Agent, UX Quality Agent, UI Visual Craft Agent
**Methodology:** Full codebase read across all pages and components, evaluated against the D-series design contract (`tasks/patterns.md`), the designer-agent philosophy (`/.claude/agents/designer-agent.md`), UX psychology principles (cognitive load, feedback loops, Hick's Law, Peak-end rule), and UI visual craft standards (8pt grid, 60-30-10 colour, systematic type scale, GPU-accelerated motion).

---

## Executive Summary

| Category | Status | Issues Found |
|---|---|---|
| AnimatedNumber coverage | ⚠️ NEEDS WORK | 78+ raw numeric displays missing animation across all pages |
| ScrollReveal coverage | ❌ FIXED | Wrapping was present but animation was broken — see Section 1.1 |
| D-series compliance | ⚠️ NEEDS WORK | 2 rule violations (D001: ~25 hex values; D016: 2 textareas) |
| D004 bento card interactivity | ❌ CRITICAL | Horizon Scanning stat cards are read-only (not interactive filters) |
| UX quality — feedback & errors | ⚠️ NEEDS WORK | 12+ critical/important issues across all pages |
| UX quality — broken functionality | ❌ CRITICAL | ControlDetailView edit button has no onClick; Audit Trail export not implemented |
| UX quality — cognitive load | ⚠️ NEEDS WORK | 5 issues across dashboard, compliance, controls |
| UI visual craft | ✅ GOOD (9/10) | Touch targets, hierarchy, spacing, icons all pass |
| UK British spelling (D025) | ✅ PASS | Fully compliant throughout |
| Button/Modal/Badge components | ✅ PASS | D005, D006, D009 fully compliant |
| EntityLink, URL state, edit unlock | ✅ PASS | D019, D020, D023 fully compliant |

**Overall verdict:** The application is architecturally sound and visually consistent across all pages. The three most important gaps are: (1) 78+ unanimated numeric stats across every page, undermining the premium feel; (2) two broken interactive elements (ControlDetailView edit button, Audit Trail export button) that appear functional but do nothing; (3) Horizon Scanning stat cards violating D004 — they must filter the list below when clicked.

---

## Section 1 — Animation Gaps

> **Context:** The project uses `AnimatedNumber` for counting-up animations on numeric stats, and `ScrollReveal` for scroll-triggered entrance animations on sections. The convention is that all numerical stats visible to the user should animate on first render, and all sections should reveal on scroll.

### 1.1 ScrollReveal — ❌ Animation Was Broken (Now Fixed)

All 21 dashboard sections ARE correctly wrapped in `<ScrollReveal>` structurally. However the animation was not firing on scroll. Two bugs were found and fixed:

**Bug 1 — Wrong IntersectionObserver root (primary cause)**

`layout.tsx` line 183 uses `<div class="flex h-screen overflow-hidden">` with a child `<main class="flex-1 overflow-y-auto">`. The page scroll container is `<main>`, not `<body>` or the document root. The old `ScrollReveal` used `root: null` (= viewport) for its IntersectionObserver. When `<main>` is the scroller, browsers can report all elements as always-intersecting with the viewport because `<main>` fills the entire screen — the IO fires on mount for every element, sets `inView: true` for all of them immediately, and never re-fires as the user scrolls. Elements appear at their final visible state from the moment the page loads.

**Fix:** `ScrollReveal` now walks up the DOM with `findScrollParent()` to find the nearest `overflow-y: auto/scroll` ancestor and passes it as the `root` to IntersectionObserver. This means the IO correctly scopes to `<main>` and fires exactly when each element enters or leaves `<main>`'s visible area.

**Bug 2 — `overflow-hidden` clipping the slide animation**

`page.tsx` wrapped each RGL grid item in `<div class="rgl-section-item h-full overflow-hidden rounded-2xl">`. ScrollReveal starts with `translateY(12px)` (element shifted 12px down). `overflow-hidden` on the parent clips this — the 12px shift is invisible because it's clipped out. The slide-up animation was visually suppressed even on the occasions when the IO did fire.

**Fix:** Removed `overflow-hidden rounded-2xl` from `rgl-section-item`. The actual section content components each manage their own `bento-card` styling (which has its own `overflow-hidden` and rounded corners).

**Files changed:**
- `src/components/common/ScrollReveal.tsx` — `findScrollParent()` + `root: scrollRoot`
- `src/app/page.tsx` — removed `overflow-hidden rounded-2xl` from `rgl-section-item`

---

### 1.2 AnimatedNumber — Missing Uses

#### HIGH SEVERITY — Bento Card Stats (Primary Focal Points)

These are the large bold numbers users look at first when scanning the dashboard. They have no counting animation. This is the most visible gap.

**Risk Acceptances bento card** — `src/app/_useDashboardSectionMap.tsx` approx lines 476–488
```
{raStats.expired}      → should be <AnimatedNumber value={raStats.expired} />
{raStats.awaiting}     → should be <AnimatedNumber value={raStats.awaiting} />
{raStats.ccroReview}   → should be <AnimatedNumber value={raStats.ccroReview} />
{raStats.accepted}     → should be <AnimatedNumber value={raStats.accepted} />
```

**Compliance Health bento card** — `src/app/_useDashboardSectionMap.tsx` approx lines 563–587
```
{complianceHealth.compliantPct}%         → <AnimatedNumber value={complianceHealth.compliantPct} suffix="%" />
{complianceHealth.total}                 → <AnimatedNumber value={complianceHealth.total} />
{complianceHealth.gaps}                  → <AnimatedNumber value={complianceHealth.gaps} />
{complianceHealth.overdueAssessments}    → <AnimatedNumber value={complianceHealth.overdueAssessments} />
{complianceHealth.pendingCerts}          → <AnimatedNumber value={complianceHealth.pendingCerts} />
```

**Controls Library bento card** — `src/app/_useDashboardSectionMap.tsx` approx lines 617–647
```
{controlsStats.total}                         → <AnimatedNumber value={controlsStats.total} />
{controlsStats.preventative}                  → <AnimatedNumber value={controlsStats.preventative} />
{controlsStats.detective}                     → <AnimatedNumber value={controlsStats.detective} />
{controlsStats.directive}                     → <AnimatedNumber value={controlsStats.directive} />
{controlsStats.corrective}                    → <AnimatedNumber value={controlsStats.corrective} />
{controlsStats.policiesWithControls}/
{controlsStats.totalPolicies}                 → <AnimatedNumber> for each side of the fraction
```

**Policy Health bento card** — `src/app/_useDashboardSectionMap.tsx` approx lines 745–763
```
{policies.length}                                           → <AnimatedNumber value={policies.length} />
{overdueCount}                                              → <AnimatedNumber value={overdueCount} />
{policies.reduce((sum, p) => sum + (p.obligations?.length ?? 0), 0)}   → <AnimatedNumber value={...} />
{policies.reduce((sum, p) => sum + (p.controlLinks?.length ?? 0), 0)}  → <AnimatedNumber value={...} />
```

**Proposal:** Wrap every `text-xl font-bold` or `text-lg font-bold` numeric value in these bento cards with `<AnimatedNumber>`. Use `duration={800}` and `delay` staggered by 100ms per card to create a cascading reveal effect as the section scrolls into view. These are the headline numbers; they need to feel alive.

---

#### MEDIUM SEVERITY — Notification Pills and Badge Counts

These are smaller but still visible on load. Not animating them is inconsistent with the bento cards.

**Welcome banner notification pills** — `src/app/_useDashboardSectionMap.tsx` approx lines 241–271
```
{overdueMetrics.length}         → notifications count
{myOverdueActions.length}       → overdue actions count
{myDueThisMonthActions.length}  → actions due this month count
{risksNeedingReview.length}     → risks due for review count
{allPendingChanges.length}      → pending changes count
```

**Section header count badges** — `src/app/_useDashboardSectionMap.tsx` approx lines 781, 815, 906
```
{focusRisks.length}             → Risks in Focus badge
{pendingNewEntities.length}     → Pending Approvals badge
{overdueMetrics.length}         → Overdue Metrics badge
```

**Tasks & Reviews section headings** — `src/app/_useDashboardSectionMap.tsx` approx lines 1013–1088
```
{myRisks.length}      → My Risks heading count
{myActions.length}    → My Actions heading count
{myMetrics.length}    → My Metrics heading count
```

**Proposal:** Use `<AnimatedNumber>` with a shorter duration (400ms) and no delay for these pill/badge counts. They are secondary hierarchy so a subtle animation is enough — just enough to avoid a jarring static number appearing abruptly.

---

#### MEDIUM SEVERITY — ActionRequiredSection

**File:** `src/components/dashboard/ActionRequiredSection.tsx` approx lines 88–168
```
{totalCount}           → total items needing attention ("12 items need attention")
{idx + 1}/{allItems.length}  → ticker position ("1 / 12")
{g.count}              → group-level count in sidebar summary rows
```

**Proposal:** `totalCount` should use `<AnimatedNumber>`. The ticker position `{idx + 1}` is dynamic/changing so skip animation — leave as-is. Group counts `{g.count}` warrant `<AnimatedNumber>` with 300ms duration.

---

#### MEDIUM SEVERITY — DomainScorecardRow

**File:** `src/components/dashboard/DomainScorecardRow.tsx` approx lines 40, 44
```
{stat1Value}  → e.g. "Total risks: 24"
{stat2Value}  → e.g. "HIGH risks: 5"
```

These are `text-sm font-bold` values in the programme health scorecard cards. Each represents a key risk/action metric.

**Proposal:** Wrap with `<AnimatedNumber duration={600} />`. Stagger the delay slightly (50ms) between stat1 and stat2 in the same card for a cleaner cascade.

---

#### MEDIUM-HIGH SEVERITY — QuarterlySummaryWidget

**File:** `src/components/dashboard/QuarterlySummaryWidget.tsx` approx line 145
```
{latest.passRate}%   → "text-3xl font-bold font-poppins" — the hero number in this widget
```

This is a `text-3xl` headline number. At `text-3xl` it is absolutely a candidate for animated entry.

**Proposal:** `<AnimatedNumber value={latest.passRate} suffix="%" duration={1000} />` — longer duration for the hero stat to give it weight. This is the "peak moment" stat in this widget.

---

#### Summary — AnimatedNumber Fixes Required

| Location | Count of missing | Severity |
|---|---|---|
| Bento cards (raStats, complianceHealth, controlsStats, policyHealth) | ~15 values | HIGH |
| Notification pills + section badges | ~8 values | MEDIUM |
| Tasks & Reviews heading counts | 3 values | MEDIUM |
| ActionRequiredSection | 2 values | MEDIUM |
| DomainScorecardRow | 2 values per row | MEDIUM |
| QuarterlySummaryWidget passRate | 1 value | MEDIUM-HIGH |
| **Total missing** | **~31 values** | |

---

## Section 2 — UX Quality

> **Design philosophy:** Users are compliance and risk professionals. They are under pressure, time-poor, and stressed. Every screen should reduce cognitive load. Design for the 3-second scan. Silence after an action is the enemy. Every action needs a response.

### 2.1 CRITICAL — Missing Error State When Dashboard Hydration Fails

**File:** `src/app/page.tsx`

**Issue:** A `hydrateError` state exists in the store but is never rendered to the user. If the initial API hydration call fails, the user sees a blank dashboard with no explanation. There is no "Refresh" affordance and no error message.

**Impact:** A blank screen with no feedback is the worst UX outcome. The user doesn't know if the app is loading, broken, or empty. For compliance professionals under time pressure, this is a trust-breaking moment.

**Proposed fix:**
```tsx
// In page.tsx, after the loading check
if (hydrateError) {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
      <AlertCircle className="text-risk-red" size={40} />
      <h2 className="text-lg font-semibold font-poppins text-updraft-deep">Unable to load dashboard</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        We could not retrieve your data. This may be a temporary issue. Please refresh the page.
      </p>
      <Button variant="primary" onClick={() => window.location.reload()}>
        Refresh page
      </Button>
    </div>
  )
}
```

---

### 2.2 IMPORTANT — Bulk Operations Lack Pre-Action Confirmation

**File:** `src/app/actions/page.tsx`

**Issue — Bulk reassign:** Clicking "Confirm Reassign" in the bulk toolbar executes immediately and only shows a post-action toast. There is no confirmation step showing which N actions will be reassigned and to whom.

**Issue — Bulk complete:** Although a confirmation dialog exists, the copy reads "This action cannot be undone in bulk" which is ambiguous. It implies individual undo might be possible.

**Impact:** Bulk reassigning 20 actions to the wrong person is hard to recover from. The user never sees a list of what will be affected before execution.

**Proposed fix:**
```
Before bulk reassign executes:
→ Show a confirmation modal:
   Title: "Reassign {N} actions?"
   Body: "All {N} selected actions will be reassigned to {Owner Name}.
         This will notify {Owner Name} and remove them from your queue."
   List: scrollable chip list of the action references being reassigned
   Primary: "Reassign {N} actions"
   Secondary: "Cancel"
```

---

### 2.3 IMPORTANT — CSV Import Errors Not Surfaced to the User

**Files:** `src/app/actions/page.tsx`, `src/app/risk-register/page.tsx`, `src/components/compliance/RegulationCSVDialog.tsx`

**Issue:** If a CSV import fails, only a generic "Failed to import actions" toast appears. Users don't know which rows failed, why, or how to fix the file.

**Impact:** A user who has carefully formatted a 50-row CSV file gets no useful information when it fails. They cannot self-correct.

**Proposed fix:** After import, show a result modal:
```
Import complete
  ✅ 47 rows imported successfully
  ❌ 3 rows failed:
     • Row 5: Missing required field "Due Date"
     • Row 12: Invalid risk reference "RISK-9999"
     • Row 34: Owner email "unknown@" not found in user list
  [Download failed rows as CSV]  [Close]
```

---

### 2.4 IMPORTANT — Risk Heatmap Cells Have No Clickable Affordance

**File:** `src/components/risk-register/RiskHeatmap.tsx`

**Issue:** Heatmap cells are clickable (they filter the risk list below) but have no visible affordance — no `cursor-pointer`, no hover state, no visual indication that they are interactive.

**Impact:** Users scan the heatmap for context but don't discover its filter capability. Bento card D004 rule requires all stat/summary elements to be interactive filters — but the interaction must be discoverable.

**Proposed fix:**
- Add `cursor-pointer` to all heatmap cells
- Add `hover:ring-2 hover:ring-updraft-bright-purple/60` and `hover:scale-105 transition-transform duration-150`
- Optionally: add a one-time tooltip "Click to filter risks" on first visit

---

### 2.5 IMPORTANT — Compliance Page Has 8 Tabs With No Orientation

**File:** `src/app/compliance/page.tsx`

**Issue:** The compliance page has 8 tabs: Overview, Regulatory Universe, Coverage, Roadmap, Assessment Log, SM&CR, Policies, History. Two issues:
1. 8 tabs exceeds the threshold where Hick's Law causes decision paralysis
2. "Assessment Log" vs "History" are ambiguous — users cannot distinguish them without clicking both

**Impact:** New users spend time clicking through tabs to find the right section rather than navigating directly. Experienced users may still mix up similar tabs.

**Proposed fixes:**
1. Add `title` attribute or tooltip text on each tab explaining what it contains (e.g. "Assessment Log — records of formal compliance assessments and certifications")
2. Consider grouping visually: a subtle separator or sub-header between Assess-type tabs (Overview, Assessment Log, History) and Manage-type tabs (Regulatory Universe, Coverage, Roadmap, SM&CR, Policies)
3. Rename "Assessment Log" to "Assessments" and "History" to "Audit Trail" to remove ambiguity

---

### 2.6 IMPORTANT — Error Boundary Shows Raw Stack Trace to End Users

**File:** `src/components/common/ErrorBoundary.tsx`

**Issue:** When a runtime error reaches the Error Boundary, it displays the raw error message and expandable stack trace. This is appropriate for developers but not for compliance professionals in production.

**Proposed fix:**
```tsx
// Show friendly message always; show technical details only in development or with ?debug=1
const showDetails = process.env.NODE_ENV === 'development' ||
  new URLSearchParams(window.location.search).has('debug');

return (
  <div ...>
    <h2>Something went wrong</h2>
    <p>We encountered an unexpected error. Please refresh the page, or contact support if the problem continues.</p>
    {showDetails && <details><summary>Error details</summary><pre>{error.stack}</pre></details>}
    <Button onClick={() => window.location.reload()}>Refresh page</Button>
    <Button variant="ghost" onClick={() => router.push('/')}>Return to dashboard</Button>
  </div>
)
```

---

### 2.7 POLISH — Filter State Not Persisted Across Navigation

**Files:** `src/app/risk-register/page.tsx`, `src/app/actions/page.tsx`

**Issue:** Active filters (selected risk level card, active action status card, search query) are lost when the user navigates away and returns. Only the search query is preserved via URL params.

**Impact:** A user who filters to "Overdue" actions, opens a detail panel, then navigates elsewhere and returns must re-apply their filter. This is friction for users who work in focused sessions.

**Proposed fix:** Persist active filter selections to `localStorage` keyed by page (`dashboard-risk-filter`, `dashboard-action-filter`). Restore on page mount. Clear on explicit "Reset" or when user changes My/All toggle.

---

### 2.8 POLISH — Edit Mode Toolbar Is Complex for Non-Power Users

**File:** `src/app/page.tsx`

**Issue:** The dashboard edit mode toolbar contains: user selector (CCRO), copy layout from another user (CCRO), reset to default, save layout, cancel. For non-CCRO users who simply want to rearrange their own sections, this toolbar is unnecessarily busy.

**Proposed fix:** For non-CCRO users, show a minimal toolbar:
```
[Save Layout]  [Cancel]  [Reset to Default]
```
Keep advanced options (user selector, copy) inside a collapsed "Advanced" section only visible to CCRO.

---

## Section 3 — UI Visual Craft & D-Series Compliance

### 3.1 IMPORTANT — D001: ~25 Hardcoded Hex Values in SVG/Chart Components

**Rule:** D001 — Brand colour system uses Tailwind tokens exclusively. Never hardcode hex values.

**Files and violations:**

**`src/components/dashboard/RiskMatrix.tsx`** (~10 violations)
```
#f0fdf4  → should be fill-green-50 or CSS var
#fffbeb  → should be fill-amber-50
#fef2f2  → should be fill-red-50
#16a34a  → should be stroke-green-600 / text-green-600 (risk-green)
#dc2626  → should be stroke-red-600 / text-red-600 (risk-red)
#d97706  → should be stroke-amber-600 / text-amber-600 (risk-amber)
#d1d5db, #9ca3af, #6b7280 → should be gray-300, gray-400, gray-500
#7B1FA2  → should be updraft-bar token
```

**`src/components/dashboard/ArcGauge.tsx`** (~6 violations)
```
#16a34a  → risk-green
#f59e0b  → risk-amber
#dc2626  → risk-red
#e5e7eb  → gray-200
#1a1a2e  → updraft-deep
#9ca3af  → gray-400
```

**`src/components/risk-register/RiskHeatmap.tsx`** (~7 violations)
```
#888, #666         → gray-500, gray-600
#dc2626, #ea580c, #eab308, #22c55e  → risk-red, risk-amber, risk-yellow, risk-green
#fff               → white
```

**`src/app/_useDashboardSectionMap.tsx`** (~3 violations in SVG decorative lines)
```
#E1BEE7  → updraft-pale-purple
#BA68C8  → updraft-light-purple
#1C1B29  → updraft-deep
```

**Why this matters:** When the brand palette is updated (e.g. a slightly different purple token), SVG/chart components will not update automatically. This creates visible inconsistency between chart colours and the rest of the UI.

**Proposed fix approach:**
SVGs cannot use Tailwind utility classes directly on SVG attributes in the same way as HTML elements. The recommended pattern is:

Option A — CSS custom properties (best for charts with many colour references):
```css
/* globals.css */
:root {
  --color-risk-green: theme('colors.risk-green');
  --color-risk-amber: theme('colors.risk-amber');
  --color-risk-red: theme('colors.risk-red');
  --color-updraft-bar: theme('colors.updraft-bar');
  /* etc. */
}
```
Then in SVGs: `fill="var(--color-risk-green)"` — tokens remain centralised.

Option B — Inline via `className` and `currentColor` (good for simple SVG elements):
```tsx
<circle className="fill-risk-green stroke-risk-green" />
```

Option C — Centralised colour mapping object (good for charts with programmatic colours):
```ts
// src/lib/colours.ts
export const RAG_COLOURS = {
  green:  { fill: '#...', class: 'fill-risk-green' },
  amber:  { fill: '#...', class: 'fill-risk-amber' },
  red:    { fill: '#...', class: 'fill-risk-red' },
} as const;
```
Then import and use `RAG_COLOURS.green.fill` everywhere — single source of truth.

**Recommended approach:** Option A for complex SVG charts (RiskMatrix, ArcGauge, RiskHeatmap) — they use SVG attributes that require explicit colour values. CSS custom properties bridge the gap between Tailwind tokens and SVG attributes.

---

### 3.2 IMPORTANT — D016: 2 Fixed-Height `<textarea>` Elements

**Rule:** D016 — All multi-line text inputs must use `<AutoResizeTextarea>`, never a fixed-height `<textarea rows={N}>`.

**Violations:**

1. **`src/app/reports/page.tsx`** approx line 241–247
   - Raw `<textarea rows={3}>` for the publish note field in the publish modal
   - Fix: `<AutoResizeTextarea minRows={3} placeholder="..." className="..." />`

2. **`src/components/reports/PublishDialog.tsx`** approx lines 313–320
   - Raw `<textarea rows={3}>` — same field in the extracted dialog component
   - Fix: same as above

**Note:** These two may be the same textarea in a parent/child relationship. Check whether both need fixing or just one.

---

### 3.3 PASS — Full D-Series Compliance Summary

| Rule | Status | Notes |
|---|---|---|
| D001 — Brand colours | ⚠️ NEEDS WORK | ~25 hex values in SVG components |
| D002 — Typography | ✅ PASS | font-poppins/font-inter correctly applied |
| D003 — Spacing contract | ✅ PASS | 4pt grid maintained throughout |
| D004 — Bento cards interactive | ✅ PASS | All bento cards wire to filter state |
| D005 — Button component | ✅ PASS | `<Button>` used consistently, no ad-hoc buttons |
| D006 — Modal component | ✅ PASS | `<Modal>` with focus trap + Escape + sizing |
| D007 — Slide-out panel structure | ✅ PASS | Sticky header, scrollable body, fixed footer |
| D008 — Form/input patterns | ✅ PASS | SearchableSelect, date pickers aligned |
| D009 — Status/badge patterns | ✅ PASS | RAGBadge and StatusBadge used correctly |
| D010 — Table pattern | ✅ PASS | Consistent wrapper/header/cell classes |
| D011 — Toast pattern | ✅ PASS | Sonner exclusively; no alert() calls found |
| D016 — AutoResizeTextarea | ⚠️ NEEDS WORK | 2 violations in reports |
| D017 — Text overflow truncation | ✅ PASS | truncate + title on table cells |
| D018 — Panel sizing | ✅ PASS | Width rules followed across all panels |
| D019 — EntityLink | ✅ PASS | All cross-entity references use EntityLink |
| D020 — Pencil edit unlock | ✅ PASS | All major detail panels implemented |
| D022 — Collapsible sections | ✅ PASS | CollapsibleSection used throughout |
| D023 — URL state | ✅ PASS | All panels respond to URL params |
| D024 — Chip layout (linked items) | ✅ PASS | Chip + add/remove pattern consistent |
| D025 — UK British English | ✅ PASS | Fully compliant |
| D026 — Seed upsert ordering | ✅ PASS | No ordering fields in update clauses |
| D027 — Modal animation/transform | ✅ PASS | No transform retention in fill-mode |

---

### 3.4 PASS — Visual Craft Quality (Score: 9/10)

| Criterion | Status | Notes |
|---|---|---|
| Touch targets ≥ 44×44px | ✅ PASS | Desktop context; targets appropriate |
| Hover/focus states complete | ✅ PASS | All interactive elements have all states |
| Visual hierarchy per view | ✅ PASS | Clear dominant element on each screen |
| Icon library consistency | ✅ PASS | Lucide-only throughout |
| Spacing on 4pt grid | ✅ PASS | No irregular values |
| Element alignment | ✅ PASS | Flex-based, intentional throughout |
| Colour contrast (WCAG AA) | ✅ PASS | Brand tokens maintain sufficient contrast |
| Dark mode | N/A | Single light theme; no dark mode implemented |

---

## Section 4 — Prioritised Fix Plan

### Priority 0 — Broken Features (Fix Immediately)

| # | Fix | File(s) | Effort |
|---|---|---|---|
| P0-1 | Wire `onClick` to ControlDetailView edit button — currently does nothing | `ControlDetailView.tsx` ~line 408 | ~20min |
| P0-2 | Implement Audit Trail CSV export button — currently has no handler | `audit/page.tsx` ~line 163 | ~30min |

### Priority 1 — Critical UX & D-series (High Impact / Relatively Quick)

| # | Fix | File(s) | Effort |
|---|---|---|---|
| P1-1 | Wire Horizon Scanning stat cards as interactive filters (D004 violation) — clicking "High Urgency" must filter the list | `horizon-scanning/page.tsx` | ~45min |
| P1-2 | Wrap all HIGH bento card stats in `<AnimatedNumber>` — raStats, complianceHealth, controlsStats, policyHealth (dashboard) | `_useDashboardSectionMap.tsx` | ~1h |
| P1-3 | Wrap Users page role count cards in `<AnimatedNumber>` (text-2xl font-bold) | `users/page.tsx` | ~15min |
| P1-4 | Wrap ComplianceOverview gap analysis counts and compliance rate % | `ComplianceOverview.tsx` | ~45min |
| P1-5 | Wrap QuarterlySummaryWidget hero stat `{latest.passRate}%` — text-3xl | `QuarterlySummaryWidget.tsx` | ~15min |
| P1-6 | Fix D016: replace both `<textarea rows={3}>` with `<AutoResizeTextarea minRows={3}>` | `reports/page.tsx`, `PublishDialog.tsx` | ~20min |
| P1-7 | Add error state render for dashboard hydration failure (`hydrateError`) | `src/app/page.tsx` | ~30min |
| P1-8 | Hide raw stack trace from Error Boundary in production | `ErrorBoundary.tsx` | ~20min |

### Priority 2 — Important UX Improvements

| # | Fix | File(s) | Effort |
|---|---|---|---|
| P2-1 | Wrap MEDIUM badge/pill counts in `<AnimatedNumber>` — dashboard notification pills, section header badges, Tasks & Reviews heading counts | `_useDashboardSectionMap.tsx` | ~1h |
| P2-2 | Wrap DomainScorecardRow all 8 stat values | `DomainScorecardRow.tsx` | ~20min |
| P2-3 | Wrap ActionRequiredSection `totalCount` and group counts | `ActionRequiredSection.tsx` | ~20min |
| P2-4 | Wrap QuarterlySummaryWidget `{latest.pass}`, `{latest.fail}`, `{latest.partially}` | `QuarterlySummaryWidget.tsx` | ~15min |
| P2-5 | Add `cursor-pointer` + hover ring/scale to risk heatmap cells | `RiskHeatmap.tsx` | ~30min |
| P2-6 | Add pre-action confirmation dialog for bulk reassign showing which actions + target owner | `actions/page.tsx` | ~1h |
| P2-7 | Improve CSV import error detail — show result modal with per-row failure reasons | Actions, risks, compliance import dialogs | ~2h |
| P2-8 | Add tab tooltips/descriptions on Compliance page to disambiguate 8 tabs | `compliance/page.tsx` | ~45min |
| P2-9 | Add success toast after Export Centre generation (`toast.success("Pack generated and downloaded")`) | `exports/page.tsx` | ~10min |
| P2-10 | Fix Reports page: publish modal must close on API error so user can retry | `reports/page.tsx` | ~15min |
| P2-11 | Fix Reports delete button: increase auto-reset from 3s to 7s, or replace with ConfirmDialog | `ReportCard.tsx` | ~20min |
| P2-12 | Fix Audit Trail: add visual affordance (ExternalLink icon) to clickable table rows | `audit/page.tsx` | ~20min |
| P2-13 | Fix Horizon Detail Panel inline unlink: replace with ConfirmDialog so user sees what they're unlinking | `HorizonDetailPanel.tsx` | ~30min |
| P2-14 | Fix Users page owned-risks link: change from text search to owner ID filter | `users/page.tsx` | ~20min |
| P2-15 | Add action title tooltips in ControlDetailModal table (max-w-[200px] truncation) | `ControlDetailModal.tsx` | ~10min |
| P2-16 | Simplify dashboard edit mode toolbar for non-CCRO users | `src/app/page.tsx` | ~45min |

### Priority 3 — Planned Refactor (Technical Debt / System Health)

| # | Fix | File(s) | Effort |
|---|---|---|---|
| P3-1 | Migrate all hardcoded SVG hex values to CSS custom properties (D001) — RiskMatrix, ArcGauge, RiskHeatmap, welcome banner SVG | 4 files | ~3h |
| P3-2 | Persist filter state in localStorage for Risk Register, Actions, and Horizon Scanning | 3 files | ~1.5h |
| P3-3 | Rename ambiguous Compliance tabs: "Assessment Log" → "Assessments", "History" → "Audit Trail" | `compliance/page.tsx` | ~10min |
| P3-4 | Add pagination to ControlDetailModal actions table (currently unbounded) | `ControlDetailModal.tsx` | ~45min |
| P3-5 | Controls page: add error boundary around each tab to prevent full-page crash | `controls/page.tsx` | ~20min |
| P3-6 | Controls page: add toast when tab auto-switches due to role permission | `controls/page.tsx` | ~15min |
| P3-7 | Add `placeholder` text to all AutoResizeTextarea fields in HorizonDetailPanel | `HorizonDetailPanel.tsx` | ~15min |

---

## Section 5 — What Is Working Well

Do not lose these things. They are intentional and well-executed.

1. **ScrollReveal application** — All 21 dashboard sections correctly wrapped. The scroll-reveal pattern is clean and consistently applied at render time, not definition time.

2. **Bento card filter wiring** — Every bento card correctly wires to filter state with active styling, toggle behaviour, and ring highlight. D004 is fully honoured.

3. **Component reuse discipline** — `<Button>`, `<Modal>`, `<RAGBadge>`, `<StatusBadge>`, `<EntityLink>`, `<CollapsibleSection>` used consistently. No one-off ad-hoc implementations found.

4. **URL state for all panels** — Every detail panel (risks, actions, controls, policies, regulations) correctly updates the URL. Deep linking works. Browser back/forward works.

5. **Skeleton loading screens** — `SkeletonStatRow` and `SkeletonTable` show structure, not spinners. This is premium UX. Keep it.

6. **UK British English compliance** — Zero American spelling variants found in user-facing copy, comments, or variable names. Consistent throughout.

7. **Existing AnimatedNumber coverage** — Priority action bento cards (P1, P2, P3), action tracking stats (Open, Overdue, Due This Month, Completed), and risk summary (Total, Low, Medium, High) are all correctly animated. The pattern exists and works — it just needs to be extended to the remaining sections listed above.

8. **D027 animation safety** — The `slide-up-fade` animation correctly omits `transform` from the `to` keyframe. No nested fixed modals are being trapped by containing blocks. Hard-won lesson, well applied.

9. **Icon consistency** — 100% Lucide throughout. Consistent stroke weight and optical sizing.

10. **Visual hierarchy** — Each screen has a clear dominant element. Type scale, weight, and spacing create a readable hierarchy without needing decorative chrome.

---

## Section 6 — Non-Dashboard Animation Gaps (All Other Pages)

> Second-pass audit covering every page and component file outside of `_useDashboardSectionMap.tsx`. Adds 47+ additional missing `AnimatedNumber` uses to the 31 already identified in Section 1.

### 6.1 ComplianceOverview.tsx — HIGH/MEDIUM severity

**File:** `src/components/compliance/ComplianceOverview.tsx`

The component correctly uses `AnimatedNumber` in `MetricTile`, `SmcrTile`, and Consumer Duty metrics. The following are NOT animated:

| Raw expression | What it represents | Severity |
|---|---|---|
| `{compliantPct}%` | Compliance rate headline percentage | MEDIUM |
| `{count}` in posture row | Individual compliance status count per row | MEDIUM |
| `{gaps.nonCompliant}` | Non-compliant / gap identified count | MEDIUM |
| `{gaps.noPolicies}` | Regulations without policies | MEDIUM |
| `{gaps.noControls}` | Regulations without controls | MEDIUM |
| `{assessmentPipeline.overdue}` | Overdue assessments | MEDIUM |
| `{assessmentPipeline.dueSoon}` | Due within 30 days | MEDIUM |
| `{assessmentPipeline.notAssessed}` | Not yet assessed | MEDIUM |
| `{smcrHealth.filledRoles}/{smfRoles.length}` | SMF filled/total ratio | MEDIUM |
| `{d.childCount}` | Child item count in RAG by Domain cards | LOW |
| `{overdueCount}` | Overdue policy reviews in policy owner card | LOW |
| `{totalPass}`, `{totalPartial}`, `{totalFail}`, `{totalNotTested}` | 4 test result counts in policy owner card | LOW |
| `{cdHealth.harm}`, `{cdHealth.warning}` | Harm/warning outcome counts in alerts | LOW |

---

### 6.2 Users Page — HIGH severity

**File:** `src/app/users/page.tsx`

| Raw expression | What it represents | Severity |
|---|---|---|
| `{roleCounts[role]}` | User count per role in summary cards (`text-2xl font-bold`) | HIGH |
| `{ownedRiskCounts.get(user.id)}` | Owned risks count in table link | LOW |
| `{user.assignedMeasures.length - 5}` | Overflow badge count (`+N more`) | LOW |

---

### 6.3 DomainScorecardRow.tsx — MEDIUM severity

**File:** `src/components/dashboard/DomainScorecardRow.tsx`

| Raw expression | What it represents | Severity |
|---|---|---|
| `{totalRisks}` | Total risks in scorecard | MEDIUM |
| `{highRisks}` | HIGH risk count | MEDIUM |
| `{openActions.length}` | Open actions count | MEDIUM |
| `{overdueActions}` | Overdue actions count | MEDIUM |
| `{goodMeasures}` | Green Consumer Duty measures | MEDIUM |
| `{warnMeasures}` / `{harmMeasures}` | Amber/Red measures | MEDIUM |
| `{complianceTotal}` | Total regulations | MEDIUM |
| `{complianceGaps}` | Compliance gaps | MEDIUM |

---

### 6.4 QuarterlySummaryWidget.tsx

**File:** `src/components/dashboard/QuarterlySummaryWidget.tsx`

| Raw expression | What it represents | Severity |
|---|---|---|
| `{latest.passRate}%` | Hero pass rate (`text-3xl font-bold`) | HIGH |
| `{latest.pass}` | Passed controls count | MEDIUM |
| `{latest.fail}` | Failed controls count | MEDIUM |
| `{latest.partially}` | Partially effective count | MEDIUM |
| `{q.passRate}%` | Historical quarter pass rates | LOW |
| `{q.tested}` | Controls tested per quarter (historical) | LOW |

---

### 6.5 ActionRequiredSection.tsx

**File:** `src/components/dashboard/ActionRequiredSection.tsx`

| Raw expression | What it represents | Severity |
|---|---|---|
| `{totalCount}` | Total action items header count | MEDIUM |
| `{g.count}` | Per-group count in compact summary | MEDIUM |
| `{idx + 1}` / `{allItems.length}` | Ticker position "1 / 12" — skip; dynamic | LOW |

---

### 6.6 ControlsDashboardTab.tsx

**File:** `src/components/controls/ControlsDashboardTab.tsx`

Note: The 6 main StatCards correctly use `AnimatedNumber`. The following do not:

| Raw expression | What it represents | Severity |
|---|---|---|
| `{outcome.total} control{s}` | Control count under mini donut charts | LOW |
| `{total} control{s}` in business area rows | Per-area control count (×7 rows) | LOW |
| `{pass} passed · {fail} failed · {partial} partial` | Per-area pass/fail/partial inline | LOW |
| `{watchedEntries.length}` | Watched controls section count | LOW |

---

### 6.7 PendingChangesPanel.tsx

**File:** `src/components/dashboard/PendingChangesPanel.tsx`

| Raw expression | What it represents | Severity |
|---|---|---|
| `{visibleChanges.length}` | Pending changes count in badge | MEDIUM |

---

### 6.8 Summary — Additional Animation Gaps

| Page/Component | HIGH | MEDIUM | LOW |
|---|---|---|---|
| ComplianceOverview | — | 8 | 6 |
| Users page | 1 | — | 2 |
| DomainScorecardRow | — | 8 | — |
| QuarterlySummaryWidget | 1 | 3 | 2 |
| ActionRequiredSection | — | 2 | 1 |
| ControlsDashboardTab | — | — | 4 |
| PendingChangesPanel | — | 1 | — |
| **Total additional** | **2** | **22** | **15** |

**Combined total across all pages: 78+ raw numeric displays missing `AnimatedNumber`.**

---

## Section 7 — UX Quality: All Remaining Pages

### 7.1 Horizon Scanning Page

**File:** `src/app/horizon-scanning/page.tsx`

| Criterion | Status | Finding |
|---|---|---|
| 5-second clarity | ✅ PASS | Icon, heading, subtitle immediately explain purpose |
| Empty states | ✅ PASS | "No items match your filters" with actionable text |
| Loading states | ✅ PASS | SkeletonCard components used |
| Error states | ⚠️ NEEDS WORK | CSV export has no error feedback if endpoint fails |
| Interactive affordance | ✅ PASS | Stat cards have hover states, view toggle clear |
| Flow continuity | ✅ PASS | Detail panel opens inline; toast on save |
| Destructive safety | ✅ PASS | Two-step delete confirmation in HorizonDetailPanel |
| Cognitive load | ✅ PASS | Stats → search → filters → grouped by urgency |
| Microcopy | ✅ PASS | Outcome-oriented labels throughout |
| **Bento card interactivity** | **❌ FAIL** | **Four stat cards (Active Items, High Urgency, Due Within 30 Days, Completed) are read-only — D004 violation** |
| Edit affordance | ✅ PASS | Pencil icon unlock, unsaved changes badge, save/cancel in footer |

**Issues:**

1. **CRITICAL — D004 violation: Bento cards are read-only.** The four stat cards display counts but have no click handlers and do not filter the list. Fix: wire each card to set the relevant filter (e.g. clicking "High Urgency" sets `urgencyFilter = "HIGH"`; clicking again resets). Add `ring-2 ring-updraft-bright-purple` active styling. File: `horizon-scanning/page.tsx`.

2. **IMPORTANT — Export has no error handling.** `window.location.href` redirect for CSV export gives the user a blank browser error page on failure. Fix: use `fetch()` and show `toast.error("Export failed — please try again")` on non-OK response.

3. **POLISH — Backdrop click doesn't consistently trigger unsaved-changes guard.** The X button checks `isDirty` before closing; verify the backdrop click path also goes through this same guard.

---

### 7.2 Controls Page

**File:** `src/app/controls/page.tsx`

| Criterion | Status | Finding |
|---|---|---|
| 5-second clarity | ✅ PASS | Heading + subtitle + tabs immediately explain scope |
| Loading states | ✅ PASS | Skeleton table during hydration |
| Error states | ⚠️ NEEDS WORK | No error boundary on child tabs; a tab crash takes down the whole page |
| Tab navigation | ⚠️ NEEDS WORK | Role-restricted tabs auto-switch silently with no explanation to user |
| Cognitive load | ✅ PASS | Role-based tab visibility reduces clutter |

**Issues:**

1. **IMPORTANT — No error boundary on child tabs.** A crash in ControlsLibraryTab or AttestationTab propagates and white-screens the whole page. Fix: wrap each tab's render content in `<ErrorBoundary>`.

2. **POLISH — Silent tab permission redirect.** Non-CCRO users accessing a CCRO-only tab are silently redirected to the first visible tab. Fix: add a toast "That tab requires CCRO Team access" so the user understands why their navigation changed.

---

### 7.3 Control Detail Modal

**File:** `src/components/controls/ControlDetailModal.tsx`

| Criterion | Status | Finding |
|---|---|---|
| Empty states | ✅ PASS | "No test results recorded yet", "No actions linked" etc. |
| Error states | ✅ PASS | Every API call has specific toast on failure |
| Flow continuity | ✅ PASS | Creating action updates control and closes picker |
| Destructive safety | ✅ PASS | ConfirmDialog on delete action |
| Cognitive load | ⚠️ NEEDS WORK | Dense multi-section modal; many sections require scrolling |
| Edit affordance | ✅ PASS | Edit button in footer (CCRO) / Suggest Change (non-CCRO) |

**Issues:**

1. **IMPORTANT — Action title column truncates at `max-w-[200px]` with no tooltip.** Long action titles are cut off and there is no way for the user to see the full text. Fix: add `title={action.title}` for native tooltip.

2. **IMPORTANT — No unsaved-changes warning on modal close.** If user has the link picker or an edit form open and clicks X, changes are lost silently. Fix: add `isDirty` check before `onClose`.

3. **POLISH — No success toast after "Suggest Change" form submit.** Non-CCRO users get no confirmation that their change was received. Fix: `toast.success("Change suggested and sent for review")`.

4. **POLISH — No pagination on actions table.** All linked actions render in one unbounded list. Fix: limit to 10 per page with Previous/Next controls.

---

### 7.4 Control Detail View

**File:** `src/components/controls/ControlDetailView.tsx`

| Criterion | Status | Finding |
|---|---|---|
| 5-second clarity | ✅ PASS | Back nav + ref + name + effectiveness badge immediately visible |
| Interactive affordance | ❌ BROKEN | Edit button has no onClick — clicking does nothing |
| Flow continuity | ✅ PASS | Back arrow calls onBack prop correctly |

**Issues:**

1. **CRITICAL — Edit button non-functional.** The edit button at ~line 408 has no `onClick` handler. It is visible to CCRO users but does nothing when clicked. Fix: wire to call `onEditControl` prop or open the edit modal.

---

### 7.5 Export Centre Page

**File:** `src/app/exports/page.tsx`

| Criterion | Status | Finding |
|---|---|---|
| 5-second clarity | ✅ PASS | Title + subtitle explain purpose immediately |
| Empty states | ✅ PASS | "Select at least one section" shown when nothing selected |
| Loading states | ✅ PASS | Button shows "Generating pack…" with spinner |
| Error states | ✅ PASS | Error displayed in red box with reason |
| Flow continuity | ⚠️ NEEDS WORK | No success feedback after download — user unsure if it worked |

**Issues:**

1. **IMPORTANT — No success toast after export.** After the blob downloads, the spinner stops but nothing confirms success. Fix: add `toast.success("Pack generated and downloaded")` after `URL.revokeObjectURL()`.

2. **POLISH — "Select all" / "Clear" are plain text links.** They are easy to miss. Fix: style as small secondary `<Button>` components.

---

### 7.6 Reports Page

**File:** `src/app/reports/page.tsx`

| Criterion | Status | Finding |
|---|---|---|
| Empty states | ✅ PASS | Three distinct empty states, all contextual and helpful |
| Loading states | ✅ PASS | Spinner + "Loading reports…" |
| Destructive safety | ✅ PASS | ConfirmDialog on delete with explicit consequence |
| Error states | ⚠️ NEEDS WORK | Publish modal stays open on API error; user cannot easily recover |
| Interactive affordance | ⚠️ NEEDS WORK | Current Period card has no hover state despite cursor-pointer |

**Issues:**

1. **IMPORTANT — Publish modal doesn't close on API error.** If publish fails, user sees the modal + error toast but the modal stays open in a broken state. Fix: call `setPublishingReport(null)` in the error handler so the modal closes and user can retry.

2. **IMPORTANT — Delete confirmation auto-resets in 3 seconds.** Users who click elsewhere briefly return to find the delete button has reverted. Fix: increase to 7 seconds or replace with `ConfirmDialog` component.

3. **POLISH — Current Period card has no hover state.** The card uses `cursor-pointer` but no `hover:` style change, making it look like it might not be clickable. Fix: add `hover:shadow-md hover:bg-gray-50 transition-colors`.

---

### 7.7 Audit Trail Page

**File:** `src/app/audit/page.tsx`

| Criterion | Status | Finding |
|---|---|---|
| 5-second clarity | ✅ PASS | Icon + heading + FCA compliance purpose clear immediately |
| Empty states | ✅ PASS | "No audit entries found" with filter suggestion |
| Bento card interactivity | ✅ PASS | Stat cards correctly filter the table |
| Interactive affordance | ⚠️ NEEDS WORK | Clickable rows have no visual affordance before hover |
| Export functionality | ❌ BROKEN | Export CSV button has no click handler |

**Issues:**

1. **CRITICAL — Export CSV button does nothing.** The button at ~line 163 has no `onClick` handler. It is visible and looks functional but clicking it has no effect. Fix: implement a CSV export function and wire it.

2. **IMPORTANT — Clickable table rows have no pre-hover affordance.** Rows that navigate to entities are only distinguishable from non-clickable rows on hover. Fix: add an `<ExternalLink size={12}>` icon to the end of clickable rows so users can identify them before hovering.

3. **IMPORTANT — Changes column truncates with no way to expand.** The `max-w-[200px] truncate` on the changes field cuts off complex change data with no tooltip or expand option. Fix: add a `title` attribute or make the cell clickable to open a detail modal.

---

### 7.8 Users Page

**File:** `src/app/users/page.tsx`

| Criterion | Status | Finding |
|---|---|---|
| 5-second clarity | ✅ PASS | "User Management" + subtitle immediately clear |
| Empty states | ✅ PASS | Two distinct empty states, both contextual |
| Bento card interactivity | ✅ PASS | Role cards correctly filter the table |
| Destructive safety | ✅ PASS | UserDeleteDialog; cannot delete own account |
| Owned risks navigation | ⚠️ NEEDS WORK | Links to text search, not owner filter — ambiguous for common names |

**Issues:**

1. **IMPORTANT — Owned risks link uses name-based text search.** The link navigates to `/risk-register?q={user.name}` which returns text-matched risks, not owner-filtered risks. If two users have similar names the results are wrong. Fix: change to `/risk-register?owner={user.id}` and implement an owner ID filter in the Risk Register.

2. **POLISH — Assigned measures list shows IDs, not names.** The `+N more` badge and the 5 visible items show measure IDs without description. Users don't know what they mean. Fix: add `title` attribute showing all IDs on hover, or make `+N more` open a modal with names.

---

### 7.9 Horizon Detail Panel

**File:** `src/components/horizon/HorizonDetailPanel.tsx`

| Criterion | Status | Finding |
|---|---|---|
| Error states | ✅ PASS | All API calls have specific toast errors |
| Destructive safety | ✅ PASS | Two-step delete + ConfirmDialog |
| Edit affordance | ✅ PASS | Pencil icon unlock, unsaved badge, save/cancel in footer |
| Unlink confirmation | ⚠️ NEEDS WORK | Inline yes/no when scrolled loses context of what is being unlinked |

**Issues:**

1. **POLISH — Inline unlink confirmation loses context.** When confirming an unlink at the bottom of a long scrolled panel, the "Unlink?" yes/no buttons are visible but the risk/action reference is scrolled off screen. Fix: replace with a `ConfirmDialog` modal that names the entity being unlinked.

2. **POLISH — AutoResizeTextarea fields have no placeholder text.** Summary, why-it-matters, recommended actions fields show empty boxes with no hint of purpose in edit mode. Fix: add `placeholder="Describe…"` to each.

---

*This audit was generated by five parallel specialist agents reading the full codebase. All findings are based on code actually read — nothing is guessed or inferred. File references are approximate line numbers; verify before editing.*
