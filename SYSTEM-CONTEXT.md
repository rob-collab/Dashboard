# Updraft CCRO Dashboard — System Context Document

> **Purpose:** This document describes the full system as built. Use it as context when scoping new features, planning changes, or answering questions about how the platform works.
>
> **Last updated:** February 2026

---

## 1. What This System Is

A **Chief Customer & Regulatory Officer (CCRO) Dashboard** for managing consumer duty compliance, risk registers, action tracking, and board reporting. Built for a regulated financial services firm.

**Tech stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Zustand (state), Prisma 7 + PostgreSQL (Supabase), TipTap (rich text), Recharts (charts), dnd-kit (drag & drop).

**All pages are client-side rendered** (`"use client"`). No server components. The app hydrates from the database on load via a Zustand store, then uses optimistic local updates with fire-and-forget API syncs.

---

## 2. Architecture Overview

```
Browser (React/Zustand)
  ├── layout.tsx calls store.hydrate() on mount
  │     └── Fetches all entities in parallel from /api/* routes
  ├── Optimistic updates: UI changes instantly, API sync in background
  ├── Auth: X-User-Id header on every API call (demo auth, no JWT/sessions)
  └── Sidebar: role-based nav, user switcher, refresh button

API Routes (Next.js Route Handlers)
  ├── All under src/app/api/
  ├── Use Prisma client (adapter pattern: PrismaPg → PrismaClient)
  ├── Zod validation on request bodies
  └── Audit logging on mutations

Database (Supabase PostgreSQL)
  ├── 19 Prisma models
  ├── Connection via @prisma/adapter-pg (Prisma 7 pattern)
  └── prisma.config.ts provides connection string (not in schema.prisma)
```

### Key Patterns

- **Store → API sync:** `sync()` helper wraps fire-and-forget API calls with exponential backoff retry (max 2). Store updates are optimistic — the UI never waits for the API.
- **Hydration:** `store.hydrate()` fetches users, reports, risks, actions, outcomes, templates, components, categories, priorities, and settings in parallel. If the API is unreachable, the app still loads with whatever data was previously in the store.
- **Prisma 7:** Uses adapter pattern. `new PrismaPg(pool)` → `new PrismaClient({ adapter })`. The `schema.prisma` has NO `url` field — connection config lives in `prisma.config.ts`.
- **UK British spelling:** Throughout the codebase (Colour, Sanitised, Authorised, etc.).

---

## 3. Roles & Permissions

| Role | Dashboard | Reports | Consumer Duty | Risk Register | Actions | Admin |
|------|-----------|---------|---------------|---------------|---------|-------|
| **CCRO_TEAM** | Full overview + pending approvals | Create, edit, publish, archive | Full CRUD on outcomes, measures, metrics | Full CRUD, CSV import | Full CRUD, approve changes, CSV import/export | Settings, Users, Audit, Templates, Components |
| **OWNER** | My risks, my actions, my metrics | View published only | Edit assigned measures | View/edit own risks | View/edit assigned, propose changes | No access |
| **VIEWER** | My items, published reports | View published only | Read-only | View own assigned risks | View own assigned actions | No access |

### Auth System (Demo Mode)

- No real authentication (no passwords, JWT, or sessions)
- `X-User-Id` header sent with every API request
- Default user: `user-rob` (configurable in `src/lib/auth.ts`)
- Users switchable via sidebar dropdown (any user can be selected)
- API routes check `getUserId(request)` and validate role from the database

---

## 4. Pages & Routes

### Dashboard (`/`)
Role-specific home page. CCRO sees pending approvals, action tracking, consumer duty overview, tasks & reviews, reports table, recent activity. OWNER sees my risks, my due actions, my metrics with clickable links to edit pages. VIEWER sees summary stats and published reports.

### Reports (`/reports`, `/reports/new`, `/reports/[id]`, `/reports/[id]/edit`)
Full report lifecycle: create from template, drag-and-drop section editor (text blocks, data tables, charts, card grids, accordion, imported components), publish as versioned snapshots, export as HTML, compare versions side-by-side.

### Consumer Duty (`/consumer-duty`)
Four FCA outcomes with nested measures and MI metrics. RAG status tracking (Green/Amber/Red) at outcome, measure, and metric level. Monthly summary writing (CCRO editable). Deep-link support (`?measure=xxx` opens MI modal). RAG filter buttons with colour coding. MI metric history with monthly snapshots. CSV import for measures and MI data.

### Risk Register (`/risk-register`)
5x5 heatmap visualisation (inherent, residual, overlay modes). Category-coloured risk blobs. Table view with sorting. Side panel for full risk editing with 6 collapsible sections:
1. Risk Details (name, description, category L1/L2, owner, last reviewed)
2. Inherent Risk Assessment (likelihood 1-5, impact 1-5)
3. Controls (multiple controls with owner dropdown, control effectiveness)
4. Residual Risk Assessment (likelihood 1-5, impact 1-5)
5. Additional (direction of travel, risk appetite, review frequency)
6. Mitigation Actions (with owner dropdown, priority P1-P3, deadline, status — auto-creates linked Action records)

Risk history chart showing 12-month rolling residual scores. CSV import supports controls (pipe-separated) and month history columns (e.g. "Jan 25", "Feb 25" with Green/Yellow/Amber/Red values).

### Actions (`/actions`)
Action tracking with reference numbers, status workflow (Open → In Progress → Completed/Overdue/Proposed Closed), priority (P1-P3), owner assignment. Change approval workflow: owners propose changes, CCRO approves/rejects with notes. CSV import (create/update modes) and export (CSV/HTML with filters).

### Admin Pages (CCRO_TEAM only)
- **Settings** (`/settings`) — 3 tabs: Branding (logo upload/positioning, colours), Categories (L1/L2 risk category editor), Priorities (P1-P3 definition editor)
- **Users** (`/users`) — Create/edit users, assign roles, assign consumer duty measures, activate/deactivate
- **Audit** (`/audit`) — Searchable audit log with role/action filters, expandable change details, CSV export
- **Templates** (`/templates`) — Report template management with category filtering
- **Components Library** (`/components-lib`) — Import custom HTML components with sanitisation

---

## 5. Database Schema (19 Models)

### Core Entities

**User** — id, email (unique), name, role (CCRO_TEAM/OWNER/VIEWER), assignedMeasures (string[]), isActive, timestamps

**Report** — id, title, period, status (DRAFT/PUBLISHED/ARCHIVED), createdBy → User. Has many Sections, Versions, Outcomes, Actions.

**Section** — id, reportId → Report, type (TEXT_BLOCK/DATA_TABLE/CHART/CARD_GRID/ACCORDION/IMAGE_BLOCK/IMPORTED_COMPONENT/TEMPLATE_INSTANCE/CONSUMER_DUTY_DASHBOARD), position, title, content (JSON), layoutConfig (JSON), styleConfig (JSON)

### Consumer Duty

**ConsumerDutyOutcome** — id, reportId → Report, outcomeId, name, shortDesc, detailedDescription, monthlySummary, ragStatus (GOOD/WARNING/HARM), previousRAG, position. Has many Measures.

**ConsumerDutyMeasure** — id, outcomeId → Outcome, measureId, name, owner, summary, ragStatus, position. Has many Metrics (MI).

**ConsumerDutyMI** — id, measureId → Measure, metric, current, previous, change, ragStatus, appetite, appetiteOperator. Has many Snapshots.

**MetricSnapshot** — id, miId → MI, month, value, ragStatus. Unique on (miId, month).

### Risk Register

**Risk** — id, reference (unique, e.g. R001), name, description, categoryL1, categoryL2, ownerId → User, inherentLikelihood/Impact (1-5), residualLikelihood/Impact (1-5), controlEffectiveness, riskAppetite, directionOfTravel, reviewFrequencyDays, reviewRequested, lastReviewed, createdBy/updatedBy → User. Has many Controls, Mitigations, Snapshots, AuditTrail.

**RiskControl** — id, riskId → Risk, description, controlOwner, sortOrder

**RiskMitigation** — id, riskId → Risk, action, owner, deadline, status (OPEN/IN_PROGRESS/COMPLETE), priority (P1/P2/P3), actionId → Action (1-to-1 link). Each mitigation auto-creates a linked Action record.

**RiskSnapshot** — id, riskId → Risk, month, residualLikelihood/Impact, inherentLikelihood/Impact, directionOfTravel. Unique on (riskId, month). Powers the 12-month history chart.

**RiskAuditLog** — id, riskId → Risk, userId, action, fieldChanged, oldValue, newValue, changedAt

**RiskCategory** — id, level (1 or 2), parentId (self-ref), name, definition. L1 categories have L2 children. Editable via Settings.

### Actions

**Action** — id, reference (unique, e.g. ACT-001), reportId → Report, source, title, description, status (OPEN/IN_PROGRESS/COMPLETED/OVERDUE/PROPOSED_CLOSED), priority (P1/P2/P3), assignedTo → User, createdBy → User, dueDate, completedAt. Has many Changes. May have a linked RiskMitigation.

**ActionChange** — id, actionId → Action, proposedBy → User, fieldChanged, oldValue, newValue, status (PENDING/APPROVED/REJECTED), reviewedBy → User, reviewNote, evidenceUrl

### Supporting

**ReportVersion** — id, reportId → Report, version (int), snapshotData (JSON), htmlExport (text), publishedBy → User. Unique on (reportId, version).

**Template** — id, name, description, category, sectionType, layoutConfig (JSON), styleConfig (JSON), contentSchema (JSON array of field definitions)

**Component** — id, name, description, category, htmlContent, cssContent, jsContent, sanitized (boolean)

**AuditLog** — id, timestamp, userId → User, userRole, action, entityType, entityId, changes (JSON), reportId

**SiteSettings** — id ("default"), logoBase64, logoMarkBase64, logoX/Y/Scale, primaryColour, accentColour. Single row, upserted.

**PriorityDefinition** — code (PK: "P1"/"P2"/"P3"), label, description, sortOrder. Editable via Settings.

---

## 6. Enums Reference

| Enum | Values |
|------|--------|
| Role | CCRO_TEAM, OWNER, VIEWER |
| ReportStatus | DRAFT, PUBLISHED, ARCHIVED |
| RAGStatus | GOOD, WARNING, HARM |
| ActionStatus | OPEN, IN_PROGRESS, COMPLETED, OVERDUE, PROPOSED_CLOSED |
| ActionPriority | P1, P2, P3 |
| ChangeStatus | PENDING, APPROVED, REJECTED |
| ControlEffectiveness | EFFECTIVE, PARTIALLY_EFFECTIVE, INEFFECTIVE |
| RiskAppetite | VERY_LOW, LOW, LOW_TO_MODERATE, MODERATE |
| DirectionOfTravel | IMPROVING, STABLE, DETERIORATING |
| MitigationStatus | OPEN, IN_PROGRESS, COMPLETE |
| SectionType | TEXT_BLOCK, DATA_TABLE, CONSUMER_DUTY_DASHBOARD, CHART, CARD_GRID, IMPORTED_COMPONENT, TEMPLATE_INSTANCE, ACCORDION, IMAGE_BLOCK |

---

## 7. API Routes Reference

### Reports
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/reports` | List all reports |
| POST | `/api/reports` | Create report (CCRO) |
| GET | `/api/reports/[id]` | Get report with relations |
| PATCH | `/api/reports/[id]` | Update report metadata |
| DELETE | `/api/reports/[id]` | Delete report (cascade) |
| GET | `/api/reports/[id]/sections` | Get report sections |
| PUT | `/api/reports/[id]/sections` | Bulk upsert sections |
| POST | `/api/reports/[id]/publish` | Publish as new version |
| GET | `/api/reports/[id]/versions` | List versions |
| GET | `/api/reports/[id]/export` | Export as HTML |

### Consumer Duty
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/consumer-duty` | All outcomes with measures & metrics |
| POST | `/api/consumer-duty` | Create outcome |
| PATCH | `/api/consumer-duty/outcomes/[id]` | Update outcome |
| DELETE | `/api/consumer-duty/outcomes/[id]` | Delete outcome |
| POST | `/api/consumer-duty/measures` | Create measure |
| PATCH | `/api/consumer-duty/measures/[id]` | Update measure |
| DELETE | `/api/consumer-duty/measures/[id]` | Delete measure |
| POST | `/api/consumer-duty/measures/bulk-replace` | Bulk import measures |
| PUT | `/api/consumer-duty/mi` | Bulk upsert MI metrics |
| PATCH | `/api/consumer-duty/mi/[id]` | Update metric |
| DELETE | `/api/consumer-duty/mi/[id]` | Delete metric |
| GET | `/api/consumer-duty/mi/[id]/snapshots` | Metric history |

### Risks
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/risks` | All risks with controls, mitigations, snapshots |
| POST | `/api/risks` | Create risk |
| GET | `/api/risks/[id]` | Single risk with relations |
| PATCH | `/api/risks/[id]` | Update risk (handles controls & mitigations replacement) |
| DELETE | `/api/risks/[id]` | Delete risk |
| POST | `/api/risks/import` | CSV import with preview mode |
| GET | `/api/risks/[id]/snapshots` | Risk history snapshots |
| POST | `/api/risks/[id]/review-request` | Flag for review |

### Actions
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/actions` | All actions with assignees & changes |
| POST | `/api/actions` | Create action |
| GET | `/api/actions/[id]` | Single action |
| PATCH | `/api/actions/[id]` | Update action |
| DELETE | `/api/actions/[id]` | Delete action |
| POST | `/api/actions/import` | CSV import (create/update) |
| GET | `/api/actions/export` | CSV/HTML export with filters |
| POST | `/api/actions/remind` | Send reminders for overdue actions |
| GET | `/api/actions/[id]/changes` | List proposed changes |
| POST | `/api/actions/[id]/changes` | Propose a change |
| PATCH | `/api/actions/[id]/changes/[changeId]` | Approve/reject change |

### Admin
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/users` | List / create users |
| GET/PATCH/DELETE | `/api/users/[id]` | Get / update / deactivate user |
| GET/POST | `/api/templates` | List / create templates |
| GET/PATCH/DELETE | `/api/templates/[id]` | Get / update / delete template |
| GET/POST | `/api/components` | List / import component |
| GET/PATCH/DELETE | `/api/components/[id]` | Get / update / delete component |
| GET/POST | `/api/audit` | List (paginated) / log event |
| GET | `/api/audit/export` | Export audit log CSV |
| GET/PUT | `/api/settings` | Get / update branding settings |
| GET/PUT/POST/DELETE | `/api/risk-categories` | CRUD risk categories |
| GET/PUT | `/api/priority-definitions` | Get / update priority definitions |
| GET | `/api/health` | Health check |

---

## 8. CSV Import/Export Capabilities

### Risk CSV Import
- **Required columns:** Name, Description, Category L1, Category L2, Owner, Inherent L, Inherent I, Residual L, Residual I
- **Optional columns:** Controls (pipe-separated e.g. `"Control A|Control B"`), Control Effectiveness, Risk Appetite, Direction of Travel
- **12-month history:** Add columns like `Jan 25`, `Feb 25`, `Dec 24` etc. with values: Green (Low), Yellow (Medium), Amber (High), Red (Very High). Auto-detected from headers.
- **Owner resolution:** Matches by user name or email (case-insensitive)
- **Category validation:** Matched against database RiskCategory records
- **Preview mode:** Server validates all rows and returns errors before committing
- **Creates:** Risk records + RiskControl records + RiskSnapshot records (history + current month)

### Action CSV Import
- **Create mode:** Title + Assigned To required (no actionId)
- **Update mode:** actionId provided, updates specified fields only
- **Columns:** Action ID, Title, Description, Status, Priority (P1-P3), Source, Assigned To, Due Date
- **Owner resolution:** Same as risk import

### Action CSV Export
- Exports Reference, Action ID, Title, Description, Report/Period, Source, Section, Owner, Due Date, Status, Created, Completed Date
- Filterable by status and reportId
- Also supports HTML table export

### Consumer Duty CSV Import
- Measure import with auto-mapped columns (measureId, name, outcomeId, owner, summary, ragStatus)
- MI metric import with monthly snapshot values

### Audit Log CSV Export
- All fields: Timestamp, User, Role, Action, Entity Type, Entity ID, Report ID, Changes (JSON), IP Address

---

## 9. Component Library (55+ Components)

### Layout
- `Header.tsx` — Top nav with logo, search, user menu
- `Sidebar.tsx` — Left nav with role-based links, user switcher, refresh button, collapse toggle

### Common
- `Modal.tsx` — Generic modal wrapper (sizes: sm, md, lg)
- `RoleGuard.tsx` — Wraps pages restricted to specific roles
- `StatusBadge.tsx`, `RAGBadge.tsx` — Colour-coded status indicators
- `ErrorBoundary.tsx`, `LoadingState.tsx`

### Risk Register
- `RiskHeatmap.tsx` — 5x5 matrix with category-coloured blobs, 3 view modes
- `RiskDetailPanel.tsx` — Slide-in panel with 6 collapsible sections
- `RiskTable.tsx` — Sortable table view
- `RiskHistoryChart.tsx` — 12-month residual score line chart
- `ScoreBadge.tsx` — Colour-coded score (1-25) badge
- `RiskCSVUploadDialog.tsx` — CSV import with preview/commit workflow

### Consumer Duty
- `OutcomeCard.tsx`, `MeasurePanel.tsx`, `MIModal.tsx` — Hierarchical outcome→measure→metric UI
- `MeasureFormDialog.tsx` — Create/edit measure with user dropdown owner
- `AdminRAGPanel.tsx` — Bulk RAG colour management
- `RiskDetailModal.tsx` — Outcome detail with editable monthly summary

### Actions
- `ActionFormDialog.tsx` — Create/edit with user dropdown, priority dropdown
- `ActionChangePanel.tsx` — Approve/reject proposed changes
- `ActionCSVUploadDialog.tsx` — Import/export dialog

### Reports/Editor
- `SectionRenderer.tsx` — Renders 9 section types
- `RichTextEditor.tsx` — TipTap-based editor with tables, images, links
- `PropertiesPanel.tsx` — Section layout/style editor
- `VersionList.tsx`, `VersionCompare.tsx` — Version management

---

## 10. Branding & Theming

### Tailwind Colours
- **Brand:** updraft-deep (#311B92), updraft-bar (#673AB7), updraft-bright-purple (#7B1FA2), updraft-light-purple (#BA68C8), updraft-pale-purple (#E1BEE7)
- **Risk:** risk-green (#10B981), risk-amber (#F59E0B), risk-red (#DC2626)

### Fonts
- **Headings:** Poppins (`font-poppins`)
- **Body:** Inter (`font-inter`)

### CSS Conventions
- `bento-card` class for card containers
- `font-poppins` for headings, `font-inter` for body
- Custom animations: slide-up, fade-in, slide-in-right, highlight

### Site Settings (DB-persisted)
- Logo (base64), logo mark (base64)
- Logo position (x, y) and scale factor
- Primary colour, accent colour
- All persisted via `/api/settings` and loaded during hydration

---

## 11. Key File Paths

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema (19 models, 10 enums) |
| `prisma/seed.ts` | Database seed script |
| `prisma.config.ts` | Prisma 7 connection config (uses DIRECT_URL or DATABASE_URL) |
| `src/lib/store.ts` | Zustand store (all state + hydration + sync) |
| `src/lib/types.ts` | TypeScript interfaces for all entities |
| `src/lib/auth.ts` | Demo auth context (no real auth) |
| `src/lib/prisma.ts` | Prisma client singleton (PrismaPg adapter) |
| `src/lib/api-client.ts` | Client-side fetch wrapper with auth header |
| `src/lib/api-helpers.ts` | Server-side helpers (getUserId, validation, response helpers) |
| `src/lib/csv-utils.ts` | CSV parsing, column mapping, validation for all import types |
| `src/lib/risk-categories.ts` | Risk category taxonomy, likelihood/impact scales, score helpers |
| `src/lib/utils.ts` | Common utilities (cn, formatDate, RAG helpers, generateId) |
| `src/lib/serialise.ts` | Date serialisation for API responses |
| `src/lib/sanitize.ts` | DOMPurify HTML sanitisation |
| `src/lib/export-html.ts` | Report HTML export generator |
| `src/app/layout.tsx` | App shell, hydration, sidebar, auth provider |

---

## 12. Known Limitations & Future Considerations

- **Auth is demo-only:** No real authentication. Any user can switch to any other user via the sidebar. A production deployment would need proper auth (e.g. NextAuth, Clerk, or SSO).
- **No real-time sync:** If two users are editing simultaneously, they won't see each other's changes until one refreshes. The sidebar has a manual refresh button.
- **Email is stubbed:** The `/api/actions/remind` endpoint exists but email sending via Resend is not fully configured.
- **No file storage:** Logos and images are stored as base64 in the database. A production system would use object storage (S3, Supabase Storage).
- **Single database connection pool:** The Prisma adapter uses `max: 2` connections per function invocation. May need tuning under load.

---

## 13. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2.35 | Framework |
| react / react-dom | 18 | UI library |
| prisma / @prisma/client | 7.4.0 | ORM |
| @prisma/adapter-pg / pg | 7.4.0 / 8.18.0 | PostgreSQL adapter |
| zustand | 5.0.11 | State management |
| tailwindcss | 3.4.1 | Styling |
| @tiptap/* | 3.19.0 | Rich text editor |
| recharts | 3.7.0 | Charts |
| @dnd-kit/* | 6.3.1 / 10.0.0 | Drag and drop |
| zod | 4.3.6 | Schema validation |
| sonner | 2.0.7 | Toast notifications |
| resend | 6.9.2 | Email (stubbed) |
| date-fns | 4.1.0 | Date formatting |
| uuid | 13.0.0 | ID generation |
| lucide-react | latest | Icons |
