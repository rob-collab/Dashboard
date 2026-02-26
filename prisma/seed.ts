import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { PRIN_CONC_DESCRIPTIONS } from "../scripts/enrich-descriptions-prin-conc";
import { SYSC_LEG_DESCRIPTIONS } from "../scripts/enrich-descriptions-sysc-leg";
import { REMAINING_DESCRIPTIONS } from "../scripts/enrich-descriptions-remaining";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Users ──────────────────────────────────────────────────────────────────
const SEED_USERS: {
  id: string; email: string; name: string; role: "CCRO_TEAM" | "CEO" | "OWNER" | "VIEWER";
  assignedMeasures: string[]; isActive: boolean;
}[] = [
  { id: "user-rob", email: "rob@updraft.com", name: "Rob", role: "CCRO_TEAM", assignedMeasures: [], isActive: true },
  { id: "user-cath", email: "cath@updraft.com", name: "Cath", role: "CCRO_TEAM", assignedMeasures: ["1.9","4.1","5.1","5.2","5.5","5.8"], isActive: true },
  { id: "user-ash", email: "ash@updraft.com", name: "Ash", role: "OWNER", assignedMeasures: ["1.1","1.3","1.4","3.1","3.6","3.7"], isActive: true },
  { id: "user-chris", email: "chris@updraft.com", name: "Chris", role: "OWNER", assignedMeasures: ["1.5","1.8","3.3","3.4","3.5","4.2","4.3","4.4","4.5","4.6","4.7","4.8","4.9","4.10"], isActive: true },
  { id: "user-micha", email: "micha@updraft.com", name: "Micha", role: "OWNER", assignedMeasures: ["1.2","1.6","1.7","2.1","2.2","2.3","2.4","2.5","2.6","2.7"], isActive: true },
  { id: "user-ceo", email: "Aseem@updraft.com", name: "Aseem", role: "CEO", assignedMeasures: [], isActive: true },
  { id: "user-david", email: "david@updraft.com", name: "David", role: "OWNER", assignedMeasures: [], isActive: true },
  { id: "user-graham", email: "graham@updraft.com", name: "Graham", role: "OWNER", assignedMeasures: [], isActive: true },
];

// ── Risk Categories (L1 + L2) ─────────────────────────────────────────────
const RISK_CATEGORIES: {
  id: string; level: number; parentId: string | null; name: string; definition: string;
}[] = [
  // L1 categories
  { id: "rcat-conduct", level: 1, parentId: null, name: "Conduct & Compliance Risk", definition: "The risk of customer detriment arising from inappropriate culture, products and processes or the risks of non-compliance with regulation, rules or prescribed industry practices (including data protection)." },
  { id: "rcat-operational", level: 1, parentId: null, name: "Operational Risk", definition: "The risk of loss or damage resulting from inadequate or failed internal processes, people and systems, fraud or external events." },
  { id: "rcat-credit", level: 1, parentId: null, name: "Credit Risk", definition: "The risk that unexpected losses might arise as a result of Updraft's customers failing to meet their obligations to repay." },
  { id: "rcat-financial", level: 1, parentId: null, name: "Financial Risk", definition: "The risk of Updraft having inadequate earnings, cash flow or capital to meet its current or future requirements and expectations." },
  { id: "rcat-strategic", level: 1, parentId: null, name: "Strategic Risk", definition: "The risk of significant loss or damage arising from business decisions that impact the long-term future of Updraft." },
  // L2 — Conduct & Compliance
  { id: "rcat-culture", level: 2, parentId: "rcat-conduct", name: "Culture", definition: "The risk of Updraft's business is not being conducted in line with its core purpose or values." },
  { id: "rcat-products", level: 2, parentId: "rcat-conduct", name: "Products", definition: "The risk of Updraft's design or service of products which result in poor customer outcomes." },
  { id: "rcat-regulations", level: 2, parentId: "rcat-conduct", name: "Regulations", definition: "The risk of Updraft not complying with applicable regulations & codes." },
  // L2 — Operational
  { id: "rcat-people", level: 2, parentId: "rcat-operational", name: "People", definition: "The risk of damage as a result of an inability to recruit, develop, reward or retain appropriate people." },
  { id: "rcat-fraud", level: 2, parentId: "rcat-operational", name: "Fraud", definition: "The risk of damage or loss as a result of an act of dishonesty or false representation." },
  { id: "rcat-service", level: 2, parentId: "rcat-operational", name: "Service Availability & Resilience", definition: "The risk of a failure to maintain suitable technology services to customers." },
  { id: "rcat-processes", level: 2, parentId: "rcat-operational", name: "Processes", definition: "The risk of damage or loss as a result of failure to maintain effective business processes." },
  { id: "rcat-change", level: 2, parentId: "rcat-operational", name: "Change & Transformation", definition: "The risk of damage or loss from poorly managed change or transformation activity." },
  { id: "rcat-third", level: 2, parentId: "rcat-operational", name: "Third Parties", definition: "The risk of failure of a critical third party." },
  { id: "rcat-infosec", level: 2, parentId: "rcat-operational", name: "Information Management & Data Security", definition: "The risk of loss or damage as a result of material errors in critical reporting or failure to secure key data assets." },
  // L2 — Credit
  { id: "rcat-impairments", level: 2, parentId: "rcat-credit", name: "Impairments", definition: "The risk of Updraft being subject to excessive impairment provisions." },
  { id: "rcat-creditstrat", level: 2, parentId: "rcat-credit", name: "Credit Strategy", definition: "The risk Updraft fails to document, review and adhere to appropriate credit strategies." },
  { id: "rcat-creditmodels", level: 2, parentId: "rcat-credit", name: "Credit Models", definition: "The risk of failure of Updraft's key credit decisioning models and processes." },
  // L2 — Financial
  { id: "rcat-liquidity", level: 2, parentId: "rcat-financial", name: "Liquidity & Funding", definition: "The risk of Updraft being unable to meet its liabilities as they become due." },
  { id: "rcat-solvency", level: 2, parentId: "rcat-financial", name: "Solvency", definition: "The risk of Updraft failing to maintain sufficient capital." },
  { id: "rcat-market", level: 2, parentId: "rcat-financial", name: "Market", definition: "The risk that net value of or net income arising from assets and liabilities is impacted by market changes." },
  // L2 — Strategic
  { id: "rcat-bizmodel", level: 2, parentId: "rcat-strategic", name: "Business Model", definition: "The risk of failing to adopt an appropriate business model." },
  { id: "rcat-stratinit", level: 2, parentId: "rcat-strategic", name: "Strategic Initiatives", definition: "The risk of entering into strategic initiatives that undermine the business model." },
  { id: "rcat-reputation", level: 2, parentId: "rcat-strategic", name: "Reputation", definition: "The risk of events impacting Updraft's reputation to an extent it impacts business operations." },
];

// ── Priority Definitions ──────────────────────────────────────────────────
const PRIORITY_DEFINITIONS: {
  code: string; label: string; description: string; sortOrder: number;
}[] = [
  { code: "P1", label: "Critical", description: "Urgent, requires immediate attention — typically regulatory or high-impact customer detriment issues", sortOrder: 1 },
  { code: "P2", label: "Important", description: "Significant, needs timely resolution — material risk or compliance gaps", sortOrder: 2 },
  { code: "P3", label: "Routine", description: "Standard priority, planned resolution — enhancements and non-urgent improvements", sortOrder: 3 },
];

// ─────────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Seeding database...");

  // Users
  for (const u of SEED_USERS) {
    await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  }
  console.log(`  ✓ ${SEED_USERS.length} users`);

  // Risk categories — L1 first, then L2
  for (const c of RISK_CATEGORIES.filter((c) => c.level === 1)) {
    await prisma.riskCategory.upsert({ where: { id: c.id }, update: c, create: c });
  }
  for (const c of RISK_CATEGORIES.filter((c) => c.level === 2)) {
    await prisma.riskCategory.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log(`  ✓ ${RISK_CATEGORIES.length} risk categories`);

  // Priority definitions
  for (const p of PRIORITY_DEFINITIONS) {
    await prisma.priorityDefinition.upsert({
      where: { code: p.code },
      update: { label: p.label, description: p.description, sortOrder: p.sortOrder },
      create: p,
    });
  }
  console.log(`  ✓ ${PRIORITY_DEFINITIONS.length} priority definitions`);

  // Control Business Areas
  const BUSINESS_AREAS = [
    { id: "ba-website", name: "Website & App", sortOrder: 1 },
    { id: "ba-underwriting", name: "Underwriting", sortOrder: 2 },
    { id: "ba-customer-svc", name: "Customer Service", sortOrder: 3 },
    { id: "ba-collections", name: "Collections", sortOrder: 4 },
    { id: "ba-finance", name: "Finance", sortOrder: 5 },
    { id: "ba-it", name: "IT", sortOrder: 6 },
    { id: "ba-hr", name: "HR", sortOrder: 7 },
    { id: "ba-marketing", name: "Marketing", sortOrder: 8 },
    { id: "ba-compliance", name: "Compliance", sortOrder: 9 },
    { id: "ba-finprom", name: "Financial Promotions", sortOrder: 10 },
  ];
  for (const ba of BUSINESS_AREAS) {
    await prisma.controlBusinessArea.upsert({
      where: { id: ba.id },
      update: { name: ba.name, sortOrder: ba.sortOrder },
      create: ba,
    });
  }
  console.log(`  ✓ ${BUSINESS_AREAS.length} control business areas`);

  // CCRO Review data — update existing attestations with CCRO review decisions
  const existingAttestations = await prisma.controlAttestation.findMany({
    where: { attested: true },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    take: 10,
  });

  if (existingAttestations.length > 0) {
    let reviewed = 0;
    for (let i = 0; i < existingAttestations.length; i++) {
      const att = existingAttestations[i];
      if (i < 3) {
        // First 3: CCRO agrees
        await prisma.controlAttestation.update({
          where: { id: att.id },
          data: {
            ccroReviewedById: "user-rob",
            ccroReviewedAt: new Date(),
            ccroAgreement: true,
            ccroComments: i === 0
              ? "Control operating effectively, no concerns."
              : i === 1
                ? "Reviewed and confirmed — consistent with testing results."
                : null,
          },
        });
        reviewed++;
      } else if (i < 5) {
        // Next 2: CCRO disagrees
        await prisma.controlAttestation.update({
          where: { id: att.id },
          data: {
            ccroReviewedById: "user-cath",
            ccroReviewedAt: new Date(),
            ccroAgreement: false,
            ccroComments: i === 3
              ? "Evidence does not support the attestation — control execution gaps identified during testing."
              : "Attestation conflicts with recent audit findings. Recommend remediation before next period.",
          },
        });
        reviewed++;
      }
      // Remaining: left unreviewed (pending)
    }
    console.log(`  ✓ ${reviewed} attestation CCRO reviews (3 agreed, 2 disagreed, rest pending)`);
  } else {
    console.log("  ⓘ No existing attestations found — skipping CCRO review seed data");
  }

  // ── Control Types ────────────────────────────────────────────────────────
  // Update existing controls with controlType values
  const existingControls = await prisma.control.findMany({ orderBy: { controlRef: "asc" } });
  const controlTypes: ("PREVENTATIVE" | "DETECTIVE" | "CORRECTIVE" | "DIRECTIVE")[] = [
    "PREVENTATIVE", "DETECTIVE", "CORRECTIVE", "DIRECTIVE",
  ];
  let typesUpdated = 0;
  for (let i = 0; i < existingControls.length; i++) {
    const ctrl = existingControls[i];
    if (!ctrl.controlType) {
      await prisma.control.update({
        where: { id: ctrl.id },
        data: { controlType: controlTypes[i % controlTypes.length] },
      });
      typesUpdated++;
    }
  }
  if (typesUpdated > 0) {
    console.log(`  ✓ ${typesUpdated} controls updated with controlType`);
  }

  // ── Control Change Proposals ────────────────────────────────────────────
  // Seed a few ControlChange records if controls exist and no changes yet
  if (existingControls.length >= 2) {
    const existingChanges = await prisma.controlChange.count();
    if (existingChanges === 0) {
      const ctrl1 = existingControls[0];
      const ctrl2 = existingControls[1];

      await prisma.controlChange.createMany({
        data: [
          {
            controlId: ctrl1.id,
            proposedBy: "user-ash",
            fieldChanged: "controlDescription",
            oldValue: ctrl1.controlDescription.substring(0, 100),
            newValue: "Updated description with more detail on the review steps and escalation process.",
            rationale: "Current description is too vague — stakeholders need clearer guidance on what the review entails.",
            status: "PENDING",
          },
          {
            controlId: ctrl1.id,
            proposedBy: "user-micha",
            fieldChanged: "controlFrequency",
            oldValue: ctrl1.controlFrequency,
            newValue: "QUARTERLY",
            rationale: "Monthly frequency is excessive for this control; quarterly aligns with reporting cycle.",
            status: "APPROVED",
            reviewedBy: "user-rob",
            reviewedAt: new Date(),
            reviewNote: "Agreed — quarterly is more proportionate.",
          },
          {
            controlId: ctrl2.id,
            proposedBy: "user-chris",
            fieldChanged: "controlName",
            oldValue: ctrl2.controlName,
            newValue: `${ctrl2.controlName} (Enhanced)`,
            rationale: "Renaming to reflect the expanded scope after the Q4 review.",
            status: "REJECTED",
            reviewedBy: "user-cath",
            reviewedAt: new Date(),
            reviewNote: "Name change not warranted — scope expansion should be reflected in description instead.",
          },
        ],
      });
      console.log("  ✓ 3 control change proposals seeded (1 pending, 1 approved, 1 rejected)");
    }
  }

  // ── Action–Control Links ────────────────────────────────────────────────
  // Link a couple of existing actions to controls if they exist
  if (existingControls.length >= 1) {
    const unlinkdActions = await prisma.action.findMany({
      where: { controlId: null },
      take: 2,
    });
    let linked = 0;
    for (let i = 0; i < Math.min(unlinkdActions.length, 2); i++) {
      const ctrl = existingControls[i % existingControls.length];
      await prisma.action.update({
        where: { id: unlinkdActions[i].id },
        data: { controlId: ctrl.id },
      });
      linked++;
    }
    if (linked > 0) {
      console.log(`  ✓ ${linked} actions linked to controls`);
    }
  }

  // ── Risk Acceptance Module ──────────────────────────────────────────────
  // Get existing risks for linking
  const existingRisks = await prisma.risk.findMany({ take: 6, orderBy: { reference: "asc" } });
  const existingOutcomes = await prisma.consumerDutyOutcome.findMany({ take: 2 });

  const RA_SEED: {
    id: string; reference: string; title: string; description: string;
    source: "RISK_REGISTER" | "CONTROL_TESTING" | "INCIDENT" | "AD_HOC";
    status: "PROPOSED" | "CCRO_REVIEW" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | "RETURNED" | "EXPIRED";
    riskId: string | null; proposerId: string; approverId: string | null;
    proposedRationale: string; proposedConditions: string | null;
    approverRationale: string | null; ccroNote: string | null;
    reviewDate: Date | null; approvedAt: Date | null; rejectedAt: Date | null; expiredAt: Date | null;
    consumerDutyOutcomeId: string | null; linkedActionIds: string[];
  }[] = [
    // 1. EXPIRED — linked to first risk, approved by CEO, past review date
    {
      id: "ra-001", reference: "RA-001", title: "Accept elevated credit impairment risk",
      description: "Residual risk on credit impairments exceeds very low appetite due to macroeconomic conditions. Board accepts risk temporarily pending economic stabilisation.",
      source: "RISK_REGISTER", status: "EXPIRED",
      riskId: existingRisks[0]?.id ?? null, proposerId: "user-rob", approverId: "user-ceo",
      proposedRationale: "Current macroeconomic environment makes it impractical to reduce residual risk below appetite threshold. Impairment provisioning has been increased and stress testing shows the firm can absorb the elevated risk.",
      proposedConditions: "1. Monthly monitoring of impairment rates\n2. Quarterly Board update\n3. Trigger review if impairment rate exceeds 5%",
      approverRationale: "Accepted on the basis that monitoring conditions are met and quarterly updates provided to the Board.",
      ccroNote: "Recommend acceptance — risk is well understood and mitigated by increased provisioning.",
      reviewDate: new Date("2025-12-01"), approvedAt: new Date("2025-09-15"), rejectedAt: null, expiredAt: new Date("2025-12-02"),
      consumerDutyOutcomeId: existingOutcomes[0]?.id ?? null, linkedActionIds: [],
    },
    // 2. AWAITING_APPROVAL — linked to risk → CEO
    {
      id: "ra-002", reference: "RA-002", title: "Accept residual operational resilience gap",
      description: "Third-party dependency on cloud provider creates a residual risk that cannot be fully mitigated within current architecture.",
      source: "RISK_REGISTER", status: "AWAITING_APPROVAL",
      riskId: existingRisks[1]?.id ?? null, proposerId: "user-cath", approverId: "user-ceo",
      proposedRationale: "Full multi-cloud redundancy would cost £2.4M annually with marginal risk reduction. Current DR capabilities meet regulatory requirements. Alternative mitigation through enhanced monitoring and faster failover is in place.",
      proposedConditions: "1. Annual DR testing\n2. SLA review with provider bi-annually\n3. Exit strategy maintained and tested",
      approverRationale: null, ccroNote: "Cost-benefit analysis supports acceptance. DR capabilities are adequate.",
      reviewDate: new Date("2026-09-01"), approvedAt: null, rejectedAt: null, expiredAt: null,
      consumerDutyOutcomeId: null, linkedActionIds: [],
    },
    // 3. AWAITING_APPROVAL — standalone from control testing → user-micha (CFO proxy)
    {
      id: "ra-003", reference: "RA-003", title: "Accept control testing gap in marketing approvals",
      description: "Control testing identified that marketing approval controls are partially effective. Full automation not feasible until Q3 2026.",
      source: "CONTROL_TESTING", status: "AWAITING_APPROVAL",
      riskId: null, proposerId: "user-rob", approverId: "user-micha",
      proposedRationale: "The partially effective control rating stems from manual steps in the approval chain. A digital approval workflow is in development (target Q3 2026). Interim manual checks provide adequate, if imperfect, coverage.",
      proposedConditions: "1. Manual spot checks weekly\n2. Digital workflow go-live by 30 Sep 2026\n3. Monthly reporting on approval turnaround times",
      approverRationale: null, ccroNote: "Interim risk is low given manual checks. Recommend acceptance with conditions.",
      reviewDate: new Date("2026-10-01"), approvedAt: null, rejectedAt: null, expiredAt: null,
      consumerDutyOutcomeId: existingOutcomes[1]?.id ?? null, linkedActionIds: [],
    },
    // 4. CCRO_REVIEW — linked to risk, proposed by cath, not yet routed
    {
      id: "ra-004", reference: "RA-004", title: "Accept elevated fraud detection latency",
      description: "Real-time fraud detection has a 4-second latency against a 2-second target. Remediation requires infrastructure investment.",
      source: "RISK_REGISTER", status: "CCRO_REVIEW",
      riskId: existingRisks[2]?.id ?? null, proposerId: "user-cath", approverId: null,
      proposedRationale: "Infrastructure upgrade to reduce latency below 2 seconds is scheduled for Q2 2026. Current 4-second latency still catches 97% of fraud within the transaction window. Additional manual review layer covers the gap.",
      proposedConditions: null, approverRationale: null, ccroNote: null,
      reviewDate: null, approvedAt: null, rejectedAt: null, expiredAt: null,
      consumerDutyOutcomeId: null, linkedActionIds: [],
    },
    // 5. APPROVED — linked to existing risk, future review date
    {
      id: "ra-005", reference: "RA-005", title: "Accept data residency risk in EU processing",
      description: "Certain customer data is processed through EU-based servers creating a cross-border transfer risk under UK GDPR.",
      source: "RISK_REGISTER", status: "APPROVED",
      riskId: existingRisks[3]?.id ?? null, proposerId: "user-rob", approverId: "user-ceo",
      proposedRationale: "Standard contractual clauses and supplementary measures are in place. ICO guidance followed. Risk is well-documented and compliant with current regulatory framework.",
      proposedConditions: "1. Annual review of SCCs\n2. Monitor ICO guidance updates\n3. Data Protection Impact Assessment maintained",
      approverRationale: "Accepted. The legal framework and safeguards are robust. Annual review is appropriate.",
      ccroNote: "Legal team confirms compliance posture is strong.",
      reviewDate: new Date("2026-06-15"), approvedAt: new Date("2026-01-10"), rejectedAt: null, expiredAt: null,
      consumerDutyOutcomeId: null, linkedActionIds: [],
    },
    // 6. APPROVED — linked to existing risk, future review date
    {
      id: "ra-006", reference: "RA-006", title: "Accept customer communication delay risk",
      description: "System-generated customer communications have a 24-hour SLA against a 4-hour target for certain complaint categories.",
      source: "INCIDENT", status: "APPROVED",
      riskId: existingRisks[4]?.id ?? null, proposerId: "user-cath", approverId: "user-ash",
      proposedRationale: "Legacy system limitations prevent sub-4-hour automated responses for complex complaint types. Manual escalation process ensures no customer is left without response beyond 24 hours. System replacement planned for H2 2026.",
      proposedConditions: "1. Manual escalation for P1 complaints within 2 hours\n2. Weekly reporting on SLA breaches\n3. System replacement by Dec 2026",
      approverRationale: "The interim manual process is adequate. Accepted with the condition that the system replacement stays on track.",
      ccroNote: "Consumer Duty implications noted. Manual process mitigates customer harm.",
      reviewDate: new Date("2026-08-01"), approvedAt: new Date("2026-01-20"), rejectedAt: null, expiredAt: null,
      consumerDutyOutcomeId: existingOutcomes[0]?.id ?? null, linkedActionIds: [],
    },
  ];

  for (const ra of RA_SEED) {
    await prisma.riskAcceptance.upsert({
      where: { id: ra.id },
      update: {
        title: ra.title, description: ra.description, source: ra.source, status: ra.status,
        riskId: ra.riskId, proposerId: ra.proposerId, approverId: ra.approverId,
        proposedRationale: ra.proposedRationale, proposedConditions: ra.proposedConditions,
        approverRationale: ra.approverRationale, ccroNote: ra.ccroNote,
        reviewDate: ra.reviewDate, approvedAt: ra.approvedAt, rejectedAt: ra.rejectedAt, expiredAt: ra.expiredAt,
        consumerDutyOutcomeId: ra.consumerDutyOutcomeId, linkedActionIds: ra.linkedActionIds,
      },
      create: ra,
    });
  }
  console.log(`  ✓ ${RA_SEED.length} risk acceptances`);

  // Link some existing actions to risk acceptances
  const existingActions = await prisma.action.findMany({ take: 6, orderBy: { reference: "asc" } });
  if (existingActions.length >= 3) {
    // RA-001 (EXPIRED) — link 2 actions (monitoring-related)
    await prisma.riskAcceptance.update({
      where: { id: "ra-001" },
      data: { linkedActionIds: [existingActions[0].id, existingActions[1].id] },
    });
    // RA-005 (APPROVED) — link 1 action
    await prisma.riskAcceptance.update({
      where: { id: "ra-005" },
      data: { linkedActionIds: [existingActions[2].id] },
    });
    // RA-006 (APPROVED) — link 2 actions
    if (existingActions.length >= 5) {
      await prisma.riskAcceptance.update({
        where: { id: "ra-006" },
        data: { linkedActionIds: [existingActions[3].id, existingActions[4].id] },
      });
    }
    console.log("  ✓ Linked actions to risk acceptances");
  }

  // Risk Acceptance Comments
  const RA_COMMENTS: { id: string; acceptanceId: string; userId: string; content: string; createdAt: Date }[] = [
    { id: "rac-001", acceptanceId: "ra-001", userId: "user-rob", content: "Impairment provisioning has been increased by 15% as a precautionary measure.", createdAt: new Date("2025-09-10") },
    { id: "rac-002", acceptanceId: "ra-001", userId: "user-ceo", content: "Board has been briefed. Quarterly updates confirmed.", createdAt: new Date("2025-09-16") },
    { id: "rac-003", acceptanceId: "ra-002", userId: "user-cath", content: "DR testing results from January show 99.7% recovery within RTO targets.", createdAt: new Date("2026-01-25") },
    { id: "rac-004", acceptanceId: "ra-002", userId: "user-rob", content: "Cloud provider SLA review completed. No material changes to service commitments.", createdAt: new Date("2026-02-05") },
    { id: "rac-005", acceptanceId: "ra-003", userId: "user-rob", content: "Interim manual spot check results show 94% compliance rate. Acceptable for the transition period.", createdAt: new Date("2026-02-01") },
    { id: "rac-006", acceptanceId: "ra-005", userId: "user-ceo", content: "ICO confirmed no changes to their adequacy stance. SCCs remain valid.", createdAt: new Date("2026-01-15") },
    { id: "rac-007", acceptanceId: "ra-006", userId: "user-ash", content: "Weekly SLA breach reports show improvement — down from 12% to 3% since manual escalation process implemented.", createdAt: new Date("2026-02-10") },
  ];

  for (const c of RA_COMMENTS) {
    await prisma.riskAcceptanceComment.upsert({
      where: { id: c.id },
      update: { content: c.content, userId: c.userId },
      create: c,
    });
  }
  console.log(`  ✓ ${RA_COMMENTS.length} risk acceptance comments`);

  // Risk Acceptance History
  const RA_HISTORY: { id: string; acceptanceId: string; userId: string | null; action: string; fromStatus: string | null; toStatus: string | null; details: string; createdAt: Date }[] = [
    // RA-001 story: PROPOSED → CCRO_REVIEW → AWAITING_APPROVAL → APPROVED → EXPIRED
    { id: "rah-001", acceptanceId: "ra-001", userId: "user-rob", action: "CREATED", fromStatus: null, toStatus: "PROPOSED", details: "Risk acceptance RA-001 proposed: Accept elevated credit impairment risk", createdAt: new Date("2025-09-01") },
    { id: "rah-002", acceptanceId: "ra-001", userId: "user-rob", action: "SUBMIT_FOR_REVIEW", fromStatus: "PROPOSED", toStatus: "CCRO_REVIEW", details: "Submitted for CCRO review", createdAt: new Date("2025-09-02") },
    { id: "rah-003", acceptanceId: "ra-001", userId: "user-rob", action: "ROUTE_TO_APPROVER", fromStatus: "CCRO_REVIEW", toStatus: "AWAITING_APPROVAL", details: "Routed to Aseem for approval", createdAt: new Date("2025-09-10") },
    { id: "rah-004", acceptanceId: "ra-001", userId: "user-ceo", action: "APPROVE", fromStatus: "AWAITING_APPROVAL", toStatus: "APPROVED", details: "Approved with monitoring conditions", createdAt: new Date("2025-09-15") },
    { id: "rah-005", acceptanceId: "ra-001", userId: null, action: "EXPIRE", fromStatus: "APPROVED", toStatus: "EXPIRED", details: "Review date 2025-12-01 has passed. Acceptance expired.", createdAt: new Date("2025-12-02") },
    // RA-002 story: PROPOSED → CCRO_REVIEW → AWAITING_APPROVAL
    { id: "rah-006", acceptanceId: "ra-002", userId: "user-cath", action: "CREATED", fromStatus: null, toStatus: "PROPOSED", details: "Risk acceptance RA-002 proposed: Accept residual operational resilience gap", createdAt: new Date("2026-01-15") },
    { id: "rah-007", acceptanceId: "ra-002", userId: "user-rob", action: "SUBMIT_FOR_REVIEW", fromStatus: "PROPOSED", toStatus: "CCRO_REVIEW", details: "Submitted for CCRO review", createdAt: new Date("2026-01-16") },
    { id: "rah-008", acceptanceId: "ra-002", userId: "user-rob", action: "ROUTE_TO_APPROVER", fromStatus: "CCRO_REVIEW", toStatus: "AWAITING_APPROVAL", details: "Routed to Aseem for approval", createdAt: new Date("2026-01-20") },
    // RA-003 story: PROPOSED → CCRO_REVIEW → AWAITING_APPROVAL
    { id: "rah-009", acceptanceId: "ra-003", userId: "user-rob", action: "CREATED", fromStatus: null, toStatus: "PROPOSED", details: "Risk acceptance RA-003 proposed: Accept control testing gap in marketing approvals", createdAt: new Date("2026-01-25") },
    { id: "rah-010", acceptanceId: "ra-003", userId: "user-rob", action: "SUBMIT_FOR_REVIEW", fromStatus: "PROPOSED", toStatus: "CCRO_REVIEW", details: "Submitted for CCRO review", createdAt: new Date("2026-01-26") },
    { id: "rah-011", acceptanceId: "ra-003", userId: "user-rob", action: "ROUTE_TO_APPROVER", fromStatus: "CCRO_REVIEW", toStatus: "AWAITING_APPROVAL", details: "Routed to Micha for approval", createdAt: new Date("2026-01-28") },
    // RA-004 story: PROPOSED → CCRO_REVIEW
    { id: "rah-012", acceptanceId: "ra-004", userId: "user-cath", action: "CREATED", fromStatus: null, toStatus: "PROPOSED", details: "Risk acceptance RA-004 proposed: Accept elevated fraud detection latency", createdAt: new Date("2026-02-10") },
    { id: "rah-013", acceptanceId: "ra-004", userId: "user-rob", action: "SUBMIT_FOR_REVIEW", fromStatus: "PROPOSED", toStatus: "CCRO_REVIEW", details: "Submitted for CCRO review", createdAt: new Date("2026-02-11") },
    // RA-005 story: PROPOSED → CCRO_REVIEW → AWAITING_APPROVAL → APPROVED
    { id: "rah-014", acceptanceId: "ra-005", userId: "user-rob", action: "CREATED", fromStatus: null, toStatus: "PROPOSED", details: "Risk acceptance RA-005 proposed: Accept data residency risk in EU processing", createdAt: new Date("2025-12-15") },
    { id: "rah-015", acceptanceId: "ra-005", userId: "user-rob", action: "SUBMIT_FOR_REVIEW", fromStatus: "PROPOSED", toStatus: "CCRO_REVIEW", details: "Submitted for CCRO review", createdAt: new Date("2025-12-16") },
    { id: "rah-016", acceptanceId: "ra-005", userId: "user-rob", action: "ROUTE_TO_APPROVER", fromStatus: "CCRO_REVIEW", toStatus: "AWAITING_APPROVAL", details: "Routed to Aseem for approval", createdAt: new Date("2026-01-05") },
    { id: "rah-017", acceptanceId: "ra-005", userId: "user-ceo", action: "APPROVE", fromStatus: "AWAITING_APPROVAL", toStatus: "APPROVED", details: "Approved. Legal framework and safeguards are robust.", createdAt: new Date("2026-01-10") },
    // RA-006 story: PROPOSED → CCRO_REVIEW → AWAITING_APPROVAL → APPROVED
    { id: "rah-018", acceptanceId: "ra-006", userId: "user-cath", action: "CREATED", fromStatus: null, toStatus: "PROPOSED", details: "Risk acceptance RA-006 proposed: Accept customer communication delay risk", createdAt: new Date("2026-01-05") },
    { id: "rah-019", acceptanceId: "ra-006", userId: "user-rob", action: "SUBMIT_FOR_REVIEW", fromStatus: "PROPOSED", toStatus: "CCRO_REVIEW", details: "Submitted for CCRO review", createdAt: new Date("2026-01-06") },
    { id: "rah-020", acceptanceId: "ra-006", userId: "user-rob", action: "ROUTE_TO_APPROVER", fromStatus: "CCRO_REVIEW", toStatus: "AWAITING_APPROVAL", details: "Routed to Ash for approval", createdAt: new Date("2026-01-15") },
    { id: "rah-021", acceptanceId: "ra-006", userId: "user-ash", action: "APPROVE", fromStatus: "AWAITING_APPROVAL", toStatus: "APPROVED", details: "Interim manual process is adequate. Accepted with conditions.", createdAt: new Date("2026-01-20") },
  ];

  for (const h of RA_HISTORY) {
    await prisma.riskAcceptanceHistory.upsert({
      where: { id: h.id },
      update: { action: h.action, details: h.details, fromStatus: h.fromStatus, toStatus: h.toStatus },
      create: h,
    });
  }
  console.log(`  ✓ ${RA_HISTORY.length} risk acceptance history entries`);

  // ── Policy Review Module ──────────────────────────────────────────────

  // Clean up all policy and regulation data before re-seeding
  await prisma.policyAuditLog.deleteMany({});
  await prisma.policyObligation.deleteMany({});
  await prisma.policyControlLink.deleteMany({});
  await prisma.policyRegulatoryLink.deleteMany({});
  await prisma.policy.deleteMany({});
  // Delete old regulation links and regulations (both old FCA-xxx scheme and new CU-xxxx if re-running)
  await prisma.regulationControlLink.deleteMany({});
  await prisma.regulation.deleteMany({});
  console.log("  ✓ Cleaned all policy and regulation data");

  // ── Compliance Universe (328 regulations, 4-level hierarchy from CSV) ─────

  // Helper type
  type CUSeed = {
    id: string; reference: string; name: string; shortName: string | null;
    body: string; type: "HANDBOOK_RULE" | "PRINCIPLE" | "LEGISLATION" | "STATUTORY_INSTRUMENT" | "GUIDANCE" | "INDUSTRY_CODE";
    provisions: string | null; url: string | null; description: string | null;
    parentId: string | null; level: number;
    regulatoryBody: string | null;
    applicability: "CORE" | "HIGH" | "MEDIUM" | "LOW" | "N_A" | "ASSESS";
    applicabilityNotes: string | null;
    isApplicable: boolean;
    primarySMF: string | null; secondarySMF: string | null; smfNotes: string | null;
    complianceStatus: "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_ASSESSED" | "GAP_IDENTIFIED";
  };

  const CU_SEED: CUSeed[] = [
    { id: "cu-0001", reference: "PRIN", name: "FCA Principles for Businesses", shortName: "PRIN", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN", description: "The 12 FCA Principles that are fundamental obligations of all authorised firms. These are high-level standards that underpin the entire regulatory framework.", parentId: null, level: 1, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "All principles apply to Updraft as an FCA-authorised firm", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0002", reference: "PRIN 1", name: "Principle 1 — Integrity", shortName: "Integrity", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must conduct its business with integrity.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Fundamental obligation", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0003", reference: "PRIN 2", name: "Principle 2 — Skill, Care and Diligence", shortName: "Skill/Care/Diligence", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must conduct its business with due skill, care and diligence.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Fundamental obligation", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0004", reference: "PRIN 3", name: "Principle 3 — Management and Control", shortName: "Management/Control", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must take reasonable care to organise and control its affairs responsibly and effectively, with adequate risk management systems.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Governance and risk management", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0005", reference: "PRIN 4", name: "Principle 4 — Financial Prudence", shortName: "Financial Prudence", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must maintain adequate financial resources.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Capital adequacy", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0006", reference: "PRIN 5", name: "Principle 5 — Market Conduct", shortName: "Market Conduct", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must observe proper standards of market conduct.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "MEDIUM", applicabilityNotes: "Less directly relevant for consumer credit but applies to business conduct", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0007", reference: "PRIN 6", name: "Principle 6 — Customers' Interests", shortName: "Customers' Interests (TCF)", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must pay due regard to the interests of its customers and treat them fairly.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "TCF — fundamental to consumer lending", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0008", reference: "PRIN 7", name: "Principle 7 — Communications with Clients", shortName: "Communications", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must pay due regard to the information needs of its clients, and communicate information to them in a way which is clear, fair and not misleading.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "All customer communications", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0009", reference: "PRIN 8", name: "Principle 8 — Conflicts of Interest", shortName: "Conflicts of Interest", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must manage conflicts of interest fairly, both between itself and its customers and between a customer and another client.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Relevant to product design and intermediary relationships", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0010", reference: "PRIN 9", name: "Principle 9 — Customers: Relationships of Trust", shortName: "Relationships of Trust", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must take reasonable care to ensure the suitability of its advice and discretionary decisions for any customer who is entitled to rely upon its judgment.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "MEDIUM", applicabilityNotes: "Applies where advice-like interactions occur", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0011", reference: "PRIN 10", name: "Principle 10 — Clients' Assets", shortName: "Clients' Assets", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must arrange adequate protection for clients' assets when it is responsible for them.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "LOW", applicabilityNotes: "Updraft does not typically hold client assets", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0012", reference: "PRIN 11", name: "Principle 11 — Relations with Regulators", shortName: "Relations with Regulators", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must deal with its regulators in an open and cooperative way, and must disclose to the FCA appropriately anything relating to the firm of which that regulator would reasonably expect notice.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Ongoing regulatory relationship", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0013", reference: "PRIN 12", name: "Principle 12 — Consumer Duty", shortName: "Consumer Duty", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must act to deliver good outcomes for retail customers.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Central regulatory priority — see PRIN 2A for detail", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0014", reference: "PRIN 2A", name: "Consumer Duty — Detailed Requirements", shortName: "Consumer Duty Detail", body: "FCA", type: "PRINCIPLE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PRIN/2A", description: "Detailed requirements implementing the Consumer Duty across all four outcomes, cross-cutting rules, and governance obligations.", parentId: "cu-0001", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Central regulatory priority for all consumer-facing firms", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0015", reference: "PRIN 2A.1", name: "Consumer Duty — Application", shortName: "CD Application", body: "FCA", type: "PRINCIPLE", provisions: null, url: null, description: "Application provisions: applies to products and services offered to retail customers, including existing products.", parentId: "cu-0014", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Defines scope of Duty", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0016", reference: "PRIN 2A.2", name: "Consumer Duty — Cross-Cutting Rules", shortName: "CD Cross-Cutting", body: "FCA", type: "PRINCIPLE", provisions: null, url: null, description: "Act in good faith toward retail customers; avoid causing foreseeable harm; enable and support retail customers to pursue their financial objectives.", parentId: "cu-0014", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Three overarching obligations", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0017", reference: "PRIN 2A.3", name: "Outcome 1 — Products and Services", shortName: "CD Products/Services", body: "FCA", type: "PRINCIPLE", provisions: null, url: null, description: "Products and services must be designed to meet the needs, characteristics and objectives of the target market. Distribution must be appropriate.", parentId: "cu-0014", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Loan product design and target market", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0018", reference: "PRIN 2A.4", name: "Outcome 2 — Price and Value", shortName: "CD Price/Value", body: "FCA", type: "PRINCIPLE", provisions: null, url: null, description: "Price of products and services must represent fair value for retail customers. Firms must assess and evidence fair value.", parentId: "cu-0014", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "APR, fees, total cost of credit assessment", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0019", reference: "PRIN 2A.5", name: "Outcome 3 — Consumer Understanding", shortName: "CD Understanding", body: "FCA", type: "PRINCIPLE", provisions: null, url: null, description: "Firms must support customer understanding — communications must equip consumers to make effective, timely and properly informed decisions.", parentId: "cu-0014", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "All customer communications, financial promotions", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0020", reference: "PRIN 2A.6", name: "Outcome 4 — Consumer Support", shortName: "CD Support", body: "FCA", type: "PRINCIPLE", provisions: null, url: null, description: "Firms must provide a level of support that meets consumers' needs throughout the product lifecycle, including post-sale and when in difficulty.", parentId: "cu-0014", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Customer service, arrears, complaints", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0021", reference: "PRIN 2A.7", name: "Consumer Duty — Governance and Oversight", shortName: "CD Governance", body: "FCA", type: "PRINCIPLE", provisions: null, url: null, description: "Board/governing body must review and approve the firm's assessment of whether it is delivering good outcomes. Annual board report.", parentId: "cu-0014", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Board-level Consumer Duty reporting", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0022", reference: "PRIN 2A.8", name: "Consumer Duty — Monitoring Outcomes", shortName: "CD Monitoring", body: "FCA", type: "PRINCIPLE", provisions: null, url: null, description: "Firms must monitor outcomes, identify where customers or groups are not receiving good outcomes, and take action.", parentId: "cu-0014", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "MI, outcome testing, root cause analysis", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0023", reference: "PRIN 2A.9", name: "Consumer Duty — Management Information", shortName: "CD MI", body: "FCA", type: "PRINCIPLE", provisions: null, url: null, description: "Firms must produce and review adequate MI on outcomes for retail customers to identify poor outcomes and take action.", parentId: "cu-0014", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Dashboard MI, reporting to ExCo and Board", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer Duty (PRIN 2A) is PR-T — allocated to SMF16. SMF1 has overall executive accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0024", reference: "CONC", name: "FCA Consumer Credit Sourcebook", shortName: "CONC", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/CONC", description: "The primary FCA sourcebook governing consumer credit activities. Contains detailed rules and guidance on conduct of business, financial promotions, creditworthiness, arrears and collections.", parentId: null, level: 1, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Primary sourcebook for Updraft's consumer lending activities", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0025", reference: "CONC 1", name: "Application and Purpose", shortName: "CONC 1 App/Purpose", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Sets out what firms and activities the CONC sourcebook applies to.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Defines scope of CONC applicability", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0026", reference: "CONC 2", name: "Conduct of Business Standards", shortName: "CONC 2 CoB", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "General conduct of business rules for consumer credit firms including pre-contractual requirements, adequate explanations, distance marketing, unfair business practices and mental capacity.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Day-to-day conduct of lending business", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0027", reference: "CONC 2.2", name: "Conduct of business: general", shortName: "CONC 2.2", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "General conduct standards — firms must not pursue a practice of lending more than a customer can afford, or impose charges excessive for the service provided.", parentId: "cu-0026", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "General conduct standards", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0028", reference: "CONC 2.3", name: "Pre-contractual requirements: general", shortName: "CONC 2.3", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Pre-contractual requirements including level of information to be provided and timing.", parentId: "cu-0026", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Pre-contract disclosure obligations", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0029", reference: "CONC 2.4", name: "Pre-contract credit information (SECCI)", shortName: "CONC 2.4", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirement to provide Standard European Consumer Credit Information (SECCI) form before agreement. Prescribed format and content.", parentId: "cu-0026", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "SECCI form — mandatory pre-contract document", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0030", reference: "CONC 2.5", name: "Adequate explanations", shortName: "CONC 2.5", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirement to provide adequate explanations to enable borrowers to assess whether the agreement is suited to their needs and financial situation.", parentId: "cu-0026", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Key lending obligation — adequate explanations before contract", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0031", reference: "CONC 2.6", name: "Conduct of business: credit brokers", shortName: "CONC 2.6", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for credit brokers including disclosure of status, commission and relationship with lenders.", parentId: "cu-0026", level: 3, regulatoryBody: "FCA", applicability: "MEDIUM", applicabilityNotes: "Relevant if Updraft uses broker channels or acts as broker", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0032", reference: "CONC 2.7", name: "Distance marketing", shortName: "CONC 2.7", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Additional requirements for distance contracts including pre-contract information and right to cancel.", parentId: "cu-0026", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Updraft primarily operates online — distance marketing rules apply", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0033", reference: "CONC 2.8", name: "Unfair business practices", shortName: "CONC 2.8", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Prohibition on unfair, misleading and aggressive commercial practices in relation to consumer credit.", parentId: "cu-0026", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Underpins all business conduct", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0034", reference: "CONC 2.9", name: "Unfair business practices: supplementary", shortName: "CONC 2.9", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Supplementary provisions on unfair practices including pressure selling, exploiting vulnerability, bundling.", parentId: "cu-0026", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Extends unfair practices protections", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0035", reference: "CONC 2.10", name: "Mental capacity guidance", shortName: "CONC 2.10", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Guidance on dealing with customers who may lack mental capacity to enter into a regulated credit agreement.", parentId: "cu-0026", level: 3, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Vulnerability and capacity considerations", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0036", reference: "CONC 3", name: "Financial Promotions and Communications", shortName: "CONC 3 Fin Proms", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Rules governing financial promotions and communications by consumer credit firms. Requires promotions to be clear, fair and not misleading. Covers representative examples, social media, and specific restrictions.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Financial Promotions Policy — already analysed in POL-FINPROM", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0037", reference: "CONC 3.1", name: "Financial promotions: application", shortName: "CONC 3.1 App", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Application and scope of financial promotions rules. What constitutes a financial promotion.", parentId: "cu-0036", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Defines what is caught by fin prom rules", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0038", reference: "CONC 3.2", name: "Clear, fair and not misleading rule", shortName: "CONC 3.2 CFNM", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Core rule: a financial promotion must be clear, fair and not misleading.", parentId: "cu-0036", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "The fundamental promotions standard", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0039", reference: "CONC 3.3", name: "Financial promotions: general requirements", shortName: "CONC 3.3 General", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "General requirements including: prominence, identification of firm, risk warnings, comparisons.", parentId: "cu-0036", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Detailed promotion standards", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0040", reference: "CONC 3.5", name: "Financial promotions: credit agreements", shortName: "CONC 3.5 Credit Ads", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Specific rules for credit agreement promotions including representative example requirements (CONC 3.5.5/3.5.6 — the 7 elements), representative APR, and total cost of credit.", parentId: "cu-0036", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Representative example and APR rules — central to Updraft's advertising", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0041", reference: "CONC 3.6", name: "High-cost short-term credit promotions", shortName: "CONC 3.6 HCSTC", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Additional promotion rules for HCSTC products including mandatory risk warnings.", parentId: "cu-0036", level: 3, regulatoryBody: "FCA", applicability: "N_A", applicabilityNotes: "Updraft is not a HCSTC provider", isApplicable: false, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0042", reference: "CONC 3.7", name: "P2P agreement promotions", shortName: "CONC 3.7 P2P", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Promotion rules specific to peer-to-peer lending agreements.", parentId: "cu-0036", level: 3, regulatoryBody: "FCA", applicability: "N_A", applicabilityNotes: "Updraft is not a P2P platform", isApplicable: false, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0043", reference: "CONC 3.8", name: "Debt counselling/management promotions", shortName: "CONC 3.8 Debt", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Promotion rules for debt counselling, debt adjusting and debt management.", parentId: "cu-0036", level: 3, regulatoryBody: "FCA", applicability: "LOW", applicabilityNotes: "May be relevant if Updraft promotes forbearance/support services", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0044", reference: "CONC 3.9", name: "Risk warnings for HCSTC", shortName: "CONC 3.9 HCSTC Warnings", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Prescribed risk warning text for high-cost short-term credit.", parentId: "cu-0036", level: 3, regulatoryBody: "FCA", applicability: "N_A", applicabilityNotes: "Not a HCSTC provider", isApplicable: false, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0045", reference: "CONC 3.10", name: "Real-time financial promotions", shortName: "CONC 3.10 Real-time", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Rules on real-time (verbal) financial promotions including telephone and face-to-face.", parentId: "cu-0036", level: 3, regulatoryBody: "FCA", applicability: "MEDIUM", applicabilityNotes: "Relevant to call centre scripts and live chat", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0046", reference: "CONC 4", name: "Pre-contractual Requirements", shortName: "CONC 4 Pre-contract", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Detailed pre-contractual disclosure requirements including timing, format and content of information to be provided before entering a credit agreement.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Pre-contract disclosures for all new loans", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0047", reference: "CONC 4.2", name: "Pre-contract disclosure and adequate explanations", shortName: "CONC 4.2", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for providing pre-contract credit information and adequate explanations to borrowers.", parentId: "cu-0046", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Must provide before agreement execution", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0048", reference: "CONC 4.3", name: "Adequate explanations: content", shortName: "CONC 4.3", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Detailed content requirements for adequate explanations: features, consequences of default, right to withdraw, etc.", parentId: "cu-0046", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Drives Updraft's pre-contract journey", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0049", reference: "CONC 5", name: "Responsible Lending", shortName: "CONC 5 Resp. Lending", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Responsible lending rules including creditworthiness assessment, affordability checks, policies and procedures. Central to consumer credit regulation.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Fundamental lending obligation — creditworthiness and affordability", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0050", reference: "CONC 5.2", name: "Creditworthiness assessment", shortName: "CONC 5.2 CWA", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Before making a regulated credit agreement, the firm must undertake a reasonable and proportionate assessment of the customer's creditworthiness.", parentId: "cu-0049", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Core underwriting obligation — credit risk + affordability", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0051", reference: "CONC 5.2A", name: "Creditworthiness assessment: further requirements", shortName: "CONC 5.2A", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Additional creditworthiness requirements including consideration of committed expenditure, income verification.", parentId: "cu-0049", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Income and expenditure verification requirements", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0052", reference: "CONC 5.3", name: "Creditworthiness: credit brokers", shortName: "CONC 5.3", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for credit brokers regarding creditworthiness information and responsible introductions.", parentId: "cu-0049", level: 3, regulatoryBody: "FCA", applicability: "MEDIUM", applicabilityNotes: "Relevant to broker partnerships", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0053", reference: "CONC 5.4", name: "Responsible lending policies and procedures", shortName: "CONC 5.4 Policies", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Firms must establish and maintain clear and effective policies and procedures for responsible lending.", parentId: "cu-0049", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Lending policy framework", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0054", reference: "CONC 5.5", name: "Affordability assessment", shortName: "CONC 5.5 Affordability", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Specific affordability requirements — firm must assess whether the customer can afford repayments without suffering adverse consequences.", parentId: "cu-0049", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Affordability — central to Updraft as a consolidation lender", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0055", reference: "CONC 6", name: "Post-contractual Requirements", shortName: "CONC 6 Post-contract", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Post-contractual obligations including statements, early settlement, right to withdraw, and general post-contract conduct.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Ongoing obligations during loan lifecycle", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0056", reference: "CONC 6.2", name: "Post-contract: general conduct", shortName: "CONC 6.2", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "General conduct obligations post-contract including fair treatment and not exploiting vulnerability.", parentId: "cu-0055", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Ongoing conduct standards", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0057", reference: "CONC 6.3", name: "Right to withdraw", shortName: "CONC 6.3 Withdrawal", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Customer's right to withdraw from a regulated credit agreement within 14 days of agreement execution.", parentId: "cu-0055", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "14-day withdrawal right — must be communicated and honoured", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0058", reference: "CONC 6.4", name: "Statements of account", shortName: "CONC 6.4 Statements", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for periodic statements of account to be provided to borrowers.", parentId: "cu-0055", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Regular statement provision", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0059", reference: "CONC 6.5", name: "Early settlement", shortName: "CONC 6.5 Settlement", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Customer's right to early settlement and the firm's obligations in calculating and communicating settlement figures.", parentId: "cu-0055", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Early repayment — frequent for consolidation loans", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0060", reference: "CONC 6.7", name: "Arrears, default and recovery", shortName: "CONC 6.7 Arrears", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements when customer falls into arrears or default — links to CONC 7.", parentId: "cu-0055", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Arrears management obligations", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0061", reference: "CONC 7", name: "Arrears, Default and Recovery", shortName: "CONC 7 Arrears/Collections", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Comprehensive rules on treatment of customers in arrears or default, debt collection practices, forbearance, and vulnerability in collections.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Collections and arrears — critical for customer outcomes", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0062", reference: "CONC 7.2", name: "Arrears: general obligations", shortName: "CONC 7.2", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "General obligations when customers are in arrears including fair treatment, communication, and forbearance consideration.", parentId: "cu-0061", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Foundation of arrears management", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0063", reference: "CONC 7.3", name: "Treatment of customers in default or arrears (including forbearance)", shortName: "CONC 7.3 Forbearance", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Detailed requirements on how to treat customers in difficulty including: forbearance options, signposting to debt advice, freezing interest/charges.", parentId: "cu-0061", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Forbearance is central to Updraft's customer outcomes", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0064", reference: "CONC 7.4", name: "Default notices", shortName: "CONC 7.4 Default", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for issuing default notices and notices of sums in arrears (NOSIA/SNOSIA).", parentId: "cu-0061", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "NOSIA/SNOSIA — known issue area for Updraft", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0065", reference: "CONC 7.5", name: "Debt collection communications and practices", shortName: "CONC 7.5 Collections", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Standards for debt collection communications — must not be oppressive, must be fair and proportionate.", parentId: "cu-0061", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Collections communication standards", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0066", reference: "CONC 7.6", name: "Exercise of continuous payment authority", shortName: "CONC 7.6 CPA", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Restrictions on use of continuous payment authority to collect payments — max 2 failed attempts before must stop.", parentId: "cu-0061", level: 3, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "CPA restrictions if used for collections", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0067", reference: "CONC 7.9", name: "Lenders' responsibilities in arrears", shortName: "CONC 7.9 Lender Resp.", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Lender-specific obligations when customers are in arrears — distinct from debt collector requirements.", parentId: "cu-0061", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Updraft's direct obligations as lender", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0068", reference: "CONC 7.10", name: "Signposting to debt advice", shortName: "CONC 7.10 Debt Advice", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Obligation to signpost customers in difficulty to free debt advice services.", parentId: "cu-0061", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Must signpost to MoneyHelper, StepChange etc.", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0069", reference: "CONC 7.11", name: "Breathing Space scheme", shortName: "CONC 7.11 Breathing Space", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements relating to the Breathing Space (Debt Respite Scheme) — freeze enforcement and charges during breathing space period.", parentId: "cu-0061", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Legal obligation to respect breathing space", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0070", reference: "CONC 7.12", name: "Forbearance and due consideration", shortName: "CONC 7.12 Forbearance", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Detailed forbearance requirements — consider reducing payments, accepting token payments, suspending charges, agreeing payment plans.", parentId: "cu-0061", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Active forbearance toolkit", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0071", reference: "CONC 7.15", name: "Customers with mental health difficulties or mental capacity limitations", shortName: "CONC 7.15 MH/Capacity", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Specific guidance on treating customers with mental health difficulties or capacity limitations during arrears and collections.", parentId: "cu-0061", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Vulnerability in collections", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0072", reference: "CONC 8", name: "Debt Advice", shortName: "CONC 8 Debt Advice", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Rules for firms providing debt counselling, debt adjusting, and debt management services.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "LOW", applicabilityNotes: "Updraft is a lender not a debt advice provider — but relevant to understanding advice interactions", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0073", reference: "CONC 9", name: "Credit Reference Agencies", shortName: "CONC 9 CRAs", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Rules on credit reference agency responsibilities and firm obligations in credit reporting.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Updraft reports to and uses CRA data — accuracy and dispute obligations", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0074", reference: "CONC 10", name: "Connected Obligations", shortName: "CONC 10", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Obligations connected to or arising from consumer credit agreements.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "MEDIUM", applicabilityNotes: "General connected requirements", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0075", reference: "CONC 11", name: "Cancellation Rights", shortName: "CONC 11 Cancellation", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Customer's right to cancel a credit agreement — implementation of CCA 1974 cancellation provisions.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Cancellation rights must be honoured", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0076", reference: "CONC 13", name: "Guidance on the duty to undertake status and affordability assessments", shortName: "CONC 13 Guidance", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "Non-binding guidance on responsible lending and affordability assessments — supplements CONC 5.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Interpretive guidance for CONC 5 obligations", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0077", reference: "CONC 14", name: "Knowledge and Competence", shortName: "CONC 14 K&C", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for staff involved in consumer credit activities to have appropriate knowledge and competence.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Staff competence for lending decisions", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0078", reference: "CONC 15", name: "Connected Lenders' Liability (Section 75)", shortName: "CONC 15 s.75", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Rules on connected lender liability under s.75 Consumer Credit Act.", parentId: "cu-0024", level: 2, regulatoryBody: "FCA", applicability: "LOW", applicabilityNotes: "Less relevant for consolidation loans but may arise", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "CONC is the primary compliance obligation — SMF16 oversees compliance. CONC 5 (responsible lending) may also involve CTO/Head of Credit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0079", reference: "SYSC", name: "FCA Senior Management Arrangements, Systems and Controls", shortName: "SYSC", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/SYSC", description: "Requirements for senior management arrangements, systems and controls, risk management, compliance, internal audit, and the SM&CR regime.", parentId: null, level: 1, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Governance and risk management framework", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0080", reference: "SYSC 3", name: "Systems and Controls", shortName: "SYSC 3 S&C", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirement for robust governance arrangements, effective processes to manage risks, and internal controls.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Foundation of governance framework", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0081", reference: "SYSC 4", name: "General organisational requirements", shortName: "SYSC 4 Org", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Organisational requirements including clear business organisation, decision-making, and responsibility allocation.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Organisational structure requirements", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0082", reference: "SYSC 5", name: "Employees, agents and other relevant persons", shortName: "SYSC 5 Employees", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for employees and agents to have necessary skills, knowledge, and expertise.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Staff capability and oversight", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0083", reference: "SYSC 6", name: "Compliance, internal audit and financial crime", shortName: "SYSC 6 Compliance/AML", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirement for compliance function, internal audit (if proportionate), and financial crime systems and controls.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Compliance function, AML/CTF controls", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0084", reference: "SYSC 7", name: "Risk assessment", shortName: "SYSC 7 Risk", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirement to maintain risk management policies and processes to identify, measure, manage and report risks.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Risk management framework — Risk Register", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0085", reference: "SYSC 9", name: "Record-keeping", shortName: "SYSC 9 Records", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements to make and retain adequate records of business and internal organisation.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Records retention — regulatory and legal", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0086", reference: "SYSC 10", name: "Conflicts of interest", shortName: "SYSC 10 Conflicts", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Systems and controls to identify and manage conflicts of interest.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Conflicts policy and management", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0087", reference: "SYSC 15A", name: "Operational Resilience", shortName: "SYSC 15A Op Resilience", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements to identify important business services, set impact tolerances, carry out mapping, and invest in resilience. Must be able to remain within tolerances during severe but plausible disruptions.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Operational resilience — applies from March 2022", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0088", reference: "SYSC 18", name: "Whistleblowing", shortName: "SYSC 18 Whistleblowing", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for whistleblowing arrangements — internal reporting channels and protections.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Whistleblowing policy and champion", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0089", reference: "SYSC 22", name: "Regulatory references", shortName: "SYSC 22 Reg Refs", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for giving and requesting regulatory references for certain employees.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "MEDIUM", applicabilityNotes: "Applies to SM&CR staff", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0090", reference: "SYSC 24-28", name: "Senior Managers & Certification Regime (SM&CR)", shortName: "SM&CR", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "The SM&CR framework: senior management functions, prescribed responsibilities, certification, conduct rules, and fitness and propriety.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "SM&CR applies to Updraft as FCA-authorised firm", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0091", reference: "SYSC 24", name: "Senior management functions", shortName: "SYSC 24 SMFs", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Definition and requirements of senior management functions (SMFs) requiring FCA approval.", parentId: "cu-0090", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "SMF holders must be approved", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0092", reference: "SYSC 25", name: "Allocation of responsibilities", shortName: "SYSC 25 Responsibilities", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Allocation of prescribed responsibilities to senior managers and the responsibilities map.", parentId: "cu-0090", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Responsibilities map and SoR", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0093", reference: "SYSC 26", name: "Overall responsibility", shortName: "SYSC 26 Overall", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirement for at least one senior manager to have overall responsibility for each area of the firm.", parentId: "cu-0090", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "No gaps in accountability", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0094", reference: "SYSC 27", name: "Conduct Rules", shortName: "SYSC 27 Conduct Rules", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Individual Conduct Rules (ICRs) applying to all staff, and Senior Manager Conduct Rules (SMCRs).", parentId: "cu-0090", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "5 individual + 4 senior manager conduct rules", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0095", reference: "SYSC 28", name: "Certification Regime", shortName: "SYSC 28 Certification", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirement to certify certain staff as fit and proper at least annually.", parentId: "cu-0090", level: 3, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Annual certification of material risk-takers and customer-facing staff", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0096", reference: "COCON", name: "Code of Conduct Sourcebook", shortName: "COCON", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/COCON", description: "The FCA's Code of Conduct containing the Individual Conduct Rules and Senior Manager Conduct Rules. Must be notified to all staff.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "All staff must be trained on conduct rules", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0097", reference: "FIT", name: "Fit and Proper Test for Employees and Senior Personnel", shortName: "FIT", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/FIT", description: "Criteria for assessing fitness and propriety: honesty/integrity, competence/capability, financial soundness.", parentId: "cu-0079", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Applies to all SMF holders and certified persons", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "SMF1 has overall responsibility for governance, risk management, and SM&CR. SMF16 advises on regulatory requirements.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0098", reference: "FCA-OTHER", name: "FCA Handbook — Other Sourcebooks", shortName: "FCA Other", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Other FCA Handbook sourcebooks applicable to Updraft including General Provisions, Supervision, Training & Competence, Dispute Resolution, Product Governance, and Fees.", parentId: null, level: 1, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Various operational and reporting requirements", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0099", reference: "GEN", name: "General Provisions", shortName: "GEN", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "General provisions including statutory status disclosure, use of FCA name/logo, and general requirements.", parentId: "cu-0098", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Status disclosure and general compliance", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0100", reference: "GEN 4", name: "Statutory status disclosure", shortName: "GEN 4 Status", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirement to disclose FCA-authorised status in communications.", parentId: "cu-0098", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Must include on letters and electronic equivalents", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0101", reference: "GEN 5", name: "Use of FCA/PRA names and logos", shortName: "GEN 5 Logos", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Restrictions on use of FCA and PRA names and logos.", parentId: "cu-0098", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Must not use FCA/PRA logos", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0102", reference: "PROD", name: "Product Intervention and Product Governance Sourcebook", shortName: "PROD", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/PROD", description: "Product governance requirements: target market identification, product testing, distribution strategy, ongoing review. Implements Consumer Duty Outcome 1 at product level.", parentId: "cu-0098", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Product governance for loan products — target market, fair value, distribution", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0103", reference: "PROD 1", name: "Product governance: manufacturer requirements", shortName: "PROD 1 Manufacturer", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Obligations for product manufacturers: identify target market, test products, select appropriate distribution, review ongoing.", parentId: "cu-0102", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Updraft is the product manufacturer for its consolidation loan", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0104", reference: "PROD 4", name: "Product governance: credit activities", shortName: "PROD 4 Credit", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Specific product governance rules for consumer credit. Target market must be identified at a sufficiently granular level.", parentId: "cu-0102", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Consumer credit-specific product governance", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0105", reference: "SUP", name: "Supervision Manual", shortName: "SUP", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "FCA Supervision manual governing reporting, notifications, and regulatory interactions.", parentId: "cu-0098", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Reporting and notification obligations", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0106", reference: "SUP 10C", name: "FCA approved persons", shortName: "SUP 10C Approved Persons", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for individuals performing controlled functions requiring FCA approval.", parentId: "cu-0105", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "SM&CR approval process", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0107", reference: "SUP 15", name: "Notifications to the FCA", shortName: "SUP 15 Notifications", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Obligation to notify FCA of certain events including changes in control, breaches, and significant events.", parentId: "cu-0105", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Ongoing regulatory notifications", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0108", reference: "SUP 16", name: "Reporting requirements", shortName: "SUP 16 Reporting", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Regulatory reporting requirements including returns, data submissions, and annual reporting.", parentId: "cu-0105", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "RegData, annual returns, complaint returns", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0109", reference: "TC", name: "Training and Competence Sourcebook", shortName: "TC", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for training and competence of staff carrying out regulated activities.", parentId: "cu-0098", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Staff competence framework", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0110", reference: "DISP", name: "Dispute Resolution: Complaints", shortName: "DISP", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Rules on complaints handling, referral to Financial Ombudsman Service, and complaints reporting.", parentId: "cu-0098", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Complaints handling framework", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0111", reference: "DISP 1", name: "Treating complainants fairly", shortName: "DISP 1 Complaints", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Internal complaints handling: acknowledge within set timeframe, investigate thoroughly, issue final response within 8 weeks, inform of FOS right.", parentId: "cu-0110", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Complaints procedure and timelines", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0112", reference: "DISP 1.3", name: "Complaints handling rules", shortName: "DISP 1.3", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Detailed rules including complaint investigation, root cause analysis, and reporting.", parentId: "cu-0110", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Investigation and root cause analysis", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0113", reference: "DISP 1.10", name: "Complaints reporting", shortName: "DISP 1.10 Reporting", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirement to submit complaints return data to FCA.", parentId: "cu-0110", level: 3, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Biannual complaints return", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0114", reference: "DISP 2", name: "Jurisdiction of the Financial Ombudsman Service", shortName: "DISP 2 FOS", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "FOS jurisdiction — eligible complainants, time limits, types of complaint.", parentId: "cu-0110", level: 3, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Understanding FOS scope and process", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0115", reference: "FEES", name: "Fees Manual", shortName: "FEES", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "FCA and FOS fees and levies payable by authorised firms.", parentId: "cu-0098", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Annual fee obligations", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0116", reference: "COMP", name: "Compensation Sourcebook (FSCS)", shortName: "COMP / FSCS", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: "https://www.handbook.fca.org.uk/handbook/COMP", description: "Financial Services Compensation Scheme rules — consumer protection scheme of last resort. Firms contribute via annual levy.", parentId: "cu-0098", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "FSCS levy and understanding coverage (consumer credit claims up to £85k)", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0117", reference: "MIFIDPRU", name: "Prudential Requirements", shortName: "MIFIDPRU", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Prudential requirements for investment firms. May apply if Updraft has dual permissions.", parentId: "cu-0098", level: 2, regulatoryBody: "FCA", applicability: "ASSESS", applicabilityNotes: "Review whether MIFIDPRU or separate capital regime applies", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Complaints (PR-C) allocated to SMF16. DISP, FEES, SUP, TC all within compliance oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0118", reference: "FS-LEG", name: "Primary Legislation — Financial Services", shortName: "FS Legislation", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Primary Acts of Parliament governing financial services regulation, consumer credit, and market conduct in the UK.", parentId: null, level: 1, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Legislative framework underpinning FCA regulation", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0119", reference: "FSMA 2000", name: "Financial Services and Markets Act 2000", shortName: "FSMA 2000", body: "Parliament", type: "LEGISLATION", provisions: null, url: "https://www.legislation.gov.uk/ukpga/2000/8", description: "The foundational Act establishing the UK's financial regulatory framework. Grants powers to FCA, defines regulated activities, and establishes the financial promotion regime.", parentId: "cu-0118", level: 2, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Foundation of UK financial regulation", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0120", reference: "FSMA s.19", name: "General prohibition — authorisation requirement", shortName: "FSMA s.19", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "No person may carry on a regulated activity unless authorised or exempt.", parentId: "cu-0119", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Updraft must maintain FCA authorisation", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0121", reference: "FSMA s.20", name: "Contravention of the general prohibition", shortName: "FSMA s.20", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Agreements made by unauthorised persons — enforceability implications.", parentId: "cu-0119", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Maintaining authorisation scope", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0122", reference: "FSMA s.21", name: "Financial promotion restriction", shortName: "FSMA s.21", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Restriction on communicating financial promotions — promotions must be issued or approved by an authorised person.", parentId: "cu-0119", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "All financial promotions must comply", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0123", reference: "FSMA Part XI", name: "Information gathering and investigations", shortName: "FSMA Pt XI", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "FCA's powers to gather information and conduct investigations.", parentId: "cu-0119", level: 3, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Cooperation with FCA requests", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0124", reference: "FSMA Part XIV", name: "Disciplinary measures", shortName: "FSMA Pt XIV", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "FCA's powers to take disciplinary action, issue fines, and vary/cancel permissions.", parentId: "cu-0119", level: 3, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Understanding enforcement consequences", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0125", reference: "CCA 1974", name: "Consumer Credit Act 1974", shortName: "CCA 1974", body: "Parliament", type: "LEGISLATION", provisions: null, url: "https://www.legislation.gov.uk/ukpga/1974/39", description: "Primary legislation governing consumer credit agreements, including formation, content, cancellation, default, and enforcement.", parentId: "cu-0118", level: 2, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Statutory basis for consumer credit obligations", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0126", reference: "CCA Part V", name: "Entry into credit agreements", shortName: "CCA Pt V", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Requirements for entering credit agreements: form, content, copies, cancellation rights.", parentId: "cu-0125", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Agreement execution requirements", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0127", reference: "CCA s.55-55C", name: "Pre-contractual disclosure", shortName: "CCA s.55", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Pre-contract credit information (SECCI), adequate explanations, assessment of creditworthiness.", parentId: "cu-0125", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Statutory pre-contract obligations", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0128", reference: "CCA s.61-65", name: "Form and content of agreements", shortName: "CCA s.61-65", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Prescribed form and content of regulated credit agreements — improperly executed agreements may be unenforceable.", parentId: "cu-0125", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Agreement drafting — enforceability requirements", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0129", reference: "CCA s.66A", name: "Right to withdraw", shortName: "CCA s.66A", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "14-day right to withdraw from a regulated credit agreement.", parentId: "cu-0125", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "14-day withdrawal right", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0130", reference: "CCA s.77-78", name: "Duty to give information on request", shortName: "CCA s.77-78", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Customer's right to request copy of agreement and statement of account — firm must respond within 12 working days.", parentId: "cu-0125", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Subject access for credit information", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0131", reference: "CCA s.86B-86E", name: "Notices of sums in arrears (NOSIA/SNOSIA)", shortName: "CCA NOSIA", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Obligation to send notices of sums in arrears and subsequent notices at prescribed intervals.", parentId: "cu-0125", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "NOSIA/SNOSIA compliance — known issue area", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0132", reference: "CCA s.87-89", name: "Default notices", shortName: "CCA Default", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Requirements for serving default notices before taking enforcement action — prescribed form and minimum period.", parentId: "cu-0125", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Default notice requirements", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0133", reference: "CCA s.94-97", name: "Early settlement", shortName: "CCA Settlement", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Customer's right to complete early settlement and calculation of settlement rebate.", parentId: "cu-0125", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Early settlement calculations", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0134", reference: "CCA s.140A-C", name: "Unfair credit relationships", shortName: "CCA s.140A", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Court power to review and reopen unfair credit relationships — terms, practices, or conduct of the creditor.", parentId: "cu-0125", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Underpins fair value and fair treatment", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0135", reference: "FSA 2012", name: "Financial Services Act 2012", shortName: "FSA 2012", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Restructured UK financial regulation — created FCA and PRA. Amended FSMA 2000.", parentId: "cu-0118", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Structural Act — FCA's creation and powers", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0136", reference: "FSA 2021", name: "Financial Services Act 2021", shortName: "FSA 2021", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Post-Brexit amendments including FCA's rule-making powers, duty of care foundation, and prudential updates.", parentId: "cu-0118", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Expanded FCA powers and accountability", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0137", reference: "FSMA 2023", name: "Financial Services and Markets Act 2023", shortName: "FSMA 2023", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Major post-Brexit Act: revokes retained EU financial services law, new secondary international competitiveness objective for FCA, access to cash provisions.", parentId: "cu-0118", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Ongoing revocation of REUL and new FCA objectives", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Primary legislation underpins the whole framework. SMF1 has overall accountability; SMF16 advises on compliance.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0138", reference: "CONSUMER-LEG", name: "Consumer Protection Legislation", shortName: "Consumer Protection", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "UK legislation protecting consumers in relation to goods, services, unfair terms, distance selling, and commercial practices.", parentId: null, level: 1, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Applies to all customer-facing activities", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer protection legislation compliance — within compliance oversight remit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0139", reference: "CRA 2015", name: "Consumer Rights Act 2015", shortName: "CRA 2015", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Consumer rights regarding goods, digital content, services, unfair terms, and enforcement. Part 2 (unfair terms) is particularly relevant to credit agreements.", parentId: "cu-0138", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Unfair terms assessment and consumer rights", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer protection legislation compliance — within compliance oversight remit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0140", reference: "CCR 2013", name: "Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013", shortName: "CCR 2013", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Distance and off-premises contract requirements including pre-contract information, right to cancel, and additional charges restrictions.", parentId: "cu-0138", level: 2, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Updraft is primarily online — distance contract rules apply", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer protection legislation compliance — within compliance oversight remit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0141", reference: "CPRs 2008", name: "Consumer Protection from Unfair Trading Regulations 2008", shortName: "CPRs 2008", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Prohibition on unfair, misleading, and aggressive commercial practices.", parentId: "cu-0138", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Overlaps with FCA conduct rules — additional consumer protection layer", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer protection legislation compliance — within compliance oversight remit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0142", reference: "UCTA 1977", name: "Unfair Contract Terms Act 1977", shortName: "UCTA 1977", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Restrictions on contractual terms that exclude or restrict liability.", parentId: "cu-0138", level: 2, regulatoryBody: "Parliament", applicability: "MEDIUM", applicabilityNotes: "Relevant to T&Cs and limitation clauses", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer protection legislation compliance — within compliance oversight remit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0143", reference: "CCA-SIs", name: "Consumer Credit Act — Secondary Legislation", shortName: "CCA SIs", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Key statutory instruments under CCA 1974 including the Consumer Credit (Agreements) Regulations 2010, Consumer Credit (Disclosure of Information) Regulations 2010, Consumer Credit (Advertisements) Regulations 2010, Consumer Credit (Total Charge for Credit) Regulations 2010, Consumer Credit (Early Settlement) Regulations 2004.", parentId: "cu-0138", level: 2, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Detailed prescribed form, content, and calculation rules", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer protection legislation compliance — within compliance oversight remit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0144", reference: "ECRs 2002", name: "Electronic Commerce (EC Directive) Regulations 2002", shortName: "ECRs 2002", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Requirements for information society services including: identification of service provider, commercial communications, and electronic contracts.", parentId: "cu-0138", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Online lending platform requirements", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Consumer protection legislation compliance — within compliance oversight remit.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0145", reference: "DATA-PROT", name: "Data Protection, Privacy & Information Governance", shortName: "Data Protection", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "UK data protection legislation, privacy regulations, and information governance requirements. This is a known area of weakness for Updraft and requires comprehensive coverage including every principle, right, lawful basis, and controller obligation.", parentId: null, level: 1, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Extensive personal data processing in lending — known weakness area requiring focused compliance improvement", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0146", reference: "DPA 2018", name: "Data Protection Act 2018 (incorporating UK GDPR)", shortName: "DPA 2018 / UK GDPR", body: "ICO", type: "LEGISLATION", provisions: null, url: "https://www.legislation.gov.uk/ukpga/2018/12", description: "The UK's primary data protection legislation implementing the UK GDPR. Governs all processing of personal data. The UK GDPR is Schedule 1 of the DPA 2018 and has direct effect.", parentId: "cu-0145", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Updraft processes significant volumes of personal and financial data — credit applications, CRA data, affordability data, marketing data, employee data", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0147", reference: "UK GDPR Art.5", name: "The Seven Data Protection Principles", shortName: "GDPR Principles", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Article 5 sets out seven binding principles that govern all processing of personal data. These are enforceable and breach can result in fines up to £17.5m or 4% of global turnover.", parentId: "cu-0146", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Foundation of all data processing at Updraft — every processing activity must comply with all seven principles", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0148", reference: "Art.5(1)(a)", name: "Principle 1 — Lawfulness, Fairness and Transparency", shortName: "Lawfulness/Fairness/Transparency", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Personal data must be processed lawfully, fairly and in a transparent manner in relation to the data subject. Lawfulness requires a valid lawful basis under Art.6. Fairness requires that processing does not have unjustified adverse effects. Transparency requires clear, plain language privacy information.", parentId: "cu-0147", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Every processing activity needs: (1) documented lawful basis, (2) fairness assessment, (3) privacy notice coverage. Updraft must review all processing against this principle.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0149", reference: "Art.5(1)(b)", name: "Principle 2 — Purpose Limitation", shortName: "Purpose Limitation", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Personal data must be collected for specified, explicit and legitimate purposes and not further processed in a manner that is incompatible with those purposes. Further processing for archiving, scientific/historical research, or statistical purposes is permitted.", parentId: "cu-0147", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Each purpose for collecting data must be specified upfront. Cannot repurpose data (e.g. using affordability data for marketing) without compatibility assessment. Record of processing activities must document purposes.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0150", reference: "Art.5(1)(c)", name: "Principle 3 — Data Minimisation", shortName: "Data Minimisation", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Personal data must be adequate, relevant and limited to what is necessary in relation to the purposes for which it is processed.", parentId: "cu-0147", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Review all data fields collected in loan applications, CRA pulls, and marketing — are they all necessary? Particularly relevant to Open Banking data scope and CRA data fields.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0151", reference: "Art.5(1)(d)", name: "Principle 4 — Accuracy", shortName: "Accuracy", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Personal data must be accurate and, where necessary, kept up to date. Every reasonable step must be taken to ensure inaccurate data is erased or rectified without delay.", parentId: "cu-0147", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Critical for CRA reporting accuracy, customer records, and contact details. Must have processes to correct inaccurate data when notified by customers or CRAs.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0152", reference: "Art.5(1)(e)", name: "Principle 5 — Storage Limitation", shortName: "Storage Limitation", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Personal data must be kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which it is processed.", parentId: "cu-0147", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Retention policy needed for all data categories: applications (successful and declined), loan records, marketing consent, call recordings, complaints. Must balance with CCA/FCA record-keeping requirements.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0153", reference: "Art.5(1)(f)", name: "Principle 6 — Integrity and Confidentiality (Security)", shortName: "Integrity/Confidentiality", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Personal data must be processed in a manner that ensures appropriate security, including protection against unauthorised or unlawful processing and against accidental loss, destruction or damage, using appropriate technical or organisational measures.", parentId: "cu-0147", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Encryption, access controls, pseudonymisation, staff training, third-party processor security. Must be proportionate to the risk — financial data is high sensitivity.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0154", reference: "Art.5(2)", name: "Principle 7 — Accountability", shortName: "Accountability", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "The controller shall be responsible for, and be able to demonstrate compliance with, the other six principles. This is not merely a procedural requirement — it requires documented evidence of compliance.", parentId: "cu-0147", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Must maintain: records of processing, DPIAs, lawful basis documentation, privacy notices, consent records, processor agreements, breach logs, training records. Accountability is the principle most commonly breached in ICO enforcement.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0155", reference: "UK GDPR Art.6", name: "Lawful Bases for Processing", shortName: "GDPR Lawful Bases", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Article 6 provides six lawful bases for processing personal data. At least one must apply to every processing activity. The lawful basis must be identified and documented BEFORE processing begins. It cannot be changed retrospectively.", parentId: "cu-0146", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Every processing activity at Updraft must have a documented lawful basis. This is a fundamental gap if not already mapped.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0156", reference: "Art.6(1)(a)", name: "Lawful Basis 1 — Consent", shortName: "Consent", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "The data subject has given consent to the processing for one or more specific purposes. Consent must be freely given, specific, informed, and unambiguous. Must be as easy to withdraw as to give. Cannot be a precondition of service unless necessary. Must keep records of consent.", parentId: "cu-0155", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Primary basis for: marketing communications (email/SMS), cookies, optional profiling, testimonial usage. Must demonstrate consent was given — records, timestamps, specific wording shown.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0157", reference: "Art.6(1)(b)", name: "Lawful Basis 2 — Contract", shortName: "Contract", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Processing is necessary for the performance of a contract to which the data subject is party, or to take steps at the request of the data subject prior to entering into a contract.", parentId: "cu-0155", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Primary basis for: loan application processing, creditworthiness assessment, loan servicing, statements, settlement calculations, arrears management. Cannot rely on 'contract' for processing that is not genuinely necessary for the contract.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0158", reference: "Art.6(1)(c)", name: "Lawful Basis 3 — Legal Obligation", shortName: "Legal Obligation", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Processing is necessary for compliance with a legal obligation to which the controller is subject. Must be able to identify the specific legal obligation.", parentId: "cu-0155", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Basis for: regulatory reporting (FCA returns, complaints data), NOSIA/SNOSIA, tax reporting (PAYE/HMRC), AML/KYC checks, SAR submissions to NCA, CRA reporting obligations, right to work checks.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0159", reference: "Art.6(1)(d)", name: "Lawful Basis 4 — Vital Interests", shortName: "Vital Interests", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Processing is necessary to protect the vital interests of the data subject or another natural person. Essentially a life-or-death situation.", parentId: "cu-0155", level: 4, regulatoryBody: "ICO", applicability: "LOW", applicabilityNotes: "Rarely applicable — only in genuine emergency situations (e.g. customer threatens self-harm during collections call and you need to share info with emergency services).", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0160", reference: "Art.6(1)(e)", name: "Lawful Basis 5 — Public Task", shortName: "Public Task", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Processing is necessary for the performance of a task carried out in the public interest or in the exercise of official authority vested in the controller.", parentId: "cu-0155", level: 4, regulatoryBody: "ICO", applicability: "N_A", applicabilityNotes: "Not applicable to Updraft — applies to public authorities and bodies with a statutory function.", isApplicable: false, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0161", reference: "Art.6(1)(f)", name: "Lawful Basis 6 — Legitimate Interests", shortName: "Legitimate Interests", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject. Requires a documented Legitimate Interests Assessment (LIA).", parentId: "cu-0155", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Potential basis for: fraud prevention, direct marketing (where soft opt-in applies), network and information security, internal administration, business intelligence/analytics. MUST conduct and document a three-part LIA test: (1) purpose test, (2) necessity test, (3) balancing test.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0162", reference: "UK GDPR Art.9", name: "Special Category Data", shortName: "Special Category Data", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Processing of special category data (sensitive personal data) is prohibited unless an Art.6 lawful basis AND an Art.9 condition both apply. Special categories: racial/ethnic origin, political opinions, religious beliefs, trade union membership, genetic data, biometric data, health data, sex life/sexual orientation.", parentId: "cu-0146", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Health data arises in: vulnerability assessments, mental health disclosures during collections, medical evidence for forbearance. Must have both Art.6 lawful basis AND Art.9 condition.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0163", reference: "Art.9(2)(a)", name: "Special Category Condition — Explicit Consent", shortName: "SC Explicit Consent", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Data subject has given explicit consent to processing for specified purposes.", parentId: "cu-0162", level: 4, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "May be needed for processing health information voluntarily disclosed by customers", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0164", reference: "Art.9(2)(b)", name: "Special Category Condition — Employment/Social Security", shortName: "SC Employment", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Processing is necessary for employment, social security and social protection law purposes.", parentId: "cu-0162", level: 4, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "HR processing: occupational health, disability adjustments, sickness records", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0165", reference: "Art.9(2)(d)", name: "Special Category Condition — Legitimate Activities (Not-for-Profit)", shortName: "SC Legit Activities", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Processing by not-for-profit body with political/philosophical/religious/trade-union aims.", parentId: "cu-0162", level: 4, regulatoryBody: "ICO", applicability: "N_A", applicabilityNotes: "Not applicable to Updraft", isApplicable: false, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0166", reference: "Art.9(2)(f)", name: "Special Category Condition — Legal Claims", shortName: "SC Legal Claims", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Processing is necessary for the establishment, exercise or defence of legal claims.", parentId: "cu-0162", level: 4, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Relevant when health/vulnerability data is needed for FOS complaints, litigation, or debt recovery proceedings", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0167", reference: "Art.9(2)(g)", name: "Special Category Condition — Substantial Public Interest", shortName: "SC Public Interest", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Processing is necessary for reasons of substantial public interest (with DPA 2018 Schedule 1 condition). Includes fraud prevention, regulatory compliance, equality monitoring.", parentId: "cu-0162", level: 4, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Fraud prevention (DPA Sch.1 para.14), regulatory requirements (DPA Sch.1 para.18), preventing/detecting unlawful acts (DPA Sch.1 para.10)", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0168", reference: "UK GDPR Art.12-23", name: "Data Subject Rights", shortName: "Data Subject Rights", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "The UK GDPR grants data subjects eight rights. Firms must be able to receive, recognise, and respond to all rights requests within statutory timeframes (generally one calendar month, extendable by two months for complex requests). Must be free of charge unless manifestly unfounded or excessive.", parentId: "cu-0146", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "All rights must be honoured. Must have processes, trained staff, and systems to handle every right. RTBF backlog is a known failing at Updraft.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0169", reference: "Art.13-14", name: "Right to Be Informed (Privacy Notices)", shortName: "Right to Be Informed", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Individuals have the right to be informed about the collection and use of their personal data. Must provide: identity of controller, purposes, lawful basis, retention periods, recipients, international transfers, rights, right to complain, source of data (if not from individual), automated decision-making information. Must be provided at point of collection (Art.13) or within one month if obtained indirectly (Art.14).", parentId: "cu-0168", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Privacy notice must cover ALL processing. Review: website privacy policy, cookie notice, loan application privacy notice, marketing privacy notice, employee privacy notice, collections privacy notice. Must be layered, clear, and accessible.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0170", reference: "Art.15", name: "Right of Access (Subject Access Request — SAR)", shortName: "Right of Access / SAR", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Individuals have the right to obtain confirmation of whether their data is being processed, access to the data, and supplementary information (purposes, categories, recipients, retention, source, automated decisions). Must respond within one calendar month. Can extend by two months for complex requests but must notify within one month. Must provide data in accessible electronic format if requested electronically.", parentId: "cu-0168", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "SARs are common in lending — especially from customers in dispute, in arrears, or pursuing complaints. Must have robust SAR handling process. Include all systems: CRM, loan management, call recordings, emails, CRA data held, Slack/Teams messages.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0171", reference: "Art.16", name: "Right to Rectification", shortName: "Right to Rectification", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Individuals have the right to have inaccurate personal data rectified and incomplete data completed. Must respond within one calendar month. Must notify any third parties (including CRAs) to whom data has been disclosed.", parentId: "cu-0168", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "CRA data accuracy is critical. Must rectify and notify CRAs within one month. Common source of complaints and FOS referrals.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0172", reference: "Art.17", name: "Right to Erasure (Right to Be Forgotten — RTBF)", shortName: "Right to Erasure / RTBF", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Individuals have the right to have their personal data erased in certain circumstances: data no longer necessary, consent withdrawn, legitimate interests objection upheld, unlawful processing, legal obligation, or child data collected online. Does NOT apply where processing is necessary for: legal obligation compliance, legal claims, or public interest. Must erase from all systems including backups (or put beyond use).", parentId: "cu-0168", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "RTBF backlog is a KNOWN FAILING at Updraft. Must: (1) have clear erasure process, (2) identify all systems holding data, (3) document where erasure is refused and why (e.g. CCA record-keeping), (4) respond within one month, (5) notify third parties. Develop a retention schedule that auto-triggers erasure.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0173", reference: "Art.18", name: "Right to Restriction of Processing", shortName: "Right to Restriction", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Individuals can request that processing be restricted (data held but not used) where: accuracy contested, processing unlawful but erasure opposed, data no longer needed but required for legal claims, or pending objection verification. Must notify individual when restriction is lifted.", parentId: "cu-0168", level: 4, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "May arise during complaints, disputes, or where customer contests CRA data accuracy. Must be able to technically restrict processing while retaining data.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0174", reference: "Art.20", name: "Right to Data Portability", shortName: "Right to Data Portability", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Where processing is based on consent or contract AND carried out by automated means, individuals have the right to receive their personal data in a structured, commonly used, machine-readable format and to have it transmitted to another controller.", parentId: "cu-0168", level: 4, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Relevant for loan application data processed automatically. Consider JSON/CSV export capability. Also relevant to Open Banking data.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0175", reference: "Art.21", name: "Right to Object", shortName: "Right to Object", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Individuals have the right to object to: processing based on legitimate interests (must stop unless compelling grounds override), processing for direct marketing (absolute right — must stop immediately), processing for research/statistics. Must inform individuals of right to object at point of first communication and in privacy notice, clearly and separately from other information.", parentId: "cu-0168", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Direct marketing objections must be actioned IMMEDIATELY — no exceptions. Legitimate interests objections require case-by-case assessment. Must have suppression lists to prevent re-contacting.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0176", reference: "Art.22", name: "Right Related to Automated Decision-Making and Profiling", shortName: "Automated Decision-Making", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Individuals have the right not to be subject to a decision based solely on automated processing (including profiling) which produces legal effects or similarly significant effects. Exceptions: necessary for contract, authorised by law, or based on explicit consent. Where exception applies, must: implement suitable safeguards, provide meaningful information about the logic involved, allow human intervention, enable the individual to express their point of view and contest the decision.", parentId: "cu-0168", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "DIRECTLY RELEVANT to Updraft's automated credit decisioning. Must: (1) ensure meaningful human involvement in decisions OR rely on contract/consent exception, (2) provide explanation of logic, (3) allow customers to request human review, (4) conduct DPIA. This is a high-risk area for ICO enforcement.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0177", reference: "UK GDPR Art.24-43", name: "Controller and Processor Obligations", shortName: "Controller Obligations", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Detailed obligations for data controllers and processors covering governance, security, breach notification, impact assessments, and international transfers.", parentId: "cu-0146", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Updraft is a data controller for all customer data processing", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0178", reference: "Art.24", name: "Responsibility of the Controller", shortName: "Controller Responsibility", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "The controller must implement appropriate technical and organisational measures to ensure and demonstrate compliance. Must be reviewed and updated as necessary. Measures must take into account nature, scope, context and purposes of processing and risks to individuals.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Requires documented compliance framework — policies, procedures, training, audits, DPIAs, records of processing", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0179", reference: "Art.25", name: "Data Protection by Design and by Default", shortName: "Privacy by Design/Default", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Must implement data protection principles in an effective manner at the time of determining the means for processing AND at the time of processing itself. By default, only data necessary for each specific purpose should be processed. Applies to amount of data, extent of processing, storage period, and accessibility.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "New systems, products, and features must have data protection built in from the start. Existing systems should be reviewed. Default settings should be privacy-protective (e.g. marketing opt-out by default, minimum data collection).", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0180", reference: "Art.26", name: "Joint Controllers", shortName: "Joint Controllers", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Where two or more controllers jointly determine purposes and means of processing, they are joint controllers. Must determine respective responsibilities by arrangement.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "MEDIUM", applicabilityNotes: "Review whether any processing involves joint controllership (e.g. with funding partners, CRAs)", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0181", reference: "Art.28", name: "Data Processors — Contractual Requirements", shortName: "Processor Contracts", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Must only use processors that provide sufficient guarantees of compliance. Processing must be governed by a written contract (Data Processing Agreement — DPA) containing prescribed clauses: subject matter, duration, nature/purpose, data types, controller obligations, processor obligations including sub-processor controls.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "EVERY third-party processor needs a compliant DPA. Review: cloud providers, CRAs, Open Banking providers, payment processors, debt collection agencies, IT support, marketing platforms, analytics tools. Common ICO enforcement area.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0182", reference: "Art.29", name: "Processing Under Authority of Controller/Processor", shortName: "Authority to Process", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Anyone acting under the authority of the controller or processor who has access to personal data must process only on documented instructions.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Staff must only access data for authorised purposes. Access controls and monitoring required.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0183", reference: "Art.30", name: "Records of Processing Activities (ROPA)", shortName: "Records of Processing / ROPA", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Must maintain a record of all processing activities under its responsibility. Must contain: name/contact of controller and DPO, purposes, categories of data subjects and personal data, categories of recipients, international transfers, retention periods (where possible), description of technical/organisational security measures. Must be in writing (including electronic) and made available to ICO on request.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "ROPA is mandatory and must be comprehensive. Should cover: loan applications, underwriting, servicing, collections, marketing, HR, complaints, CRA reporting, fraud detection, analytics. This is often incomplete — review and complete.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0184", reference: "Art.32", name: "Security of Processing", shortName: "Security of Processing", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Must implement appropriate technical and organisational security measures including (as appropriate): pseudonymisation and encryption, ability to ensure ongoing confidentiality/integrity/availability/resilience, ability to restore availability and access in a timely manner following an incident, regular testing/assessing/evaluating effectiveness of measures.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Information security programme: encryption at rest and in transit, access controls, MFA, endpoint protection, patch management, penetration testing, vulnerability scanning, backup and recovery, staff training. Must be proportionate to risk — financial data is high sensitivity.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0185", reference: "Art.33", name: "Notification of Breach to the ICO", shortName: "Breach Notification — ICO", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Must notify the ICO without undue delay and where feasible within 72 hours of becoming aware of a personal data breach, unless the breach is unlikely to result in a risk to individuals. Notification must include: nature of breach, categories/numbers affected, DPO contact, likely consequences, measures taken or proposed.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Breach response procedure required: detection, assessment, containment, notification decision, ICO notification (72 hours), record-keeping. All breaches must be logged even if not notified.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0186", reference: "Art.34", name: "Communication of Breach to Data Subjects", shortName: "Breach Notification — Individuals", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Where a breach is likely to result in a high risk to the rights and freedoms of individuals, must communicate the breach to affected data subjects without undue delay. Communication must describe the breach in clear and plain language.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Must notify affected customers where high risk — e.g. breach of financial data, credit records, or data enabling identity fraud. Must have pre-prepared breach notification templates.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0187", reference: "Art.35", name: "Data Protection Impact Assessments (DPIAs)", shortName: "DPIAs", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "DPIA required before any processing that is likely to result in a high risk to individuals. Mandatory for: systematic and extensive evaluation of personal aspects (profiling), large-scale processing of special category data, systematic monitoring of publicly accessible area. ICO has also published a list of processing requiring DPIA. Must contain: description of processing, assessment of necessity/proportionality, assessment of risks, and measures to address risks.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "DPIAs REQUIRED for: automated credit decisioning/scoring, Open Banking data analysis, CRA data processing at scale, any new product or significant system change involving personal data. Must be completed BEFORE processing starts.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0188", reference: "Art.36", name: "Prior Consultation with ICO", shortName: "Prior Consultation", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Where a DPIA indicates that processing would result in a high risk in the absence of measures, the controller must consult the ICO before processing.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "MEDIUM", applicabilityNotes: "Trigger: DPIA identifies residual high risk that cannot be mitigated. Unlikely for standard lending but possible for novel AI/ML applications.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0189", reference: "Art.37-39", name: "Data Protection Officer (DPO)", shortName: "DPO Requirements", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "DPO appointment mandatory where: (a) public authority, (b) core activities require regular and systematic monitoring of data subjects on a large scale, or (c) core activities consist of large-scale processing of special categories/criminal offence data. DPO must have expert knowledge of data protection law, must report to highest management level, must not be dismissed for performing tasks, must not receive instructions regarding the exercise of tasks.", parentId: "cu-0177", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Updraft's core activity involves regular and systematic monitoring of data subjects on a large scale (credit scoring, affordability assessment, CRA checks). DPO appointment is very likely mandatory. If not yet appointed, this needs urgent assessment.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0190", reference: "UK GDPR Art.44-49", name: "International Data Transfers", shortName: "International Transfers", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Transfers of personal data to countries outside the UK are restricted unless adequate safeguards are in place.", parentId: "cu-0146", level: 3, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Review all third-party processors and sub-processors for international transfers", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0191", reference: "Art.45", name: "Adequacy decisions", shortName: "Adequacy Decisions", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "UK government may make adequacy decisions for countries providing an adequate level of protection. Transfers to adequate countries are permitted without further safeguards.", parentId: "cu-0190", level: 4, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Check UK adequacy list for all transfer destinations", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0192", reference: "Art.46", name: "Standard Contractual Clauses and other safeguards", shortName: "SCCs / Safeguards", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Where no adequacy decision, transfers permitted subject to appropriate safeguards: International Data Transfer Agreement (IDTA), ICO Addendum to EU SCCs, binding corporate rules, approved codes/certifications. Must also conduct a Transfer Risk Assessment (TRA).", parentId: "cu-0190", level: 4, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "All processor agreements involving non-adequate countries must include IDTA or ICO Addendum plus TRA", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0193", reference: "Art.49", name: "Derogations for specific situations", shortName: "Transfer Derogations", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Limited derogations: explicit consent (informed of risks), necessary for contract performance, necessary for important public interest reasons, necessary for legal claims, necessary to protect vital interests.", parentId: "cu-0190", level: 4, regulatoryBody: "ICO", applicability: "MEDIUM", applicabilityNotes: "Derogations are narrow — should not be primary transfer mechanism", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0194", reference: "DPA 2018 Parts 2-4", name: "DPA 2018 — UK-Specific Provisions", shortName: "DPA 2018 Specific", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "UK-specific provisions supplementing the UK GDPR including exemptions, law enforcement processing, and intelligence services processing.", parentId: "cu-0146", level: 3, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Key UK derogations and exemptions", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0195", reference: "DPA Sch.1", name: "Schedule 1 — Special Category and Criminal Offence Conditions", shortName: "DPA Schedule 1", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Conditions for processing special category and criminal offence data beyond Art.9 conditions. Includes: employment/social protection, health/social care, substantial public interest conditions (fraud prevention, equality monitoring, regulatory compliance, preventing unlawful acts).", parentId: "cu-0194", level: 4, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Must identify Schedule 1 condition for all special category processing. Particularly: fraud prevention (para.14), preventing/detecting unlawful acts (para.10), regulatory requirements (para.18)", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0196", reference: "DPA Sch.2", name: "Schedule 2 — Exemptions", shortName: "DPA Schedule 2", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Exemptions from certain UK GDPR provisions including: crime and taxation (para.2), regulatory functions (para.3), management forecasting (para.22), legal professional privilege (para.19).", parentId: "cu-0194", level: 4, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "May apply to: SAR responses (legal privilege exemption), fraud investigations (crime exemption), internal restructuring", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0197", reference: "PECR 2003", name: "Privacy and Electronic Communications Regulations 2003", shortName: "PECR 2003", body: "ICO", type: "STATUTORY_INSTRUMENT", provisions: null, url: "https://www.legislation.gov.uk/uksi/2003/2426", description: "Regulates electronic marketing (email, SMS, automated calls), cookies, and communication privacy. Separate from but complementary to UK GDPR — both must be complied with.", parentId: "cu-0145", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Email/SMS marketing, cookies, online tracking", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0198", reference: "PECR Reg.22", name: "Marketing by electronic mail (email and SMS)", shortName: "PECR Email/SMS", body: "ICO", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Unsolicited email/SMS marketing requires prior consent UNLESS the 'soft opt-in' applies. Soft opt-in: (1) obtained contact details in course of sale/negotiations for sale, (2) marketing own similar products/services, (3) given simple opportunity to refuse at time of collection AND in every subsequent message. Every email/SMS must include sender identification and valid opt-out.", parentId: "cu-0197", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Consent-based marketing and soft opt-in. Must maintain suppression lists. Must have clear opt-out mechanism in every communication.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0199", reference: "PECR Reg.21", name: "Unsolicited calls for direct marketing", shortName: "PECR Calls", body: "ICO", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Live marketing calls: must not call numbers on the TPS register unless consent obtained. Must identify caller and provide contact details. Automated marketing calls: always require prior consent.", parentId: "cu-0197", level: 3, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "If Updraft makes outbound marketing calls — must screen against TPS", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0200", reference: "PECR Reg.6", name: "Cookies and similar technologies", shortName: "PECR Cookies", body: "ICO", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Must not store or access information on a user's device (cookies, tracking pixels, local storage) unless: (1) user is provided with clear and comprehensive information about the purposes, AND (2) user has given consent. Exception for strictly necessary cookies (essential to provide the service the user has requested).", parentId: "cu-0197", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Website cookie consent mechanism required. Audit all cookies and categorise: strictly necessary, analytics, marketing/advertising, functional. Only strictly necessary cookies can be placed without consent.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0201", reference: "PECR Reg.5", name: "Confidentiality of communications", shortName: "PECR Confidentiality", body: "ICO", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Prohibition on interception of or interference with communications without consent. Relevant to call recording.", parentId: "cu-0197", level: 3, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Call recording: must inform customers that calls are being recorded and the purpose", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0202", reference: "PECR Reg.6A", name: "Browser and device settings", shortName: "PECR Browser Settings", body: "ICO", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Provision for consent to be signified through browser/device settings — the foundation for potential future consent mechanisms.", parentId: "cu-0197", level: 3, regulatoryBody: "ICO", applicability: "MEDIUM", applicabilityNotes: "Evolving — monitor ICO guidance on browser-based consent signals", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0203", reference: "CREDIT-DP", name: "Credit-Specific Data Protection Obligations", shortName: "Credit Data Protection", body: "ICO/FCA", type: "GUIDANCE", provisions: null, url: null, description: "Data protection requirements specific to consumer credit, credit reference agencies, and credit scoring.", parentId: "cu-0145", level: 2, regulatoryBody: "ICO/FCA", applicability: "CORE", applicabilityNotes: "Intersects FCA and ICO requirements for lending data", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0204", reference: "CRA-REPORTING", name: "Credit Reference Agency Reporting Obligations", shortName: "CRA Reporting", body: "ICO/FCA", type: "GUIDANCE", provisions: null, url: null, description: "Obligations when reporting data to CRAs: accuracy, timeliness, dispute handling, individual notification. Must have lawful basis (legitimate interests or legal obligation). Must inform customers that data will be shared with CRAs.", parentId: "cu-0203", level: 3, regulatoryBody: "ICO/FCA", applicability: "CORE", applicabilityNotes: "Must ensure data reported to CRAs is accurate. Must handle disputes within prescribed timeframes. Must inform customers in privacy notice.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0205", reference: "CRA-SEARCHES", name: "CRA Search Data — Quotation vs Application Searches", shortName: "CRA Searches", body: "ICO/FCA", type: "GUIDANCE", provisions: null, url: null, description: "Different types of CRA search leave different footprints: quotation searches (no impact on credit file), application searches (visible to other lenders). Must be clear about which search type is performed and when.", parentId: "cu-0203", level: 3, regulatoryBody: "ICO/FCA", applicability: "CORE", applicabilityNotes: "Must inform customers about search types. Eligibility checkers should use quotation searches. Full application should use application search.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0206", reference: "OPEN-BANKING-DP", name: "Open Banking Data Protection", shortName: "Open Banking DP", body: "ICO/FCA", type: "GUIDANCE", provisions: null, url: null, description: "Processing of Open Banking data (account information, transaction data) for affordability assessment. Must have explicit consent (AISP), data minimisation (only categories needed), purpose limitation, and clear retention policy. Must not retain data longer than necessary.", parentId: "cu-0203", level: 3, regulatoryBody: "ICO/FCA", applicability: "CORE", applicabilityNotes: "If using Open Banking for affordability: DPIA required, explicit consent, clear privacy notice, data minimisation, deletion when no longer needed", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0207", reference: "CREDIT-PROFILING", name: "Credit Scoring and Profiling", shortName: "Credit Profiling", body: "ICO", type: "GUIDANCE", provisions: null, url: null, description: "Automated credit scoring constitutes profiling under Art.4(4) and automated decision-making under Art.22. Must: provide meaningful information about the logic involved, allow human intervention, conduct DPIA, monitor for bias and discrimination.", parentId: "cu-0203", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Updraft's automated underwriting is subject to Art.22. Must provide explanations, allow human review, and monitor for discriminatory outcomes (links to Equality Act).", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0208", reference: "DP-GOV", name: "Data Protection Governance Requirements", shortName: "DP Governance", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Organisational governance requirements for data protection compliance.", parentId: "cu-0145", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Framework for managing data protection obligations", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0209", reference: "ROPA", name: "Records of Processing Activities", shortName: "ROPA", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Mandatory register of all processing activities. Must be maintained in writing, available to ICO on request, and cover all categories of processing.", parentId: "cu-0208", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Must be comprehensive and up to date. Review and complete if gaps exist.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0210", reference: "PRIVACY-NOTICES", name: "Privacy Notice Requirements", shortName: "Privacy Notices", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Must provide privacy notices to: customers (loan applicants, borrowers, marketing recipients), employees, website visitors, complainants. Must cover all Art.13/14 information. Must be layered, clear, and accessible.", parentId: "cu-0208", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Audit all privacy notices for completeness. Common gap: collections-specific privacy notice, employee privacy notice.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0211", reference: "CONSENT-MGMT", name: "Consent Management", shortName: "Consent Management", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Where consent is the lawful basis: must obtain valid consent (freely given, specific, informed, unambiguous), maintain records of consent (what consented to, when, how, what told), provide easy withdrawal mechanism, regularly review consent validity.", parentId: "cu-0208", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Marketing consent records, cookie consent logs, testimonial consent. Must be able to demonstrate consent was valid.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0212", reference: "DSAR-PROC", name: "Data Subject Access Request Procedures", shortName: "DSAR Procedures", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Must have documented procedures for handling all data subject rights requests: receipt, identification/verification, search across all systems, review and redaction (third-party data), response within one month, secure delivery of information.", parentId: "cu-0208", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "DSAR handling is an operational requirement. Must cover: loan management system, CRM, email, call recordings, Slack, CRA data held, complaints files, marketing databases.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0213", reference: "BREACH-PROC", name: "Data Breach Response Procedures", shortName: "Breach Procedures", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Must have: breach detection mechanisms, assessment criteria, containment procedures, ICO notification template, individual notification template, breach log (all breaches recorded even if not notified), lessons learned process.", parentId: "cu-0208", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Breach response plan must be tested regularly. All staff must know how to report a suspected breach internally.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0214", reference: "RETENTION", name: "Data Retention Policy and Schedule", shortName: "Retention Policy", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Must have documented retention periods for all categories of personal data, justification for each period, and processes for secure destruction when retention period expires. Must balance UK GDPR storage limitation with regulatory/legal retention requirements (CCA: duration + 6 years, FCA: at least 5 years, tax: 6 years).", parentId: "cu-0208", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Known gap if no comprehensive retention schedule exists. Must map: application data, loan records, call recordings, marketing data, employee records, complaints, CRA data. Auto-deletion where possible.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0215", reference: "DP-TRAINING", name: "Data Protection Training", shortName: "DP Training", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "All staff who process personal data must receive appropriate data protection training. Must be role-specific (e.g. higher for those handling vulnerability data), regular (at least annually), documented (completion records).", parentId: "cu-0208", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Training programme required: induction training, annual refresher, role-specific training (collections, underwriting, marketing), breach awareness", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0216", reference: "DP-BY-DESIGN", name: "Privacy by Design in Practice", shortName: "Privacy by Design", body: "ICO", type: "LEGISLATION", provisions: null, url: null, description: "Operationalising Art.25: data protection considerations must be embedded into project management, system procurement, product development, and change management. DPIA screening for all new projects.", parentId: "cu-0208", level: 3, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "All new projects/systems/changes should go through a privacy screening checklist. Build into project governance.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0217", reference: "NIS 2018", name: "Network and Information Systems Regulations 2018", shortName: "NIS Regs", body: "DCMS", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Requirements for operators of essential services and relevant digital service providers to manage security risks.", parentId: "cu-0145", level: 2, regulatoryBody: "DCMS", applicability: "ASSESS", applicabilityNotes: "Review whether Updraft meets digital service provider threshold", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0218", reference: "CMA 1990", name: "Computer Misuse Act 1990", shortName: "CMA 1990", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Criminal offences of unauthorised access to computer material, unauthorised acts with intent, and making/supplying tools for computer misuse.", parentId: "cu-0145", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Cyber security legal framework", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Data protection is a known weakness — recommend explicit SMF3 allocation (or dedicated SMF). DPO reports to this SMF. SMF16 provides compliance oversight of DP obligations.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0219", reference: "FIN-CRIME", name: "Financial Crime — AML, CTF, Fraud, Bribery & Sanctions", shortName: "Financial Crime", body: "Multiple", type: "LEGISLATION", provisions: null, url: null, description: "UK legislation and regulations governing anti-money laundering, counter-terrorist financing, fraud prevention, bribery, sanctions, and proceeds of crime.", parentId: null, level: 1, regulatoryBody: "Multiple", applicability: "CORE", applicabilityNotes: "AML/KYC is fundamental to consumer lending", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0220", reference: "MLR 2017", name: "Money Laundering, Terrorist Financing and Transfer of Funds Regulations 2017", shortName: "MLR 2017", body: "HM Treasury", type: "STATUTORY_INSTRUMENT", provisions: null, url: "https://www.legislation.gov.uk/uksi/2017/692", description: "Primary AML/CTF regulations setting requirements for customer due diligence, enhanced due diligence, suspicious activity reporting, record-keeping, and risk assessment.", parentId: "cu-0219", level: 2, regulatoryBody: "HM Treasury", applicability: "CORE", applicabilityNotes: "Fundamental AML/KYC obligations", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0221", reference: "MLR Part 2", name: "Risk assessment", shortName: "MLR Risk Assessment", body: "HM Treasury", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Firm-wide risk assessment obligation — must identify and assess money laundering and terrorist financing risks.", parentId: "cu-0220", level: 3, regulatoryBody: "HM Treasury", applicability: "CORE", applicabilityNotes: "AML risk assessment", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0222", reference: "MLR Part 3", name: "Customer Due Diligence (CDD)", shortName: "MLR CDD", body: "HM Treasury", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "CDD requirements: identity verification, beneficial ownership, ongoing monitoring. Enhanced due diligence for high-risk situations. Simplified due diligence where appropriate.", parentId: "cu-0220", level: 3, regulatoryBody: "HM Treasury", applicability: "CORE", applicabilityNotes: "KYC/CDD — identity verification at onboarding", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0223", reference: "MLR Part 4", name: "Record-keeping and reporting", shortName: "MLR Records/Reporting", body: "HM Treasury", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Record retention (5 years from end of relationship), suspicious activity reporting obligations, nomination of MLRO.", parentId: "cu-0220", level: 3, regulatoryBody: "HM Treasury", applicability: "CORE", applicabilityNotes: "Record-keeping and SAR obligations", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0224", reference: "POCA 2002", name: "Proceeds of Crime Act 2002", shortName: "POCA 2002", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Criminal offences of money laundering (ss.327-329), failure to disclose (ss.330-332), and tipping off (s.333A). Foundation for SAR reporting regime.", parentId: "cu-0219", level: 2, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "ML offences — SARs to NCA", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0225", reference: "TA 2000", name: "Terrorism Act 2000", shortName: "TA 2000", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Terrorist financing offences and obligations. Counter-terrorist financing controls and reporting.", parentId: "cu-0219", level: 2, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "CTF obligations — sanctions screening and reporting", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0226", reference: "SAMLA 2018", name: "Sanctions and Anti-Money Laundering Act 2018", shortName: "SAMLA 2018", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "UK's post-Brexit sanctions framework. Empowers government to impose financial sanctions. Firms must screen against UK sanctions lists.", parentId: "cu-0219", level: 2, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Sanctions screening obligations", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0227", reference: "BA 2010", name: "Bribery Act 2010", shortName: "Bribery Act", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Offences of bribery, being bribed, bribery of foreign public officials. Corporate offence of failure to prevent bribery — 'adequate procedures' defence.", parentId: "cu-0219", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Anti-bribery policy and adequate procedures", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0228", reference: "FA 2006", name: "Fraud Act 2006", shortName: "Fraud Act", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Criminal offences of fraud by false representation, fraud by failing to disclose information, fraud by abuse of position.", parentId: "cu-0219", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Fraud prevention and detection", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0229", reference: "CFA 2017", name: "Criminal Finances Act 2017", shortName: "CFA 2017", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Corporate offences of failure to prevent facilitation of tax evasion. Unexplained wealth orders. Information sharing.", parentId: "cu-0219", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Tax evasion facilitation offence — requires reasonable prevention procedures", isApplicable: true, primarySMF: "SMF17", secondarySMF: "SMF16", smfNotes: "PR-D (financial crime) — allocated to SMF17 (MLRO). SMF16 provides second-line oversight.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0230", reference: "EMPLOYMENT", name: "Employment Law & HR Regulations", shortName: "Employment Law", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "UK employment legislation covering employment rights, equality, health and safety, working time, pay, pensions, and workplace regulations.", parentId: null, level: 1, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Applies to Updraft as an employer", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0231", reference: "ERA 1996", name: "Employment Rights Act 1996", shortName: "ERA 1996", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Core employment rights including: employment particulars, protection of wages, time off, maternity/paternity, unfair dismissal, redundancy payments, whistleblowing.", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Foundation of employment law", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0232", reference: "ERA Part I", name: "Employment particulars — written statement", shortName: "ERA Pt I Particulars", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Obligation to provide written statement of employment particulars on day one of employment.", parentId: "cu-0231", level: 3, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Employment contracts", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0233", reference: "ERA Part IVA", name: "Protected disclosures (whistleblowing)", shortName: "ERA Pt IVA Whistleblowing", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Protection for workers who make qualifying disclosures about wrongdoing.", parentId: "cu-0231", level: 3, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Links to SYSC 18 whistleblowing requirements", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0234", reference: "ERA Part X", name: "Unfair dismissal", shortName: "ERA Pt X Unfair Dismissal", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Protection against unfair dismissal including automatically unfair reasons, qualifying period, procedural requirements.", parentId: "cu-0231", level: 3, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Dismissal procedures", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0235", reference: "ERA Part IX", name: "Redundancy payments", shortName: "ERA Pt IX Redundancy", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Statutory redundancy payment entitlements and procedures.", parentId: "cu-0231", level: 3, regulatoryBody: "Parliament", applicability: "MEDIUM", applicabilityNotes: "Relevant if organisational changes arise", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0236", reference: "EA 2010", name: "Equality Act 2010", shortName: "Equality Act", body: "Parliament", type: "LEGISLATION", provisions: null, url: "https://www.legislation.gov.uk/ukpga/2010/15", description: "Protection against discrimination on grounds of 9 protected characteristics. Covers employment AND services.", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Applies to both employment AND customer treatment (lending decisions)", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0237", reference: "EA Part 2", name: "Key concepts and protected characteristics", shortName: "EA Pt 2 Characteristics", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Definition of the 9 protected characteristics and types of discrimination (direct, indirect, harassment, victimisation).", parentId: "cu-0236", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Discrimination in employment and services", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0238", reference: "EA Part 3", name: "Services and public functions", shortName: "EA Pt 3 Services", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Prohibition on discrimination in provision of services — directly relevant to lending decisions and customer treatment.", parentId: "cu-0236", level: 3, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Non-discriminatory lending and service provision", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0239", reference: "EA Part 5", name: "Work", shortName: "EA Pt 5 Work", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Prohibition on discrimination in employment — recruitment, terms, promotion, dismissal.", parentId: "cu-0236", level: 3, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Employment discrimination protections", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0240", reference: "WTR 1998", name: "Working Time Regulations 1998", shortName: "Working Time", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Maximum 48-hour working week, rest breaks, annual leave entitlement (5.6 weeks), night work limits.", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Working hours, annual leave, rest breaks", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0241", reference: "NMWA 1998", name: "National Minimum Wage Act 1998 / NMW Regulations", shortName: "NMW", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Obligation to pay at least the National Minimum Wage (or National Living Wage for 21+).", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Minimum wage compliance", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0242", reference: "PA 2008", name: "Pensions Act 2008 — Auto-Enrolment", shortName: "Pensions Auto-Enrol", body: "Parliament/TPR", type: "LEGISLATION", provisions: null, url: null, description: "Automatic enrolment of eligible workers into a qualifying workplace pension scheme.", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament/TPR", applicability: "HIGH", applicabilityNotes: "Auto-enrolment duties to The Pensions Regulator", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0243", reference: "HSWA 1974", name: "Health and Safety at Work etc. Act 1974", shortName: "H&S Act", body: "HSE", type: "LEGISLATION", provisions: null, url: null, description: "General duty to ensure health, safety and welfare of employees.", parentId: "cu-0230", level: 2, regulatoryBody: "HSE", applicability: "HIGH", applicabilityNotes: "Workplace health and safety", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0244", reference: "TUPE 2006", name: "Transfer of Undertakings (Protection of Employment) Regulations 2006", shortName: "TUPE", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Protects employees' terms when a business is transferred to a new employer.", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament", applicability: "LOW", applicabilityNotes: "Relevant if Updraft acquires or transfers business units", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0245", reference: "FWR 2014", name: "Flexible Working Regulations 2014 (as amended 2024)", shortName: "Flexible Working", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Right to request flexible working from day 1 of employment.", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "All employees can request flexible working from day 1", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0246", reference: "MPLR 1999", name: "Maternity and Parental Leave Regulations / Paternity & Adoption Leave", shortName: "Mat/Pat Leave", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Maternity leave (52 weeks), paternity leave (2 weeks), adoption leave, shared parental leave.", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Family leave entitlements", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0247", reference: "PTW 2000", name: "Part-Time Workers Regulations 2000", shortName: "Part-Time Workers", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Part-time workers must not be treated less favourably than full-time workers.", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament", applicability: "MEDIUM", applicabilityNotes: "If Updraft employs part-time staff", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0248", reference: "AWR 2010", name: "Agency Workers Regulations 2010", shortName: "Agency Workers", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Agency workers entitled to same conditions as direct recruits after 12 weeks.", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament", applicability: "MEDIUM", applicabilityNotes: "If Updraft uses agency workers", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0249", reference: "IANA 2006", name: "Immigration, Asylum and Nationality Act 2006 — Right to Work", shortName: "Right to Work", body: "Home Office", type: "LEGISLATION", provisions: null, url: null, description: "Obligation to verify right to work in the UK before employment.", parentId: "cu-0230", level: 2, regulatoryBody: "Home Office", applicability: "HIGH", applicabilityNotes: "Right to work checks for all new hires", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0250", reference: "MSA 2015", name: "Modern Slavery Act 2015", shortName: "Modern Slavery", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Slavery and human trafficking offences. Section 54: annual transparency statement for organisations with turnover >£36m.", parentId: "cu-0230", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Modern slavery statement and supply chain due diligence", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0251", reference: "ACAS-COP", name: "ACAS Code of Practice — Disciplinary and Grievance", shortName: "ACAS Code", body: "ACAS", type: "INDUSTRY_CODE", provisions: null, url: null, description: "ACAS statutory code of practice on disciplinary and grievance procedures. Tribunals can adjust awards by 25% for non-compliance.", parentId: "cu-0230", level: 2, regulatoryBody: "ACAS", applicability: "HIGH", applicabilityNotes: "Must follow ACAS code for disciplinary and grievance", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "HR and employment law — allocate to an executive director with HR in their remit. SMF1 has overall accountability for culture.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0252", reference: "CORPORATE", name: "Corporate Law & Governance", shortName: "Corporate Law", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "UK company law, corporate governance requirements, and reporting obligations.", parentId: null, level: 1, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Updraft as a registered company", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF24", smfNotes: "Company law and directors' duties — SMF1 leads. SMF24 (if appointed) covers financial reporting and Companies House filings.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0253", reference: "CA 2006", name: "Companies Act 2006", shortName: "Companies Act", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Core company law: directors' duties, accounts and reporting, shares and capital, annual returns, company secretary obligations.", parentId: "cu-0252", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Directors' duties, accounts, filing", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF24", smfNotes: "Company law and directors' duties — SMF1 leads. SMF24 (if appointed) covers financial reporting and Companies House filings.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0254", reference: "CA 2006 Part 10", name: "Directors' duties (ss.170-177)", shortName: "Directors' Duties", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Seven statutory directors' duties.", parentId: "cu-0252", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "All directors must understand and comply", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF24", smfNotes: "Company law and directors' duties — SMF1 leads. SMF24 (if appointed) covers financial reporting and Companies House filings.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0255", reference: "CA 2006 Part 15", name: "Accounts and reports", shortName: "Company Accounts", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Requirements for preparation and filing of annual accounts, strategic report, and directors' report.", parentId: "cu-0252", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Annual accounts and filing deadlines", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF24", smfNotes: "Company law and directors' duties — SMF1 leads. SMF24 (if appointed) covers financial reporting and Companies House filings.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0256", reference: "CA 2006 Part 21A", name: "Persons with significant control (PSC)", shortName: "PSC Register", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Obligation to maintain register of persons with significant control.", parentId: "cu-0252", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "PSC register maintenance", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF24", smfNotes: "Company law and directors' duties — SMF1 leads. SMF24 (if appointed) covers financial reporting and Companies House filings.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0257", reference: "IA 1986", name: "Insolvency Act 1986", shortName: "Insolvency Act", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Directors' duties in financial difficulty — wrongful trading, fraudulent trading.", parentId: "cu-0252", level: 2, regulatoryBody: "Parliament", applicability: "MEDIUM", applicabilityNotes: "Directors' awareness of insolvency obligations", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF24", smfNotes: "Company law and directors' duties — SMF1 leads. SMF24 (if appointed) covers financial reporting and Companies House filings.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0258", reference: "ECCT 2023", name: "Economic Crime and Corporate Transparency Act 2023", shortName: "ECCT Act", body: "Parliament", type: "LEGISLATION", provisions: null, url: "https://www.legislation.gov.uk/ukpga/2023/56", description: "New corporate offence of failure to prevent fraud. Companies House reform — identity verification for directors. Enhanced AML powers.", parentId: "cu-0252", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Failure to prevent fraud offence — must have 'reasonable fraud prevention procedures' in place", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF24", smfNotes: "Company law and directors' duties — SMF1 leads. SMF24 (if appointed) covers financial reporting and Companies House filings.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0259", reference: "TAX", name: "Tax, Fiscal & Reporting Obligations", shortName: "Tax", body: "HMRC", type: "LEGISLATION", provisions: null, url: null, description: "UK tax obligations including corporation tax, VAT, PAYE, NIC, and Making Tax Digital.", parentId: null, level: 1, regulatoryBody: "HMRC", applicability: "HIGH", applicabilityNotes: "All businesses must comply with tax obligations", isApplicable: true, primarySMF: "SMF24", secondarySMF: "SMF1", smfNotes: "Tax compliance — SMF24 (CFO) or SMF1 if no dedicated finance SMF.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0260", reference: "CTA 2009/2010", name: "Corporation Tax Acts 2009 and 2010", shortName: "Corporation Tax", body: "HMRC", type: "LEGISLATION", provisions: null, url: null, description: "Corporation tax on profits.", parentId: "cu-0259", level: 2, regulatoryBody: "HMRC", applicability: "HIGH", applicabilityNotes: "Corporation tax compliance", isApplicable: true, primarySMF: "SMF24", secondarySMF: "SMF1", smfNotes: "Tax compliance — SMF24 (CFO) or SMF1 if no dedicated finance SMF.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0261", reference: "VATA 1994", name: "Value Added Tax Act 1994", shortName: "VAT", body: "HMRC", type: "LEGISLATION", provisions: null, url: null, description: "VAT registration, charging, and reporting. Financial services are generally VAT exempt.", parentId: "cu-0259", level: 2, regulatoryBody: "HMRC", applicability: "HIGH", applicabilityNotes: "VAT exemption for financial services — review partial exemption", isApplicable: true, primarySMF: "SMF24", secondarySMF: "SMF1", smfNotes: "Tax compliance — SMF24 (CFO) or SMF1 if no dedicated finance SMF.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0262", reference: "PAYE", name: "Income Tax (PAYE) Regulations 2003 / NIC", shortName: "PAYE/NIC", body: "HMRC", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "PAYE operation, employee tax deductions, National Insurance Contributions.", parentId: "cu-0259", level: 2, regulatoryBody: "HMRC", applicability: "HIGH", applicabilityNotes: "Employer payroll obligations", isApplicable: true, primarySMF: "SMF24", secondarySMF: "SMF1", smfNotes: "Tax compliance — SMF24 (CFO) or SMF1 if no dedicated finance SMF.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0263", reference: "MTD", name: "Making Tax Digital", shortName: "MTD", body: "HMRC", type: "GUIDANCE", provisions: null, url: null, description: "HMRC's digitalisation of tax reporting.", parentId: "cu-0259", level: 2, regulatoryBody: "HMRC", applicability: "HIGH", applicabilityNotes: "Digital record-keeping and submission", isApplicable: true, primarySMF: "SMF24", secondarySMF: "SMF1", smfNotes: "Tax compliance — SMF24 (CFO) or SMF1 if no dedicated finance SMF.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0264", reference: "FCA-GUIDANCE", name: "FCA Guidance, Policy Statements & Supervisory Expectations", shortName: "FCA Guidance", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "Non-Handbook FCA guidance, finalised guidance, policy statements, and sectoral expectations that inform compliance standards.", parentId: null, level: 1, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Shapes FCA supervisory expectations and examination approach", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0265", reference: "FG22/5", name: "FG22/5 — Final Guidance for the Consumer Duty", shortName: "FG22/5 CD Guidance", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "Comprehensive guidance on implementing the Consumer Duty.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Primary interpretive guidance for Consumer Duty", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0266", reference: "PS22/9", name: "PS22/9 — A New Consumer Duty Policy Statement", shortName: "PS22/9 CD PS", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "Policy statement setting out final Consumer Duty rules.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Rules and rationale for Consumer Duty", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0267", reference: "FG21/1", name: "FG21/1 — Fair Treatment of Vulnerable Customers", shortName: "FG21/1 Vulnerability", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "Detailed guidance on identifying, understanding, and responding to customer vulnerability.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Vulnerability framework — core to Consumer Duty outcomes", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0268", reference: "GC23/2", name: "GC23/2 — Financial Promotions on Social Media", shortName: "GC23/2 Social Media", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "Guidance on financial promotions on social media.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Social media promotion compliance", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0269", reference: "FG15/04", name: "FG15/04 — Social Media & Customer Communications", shortName: "FG15/04 Social Media", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "Original guidance on social media and customer communications.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Social media general guidance", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0270", reference: "PS21/3-OR", name: "PS21/3 — Building Operational Resilience", shortName: "PS21/3 Op Resilience", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "Requirements to identify important business services, set impact tolerances.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Operational resilience framework", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0271", reference: "FG17/9", name: "FG17/9 — Assessing Creditworthiness", shortName: "FG17/9 Creditworthiness", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "Guidance on assessing creditworthiness in consumer credit.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Interpretive guidance for CONC 5 assessments", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0272", reference: "FG-COLLECTIONS", name: "FCA Expectations — Debt Collection and Forbearance", shortName: "Collections Expectations", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "FCA Dear CEO letters and portfolio letters on collections practices.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Supervisory focus on collections outcomes", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0273", reference: "PS24/16", name: "PS24/16 — Diversity and Inclusion in Financial Services", shortName: "D&I", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "FCA expectations on diversity and inclusion.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "MEDIUM", applicabilityNotes: "Evolving FCA expectations on D&I", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0274", reference: "ESG-FCA", name: "FCA ESG and Climate Expectations", shortName: "FCA ESG/Climate", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "FCA expectations on climate-related financial disclosures.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "LOW", applicabilityNotes: "Review applicability based on firm size thresholds", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0275", reference: "PS23/6", name: "PS23/6 — Financial Promotion Rules for Cryptoassets", shortName: "Crypto Proms", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "Rules for financial promotions relating to cryptoassets.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "N_A", applicabilityNotes: "Updraft does not deal in cryptoassets", isApplicable: false, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0276", reference: "FCA-AI", name: "FCA AI and Machine Learning Expectations", shortName: "FCA AI/ML", body: "FCA", type: "GUIDANCE", provisions: null, url: "https://www.fca.org.uk/publication/discussion/dp22-4.pdf", description: "FCA expectations on use of AI and machine learning in financial services: explainability, fairness, accountability, transparency, governance. DP5/22 and subsequent publications.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Relevant to automated underwriting, credit scoring, and any AI/ML models. Intersects with ICO AI guidance and Consumer Duty.", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0277", reference: "FCA-COST-LIVING", name: "FCA Cost of Living Expectations", shortName: "Cost of Living", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "FCA expectations on supporting customers through the cost of living crisis: proactive forbearance, targeted support, vulnerability identification, fair value reassessment.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Directly relevant to Updraft's consolidation loan customers", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0278", reference: "FCA-CONSUMER-CREDIT-PORTFOLIO", name: "FCA Consumer Credit Portfolio Strategy Letter", shortName: "CC Portfolio Letter", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "FCA's portfolio strategy letter for consumer credit firms setting out key areas of focus for supervision.", parentId: "cu-0264", level: 2, regulatoryBody: "FCA", applicability: "CORE", applicabilityNotes: "Defines what FCA is looking for in supervisory engagements", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "FCA guidance and supervisory expectations — core to SMF16's compliance monitoring and regulatory change management.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0279", reference: "ICO", name: "ICO Guidance & Codes of Practice", shortName: "ICO Guidance", body: "ICO", type: "GUIDANCE", provisions: null, url: null, description: "Guidance and statutory codes of practice issued by the Information Commissioner's Office.", parentId: null, level: 1, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Shapes ICO enforcement expectations", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0280", reference: "ICO-DM", name: "ICO Direct Marketing Guidance", shortName: "ICO Marketing", body: "ICO", type: "GUIDANCE", provisions: null, url: null, description: "Comprehensive guidance on direct marketing including consent, legitimate interest, opt-out, soft opt-in.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "All marketing activities", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0281", reference: "ICO-DPIA", name: "ICO DPIA Guidance", shortName: "ICO DPIA", body: "ICO", type: "GUIDANCE", provisions: null, url: null, description: "Guidance on when and how to conduct DPIAs.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Required for credit decisioning systems", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0282", reference: "ICO-DSC", name: "ICO Data Sharing Code of Practice", shortName: "ICO Data Sharing", body: "ICO", type: "GUIDANCE", provisions: null, url: null, description: "Statutory code on data sharing.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Sharing data with CRAs, funders, third parties", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0283", reference: "ICO-EMP", name: "ICO Employment Practices Data Protection Code", shortName: "ICO Employment DP", body: "ICO", type: "GUIDANCE", provisions: null, url: null, description: "Guidance on processing employee personal data.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Employee data processing", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0284", reference: "ICO-AI", name: "ICO Guidance on AI and Data Protection", shortName: "ICO AI Guidance", body: "ICO", type: "GUIDANCE", provisions: null, url: null, description: "Guidance on data protection in AI systems.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "HIGH", applicabilityNotes: "Directly relevant to automated underwriting and AI usage", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0285", reference: "ICO-BREACH", name: "ICO Personal Data Breach Reporting", shortName: "ICO Breach", body: "ICO", type: "GUIDANCE", provisions: null, url: null, description: "Guidance on when and how to report breaches.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Breach response procedures", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0286", reference: "ICO-AADC", name: "ICO Age Appropriate Design Code (Children's Code)", shortName: "Children's Code", body: "ICO", type: "GUIDANCE", provisions: null, url: null, description: "Standards for online services likely to be accessed by children.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "ASSESS", applicabilityNotes: "Review whether Updraft's online services may be accessed by under-18s", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0287", reference: "ICO-LEGINT", name: "ICO Legitimate Interests Assessment Guidance", shortName: "ICO LIA Guidance", body: "ICO", type: "GUIDANCE", provisions: null, url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/", description: "Detailed guidance on conducting and documenting a Legitimate Interests Assessment (LIA) — the three-part test: purpose, necessity, balancing.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Must conduct LIA for every processing activity relying on legitimate interests. Document and review regularly.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0288", reference: "ICO-CONSENT", name: "ICO Consent Guidance", shortName: "ICO Consent", body: "ICO", type: "GUIDANCE", provisions: null, url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/", description: "Detailed guidance on obtaining, recording, and managing consent. Covers: what counts as valid consent, consent for different purposes, consent and children, refreshing consent, consent records.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Essential for marketing consent, cookie consent, and any processing relying on consent basis.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0289", reference: "ICO-ADM", name: "ICO Automated Decision-Making and Profiling Guidance", shortName: "ICO ADM Guidance", body: "ICO", type: "GUIDANCE", provisions: null, url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/automated-decision-making-and-profiling/", description: "Guidance on Art.22 rights, meaningful human involvement, explanation requirements, and safeguards for automated decisions.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Directly applicable to Updraft's credit decisioning. Must implement: human review mechanism, explanation of logic, right to contest.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0290", reference: "ICO-RTBF", name: "ICO Right to Erasure Guidance", shortName: "ICO RTBF", body: "ICO", type: "GUIDANCE", provisions: null, url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/right-to-erasure/", description: "Guidance on handling right to erasure requests — when it applies, exemptions (legal obligation, legal claims), practical implementation, notifying third parties.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "RTBF is a known issue area for Updraft. Must have clear process for handling requests and documenting refusals.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0291", reference: "ICO-ACCOUNTABILITY", name: "ICO Accountability Framework", shortName: "ICO Accountability", body: "ICO", type: "GUIDANCE", provisions: null, url: "https://ico.org.uk/for-organisations/accountability-framework/", description: "ICO's self-assessment framework for demonstrating accountability: leadership and oversight, policies and procedures, training and awareness, individuals' rights, transparency, records of processing, contracts and data sharing, risks and DPIAs, breach management, international transfers.", parentId: "cu-0279", level: 2, regulatoryBody: "ICO", applicability: "CORE", applicabilityNotes: "Use as a self-assessment tool for data protection maturity. Maps to Art.5(2) accountability principle.", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "ICO guidance supports data protection compliance — same SMF as DATA-PROT domain.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0292", reference: "INDUSTRY", name: "Industry Codes, Standards & Voluntary Commitments", shortName: "Industry Codes", body: "Various", type: "INDUSTRY_CODE", provisions: null, url: null, description: "Industry codes of practice, technical standards, and voluntary frameworks.", parentId: null, level: 1, regulatoryBody: "Various", applicability: "HIGH", applicabilityNotes: "Many treated as de facto requirements by regulators", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0293", reference: "ASA-CAP", name: "Advertising Standards Authority — CAP and BCAP Codes", shortName: "ASA Codes", body: "ASA", type: "INDUSTRY_CODE", provisions: null, url: null, description: "CAP Code (non-broadcast) and BCAP Code (broadcast) setting advertising standards.", parentId: "cu-0292", level: 2, regulatoryBody: "ASA", applicability: "HIGH", applicabilityNotes: "All advertising and marketing", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0294", reference: "CAP Code", name: "UK Code of Non-Broadcast Advertising", shortName: "CAP Code", body: "ASA", type: "INDUSTRY_CODE", provisions: null, url: null, description: "Standards for non-broadcast advertising.", parentId: "cu-0293", level: 3, regulatoryBody: "ASA", applicability: "HIGH", applicabilityNotes: "Non-broadcast advertising", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0295", reference: "BCAP Code", name: "UK Code of Broadcast Advertising", shortName: "BCAP Code", body: "ASA", type: "INDUSTRY_CODE", provisions: null, url: null, description: "Standards for TV and radio advertising.", parentId: "cu-0293", level: 3, regulatoryBody: "ASA", applicability: "MEDIUM", applicabilityNotes: "If Updraft advertises via broadcast media", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0296", reference: "Ofcom Code", name: "Ofcom Broadcasting Code", shortName: "Ofcom Code", body: "Ofcom", type: "INDUSTRY_CODE", provisions: null, url: null, description: "Standards for TV and radio broadcasters.", parentId: "cu-0293", level: 3, regulatoryBody: "Ofcom", applicability: "LOW", applicabilityNotes: "Broadcast only", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0297", reference: "LSB", name: "Lending Standards Board", shortName: "LSB", body: "LSB", type: "INDUSTRY_CODE", provisions: null, url: null, description: "The Lending Standards Board's Standards of Lending Practice.", parentId: "cu-0292", level: 2, regulatoryBody: "LSB", applicability: "ASSESS", applicabilityNotes: "Review whether Updraft is a signatory", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0298", reference: "LSB-SLP", name: "Standards of Lending Practice for Personal Customers", shortName: "LSB Personal", body: "LSB", type: "INDUSTRY_CODE", provisions: null, url: null, description: "Standards covering product information, application and assessment, managing accounts, dealing with arrears.", parentId: "cu-0297", level: 3, regulatoryBody: "LSB", applicability: "ASSESS", applicabilityNotes: "Best practice standards for personal lending", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0299", reference: "FLA", name: "Finance & Leasing Association — Lending Code", shortName: "FLA Code", body: "FLA", type: "INDUSTRY_CODE", provisions: null, url: null, description: "FLA Lending Code for consumer lending members.", parentId: "cu-0292", level: 2, regulatoryBody: "FLA", applicability: "ASSESS", applicabilityNotes: "Review FLA membership relevance", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0300", reference: "INFO-SEC", name: "Information Security Standards", shortName: "Info Security", body: "Various", type: "INDUSTRY_CODE", provisions: null, url: null, description: "Technical standards and frameworks for information security management.", parentId: "cu-0292", level: 2, regulatoryBody: "Various", applicability: "HIGH", applicabilityNotes: "Essential for protecting customer data", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0301", reference: "ISO 27001", name: "ISO/IEC 27001 — Information Security Management System", shortName: "ISO 27001", body: "ISO", type: "INDUSTRY_CODE", provisions: null, url: null, description: "International standard for ISMS.", parentId: "cu-0300", level: 3, regulatoryBody: "ISO", applicability: "HIGH", applicabilityNotes: "Best practice ISMS", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0302", reference: "CE", name: "Cyber Essentials / Cyber Essentials Plus", shortName: "Cyber Essentials", body: "NCSC", type: "INDUSTRY_CODE", provisions: null, url: null, description: "UK government-backed scheme for basic cyber hygiene.", parentId: "cu-0300", level: 3, regulatoryBody: "NCSC", applicability: "HIGH", applicabilityNotes: "Baseline cyber security certification", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0303", reference: "PCI DSS", name: "Payment Card Industry Data Security Standard", shortName: "PCI DSS", body: "PCI SSC", type: "INDUSTRY_CODE", provisions: null, url: null, description: "Security standard for organisations handling cardholder data.", parentId: "cu-0300", level: 3, regulatoryBody: "PCI SSC", applicability: "ASSESS", applicabilityNotes: "Review whether Updraft processes card data directly", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0304", reference: "NIST CSF", name: "NIST Cybersecurity Framework", shortName: "NIST CSF", body: "NIST", type: "INDUSTRY_CODE", provisions: null, url: null, description: "Cybersecurity framework: Identify, Protect, Detect, Respond, Recover.", parentId: "cu-0300", level: 3, regulatoryBody: "NIST", applicability: "MEDIUM", applicabilityNotes: "Reference framework for cyber risk management", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF3", smfNotes: "Industry codes and standards — SMF16 monitors and advises. Information security standards may sit with CTO (SMF3).", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0305", reference: "OTHER-REGS", name: "Other Regulatory Bodies & Requirements", shortName: "Other Regulators", body: "Various", type: "GUIDANCE", provisions: null, url: null, description: "Requirements from other regulatory bodies that apply to Updraft.", parentId: null, level: 1, regulatoryBody: "Various", applicability: "MEDIUM", applicabilityNotes: "Various bodies with jurisdiction over aspects of Updraft's operations", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Other regulators — FOS within PR-C, TPR within HR, HMRC within finance. SMF16 coordinates regulatory relationships.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0306", reference: "FOS", name: "Financial Ombudsman Service", shortName: "FOS", body: "FOS", type: "GUIDANCE", provisions: null, url: null, description: "FOS handles complaints referred by consumers. Decisions binding up to £430k.", parentId: "cu-0305", level: 2, regulatoryBody: "FOS", applicability: "CORE", applicabilityNotes: "Must cooperate with FOS — complaint outcomes are binding", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Other regulators — FOS within PR-C, TPR within HR, HMRC within finance. SMF16 coordinates regulatory relationships.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0307", reference: "CMA", name: "Competition and Markets Authority", shortName: "CMA", body: "CMA", type: "GUIDANCE", provisions: null, url: null, description: "Enforces competition law and consumer protection law.", parentId: "cu-0305", level: 2, regulatoryBody: "CMA", applicability: "MEDIUM", applicabilityNotes: "Competition law compliance", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Other regulators — FOS within PR-C, TPR within HR, HMRC within finance. SMF16 coordinates regulatory relationships.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0308", reference: "TPR", name: "The Pensions Regulator", shortName: "TPR", body: "TPR", type: "GUIDANCE", provisions: null, url: null, description: "Regulates workplace pensions including auto-enrolment duties.", parentId: "cu-0305", level: 2, regulatoryBody: "TPR", applicability: "HIGH", applicabilityNotes: "Auto-enrolment supervision", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Other regulators — FOS within PR-C, TPR within HR, HMRC within finance. SMF16 coordinates regulatory relationships.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0309", reference: "HSE", name: "Health and Safety Executive", shortName: "HSE", body: "HSE", type: "GUIDANCE", provisions: null, url: null, description: "Enforces workplace health and safety requirements.", parentId: "cu-0305", level: 2, regulatoryBody: "HSE", applicability: "HIGH", applicabilityNotes: "Workplace safety compliance", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Other regulators — FOS within PR-C, TPR within HR, HMRC within finance. SMF16 coordinates regulatory relationships.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0310", reference: "CH", name: "Companies House", shortName: "Companies House", body: "Companies House", type: "GUIDANCE", provisions: null, url: null, description: "Filing obligations: confirmation statement, accounts, director/PSC changes.", parentId: "cu-0305", level: 2, regulatoryBody: "Companies House", applicability: "HIGH", applicabilityNotes: "Company filing deadlines", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Other regulators — FOS within PR-C, TPR within HR, HMRC within finance. SMF16 coordinates regulatory relationships.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0311", reference: "HMRC-SUP", name: "HMRC — Tax Authority", shortName: "HMRC", body: "HMRC", type: "GUIDANCE", provisions: null, url: null, description: "Tax compliance: corporation tax, VAT, PAYE/NIC.", parentId: "cu-0305", level: 2, regulatoryBody: "HMRC", applicability: "HIGH", applicabilityNotes: "Tax compliance and reporting", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Other regulators — FOS within PR-C, TPR within HR, HMRC within finance. SMF16 coordinates regulatory relationships.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0312", reference: "NCA", name: "National Crime Agency", shortName: "NCA", body: "NCA", type: "GUIDANCE", provisions: null, url: "https://www.nationalcrimeagency.gov.uk", description: "Receives Suspicious Activity Reports (SARs). Can issue Defence Against Money Laundering (DAML) consents.", parentId: "cu-0305", level: 2, regulatoryBody: "NCA", applicability: "CORE", applicabilityNotes: "SAR submission and DAML regime", isApplicable: true, primarySMF: "SMF16", secondarySMF: "SMF1", smfNotes: "Other regulators — FOS within PR-C, TPR within HR, HMRC within finance. SMF16 coordinates regulatory relationships.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0313", reference: "OP-RES", name: "Operational Resilience & Outsourcing", shortName: "Op Resilience", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "FCA requirements for operational resilience, outsourcing, and third-party risk management.", parentId: null, level: 1, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Third-party reliance is a known risk for Updraft", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "Operational resilience — allocate to CTO/COO (SMF3) for technology and outsourcing. SMF1 has board-level accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0314", reference: "SYSC 3.2", name: "Outsourcing requirements", shortName: "SYSC Outsourcing", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Requirements for outsourcing: due diligence, contractual provisions, monitoring, business continuity, regulatory access rights.", parentId: "cu-0313", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "All material outsourcing arrangements", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "Operational resilience — allocate to CTO/COO (SMF3) for technology and outsourcing. SMF1 has board-level accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0315", reference: "SYSC 8", name: "Outsourcing: additional requirements", shortName: "SYSC 8 Outsourcing", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Additional outsourcing requirements.", parentId: "cu-0313", level: 2, regulatoryBody: "FCA", applicability: "MEDIUM", applicabilityNotes: "Check applicability to Updraft's permission set", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "Operational resilience — allocate to CTO/COO (SMF3) for technology and outsourcing. SMF1 has board-level accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0316", reference: "FCA-OR", name: "FCA Operational Resilience Requirements", shortName: "FCA Op Resilience", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: null, description: "Identify important business services, set impact tolerances, mapping and testing.", parentId: "cu-0313", level: 2, regulatoryBody: "FCA", applicability: "HIGH", applicabilityNotes: "Operational resilience framework", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "Operational resilience — allocate to CTO/COO (SMF3) for technology and outsourcing. SMF1 has board-level accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0317", reference: "DORA-UK", name: "Digital Operational Resilience (UK approach)", shortName: "Digital Resilience", body: "FCA", type: "GUIDANCE", provisions: null, url: null, description: "UK's approach to digital operational resilience.", parentId: "cu-0313", level: 2, regulatoryBody: "FCA", applicability: "MEDIUM", applicabilityNotes: "Evolving requirements — monitor FCA consultations", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF1", smfNotes: "Operational resilience — allocate to CTO/COO (SMF3) for technology and outsourcing. SMF1 has board-level accountability.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0318", reference: "MISC-LEG", name: "Additional Applicable Legislation", shortName: "Misc. Legislation", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Other UK legislation that applies to Updraft's operations.", parentId: null, level: 1, regulatoryBody: "Parliament", applicability: "MEDIUM", applicabilityNotes: "Various statutory obligations", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Miscellaneous legislation — SMF1 has general accountability. SMF16 advises on specific regulatory aspects.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0319", reference: "CDPA 1988", name: "Copyright, Designs and Patents Act 1988", shortName: "Copyright Act", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Copyright protection — relevant to marketing content and IP.", parentId: "cu-0318", level: 2, regulatoryBody: "Parliament", applicability: "MEDIUM", applicabilityNotes: "Marketing content and IP", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Miscellaneous legislation — SMF1 has general accountability. SMF16 advises on specific regulatory aspects.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0320", reference: "LA 1980", name: "Limitation Act 1980", shortName: "Limitation Act", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Time limits for legal claims — 6 years for contract/tort, 12 years for specialty.", parentId: "cu-0318", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Informs records retention policy and debt recovery timelines", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Miscellaneous legislation — SMF1 has general accountability. SMF16 advises on specific regulatory aspects.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0321", reference: "HRA 1998", name: "Human Rights Act 1998", shortName: "HRA 1998", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Incorporates ECHR rights — particularly Article 8 (privacy) and Article 14 (non-discrimination).", parentId: "cu-0318", level: 2, regulatoryBody: "Parliament", applicability: "MEDIUM", applicabilityNotes: "Privacy and discrimination considerations", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Miscellaneous legislation — SMF1 has general accountability. SMF16 advises on specific regulatory aspects.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0322", reference: "PIA 1998", name: "Public Interest Disclosure Act 1998", shortName: "PIDA", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "Whistleblower protection framework.", parentId: "cu-0318", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Whistleblowing protection", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Miscellaneous legislation — SMF1 has general accountability. SMF16 advises on specific regulatory aspects.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0323", reference: "DRS 2021", name: "Debt Respite Scheme (Breathing Space) Regulations 2021", shortName: "Breathing Space Regs", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Detailed regulations for the Breathing Space scheme: standard (60 days) and mental health crisis breathing space.", parentId: "cu-0318", level: 2, regulatoryBody: "Parliament", applicability: "CORE", applicabilityNotes: "Directly applicable to collections — must implement breathing space", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Miscellaneous legislation — SMF1 has general accountability. SMF16 advises on specific regulatory aspects.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0324", reference: "OSA 2023", name: "Online Safety Act 2023", shortName: "Online Safety", body: "Ofcom", type: "LEGISLATION", provisions: null, url: "https://www.legislation.gov.uk/ukpga/2023/50", description: "New regime for online platforms regarding illegal content, children's safety, and fraudulent advertising. Includes duty to prevent paid-for fraudulent advertising.", parentId: "cu-0318", level: 2, regulatoryBody: "Ofcom", applicability: "ASSESS", applicabilityNotes: "Review whether any Updraft online activities fall within scope", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Miscellaneous legislation — SMF1 has general accountability. SMF16 advises on specific regulatory aspects.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0325", reference: "ECCT 2023-FRAUD", name: "Economic Crime and Corporate Transparency Act 2023 — Failure to Prevent Fraud", shortName: "Failure to Prevent Fraud", body: "Parliament", type: "LEGISLATION", provisions: null, url: null, description: "New corporate offence: large organisations guilty if an employee, agent, subsidiary, or associated person commits a fraud offence intending to benefit the organisation, unless it had reasonable fraud prevention procedures.", parentId: "cu-0318", level: 2, regulatoryBody: "Parliament", applicability: "HIGH", applicabilityNotes: "Must implement 'reasonable fraud prevention procedures' — similar structure to Bribery Act adequate procedures", isApplicable: true, primarySMF: "SMF1", secondarySMF: "SMF16", smfNotes: "Miscellaneous legislation — SMF1 has general accountability. SMF16 advises on specific regulatory aspects.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0326", reference: "PAYMENTS", name: "Payment Services Regulation", shortName: "Payment Services", body: "FCA/PSR", type: "LEGISLATION", provisions: null, url: null, description: "Regulations governing payment services and electronic money.", parentId: null, level: 1, regulatoryBody: "FCA/PSR", applicability: "ASSESS", applicabilityNotes: "Review whether Updraft holds any payment-related permissions", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Payment services — allocate to CTO/COO (SMF3) if applicable. SMF16 advises on permissions.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0327", reference: "PSR 2017", name: "Payment Services Regulations 2017", shortName: "PSRs 2017", body: "FCA", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Implements PSD2 in the UK.", parentId: "cu-0326", level: 2, regulatoryBody: "FCA", applicability: "ASSESS", applicabilityNotes: "Review whether loan disbursement/collection triggers PSR obligations", isApplicable: true, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Payment services — allocate to CTO/COO (SMF3) if applicable. SMF16 advises on permissions.", complianceStatus: "NOT_ASSESSED" },
    { id: "cu-0328", reference: "EMR 2011", name: "Electronic Money Regulations 2011", shortName: "EMRs 2011", body: "FCA", type: "STATUTORY_INSTRUMENT", provisions: null, url: null, description: "Regulations for electronic money institutions.", parentId: "cu-0326", level: 2, regulatoryBody: "FCA", applicability: "N_A", applicabilityNotes: "Updraft is not an e-money institution", isApplicable: false, primarySMF: "SMF3", secondarySMF: "SMF16", smfNotes: "Payment services — allocate to CTO/COO (SMF3) if applicable. SMF16 advises on permissions.", complianceStatus: "NOT_ASSESSED" },
  ];

  // Insert by level order (1→2→3→4) so parents exist before children
  for (const level of [1, 2, 3, 4]) {
    for (const reg of CU_SEED.filter(r => r.level === level)) {
      await prisma.regulation.upsert({
        where: { id: reg.id },
        update: {
          name: reg.name, shortName: reg.shortName, body: reg.body, type: reg.type,
          provisions: reg.provisions, url: reg.url, description: reg.description,
          parentId: reg.parentId, level: reg.level, regulatoryBody: reg.regulatoryBody,
          applicability: reg.applicability, applicabilityNotes: reg.applicabilityNotes,
          isApplicable: reg.isApplicable,
          primarySMF: reg.primarySMF, secondarySMF: reg.secondarySMF,
          smfNotes: reg.smfNotes,
          complianceStatus: reg.complianceStatus,
        },
        create: reg,
      });
    }
  }
  console.log(`  ✓ ${CU_SEED.length} compliance universe regulations`);

  // ── Financial Promotions Controls (FP-C001 to FP-C018) ────────────────
  // Create new business area for Financial Promotions
  await prisma.controlBusinessArea.upsert({
    where: { id: "ba-finprom" },
    update: { name: "Financial Promotions", sortOrder: 10 },
    create: { id: "ba-finprom", name: "Financial Promotions", sortOrder: 10 },
  });
  console.log("  ✓ 1 business area (Financial Promotions)");

  // Delete old FP controls if re-running
  const oldFpControls = await prisma.control.findMany({ where: { controlRef: { startsWith: "FP-C" } } });
  for (const c of oldFpControls) {
    await prisma.testingScheduleEntry.deleteMany({ where: { controlId: c.id } });
    await prisma.control.delete({ where: { id: c.id } });
  }

  const FP_CONTROLS: {
    controlRef: string; controlName: string; controlDescription: string;
    controlType: "PREVENTATIVE" | "DETECTIVE";
    controlFrequency: "EVENT_DRIVEN" | "MONTHLY" | "QUARTERLY" | "ANNUAL";
    controlOwnerId: string;
    consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT" | "CONSUMER_UNDERSTANDING" | "CONSUMER_SUPPORT" | "PRODUCTS_AND_SERVICES";
    testDescription: string;
    testFrequency: "MONTHLY" | "QUARTERLY" | "ANNUAL";
    evidenceRequired: string;
    passFailCriteria: string;
  }[] = [
    {
      controlRef: "FP-C001", controlName: "Pre-publication compliance sign-off",
      controlDescription: "All financial promotions must receive documented compliance sign-off before publication. The approver verifies content against CONC 3 requirements including risk warnings, representative APR, and clear/fair/not misleading standard.",
      controlType: "PREVENTATIVE", controlFrequency: "EVENT_DRIVEN", controlOwnerId: "user-cath",
      consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      testDescription: "Sample 10 promotions published in the period and verify each has a signed-off compliance approval record dated before the publication date.",
      testFrequency: "MONTHLY", evidenceRequired: "Approval log entries, signed compliance checklists",
      passFailCriteria: "PASS if 100% of sampled promotions have prior approval. FAIL if any published without sign-off.",
    },
    {
      controlRef: "FP-C002", controlName: "Representative APR accuracy check",
      controlDescription: "Verify that all promotions displaying a representative APR use the correct median rate from the current product terms. Check is performed before approval and re-checked whenever product rates change.",
      controlType: "PREVENTATIVE", controlFrequency: "EVENT_DRIVEN", controlOwnerId: "user-cath",
      consumerDutyOutcome: "CONSUMER_UNDERSTANDING",
      testDescription: "Compare the APR shown in 5 current live promotions against the product rate sheet to confirm the representative APR is correct.",
      testFrequency: "QUARTERLY", evidenceRequired: "Product rate sheet, screenshots of live promotions",
      passFailCriteria: "PASS if all APRs match current rates. FAIL if any discrepancy found.",
    },
    {
      controlRef: "FP-C003", controlName: "Risk warning prominence review",
      controlDescription: "Ensure risk warnings and required disclosures are given at least equal prominence to any headline benefit or claim. Checks font size, positioning, colour contrast and reading order.",
      controlType: "PREVENTATIVE", controlFrequency: "EVENT_DRIVEN", controlOwnerId: "user-cath",
      consumerDutyOutcome: "CONSUMER_UNDERSTANDING",
      testDescription: "Review 10 promotions and assess whether risk warnings meet the FCA prominence requirements (CONC 3.5.3R).",
      testFrequency: "MONTHLY", evidenceRequired: "Promotion screenshots with annotations, checklist results",
      passFailCriteria: "PASS if all 10 meet prominence standards. FAIL if any warning is materially less prominent than benefits.",
    },
    {
      controlRef: "FP-C004", controlName: "Vulnerable customer content screening",
      controlDescription: "Screen promotions for language or imagery that could exploit or confuse vulnerable consumers. Check for pressure tactics, misleading urgency, and inappropriate targeting.",
      controlType: "PREVENTATIVE", controlFrequency: "EVENT_DRIVEN", controlOwnerId: "user-ash",
      consumerDutyOutcome: "CONSUMER_SUPPORT",
      testDescription: "Review all promotions published in the period against the vulnerability screening checklist.",
      testFrequency: "QUARTERLY", evidenceRequired: "Vulnerability screening checklist, promotion copies",
      passFailCriteria: "PASS if no promotions contain inappropriate language/targeting. FAIL if any issue identified.",
    },
    {
      controlRef: "FP-C005", controlName: "Monthly live promotions monitoring",
      controlDescription: "Conduct a monthly review of all active financial promotions across website, app, email, social media, and comparison sites to confirm ongoing accuracy and compliance.",
      controlType: "DETECTIVE", controlFrequency: "MONTHLY", controlOwnerId: "user-cath",
      consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      testDescription: "Verify the monthly monitoring report is completed and covers all active channels. Sample 5 promotions from the report for detailed compliance re-check.",
      testFrequency: "MONTHLY", evidenceRequired: "Monthly monitoring report, sample re-check notes",
      passFailCriteria: "PASS if monitoring report completed on time and samples pass re-check. FAIL if monitoring not performed or material issues found in samples.",
    },
    {
      controlRef: "FP-C006", controlName: "Third-party & affiliate content review",
      controlDescription: "All promotions by third-party affiliates or partner sites must meet the same approval standards as internal promotions. Periodic review of affiliate content for accuracy.",
      controlType: "DETECTIVE", controlFrequency: "QUARTERLY", controlOwnerId: "user-ash",
      consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      testDescription: "Obtain copies of all affiliate/third-party promotions active in the quarter. Review a sample of 5 against compliance standards.",
      testFrequency: "QUARTERLY", evidenceRequired: "Affiliate promotion copies, compliance review results",
      passFailCriteria: "PASS if all sampled affiliate promotions are compliant. FAIL if any contain unapproved content or inaccuracies.",
    },
    {
      controlRef: "FP-C007", controlName: "Promotion withdrawal procedure",
      controlDescription: "Defined procedure to withdraw or amend any promotion that becomes misleading or non-compliant. Must be actioned within 24 hours of identification.",
      controlType: "DETECTIVE", controlFrequency: "EVENT_DRIVEN", controlOwnerId: "user-cath",
      consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      testDescription: "Review all withdrawal incidents in the period. Verify each was actioned within the 24-hour SLA and root cause was documented.",
      testFrequency: "QUARTERLY", evidenceRequired: "Withdrawal log, timestamps, root cause analysis",
      passFailCriteria: "PASS if all withdrawals met SLA and were documented. FAIL if any exceeded 24 hours or lacked documentation.",
    },
    {
      controlRef: "FP-C008", controlName: "Financial promotions register maintenance",
      controlDescription: "Maintain a complete and up-to-date register of all financial promotions including reference, channel, approval date, review date, and live/withdrawn status.",
      controlType: "PREVENTATIVE", controlFrequency: "MONTHLY", controlOwnerId: "user-cath",
      consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      testDescription: "Verify the promotions register is complete by cross-referencing against known active promotions. Check for any unregistered items.",
      testFrequency: "QUARTERLY", evidenceRequired: "Promotions register extract, cross-reference list",
      passFailCriteria: "PASS if register is complete and up to date. FAIL if any active promotion is missing or data fields are incomplete.",
    },
    {
      controlRef: "FP-C009", controlName: "PECR consent and opt-out compliance",
      controlDescription: "Ensure all electronic direct marketing (email, SMS, phone) has valid consent under PECR regulations 21-23 and that opt-out requests are processed within 28 days.",
      controlType: "PREVENTATIVE", controlFrequency: "EVENT_DRIVEN", controlOwnerId: "user-ash",
      consumerDutyOutcome: "CONSUMER_SUPPORT",
      testDescription: "Sample 20 marketing recipients and verify valid consent records exist. Test 5 opt-out requests for processing timeliness.",
      testFrequency: "QUARTERLY", evidenceRequired: "Consent records, opt-out processing logs, timestamps",
      passFailCriteria: "PASS if all sampled recipients have valid consent and opt-outs processed within 28 days. FAIL if any gaps.",
    },
    {
      controlRef: "FP-C010", controlName: "GDPR lawful basis for marketing data",
      controlDescription: "Confirm that all personal data used for marketing targeting and audience segmentation has a documented lawful basis under UK GDPR Article 6.",
      controlType: "PREVENTATIVE", controlFrequency: "QUARTERLY", controlOwnerId: "user-ash",
      consumerDutyOutcome: "CONSUMER_SUPPORT",
      testDescription: "Review the data processing register for marketing activities. Verify each processing activity has a documented lawful basis.",
      testFrequency: "QUARTERLY", evidenceRequired: "Data processing register, DPIA (if applicable), lawful basis records",
      passFailCriteria: "PASS if all marketing data processing has documented lawful basis. FAIL if any processing lacks documentation.",
    },
    {
      controlRef: "FP-C011", controlName: "Consumer Duty outcomes assessment",
      controlDescription: "Quarterly assessment of whether financial promotions are delivering good consumer outcomes including consumer understanding, fair value communication, and support for consumer decision-making.",
      controlType: "DETECTIVE", controlFrequency: "QUARTERLY", controlOwnerId: "user-rob",
      consumerDutyOutcome: "CONSUMER_UNDERSTANDING",
      testDescription: "Review MI data on consumer complaints related to promotions, click-through-to-application ratios, and early arrears by acquisition channel.",
      testFrequency: "QUARTERLY", evidenceRequired: "Complaints MI, conversion analytics, early arrears data by channel",
      passFailCriteria: "PASS if no adverse trends in complaints or early arrears linked to promotion messaging. FAIL if data shows adverse outcomes.",
    },
    {
      controlRef: "FP-C012", controlName: "Accessibility and equality compliance",
      controlDescription: "Review promotions for accessibility (WCAG 2.1 AA for digital, plain English for all) and compliance with Equality Act 2010 non-discrimination requirements.",
      controlType: "DETECTIVE", controlFrequency: "QUARTERLY", controlOwnerId: "user-ash",
      consumerDutyOutcome: "CONSUMER_SUPPORT",
      testDescription: "Run WCAG 2.1 AA automated tests on 5 digital promotions. Review 3 non-digital promotions for plain English and accessibility.",
      testFrequency: "QUARTERLY", evidenceRequired: "WCAG test results, plain English review notes",
      passFailCriteria: "PASS if all tested promotions meet WCAG AA and plain English standards. FAIL if any material accessibility issues.",
    },
    {
      controlRef: "FP-C013", controlName: "SM&CR accountability mapping",
      controlDescription: "Ensure the SM&CR responsibilities map clearly identifies the senior manager accountable for financial promotions (typically SMF16 or SMF24) and that the individual is aware of their duties.",
      controlType: "PREVENTATIVE", controlFrequency: "ANNUAL", controlOwnerId: "user-rob",
      consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      testDescription: "Review the SM&CR responsibilities map and confirm the financial promotions accountability is correctly assigned and acknowledged.",
      testFrequency: "ANNUAL", evidenceRequired: "SM&CR responsibilities map, acknowledgement records",
      passFailCriteria: "PASS if accountability is clearly assigned and acknowledged. FAIL if mapping is missing or outdated.",
    },
    {
      controlRef: "FP-C014", controlName: "Quarterly Board/ExCo MI reporting",
      controlDescription: "Prepare and present quarterly management information on financial promotions compliance to the Board or Executive Committee, including approval volumes, issues, and Consumer Duty metrics.",
      controlType: "DETECTIVE", controlFrequency: "QUARTERLY", controlOwnerId: "user-rob",
      consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      testDescription: "Verify the quarterly MI report was produced, presented, and that any actions arising were recorded in Board/ExCo minutes.",
      testFrequency: "QUARTERLY", evidenceRequired: "MI report, Board/ExCo minutes, action tracker",
      passFailCriteria: "PASS if report produced on time, presented, and actions tracked. FAIL if report missing or not presented.",
    },
    {
      controlRef: "FP-C015", controlName: "Annual policy review completion",
      controlDescription: "The Financial Promotions Policy must be reviewed at least annually. The review must cover regulatory changes, control effectiveness, and alignment with current products and channels.",
      controlType: "DETECTIVE", controlFrequency: "ANNUAL", controlOwnerId: "user-cath",
      consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      testDescription: "Verify the policy was reviewed within 365 days of the last review date, with documented evidence of regulatory and control assessment.",
      testFrequency: "ANNUAL", evidenceRequired: "Policy review record, sign-off document, change log",
      passFailCriteria: "PASS if review completed within 365 days with full documentation. FAIL if overdue or documentation incomplete.",
    },
    {
      controlRef: "FP-C016", controlName: "Comparison site listing accuracy",
      controlDescription: "Monthly verification that product listings on price comparison websites display correct rates, terms, and required disclosures.",
      controlType: "DETECTIVE", controlFrequency: "MONTHLY", controlOwnerId: "user-chris",
      consumerDutyOutcome: "CONSUMER_UNDERSTANDING",
      testDescription: "Check listings on 3 major comparison sites against current product terms. Verify APR, fees, and eligibility criteria are accurate.",
      testFrequency: "MONTHLY", evidenceRequired: "Comparison site screenshots, product terms sheet, variance log",
      passFailCriteria: "PASS if all listings accurate. FAIL if any material discrepancy found.",
    },
    {
      controlRef: "FP-C017", controlName: "Social media promotion compliance",
      controlDescription: "Review all social media financial promotions (paid and organic) for compliance with character-limited formats, ensuring required warnings and disclosures are accessible.",
      controlType: "DETECTIVE", controlFrequency: "MONTHLY", controlOwnerId: "user-chris",
      consumerDutyOutcome: "CONSUMER_UNDERSTANDING",
      testDescription: "Review all social media promotions published in the month. Verify each contains required disclosures or links to full terms.",
      testFrequency: "MONTHLY", evidenceRequired: "Social media post copies, compliance review log",
      passFailCriteria: "PASS if all posts compliant. FAIL if any post lacks required disclosures.",
    },
    {
      controlRef: "FP-C018", controlName: "Material change re-approval process",
      controlDescription: "Any material change to an approved financial promotion (pricing, terms, claims, target audience) must go through the full re-approval process before the amended version is published.",
      controlType: "PREVENTATIVE", controlFrequency: "EVENT_DRIVEN", controlOwnerId: "user-cath",
      consumerDutyOutcome: "GOVERNANCE_CULTURE_OVERSIGHT",
      testDescription: "Identify all promotions amended in the period. Verify each amendment went through re-approval before the updated version went live.",
      testFrequency: "QUARTERLY", evidenceRequired: "Amendment log, re-approval records, before/after versions",
      passFailCriteria: "PASS if all amendments have re-approval records. FAIL if any amendment published without re-approval.",
    },
  ];

  const fpControlIds: string[] = [];
  for (const fp of FP_CONTROLS) {
    const ctrl = await prisma.control.create({
      data: {
        controlRef: fp.controlRef,
        controlName: fp.controlName,
        controlDescription: fp.controlDescription,
        businessAreaId: "ba-finprom",
        controlOwnerId: fp.controlOwnerId,
        consumerDutyOutcome: fp.consumerDutyOutcome,
        controlFrequency: fp.controlFrequency,
        internalOrThirdParty: "INTERNAL",
        controlType: fp.controlType,
        isActive: true,
        createdById: "user-rob",
      },
    });
    fpControlIds.push(ctrl.id);

    // Create TestingScheduleEntry
    await prisma.testingScheduleEntry.create({
      data: {
        controlId: ctrl.id,
        testingFrequency: fp.testFrequency,
        assignedTesterId: fp.controlOwnerId,
        summaryOfTest: fp.testDescription,
        isActive: true,
        standingComments: `Evidence: ${fp.evidenceRequired}\n\nPass/Fail: ${fp.passFailCriteria}`,
        addedById: "user-rob",
      },
    });
  }
  console.log(`  ✓ ${FP_CONTROLS.length} financial promotions controls (FP-C001 to FP-C018) with testing schedules`);

  // ── Seed All 21 Policies (from CSV, correct owners & regulation/control links) ─────
  // Also link the 18 FP controls to POL-001 since they were created above
  const fpControlIds2 = fpControlIds; // alias from above scope

  // Email → user-id lookup
  const EMAIL_TO_USER: Record<string, string> = {
    "rob@updraft.com": "user-rob",
    "cath@updraft.com": "user-cath",
    "ash@updraft.com": "user-ash",
    "chris@updraft.com": "user-chris",
    "micha@updraft.com": "user-micha",
    "david@updraft.com": "user-david",
    "graham@updraft.com": "user-graham",
    "Aseem@updraft.com": "user-ceo",
  };

  type PolicySeed = {
    id: string; reference: string; name: string; description: string;
    status: "CURRENT" | "OVERDUE" | "UNDER_REVIEW" | "ARCHIVED";
    version: string; ownerEmail: string; approvedBy: string; approvingBody: string;
    classification: string; reviewFrequencyDays: number;
    effectiveDate: string; lastReviewedDate: string; nextReviewDate: string;
    scope: string; applicability: string; exceptions: string;
    consumerDutyOutcomes: string[];
    regulationRefs: string[]; controlRefs: string[];
  };

  const ALL_POLICIES: PolicySeed[] = [
    {
      id: "pol-001", reference: "POL-001", name: "Financial Promotions Policy",
      description: "Comprehensive policy governing all financial promotions and marketing communications issued by or on behalf of Updraft, covering promotional materials across websites, social media, app notifications, and other channels. Ensures all promotions comply with CONC rules, are fair and clear, include appropriate risk warnings, and target the intended audience appropriately. Sets out approval workflows, review procedures, and escalation paths for promotional content.",
      status: "CURRENT", version: "4.1", ownerEmail: "ash@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2024-01-15", lastReviewedDate: "2024-01-15", nextReviewDate: "2025-01-15",
      scope: "All financial promotions, marketing communications, social media, website content, app notifications issued by or on behalf of Updraft",
      applicability: "All staff involved in marketing, communications, product, and any external agencies producing promotional material",
      exceptions: "Internal communications not visible to customers; regulatory correspondence",
      consumerDutyOutcomes: ["products-services", "consumer-understanding"],
      regulationRefs: ["CONC 3", "CONC 3.1", "CONC 3.2", "CONC 3.3", "CONC 3.5", "CONC 3.6", "CONC 3.7", "CONC 3.9", "PRIN 7", "PRIN 12", "PRIN 2A.5"],
      controlRefs: ["CTRL-FP-001", "CTRL-FP-002", "CTRL-FP-003", "CTRL-FP-004", "CTRL-FP-005", "CTRL-FP-006", "CTRL-FP-007", "CTRL-FP-008", "CTRL-FP-009", "CTRL-FP-010", "CTRL-FP-011", "CTRL-FP-012", "CTRL-FP-013", "CTRL-FP-014", "CTRL-FP-015"],
    },
    {
      id: "pol-002", reference: "POL-002", name: "Complaints Policy",
      description: "Establishes the framework for handling all customer complaints received directly or forwarded from partner firms including TrueLayer, Modulr, and TransUnion. Defines complaint classification, timeframes for response and resolution, escalation procedures, root cause analysis, and reporting obligations. Ensures fair treatment of complainants and compliance with DISP rules, whilst also capturing complaint data for conduct risk monitoring.",
      status: "CURRENT", version: "1", ownerEmail: "chris@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2023-10-01", lastReviewedDate: "2023-10-01", nextReviewDate: "2024-10-01",
      scope: "All complaints received from customers, potential customers, and third parties relating to Updraft products and services including those forwarded from partner firms (TrueLayer, Modulr, TransUnion)",
      applicability: "All staff who may receive or handle customer complaints, customer services team, compliance team, senior management",
      exceptions: "Service requests that do not express dissatisfaction; internal operational queries",
      consumerDutyOutcomes: ["consumer-support"],
      regulationRefs: ["DISP", "DISP 1", "PRIN 6", "PRIN 12", "PRIN 2A.6", "CONC 2.2", "SYSC 9"],
      controlRefs: ["CTRL-CMP-001", "CTRL-CMP-002", "CTRL-CMP-003", "CTRL-CMP-004", "CTRL-CMP-005", "CTRL-CMP-006", "CTRL-CMP-007", "CTRL-CMP-008", "CTRL-CMP-009", "CTRL-CMP-010", "CTRL-CMP-011", "CTRL-CMP-012", "CTRL-CMP-013", "CTRL-CMP-014", "CTRL-CMP-015", "CTRL-CMP-016", "CTRL-CMP-017", "CTRL-CMP-018"],
    },
    {
      id: "pol-003", reference: "POL-003", name: "Vulnerable Customers Policy",
      description: "Comprehensive policy addressing the identification, support, and fair treatment of vulnerable customers throughout their interaction with Updraft. Defines vulnerability characteristics including age, health, disability, language barriers, financial hardship, and literacy levels. Sets out tailored support measures, communication adjustments, extended timeframes, signposting to external support services, and staff training requirements. Ensures compliance with Consumer Duty outcome 2 requirements around fair outcomes.",
      status: "CURRENT", version: "1", ownerEmail: "chris@updraft.com",
      approvedBy: "ExCo", approvingBody: "ExCo", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2024-03-01", lastReviewedDate: "2024-03-01", nextReviewDate: "2025-03-01",
      scope: "Identification, support, and fair treatment of customers displaying characteristics of vulnerability across all stages of the customer journey from application through to collections and account closure",
      applicability: "All staff interacting with customers directly or indirectly, including customer services, collections, underwriting, product, and technology teams",
      exceptions: "None — vulnerability considerations apply to all customer interactions",
      consumerDutyOutcomes: ["products-services", "consumer-understanding", "consumer-support"],
      regulationRefs: ["CONC 2.10", "PRIN 6", "PRIN 12", "PRIN 2A.2", "PRIN 2A.5", "PRIN 2A.6", "Equality Act 2010"],
      controlRefs: ["CTRL-VUL-001", "CTRL-VUL-002", "CTRL-VUL-003", "CTRL-VUL-004", "CTRL-VUL-005", "CTRL-VUL-006", "CTRL-VUL-007", "CTRL-VUL-008", "CTRL-VUL-009", "CTRL-VUL-010", "CTRL-VUL-011", "CTRL-VUL-012"],
    },
    {
      id: "pol-004", reference: "POL-004", name: "Consumer Lending Credit Policy",
      description: "Establishes the credit decisioning framework for all Updraft consumer lending including automated and manual underwriting, affordability assessment methodology, fraud detection processes, AML/KYC verification procedures, and lending mandates for both balance sheet and forward flow funded loans. Defines credit committee governance, escalation procedures, risk metrics, exposure limits, and compliance with affordability rules. References separate PAYCE product credit policy.",
      status: "CURRENT", version: "11", ownerEmail: "micha@updraft.com",
      approvedBy: "Credit Committee", approvingBody: "Credit Committee", classification: "Confidential",
      reviewFrequencyDays: 365, effectiveDate: "2025-08-01", lastReviewedDate: "2025-08-01", nextReviewDate: "2026-08-01",
      scope: "All consumer lending credit decisions including automated and manual underwriting, affordability assessment, fraud detection, AML/KYC verification, and lending mandates for Updraft balance sheet and forward flow funded loans",
      applicability: "Credit Committee, CEO, Head of Lending, underwriting team, risk analytics, compliance",
      exceptions: "PAYCE product has separate credit policy (POL-016); pilot loans require Credit Committee approval for any deviation",
      consumerDutyOutcomes: ["products-services", "price-value", "consumer-support"],
      regulationRefs: ["CONC 5", "CONC 5.2", "CONC 5.2A", "CONC 5.3", "CONC 5.5", "CONC 9", "PRIN 2", "PRIN 6", "PRIN 12", "PRIN 2A.3", "PRIN 2A.4", "CCA 1974", "FSMA 2000"],
      controlRefs: ["CTRL-CR-001", "CTRL-CR-002", "CTRL-CR-003", "CTRL-CR-004", "CTRL-CR-005", "CTRL-CR-006", "CTRL-CR-007", "CTRL-CR-008", "CTRL-CR-009", "CTRL-CR-010", "CTRL-CR-011", "CTRL-CR-012", "CTRL-CR-013", "CTRL-CR-014", "CTRL-CR-015", "CTRL-CR-016", "CTRL-CR-017", "CTRL-CR-018", "CTRL-CR-019", "CTRL-CR-020", "CTRL-CR-021", "CTRL-CR-022", "CTRL-CR-023", "CTRL-CR-024", "CTRL-CR-025"],
    },
    {
      id: "pol-005", reference: "POL-005", name: "AML/KYC & Sanctions Policy",
      description: "Comprehensive anti-money laundering and counter-terrorist financing policy covering customer due diligence, enhanced due diligence procedures, ongoing monitoring, suspicious activity reporting (SAR) procedures, and CIFAS fraud prevention integration. Details sanction screening requirements using OFAC and UK government lists, PEP identification processes, and money laundering risk assessment methodologies. Establishes Money Laundering Reporting Officer (MLRO) responsibilities and escalation procedures.",
      status: "CURRENT", version: "0.7", ownerEmail: "cath@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Confidential",
      reviewFrequencyDays: 365, effectiveDate: "2024-11-01", lastReviewedDate: "2024-11-01", nextReviewDate: "2025-11-01",
      scope: "Anti-money laundering, counter-terrorist financing, sanctions compliance, customer due diligence, enhanced due diligence, ongoing monitoring, suspicious activity reporting, and CIFAS fraud prevention for all Updraft products and customer relationships",
      applicability: "All staff, with specific responsibilities for MLRO, compliance team, underwriting team, and senior management",
      exceptions: "None — AML obligations apply to all business activities",
      consumerDutyOutcomes: ["consumer-support"],
      regulationRefs: ["SYSC 6", "SYSC 3", "PRIN 1", "PRIN 3", "PRIN 11", "CONC 5.2", "FSMA 2000"],
      controlRefs: ["CTRL-AML-001", "CTRL-AML-002", "CTRL-AML-003", "CTRL-AML-004", "CTRL-AML-005", "CTRL-AML-006", "CTRL-AML-007", "CTRL-AML-008", "CTRL-AML-009", "CTRL-AML-010", "CTRL-AML-011", "CTRL-AML-012", "CTRL-AML-013", "CTRL-AML-014", "CTRL-AML-015", "CTRL-AML-016"],
    },
    {
      id: "pol-006", reference: "POL-006", name: "Group Arrears Policy",
      description: "Comprehensive collections and arrears management policy covering all stages from pre-arrears communication through early, mid and late-stage arrears management, default handling, settlement procedures, write-down and write-off decisions, and external debt collection agency management. Details forbearance options, vulnerability considerations during collections, complaint escalation procedures, and regulatory compliance including CONC 7 requirements. Sets out communication standards and fee procedures.",
      status: "CURRENT", version: "1.3", ownerEmail: "chris@updraft.com",
      approvedBy: "ExCo and Senior Lenders", approvingBody: "ExCo and Senior Lenders", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2023-07-01", lastReviewedDate: "2023-07-01", nextReviewDate: "2024-07-01",
      scope: "All collections and arrears management activities for loans originated on the Updraft platform regardless of loan size or borrower status, including pre-arrears, early/mid/late stage arrears, default, settlement, write-down/write-off, and external collections",
      applicability: "Collections team, customer services, compliance team, senior management, external debt collection agencies",
      exceptions: "Accounts subject to IVA, breathing space, bankruptcy, or active complaint are handled under specific exception procedures within the policy",
      consumerDutyOutcomes: ["consumer-support", "consumer-understanding"],
      regulationRefs: ["CONC 7", "CONC 7.2", "CONC 7.3", "CONC 7.4", "CONC 7.5", "CONC 7.11", "CONC 7.12", "CONC 7.15", "CONC 6.3", "CONC 6.4", "CONC 6.5", "PRIN 6", "PRIN 12", "PRIN 2A.6", "CCA 1974"],
      controlRefs: ["CTRL-AC-001", "CTRL-AC-002", "CTRL-AC-003", "CTRL-AC-004", "CTRL-AC-005", "CTRL-AC-006", "CTRL-AC-007", "CTRL-AC-008", "CTRL-AC-009", "CTRL-AC-010", "CTRL-AC-011", "CTRL-AC-012", "CTRL-AC-013", "CTRL-AC-014", "CTRL-AC-015", "CTRL-AC-016", "CTRL-AC-017", "CTRL-AC-018", "CTRL-AC-019"],
    },
    {
      id: "pol-007", reference: "POL-007", name: "Data Protection Policy",
      description: "Comprehensive data protection policy governing the processing of all personal data by Updraft including customer data, employee data, and third-party data across all systems and processes. Covers data subject rights, data retention, data security measures, third-party processor management, international transfers, breach notification procedures, and Data Protection Impact Assessment (DPIA) requirements. Designates the Data Protection Officer (DPO) and establishes governance framework.",
      status: "CURRENT", version: "2.1", ownerEmail: "cath@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2025-01-01", lastReviewedDate: "2025-01-01", nextReviewDate: "2026-01-01",
      scope: "Processing of all personal data by Updraft including customer data, employee data, and third-party data across all systems, processes, and third-party relationships",
      applicability: "All staff, contractors, and third-party processors handling personal data on behalf of Updraft",
      exceptions: "Anonymised data that cannot be re-identified; publicly available data used for non-commercial purposes",
      consumerDutyOutcomes: ["consumer-support"],
      regulationRefs: ["UK GDPR", "DPA 2018", "PECR", "PRIN 3", "SYSC 9"],
      controlRefs: ["CTRL-DP-001", "CTRL-DP-002", "CTRL-DP-003", "CTRL-DP-004", "CTRL-DP-005", "CTRL-DP-006", "CTRL-DP-007", "CTRL-DP-008", "CTRL-DP-009", "CTRL-DP-010", "CTRL-DP-011", "CTRL-DP-012", "CTRL-DP-013", "CTRL-DP-014"],
    },
    {
      id: "pol-008", reference: "POL-008", name: "Conduct Risk Policy",
      description: "Establishes the framework for identifying, assessing, managing, monitoring, and reporting conduct risk across all Updraft business activities, aligned to FCA Consumer Duty outcomes and Senior Management and Certification Regime (SM&CR) requirements. Covers all conduct risk scenarios including consumer detriment, product design failures, sales process failures, customer support deficiencies, and conflicts of interest. Sets out governance roles, risk appetite, monitoring metrics, and escalation procedures.",
      status: "CURRENT", version: "2", ownerEmail: "cath@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2024-10-01", lastReviewedDate: "2024-10-01", nextReviewDate: "2025-10-01",
      scope: "Identification, assessment, management, monitoring, and reporting of conduct risk across all Updraft business activities, aligned to FCA Consumer Duty and the four consumer outcomes",
      applicability: "All staff, Board members, senior management, with specific responsibilities under SM&CR for certified and conduct rules staff",
      exceptions: "None — conduct risk management applies to all activities",
      consumerDutyOutcomes: ["products-services", "price-value", "consumer-understanding", "consumer-support"],
      regulationRefs: ["PRIN 12", "PRIN 2A", "PRIN 2A.1", "PRIN 2A.2", "PRIN 2A.3", "PRIN 2A.4", "PRIN 2A.5", "PRIN 2A.6", "PRIN 2A.7", "PRIN 2A.8", "PRIN 2A.9", "COCON", "SYSC 4", "SYSC 5", "SYSC 6", "SYSC 7", "FIT"],
      controlRefs: ["CTRL-CDR-001", "CTRL-CDR-002", "CTRL-CDR-003", "CTRL-CDR-004", "CTRL-CDR-005", "CTRL-CDR-006", "CTRL-CDR-007", "CTRL-CDR-008", "CTRL-CDR-009", "CTRL-CDR-010", "CTRL-CDR-011", "CTRL-CDR-012", "CTRL-CDR-013", "CTRL-CDR-014", "CTRL-CDR-015", "CTRL-CDR-016", "CTRL-CDR-017", "CTRL-CDR-018", "CTRL-CDR-019", "CTRL-CDR-020"],
    },
    {
      id: "pol-009", reference: "POL-009", name: "Conflicts of Interest Policy",
      description: "Establishes procedures for identifying, managing, and recording actual and potential conflicts of interest arising in the course of Updraft business activities. Covers personal trading policies, external employment, gifts and hospitality, material shareholdings, family relationships, and financial interests. Sets out disclosure procedures, approval workflows, segregation of duties, and monitoring mechanisms. Ensures fair treatment of customers and compliance with SYSC 10 requirements.",
      status: "CURRENT", version: "3", ownerEmail: "cath@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2025-04-01", lastReviewedDate: "2025-04-01", nextReviewDate: "2026-04-01",
      scope: "Identification, management, and recording of actual and potential conflicts of interest arising in the course of Updraft business activities",
      applicability: "All staff, directors, contractors, and anyone acting on behalf of Updraft",
      exceptions: "Pre-existing shareholdings in non-competing entities below disclosure thresholds",
      consumerDutyOutcomes: ["products-services"],
      regulationRefs: ["SYSC 10", "PRIN 8", "PRIN 1", "COCON"],
      controlRefs: ["CTRL-COI-001", "CTRL-COI-002", "CTRL-COI-003", "CTRL-COI-004", "CTRL-COI-005", "CTRL-COI-006", "CTRL-COI-007", "CTRL-COI-008"],
    },
    {
      id: "pol-010", reference: "POL-010", name: "Anti-Bribery & Corruption Policy",
      description: "Comprehensive anti-corruption policy preventing bribery, corruption, and improper payments in all Updraft business dealings. Covers gifts and hospitality policies with stated monetary thresholds, facilitation payments, political donations, and third-party relationship management. Establishes reporting procedures, due diligence processes for new business partners, and consequences for breaches. Ensures compliance with Bribery Act 2010 and maintaining organisational integrity.",
      status: "CURRENT", version: "3", ownerEmail: "cath@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2025-04-01", lastReviewedDate: "2025-04-01", nextReviewDate: "2026-04-01",
      scope: "Prevention of bribery, corruption, and improper payments in all Updraft business dealings, including gifts, hospitality, facilitation payments, and third-party relationships",
      applicability: "All staff, directors, contractors, agents, consultants, and any person acting on behalf of Updraft",
      exceptions: "Reasonable and proportionate hospitality in the normal course of business below stated thresholds",
      consumerDutyOutcomes: [],
      regulationRefs: ["Bribery Act 2010", "PRIN 1", "PRIN 3", "SYSC 6"],
      controlRefs: ["CTRL-ABC-001", "CTRL-ABC-002", "CTRL-ABC-003", "CTRL-ABC-004", "CTRL-ABC-005", "CTRL-ABC-006", "CTRL-ABC-007", "CTRL-ABC-008", "CTRL-ABC-009", "CTRL-ABC-010"],
    },
    {
      id: "pol-011", reference: "POL-011", name: "Fair Value Assessment Process",
      description: "Establishes the methodology for assessing fair value across all Updraft consumer lending products, evaluating whether the price paid by customers is reasonable relative to the benefits received. Directly addresses Consumer Duty Outcome 2 (Price and Value). Includes comparative analysis against market offerings, profitability assessment, fee structures review, and escalation procedures for products failing fair value tests. Requires documentation and approval from compliance and credit committee.",
      status: "CURRENT", version: "1", ownerEmail: "ash@updraft.com",
      approvedBy: "CCORC", approvingBody: "CCORC", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2023-04-01", lastReviewedDate: "2023-04-01", nextReviewDate: "2024-04-01",
      scope: "Assessment of fair value across all Updraft consumer lending products, evaluating whether the price paid by customers is reasonable relative to the benefits received, in line with Consumer Duty Outcome 2 (Price and Value)",
      applicability: "Product team, pricing team, finance, compliance, Credit Committee",
      exceptions: "None — all products require fair value assessment",
      consumerDutyOutcomes: ["price-value", "products-services"],
      regulationRefs: ["PRIN 12", "PRIN 2A.4", "CONC 5", "PRIN 6"],
      controlRefs: ["CTRL-FVA-001", "CTRL-FVA-002", "CTRL-FVA-003", "CTRL-FVA-004", "CTRL-FVA-005", "CTRL-FVA-006", "CTRL-FVA-007", "CTRL-FVA-008"],
    },
    {
      id: "pol-012", reference: "POL-012", name: "Product Annual Review Policy",
      description: "Establishes the requirement and procedures for annual review of all live Updraft products to assess target market fit, conduct and fair outcomes across all Consumer Duty outcomes, risk exposure, financial performance, and regulatory compliance. Determines whether products continue to meet the intended target market needs and whether any modifications or discontinuation are required. Includes governance approvals and exception handling for authorised non-compliance with formal documentation.",
      status: "CURRENT", version: "1", ownerEmail: "ash@updraft.com",
      approvedBy: "CCORC", approvingBody: "CCORC", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2023-12-01", lastReviewedDate: "2023-12-01", nextReviewDate: "2024-12-01",
      scope: "Annual review of all live Updraft products to assess target market fit, conduct and fair outcomes, risk exposure, financial performance, and regulatory compliance",
      applicability: "Product managers, product directors, Conduct & Complaints Risk Committee, commercial directors, Chief Commercial Officer",
      exceptions: "Authorised non-compliance requires formal documentation, risk assessment (max 1 year), and CCO approval",
      consumerDutyOutcomes: ["products-services", "price-value", "consumer-understanding", "consumer-support"],
      regulationRefs: ["PRIN 12", "PRIN 2A.3", "PRIN 2A.4", "PRIN 2A.7", "PRIN 2A.8", "CONC 2.2", "SYSC 4"],
      controlRefs: ["CTRL-PAR-001", "CTRL-PAR-002", "CTRL-PAR-003", "CTRL-PAR-004", "CTRL-PAR-005", "CTRL-PAR-006", "CTRL-PAR-007", "CTRL-PAR-008", "CTRL-PAR-009", "CTRL-PAR-010", "CTRL-PAR-011", "CTRL-PAR-012"],
    },
    {
      id: "pol-013", reference: "POL-013", name: "IT Security Policy",
      description: "Information security policy covering all Updraft systems and assets, establishing controls for access management, strong authentication, password policy, malware protection and endpoint security, regular system backups, vulnerability management and patching, encryption standards for data in transit and at rest, network security architecture, change management procedures, continuous monitoring and logging, and disaster recovery and business continuity procedures. Policy requires urgent updating as legacy document from Fairscore era.",
      status: "UNDER_REVIEW", version: "1", ownerEmail: "graham@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Confidential",
      reviewFrequencyDays: 365, effectiveDate: "2020-01-01", lastReviewedDate: "2020-01-01", nextReviewDate: "2021-01-01",
      scope: "Information security controls for all Updraft (formerly Fairscore) systems including access management, password policy, malware protection, backups, vulnerability management, encryption, network security, change management, monitoring, and disaster recovery",
      applicability: "All staff with access to Updraft systems, IT team, contractors with system access",
      exceptions: "None stated",
      consumerDutyOutcomes: [],
      regulationRefs: ["SYSC 3", "SYSC 13", "SYSC 15A", "UK GDPR", "DPA 2018"],
      controlRefs: ["CTRL-ITS-001", "CTRL-ITS-002", "CTRL-ITS-003", "CTRL-ITS-004", "CTRL-ITS-005", "CTRL-ITS-006", "CTRL-ITS-007", "CTRL-ITS-008", "CTRL-ITS-009", "CTRL-ITS-010", "CTRL-ITS-011", "CTRL-ITS-012", "CTRL-ITS-013", "CTRL-ITS-014", "CTRL-ITS-015", "CTRL-ITS-016", "CTRL-ITS-017", "CTRL-ITS-018"],
    },
    {
      id: "pol-014", reference: "POL-014", name: "Privacy Policy",
      description: "Customer-facing privacy notice covering all personal data collected, processed, shared, and retained by Fairscore Ltd (trading as Updraft) in connection with the provision of credit information services (via TransUnion), consumer lending products, soft search functionality, account information services (via TrueLayer), direct debit payment processing (via Modulr), and credit broking services (via Everything Financial). Complies with UK GDPR and DPA 2018 requirements including transparency, rights notification, and lawful basis statements.",
      status: "CURRENT", version: "Current", ownerEmail: "graham@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Public",
      reviewFrequencyDays: 365, effectiveDate: "2025-03-01", lastReviewedDate: "2025-03-01", nextReviewDate: "2026-03-01",
      scope: "Customer-facing privacy notice covering all personal data collected, processed, shared, and retained by Fairscore Ltd (trading as Updraft) in connection with the provision of credit information, lending, and related financial services",
      applicability: "All customers, prospective customers, website visitors, and app users",
      exceptions: "Employee data (covered by separate internal privacy notice)",
      consumerDutyOutcomes: ["consumer-understanding"],
      regulationRefs: ["UK GDPR", "DPA 2018", "PECR", "CONC 2.3", "PRIN 7", "PRIN 12", "PRIN 2A.5"],
      controlRefs: ["CTRL-PP-001", "CTRL-PP-002", "CTRL-PP-003", "CTRL-PP-004", "CTRL-PP-005", "CTRL-PP-006", "CTRL-PP-007", "CTRL-PP-008", "CTRL-PP-009", "CTRL-PP-010"],
    },
    {
      id: "pol-015", reference: "POL-015", name: "Consumer Lending Procedures",
      description: "Operational procedures manual for consumer lending covering the complete application processing workflow including Open Banking integration for account information retrieval, affordability assessment methodology and software tools, income and expenditure verification procedures, credit scoring and risk segmentation, automated decision-making and threshold rules, manual underwriting review procedures, KYC/AML verification and ongoing obligations, PEP and sanctions screening procedures, quality assurance and appeal processes, and compliance with CONC 5 rules.",
      status: "CURRENT", version: "13", ownerEmail: "micha@updraft.com",
      approvedBy: "Credit Committee", approvingBody: "Credit Committee", classification: "Confidential",
      reviewFrequencyDays: 365, effectiveDate: "2025-08-01", lastReviewedDate: "2025-08-01", nextReviewDate: "2026-08-01",
      scope: "Operational procedures for consumer lending including application processing, Open Banking integration, affordability assessment, income and expenditure verification, credit scoring, risk segmentation, automated and manual underwriting, KYC verification, PEP/sanctions screening, and quality assurance",
      applicability: "Underwriting team, lead underwriter, senior underwriter, operations team, compliance, CEO (for PEP/sanctions escalation)",
      exceptions: "PAYCE product follows separate procedures within its own credit policy",
      consumerDutyOutcomes: ["products-services", "price-value", "consumer-understanding", "consumer-support"],
      regulationRefs: ["CONC 5", "CONC 5.2", "CONC 5.3", "CONC 13", "CONC 14", "PRIN 2", "PRIN 6", "PRIN 12", "PRIN 2A.2", "PRIN 2A.3", "PRIN 2A.6", "CCA 1974"],
      controlRefs: ["CTRL-CLP-001", "CTRL-CLP-002", "CTRL-CLP-003", "CTRL-CLP-004", "CTRL-CLP-005", "CTRL-CLP-006", "CTRL-CLP-007", "CTRL-CLP-008", "CTRL-CLP-009", "CTRL-CLP-010", "CTRL-CLP-011", "CTRL-CLP-012", "CTRL-CLP-013", "CTRL-CLP-014", "CTRL-CLP-015", "CTRL-CLP-016"],
    },
    {
      id: "pol-016", reference: "POL-016", name: "PAYCE Credit Policy",
      description: "Credit decisioning framework specific to the PAYCE point-of-sale lending product, establishing automatic decline criteria, income verification requirements, affordability assessment procedures, vulnerable customer identification protocols, product pricing rules, exposure management including cross-product exposure controls to prevent overindebtedness, and automated decisioning system parameters. Complements but operates independently from the core Consumer Lending Credit Policy (POL-004).",
      status: "CURRENT", version: "1.3", ownerEmail: "micha@updraft.com",
      approvedBy: "Credit Committee", approvingBody: "Credit Committee", classification: "Confidential",
      reviewFrequencyDays: 365, effectiveDate: "2023-02-01", lastReviewedDate: "2023-02-01", nextReviewDate: "2024-02-01",
      scope: "Credit decisioning framework for the PAYCE point-of-sale lending product including automatic decline criteria, income verification, affordability assessment, vulnerable customer identification, pricing, exposure management, and cross-product exposure controls",
      applicability: "Automated decisioning system, credit committee, risk analytics, compliance",
      exceptions: "Core Updraft credit product governed by separate Consumer Lending Credit Policy (POL-004)",
      consumerDutyOutcomes: ["products-services", "price-value", "consumer-support"],
      regulationRefs: ["CONC 5", "CONC 5.2", "CONC 5.3", "PRIN 6", "PRIN 12", "PRIN 2A.3", "PRIN 2A.4", "CCA 1974"],
      controlRefs: ["CTRL-PAYCE-001", "CTRL-PAYCE-002", "CTRL-PAYCE-003", "CTRL-PAYCE-004", "CTRL-PAYCE-005", "CTRL-PAYCE-006", "CTRL-PAYCE-007", "CTRL-PAYCE-008", "CTRL-PAYCE-009", "CTRL-PAYCE-010", "CTRL-PAYCE-011"],
    },
    {
      id: "pol-017", reference: "POL-017", name: "Data Retention Policy",
      description: "Establishes retention schedules and disposal procedures for all personal and business data held by Updraft, including customer records, application data, credit reference agency data, correspondence, financial records, and audit trails. Specifies different retention periods based on data type and regulatory requirement. Requires Board approval for any exceptions to retention schedules. Currently in early draft stage and requires completion and formalisation.",
      status: "UNDER_REVIEW", version: "0.1", ownerEmail: "graham@updraft.com",
      approvedBy: "ORCC", approvingBody: "ORCC", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2025-01-01", lastReviewedDate: "2025-01-01", nextReviewDate: "2026-01-01",
      scope: "Retention and disposal of all personal and business data held by Updraft including customer records, application data, credit reference data, correspondence, and financial records",
      applicability: "All staff, DPO, compliance team, IT team, third-party processors",
      exceptions: "No exceptions permitted without Board approval",
      consumerDutyOutcomes: ["consumer-support"],
      regulationRefs: ["UK GDPR", "DPA 2018", "CCA 1974", "SYSC 9", "CONC 9"],
      controlRefs: ["CTRL-DR-001", "CTRL-DR-002", "CTRL-DR-003", "CTRL-DR-004", "CTRL-DR-005", "CTRL-DR-006", "CTRL-DR-007", "CTRL-DR-008", "CTRL-DR-009", "CTRL-DR-010"],
    },
    {
      id: "pol-018", reference: "POL-018", name: "Provisioning Policy",
      description: "Financial and prudential policy establishing the methodology for calculating and managing loan loss provisions across all arrears buckets in the Updraft consumer lending portfolio. Defines provision weight methodology, treatment of accounts under payment arrangements, write-off procedures, and reporting requirements for financial statements. Ensures appropriate recognition of credit losses under accounting standards and prudential regulation. Subject to external auditor review.",
      status: "CURRENT", version: "1.2", ownerEmail: "david@updraft.com",
      approvedBy: "Board and External Auditors", approvingBody: "Board and External Auditors", classification: "Confidential",
      reviewFrequencyDays: 365, effectiveDate: "2023-03-01", lastReviewedDate: "2023-03-01", nextReviewDate: "2024-03-01",
      scope: "Calculation and management of loan loss provisions across all arrears buckets for Updraft consumer lending portfolio, including provision weight methodology, payment arrangement treatment, and write-off procedures",
      applicability: "Finance team, Credit Committee, Board, external auditors",
      exceptions: "Accounts on approved debt management plans or in IVA process excluded from standard write-down",
      consumerDutyOutcomes: [],
      regulationRefs: ["FSMA 2000", "PRIN 4", "SYSC 7"],
      controlRefs: ["CTRL-PROV-001", "CTRL-PROV-002", "CTRL-PROV-003", "CTRL-PROV-004", "CTRL-PROV-005", "CTRL-PROV-006"],
    },
    {
      id: "pol-019", reference: "POL-019", name: "Health & Safety Policy",
      description: "Comprehensive health and safety policy covering all Updraft workplaces and activities, including fire safety procedures and regular drills, risk assessment methodology, display screen equipment (DSE) assessments for office workers, manual handling procedures, COSHH (chemical safety) procedures, personal protective equipment (PPE) requirements, RIDDOR reporting obligations for workplace injuries and incidents, and pandemic response and business continuity procedures.",
      status: "CURRENT", version: "2", ownerEmail: "cath@updraft.com",
      approvedBy: "Management", approvingBody: "Management", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2023-01-01", lastReviewedDate: "2023-01-01", nextReviewDate: "2024-01-01",
      scope: "Health and safety management for all Updraft workplaces including fire safety, risk assessment, DSE, manual handling, COSHH, PPE, RIDDOR reporting, and pandemic response procedures",
      applicability: "All employees, contractors, and visitors to Updraft premises",
      exceptions: "Remote workers covered by DSE assessment provisions only",
      consumerDutyOutcomes: [],
      regulationRefs: ["Equality Act 2010"],
      controlRefs: ["CTRL-HS-001", "CTRL-HS-002", "CTRL-HS-003", "CTRL-HS-004", "CTRL-HS-005", "CTRL-HS-006", "CTRL-HS-007", "CTRL-HS-008", "CTRL-HS-009", "CTRL-HS-010"],
    },
    {
      id: "pol-020", reference: "POL-020", name: "Terms & Conditions",
      description: "Customer-facing terms and conditions governing the use of all Updraft services, including credit information and credit decisioning (TransUnion partnership), consumer lending products, soft search functionality, account information services (TrueLayer partnership), direct debit payment processing (Modulr partnership), and credit broking services (Everything Financial partnership). Establishes customer rights and obligations, fees and charges, termination procedures, dispute resolution, and regulatory disclosures.",
      status: "CURRENT", version: "Current", ownerEmail: "ash@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Public",
      reviewFrequencyDays: 365, effectiveDate: "2025-04-01", lastReviewedDate: "2025-04-01", nextReviewDate: "2026-04-01",
      scope: "Customer-facing terms governing the use of Updraft services including credit information (TransUnion), consumer lending, soft search, account information services (TrueLayer), direct debit (Modulr), and credit broking (Everything Financial)",
      applicability: "All customers and prospective customers using any Updraft service",
      exceptions: "Individual loan agreements contain separate product-specific terms",
      consumerDutyOutcomes: ["products-services", "consumer-understanding", "consumer-support"],
      regulationRefs: ["CCA 1974", "FSMA 2000", "CONC 2.3", "CONC 4", "CONC 11", "DISP", "GEN 4", "PRIN 7", "PRIN 12", "PRIN 2A.5", "PRIN 2A.6"],
      controlRefs: ["CTRL-TCS-001", "CTRL-TCS-002", "CTRL-TCS-003", "CTRL-TCS-004", "CTRL-TCS-005", "CTRL-TCS-006", "CTRL-TCS-007", "CTRL-TCS-008"],
    },
    {
      id: "pol-021", reference: "POL-021", name: "Whistleblowing Policy",
      description: "Establishes the framework for reporting suspected wrongdoing and provides comprehensive protection for whistleblowers under the Public Interest Disclosure Act 1998 (PIDA). Covers reporting of criminal activity, regulatory breaches, health and safety risks, financial fraud, bribery, policy breaches, negligence, and deliberate concealment. Provides multiple reporting channels including line managers, senior management, compliance team, and confidential hotline. Guarantees protection from retaliation and confidentiality.",
      status: "CURRENT", version: "1", ownerEmail: "cath@updraft.com",
      approvedBy: "Board", approvingBody: "Board", classification: "Internal Only",
      reviewFrequencyDays: 365, effectiveDate: "2025-06-01", lastReviewedDate: "2025-06-01", nextReviewDate: "2026-06-01",
      scope: "Reporting of suspected wrongdoing including criminal activity, regulatory breaches, health and safety risks, financial fraud, bribery, policy breaches, negligence, and deliberate concealment, with protection for whistleblowers under PIDA 1998",
      applicability: "All current and former employees (including temporary and agency staff), contractors, consultants, third-party service providers, interns, apprentices, and volunteers",
      exceptions: "Personal grievances (bullying, harassment, colleague disputes) should be raised through HR, not the whistleblowing process",
      consumerDutyOutcomes: [],
      regulationRefs: ["SYSC 18", "PRIN 1", "PRIN 3", "PRIN 11", "COCON", "FSMA 2000"],
      controlRefs: ["CTRL-WB-001", "CTRL-WB-002", "CTRL-WB-003", "CTRL-WB-004", "CTRL-WB-005", "CTRL-WB-006", "CTRL-WB-007", "CTRL-WB-008", "CTRL-WB-009", "CTRL-WB-010", "CTRL-WB-011", "CTRL-WB-012"],
    },
  ];

  let totalRegLinks = 0;
  let totalCtrlLinks = 0;

  for (const p of ALL_POLICIES) {
    const ownerId = EMAIL_TO_USER[p.ownerEmail];
    if (!ownerId) {
      console.warn(`  ⚠ No user found for email ${p.ownerEmail} — skipping policy ${p.reference}`);
      continue;
    }

    await prisma.policy.create({
      data: {
        id: p.id,
        reference: p.reference,
        name: p.name,
        description: p.description,
        status: p.status,
        version: p.version,
        ownerId,
        approvedBy: p.approvedBy,
        approvingBody: p.approvingBody,
        classification: p.classification,
        reviewFrequencyDays: p.reviewFrequencyDays,
        effectiveDate: new Date(p.effectiveDate),
        lastReviewedDate: new Date(p.lastReviewedDate),
        nextReviewDate: new Date(p.nextReviewDate),
        scope: p.scope,
        applicability: p.applicability,
        exceptions: p.exceptions,
        consumerDutyOutcomes: p.consumerDutyOutcomes,
        storageUrl: null,
      },
    });

    // Link regulation by reference (runtime lookup)
    for (const ref of p.regulationRefs) {
      const reg = await prisma.regulation.findFirst({ where: { reference: ref.trim() } });
      if (reg) {
        try {
          await prisma.policyRegulatoryLink.create({
            data: { policyId: p.id, regulationId: reg.id, linkedBy: "user-rob" },
          });
          totalRegLinks++;
        } catch {
          // Ignore duplicate link errors
        }
      }
    }

    // Link controls by controlRef (runtime lookup)
    for (const ref of p.controlRefs) {
      const ctrl = await prisma.control.findFirst({ where: { controlRef: ref.trim() } });
      if (ctrl) {
        try {
          await prisma.policyControlLink.create({
            data: { policyId: p.id, controlId: ctrl.id, linkedBy: "user-rob" },
          });
          totalCtrlLinks++;
        } catch {
          // Ignore duplicate link errors
        }
      }
    }

    // Also link FP controls (FP-C001..FP-C018) to POL-001 if they were created by this seed
    if (p.id === "pol-001") {
      for (const ctrlId of fpControlIds2) {
        try {
          await prisma.policyControlLink.create({
            data: { policyId: p.id, controlId: ctrlId, linkedBy: "user-rob" },
          });
          totalCtrlLinks++;
        } catch {
          // Ignore duplicate link errors (ctrl may already be linked by ref lookup above)
        }
      }
    }
  }

  console.log(`  ✓ ${ALL_POLICIES.length} policies seeded`);
  console.log(`  ✓ ${totalRegLinks} policy-regulation links`);
  console.log(`  ✓ ${totalCtrlLinks} policy-control links`);

  // ── SM&CR Reference Data ──────────────────────────────────────────────

  // SMF Roles
  const SMF_ROLES = [
    { id: "smf-1", smfId: "SMF1", title: "Chief Executive Function", shortTitle: "CEO", description: "The function of having responsibility for carrying out the management of the conduct of the whole of the business (or relevant activities) of a firm.", fitsUpdraft: true, mandatory: true, currentHolderId: "user-ceo", status: "ACTIVE" as const, scope: "Overall management of the firm's business", keyDuties: "Strategic direction, Board leadership, regulatory relationship, risk appetite setting", regulatoryBasis: "SYSC 24", appointmentDate: new Date("2022-01-15") },
    { id: "smf-3", smfId: "SMF3", title: "Executive Director Function", shortTitle: "ExDir", description: "The function of having responsibility for management of the conduct of the firm's business.", fitsUpdraft: true, mandatory: false, currentHolderId: null, status: "VACANT" as const, scope: "Management of specific business lines", keyDuties: "Business line management, P&L responsibility", regulatoryBasis: "SYSC 24", appointmentDate: null },
    { id: "smf-9", smfId: "SMF9", title: "Chair of Governing Body", shortTitle: "Chair", description: "The function of chairing the governing body of a firm.", fitsUpdraft: false, mandatory: false, currentHolderId: null, status: "VACANT" as const, scope: "Board governance and oversight", keyDuties: "Chairing Board meetings, Board effectiveness", regulatoryBasis: "SYSC 24", appointmentDate: null },
    { id: "smf-16", smfId: "SMF16", title: "Compliance Oversight Function", shortTitle: "Compliance", description: "The function of having responsibility for compliance with the regulatory system.", fitsUpdraft: true, mandatory: true, currentHolderId: "user-cath", status: "ACTIVE" as const, scope: "Regulatory compliance oversight for the firm", keyDuties: "Compliance monitoring, regulatory reporting, policy framework, CCRO reporting", regulatoryBasis: "SYSC 24, SYSC 6.1", appointmentDate: new Date("2022-03-01") },
    { id: "smf-17", smfId: "SMF17", title: "Money Laundering Reporting Function", shortTitle: "MLRO", description: "The function of acting as the firm's nominated officer for AML/CTF.", fitsUpdraft: true, mandatory: true, currentHolderId: "user-cath", status: "ACTIVE" as const, scope: "AML/CTF compliance", keyDuties: "SAR reporting, AML policy, staff training, risk assessment", regulatoryBasis: "SYSC 24, MLR 2017 reg 21", appointmentDate: new Date("2022-03-01") },
    { id: "smf-24", smfId: "SMF24", title: "Chief Operations Function", shortTitle: "COO", description: "The function of having responsibility for the internal operations and technology of the firm.", fitsUpdraft: true, mandatory: false, currentHolderId: null, status: "VACANT" as const, scope: "Operations and technology", keyDuties: "IT infrastructure, operational resilience, change management", regulatoryBasis: "SYSC 24", appointmentDate: null },
    { id: "smf-27", smfId: "SMF27", title: "Partner Function", shortTitle: "Partner", description: "The function of being a partner in a firm which is a partnership.", fitsUpdraft: false, mandatory: false, currentHolderId: null, status: "VACANT" as const, scope: "N/A — Updraft is not a partnership", keyDuties: "N/A", regulatoryBasis: "SYSC 24", appointmentDate: null },
    { id: "smf-29", smfId: "SMF29", title: "Limited Scope Function", shortTitle: "Limited", description: "Benchmark administrator or claims management.", fitsUpdraft: false, mandatory: false, currentHolderId: null, status: "VACANT" as const, scope: "N/A", keyDuties: "N/A", regulatoryBasis: "SYSC 24", appointmentDate: null },
  ];

  for (const r of SMF_ROLES) {
    await prisma.sMFRole.upsert({
      where: { id: r.id },
      update: { ...r, appointmentDate: r.appointmentDate },
      create: { ...r, appointmentDate: r.appointmentDate },
    });
  }
  console.log(`  ✓ ${SMF_ROLES.length} SMF roles`);

  // Prescribed Responsibilities
  const PRESCRIBED_RESPS = [
    { id: "pr-a", prId: "PR-A", reference: "PR-A", title: "Performance of the firm's obligations under the senior managers regime", description: "Responsibility for the firm's performance of its obligations under the SM&CR.", mandatoryFor: "All Core firms", suggestedSMF: "SMF16", assignedSMFId: "smf-16", scope: "SM&CR compliance", keyActivities: "Maintaining responsibilities map, ensuring SM applications, certification regime", linkedDomains: ["SYSC"] },
    { id: "pr-b", prId: "PR-B", reference: "PR-B", title: "Performance of the firm's obligations under the Conduct Rules", description: "Responsibility for the firm's performance of its obligations under the Conduct Rules.", mandatoryFor: "All Core firms", suggestedSMF: "SMF16", assignedSMFId: "smf-16", scope: "Conduct Rules compliance", keyActivities: "Conduct rules training, breach identification, reporting", linkedDomains: ["SYSC"] },
    { id: "pr-c", prId: "PR-C", reference: "PR-C", title: "Compliance with CASS", description: "Responsibility for compliance with the FCA's client money and assets rules.", mandatoryFor: "Firms holding client money", suggestedSMF: "SMF1", assignedSMFId: null, scope: "N/A — Updraft does not hold client money", keyActivities: "N/A", linkedDomains: [] },
    { id: "pr-d", prId: "PR-D", reference: "PR-D", title: "Financial crime", description: "Responsibility for the firm's policies and procedures for countering the risk that the firm might be used to further financial crime.", mandatoryFor: "All Core firms", suggestedSMF: "SMF17", assignedSMFId: "smf-17", scope: "AML, fraud, sanctions", keyActivities: "AML framework, SAR reporting, sanctions screening, staff training", linkedDomains: ["FIN-CRIME"] },
    { id: "pr-e", prId: "PR-E", reference: "PR-E", title: "Significant responsibilities map", description: "Responsibility for the firm's management responsibilities map.", mandatoryFor: "All Core firms", suggestedSMF: "SMF1", assignedSMFId: "smf-1", scope: "Governance documentation", keyActivities: "Maintaining and updating the responsibilities map", linkedDomains: ["SYSC"] },
    { id: "pr-f", prId: "PR-F", reference: "PR-F", title: "Culture and standards", description: "Responsibility for developing and maintaining the firm's culture and standards.", mandatoryFor: "All Core firms", suggestedSMF: "SMF1", assignedSMFId: "smf-1", scope: "Firm culture", keyActivities: "Culture programme, whistleblowing, conduct standards", linkedDomains: ["SYSC", "EMPLOYMENT"] },
    { id: "pr-fin", prId: "PR-FIN", reference: "PR-FIN", title: "Financial resources", description: "Responsibility for management of the firm's financial resources.", mandatoryFor: "All Core firms", suggestedSMF: "SMF1", assignedSMFId: "smf-1", scope: "Financial resources and capital adequacy", keyActivities: "Capital planning, liquidity management, regulatory capital returns", linkedDomains: ["TAX"] },
  ];

  for (const pr of PRESCRIBED_RESPS) {
    await prisma.prescribedResponsibility.upsert({
      where: { id: pr.id },
      update: { ...pr },
      create: { ...pr },
    });
  }
  console.log(`  ✓ ${PRESCRIBED_RESPS.length} prescribed responsibilities`);

  // Certification Functions
  const CERT_FUNCTIONS = [
    { id: "cf-sig", cfId: "CF-SIG", title: "Significant Management Function", description: "Persons who have a significant influence on the conduct of a firm's affairs.", fitsUpdraft: true, examples: "Department heads, senior managers not in SMF roles", assessmentFrequency: "Annual", fandpCriteria: "Honesty, integrity, competence, financial soundness" },
    { id: "cf-cust", cfId: "CF-CUST", title: "Customer-Facing Function", description: "Persons whose role involves dealing with customers of the firm.", fitsUpdraft: true, examples: "Customer service team, collections agents, complaint handlers", assessmentFrequency: "Annual", fandpCriteria: "Competence in role, customer outcomes awareness, conduct rules" },
    { id: "cf-mrt", cfId: "CF-MRT", title: "Material Risk Taker", description: "Persons whose activities could have a material impact on the firm's risk profile.", fitsUpdraft: true, examples: "Credit risk analysts with authority limits, senior underwriters", assessmentFrequency: "Annual", fandpCriteria: "Risk management competence, conduct, financial soundness" },
    { id: "cf-algo", cfId: "CF-ALGO", title: "Algorithmic Trading Function", description: "Persons involved in algorithmic trading decisions.", fitsUpdraft: false, examples: "N/A — Updraft does not conduct algorithmic trading", assessmentFrequency: "Annual", fandpCriteria: "N/A" },
  ];

  for (const cf of CERT_FUNCTIONS) {
    await prisma.certificationFunction.upsert({
      where: { id: cf.id },
      update: { ...cf },
      create: { ...cf },
    });
  }
  console.log(`  ✓ ${CERT_FUNCTIONS.length} certification functions`);

  // Conduct Rules
  const CONDUCT_RULES = [
    { id: "cr-icr1", ruleId: "ICR-1", ruleType: "Individual", appliesTo: "All staff", title: "Act with integrity", description: "You must act with integrity.", examples: "Being honest in all dealings, not misleading customers or colleagues", reference: "COCON 2.1" },
    { id: "cr-icr2", ruleId: "ICR-2", ruleType: "Individual", appliesTo: "All staff", title: "Act with due skill, care and diligence", description: "You must act with due skill, care and diligence.", examples: "Following processes correctly, keeping qualifications current", reference: "COCON 2.2" },
    { id: "cr-icr3", ruleId: "ICR-3", ruleType: "Individual", appliesTo: "All staff", title: "Be open and cooperative with regulators", description: "You must be open and cooperative with the FCA, PRA and other regulators.", examples: "Responding promptly to regulatory requests, not concealing information", reference: "COCON 2.3" },
    { id: "cr-icr4", ruleId: "ICR-4", ruleType: "Individual", appliesTo: "All staff", title: "Pay due regard to customer interests", description: "You must pay due regard to the interests of customers and treat them fairly.", examples: "Not pressuring vulnerable customers, providing balanced information", reference: "COCON 2.4" },
    { id: "cr-icr5", ruleId: "ICR-5", ruleType: "Individual", appliesTo: "All staff", title: "Observe proper standards of market conduct", description: "You must observe proper standards of market conduct.", examples: "Not engaging in insider dealing, maintaining market integrity", reference: "COCON 2.5" },
    { id: "cr-sc1", ruleId: "SC-1", ruleType: "Senior Manager", appliesTo: "SMFs only", title: "Take reasonable steps to ensure business is controlled effectively", description: "You must take reasonable steps to ensure that the business of the firm for which you are responsible is controlled effectively.", examples: "Maintaining adequate oversight, proper delegation, MI review", reference: "COCON 3.1" },
    { id: "cr-sc2", ruleId: "SC-2", ruleType: "Senior Manager", appliesTo: "SMFs only", title: "Take reasonable steps to ensure compliance", description: "You must take reasonable steps to ensure that the business of the firm for which you are responsible complies with the relevant requirements and standards.", examples: "Compliance monitoring, risk escalation", reference: "COCON 3.2" },
    { id: "cr-sc3", ruleId: "SC-3", ruleType: "Senior Manager", appliesTo: "SMFs only", title: "Take reasonable steps to ensure regulatory reporting", description: "You must take reasonable steps to ensure that any delegation of your responsibilities is to an appropriate person and that you oversee the discharge of the delegated responsibility effectively.", examples: "Proper delegation framework, oversight meetings", reference: "COCON 3.3" },
    { id: "cr-sc4", ruleId: "SC-4", ruleType: "Senior Manager", appliesTo: "SMFs only", title: "Disclose information to the FCA", description: "You must disclose appropriately any information of which the FCA would reasonably expect notice.", examples: "Regulatory breach notification, material changes", reference: "COCON 3.4" },
  ];

  for (const cr of CONDUCT_RULES) {
    await prisma.conductRule.upsert({
      where: { id: cr.id },
      update: { ...cr },
      create: { ...cr },
    });
  }
  console.log(`  ✓ ${CONDUCT_RULES.length} conduct rules`);

  // SM&CR Documents
  const SMCR_DOCS = [
    { id: "doc-sor", docId: "DOC-SOR", title: "Statements of Responsibilities", description: "Individual Statements of Responsibilities for each SMF holder, setting out their areas of responsibility.", requiredFor: "Each SMF holder", template: "FCA template", updateTrigger: "Change of SMF holder, change of responsibilities, annual review", retention: "6 years after SMF ceases to hold the role", status: "DOC_CURRENT" as const, lastUpdatedAt: new Date("2025-11-15"), nextUpdateDue: new Date("2026-11-15"), ownerId: "user-rob" },
    { id: "doc-mrm", docId: "DOC-MRM", title: "Management Responsibilities Map", description: "Comprehensive map showing governance structure, SMF holders, prescribed responsibilities, and committee structure.", requiredFor: "Firm-level", template: null, updateTrigger: "Change of SMF, restructure, annual review", retention: "Indefinite (current version plus 6 years history)", status: "DOC_CURRENT" as const, lastUpdatedAt: new Date("2025-12-01"), nextUpdateDue: new Date("2026-12-01"), ownerId: "user-rob" },
    { id: "doc-cert", docId: "DOC-CERT", title: "Certification Register", description: "Register of all certified persons, their certification functions, assessment dates, and fitness and propriety status.", requiredFor: "All certified persons", template: null, updateTrigger: "New certification, annual assessment, role change", retention: "6 years after person leaves", status: "DOC_CURRENT" as const, lastUpdatedAt: new Date("2025-10-01"), nextUpdateDue: new Date("2026-04-01"), ownerId: "user-cath" },
    { id: "doc-conduct", docId: "DOC-CONDUCT", title: "Conduct Rules Training Records", description: "Records of conduct rules training provided to all staff, including content, attendance, and assessment results.", requiredFor: "All staff", template: null, updateTrigger: "New starter, annual refresh, regulatory change", retention: "6 years", status: "DOC_CURRENT" as const, lastUpdatedAt: new Date("2026-01-15"), nextUpdateDue: new Date("2027-01-15"), ownerId: "user-cath" },
    { id: "doc-fp", docId: "DOC-FP", title: "Fit and Proper Assessment Records", description: "Records of fitness and propriety assessments for SMF holders and certified persons.", requiredFor: "SMFs and certified persons", template: "Internal F&P assessment form", updateTrigger: "New appointment, annual certification, material change", retention: "6 years after person leaves", status: "DOC_DRAFT" as const, lastUpdatedAt: new Date("2025-09-01"), nextUpdateDue: new Date("2026-03-01"), ownerId: "user-rob" },
    { id: "doc-breach", docId: "DOC-BREACH", title: "Conduct Rules Breach Register", description: "Register of identified or suspected conduct rule breaches, investigation outcomes, and disciplinary actions.", requiredFor: "Firm-level", template: null, updateTrigger: "New breach identified, investigation update, annual review", retention: "6 years", status: "DOC_CURRENT" as const, lastUpdatedAt: new Date("2026-02-01"), nextUpdateDue: new Date("2027-02-01"), ownerId: "user-rob" },
    { id: "doc-dir", docId: "DOC-DIR", title: "FCA Directory Submissions", description: "Records of submissions to the FCA Financial Services Register including SMF approvals and directory person entries.", requiredFor: "All SMFs and directory persons", template: "FCA Connect", updateTrigger: "New appointment, role change, departure", retention: "Indefinite", status: "DOC_CURRENT" as const, lastUpdatedAt: new Date("2026-01-10"), nextUpdateDue: new Date("2026-07-10"), ownerId: "user-cath" },
  ];

  for (const doc of SMCR_DOCS) {
    await prisma.sMCRDocument.upsert({
      where: { id: doc.id },
      update: { ...doc },
      create: { ...doc },
    });
  }
  console.log(`  ✓ ${SMCR_DOCS.length} SM&CR documents`);

  // ── Fix Consumer Duty measure positions ───────────────────────────────
  // Measures imported via CSV all get position: 0. Fix positions to match
  // the numeric order of the measureId within each outcome.
  // e.g. measureId "1.1" → position 0, "1.2" → position 1, etc.
  const allMeasures = await prisma.consumerDutyMeasure.findMany();
  let measuresFixed = 0;
  for (const m of allMeasures) {
    const parts = m.measureId.split(".");
    const pos = parseInt(parts[1], 10) - 1; // 1.1→0, 1.2→1, etc.
    if (!isNaN(pos) && m.position !== pos) {
      await prisma.consumerDutyMeasure.update({
        where: { id: m.id },
        data: { position: pos },
      });
      measuresFixed++;
    }
  }
  console.log(`  ✓ Fixed ${measuresFixed} measure positions (${allMeasures.length} total measures checked)`);

  // ── Compliance Status & Assessment Notes ─────────────────────────────────
  // Set COMPLIANT as the default for all CORE and HIGH regulations.
  // All 328 regulations were seeded as NOT_ASSESSED in the CSV import — this restores
  // the realistic compliance posture.
  await prisma.regulation.updateMany({
    where: { applicability: { in: ["CORE", "HIGH"] } },
    data: { complianceStatus: "COMPLIANT" },
  });

  // Override known problem areas to PARTIALLY_COMPLIANT
  const partiallyCompliantIds = [
    // Consumer Duty — framework embedded but outcome monitoring still maturing
    "cu-0013", "cu-0014", "cu-0016", "cu-0017", "cu-0018", "cu-0019",
    "cu-0020", "cu-0021", "cu-0022", "cu-0023",
    // CONC 3 Financial Promotions — FinProm digital channels review ongoing
    "cu-0036",
    // CONC 5 Responsible Lending — creditworthiness model validation in progress
    "cu-0049", "cu-0050", "cu-0051",
    // CONC 7 Arrears — vulnerable customer identification improvements ongoing
    "cu-0061", "cu-0062",
    // SYSC 15A Operational Resilience — third-party vendor assessments outstanding
    "cu-0087",
    // AML/MLR — transaction monitoring platform upgrade in progress
    "cu-0220", "cu-0221", "cu-0222",
    // Data Protection — improvement programme underway (known weakness area)
    "cu-0145",
    // DISP 1 Complaints — Consumer Duty MI alignment in progress
    "cu-0111",
  ];
  await prisma.regulation.updateMany({
    where: { id: { in: partiallyCompliantIds } },
    data: { complianceStatus: "PARTIALLY_COMPLIANT" },
  });

  // DORA-UK — applicability review in progress, gap analysis commissioned
  await prisma.regulation.updateMany({
    where: { id: { in: ["cu-0317"] } },
    data: { complianceStatus: "GAP_IDENTIFIED" },
  });
  console.log("  ✓ Compliance statuses set");

  // ── Assessment Notes (only if null — preserves any user-entered data) ─────
  const ASSESSMENT_NOTES = [
    {
      id: "cu-0013",
      notes: "Consumer Duty compliance framework has been embedded across all business lines. Board-approved Consumer Duty programme delivered on schedule. Four-outcome framework mapped to Updraft's full product and service offering; Board Champion appointed. Key partial gap: outcome monitoring MI is not yet fully mature — dashboard metrics are being refined and back-tested against live customer experience data. Annual board report on track for July 2026.",
      lastAssessedAt: new Date("2026-01-15"),
      nextReviewDate: new Date("2026-07-15"),
    },
    {
      id: "cu-0014",
      notes: "PRIN 2A detailed requirements reviewed against all four outcomes. Cross-cutting rules (act in good faith, avoid foreseeable harm, support customers' financial objectives) have been operationalised through product governance, communications standards, and the customer vulnerability policy. Outcome testing programme is established but frequency and depth of testing is being scaled up. Next focus: enhance Consumer Duty MI pack for ExCo and Board quarterly review.",
      lastAssessedAt: new Date("2026-01-15"),
      nextReviewDate: new Date("2026-07-15"),
    },
    {
      id: "cu-0018",
      notes: "Price and Value outcome: first annual fair value assessment completed for all products. Assessment demonstrates that total cost of credit is proportionate and competitive for the target market. Key finding: arrangement fees on certain loan products require further review — a value assessment report was submitted to the Product Committee in November 2025. Remediation in progress to simplify fee structure. Next annual assessment due Q3 2026.",
      lastAssessedAt: new Date("2025-11-30"),
      nextReviewDate: new Date("2026-09-30"),
    },
    {
      id: "cu-0020",
      notes: "Consumer Support outcome: 92% of complaints resolved within FCA timelines. Vulnerability identification process embedded in onboarding and servicing workflows. Key gap: the dedicated support pathway for customers in financial difficulty relies on frontline agent discretion rather than systematic identification triggers. Improvement project initiated Q1 2026 to introduce structured vulnerability screening at 30-day arrears.",
      lastAssessedAt: new Date("2026-01-31"),
      nextReviewDate: new Date("2026-06-30"),
    },
    {
      id: "cu-0049",
      notes: "Core creditworthiness assessment framework is in place and subject to monthly model performance review. CONC 5.2 credit file checks and income verification completed for all applications. Key gap identified Q4 2025: longitudinal stress analysis of customer repayment capacity under adverse income scenarios has not been formally integrated into the model validation framework. Credit Risk working group established — expected completion Q2 2026.",
      lastAssessedAt: new Date("2025-12-31"),
      nextReviewDate: new Date("2026-06-30"),
    },
    {
      id: "cu-0061",
      notes: "Arrears and collections process meets CONC 7 core requirements. Forbearance options (payment deferral, reduced payments, payment plans) are documented and actively offered. Key partial gap: vulnerability identification in early arrears relies on agent discretion rather than systematic flagging. Collections process review completed January 2026 recommends a structured vulnerability screening protocol at 30-day DPD. Implementation expected Q2 2026.",
      lastAssessedAt: new Date("2026-01-31"),
      nextReviewDate: new Date("2026-07-31"),
    },
    {
      id: "cu-0036",
      notes: "All customer-facing promotions are reviewed and approved by Compliance prior to publication. Representative APR is correctly displayed on all advertising. Partial gap: digital and affiliate channel promotions monitoring requires enhanced controls following the FinProm digital communications regime changes. Digital promotions audit December 2025 identified 3 of 12 affiliate partners requiring remediation. Updated approval framework for digital channels under development — target Q1 2026.",
      lastAssessedAt: new Date("2025-12-15"),
      nextReviewDate: new Date("2026-03-31"),
    },
    {
      id: "cu-0087",
      notes: "Important business services (IBS) identified and mapped. Impact tolerances defined for 4 IBS: loan origination, customer account servicing, payment processing, and customer communications. Scenario testing for loss of primary data centre completed — 4-hour tolerance met. Key gap: operational resilience assessments for 3 critical third-party technology vendors not yet complete. Target operating model for resilience testing submitted to Board January 2026. Full compliance with the March 2025 regulatory deadline is being actively managed.",
      lastAssessedAt: new Date("2026-01-20"),
      nextReviewDate: new Date("2026-03-31"),
    },
    {
      id: "cu-0220",
      notes: "MLRO function in place (SMF17). Business-wide risk assessment completed and reviewed annually. CDD procedures documented and followed. Key gap: transaction monitoring rules are based on static thresholds rather than dynamic risk-based models. Transaction monitoring platform upgrade in progress — vendor selected, implementation Q2 2026. SAR reporting is current. AML and conduct rules staff training completed annually — last cohort November 2025.",
      lastAssessedAt: new Date("2025-11-30"),
      nextReviewDate: new Date("2026-05-31"),
    },
    {
      id: "cu-0145",
      notes: "Data protection is a known compliance weakness area. Lawful basis documentation is complete for core processing activities and privacy notices are published. Key gaps: (1) Records of Processing Activities (ROPA) not updated since December 2024 — does not reflect recent product changes; (2) DPIAs inconsistently applied for new processing activities; (3) Data retention schedules documented but deletion and suppression processes are not automated. A 12-month data protection improvement programme was approved by ExCo in November 2025.",
      lastAssessedAt: new Date("2025-11-01"),
      nextReviewDate: new Date("2026-05-01"),
    },
    {
      id: "cu-0317",
      notes: "DORA applicability review in progress. Initial assessment indicates DORA applies to Updraft as a financial entity. Items under review: ICT risk management framework requirements, incident classification and mandatory FCA reporting timelines, digital operational resilience testing programme, and third-party ICT provider oversight obligations. DORA implementation gap analysis commissioned from external counsel — report expected February 2026. Board briefing scheduled March 2026.",
      lastAssessedAt: new Date("2026-01-10"),
      nextReviewDate: new Date("2026-04-30"),
    },
    {
      id: "cu-0111",
      notes: "Complaints handling is largely compliant with DISP 1 rules. FOS referral rate is within industry norms at 3.2%. All complaints acknowledged within 3 business days; 95% resolved within 8 weeks. Root cause analysis process for systemic complaints established Q3 2025. Key gap: complaint MI for Board-level review does not yet include outcome-based analysis aligned to Consumer Duty reporting requirements. Enhancement in progress — target Q2 2026.",
      lastAssessedAt: new Date("2025-12-31"),
      nextReviewDate: new Date("2026-06-30"),
    },
  ];

  for (const n of ASSESSMENT_NOTES) {
    await prisma.regulation.updateMany({
      where: { id: n.id, assessmentNotes: null },
      data: {
        assessmentNotes: n.notes,
        lastAssessedAt: n.lastAssessedAt,
        nextReviewDate: n.nextReviewDate,
      },
    });
  }
  console.log(`  ✓ Assessment notes seeded for ${ASSESSMENT_NOTES.length} key regulations`);

  // ── Enriched Regulation Descriptions ─────────────────────────────────────
  // These expert-level descriptions were originally applied via the
  // enrich-compliance-universe.ts script (commit 2b58e93) but are embedded
  // here so they survive future reseeds. Covers 253 of the 328 regulations
  // (data protection CU-0145 to CU-0218 retain their CSV descriptions).
  const ALL_ENRICHED: Record<string, string> = {
    ...PRIN_CONC_DESCRIPTIONS,
    ...SYSC_LEG_DESCRIPTIONS,
    ...REMAINING_DESCRIPTIONS,
  };

  let descUpdated = 0;
  for (const [cuIdUpper, description] of Object.entries(ALL_ENRICHED)) {
    // Script keys are "CU-0001" format; DB ids are "cu-0001"
    const id = cuIdUpper.toLowerCase();
    const result = await prisma.regulation.updateMany({
      where: { id },
      data: { description },
    });
    if (result.count > 0) descUpdated++;
  }
  console.log(`  ✓ Enriched descriptions applied to ${descUpdated} regulations`);

  // ── Process Library ───────────────────────────────────────────────────────

  const IBS_RECORDS = [
    { id: "ibs-retail-payments", reference: "IBS-001", name: "Retail Payments", description: "The end-to-end processing of retail payment instructions including direct debits, faster payments, and standing orders for customers.", maxTolerableDisruptionHours: 4, rtoHours: 2, rpoHours: 1, smfAccountable: "SMF3 - Chief Operating Officer", ownerId: "user-chris" },
    { id: "ibs-customer-onboarding", reference: "IBS-002", name: "Customer Onboarding", description: "The full journey from account application through identity verification, credit assessment and account activation.", maxTolerableDisruptionHours: 24, rtoHours: 8, rpoHours: 4, smfAccountable: "SMF3 - Chief Operating Officer", ownerId: "user-ash" },
    { id: "ibs-lending-decisioning", reference: "IBS-003", name: "Lending Decisioning", description: "Credit assessment and loan origination including affordability checks, credit bureau queries and underwriting decisions.", maxTolerableDisruptionHours: 8, rtoHours: 4, rpoHours: 2, smfAccountable: "SMF4 - Chief Risk Officer", ownerId: "user-micha" },
    { id: "ibs-regulatory-reporting", reference: "IBS-004", name: "Regulatory Reporting", description: "Production and submission of all mandatory regulatory returns including FCA REP, CMAR, and CCD submissions.", maxTolerableDisruptionHours: 48, rtoHours: 24, rpoHours: 4, smfAccountable: "SMF16 - Compliance Oversight", ownerId: "user-cath" },
    { id: "ibs-fraud-detection", reference: "IBS-005", name: "Fraud Detection & Prevention", description: "Real-time detection and interdiction of fraudulent transactions, identity fraud and account takeover attempts.", maxTolerableDisruptionHours: 2, rtoHours: 1, rpoHours: 0, smfAccountable: "SMF3 - Chief Operating Officer", ownerId: "user-chris" },
    { id: "ibs-customer-servicing", reference: "IBS-006", name: "Customer Servicing", description: "Handling of customer enquiries, complaints, account management requests and dispute resolution.", maxTolerableDisruptionHours: 12, rtoHours: 4, rpoHours: 2, smfAccountable: "SMF6 - Head of Customer Operations", ownerId: "user-ash" },
  ] as const;

  for (const ibs of IBS_RECORDS) {
    await prisma.importantBusinessService.upsert({
      where: { id: ibs.id },
      update: { name: ibs.name, description: ibs.description, maxTolerableDisruptionHours: ibs.maxTolerableDisruptionHours, rtoHours: ibs.rtoHours, rpoHours: ibs.rpoHours, smfAccountable: ibs.smfAccountable, ownerId: ibs.ownerId, status: "ACTIVE" },
      create: { id: ibs.id, reference: ibs.reference, name: ibs.name, description: ibs.description, maxTolerableDisruptionHours: ibs.maxTolerableDisruptionHours, rtoHours: ibs.rtoHours, rpoHours: ibs.rpoHours, smfAccountable: ibs.smfAccountable, ownerId: ibs.ownerId, status: "ACTIVE" },
    });
  }
  console.log(`  ✓ ${IBS_RECORDS.length} IBS records seeded`);

  type ProcessSeed = {
    id: string; reference: string; name: string;
    category: "CUSTOMER_ONBOARDING"|"PAYMENTS"|"LENDING"|"COMPLIANCE"|"RISK_MANAGEMENT"|"FINANCE"|"TECHNOLOGY"|"PEOPLE"|"GOVERNANCE"|"OTHER";
    processType: "CORE"|"SUPPORT"|"MANAGEMENT"|"GOVERNANCE";
    criticality: "CRITICAL"|"IMPORTANT"|"STANDARD";
    maturity: number;
    ownerId?: string; description?: string; purpose?: string;
    nextReviewDate?: Date; frequency?: "AD_HOC"|"DAILY"|"WEEKLY"|"MONTHLY"|"QUARTERLY"|"ANNUALLY"|"CONTINUOUS";
    smfFunction?: string; prescribedResponsibilities?: string[]; endToEndSlaDays?: number;
    ibsId?: string; policyRefs?: string[]; regulationRefs?: string[]; controlRefs?: string[];
    steps?: { order: number; title: string; responsible: string; accountable: string }[];
  };

  const PROCESSES: ProcessSeed[] = [
    // Level 1
    { id: "proc-001", reference: "PROC-001", name: "Staff Onboarding Process", category: "PEOPLE", processType: "SUPPORT", criticality: "STANDARD", maturity: 1 },
    { id: "proc-002", reference: "PROC-002", name: "Office Access Management", category: "TECHNOLOGY", processType: "SUPPORT", criticality: "STANDARD", maturity: 1 },
    { id: "proc-003", reference: "PROC-003", name: "Vendor Onboarding", category: "GOVERNANCE", processType: "SUPPORT", criticality: "STANDARD", maturity: 1 },
    { id: "proc-004", reference: "PROC-004", name: "Incident Response", category: "TECHNOLOGY", processType: "MANAGEMENT", criticality: "CRITICAL", maturity: 1 },
    // Level 2
    { id: "proc-005", reference: "PROC-005", name: "Customer Complaints Handling", category: "CUSTOMER_ONBOARDING", processType: "CORE", criticality: "IMPORTANT", maturity: 2, ownerId: "user-ash", description: "Handles all formal customer complaints from receipt through investigation to final response, in line with FCA DISP rules.", purpose: "To ensure fair, timely and well-evidenced responses to customer complaints, minimising regulatory risk and improving customer outcomes." },
    { id: "proc-006", reference: "PROC-006", name: "Financial Crime Screening", category: "COMPLIANCE", processType: "CORE", criticality: "CRITICAL", maturity: 2, ownerId: "user-cath", description: "Screens customers and transactions against sanctions lists, PEP databases and adverse media to detect money laundering, terrorist financing and sanctions evasion.", purpose: "To comply with the Money Laundering Regulations 2017 and ensure no financial crime exposure." },
    { id: "proc-007", reference: "PROC-007", name: "Regulatory Change Management", category: "COMPLIANCE", processType: "MANAGEMENT", criticality: "IMPORTANT", maturity: 2, ownerId: "user-cath", description: "Tracks, assesses and implements changes to regulatory requirements affecting the firm.", purpose: "To ensure the firm remains compliant with evolving regulatory requirements in a timely and evidenced manner." },
    { id: "proc-008", reference: "PROC-008", name: "Credit Risk Appetite Review", category: "RISK_MANAGEMENT", processType: "MANAGEMENT", criticality: "IMPORTANT", maturity: 2, ownerId: "user-micha", description: "Quarterly review of credit risk appetite statements against actual portfolio performance, including breach escalation.", purpose: "To ensure credit risk exposure remains within Board-approved appetite." },
    { id: "proc-009", reference: "PROC-009", name: "Finance Month-End Close", category: "FINANCE", processType: "CORE", criticality: "IMPORTANT", maturity: 2, ownerId: "user-david", description: "Monthly financial close process including reconciliation, journal postings, management accounts production and variance commentary.", purpose: "To produce accurate and timely management accounts and support regulatory and statutory reporting." },
    // Level 3
    { id: "proc-010", reference: "PROC-010", name: "Affordability Assessment", category: "LENDING", processType: "CORE", criticality: "CRITICAL", maturity: 3, ownerId: "user-micha", description: "Assessment of customer affordability for new lending decisions, including income verification, expenditure analysis and stress testing.", purpose: "To ensure customers are not provided with unaffordable credit in line with FCA Consumer Credit sourcebook.", nextReviewDate: new Date("2026-06-01"), regulationRefs: ["cu-0001"] },
    { id: "proc-011", reference: "PROC-011", name: "Data Subject Access Request Handling", category: "COMPLIANCE", processType: "CORE", criticality: "IMPORTANT", maturity: 3, ownerId: "user-cath", description: "Processing of data subject access requests (DSARs) under UK GDPR Article 15 within the statutory 30-day deadline.", purpose: "To fulfil data subject rights obligations and avoid regulatory enforcement action by the ICO.", nextReviewDate: new Date("2026-03-01"), regulationRefs: ["cu-0001"] },
    { id: "proc-012", reference: "PROC-012", name: "TCF / Consumer Duty Monitoring", category: "COMPLIANCE", processType: "MANAGEMENT", criticality: "CRITICAL", maturity: 3, ownerId: "user-cath", description: "Monthly monitoring of Consumer Duty outcome metrics across the four outcome areas, with board-level reporting.", purpose: "To demonstrate ongoing compliance with FCA Consumer Duty and provide the evidence base for annual board attestation.", nextReviewDate: new Date("2026-04-01"), policyRefs: ["POL-001"] },
    { id: "proc-013", reference: "PROC-013", name: "Risk Register Review", category: "RISK_MANAGEMENT", processType: "MANAGEMENT", criticality: "IMPORTANT", maturity: 3, ownerId: "user-rob", description: "Quarterly review of the enterprise risk register including risk scoring, control effectiveness assessment and horizon scanning.", purpose: "To maintain an accurate and up-to-date risk register that reflects the firm's current risk profile.", nextReviewDate: new Date("2026-06-01"), policyRefs: ["POL-002"] },
    { id: "proc-014", reference: "PROC-014", name: "Access Control Management", category: "TECHNOLOGY", processType: "SUPPORT", criticality: "IMPORTANT", maturity: 3, ownerId: "user-graham", description: "Lifecycle management of user access rights including provisioning, periodic reviews, and deprovisioning on staff departure.", purpose: "To prevent unauthorised access to systems and data.", nextReviewDate: new Date("2026-09-01"), policyRefs: ["POL-003"] },
    // Level 4
    { id: "proc-015", reference: "PROC-015", name: "Payment Processing & Reconciliation", category: "PAYMENTS", processType: "CORE", criticality: "CRITICAL", maturity: 4, ownerId: "user-chris", description: "End-to-end processing of customer payment instructions including faster payments, direct debits and BACS, with same-day and T+1 reconciliation.", purpose: "To ensure customer payment instructions are processed accurately, timely and within scheme rules.", nextReviewDate: new Date("2026-03-01"), frequency: "CONTINUOUS", policyRefs: ["POL-001"], regulationRefs: ["cu-0001"], controlRefs: ["FP-C001", "FP-C002"], steps: [{ order: 1, title: "Payment instruction receipt", responsible: "Payments Operations", accountable: "Head of Payments" }, { order: 2, title: "Sanctions and fraud screening", responsible: "Fraud & Financial Crime team", accountable: "Chief Risk Officer" }, { order: 3, title: "Scheme submission", responsible: "Payments Operations", accountable: "Head of Payments" }, { order: 4, title: "Confirmation and settlement", responsible: "Finance", accountable: "CFO" }, { order: 5, title: "Daily reconciliation", responsible: "Finance", accountable: "CFO" }] },
    { id: "proc-016", reference: "PROC-016", name: "Know Your Customer (KYC) Onboarding", category: "CUSTOMER_ONBOARDING", processType: "CORE", criticality: "CRITICAL", maturity: 4, ownerId: "user-ash", description: "Customer identity verification, document collection, PEP/sanctions screening and risk rating at account opening for new retail customers.", purpose: "To meet Anti-Money Laundering and Counter-Terrorist Financing obligations.", nextReviewDate: new Date("2026-04-01"), frequency: "CONTINUOUS", policyRefs: ["POL-002"], regulationRefs: ["cu-0002"], controlRefs: ["FP-C003", "FP-C004"], steps: [{ order: 1, title: "Application receipt and identity document collection", responsible: "Customer Operations", accountable: "Head of Customer Ops" }, { order: 2, title: "Electronic identity verification (eIDV)", responsible: "Customer Operations", accountable: "Head of Customer Ops" }, { order: 3, title: "PEP and sanctions screening", responsible: "Financial Crime Team", accountable: "MLRO" }, { order: 4, title: "Risk rating assignment", responsible: "Financial Crime Team", accountable: "MLRO" }, { order: 5, title: "Account activation or referral to enhanced DD", responsible: "Customer Operations", accountable: "Head of Customer Ops" }] },
    { id: "proc-017", reference: "PROC-017", name: "Credit Decisioning & Underwriting", category: "LENDING", processType: "CORE", criticality: "CRITICAL", maturity: 4, ownerId: "user-micha", description: "Automated and manual credit assessment process for personal loan applications, including bureau data, affordability scoring and decision output.", purpose: "To make fair, consistent and well-evidenced credit decisions that meet FCA Consumer Credit obligations.", nextReviewDate: new Date("2026-06-01"), frequency: "CONTINUOUS", policyRefs: ["POL-003"], regulationRefs: ["cu-0003"], controlRefs: ["FP-C005"], steps: [{ order: 1, title: "Application data validation", responsible: "Credit Ops", accountable: "Head of Credit" }, { order: 2, title: "Bureau data retrieval", responsible: "Credit Ops", accountable: "Head of Credit" }, { order: 3, title: "Affordability calculation", responsible: "Credit Models team", accountable: "Chief Risk Officer" }, { order: 4, title: "Decision engine output", responsible: "Credit Ops", accountable: "Head of Credit" }, { order: 5, title: "Manual referral review (if required)", responsible: "Senior Underwriter", accountable: "Head of Credit" }] },
    { id: "proc-018", reference: "PROC-018", name: "Regulatory Reporting Submission", category: "COMPLIANCE", processType: "CORE", criticality: "CRITICAL", maturity: 4, ownerId: "user-cath", description: "Preparation, sign-off and submission of mandatory FCA regulatory returns including MLAR, GABRIEL submissions and ad-hoc notifications.", purpose: "To meet the firm's regulatory reporting obligations on time and with accurate data.", nextReviewDate: new Date("2026-03-01"), frequency: "QUARTERLY", policyRefs: ["POL-004"], regulationRefs: ["cu-0004"], controlRefs: ["FP-C006"], steps: [{ order: 1, title: "Data extraction from source systems", responsible: "Finance & Compliance", accountable: "CFO" }, { order: 2, title: "Data validation and reconciliation", responsible: "Compliance", accountable: "Head of Compliance" }, { order: 3, title: "Draft return preparation", responsible: "Compliance", accountable: "Head of Compliance" }, { order: 4, title: "Senior management sign-off", responsible: "SMF16", accountable: "SMF16" }, { order: 5, title: "Submission via RegData / GABRIEL", responsible: "Compliance", accountable: "Head of Compliance" }] },
    // Level 5
    { id: "proc-019", reference: "PROC-019", name: "Real-Time Fraud Detection", category: "PAYMENTS", processType: "CORE", criticality: "CRITICAL", maturity: 5, ownerId: "user-chris", description: "Continuous real-time monitoring of payment transactions using rule-based and ML-based fraud detection models, with automated interdiction and manual review queues.", purpose: "To detect and prevent fraudulent transactions with the lowest possible false positive rate, protecting customers and the firm from financial loss.", nextReviewDate: new Date("2026-06-01"), frequency: "CONTINUOUS", smfFunction: "SMF3 - Chief Operating Officer", prescribedResponsibilities: ["PR(e)", "PR(f)"], endToEndSlaDays: 1, ibsId: "ibs-fraud-detection", policyRefs: ["POL-005"], regulationRefs: ["cu-0005"], controlRefs: ["FP-C007"], steps: [{ order: 1, title: "Transaction monitoring ingestion", responsible: "Payments Tech", accountable: "CTO" }, { order: 2, title: "Rules and model scoring", responsible: "Fraud Team", accountable: "Head of Fraud" }, { order: 3, title: "Automated interdiction (high confidence)", responsible: "Payments System", accountable: "Head of Fraud" }, { order: 4, title: "Manual review queue (medium confidence)", responsible: "Fraud Analysts", accountable: "Head of Fraud" }, { order: 5, title: "Customer notification and case management", responsible: "Customer Operations", accountable: "SMF3" }] },
    { id: "proc-020", reference: "PROC-020", name: "Consumer Duty Annual Board Attestation", category: "GOVERNANCE", processType: "GOVERNANCE", criticality: "CRITICAL", maturity: 5, ownerId: "user-rob", description: "Annual preparation and delivery of the Consumer Duty board report and attestation, including outcome monitoring data, gap analysis and remediation progress.", purpose: "To fulfil the FCA's requirement for the board to receive an annual Consumer Duty report and confirm that the firm is delivering good outcomes.", nextReviewDate: new Date("2027-01-01"), frequency: "ANNUALLY", smfFunction: "SMF16 - Compliance Oversight", prescribedResponsibilities: ["PR(c)", "PR(e)"], endToEndSlaDays: 30, ibsId: "ibs-regulatory-reporting", policyRefs: ["POL-006"], regulationRefs: ["cu-0006"], controlRefs: ["FP-C008"], steps: [{ order: 1, title: "Outcome data collation from all business areas", responsible: "Compliance", accountable: "SMF16" }, { order: 2, title: "Gap analysis against four Consumer Duty outcomes", responsible: "Compliance", accountable: "SMF16" }, { order: 3, title: "Remediation plan review and progress update", responsible: "All SMF holders", accountable: "SMF16" }, { order: 4, title: "Draft board report preparation", responsible: "Compliance", accountable: "SMF16" }, { order: 5, title: "Board review and formal attestation", responsible: "Board Secretary", accountable: "Board Chair" }] },
  ];

  for (const p of PROCESSES) {
    await prisma.process.upsert({
      where: { id: p.id },
      update: { name: p.name, category: p.category, processType: p.processType, criticality: p.criticality, status: "ACTIVE", maturityScore: p.maturity, description: p.description ?? null, purpose: p.purpose ?? null, ownerId: p.ownerId ?? null, nextReviewDate: p.nextReviewDate ?? null, frequency: p.frequency ?? "AD_HOC", smfFunction: p.smfFunction ?? null, prescribedResponsibilities: p.prescribedResponsibilities ?? [], endToEndSlaDays: p.endToEndSlaDays ?? null },
      create: { id: p.id, reference: p.reference, name: p.name, category: p.category, processType: p.processType, criticality: p.criticality, status: "ACTIVE", maturityScore: p.maturity, description: p.description ?? null, purpose: p.purpose ?? null, ownerId: p.ownerId ?? null, nextReviewDate: p.nextReviewDate ?? null, frequency: p.frequency ?? "AD_HOC", smfFunction: p.smfFunction ?? null, prescribedResponsibilities: p.prescribedResponsibilities ?? [], endToEndSlaDays: p.endToEndSlaDays ?? null },
    });
  }
  console.log(`  ✓ ${PROCESSES.length} processes seeded`);

  // Process Steps
  let stepsSeeded = 0;
  for (const p of PROCESSES) {
    if (!p.steps) continue;
    for (const s of p.steps) {
      await prisma.processStep.upsert({
        where: { processId_stepOrder: { processId: p.id, stepOrder: s.order } },
        update: { title: s.title, responsibleRole: s.responsible, accountableRole: s.accountable },
        create: { processId: p.id, stepOrder: s.order, title: s.title, responsibleRole: s.responsible, accountableRole: s.accountable },
      });
      stepsSeeded++;
    }
  }
  console.log(`  ✓ ${stepsSeeded} process steps seeded`);

  // Process links
  let procLinks = 0;
  for (const p of PROCESSES) {
    for (const ref of p.policyRefs ?? []) {
      const policy = await prisma.policy.findFirst({ where: { reference: ref } });
      if (policy) {
        await prisma.processPolicyLink.upsert({ where: { processId_policyId: { processId: p.id, policyId: policy.id } }, update: {}, create: { processId: p.id, policyId: policy.id, linkedBy: "user-rob" } });
        procLinks++;
      }
    }
    for (const ref of p.regulationRefs ?? []) {
      const reg = await prisma.regulation.findFirst({ where: { id: ref } });
      if (reg) {
        await prisma.processRegulationLink.upsert({ where: { processId_regulationId: { processId: p.id, regulationId: reg.id } }, update: {}, create: { processId: p.id, regulationId: reg.id, linkedBy: "user-rob" } });
        procLinks++;
      }
    }
    for (const ref of p.controlRefs ?? []) {
      const ctrl = await prisma.control.findFirst({ where: { controlRef: ref } });
      if (ctrl) {
        await prisma.processControlLink.upsert({ where: { processId_controlId: { processId: p.id, controlId: ctrl.id } }, update: {}, create: { processId: p.id, controlId: ctrl.id, linkedBy: "user-rob" } });
        procLinks++;
      }
    }
    if (p.ibsId) {
      await prisma.processIBSLink.upsert({ where: { processId_ibsId: { processId: p.id, ibsId: p.ibsId } }, update: {}, create: { processId: p.id, ibsId: p.ibsId, linkedBy: "user-rob" } });
      procLinks++;
    }
  }
  console.log(`  ✓ ${procLinks} process links seeded`);

  // ── Operational Resilience Seed Data ──────────────────────────────────────

  // Additional ProcessIBSLink records (so avgMaturity is populated for more IBS)
  const EXTRA_PROC_IBS_LINKS = [
    { processId: "proc-015", ibsId: "ibs-retail-payments" },
    { processId: "proc-016", ibsId: "ibs-customer-onboarding" },
    { processId: "proc-017", ibsId: "ibs-lending-decisioning" },
  ];
  for (const link of EXTRA_PROC_IBS_LINKS) {
    const procExists = await prisma.process.findUnique({ where: { id: link.processId } });
    const ibsExists = await prisma.importantBusinessService.findUnique({ where: { id: link.ibsId } });
    if (procExists && ibsExists) {
      await prisma.processIBSLink.upsert({
        where: { processId_ibsId: { processId: link.processId, ibsId: link.ibsId } },
        update: {},
        create: { processId: link.processId, ibsId: link.ibsId, linkedBy: "user-rob" },
      });
    }
  }
  console.log("  ✓ extra process-IBS links seeded");

  // IBSResourceMap seed data — content format: { text: "..." }
  const IBS_RESOURCE_MAPS: {
    ibsId: string;
    category: "PEOPLE" | "PROCESSES" | "TECHNOLOGY" | "FACILITIES" | "INFORMATION";
    text: string;
  }[] = [
    // IBS-001 Retail Payments — all 5 categories filled → GREEN
    { ibsId: "ibs-retail-payments", category: "PEOPLE", text: "Head of Payments (accountable), Payments Operations team (4 FTE), Fraud Analysts (2 FTE), Finance Reconciliation (1 FTE). Deputies: Senior Payments Analyst covers Head of Payments for up to 72h." },
    { ibsId: "ibs-retail-payments", category: "PROCESSES", text: "PROC-015 Payment Processing & Reconciliation (maturity 4). Scheme submission, settlement, daily reconciliation. Process steps documented in Process Library." },
    { ibsId: "ibs-retail-payments", category: "TECHNOLOGY", text: "Core Banking Platform (Temenos T24), Vocalink Faster Payments gateway, BACS bureau (Bottomline), SWIFT messaging, reconciliation tool (AutoRec Pro). Fallback: manual BACS submission via online portal." },
    { ibsId: "ibs-retail-payments", category: "FACILITIES", text: "Primary: London HQ (Level 3, Payments Operations desk). Fallback: Manchester office (remote-ready with VPN + token). BCP invocation within 2h. Minimum 2 FTE required to operate." },
    { ibsId: "ibs-retail-payments", category: "INFORMATION", text: "Payment instruction data (SOC2 compliant), scheme settlement files, daily reconciliation reports. Retention: 7 years. RPO: 1h. Classification: Restricted — Financial." },
    // IBS-002 Customer Onboarding — PEOPLE + TECHNOLOGY → AMBER
    { ibsId: "ibs-customer-onboarding", category: "PEOPLE", text: "Head of Customer Operations (accountable), KYC Analysts (3 FTE), MLRO (escalation). Deputy: Senior KYC Analyst. Mass absence scenario managed via agency supplementation within 24h." },
    { ibsId: "ibs-customer-onboarding", category: "TECHNOLOGY", text: "Onfido eIDV platform, Dow Jones PEP/Sanctions screening, Core Banking (Temenos), Application API (in-house). Fallback: manual document review process documented in PROC-016 step 2." },
    // IBS-003 Lending Decisioning — PEOPLE + TECHNOLOGY + FACILITIES → AMBER
    { ibsId: "ibs-lending-decisioning", category: "PEOPLE", text: "Head of Credit (accountable), Credit Ops (3 FTE), Senior Underwriter (manual referrals), Credit Models team (2 FTE). Deputy: Senior Analyst. Model team lead covered by Head of Credit for tier-1 queries." },
    { ibsId: "ibs-lending-decisioning", category: "TECHNOLOGY", text: "Decision Engine (Experian PowerCurve), Equifax credit bureau API, Affordability Calculator (in-house), Core Banking. Fallback: manual scorecard documented in PROC-017. Bureau fallback: TransUnion API pre-tested." },
    { ibsId: "ibs-lending-decisioning", category: "FACILITIES", text: "Primary: London HQ. Remote working fully enabled for all Credit team. All systems cloud-hosted. Fallback: home working with full platform access confirmed in BCP test (Oct 2025)." },
    // IBS-004 Regulatory Reporting — all 5 categories filled → GREEN
    { ibsId: "ibs-regulatory-reporting", category: "PEOPLE", text: "SMF16 Compliance Oversight (accountable), Compliance Manager (1 FTE), Finance Controller (data supplier), CFO (sign-off). Deputy: Compliance Analyst. SMF16 backed up by deputy SMF." },
    { ibsId: "ibs-regulatory-reporting", category: "PROCESSES", text: "PROC-018 Regulatory Reporting Submission (maturity 4), PROC-020 Consumer Duty Annual Board Attestation (maturity 5). FCA GABRIEL, MLAR, CMAR submissions documented. Annual cycle in compliance calendar." },
    { ibsId: "ibs-regulatory-reporting", category: "TECHNOLOGY", text: "FCA RegData / GABRIEL portal, MLAR template (Excel+macro), internal MI platform (Tableau), Core Banking data extracts. Fallback: manual calculation from source ledgers. Secondary GABRIEL login maintained." },
    { ibsId: "ibs-regulatory-reporting", category: "FACILITIES", text: "Remote-first — all systems accessible via VPN. FCA portal accessible from any internet-connected device. No single-site dependency. SMF16 can authorise and submit from any location." },
    { ibsId: "ibs-regulatory-reporting", category: "INFORMATION", text: "Regulatory return data (SEC classification), internal MI packs, prior submission records. Retention: 6 years minimum (FCA requirement). Backup in SharePoint + encrypted local backup. RPO: 4h." },
    // IBS-005 Fraud Detection — PEOPLE + PROCESSES + TECHNOLOGY + INFORMATION → GREEN
    { ibsId: "ibs-fraud-detection", category: "PEOPLE", text: "Head of Fraud (accountable), Fraud Analysts (3 FTE, 24/7 rota), ML Engineering (2 FTE). Deputies: Senior Analyst covers nights/weekends. Third-party fraud bureau on retainer for surge capacity." },
    { ibsId: "ibs-fraud-detection", category: "PROCESSES", text: "PROC-019 Real-Time Fraud Detection (maturity 5). Automated interdiction, manual review queues, customer notification. Sub-1-second detection SLA documented and independently verified." },
    { ibsId: "ibs-fraud-detection", category: "TECHNOLOGY", text: "In-house ML model (AWS SageMaker), Featurespace ARIC platform (secondary), Vocalink real-time data feeds, case management (NICE Actimize). Fallback: rule-based engine with reduced detection rate, manual review escalation." },
    { ibsId: "ibs-fraud-detection", category: "INFORMATION", text: "Transaction monitoring data, fraud case records, ML model training datasets. Classification: Confidential. Retention: 7 years. Real-time streaming via Kafka. RPO: 0h (zero data loss for live transactions)." },
    // IBS-006 Customer Servicing — PEOPLE only → RED
    { ibsId: "ibs-customer-servicing", category: "PEOPLE", text: "Head of Customer Operations, Customer Service Agents (8 FTE), Complaints Handlers (2 FTE). Deputy: Senior Agent covers escalations. Note: technology, facilities and information resource maps pending Q1 2026 BCP update." },
  ];

  let resourceMapsSeeded = 0;
  for (const rm of IBS_RESOURCE_MAPS) {
    const ibsExists = await prisma.importantBusinessService.findUnique({ where: { id: rm.ibsId } });
    if (!ibsExists) continue;
    await prisma.iBSResourceMap.upsert({
      where: { ibsId_category: { ibsId: rm.ibsId, category: rm.category } },
      update: { content: { text: rm.text }, lastUpdatedAt: new Date(), lastUpdatedBy: "user-rob" },
      create: { ibsId: rm.ibsId, category: rm.category, content: { text: rm.text }, lastUpdatedAt: new Date(), lastUpdatedBy: "user-rob" },
    });
    resourceMapsSeeded++;
  }
  console.log(`  ✓ ${resourceMapsSeeded} IBS resource maps seeded`);

  // ResilienceScenario seed data — 3 per IBS (18 total)
  const _today = new Date();
  const daysOffset = (offsetDays: number) => new Date(_today.getTime() + offsetDays * 86400000);

  const RESILIENCE_SCENARIOS: {
    id: string; reference: string; ibsId: string; name: string; description: string;
    scenarioType: "CYBER_ATTACK" | "SYSTEM_OUTAGE" | "THIRD_PARTY_FAILURE" | "PANDEMIC" | "BUILDING_LOSS" | "DATA_CORRUPTION" | "KEY_PERSON_LOSS" | "REGULATORY_CHANGE";
    testedAt: Date | null; nextTestDate: Date | null; conductedBy: string | null;
    status: "PLANNED" | "IN_PROGRESS" | "COMPLETE";
    outcome: "WITHIN_TOLERANCE" | "BREACH" | "NOT_TESTED";
    findings: string | null; remediationRequired: boolean;
  }[] = [
    // IBS-001 Retail Payments
    { id: "sc-001", reference: "SC-001", ibsId: "ibs-retail-payments", name: "Payment Platform Ransomware Attack", description: "Simulates a ransomware attack targeting the payments platform, rendering payment processing unavailable for an extended period.", scenarioType: "CYBER_ATTACK", testedAt: daysOffset(-90), nextTestDate: daysOffset(275), conductedBy: "CISO & Payments Operations", status: "COMPLETE", outcome: "WITHIN_TOLERANCE", findings: "Systems recovered within 3.5h — within 4h MTD. Playbook executed effectively. Minor gap: secondary BACS portal credentials not updated; remediated post-test.", remediationRequired: false },
    { id: "sc-002", reference: "SC-002", ibsId: "ibs-retail-payments", name: "Vocalink Gateway Outage", description: "Third-party Faster Payments scheme operator experiences extended outage, blocking all outbound faster payments.", scenarioType: "THIRD_PARTY_FAILURE", testedAt: daysOffset(-180), nextTestDate: daysOffset(185), conductedBy: "Payments Operations", status: "COMPLETE", outcome: "BREACH", findings: "Tolerance breach of 47 minutes beyond 4h MTD. Root cause: fallback BACS batch run required manual CFO authorisation which took 94 minutes out of hours. Remediation: pre-authorised emergency batch payment process implemented.", remediationRequired: true },
    { id: "sc-003", reference: "SC-003", ibsId: "ibs-retail-payments", name: "Key Personnel Simultaneous Absence", description: "Head of Payments and all senior analysts absent simultaneously (pandemic scenario).", scenarioType: "KEY_PERSON_LOSS", testedAt: null, nextTestDate: daysOffset(14), conductedBy: null, status: "PLANNED", outcome: "NOT_TESTED", findings: null, remediationRequired: false },
    // IBS-002 Customer Onboarding
    { id: "sc-004", reference: "SC-004", ibsId: "ibs-customer-onboarding", name: "eIDV Provider System Failure", description: "Onfido identity verification platform becomes unavailable for 24+ hours, blocking all new account openings.", scenarioType: "THIRD_PARTY_FAILURE", testedAt: daysOffset(-45), nextTestDate: daysOffset(320), conductedBy: "Customer Operations", status: "COMPLETE", outcome: "WITHIN_TOLERANCE", findings: "Manual ID verification process activated within 2h. Throughput reduced to 60% but within tolerance. Staff training refresh recommended for manual process steps.", remediationRequired: false },
    { id: "sc-005", reference: "SC-005", ibsId: "ibs-customer-onboarding", name: "KYC Data Platform Corruption", description: "Corruption of customer application data requiring rollback and re-processing of in-flight applications.", scenarioType: "DATA_CORRUPTION", testedAt: null, nextTestDate: daysOffset(21), conductedBy: null, status: "IN_PROGRESS", outcome: "NOT_TESTED", findings: "Test in progress — data corruption simulation running with sandbox environment. Initial findings being documented.", remediationRequired: false },
    { id: "sc-006", reference: "SC-006", ibsId: "ibs-customer-onboarding", name: "London Office Building Loss", description: "Primary London office becomes inaccessible, requiring full remote mobilisation of onboarding team.", scenarioType: "BUILDING_LOSS", testedAt: daysOffset(-270), nextTestDate: daysOffset(95), conductedBy: "BCP Team", status: "COMPLETE", outcome: "WITHIN_TOLERANCE", findings: "Full remote capability confirmed. All KYC tools accessible via VPN within 45 minutes. No customer-impacting downtime recorded.", remediationRequired: false },
    // IBS-003 Lending Decisioning
    { id: "sc-007", reference: "SC-007", ibsId: "ibs-lending-decisioning", name: "Decision Engine Cyber Incident", description: "Cyber attack targets the credit decisioning platform, forcing shutdown and failover to manual scorecard process.", scenarioType: "CYBER_ATTACK", testedAt: daysOffset(-120), nextTestDate: daysOffset(245), conductedBy: "Credit & IT Security", status: "COMPLETE", outcome: "WITHIN_TOLERANCE", findings: "Manual scorecard process activated in 1h 45m. Within 8h MTD tolerance. Throughput fell to 40% — acceptable. Model team response time excellent.", remediationRequired: false },
    { id: "sc-008", reference: "SC-008", ibsId: "ibs-lending-decisioning", name: "Credit Bureau API Failure", description: "Primary credit bureau (Equifax) API unavailable, preventing automated credit scoring for new applications.", scenarioType: "THIRD_PARTY_FAILURE", testedAt: daysOffset(-60), nextTestDate: daysOffset(305), conductedBy: "Credit Operations", status: "COMPLETE", outcome: "BREACH", findings: "Tolerance breach: TransUnion fallback took 3h 20m to activate (exceeded 2h target). Root cause: API credentials not maintained in rotation. Remediation required: automated fallback with pre-tested credentials.", remediationRequired: true },
    { id: "sc-009", reference: "SC-009", ibsId: "ibs-lending-decisioning", name: "Pandemic Mass Absence — Credit Team", description: "40% of credit operations team absent, testing reduced staffing models and triage processes.", scenarioType: "PANDEMIC", testedAt: null, nextTestDate: daysOffset(-5), conductedBy: null, status: "PLANNED", outcome: "NOT_TESTED", findings: null, remediationRequired: false },
    // IBS-004 Regulatory Reporting
    { id: "sc-010", reference: "SC-010", ibsId: "ibs-regulatory-reporting", name: "FCA Portal Outage at Submission Deadline", description: "FCA RegData portal unavailable on the MLAR submission deadline, requiring escalation to FCA and evidence of attempted submission.", scenarioType: "SYSTEM_OUTAGE", testedAt: daysOffset(-30), nextTestDate: daysOffset(335), conductedBy: "Compliance", status: "COMPLETE", outcome: "WITHIN_TOLERANCE", findings: "FCA temporary relief process exercised in tabletop scenario. Evidence package prepared and submitted via FCA email within 2h. Process now documented in the compliance calendar.", remediationRequired: false },
    { id: "sc-011", reference: "SC-011", ibsId: "ibs-regulatory-reporting", name: "SMF16 Extended Absence at Reporting Period", description: "Compliance Oversight SMF holder incapacitated with no deputy briefed — testing succession and reporting continuity.", scenarioType: "KEY_PERSON_LOSS", testedAt: daysOffset(-200), nextTestDate: daysOffset(165), conductedBy: "Compliance & HR", status: "COMPLETE", outcome: "WITHIN_TOLERANCE", findings: "Deputy SMF appointment process initiated within 4h. Temporary SMF16 coverage obtained from CFO (dual-registered) within 24h. No submission delays.", remediationRequired: false },
    { id: "sc-012", reference: "SC-012", ibsId: "ibs-regulatory-reporting", name: "Data Integrity Failure in Returns", description: "Source system corruption results in incorrect data feeding into regulatory returns, detected post-preparation.", scenarioType: "DATA_CORRUPTION", testedAt: null, nextTestDate: daysOffset(30), conductedBy: null, status: "PLANNED", outcome: "NOT_TESTED", findings: null, remediationRequired: false },
    // IBS-005 Fraud Detection
    { id: "sc-013", reference: "SC-013", ibsId: "ibs-fraud-detection", name: "ML Fraud Model Targeted Attack", description: "Adversarial attack on the ML fraud detection model through systematic probing, degrading detection accuracy below threshold.", scenarioType: "CYBER_ATTACK", testedAt: daysOffset(-75), nextTestDate: daysOffset(290), conductedBy: "CISO, ML Engineering, Fraud", status: "COMPLETE", outcome: "WITHIN_TOLERANCE", findings: "Rule-based fallback engine activated within 18 minutes. Detection rate maintained at 73% (above 70% minimum threshold). ML model retrained and re-deployed within 6h.", remediationRequired: false },
    { id: "sc-014", reference: "SC-014", ibsId: "ibs-fraud-detection", name: "Featurespace ARIC Platform Outage", description: "Secondary fraud platform unavailable, testing reliance on primary ML engine and manual review capacity.", scenarioType: "THIRD_PARTY_FAILURE", testedAt: daysOffset(-150), nextTestDate: daysOffset(215), conductedBy: "Fraud Operations", status: "COMPLETE", outcome: "WITHIN_TOLERANCE", findings: "Primary ML engine handled full volume without degradation. Manual review queue increased by 22% — within capacity. SLA maintained at 99.2% detection within 1 second.", remediationRequired: false },
    { id: "sc-015", reference: "SC-015", ibsId: "ibs-fraud-detection", name: "Real-Time Data Feed Interruption", description: "Kafka streaming data feed disruption causing processing lag in transaction monitoring.", scenarioType: "SYSTEM_OUTAGE", testedAt: null, nextTestDate: daysOffset(7), conductedBy: null, status: "PLANNED", outcome: "NOT_TESTED", findings: null, remediationRequired: false },
    // IBS-006 Customer Servicing
    { id: "sc-016", reference: "SC-016", ibsId: "ibs-customer-servicing", name: "CRM Platform Outage", description: "Customer relationship management system unavailable, preventing agents from accessing customer records and logging interactions.", scenarioType: "SYSTEM_OUTAGE", testedAt: daysOffset(-240), nextTestDate: daysOffset(125), conductedBy: "Customer Operations IT", status: "COMPLETE", outcome: "BREACH", findings: "Tolerance breach: paper-based fallback activated but 1,400 interactions were not logged within the 12h window. Root cause: paper forms lacked required FCA data fields. Remediation: updated paper forms and digital offline capture tool developed.", remediationRequired: true },
    { id: "sc-017", reference: "SC-017", ibsId: "ibs-customer-servicing", name: "Large-Scale Complaints Surge", description: "Regulatory change triggers 300% increase in customer complaints, overwhelming the servicing team.", scenarioType: "REGULATORY_CHANGE", testedAt: null, nextTestDate: daysOffset(45), conductedBy: null, status: "IN_PROGRESS", outcome: "NOT_TESTED", findings: "Tabletop exercise in progress. Interim findings suggest agency staff onboarding SLA may not meet FCA 8-week complaint resolution requirement.", remediationRequired: false },
    { id: "sc-018", reference: "SC-018", ibsId: "ibs-customer-servicing", name: "Servicing Centre Building Loss", description: "Primary customer servicing centre inaccessible, testing home-working mobilisation of 10 FTE within 4 hours.", scenarioType: "BUILDING_LOSS", testedAt: null, nextTestDate: daysOffset(-15), conductedBy: null, status: "PLANNED", outcome: "NOT_TESTED", findings: null, remediationRequired: false },
  ];

  let scenariosSeeded = 0;
  for (const sc of RESILIENCE_SCENARIOS) {
    const ibsExists = await prisma.importantBusinessService.findUnique({ where: { id: sc.ibsId } });
    if (!ibsExists) continue;
    await prisma.resilienceScenario.upsert({
      where: { reference: sc.reference },
      update: {
        ibsId: sc.ibsId, name: sc.name, description: sc.description, scenarioType: sc.scenarioType,
        testedAt: sc.testedAt, nextTestDate: sc.nextTestDate, conductedBy: sc.conductedBy,
        status: sc.status, outcome: sc.outcome, findings: sc.findings, remediationRequired: sc.remediationRequired,
      },
      create: {
        id: sc.id, reference: sc.reference, ibsId: sc.ibsId, name: sc.name, description: sc.description,
        scenarioType: sc.scenarioType, testedAt: sc.testedAt, nextTestDate: sc.nextTestDate,
        conductedBy: sc.conductedBy, status: sc.status, outcome: sc.outcome,
        findings: sc.findings, remediationRequired: sc.remediationRequired,
      },
    });
    scenariosSeeded++;
  }
  console.log(`  ✓ ${scenariosSeeded} resilience scenarios seeded`);

  // SelfAssessment — 2025 DRAFT
  const existingSA = await prisma.selfAssessment.findUnique({ where: { year: 2025 } });
  if (!existingSA) {
    await prisma.selfAssessment.create({
      data: {
        year: 2025,
        status: "DRAFT",
        executiveSummary: "Updraft's 2025 Operational Resilience Self-Assessment confirms that all six Important Business Services have been mapped, scenario-tested, and assessed against their respective impact tolerances as required by FCA PS21/3 and CMORG v3. The firm has made substantial progress in embedding resilience into its operations since the 2024 assessment. Two scenarios resulted in tolerance breaches — both relating to third-party dependency activation times — for which remediation actions have been implemented and independently verified. Three vulnerabilities remain open, primarily in the customer servicing IBS, where the technology and facilities resource mapping is incomplete. The Board is invited to review and approve this assessment prior to regulatory submission by 31 March 2026.",
        vulnerabilitiesCount: 3,
        openRemediations: 2,
        documentUrl: null,
      },
    });
    console.log("  ✓ 2025 self-assessment seeded (DRAFT)");
  } else {
    console.log("  ⓘ 2025 self-assessment already exists — skipped");
  }

  // ── Regulatory Calendar Seed Data ──────────────────────────────────────────
  const REG_EVENTS: {
    id: string; title: string; description: string; eventDate: Date;
    type: "DEADLINE" | "REVIEW" | "SUBMISSION" | "CONSULTATION" | "INTERNAL_DEADLINE";
    source: string; url: string | null; alertDays: number;
  }[] = [
    { id: "regevent-001", title: "PS21/3 Annual Self-Assessment Submission", description: "Annual submission of the Operational Resilience self-assessment to the FCA/PRA, demonstrating compliance with PS21/3 requirements and confirming all IBS operate within impact tolerances.", eventDate: new Date("2026-03-31"), type: "DEADLINE", source: "FCA", url: "https://www.fca.org.uk/publications/policy-statements/ps21-3-building-operational-resilience", alertDays: 30 },
    { id: "regevent-002", title: "DORA Operational Resilience Report", description: "Annual operational resilience report required under the EU Digital Operational Resilience Act (DORA) Article 19 for entities with EU operations.", eventDate: new Date("2026-01-17"), type: "SUBMISSION", source: "DORA", url: null, alertDays: 30 },
    { id: "regevent-003", title: "FCA Consumer Duty Annual Board Report", description: "The annual Consumer Duty board report, attesting that the firm is delivering good outcomes under the Consumer Duty (PS22/9). Board must approve before submission deadline.", eventDate: new Date("2026-07-31"), type: "DEADLINE", source: "FCA", url: null, alertDays: 30 },
    { id: "regevent-004", title: "Annual IBS Scenario Testing Review", description: "Internal review deadline: all six Important Business Services must have completed at least one scenario test within the current calendar year, with findings documented and reviewed by the CCRO.", eventDate: new Date("2026-03-01"), type: "INTERNAL_DEADLINE", source: "INTERNAL", url: null, alertDays: 30 },
    { id: "regevent-005", title: "SM&CR Annual Certification Window", description: "Annual deadline for completing all SM&CR certification assessments for Certified Persons. All certificates must be renewed or revoked before 31 December.", eventDate: new Date("2026-12-31"), type: "REVIEW", source: "FCA", url: null, alertDays: 30 },
  ];

  let regEventsSeeded = 0;
  for (const ev of REG_EVENTS) {
    await prisma.regulatoryEvent.upsert({
      where: { id: ev.id },
      update: { title: ev.title, description: ev.description, eventDate: ev.eventDate, type: ev.type, source: ev.source, url: ev.url, alertDays: ev.alertDays },
      create: { id: ev.id, title: ev.title, description: ev.description, eventDate: ev.eventDate, type: ev.type, source: ev.source, url: ev.url, alertDays: ev.alertDays },
    });
    regEventsSeeded++;
  }
  console.log(`  ✓ ${regEventsSeeded} regulatory calendar events seeded`);

  // ── Horizon Scanning Items (Feb 2026 scan) ──────────────────────────────
  const HORIZON_ITEMS: {
    id: string; reference: string; title: string; category: "FCA_REGULATORY" | "LEGISLATIVE" | "ECONOMIC" | "DATA_TECHNOLOGY" | "EMPLOYMENT" | "PAYMENTS_REGULATORY" | "COMPETITIVE";
    source: string; urgency: "HIGH" | "MEDIUM" | "LOW"; status: "MONITORING" | "ACTION_REQUIRED" | "IN_PROGRESS" | "COMPLETED" | "DISMISSED";
    summary: string; whyItMatters: string; deadline: Date | null; sourceUrl: string | null;
    actions: string | null; notes: string | null; monthAdded: string; inFocus: boolean; addedById: string;
  }[] = [
    {
      id: "hz-001", reference: "HZ-001", title: "Motor Finance Commission — FCA Redress Scheme Imminent",
      category: "FCA_REGULATORY", source: "FCA", urgency: "HIGH", status: "ACTION_REQUIRED",
      summary: "Following the Court of Appeal ruling in October 2024 that secret discretionary commissions in motor finance were unlawful, the FCA ran a consultation on an industry-wide redress scheme (closed 12 December 2025). A Policy Statement is expected February or March 2026. The ruling and remedies apply broadly to commission disclosure obligations across consumer credit products, not only motor finance.",
      whyItMatters: "Updraft's lending products and any commission arrangements with distributors or introducers must be reviewed. If any discretionary commission arrangements were paid to third parties in connection with consumer credit products, Updraft may face redress liability. The firm must be able to demonstrate clean documentation showing no undisclosed commissions were charged to consumers.",
      deadline: new Date("2026-03-31"), sourceUrl: "https://www.fca.org.uk/news/statements/fca-update-discretionary-commission-arrangements-motor-finance",
      actions: "1. Review all commission arrangements with distributors and introducers — historic and current\n2. Confirm no discretionary commission arrangements were paid on consumer credit products without disclosure\n3. Prepare Board briefing on Policy Statement once published (expected Feb/Mar 2026)\n4. Document Updraft's position and retain on FCA supervisory file\n5. Assign Legal/Compliance review of any historic distribution or introducer arrangements",
      notes: "Policy Statement expected imminently — February or March 2026. Flagged as P1 CCRO issue at January ExCo.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-002", reference: "HZ-002", title: "Consumer Duty — Annual Board Report (July 2026)",
      category: "FCA_REGULATORY", source: "FCA", urgency: "HIGH", status: "ACTION_REQUIRED",
      summary: "All FCA-authorised firms must produce a board-level Consumer Duty annual assessment by 31 July each year evidencing delivery of good outcomes across the four outcome areas. The FCA published a supervisory update in December 2025 and has confirmed a formal consultation on Consumer Duty updates mid-2026, including scope and distribution chain issues.",
      whyItMatters: "Updraft's entire regulatory operating model is anchored to Consumer Duty. The CCRO Dashboard's Consumer Duty module is the primary evidence base for the annual board report. Failure to produce a credible, evidence-based report by 31 July risks supervisory intervention.",
      deadline: new Date("2026-07-31"), sourceUrl: "https://www.fca.org.uk/firms/consumer-duty",
      actions: "1. Confirm board report template and sign-off process by May 2026\n2. Ensure all four Consumer Duty outcome measures are fully updated in CCRO Dashboard by June\n3. CCRO to draft narrative board report sections in June for board approval before July\n4. Monitor FCA mid-2026 consultation on Consumer Duty updates\n5. Review FCA December 2025 supervisory statement for gaps and incorporate into report",
      notes: "Annual deadline is 31 July 2026. FCA mid-2026 consultation may change requirements — watch for updates.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-003", reference: "HZ-003", title: "Data (Use and Access) Act 2025 — In Force & Complaints Procedure Deadline",
      category: "DATA_TECHNOLOGY", source: "ICO", urgency: "HIGH", status: "ACTION_REQUIRED",
      summary: "The Data (Use and Access) Act 2025 came largely into force on 5 February 2026. Key changes: PECR fines raised to £17.5m or 4% of global turnover; reformed Legitimate Interest provisions under UK GDPR; updated automated decision-making rules; new statutory complaints-handling process with a mandatory 30-day response SLA. ICO final guidance published Winter 2025/26.",
      whyItMatters: "The PECR fine increase to £17.5m is particularly material — a single serious electronic marketing breach could now result in a fine at that level. Updraft's marketing consent flows, automated credit decisions, and data subject rights processes all need review. The statutory complaints procedure must be operational by 19 June 2026.",
      deadline: new Date("2026-06-19"), sourceUrl: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/",
      actions: "1. IMMEDIATE: Audit all electronic direct marketing consent flows for PECR compliance given the increased fine level\n2. Review all Legitimate Interest Assessments for alignment with the new statutory provisions\n3. Review automated credit decision processes against the updated ICO guidance on ADM\n4. Implement statutory data protection complaints procedure with 30-day SLA by 19 June 2026\n5. Assign DPO responsibility for full DUAA gap analysis and board-level update",
      notes: "Act in force 5 February 2026. Complaints procedure deadline 19 June 2026 is a hard statutory deadline — immediate action required.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-004", reference: "HZ-004", title: "FCA CP26/7 — Mandatory Credit Information Sharing (Multi-Bureau Reporting)",
      category: "FCA_REGULATORY", source: "FCA", urgency: "HIGH", status: "ACTION_REQUIRED",
      summary: "FCA Consultation Paper CP26/7 proposes that any lender sharing credit data with one Designated Consumer Credit Reference Agency (DCCRA) must share it with all of them — mandatory multi-bureau reporting. This is a core remedy from the Credit Information Market Study. The Credit Information Governance Body (CIGB) was formally launched in September 2025 to oversee the new credit information framework. The CP closes 1 May 2026.",
      whyItMatters: "Updraft currently shares credit data with one or more CRAs. If mandatory sharing is implemented, Updraft will need to integrate with all designated DCCRAs — a significant engineering and compliance undertaking. Credit risk models, affordability assessments, and data quality processes will all be affected. The CIGB sets new data governance standards that Updraft must meet.",
      deadline: new Date("2026-05-01"), sourceUrl: "https://www.fca.org.uk/publications/market-studies/credit-information-market-study",
      actions: "1. Compliance/Data team to read CP26/7 in full and assess current CRA data sharing arrangements\n2. Engineering to scope cost and effort of integrating with additional DCCRAs if mandatory sharing is confirmed\n3. Credit Risk to assess impact on affordability and credit scoring models\n4. Consider and draft a consultation response by the 1 May 2026 deadline\n5. Monitor CIGB governance publications and data quality standards",
      notes: "Consultation closes 1 May 2026. In Focus — CCRO has flagged this as a material change to Updraft's data infrastructure and credit risk framework.", monthAdded: "February 2026", inFocus: true, addedById: "user-rob",
    },
    {
      id: "hz-005", reference: "HZ-005", title: "FCA Affordability & Creditworthiness — Active Supervisory Priority",
      category: "FCA_REGULATORY", source: "FCA", urgency: "HIGH", status: "IN_PROGRESS",
      summary: "The FCA has maintained affordability and creditworthiness assessment as a top supervisory priority. Its December 2025 supervisory statement reinforces that firms must evidence good consumer outcomes from lending decisions. The FCA has also confirmed a review of consumer credit advertising rules under CONC 3 in Q2 2026. Supervisory visits and data requests to consumer credit firms are ongoing.",
      whyItMatters: "Updraft is a consumer lender and affordability is central to its regulatory obligations. Any gap between Updraft's affordability methodology and FCA expectations creates enforcement risk and potential remediation liability. Rising FOS upheld rates on unaffordable lending complaints signal that the industry bar is being raised.",
      deadline: null, sourceUrl: "https://www.fca.org.uk/firms/consumer-credit",
      actions: "1. Internal review of affordability assessment methodology against CONC 5 and the Consumer Duty outcomes framework\n2. Review declined application journeys — are customers referred to debt advice where appropriate?\n3. Ensure vulnerability identification is embedded in the origination and decisioning process\n4. Ensure affordability-related Consumer Duty metrics are tracked in the CCRO Dashboard\n5. Prepare a readiness pack evidencing good consumer outcomes for a potential FCA data request or supervisory visit",
      notes: "FCA supervisory visits to consumer credit firms ongoing. CONC 3 advertising review expected Q2 2026 — monitor for impact on marketing and promotions.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-006", reference: "HZ-006", title: "Compliance Warning: Monzo £21.1M FCA Fine — AML & CDD Failures",
      category: "FCA_REGULATORY", source: "FCA", urgency: "HIGH", status: "ACTION_REQUIRED",
      summary: "In July 2025 the FCA fined Monzo Financial Technology Ltd £21.1M for systemic AML and CDD failures. The Final Notice found: implausible address verification checks accepted at onboarding; a default risk rating of 'no identified risk' applied to all customers regardless of profile; and a breach of a Voluntary Requirement (VREQ) by onboarding approximately 34,000 high-risk customers Monzo had agreed not to accept.",
      whyItMatters: "The FCA is using this Final Notice as a benchmark for supervisory expectations across consumer fintechs. Updraft is a fintech consumer lender and the FCA will expect equivalent controls. The specific failures cited — address verification, risk-based approach calibration, regulatory undertaking compliance — must be benchmarked against Updraft's own AML framework immediately.",
      deadline: null, sourceUrl: "https://www.fca.org.uk/news/press-releases/fca-fines-monzo-financial-technology-limited-aml-failures",
      actions: "1. MLRO to review CDD and address verification controls against the specific failures cited in the Monzo Final Notice\n2. Review Business-Wide Risk Assessment for adequacy and ensure it reflects current customer risk profile\n3. Confirm all regulatory undertakings and commitments made to the FCA are being actively monitored and honoured\n4. CCRO to assess compliance team headcount and capability relative to loan book growth trajectory\n5. Board/ExCo briefing on Monzo lessons learned and Updraft's risk exposure",
      notes: "FCA Final Notice published July 2025. Treat as precedent-setting for fintech consumer lender AML/CDD supervisory standards. MLRO to lead review.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-007", reference: "HZ-007", title: "Competitive Threat: Abound 'Render' AI Model — Open Banking Underwriting",
      category: "COMPETITIVE", source: "Competitive Intelligence", urgency: "HIGH", status: "MONITORING",
      summary: "Abound has surpassed £1 billion in total lending, backed by £1.6 billion in institutional investment. Its 'Render' AI underwriting model uses real-time Open Banking cashflow data, claims a 75% reduction in default rates, and approves approximately seven borrowers for every one it declines based on adverse Open Banking data. In January 2026, Abound acquired Ahauz, a specialist mortgage lender, signalling a strategic move toward a cradle-to-grave financial platform.",
      whyItMatters: "Abound is Updraft's most technically advanced direct competitor in the consumer credit and debt consolidation market. Its Open Banking underwriting model is significantly more sophisticated than traditional CRA-based decisioning and could pull higher-quality borrowers away from Updraft. The Ahauz acquisition signals Abound intends to own the full lending lifecycle — a direct strategic threat.",
      deadline: null, sourceUrl: "https://www.abound.co.uk",
      actions: "1. CRO to benchmark Updraft's Open Banking data ingestion and use against Abound's 'Render' approach\n2. Assess whether affordability models can be enhanced with real-time Open Banking cashflow underwriting\n3. Evaluate strategic partnership options for customer graduation after debt consolidation\n4. Consider the CP26/7 consultation response as an opportunity to position Updraft favourably in the expanded CRA data landscape\n5. Include Abound competitive positioning as a standing item in board strategy discussions",
      notes: "Abound £1bn lending milestone reached 2025. Ahauz acquisition completed January 2026. Backed by Hambro Perks and Citi. Key competitor to track.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-008", reference: "HZ-008", title: "Employment Rights Act 2025 — Day One Rights from 6 April 2026",
      category: "EMPLOYMENT", source: "BEIS", urgency: "HIGH", status: "ACTION_REQUIRED",
      summary: "The Employment Rights Act 2025 represents the most significant overhaul of UK employment law in a generation. From 6 April 2026: Statutory Sick Pay (SSP) becomes a Day One right with no waiting days and no lower earnings limit; paternity leave and unpaid parental leave also become Day One rights. A new Fair Work Agency launches as the unified employment enforcement body. Future provisions include removal of the two-year qualifying period for unfair dismissal protection.",
      whyItMatters: "Updraft's payroll systems, HR policies, employment contracts, and line manager processes all need updating before 6 April 2026. The Day One SSP change is particularly material — no waiting days and no lower earnings limit means SSP costs will increase and payroll systems must be reconfigured. The future removal of the two-year unfair dismissal qualifying period will require a fundamental rethink of the probationary period process.",
      deadline: new Date("2026-04-06"), sourceUrl: "https://www.gov.uk/guidance/employment-rights-bill-overview",
      actions: "1. HR/Payroll to update systems for Day One SSP with no lower earnings limit — hard deadline 6 April 2026\n2. Update employment contracts, staff handbooks, and HR policies before 6 April\n3. Brief all line managers on Day One SSP obligations and new parental leave rights before 6 April\n4. Seek employment law advice on the probationary period process ahead of the future unfair dismissal changes\n5. Ensure performance management documentation is robust from day one of employment",
      notes: "Day One SSP and parental leave rights in force 6 April 2026 — hard deadline. Two-year unfair dismissal qualifying period removal expected later in 2026/2027 — plan ahead.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-009", reference: "HZ-009", title: "FCA Credit Reference Agency (CRA) Market Study",
      category: "FCA_REGULATORY", source: "FCA", urgency: "MEDIUM", status: "MONITORING",
      summary: "The FCA's market study into the CRA sector is expected to produce final recommendations in 2026. Proposals may include enhanced data accuracy requirements, new consumer rights, and potential changes to how CRAs share data with lenders.",
      whyItMatters: "Updraft's credit decisioning relies on CRA data. Changes to data standards, sharing rules, or consumer correction rights could affect model accuracy and onboarding processes.",
      deadline: new Date("2026-09-30"), sourceUrl: "https://www.fca.org.uk/publications/market-studies/market-study-credit-information-market",
      actions: "1. Monitor market study progress and submit evidence if invited\n2. Assess impact of proposed CRA data sharing changes on credit models",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-010", reference: "HZ-010", title: "Open Banking / Smart Data — PSR and FCA Joint Expansion",
      category: "PAYMENTS_REGULATORY", source: "PSR / FCA", urgency: "MEDIUM", status: "MONITORING",
      summary: "The JROC roadmap for Open Banking expansion continues into 2026, including Variable Recurring Payments commercial framework and Smart Data schemes for credit and savings products.",
      whyItMatters: "Open Banking data could enhance Updraft's affordability and income verification. Smart Data rules may impose new third-party access obligations on customer data.",
      deadline: null, sourceUrl: "https://www.psr.org.uk/our-work/open-banking/",
      actions: "1. Review JROC VRP commercial framework — assess payment initiation opportunity\n2. Monitor Smart Data bill progress for data sharing obligations",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-011", reference: "HZ-011", title: "Digital Markets, Competition and Consumers Act 2024",
      category: "LEGISLATIVE", source: "CMA / DSIT", urgency: "MEDIUM", status: "MONITORING",
      summary: "The DMCC Act received Royal Assent May 2024. CMA implementation continues through 2026. Key measures include new subscription contract rules, fake review prohibitions, and enhanced CMA enforcement powers.",
      whyItMatters: "Updraft's subscription-style credit products and marketing practices must comply with the new subscription contract rules. Enhanced CMA powers increase consumer enforcement risk.",
      deadline: new Date("2026-10-01"), sourceUrl: "https://www.gov.uk/government/collections/digital-markets-competition-and-consumers-bill",
      actions: "1. Review subscription product terms against DMCC subscription rules\n2. Audit cancellation and exit journeys for compliance",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-cath",
    },
    {
      id: "hz-012", reference: "HZ-012", title: "FCA Consumer Composite Investments (CCI) Regime",
      category: "FCA_REGULATORY", source: "FCA", urgency: "MEDIUM", status: "MONITORING",
      summary: "The FCA is implementing the UK CCI regime replacing EU PRIIPs. Final rules expected 2026. This replaces EU-derived disclosure rules for packaged retail investment products.",
      whyItMatters: "If Updraft offers investment-adjacent products in future, the CCI disclosure framework will apply. Monitoring final rules ensures readiness for any product expansion.",
      deadline: null, sourceUrl: "https://www.fca.org.uk/firms/consumer-composite-investments",
      actions: "1. Assess if any current/planned products fall within CCI scope\n2. Note implementation timeline for future product planning",
      notes: "Low immediate impact but watch if product roadmap expands.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-013", reference: "HZ-013", title: "Data (Use and Access) Act 2025 — Smart Data & Legitimate Interests Implementation",
      category: "DATA_TECHNOLOGY", source: "DSIT / ICO", urgency: "MEDIUM", status: "MONITORING",
      summary: "The Data (Use and Access) Act 2025 came into force 5 February 2026 (see HZ-003 for urgent action items). Ongoing implementation work includes: smart data schemes for credit and financial services; the new recognised legitimate interests framework under UK GDPR; and longer-term changes to data subject rights. ICO is publishing implementation guidance throughout 2026.",
      whyItMatters: "The smart data provisions could impose new third-party data sharing obligations on Updraft's customer data for Open Banking and credit purposes. The reformed legitimate interests provisions may change how Updraft processes data for fraud prevention, analytics, and marketing, requiring updated LIAs and privacy notices.",
      deadline: new Date("2026-12-31"), sourceUrl: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/",
      actions: "1. DPO to monitor ICO smart data guidance publications throughout 2026\n2. Review and update all Legitimate Interest Assessments against the new statutory framework\n3. Assess whether smart data credit scheme obligations apply to Updraft's data sharing practices\n4. Update privacy notices to reflect changes to legitimate interests processing and data subject rights",
      notes: "Urgent DUAA compliance actions tracked under HZ-003. This item covers ongoing implementation and smart data monitoring.", monthAdded: "February 2026", inFocus: false, addedById: "user-cath",
    },
    {
      id: "hz-014", reference: "HZ-014", title: "FCA Guidance on Vulnerable Customers — Potential Refresh",
      category: "FCA_REGULATORY", source: "FCA", urgency: "MEDIUM", status: "MONITORING",
      summary: "The FCA published FG21/1 on fair treatment of vulnerable customers. Under Consumer Duty, the FCA is reviewing whether this guidance remains fit for purpose and may update it in 2026.",
      whyItMatters: "Updraft serves customers who may be experiencing financial difficulty. The firm must demonstrate that vulnerable customer identification, treatment, and outcome monitoring are embedded across all touchpoints.",
      deadline: null, sourceUrl: "https://www.fca.org.uk/publications/finalised-guidance/fg21-1-guidance-firms-fair-treatment-vulnerable-customers",
      actions: "1. Review vulnerable customer policy against FG21/1 and Consumer Duty\n2. Assess whether vulnerable customer identification triggers are embedded in digital journeys",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-cath",
    },
    {
      id: "hz-015", reference: "HZ-015", title: "FCA Sustainability Disclosure Requirements — Scope Watch",
      category: "FCA_REGULATORY", source: "FCA", urgency: "MEDIUM", status: "MONITORING",
      summary: "The FCA's SDR labelling regime for investment products is being evaluated for potential extension to other financial services including lending. A transition finance framework relevant to firms with sustainability commitments is also in development.",
      whyItMatters: "If SDR scope expands to consumer credit, Updraft would need to make sustainability-related disclosures about its lending products and practices.",
      deadline: null, sourceUrl: "https://www.fca.org.uk/firms/sustainable-finance/sustainability-disclosure-requirements",
      actions: "1. Monitor FCA SDR scope consultation — flag if lending products are included\n2. Review current sustainability commitments against anticipated disclosure requirements",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-016", reference: "HZ-016", title: "Employment Rights Act 2025 — Unfair Dismissal & Zero-Hours Future Provisions",
      category: "EMPLOYMENT", source: "BEIS", urgency: "MEDIUM", status: "MONITORING",
      summary: "The Employment Rights Act 2025 (Royal Assent received) contains further provisions not yet in force: removal of the two-year qualifying period for unfair dismissal protection (expected 2026/27); strengthened collective redundancy notification obligations; new rights for zero-hours and agency workers. See HZ-008 for the urgent 6 April 2026 Day One rights deadline.",
      whyItMatters: "The removal of the two-year unfair dismissal qualifying period is the most disruptive future provision for Updraft — it will require a complete rethink of probationary period management and performance documentation from day one of employment. Zero-hours worker protections may affect any flexible staffing arrangements.",
      deadline: new Date("2026-10-01"), sourceUrl: "https://www.gov.uk/guidance/employment-rights-bill-overview",
      actions: "1. HR to review and update probationary period policies and documentation standards ahead of unfair dismissal changes\n2. Assess any zero-hours or flexible staffing arrangements against the new worker rights framework\n3. Brief ExCo on the financial and operational impact of removing the two-year qualifying period\n4. Monitor secondary legislation for commencement dates of future provisions",
      notes: "Day One SSP and parental leave rights (6 April 2026) tracked under HZ-008. This item monitors longer-term provisions including unfair dismissal reform.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-017", reference: "HZ-017", title: "Digital Pound (CBDC) — Bank of England Design Phase",
      category: "DATA_TECHNOLOGY", source: "Bank of England / HMT", urgency: "LOW", status: "MONITORING",
      summary: "The Bank of England and HM Treasury are in the design phase of a potential retail digital pound. No final decision has been taken to build. The design phase is expected to run through 2025–2027.",
      whyItMatters: "A digital pound could fundamentally change payment infrastructure and bank account dynamics, affecting Updraft's customer acquisition, payment processing costs, and Open Banking integrations.",
      deadline: null, sourceUrl: "https://www.bankofengland.co.uk/the-digital-pound",
      actions: "1. Monitor design phase publications\n2. Consider 3–5 year product planning impact if CBDC proceeds",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-018", reference: "HZ-018", title: "National Living Wage — April 2026 Increase",
      category: "EMPLOYMENT", source: "DBET", urgency: "LOW", status: "MONITORING",
      summary: "The National Living Wage is expected to increase from April 2026 following Low Pay Commission recommendations. This follows consecutive above-inflation increases since 2022.",
      whyItMatters: "NLW increases affect Updraft's direct staff costs and, more broadly, the disposable income and debt serviceability of the customer base. Credit models and affordability assumptions should reflect updated minimum wage floors.",
      deadline: new Date("2026-04-01"), sourceUrl: "https://www.gov.uk/government/collections/national-minimum-wage-and-living-wage-legislation-and-guidance",
      actions: "1. HR: update payroll in advance of April 2026\n2. Credit risk: review affordability model inputs for NLW floor assumptions",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-019", reference: "HZ-019", title: "FCA Advice/Guidance Boundary Review",
      category: "FCA_REGULATORY", source: "FCA", urgency: "LOW", status: "MONITORING",
      summary: "The FCA is reviewing the advice/guidance boundary following the Edinburgh Reforms. The aim is to allow firms to provide more helpful guidance to consumers without triggering full regulated advice obligations.",
      whyItMatters: "A revised advice boundary could allow Updraft to provide more personalised financial guidance within its app without requiring regulated advice authorisation — supporting customer outcomes and engagement.",
      deadline: null, sourceUrl: "https://www.fca.org.uk/firms/financial-advice-guidance-boundary",
      actions: "1. Monitor final FCA policy statement\n2. Assess product opportunity if guidance boundary is relaxed",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-020", reference: "HZ-020", title: "UK-EU Financial Services Regulatory Arrangement",
      category: "LEGISLATIVE", source: "HM Treasury / European Commission", urgency: "LOW", status: "MONITORING",
      summary: "The UK and EU are working toward a Memorandum of Regulatory Arrangement for financial services as part of the broader relationship reset. Equivalence decisions and mutual recognition of regulatory frameworks are on the agenda.",
      whyItMatters: "Any arrangement affecting consumer credit, data flows, or payment services could have downstream impacts on Updraft's cross-border operations and on UK-EU data transfer mechanisms under UK GDPR adequacy.",
      deadline: null, sourceUrl: null,
      actions: "1. Monitor negotiations for consumer credit and data implications\n2. Brief Board on any material UK-EU regulatory divergence",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-021", reference: "HZ-021", title: "FCA AI Governance Expectations — Forthcoming Dear CEO Letter",
      category: "FCA_REGULATORY", source: "FCA", urgency: "LOW", status: "MONITORING",
      summary: "The FCA is expected to publish updated AI governance expectations in 2026, potentially via a Dear CEO letter to consumer credit firms, setting out minimum standards for AI model governance, bias monitoring, and customer explainability.",
      whyItMatters: "Updraft must be able to demonstrate to the FCA that its use of AI and machine learning in credit decisioning is fair, explainable, and subject to robust governance.",
      deadline: null, sourceUrl: "https://www.fca.org.uk/firms/innovation/ai",
      actions: "1. Document AI model governance framework\n2. Ensure Board receives regular AI risk reporting\n3. Prepare explainability evidence for top credit decisioning models",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-022", reference: "HZ-022", title: "Consumer Duty Year 2 — Outcomes Monitoring and FCA Intervention",
      category: "FCA_REGULATORY", source: "FCA", urgency: "LOW", status: "MONITORING",
      summary: "Year 2 (2025/26) shifts Consumer Duty from implementation to outcomes demonstration. The FCA expects firms to show measurable improvements in consumer outcomes, not just policies and procedures.",
      whyItMatters: "Updraft needs evidence that its Consumer Duty framework is producing real outcomes: fewer complaints, better vulnerable customer treatment, demonstrable fair value, and proactive product review.",
      deadline: new Date("2026-07-31"), sourceUrl: "https://www.fca.org.uk/firms/consumer-duty",
      actions: "1. Update Consumer Duty annual Board report with outcome evidence\n2. Conduct Consumer Duty fair value assessment for 2025/26\n3. Review complaints data for Consumer Duty insights",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-cath",
    },
    {
      id: "hz-023", reference: "HZ-023", title: "CMA Digital Markets Unit — SMS Designation and Merger Control",
      category: "COMPETITIVE", source: "CMA", urgency: "LOW", status: "MONITORING",
      summary: "The CMA's Digital Markets Unit is now operational under the DMCC Act. It can designate firms as Strategic Market Status (SMS) and impose bespoke conduct requirements. Merger scrutiny in digital financial services is increasing.",
      whyItMatters: "If Updraft pursues M&A or partnerships with large technology platforms, early CMA engagement may be required. DMU market interventions could affect digital distribution channels Updraft relies on for customer acquisition.",
      deadline: null, sourceUrl: "https://www.gov.uk/cma-cases/digital-markets-unit",
      actions: "1. Brief legal team on DMU powers and SMS designation criteria\n2. Factor CMA review risk into M&A and partnership due diligence",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-024", reference: "HZ-024", title: "Bank of England Interest Rate Environment — Credit Risk Implications",
      category: "ECONOMIC", source: "Bank of England", urgency: "LOW", status: "MONITORING",
      summary: "The Bank of England began cutting rates in H2 2024 but the pace has been slower than market expectations. Base rate remains elevated relative to pre-2022 levels. Consumer debt serviceability and arrears trends remain under stress.",
      whyItMatters: "Sustained higher interest rates continue to pressure Updraft's customers' disposable income, increasing credit risk, arrears, and the volume of customers seeking debt management support. Credit models require regular recalibration.",
      deadline: null, sourceUrl: "https://www.bankofengland.co.uk/monetary-policy",
      actions: "1. Credit Risk: quarterly review of model calibration against current rate environment\n2. Stress test portfolio against 'higher for longer' scenario\n3. Monitor arrears trends and early warning indicators",
      notes: null, monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-025", reference: "HZ-025", title: "FCA Appointed Representatives Regime — Ongoing Supervision",
      category: "FCA_REGULATORY", source: "FCA", urgency: "LOW", status: "MONITORING",
      summary: "Following the FCA's AR regime reform (PS22/11) in December 2022, the FCA continues active oversight of principals and AR networks. Further guidance on reasonable steps and oversight expectations is expected in 2026.",
      whyItMatters: "If Updraft acts as a principal for any appointed representatives or uses AR distribution channels, the firm must demonstrate robust oversight. FCA enforcement for inadequate AR oversight has increased significantly since 2023.",
      deadline: null, sourceUrl: "https://www.fca.org.uk/firms/appointed-representatives",
      actions: "1. Review AR oversight framework if any AR relationships exist\n2. Confirm no unintended AR relationships in distribution arrangements",
      notes: "Updraft does not currently have ARs — monitor in case distribution strategy changes.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-026", reference: "HZ-026", title: "ICO Article 22 Automated Decision-Making Enforcement",
      category: "DATA_TECHNOLOGY", source: "ICO", urgency: "HIGH", status: "ACTION_REQUIRED",
      summary: "The ICO issued a public reprimand to a consumer lender in Q3 2024 for automated credit decisioning that lacked meaningful human review under UK GDPR Article 22. The ICO has signalled further enforcement action across the consumer credit sector in 2026.",
      whyItMatters: "Updraft's underwriting and affordability models involve automated decision-making that significantly affects customers. Without documented human review processes and clear customer rights to explanation and review, the firm is exposed to ICO enforcement, potential fines, and reputational damage.",
      deadline: new Date("2026-06-30"), sourceUrl: "https://ico.org.uk/action-weve-taken/enforcement/",
      actions: "1. Map all automated decisions within credit journey against UK GDPR Art 22 criteria\n2. Document human oversight steps and ensure they are meaningful (not rubber-stamp)\n3. Update privacy notices to describe automated decision logic and customer rights\n4. Implement and test customer objection / review request process\n5. Brief board on ICO enforcement risk and remediation timeline",
      notes: "Priority review needed ahead of H1 2026. Legal to advise on Article 22 applicability to hybrid models.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-027", reference: "HZ-027", title: "FCA Collections & Forbearance Supervisory Focus / Debt Respite Scheme",
      category: "FCA_REGULATORY", source: "FCA", urgency: "HIGH", status: "MONITORING",
      summary: "The FCA has intensified supervisory focus on collections practices and forbearance across consumer credit firms in 2025–26. The Breathing Space / Debt Respite Scheme (DRS) continues to see growing enrolments and firms face FCA scrutiny over how they handle customers within the DRS period.",
      whyItMatters: "Updraft must ensure collections strategies treat customers fairly, identify financial difficulty early, and pause debt collection activity correctly for DRS customers. Non-compliance risks FCA enforcement, remediation costs, and harm to vulnerable customers.",
      deadline: new Date("2026-09-30"), sourceUrl: "https://www.fca.org.uk/consumers/debt-management",
      actions: "1. Review collections playbook against CONC 7 and Treating Customers Fairly principles\n2. Audit DRS handling process — confirm debt collection pause is automated and reliable\n3. Assess early arrears intervention strategy for alignment with FCA forbearance expectations\n4. Train collections team on vulnerability indicators and appropriate forbearance options\n5. Test end-to-end DRS notification workflow",
      notes: "FCA Dear CEO letter expected H1 2026 on collections standards. Watch for sector-wide requirements.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
    {
      id: "hz-028", reference: "HZ-028", title: "CONC 5.2A Affordability Guidance Refresh — FCA Supervisory Expectations",
      category: "FCA_REGULATORY", source: "FCA / FOS", urgency: "MEDIUM", status: "MONITORING",
      summary: "The FCA's updated CONC 5.2A affordability assessment guidance and Financial Ombudsman Service (FOS) decisions continue to raise the bar for evidenced affordability checks in consumer credit. FOS has upheld increasing numbers of unaffordable lending complaints since 2023.",
      whyItMatters: "Updraft's lending decisions must be based on proportionate, evidenced affordability assessments. Rising FOS upheld rates indicate that current industry-standard approaches may not meet the expected standard, exposing Updraft to redress liability and FCA scrutiny.",
      deadline: null, sourceUrl: "https://www.fca.org.uk/firms/consumer-credit/affordability",
      actions: "1. Benchmark Updraft's affordability assessment methodology against FOS decisional guidance\n2. Review data sources used in income/expenditure verification — any gaps?\n3. Assess remediation exposure if current book were subject to FOS-standard review\n4. Update affordability policy documentation and board approval\n5. Monitor FOS uphold rate quarterly as leading indicator",
      notes: "FOS upheld rate a key canary metric. Consider proactive case review if uphold rate rises above sector average.", monthAdded: "February 2026", inFocus: false, addedById: "user-rob",
    },
  ];

  let horizonSeeded = 0;
  for (const item of HORIZON_ITEMS) {
    await prisma.horizonItem.upsert({
      where: { id: item.id },
      update: {
        title: item.title, category: item.category, source: item.source, urgency: item.urgency,
        status: item.status, summary: item.summary, whyItMatters: item.whyItMatters,
        deadline: item.deadline, sourceUrl: item.sourceUrl, actions: item.actions,
        notes: item.notes, monthAdded: item.monthAdded, inFocus: item.inFocus,
      },
      create: item,
    });
    horizonSeeded++;
  }
  console.log(`  ✓ ${horizonSeeded} horizon scanning items seeded (HZ-001–HZ-008 from Feb 2026 scan documents; HZ-004 In Focus; HZ-026/027 HIGH urgency advisory items)`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
