# Policy Analysis Brief — Updraft CCRO Dashboard

## Who You Are

You are acting as a compliance analyst for **Updraft**, an FCA-authorised consumer credit firm (credit card/lending). You are being given Updraft's actual policy documents. Your job is to produce two deliverables:

1. **Requirements CSV files** — one per policy, ready to upload into our compliance dashboard
2. **Policy Suite Assessment** — a standalone analysis of the quality, completeness and gaps in our policy framework

---

## Deliverable 1: Requirements CSVs

### What This Is For

Our CCRO (Chief Compliance & Risk Officer) dashboard tracks **policy requirements** — the specific obligations within each policy. Each requirement can have **sections** that map to different regulators and controls. For example, a "Record Keeping" requirement in the Financial Promotions Policy might have:
- Section 7.1 mapping to CONC 3 (financial promotions records) + CTRL-FP-008
- Section 7.2 mapping to UK GDPR (data retention) + CTRL-DP-003

The CSV format supports this by allowing multiple rows for the same requirement — rows with the same `category` + `description` are automatically merged into a single requirement with multiple sections.

### CSV Format

```
category,description,sectionName,regulationReferences,controlReferences,notes
```

**Column definitions:**

| Column | Required | Description |
|--------|----------|-------------|
| `category` | Yes | Grouping category (e.g. "Promotions Approval", "Record Keeping", "Affordability Assessment") |
| `description` | Yes | The actual requirement text — what the policy requires |
| `sectionName` | No | Which section of the policy document this maps to (e.g. "Section 3.2 — Approval Process"). Leave blank for flat requirements |
| `regulationReferences` | No | Semicolon-separated regulation reference codes from our Compliance Universe (see below). e.g. `CONC 3;PRIN 7;PRIN 12` |
| `controlReferences` | No | Semicolon-separated control reference codes. Use the format `CTRL-XXX-NNN` where XXX is a policy-specific prefix |
| `notes` | No | Additional context, implementation notes, or cross-references |

### Merging Rules

- Rows with **identical** `category` AND `description` are merged into **one requirement** with multiple sections
- Each row becomes a section within that requirement
- The system automatically computes the union of all regulation/control refs across sections
- If a requirement doesn't need sections (applies uniformly), leave `sectionName` blank — it becomes a flat requirement

### Example

```csv
category,description,sectionName,regulationReferences,controlReferences,notes
Promotions Approval,"All financial promotions must be approved by an authorised person before publication",Section 3.1 — Scope,CONC 3;CONC 3.1;PRIN 7,CTRL-FP-001,Covers all channels
Promotions Approval,"All financial promotions must be approved by an authorised person before publication",Section 3.2 — Digital Channels,CONC 3;PECR,CTRL-FP-001;CTRL-FP-017,Social media and email
Record Keeping,"Promotions register must be maintained with approval records retained for 3 years",,CONC 3;SYSC 9,CTRL-FP-008,Single flat requirement — no sections needed
```

This produces:
- 1 requirement "Promotions Approval" with 2 sections (3.1 and 3.2), each mapping to different regs/controls
- 1 flat requirement "Record Keeping" with no sections

---

## Available Regulation References (Compliance Universe)

These are the regulation codes in our system. Use **the reference column** (e.g. `CONC 3`, `PRIN 7`), not the CU IDs.

### FCA Principles (PRIN)
- `PRIN` — FCA Principles for Businesses (parent)
- `PRIN 1` — Integrity
- `PRIN 2` — Skill, Care and Diligence
- `PRIN 3` — Management and Control
- `PRIN 4` — Financial Prudence
- `PRIN 5` — Market Conduct
- `PRIN 6` — Customers' Interests (TCF)
- `PRIN 7` — Communications with Clients (clear, fair, not misleading)
- `PRIN 8` — Conflicts of Interest
- `PRIN 9` — Relationships of Trust
- `PRIN 10` — Clients' Assets
- `PRIN 11` — Relations with Regulators
- `PRIN 12` — Consumer Duty

### Consumer Duty Detail (PRIN 2A)
- `PRIN 2A` — Consumer Duty Detailed Requirements
- `PRIN 2A.1` — CD Application
- `PRIN 2A.2` — Cross-Cutting Rules (good faith, avoid harm, enable objectives)
- `PRIN 2A.3` — Outcome 1: Products and Services
- `PRIN 2A.4` — Outcome 2: Price and Value
- `PRIN 2A.5` — Outcome 3: Consumer Understanding
- `PRIN 2A.6` — Outcome 4: Consumer Support
- `PRIN 2A.7` — Governance and Oversight
- `PRIN 2A.8` — Monitoring Outcomes
- `PRIN 2A.9` — Management Information

### Consumer Credit Sourcebook (CONC)
- `CONC` — Consumer Credit Sourcebook (parent)
- `CONC 1` — Application and Purpose
- `CONC 2` — Conduct of Business Standards
  - `CONC 2.2` — General conduct
  - `CONC 2.3` — Pre-contractual requirements
  - `CONC 2.4` — SECCI (Pre-contract credit information)
  - `CONC 2.5` — Adequate explanations
  - `CONC 2.6` — Credit brokers
  - `CONC 2.7` — Distance marketing
  - `CONC 2.8` — Unfair business practices
  - `CONC 2.9` — Unfair practices: supplementary
  - `CONC 2.10` — Mental capacity guidance
- `CONC 3` — Financial Promotions and Communications
  - `CONC 3.1` — Application
  - `CONC 3.2` — General requirements
  - `CONC 3.3` — Content of communications
  - `CONC 3.5` — Financial promotions: specific
  - `CONC 3.6` — Representative APR
  - `CONC 3.7` — Representative examples
  - `CONC 3.8` — Risk warnings
  - `CONC 3.9` — Prominence
  - `CONC 3.10` — Social media
- `CONC 4` — Pre-contractual Requirements
  - `CONC 4.2` — Pre-contract disclosure
  - `CONC 4.3` — Adequate explanations
- `CONC 5` — Responsible Lending
  - `CONC 5.2` — Creditworthiness assessment
  - `CONC 5.2A` — Creditworthiness: detailed
  - `CONC 5.3` — Affordability
  - `CONC 5.4` — Credit limit increases
  - `CONC 5.5` — Creditworthiness: further provisions
- `CONC 6` — Post-contractual Requirements
  - `CONC 6.2` — Post-contract information
  - `CONC 6.3` — Arrears notices
  - `CONC 6.4` — Default notices
  - `CONC 6.5` — Information sheets
  - `CONC 6.7` — Continuous payment authorities
- `CONC 7` — Arrears, Default and Recovery
  - `CONC 7.2` — Arrears: general
  - `CONC 7.3` — Treatment of customers in default or arrears
  - `CONC 7.4` — Information requirements
  - `CONC 7.5` — Charging for arrears
  - `CONC 7.6` — Recovery and repossession
  - `CONC 7.9` — Debt management
  - `CONC 7.10` — Debt collection visits
  - `CONC 7.11` — Forbearance and due consideration
  - `CONC 7.12` — Statute-barred debt
  - `CONC 7.15` — Debt sale
- `CONC 8` — Debt Advice
- `CONC 9` — Credit Reference Agencies
- `CONC 10` — Connected Obligations
- `CONC 11` — Cancellation Rights
- `CONC 13` — Affordability Assessment Guidance
- `CONC 14` — Knowledge and Competence
- `CONC 15` — Connected Lenders' Liability (s.75)

### Systems and Controls (SYSC)
- `SYSC` — Senior Management Arrangements (parent)
- `SYSC 3` — Systems and Controls
- `SYSC 4` — General organisational requirements
- `SYSC 5` — Employees, agents and relevant persons
- `SYSC 6` — Compliance, internal audit and financial crime
- `SYSC 7` — Risk assessment
- `SYSC 9` — Record-keeping
- `SYSC 10` — Conflicts of interest
- `SYSC 15A` — Operational Resilience
- `SYSC 18` — Whistleblowing
- `SYSC 22` — Regulatory references
- `SYSC 24` through `SYSC 28` — SM&CR

### Other FCA
- `COCON` — Code of Conduct Sourcebook (conduct rules)
- `FIT` — Fit and Proper Test
- `GEN` — General Provisions
- `GEN 4` — Statutory status disclosure
- `DISP` — Complaints sourcebook

### Legislation (also in our system)
- `UK GDPR` — UK General Data Protection Regulation
- `DPA 2018` — Data Protection Act 2018
- `Equality Act 2010`
- `Bribery Act 2010`
- `PECR` — Privacy and Electronic Communications Regulations
- `CCA 1974` — Consumer Credit Act 1974
- `FSMA 2000` — Financial Services and Markets Act 2000

---

## Control References — How to Handle

For each policy, **identify or infer controls** from the policy text. A control is a specific activity, check, or process that ensures the requirement is met. Use this naming convention:

```
CTRL-{POLICY-PREFIX}-{NNN}
```

Where `{POLICY-PREFIX}` is a short code for the policy:
- Financial Promotions → `FP`
- Credit / Lending → `CR`
- AML/KYC → `AML`
- Data Protection → `DP`
- Complaints → `CMP`
- Vulnerability → `VUL`
- Arrears & Collections → `AC`
- Operational Resilience → `OR`
- SM&CR → `SMCR`
- Conflicts of Interest → `COI`
- Whistleblowing → `WB`
- T&C (Training & Competence) → `TC`
- Outsourcing → `OUT`
- Record Keeping → `RK`
- Use a sensible short prefix for any others

For each control you identify, note in the `notes` column what the control does. Example:
```
CTRL-CR-001  # notes: "Automated creditworthiness model with manual override threshold"
CTRL-CR-002  # notes: "Affordability assessment using ONS data and income verification"
```

---

## Deliverable 2: Policy Suite Assessment

Provide a **separate section** (not in the CSV) with a thorough analysis:

### Structure the assessment as:

**1. Executive Summary**
- Overall maturity rating (1-5) of the policy suite
- Top 3 strengths, top 3 gaps

**2. Policy-by-Policy Review**
For each policy provided:
- **Coverage**: What regulatory requirements does it address? What does it miss?
- **Quality**: Is it clear, actionable, and specific enough? Or vague and generic?
- **Consumer Duty alignment**: Does it explicitly address PRIN 12 / PRIN 2A outcomes?
- **Controls identified**: How many controls are embedded? Are they testable?
- **Key gaps**: What's missing that the FCA would expect to see?
- **Rating**: Red/Amber/Green

**3. Cross-Cutting Analysis**
- Which FCA requirements from our Compliance Universe have **no policy coverage**?
- Are there overlaps or contradictions between policies?
- Is the Consumer Duty adequately threaded through all policies?
- SM&CR accountability — are policy owners and SMF holders clearly defined?

**4. Gap Register**
A prioritised list of:
- Missing policies (e.g. if there's no Operational Resilience policy, flag it)
- Missing requirements within existing policies
- Weak or unenforceable requirements
- Suggested new controls

**5. Recommendations**
Prioritised actions: what to fix first, what to add, what to rewrite.

---

## Important Notes

- Updraft is a **consumer credit firm** (credit cards / lending), FCA-authorised
- All policies should reflect **UK regulatory framework** — FCA, ICO, PRA where relevant
- Use **British English** throughout (e.g. "colour", "authorised", "defence")
- Be specific with regulation mapping — use the most granular reference available (e.g. `CONC 5.2A` not just `CONC 5`)
- Where a policy section maps to multiple regulators (e.g. Section 7 maps to both CONC 3 and SYSC 9), create separate section entries or list both in `regulationReferences` separated by semicolons
- Controls should be **testable** — something you could audit or evidence
- Don't invent requirements that aren't in the policy document — but DO flag requirements that *should* be there but aren't (in the assessment, not the CSV)

---

## Output Format

For each policy, provide:

```
### [Policy Name] — Requirements CSV

\`\`\`csv
category,description,sectionName,regulationReferences,controlReferences,notes
[data rows]
\`\`\`

### Controls Register for [Policy Name]

| Ref | Control Name | Description | Frequency | Type |
|-----|-------------|-------------|-----------|------|
| CTRL-XX-001 | ... | ... | Monthly/Quarterly/etc | Preventative/Detective/Corrective |
```

Then at the end, the full **Policy Suite Assessment** as described above.

---

## Ready?

I will now provide the policy documents. Please analyse each one thoroughly and produce:
1. The requirements CSV (with section-level regulation and control mapping)
2. The controls register
3. The overall policy suite assessment

Take your time — accuracy matters more than speed. If a policy is ambiguous, note it in the assessment rather than guessing.
