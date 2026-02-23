# CCRO Dashboard — Active Development Plan
Last updated: 2026-02-23 (sprint completed)

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
