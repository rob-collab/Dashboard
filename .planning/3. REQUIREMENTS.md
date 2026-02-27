# CCRO Dashboard — Product Requirements Document
*Reverse-engineered from codebase · Version 1.0 · February 2026*

---

## 1. Product Overview

The CCRO (Chief Conduct and Risk Officer) Dashboard is a web-based governance platform
for Updraft, a UK FCA-authorised consumer credit lender. It centralises the firm's
risk management, compliance monitoring, Consumer Duty reporting, and regulatory
assurance workflows into a single tool used daily by the risk and compliance function.

**Core purpose:** Give the CCRO, compliance team, and business owners a single system
of record for risk, regulatory, and conduct obligations — replacing spreadsheets,
email threads, and disconnected Word documents.

---

## 2. User Roles

| Role | Who | Permissions |
|---|---|---|
| **CCRO Team** | Rob (CCRO), Cath (Compliance) | Full read/write on all modules, admin functions, user management |
| **Owner** | Chris (Operations), Micha (Data & Credit), Ash (Financial Promotions & Growth), Graham (Tech), David (Finance) | Read/write on their assigned risks, controls, actions, and Consumer Duty measures; read-only on other areas |
| **Reviewer** | Senior stakeholders, Board | Read-only access to all modules; can submit access requests for elevated permissions |
| **CEO** | Aseem | Special viewer role; approves risk acceptances; receives board-level reporting |

---

## 3. Module Specifications

### 3.1 Home Dashboard

**Purpose:** At-a-glance portfolio health view, navigating to all major modules.

**Requirements:**
- Customisable dashboard sections per user (add/remove/reorder via drag-and-drop)
- Default sections differ by role (CCRO sees all; Owner sees assigned items)
- Section registry controls visibility by role

**Current sections:**
- `risk-summary` — Portfolio risk stat tiles + 5×5 risk matrix + portfolio trend chart
- `action-tracking` — Open/overdue action tiles + priority swimlane pipeline chart
- `consumer-duty` — Consumer Duty outcome radar chart + compact outcome grid
- `programme-health` — 4 arc-gauge scorecards (Risk Health, Action Health, Consumer Duty, Compliance)
- `compliance-summary` — Compliance universe status summary
- `horizon-scanning` — Upcoming regulatory change items
- `smcr` — SMCR function occupancy and certification status

**Interactive behaviour:** Every stat tile (bento card) must filter the view below when clicked.

---

### 3.2 Risk Register

**Purpose:** Enterprise risk register with inherent/residual scoring, controls, mitigations, and trend history.

**Requirements:**

**Risk record contains:**
- Reference (auto-generated, e.g. RR-001)
- Name, description
- Category L1 (5 categories) and L2 (18 sub-categories)
- Owner (linked to a User)
- Inherent likelihood × impact (1–5 each)
- Residual likelihood × impact (1–5 each, after controls applied)
- Control effectiveness: Effective / Partially Effective / Ineffective
- Risk appetite: Very Low / Low / Low-to-Moderate / Moderate
- Direction of travel: Improving / Stable / Deteriorating
- In Focus flag (highlights on risk matrix)
- Review frequency (days), last reviewed date
- Approval status

**Risk controls** (inline, per risk): free-text description of each mitigating control with owner

**Risk mitigations** (inline, per risk): action-linked items with deadline and status

**Risk snapshots:** Monthly snapshot of residual L×I scores and direction — drives the portfolio trend chart

**Risk-Control Link (cross-module):** Each risk can be linked to one or more Controls Library entries (formal controls), distinct from the inline risk controls

**Risk-Action Link (cross-module):** Each risk can be linked to one or more Action Tracking entries

**Risk matrix (home dashboard):** 5×5 SVG heatmap, one dot per risk at residual position, ghost dot at inherent position, colour = direction of travel, click = navigate to risk

**Risk categories (5 L1, 18 L2):**
- Credit Risk: Loan Performance, Creditworthiness, Concentration, Recovery
- Operational Risk: Fraud, Technology, Process Failure, Third-Party, People
- Conduct Risk: Consumer Outcomes, Financial Promotions, Customer Vulnerability, Complaints
- Regulatory Risk: Regulatory Change, Regulatory Relationship, Sanctions
- Financial Risk: Funding / Liquidity, Market Risk

**CRUD:** CCRO Team can create, edit, delete any risk. Owners can edit their own.

**Change proposals:** Owners can propose changes to risk scores; CCRO reviews and approves/rejects.

---

### 3.3 Action Tracking

**Purpose:** Centralised action log across risk register, Consumer Duty MI, controls testing failures, and ad-hoc items.

**Requirements:**

**Action record contains:**
- Reference (auto-generated, e.g. ACT-001)
- Title, description, issue description
- Status: Open / In Progress / Overdue / Completed
- Priority: P1 (Critical) / P2 (High) / P3 (Medium)
- Assigned to (User)
- Due date
- Source (risk, control, Consumer Duty MI, regulatory change, audit, ad-hoc)
- Linked risk (via RiskActionLink)
- Linked control (controlId field)
- Linked Consumer Duty MI (consumerDutyMIId field)
- Approval status

**Filtering:** By priority, status, assignee, due date, source. Each filter combination deep-linkable via URL params.

**Dashboard pipeline chart:** 3 swimlane bars (P1/P2/P3) showing OPEN / IN_PROGRESS / OVERDUE segment widths, clickable to filter.

**CRUD:** CCRO Team can create/edit/delete any action. Owners can update status and notes on their assigned actions.

---

### 3.4 Controls Library

**Purpose:** Firm-wide library of formal controls, tested on a schedule, with a full testing history and attestation trail.

**Requirements:**

**Control record contains:**
- Reference (controlRef, e.g. FP-C001, UW-C001)
- Name, description
- Business area (10 areas: Website & App, Underwriting, Customer Service, Collections, Finance, IT, HR, Marketing, Compliance, Financial Promotions)
- Control owner (User)
- Consumer Duty outcome type (Products & Services / Consumer Understanding / Consumer Support / Governance, Culture & Oversight)
- Control frequency: Daily / Weekly / Monthly / Quarterly / Bi-Annual / Annual / Event-Driven
- Internal or Third Party
- Control type: Preventative / Detective / Corrective / Directive
- Active/inactive flag, standing comments

**Testing Schedule (one per control):**
- Testing frequency: Monthly / Quarterly / Bi-Annual / Annual
- Assigned tester (User)
- Summary of test method
- Active flag

**Test Results (one per period per control):**
- Period year and month
- Result: Pass / Fail / Partially / Not Tested / Not Due
- Tester, evidence links, notes
- Backdated flag

**Quarterly Summaries:** Narrative write-up per quarter per control schedule (DRAFT / SUBMITTED / APPROVED)

**Attestations:** Monthly attestation from the control owner (attested: yes/no, issues flagged, description). CCRO can review and agree/disagree with each attestation.

**Change proposals:** Any user can propose a change to a control field; CCRO reviews (PENDING / APPROVED / REJECTED)

**Risk-Control Links (cross-module):** Controls can be linked to one or more risks. The link is maintained in the Risk Register view and the Controls Library view.

**Regulation Links:** Controls can be linked to compliance universe regulations.

**Policy Links:** Controls can be linked to policies.

**Process Links:** Controls can be linked to process library entries.

**CRUD:** CCRO Team can create, edit, archive any control. Owners can attest and propose changes.

---

### 3.5 Consumer Duty

**Purpose:** Track compliance with FCA Consumer Duty (PRIN 12 / PRIN 2A) across 4 outcomes, with monthly MI metrics, RAG status, and 12-month trend history.

**Requirements:**

**Structure:**
- 4 Outcomes (configurable): Products & Services, Consumer Understanding, Consumer Support, Price & Value / Governance
- Each Outcome: 3–10 Measures
- Each Measure: 2–5 MI Metrics
- Each MI Metric: Monthly snapshot value, RAG status, appetite target, narrative

**Outcome record:** Name, short description, detailed description, RAG status (Good/Warning/Red), risk owner, previous RAG, mitigating actions, monthly summary

**Measure record:** Name, owner (User), summary, RAG status, position (display order)

**MI metric record:** Metric name, current value, previous value, change, RAG status, appetite (target value), appetite operator (≤ or ≥), narrative

**MetricSnapshot:** Monthly value + RAG for each metric, used to render the trend sparkline (12-month history)

**CD measures are assigned to Owners** who are responsible for updating them monthly. CCRO Team reviews and can edit all.

**Home dashboard:** Recharts RadarChart showing % GREEN measures per outcome per axis. Compact outcome grid below with RAG left-border colouring.

**Linking:** CD MI records can be linked to Actions (for remediation) and Risk Acceptances.

**Annual board attestation:** Process PROC-020 governs the annual Consumer Duty board attestation.

---

### 3.6 Compliance Universe

**Purpose:** 328-regulation hierarchy of all FCA/PRA/UK GDPR/AML obligations applicable to Updraft, with compliance status tracking and assessment notes.

**Requirements:**

**Regulation record:** Reference (FCA handbook notation), name, short name, body (FCA/PRA/ICO/etc), type (Handbook Rule / Principle / Legislation / Statutory Instrument / Guidance / Industry Code), description, parent (4-level hierarchy), level, regulatory body, applicability (Core/High/Medium/Low/N_A/Assess), isApplicable, primary SMF, secondary SMF, compliance status (Compliant/Partially Compliant/Non-Compliant/Not Assessed/Gap Identified), assessment notes, last assessed date, next review date

**Hierarchy:** PRIN → PRIN 1, PRIN 2, … → PRIN 2A → PRIN 2A.1, 2A.2, 2A.3, etc.

**Filters:** By body, type, applicability, compliance status, SMF, text search.

**Control links:** Regulations can be linked to controls in the Controls Library.

**Tab in Compliance page:** Displayed as the "Policies" tab is accessible from Compliance → Policies tab; similarly the Compliance Universe is the main Compliance page view.

---

### 3.7 Policy Register

**Purpose:** Library of 21 internal policies, with version history, owner accountability, and links to regulations and controls.

**Requirements:**

**Policy record:** Reference (POL-001 etc), name, description, owner (User), status (Draft/Active/Under Review/Archived), next review date, version, effective date

**Links:** Each policy links to multiple regulations (PolicyRegulatoryLink) and controls (PolicyControlLink)

**Obligations:** Policies can have obligations (sub-requirements) that are tracked for implementation

**Audit log:** Full history of changes to each policy

**Access:** Compliance page → Policies tab (Policies removed from top-level sidebar)

---

### 3.8 SM&CR

**Purpose:** Track Senior Managers and Certification Regime obligations.

**Requirements:**

**SMF Roles:** 8 SMF roles defined (SMF1/3/9/16/17/24/27/29). Current holders, status (Active/Vacant), scope, key duties, appointment date.

**Prescribed Responsibilities:** Standard FCA PR-letter mapping to SMF holders.

**Certified Persons:** Annual fitness and propriety certification for material risk-takers and customer-facing staff.

**Conduct Rules:** Individual conduct rule record for each in-scope person, with breach tracking (BreachStatus: ACTIVE / RESOLVED / UNDER_INVESTIGATION / CLOSED).

**SMCR Documents:** Responsibilities map, individual accountability statements uploaded by Compliance.

**Access Requests:** Users can request temporary access to restricted functions; CCRO approves/denies.

---

### 3.9 Horizon Scanning

**Purpose:** Track upcoming regulatory and market developments, assess their impact, and generate actions.

**Requirements:**

**Horizon item record:** Reference (HZ-001 etc), title, category (Regulation/Legislation/Guidance/Market/Technology/Geopolitical), source, urgency (LOW/MEDIUM/HIGH/CRITICAL), status (MONITORING/ASSESSING/RESPONDING/CLOSED), summary, why it matters, deadline, source URL, month added, inFocus flag

**Generated actions:** Each horizon item can spawn tracked actions (via HorizonActionLink)

**Risk links:** Items can be linked to existing risks (HorizonRiskLink)

**Monthly scan:** Items represent the current scanning cycle output, added by the CCRO with notes.

---

### 3.10 Operational Resilience

**Purpose:** Map and test the resilience of Important Business Services (IBS) against FCA operational resilience rules (PS21/3).

**Requirements:**

**Important Business Services (IBS):** Each IBS has impact tolerances, current status, description.

**Resilience Scenarios:** Disruption scenarios for each IBS (Type: People/Technology/Facilities/Third-Party/Cyber/Natural Disaster/Other). Score (0–100), outcome (GREEN/AMBER/RED/UNTESTED), status.

**Self-Assessments:** Annual board self-assessment per IBS, with scenario walkthrough status.

**Process links:** IBS records link to Process Library entries.

---

### 3.11 Process Library

**Purpose:** Document 20 critical business processes with RACI, controls linkage, and operational resilience mapping.

**Requirements:**

**Process record:** Reference (PROC-001 etc), name, category, type (Core/Support/Management/Governance), criticality (Standard/Important/Critical), maturity (1–5), owner, description, purpose, next review date, frequency, SMF function, prescribed responsibilities, end-to-end SLA

**Steps:** Ordered list of process steps with responsible/accountable parties (RACI)

**Links:** Processes link to risks, controls, policies, regulations, IBS

---

### 3.12 Risk Acceptances

**Purpose:** Formal workflow for accepting residual risks above appetite, with CCRO review and senior approver sign-off.

**Requirements:**

**Risk Acceptance record:** Reference (RA-001 etc), title, description, source (Risk Register / Control Testing / Incident / Ad Hoc), status workflow (Proposed → CCRO Review → Awaiting Approval → Approved / Rejected / Returned → Expired)

**Routing:** Proposer submits → CCRO reviews → routes to named approver (typically CEO or SMF holder) → approver approves/rejects

**Linked items:** Linked risk, linked CD outcome, linked actions

**Conditions:** Approval conditions, review date trigger for expiry

**History:** Full status transition log with actor, timestamp, details

**Comments:** Thread of comments from all parties

---

### 3.13 Reporting

**Purpose:** Produce narrative reports (board packs, management reports) using a template and component library.

**Requirements:**

**Reports:** Title, description, period, status (Draft/In Review/Approved/Published). Sections with text blocks, component embeds, Consumer Duty data.

**Templates:** Reusable report layout templates with section schemas.

**Components:** Reusable HTML/CSS/JS component library that can be embedded in reports.

**Versioning:** Each published report version is snapshotted (JSON) and can be exported to HTML.

---

### 3.14 Export Centre

**Purpose:** One-click export of any module's data to PDF or CSV for Board, FCA, or audit purposes.

**Requirements:**
- Export Risk Register, Actions, Controls, Consumer Duty, Compliance Universe, Policies to CSV
- Generate PDF snapshots of dashboard sections and individual records
- Audit trail of all export events

---

### 3.15 Audit Trail

**Purpose:** Immutable log of all changes across the system for regulatory accountability.

**Requirements:**
- Every create/update/delete action logged with: user, role, entity type, entity ID, field changes, timestamp, IP address
- Full searchable log in the Audit page (CCRO Team only)

---

### 3.16 User Management & Access Control

**Purpose:** Manage user accounts, roles, permissions, and access requests.

**Requirements:**
- 3 base roles (CCRO_TEAM, OWNER, REVIEWER) plus CEO
- Role-based permissions matrix (feature × role × can_read/can_write/can_admin)
- User-level permission overrides
- Access request workflow: user requests → CCRO approves with time limit → auto-expiry
- Google OAuth sign-in (FCA staff accounts) with DB allowlist
- Dashboard layout preferences persisted per user

---

## 4. Technical Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, React 18, TypeScript, Tailwind CSS |
| State | Zustand (optimistic local + API sync) |
| Database | Supabase PostgreSQL (hosted), Prisma 7 ORM |
| Hosting | Vercel (Next.js) |
| Auth | NextAuth v5 / Auth.js with Google OAuth |
| Charts | Recharts v3.7, Framer Motion v12 |
| Email | Not yet implemented |

---

## 5. Key Design Principles

1. **All data persists** — Every user interaction that changes data must call the API and persist to the database. The Zustand store is a cache, not the source of truth.

2. **Every count is a filter** — Every summary stat card ("5 HIGH risks") filters the view below when clicked. Read-only stat cards are not permitted.

3. **All elements are editable** — The CCRO Team can edit every field on every screen. Owner-role edits follow assigned permissions.

4. **UK regulatory context** — All domain language uses UK FCA terminology. Spelling is British English throughout.

5. **Role-appropriate views** — Dashboard sections, navigation items, and edit capabilities are gated by role.

6. **Graceful degradation** — If the API is unreachable, the app shows the last-known store data with a warning banner. No crashes.

---

## 6. Data Model Summary

| Entity | Count (target) | Notes |
|---|---|---|
| Users | 8 | Fixed team |
| Risks | 15+ | With 12-month snapshot history |
| Risk categories | 5 L1, 18 L2 | Seeded |
| Actions | 40+ | P1/P2/P3, all statuses |
| Controls | 30+ | 18 FP + 12 other business areas |
| CD Outcomes | 4–5 | With measures, MI, snapshots |
| CD Measures | 25+ | Assigned to Owners |
| Regulations | 328 | Full FCA/PRA/ICO universe |
| Policies | 21 | With regulation + control links |
| SMF Roles | 8 | 3 active holders |
| Processes | 20 | RACI documented |
| Horizon Items | 8+ | Monthly scan |
| IBS | 4 | With scenarios |
| Risk Acceptances | 6 | Various statuses |

---

*Document generated from: src/app/, src/components/, src/lib/, prisma/schema.prisma*
