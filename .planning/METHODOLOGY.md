# How We Build — AI-Assisted Development Methodology
## Updraft CCRO Dashboard

> This document explains how the Updraft CCRO Dashboard has been built using a structured,
> AI-assisted development process — covering the coding philosophy, the interview/challenge
> setup, the automated review agent system, and the continuous learning loop.

---

## 1. The Core Idea

The dashboard is built by a single developer working with Claude (Anthropic's AI coding
assistant) as a senior engineering pair. Unlike a naive "ask AI to write code" approach,
this system is configured so that Claude **challenges, interviews, plans, and reviews** —
not just writes.

The result is a codebase that:
- Has never had a regression survive a sprint
- Has a full audit trail of every architectural decision
- Improves its own process with every sprint through a structured lessons system
- Is reviewed by five specialist AI agents at each gate

---

## 2. The Coding Philosophy — CLAUDE.md

Every instruction Claude follows is written in a file called `CLAUDE.md`, committed to the
repository root. It is loaded into Claude's context at the start of every session. It is
the single source of truth for how the codebase is built.

### 2.1 Step 0a — Decompose the Message First

> **Before anything else — before clarifying questions, before planning, before reading files —
> scan the full message for every distinct task it contains.**

When a developer sends a message with multiple requests, Claude must:
1. List every discrete request as a numbered inventory
2. Surface it back to the developer for confirmation
3. Create a task entry (`TaskCreate`) for each item
4. NOT start implementing until the inventory is confirmed

This prevents the most common AI coding failure: starting work on the most prominent
request and quietly ignoring the rest.

**Trigger words:** "also", "and", "as well", "plus", lists, mixed request types, 2+ actionable sentences

### 2.2 Step 0b — Understand Intent Before Any Work

> **Before writing a single line of code, ask clarifying questions if the request is ambiguous.**

Claude must NOT start work if:
- The request touches more than one area of the codebase
- The desired end-state is unclear
- A feature could be interpreted in two reasonable ways
- Something is being removed, replaced, or restructured

**How it works:** Claude proposes an interpretation first ("My reading is that you want X
on the Y page, leaving Z untouched — is that right?") and waits for confirmation.

### 2.3 The 3-Layer Review Gate

After every single deliverable, Claude must run three review layers before proceeding:

**Layer 1 — Build & Verify**
- State what was just implemented
- Verify against the acceptance criteria checklist
- Explicitly check: was anything silently removed?
- Tick completed items; flag gaps

**Layer 2 — Senior Developer Review**
- Would a staff engineer approve this?
- Are there unhandled edge cases?
- Does the code follow existing patterns (store pattern, UK spelling, Prisma adapter)?
- System integration check: does this entity exist elsewhere? Same API routes?
- Consistency check: does this introduce design drift vs existing screens?

**Layer 3 — UAT/UX Review**
- What will an end user actually see?
- Is the experience better, the same, or worse?
- Are there unexpected behaviour changes?
- Have adjacent features been affected?

### 2.4 The Critical Rules

These are non-negotiable standing rules, each with a specific trigger condition:

| Rule | Trigger | What it enforces |
|------|---------|-----------------|
| **Never delete existing features** | Any edit to an existing file | Every tab, panel, import, API handler must still be present after edit |
| **Bento cards must be interactive filters** | Building any stat/summary card | Every card click must filter the view below it. Read-only cards are a bug. |
| **All elements must be editable and persist** | Building any display component | CCRO Team can edit everything. All edits call the API and persist to DB. |
| **Flag conflicts before implementing** | Before any new feature | Check: (1) override risk, (2) standard conflict, (3) parallel data path |
| **Multi-task decomposition** | Message contains 2+ requests | Surface inventory before starting. Every item tracked. |

### 2.5 Declaring Work Complete

Claude cannot say "done" until **all five** are satisfied:
1. Every PLAN.md checklist item is ticked
2. `npx next build` — zero TypeScript errors
3. Final UAT pass described
4. Lessons written to `tasks/lessons.md`
5. PLAN.md included in commit

---

## 3. The Interview / Challenge Setup

Claude is configured to actively challenge the developer, not just execute instructions.

### 3.1 Conflict Check Before Every Feature

Before writing any code, Claude must state:
> "⚠️ Conflict check: [findings or 'None identified']"

It checks for:
1. **Override risk** — would this undo a previous deliberate implementation?
2. **Standard conflict** — inconsistency with agreed schema, API contract, or navigation pattern?
3. **Pathway conflict** — is this creating a second data path for an entity that already has one?

### 3.2 PLAN.md — Plan Before Code

Every change is written into `PLAN.md` **before touching any code**. The plan includes:
- What is changing and why
- Files to modify/create
- A checklist of acceptance criteria (`- [ ] ...`)

This forces the developer and Claude to agree on scope before implementation begins, and
provides a reference point for every review gate that follows.

### 3.3 Replanning After Each Step

After each deliverable, Claude explicitly re-evaluates the plan:
- Are there newly discovered risks or complications?
- Has anything been found during implementation that should change the plan?
- Should remaining items be broken down further?

This prevents the classic failure mode of "we're committed to the plan even though we've
learned something that makes it wrong".

---

## 4. The Agent System

Five specialist AI sub-agents run at defined checkpoints. Each is a separate Claude instance
with a specific persona, scope, and output format. They are launched via the `Task` tool
and run independently from the main development session.

### 4.1 Agent Overview

```
                    ┌─────────────────────────┐
                    │   Main Claude Instance  │
                    │   (Developer's pair)    │
                    └────────────┬────────────┘
                                 │ launches
              ┌──────────────────┼──────────────────┐
              │                  │                   │
     ┌────────┴───────┐  ┌───────┴───────┐  ┌───────┴────────┐
     │   UAT Agent    │  │ Designer Agent│  │Compliance Agent│
     │  (every UI     │  │ (new screens/ │  │ (domain logic  │
     │   change)      │  │  components)  │  │   changes)     │
     └────────────────┘  └───────────────┘  └────────────────┘
              │                  │
     ┌────────┴───────┐  ┌───────┴────────────────┐
     │ Planning Agent │  │  Retrospective Agent   │
     │(sprint boundary│  │   (sprint end)         │
     │   / drift)     │  │                        │
     └────────────────┘  └────────────────────────┘
```

### 4.2 UAT Agent (`uat-agent.md`)

**Persona:** Senior CRO (Chief Risk Officer) at a UK financial firm. Uses the system daily.
Has no patience for unclear, inconsistent, or potentially embarrassing outputs.

**Scope:** Evaluates every visible UI change as if sitting at the desk before a 9am ExCo call.

**Criteria checked:**
1. Clarity — is it immediately obvious what I'm looking at?
2. Domain terminology — does the language match risk/compliance practitioners?
3. Trust — would I trust this data? Dated, attributed, complete?
4. Missing fields — are fields a risk professional would expect absent?
5. Audit trail — who changed what, when? Would this satisfy an FCA audit?
6. Navigation logic — is the flow sensible for managing a live risk framework?
7. Status transitions — are workflows consistent with practice?
8. Regulatory readiness — could this be referenced in a Board report without embarrassment?

**Output:** PASS / CONCERN / FAIL per item. Overall verdict.

**Trigger:** After every deliverable that changes visible UI.

---

### 4.3 Designer Agent (`designer-agent.md`)

**Persona:** Senior front-end designer. Not here to redesign — here to ensure new work is
consistent with what already exists and to flag deviations before they compound.

**Design system enforced:**
- `bento-card` CSS class for all card containers
- Brand colours: `updraft-deep`, `updraft-bar`, `updraft-bright-purple`, `updraft-light-purple`, `updraft-pale-purple`
- `font-poppins` headings · `font-inter` body
- UK British English only
- All styling via Tailwind classes — no hardcoded hex values

**Criteria checked:**
1. Design system adherence
2. Pattern consistency vs existing screens
3. Status badge consistency (same status = same colour everywhere)
4. Typography consistency
5. Spacing and density
6. UK spelling
7. Readability for future developers

**Output:** CONSISTENT / DEVIATION / IMPROVEMENT NEEDED per item. Verdict.

**Trigger:** After every new screen, component, or significant visual change.

---

### 4.4 Compliance Agent (`compliance-agent.md`)

**Persona:** UK financial services regulatory compliance expert and former FCA examiner.
Applies FCA SYSC, SMCR, Consumer Duty, UK GDPR, ISO 31000/COSO, and the Three Lines of
Defence model.

**Criteria checked:**
1. Audit trail completeness (who · what · when · immutable?)
2. Role-based access controls (admin functions guarded? self-assignment abuse possible?)
3. Data integrity and status logic (mandatory fields enforced? irreversible where appropriate?)
4. SMCR accuracy (reasonable steps recordable? SoR producible? prescribed responsibilities mapped?)
5. Terminology accuracy (FCA/PRA-correct language?)
6. Regulatory reporting readiness (could this be referenced in an FCA supervisory visit?)

**Output:** COMPLIANT / ADVISORY / CONCERN / NON-COMPLIANT per item. Verdict.

**Trigger:** After any change to risk, control, SMCR, obligations data model or logic.

---

### 4.5 Planning Agent (`planning-agent.md`)

**Persona:** Senior delivery manager / technical programme manager. Critical friend. Honest,
precise, focused on outcomes not effort.

**Reads:** PLAN.md (current sprint) · recent git log · modified files

**Criteria checked:**
1. Sprint alignment — are commits working towards the sprint objective?
2. Checklist integrity — does the code actually deliver each ticked item? (Don't trust the tick — verify it)
3. Implementation drift — benign (better approach, same outcome) vs harmful (doesn't deliver criteria)
4. Emerging complexity — discovered dependencies, edge cases, constraints?
5. Risk to remaining items — is the sprint still achievable?

**Output:** On Track / Drift Detected (benign/harmful) / Missing from Plan / Recommended changes.
Sprint Verdict: ON TRACK / AT RISK / NEEDS REPLANNING.

**Trigger:** At sprint boundaries or if implementation feels off-track.

---

### 4.6 Retrospective Agent (`retrospective-agent.md`)

**Persona:** Senior engineering lead running an end-of-sprint retrospective. Extracts
durable, actionable learning and recommends exactly where it should be baked into the
permanent process.

**Reads:** PLAN.md · tasks/lessons.md · tasks/patterns.md · git log · agent outputs · CLAUDE.md

**Four tracks:**
1. **Mistakes & Process Failures** — root cause → where should the fix live?
2. **Wins & Reusable Patterns** — deliberate or accidental? generalisable?
3. **Agent Effectiveness** — did agents catch what they should? need sharpening?
4. **Plan Quality** — were acceptance criteria specific enough to verify?

**Output:** Promotions recommended (with draft text, ready to paste) · Agent improvements ·
Plan quality improvements · Lessons to mark as promoted · Next sprint watch-outs.

**Trigger:** At sprint end.

---

### 4.7 How Agents Work Alongside Each Other — The Tier System

Agents are organised in tiers so the review effort is proportional to the change:

| Tier | When | Agents run |
|------|------|-----------|
| **Tier 1** | Every deliverable that changes visible UI | Build (`npx next build`) + UAT Agent — in parallel |
| **Tier 2** | New screens or significant visual changes | Tier 1 + Designer Agent |
| **Tier 3** | Domain logic changes (risk, controls, SMCR, obligations) | Tier 1 + Compliance Agent |
| **Tier 4** | Sprint boundaries or detected drift | Planning Agent mid-sprint · Retrospective Agent at sprint end |

**Any FAIL (UAT) or NON-COMPLIANT (Compliance) finding blocks progress until resolved.**

Agents run in parallel where possible. A typical Tier 2 delivery runs 3 agents simultaneously:
build check, UAT review, designer review — results consolidated before the next deliverable begins.

---

## 5. The Continuous Learning System

Every sprint contributes to a self-improving process. Mistakes and wins are captured in real time
and promoted into permanent process files at sprint end.

### 5.1 The Lessons File — `tasks/lessons.md`

**L-series (Mistakes):** Each entry captures:
- What happened (the specific incident)
- Root cause class (the general pattern — not the specific instance)
- The rule to prevent recurrence
- Trigger condition (when to apply the rule)
- Status (Active / Promoted)

**W-series (Wins):** Each entry captures:
- What worked and why
- Whether it was deliberate or accidental
- The reusable pattern

### 5.2 The Promotion Pipeline

Raw lessons move through a review pipeline before becoming permanent:

```
Sprint incident → L/W entry in tasks/lessons.md
    ↓ (at sprint end)
Retrospective Agent reviews all new entries
    ↓ (agent recommends where each lesson should go)
Promotion decision:

    Process rule that always applies → CLAUDE.md
    Agent missed something → .claude/agents/NAME.md
    Architectural/domain knowledge → MEMORY.md
    Reusable implementation pattern → tasks/patterns.md
    Project-specific "never do this" → stays in lessons.md

    ↓ (after promotion)
Entry marked [PROMOTED → file] in lessons.md
Row added to Promotion Log table
```

### 5.3 What Gets Promoted Where

| Target file | Types of knowledge |
|---|---|
| `CLAUDE.md` | Process rules that apply to every sprint ("never delete features", "decompose messages") |
| `.claude/agents/NAME.md` | Criteria an agent was missing that let something slip through |
| `MEMORY.md` | Architectural decisions, important file paths, Prisma gotchas, deployment config |
| `tasks/patterns.md` | Reusable implementation patterns (P-series) with code examples |

---

## 6. Tangible Improvements — What the System Has Caught

The following improvements were directly caused by the lessons and agent system:

### 6.1 Process Improvements (L-series promoted to CLAUDE.md)

| Lesson | What triggered it | Rule now in CLAUDE.md |
|--------|-------------------|-----------------------|
| L001 | Code silently removed tabs/imports during large file edits | "Never Delete Existing Features" rule + deletion detection checklist |
| L002 | Ambiguous request interpreted too broadly, wrong scope implemented | "Understand Intent Before Any Work" — propose interpretation, confirm before coding |
| L003 | Next step started without checking if plan still made sense | "Replan after each step" — 3-layer review gate after every deliverable |
| L006 | Multi-request message — first item handled, rest ignored | "Decompose the Message First" — numbered inventory, every item tracked |

### 6.2 Security Improvements (L-series — active)

| Lesson | What triggered it | Rule |
|--------|---------------------|------|
| L007 | Horizon Scanning write endpoints used `getUserId()` — any authenticated user could write | Every API write endpoint must use `requireCCRORole()` or `checkPermission()`, never just `getUserId()` |
| L008 | `notes` field hidden in UI but returned by GET API to all callers | Role-restricted fields must be stripped at the API layer, not just hidden in UI |
| L009 | Wrong guard used — `requireCCRORole` blocked OWNER role from creating actions | Know when to use `requireCCRORole` (strictly CCRO) vs `checkPermission` (role-grantable) |

### 6.3 Data Integrity (L-series — active)

| Lesson | What triggered it | Rule |
|--------|------------------|------|
| L010 | CEO conflated with OWNER — they have different permissions | Always check the Role enum before writing any role check |
| L012 | Regulatory seed data fabricated from general knowledge — FCA CP26/7 title was completely wrong | Never generate or fabricate any seed data without express user permission |
| L013 | `for...of` on `Map` rejected by TypeScript at lower targets | Always use `Array.from(map)` for Map iteration |

### 6.4 Design & UX Improvements (L-series — active)

| Lesson | What triggered it | Rule |
|--------|------------------|------|
| L011 | `canManage` prop caused confusion when logic changed | Name props for their specific purpose (`canChangeFocus`, `canCreateAction`) not broad capability |

### 6.5 Reusable Patterns Captured (W-series)

| Win | Pattern | Where it applies |
|-----|---------|-----------------|
| W001 | Dirty state from prop comparison — no shadow state needed | Any edit panel needing unsaved-changes detection |
| W002 | Role-scoped field filtering: fetch everything, strip before return | Any GET endpoint with role-restricted fields |
| W003 | Hydration-gated default toggle — waits for store hydration before setting "My items" default | Any list page with ownership-gated default filter |
| W004 | Silent owner filters replaced with explicit All/My toggle | Any list page that previously filtered silently by role |
| W005 | Vertical timeline pattern for change/approval history | Any entity needing approval workflow audit trail |
| W006 | Conditional deep-dive sections appended after parent in HTML exports | Any export with optional detail sections enriching a parent |

---

## 7. Sprint Velocity & Quality

| Sprint | Deliverables | Regressions | Build errors at merge |
|--------|-------------|------------|----------------------|
| Foundation | Core modules | 0 | 0 |
| Navigation & Panels | 8 detail panels | 0 | 0 |
| Audit & Permissions | RBAC + save reliability | 0 | 0 |
| Horizon Scanning | Full module | 0 | 0 |
| Relational Refactor | Risk-Action-Control links | 0 | 0 |
| Interactivity Audit | 27 items wired | 0 | 0 |
| Processes & IBS | Consolidation | 0 | 0 |
| UX Polish | 8 improvements | 0 | 0 |
| Controls & CD Deep Polish | D1–D7 | 0 | 0 |

**Zero regressions across all sprints.**

---

## 8. How This Differs From Standard AI Coding

| Standard approach | This approach |
|-------------------|---------------|
| Ask AI to write feature → copy-paste → ship | Ask AI to plan → confirm intent → implement → 3-layer review → specialist agents → lessons |
| AI executes instructions | AI challenges scope, flags conflicts, proposes interpretations |
| Mistakes discovered in production | Mistakes caught by UAT/Designer/Compliance agents before commit |
| No institutional memory | Every lesson promoted to permanent process files |
| AI starts fresh each session | MEMORY.md + lessons.md loaded at session start — carries institutional knowledge |
| No audit of AI decisions | PLAN.md tracks every decision; git history traces every change |

---

## 9. Files That Make This Work

| File | Purpose |
|------|---------|
| `CLAUDE.md` | The "constitution" — every rule Claude follows |
| `MEMORY.md` | Persistent project knowledge across sessions |
| `PLAN.md` | Sprint-by-sprint plan with full acceptance criteria history |
| `tasks/lessons.md` | Active L/W entries — reviewed every session |
| `tasks/patterns.md` | Promoted reusable patterns (P-series) |
| `.claude/agents/uat-agent.md` | UAT reviewer persona + criteria |
| `.claude/agents/designer-agent.md` | Design consistency reviewer persona + criteria |
| `.claude/agents/compliance-agent.md` | FCA compliance reviewer persona + criteria |
| `.claude/agents/planning-agent.md` | Sprint drift detector persona + criteria |
| `.claude/agents/retrospective-agent.md` | Sprint-end learning extractor persona + criteria |
