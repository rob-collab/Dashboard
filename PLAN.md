# CCRO Dashboard — Active Development Plan
Last updated: 2026-02-23 (Process Library retrospectively completed; OR sprint active)

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
