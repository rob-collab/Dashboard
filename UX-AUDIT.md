# CCRO Dashboard — UX Audit Report

**Date:** 22 February 2026
**Audited by:** Automated UX review (5 parallel agents)
**Scope:** All pages, components, forms, modals, navigation, and cross-cutting patterns
**Overall score:** 6.5/10 — Functionally comprehensive, navigationally confusing, inconsistent in presentation

---

## Status Key

| Symbol | Meaning |
|---|---|
| ✅ | Fixed |
| 🔴 | Critical — blocking core workflows |
| 🟠 | High — significant friction for users |
| 🟡 | Medium — noticeable but workaroundable |
| ⚪ | Low — polish and edge cases |

---

## 1. Dashboard, Navigation & Sidebar

### 🔴 CRITICAL

| # | Issue | Status | File |
|---|---|---|---|
| 1.1 | No "Action Required" / My Inbox section — CCROs have no unified view of what needs doing today | ✅ Fixed | `src/app/page.tsx` |

### 🟠 HIGH

| # | Issue | Status | File |
|---|---|---|---|
| 1.2 | Sidebar is a flat list of 11 items with no semantic grouping or hierarchy | ✅ Fixed | `src/components/layout/Sidebar.tsx` |
| 1.3 | No breadcrumbs on any page — users cannot tell where they are or navigate up | ✅ Fixed | `src/components/common/Breadcrumb.tsx` |
| 1.4 | No global search — with 15+ pages and hundreds of entities, users cannot quickly find anything | ❌ Outstanding | — |
| 1.5 | Dashboard shows 18 sections with no role-based defaults — new users are overwhelmed | ✅ Fixed (same mechanism as 1.11 — ROLE_DEFAULT_HIDDEN in dashboard-sections.ts hides CCRO-only sections for OWNER and REVIEWER roles on first load; OWNERs see 13 sections, REVIEWERs see 14, CCROs see all 18; sections are fully customisable via the Edit Layout panel) | `src/lib/dashboard-sections.ts`, `src/app/page.tsx` |
| 1.6 | Proposed Changes panel leads with field diffs rather than who proposed it, why, and when | ✅ Fixed | `src/app/page.tsx` |
| 1.7 | No first-time user onboarding or welcome flow on first login | ❌ Outstanding | — |

### 🟡 MEDIUM

| # | Issue | Status | File |
|---|---|---|---|
| 1.8 | "Controls Testing" name is confusing — users adding a new control won't click it | ✅ Fixed (renamed "Controls") | `src/components/layout/Sidebar.tsx` |
| 1.9 | Policies hidden from sidebar — critical governance artifact buried behind Compliance → tab | ✅ Fixed | `src/components/layout/Sidebar.tsx` |
| 1.10 | Audit Trail has no visual prominence — sandwiched with no grouping cue | ✅ Fixed (moved to Administration group) | `src/components/layout/Sidebar.tsx` |
| 1.11 | Role-based content mismatch — OWNERs see empty sections like "Pending Approvals" that are never populated for them | ✅ Fixed (ROLE_DEFAULT_HIDDEN applied on first load) | `src/app/page.tsx` |
| 1.12 | No global notification centre — scattered bell icons per section, no unified drawer | ❌ Outstanding | — |
| 1.13 | No keyboard shortcuts — no Cmd+K for search, no Cmd+? for help | ❌ Outstanding | — |
| 1.14 | No role indicator visible to the logged-in user | ✅ Fixed (role label shown in sidebar user section + dropdown) | `src/components/layout/Sidebar.tsx` |
| 1.15 | No in-app help or glossary — terms like "Residual Risk," "RAG," "2LOD," and "Consumer Duty" are unexplained | ✅ Fixed (GlossaryTooltip component created with definitions for RAG, Residual Risk, Inherent Risk, Consumer Duty, 2LOD, CCRO, Appetite, MI, SM&CR, Control Effectiveness; added to Consumer Duty page header + RAG filter, MIModal RAG column, QuarterlySummaryTab 2LOD section, Risk Detail Panel Appetite field, and RiskHeatmap mode buttons with title tooltips) | `src/components/common/GlossaryTooltip.tsx` |
| 1.16 | Mobile sidebar collapses to icons with no hamburger menu alternative | ✅ Fixed (mobile mode detected via window.innerWidth < 768px; on mobile the sidebar overlays the content (ml-0 on main) with a dark backdrop that closes sidebar on tap; sticky hamburger header bar added at top of main content (md:hidden equivalent logic); sidebar auto-closes on navigate on mobile) | `src/app/layout.tsx` |

---

## 2. Risk Register

### 🟠 HIGH

| # | Issue | Status | File |
|---|---|---|---|
| 2.1 | Heatmap is the default view — it is a presentation tool, not a decision tool. Table should be the default, sorted by residual score descending | ✅ Fixed | `src/app/risk-register/page.tsx` |
| 2.2 | Risk table missing critical columns: Review Status (overdue/due soon) and vs Appetite | ✅ Fixed | `src/components/risk-register/RiskTable.tsx` |
| 2.3 | Summary cards don't auto-switch to table view when clicked | ✅ Fixed | `src/app/risk-register/page.tsx` |
| 2.4 | Approval workflow invisible — no prominent status for pending/rejected risks | ✅ Fixed | `src/components/risk-register/RiskDetailPanel.tsx` |
| 2.5 | Risk detail panel is too long and sections are in the wrong order — inherent and residual scores separated by 2000px of content | ✅ Fixed (Residual + visual moved to section 3, directly after Inherent; Controls→4, LibraryControls→4b) | `src/components/risk-register/RiskDetailPanel.tsx` |
| 2.6 | No "Risk in Focus" filter on the summary cards | ✅ Fixed | `src/app/risk-register/page.tsx` |

### 🟡 MEDIUM

| # | Issue | Status | File |
|---|---|---|---|
| 2.7 | Score mode toggle uses jargon: "Inherent / Residual / Overlay" | ✅ Fixed (→ Before Controls / After Controls / Compare) | `src/components/risk-register/RiskHeatmap.tsx` |
| 2.8 | Heatmap cell density — 5+ risks in one cell shows tiny dots; needs a count badge with modal on click | ✅ Fixed (cells cap at 3 dots then show +N overflow badge; click cell for full list in side panel) | `src/components/risk-register/RiskHeatmap.tsx` |
| 2.9 | Score mode preference doesn't persist across sessions | ✅ Fixed (scoreMode saved to localStorage; URL param takes priority, then localStorage, then default "residual") | `src/app/risk-register/page.tsx` |
| 2.10 | Two separate control sections in risk detail panel — inline controls vs library controls with different UX | ✅ Fixed (merged into a single "4. Controls" collapsible with unified count badge; inside has two clearly labelled sub-sections "Inline Controls" and "Control Library" with a horizontal divider; libraryControlsOpen state removed; colour unified to blue) | `src/components/risk-register/RiskDetailPanel.tsx` |
| 2.11 | Table showed "Last Reviewed" — replaced with "Next Review Due" (more actionable) | ✅ Fixed | `src/components/risk-register/RiskTable.tsx` |
| 2.12 | Filter state resets when navigating away from the page | ✅ Fixed (Risk Register: all 5 filters synced to URL; Actions: all 6 filters synced to URL; Compliance: active tab synced to URL via router.replace; Consumer Duty: ragFilter + searchQuery synced to URL via debounced effect) | Multiple |
| 2.13 | No "Export to PDF" for audit packs | ❌ Outstanding | — |

---

## 3. Controls

### 🟠 HIGH

| # | Issue | Status | File |
|---|---|---|---|
| 3.1 | Controls library requires knowing the control name to find it — no browse-by-area mode | ✅ Fixed (clickable area chip row added above table) | `src/components/controls/ControlsLibraryTab.tsx` |
| 3.2 | Table doesn't show how many risks each control addresses — orphaned controls (unmapped to any risk) are invisible | ✅ Fixed (0-risk controls show "Orphaned" amber badge) | `src/components/controls/ControlsLibraryTab.tsx` |

### 🟡 MEDIUM

| # | Issue | Status | File |
|---|---|---|---|
| 3.3 | Control-linking UX in risk detail panel: results limited to 10, no area filter, no indication where a control is already linked | ✅ Fixed (area filter chips added; results increased to 25 with "refine search" notice; already-linked controls shown disabled with "Linked" badge; business area shown in results) | `src/components/risk-register/RiskDetailPanel.tsx` |
| 3.4 | No bulk export for controls | ✅ Already implemented (ExportPanel component in ControlsDashboardTab exports controls + testing schedule as CSV, HTML, or Print; includes all control fields and test history) | `src/components/controls/ExportPanel.tsx` |

---

## 4. Actions

### 🟡 MEDIUM

| # | Issue | Status | File |
|---|---|---|---|
| 4.1 | Expandable row pattern shows one detail at a time — no "Detailed View" toggle to compare multiple actions | ✅ Fixed (expanded state changed from single expandedId string to expandedIds Set<string>; clicking a row toggles its expansion independently; multiple rows can be expanded simultaneously to compare actions; initial URL param still supported for deep links) | `src/app/actions/page.tsx` |
| 4.2 | Approval workflow scattered — `approvalStatus` badge and change approvals are presented inconsistently | ✅ Fixed (approval badges now have consistent icons: Clock for Awaiting Approval, CheckCircle for Approved (new green badge), XCircle for Rejected; pending changes badge now uses sky-blue colour with GitBranch icon to distinguish from approval status; all badges have tooltip descriptions) | `src/app/actions/page.tsx` |
| 4.3 | No bulk actions — no way to bulk-reassign, bulk-close, or export to CSV | ✅ Fixed (checkbox added to each action row; select-all header; bulk toolbar appears when selections exist: "Mark Completed" bulk-closes selected, "Reassign..." shows inline picker with user selector + confirm, "Export Selected" exports filtered set to CSV; all bulk actions CCRO-only; selection cleared after each operation) | `src/app/actions/page.tsx` |
| 4.4 | Filter state (priority, status) resets when navigating away | ✅ Fixed (all 5 filters — status, priority, search q, owner, report, source — initialised from URL and synced via 150ms debounced effect) | `src/app/actions/page.tsx` |

---

## 5. Compliance

### 🔴 CRITICAL

| # | Issue | Status | File |
|---|---|---|---|
| 5.1 | Tab navigation uses wrong information architecture — SM&CR should be its own nav item, not a tab under Compliance | ✅ Fixed (SM&CR added as dedicated nav item in "Compliance & Controls" sidebar group; isActive updated to exclude "smcr" tab from generic /compliance highlight; BadgeCheck icon used) | `src/components/layout/Sidebar.tsx` |
| 5.2 | Regulation → Policy → Control chain requires three separate clicks — no single coverage view | ❌ Outstanding | — |

### 🟠 HIGH

| # | Issue | Status | File |
|---|---|---|---|
| 5.3 | Gap analysis metrics were not clickable — no remediation path | ✅ Fixed | `src/components/compliance/ComplianceOverview.tsx` |
| 5.4 | Regulatory Universe tree doesn't show which linked policies or controls are failing | ✅ Fixed (amber ⚠ icon shown in Policies column when any linked policy is OVERDUE; red ⚠ icon shown in Controls column when any linked control has a failing test result or REJECTED approval; both with tooltip) | `src/components/compliance/RegulatoryUniverseTab.tsx` |
| 5.5 | Policy creation is divorced from regulations — create dialog should include a "Regulations" step | ✅ Fixed (PolicyFormDialog converted to 2-step form: Step 1 = policy details; Step 2 = regulation linking with searchable list of applicable regulations, checkboxes, and count badge; selected regulations become PolicyRegulatoryLink entries on save; editing pre-populates selection from existing regulatoryLinks) | `src/components/policies/PolicyFormDialog.tsx` |
| 5.6 | Policy control health score donut is not clickable and its scoring logic is unexplained | ✅ Fixed (donut container is now clickable → switches to Controls & Testing tab; scoring logic explained in footer: "Based on most recent test result per linked control"; failing and untested counts called out) | `src/components/policies/PolicyOverviewTab.tsx` |

### 🟡 MEDIUM

| # | Issue | Status | File |
|---|---|---|---|
| 5.7 | Consumer Duty tab is buried in PolicyDetailPanel and absent from Compliance Overview | ✅ Fixed (Consumer Duty RAG summary section added to Compliance Overview showing Green/Amber/Red outcome counts, total outcomes + measures, contextual alerts for Harm/Warning outcomes, and "View Consumer Duty" link) | `src/components/compliance/ComplianceOverview.tsx` |
| 5.8 | SM&CR section is disconnected from regulations — no drill-down to accountability holder | ✅ Fixed (SMF cards now show Regulatory Basis text; inline Prescribed Responsibilities preview (up to 2) with PR ID badge and title; "+N more" link to Compliance/SMCR responsibilities tab when more than 2 exist) | `src/components/compliance/smcr/SMFDirectory.tsx` |
| 5.9 | Missing compliance roadmap — no remediation plan with deadlines or priority order | ❌ Outstanding | — |
| 5.10 | Missing coverage matrix — regulations × policies × controls in a single grid view | ❌ Outstanding | — |
| 5.11 | No regulatory change log — no impact assessment when regulations are updated | ❌ Outstanding | — |

---

## 6. Reports

### 🔴 CRITICAL

| # | Issue | Status | File |
|---|---|---|---|
| 6.1 | Publish button did nothing — both Edit and Publish routed to the same page | ✅ Fixed | `src/app/reports/page.tsx` |

### 🟠 HIGH

| # | Issue | Status | File |
|---|---|---|---|
| 6.2 | Export was silent — no confirmation or feedback after download | ✅ Fixed | `src/app/reports/page.tsx` |
| 6.3 | No summary metrics on the reports page (total, draft, published counts) | ✅ Fixed | `src/app/reports/page.tsx` |
| 6.4 | Consumer Duty section in report view is not configurable — all 21 outcomes hardcoded into every report | ✅ Fixed (CCRO users see a "Configure" button on the CD section header; popover lists all outcomes with checkboxes and Show all/Hide all shortcuts; hidden count shown in header "X of 21 shown"; configuration persisted per-report to localStorage; empty state shown with "Show all" recovery link when all outcomes hidden) | `src/app/reports/[id]/page.tsx` |

### 🟡 MEDIUM

| # | Issue | Status | File |
|---|---|---|---|
| 6.5 | No report audit trail — version history is hidden, diffs not shown, "Published by" not prominent | ✅ Fixed (Published date shown in green in header when status=PUBLISHED; version count badge on History button; version count shown in subtitle when multiple versions exist) | `src/app/reports/[id]/page.tsx` |
| 6.6 | Delete report had no confirmation dialog | ✅ Fixed | `src/app/reports/page.tsx` |

---

## 7. Consumer Duty

### 🟠 HIGH

| # | Issue | Status | File |
|---|---|---|---|
| 7.1 | Three conflicting views on one page — "RAG Admin" configuration should live in Settings, not a tab | ✅ Fixed (AdminRAGPanel moved to Settings → Consumer Duty tab; Settings page now reads ?tab= URL param so /settings?tab=consumer-duty deep-links work; Consumer Duty page "RAG Admin" button replaced with "RAG Override →" link to Settings; viewMode type simplified to "all" | "my") | `src/app/settings/page.tsx`, `src/components/settings/ConsumerDutySettings.tsx` |
| 7.2 | RAG status calculation is hidden — outcome cards show a dot but never explain how the RAG is derived | ✅ Fixed (hover tooltip on RAG dot shows Good/Warning/Harm measure breakdown + logic explanation) | `src/components/consumer-duty/OutcomeCard.tsx` |
| 7.3 | Metrics entry has no targets, no 12-month trend, no indication of which metric is dragging the outcome down | ✅ Fixed (Target column added to metrics table showing appetite operator + value e.g. "≥ 95%"; Met/Missed badge shown based on current value vs target; hint text updated to prompt target-setting; 12-month trend history already accessible via row click into MetricDrillDown) | `src/components/consumer-duty/MIModal.tsx` |

### 🟡 MEDIUM

| # | Issue | Status | File |
|---|---|---|---|
| 7.4 | "My Measures" view is disconnected — empty state gives no guidance on how to request measure assignment | ✅ Fixed (empty state now shows actionable guidance with CCRO team member avatars so user knows exactly who to contact for measure assignment) | `src/app/consumer-duty/page.tsx` |
| 7.5 | No "Last Updated By" on outcome cards — users can't tell if data is fresh without clicking into the modal | ✅ Fixed (shows relative "Updated Xd ago" based on latest measure lastUpdatedAt, fallback to outcome.updatedAt) | `src/components/consumer-duty/OutcomeCard.tsx` |
| 7.6 | CCRO RAG override is invisible to non-CCRO users — no indicator that a manual override is in effect | ✅ Fixed (purple "Override" badge shown when ragStatus ≠ computed worst-of-measures; tooltip explains computed vs shown status) | `src/components/consumer-duty/OutcomeCard.tsx` |

---

## 8. Risk Acceptances

### 🟡 MEDIUM

| # | Issue | Status | File |
|---|---|---|---|
| 8.1 | Workflow diagram only shown inside the detail panel — new users don't understand the process from the list | ✅ Fixed (dismissible workflow process banner added above summary cards showing all 4 steps: Propose → CCRO Review → Awaiting Approval → Decision, with tooltip descriptions) | `src/app/risk-acceptances/page.tsx` |
| 8.2 | Appetite breach indicator (+5 over) is lost in table noise — rows with breached acceptances need a red left border | ✅ Fixed (red left border + subtle bg-red tint on breached rows) | `src/app/risk-acceptances/page.tsx` |
| 8.3 | Comments section has no badge or notification on the list row | ✅ Fixed (comment count badge with MessageSquare icon shown on list row when comments exist) | `src/app/risk-acceptances/page.tsx` |
| 8.4 | Controls and mitigations section collapsed by default with no visual indicator of failing controls | ✅ Fixed (Controls & Mitigations badge now shows red "Rejected" or "N overdue" warning when linked control is rejected or actions are overdue; amber "Pending" when control awaits approval) | `src/components/risk-acceptances/RiskAcceptanceDetailPanel.tsx` |

---

## 9. Forms, Modals & Dialogs

### 🔴 CRITICAL

| # | Issue | Status | File |
|---|---|---|---|
| 9.1 | No ConfirmDialog for destructive actions — deleting risks, reports, inline metrics had no confirmation | ✅ Fixed | `src/components/common/ConfirmDialog.tsx` |
| 9.2 | Inconsistent form validation — ActionFormDialog validates; PolicyFormDialog does not; RiskAcceptanceFormDialog does not | ✅ Fixed (both PolicyFormDialog and RiskAcceptanceFormDialog now have inline field errors) | Multiple |

### 🟠 HIGH

| # | Issue | Status | File |
|---|---|---|---|
| 9.3 | Button component exists but is used in only 2 files — all other forms use raw `<button>` with inline styles | ✅ Partial (reports + ConfirmDialog updated) | Multiple |
| 9.4 | Inline metric editing in MeasureFormDialog is painful — tiny inputs, no delete confirmation, no empty state guidance | ✅ Fixed (empty state improved with BarChart2 icon + descriptive placeholder text; column headers added above metrics list; value input widened to w-24 with descriptive placeholder "e.g. 94.2%"; metric name placeholder updated to "e.g. Complaint rate"; footer hint explains how to set targets after saving) | `src/components/consumer-duty/MeasureFormDialog.tsx` |
| 9.5 | SearchableSelect pattern implemented in RiskAcceptanceFormDialog but not reused — ActionFormDialog uses raw `<select>` | ✅ Fixed (SearchableSelect component created as a reusable combobox with inline search, keyboard navigation (arrow keys + Enter + Escape), and sublabel support; used in ActionFormDialog "Assigned To" field showing role as sublabel) | `src/components/common/SearchableSelect.tsx`, `src/components/actions/ActionFormDialog.tsx` |

### 🟡 MEDIUM

| # | Issue | Status | File |
|---|---|---|---|
| 9.6 | Required field indicators inconsistent — some forms use `*`, others nothing | ✅ Fixed (added * to ActionFormDialog Title + Assigned To; UserFormDialog Name + Email; OutcomeFormDialog Outcome ID + Name + Short Description; MeasureFormDialog Measure ID + Outcome + Name) | Multiple |
| 9.7 | Form input styling inconsistent — `border-gray-300` vs `border-gray-200`, some use local `inputClasses`, some inline styles | ✅ Fixed (batch replaced `border border-gray-300` → `border border-gray-200` across all TSX files; additionally fixed conditional border classes in PolicyFormDialog, RiskAcceptanceFormDialog, RiskAcceptanceDetailPanel where `border-gray-300` was used as the non-error state; checkbox inputs, hover states, and drop zones with border-gray-300 intentionally left as-is) | Multiple |
| 9.8 | Modal focus trap missing — focus escapes to background on Escape; no auto-focus on first input | ✅ Fixed (Tab cycles within modal, auto-focus first element on open, restore focus on close) | `src/components/common/Modal.tsx` |
| 9.9 | No blur-time validation — forms only validate on submit | ✅ Fixed (added onBlur validateField handlers to UserFormDialog, OutcomeFormDialog, MeasureFormDialog, PolicyFormDialog, RiskAcceptanceFormDialog) | Multiple |
| 9.10 | Modal footer layout inconsistent — some use `justify-between` (Cancel floats far left), should always be `justify-end` | ✅ Fixed (already resolved — Modal component uses `justify-end`, all custom dialogs use `justify-end`) | Multiple |
| 9.11 | Error messages are generic — raw API error details exposed to users with no actionable guidance | ✅ Fixed (friendlyApiError() helper added to api-client.ts mapping HTTP status codes (400→invalid request, 401→session expired, 403→access denied, 404→not found, 409→conflict, 5xx→server error) and common DB error patterns (foreign key, unique constraint, timeout, connection) to user-friendly message + description pairs; Prisma stack traces and UUIDs sanitised; used in store sync toast, reports publish error, and dashboard change-review error) | `src/lib/api-client.ts`, `src/lib/store.ts` |
| 9.12 | No loading state in many forms — `PolicyFormDialog` has no spinner | ✅ Fixed | `src/components/policies/PolicyFormDialog.tsx` |
| 9.13 | Missing `aria-required`, `aria-invalid`, `aria-describedby` on error fields | ✅ Fixed (added aria-required, aria-invalid, aria-describedby with matching IDs on error paragraphs in UserFormDialog, OutcomeFormDialog, MeasureFormDialog, RiskAcceptanceFormDialog) | Multiple |

---

## 10. Cross-Cutting Issues

### 🟠 HIGH

| # | Issue | Status | Notes |
|---|---|---|---|
| 10.1 | Security: `getUserId()` fell through to client-supplied headers — spoofable | ✅ Fixed | `src/lib/api-helpers.ts` |
| 10.2 | Security: 3 GET endpoints had no try/catch — DB errors caused unhandled promise rejections | ✅ Fixed | Multiple API routes |
| 10.3 | Security: XSS in HTML export — report content injected raw into HTML | ✅ Fixed | `src/app/api/reports/[id]/export/route.ts` |
| 10.4 | RAG styling inconsistent across sections — glowing dots in Consumer Duty vs. small text in Reports | ✅ By design — dots are intentional for card-based Consumer Duty view; colored text is appropriate for dense report tables; both use the same `risk-green/amber/red` tokens; `RAGBadge` component available for non-card contexts | — |
| 10.5 | "Linked to Action" badge in risk detail panel was not clickable | ✅ Fixed | `src/components/risk-register/RiskDetailPanel.tsx` |
| 10.6 | Actions page showed raw risk UUID instead of risk reference + name | ✅ Fixed | `src/app/actions/page.tsx` |
| 10.7 | RiskTable truncated risk names and owner names with no overflow handling | ✅ Fixed | `src/components/risk-register/RiskTable.tsx` |

### 🟡 MEDIUM

| # | Issue | Status | Notes |
|---|---|---|---|
| 10.8 | Filter state not persisted in URL for Risk Register (uses local state, not params) — filters lost on navigate | ✅ Fixed (view, mode, filter, cat, q params initialised from URL and synced on state change with 150ms debounce) | `src/app/risk-register/page.tsx` |
| 10.9 | Empty state messaging inconsistent in tone and format across pages | ✅ Substantially consistent — all pages use icon + primary text + secondary text pattern with `py-12` padding; minor variance in icon size (40 vs 48) not user-facing; `EmptyState` component available for future use | — |
| 10.10 | Audit trail visible in Risk Acceptances, buried in Reports, absent in Consumer Duty | ✅ Fixed (Consumer Duty "Audit Trail" button added for CCRO team linking to `/audit?q=consumer_duty`; audit page now reads `?q=` URL param for pre-filtering) | `src/app/consumer-duty/page.tsx`, `src/app/audit/page.tsx` |
| 10.11 | No data freshness indicators except in Consumer Duty | ✅ Fixed (_hydratedAt: Date | null added to store state, set when hydration completes; sidebar shows "Data current as of HH:MM" when not collapsed, so all pages show freshness; Refresh button tooltip shows full datetime; clicking Refresh updates the timestamp) | `src/lib/store.ts`, `src/components/layout/Sidebar.tsx` |
| 10.12 | Score badges have different visual weight across heatmap vs table vs detail panel | ✅ Fixed (heatmap hover tooltip now shows color-coded score badges with level labels — "Before: [12 Very High]" / "After: [8 High]" — using inline styles to match the ScoreBadge colour scheme; table uses sm and detail panel uses md/lg ScoreBadge — appropriate size variation by context) | `src/components/risk-register/RiskHeatmap.tsx` |

---

## Recommended Shared Components (Not Yet Built)

| Component | Purpose |
|---|---|
| `<FormInput>` | Consistent input styling, required indicator, error state |
| `<FormSelect>` | Consistent select styling |
| `<SearchableSelect>` | Reusable search dropdown (already built in RA form, not extracted) |
| `<FormArray>` | Reusable nested item list with add/remove |
| `<FormError>` | Consistent error message display |
| `<RequiredIndicator>` | Consistent `*` marker |
| `<FieldLevelError>` | Error text under individual fields |
| `<GlobalSearch>` | Cmd+K search across all entities |
| `<CoverageMatrix>` | Regulations × Policies × Controls grid |

---

## Summary Scorecard

| Area | Score | Blockers |
|---|---|---|
| Navigation & Layout | 7/10 | Global search, role defaults |
| Risk Register | 7.5/10 | Panel reorganisation |
| Controls | 5/10 | Browse mode, risk linkage count |
| Actions | 6/10 | Bulk actions, filter persistence |
| Compliance | 5/10 | Coverage matrix, chain visibility |
| Reports | 8/10 | Configurable CD section |
| Consumer Duty | 5.5/10 | RAG explanation, target setting |
| Risk Acceptances | 7/10 | Breach highlighting |
| Forms & Modals | 5.5/10 | Validation, focus trap, shared components |
| Security | 9/10 | All critical issues fixed |

---

*Generated from 5-agent parallel audit of all pages, components, API routes, and UX patterns.*
