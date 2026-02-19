import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

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

  // Clean up old regulation/policy data before re-seeding
  await prisma.policyAuditLog.deleteMany({ where: { policyId: "pol-finprom" } });
  await prisma.policyObligation.deleteMany({ where: { policyId: "pol-finprom" } });
  await prisma.policyControlLink.deleteMany({ where: { policyId: "pol-finprom" } });
  await prisma.policyRegulatoryLink.deleteMany({ where: { policyId: "pol-finprom" } });
  await prisma.policy.deleteMany({ where: { id: "pol-finprom" } });
  // Delete old regulations (both old FCA-xxx scheme and new REG-xxx if re-running)
  await prisma.regulation.deleteMany({});
  console.log("  ✓ Cleaned old policy review data");

  // Seed 19 real regulations (REG-001 to REG-019)
  const SEED_REGULATIONS: {
    id: string; reference: string; name: string; shortName: string | null;
    body: string; type: "HANDBOOK_RULE" | "PRINCIPLE" | "LEGISLATION" | "STATUTORY_INSTRUMENT" | "GUIDANCE" | "INDUSTRY_CODE";
    provisions: string | null; url: string | null; description: string | null;
  }[] = [
    { id: "reg-001", reference: "REG-001", name: "FCA Consumer Credit Sourcebook — Chapter 3", shortName: "CONC 3", body: "FCA", type: "HANDBOOK_RULE", provisions: "CONC 3.3, 3.5, 3.6, 3.7, 3.9", url: "https://www.handbook.fca.org.uk/handbook/CONC/3", description: "Detailed rules on financial promotions for consumer credit: content, form, prominence, and representative examples." },
    { id: "reg-002", reference: "REG-002", name: "Consumer Duty — Principle 12", shortName: "PRIN 12", body: "FCA", type: "PRINCIPLE", provisions: "PRIN 2A.1–2A.5, FG22/5", url: "https://www.fca.org.uk/firms/consumer-duty", description: "Overarching duty to act to deliver good outcomes for retail customers, including consumer understanding." },
    { id: "reg-003", reference: "REG-003", name: "Financial Services and Markets Act 2000 — Section 21", shortName: "FSMA s21", body: "Parliament", type: "LEGISLATION", provisions: "s21(1), s21(2), s25", url: "https://www.legislation.gov.uk/ukpga/2000/8/section/21", description: "The financial promotion restriction: only authorised persons may communicate financial promotions." },
    { id: "reg-004", reference: "REG-004", name: "Financial Promotion Order 2005", shortName: "FPO 2005", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: "Articles 15–73", url: "https://www.legislation.gov.uk/uksi/2005/1529", description: "Exemptions from the s21 restriction: categories of exempt communications." },
    { id: "reg-005", reference: "REG-005", name: "Consumer Credit Act 1974 — Advertising", shortName: "CCA 1974 (Ads)", body: "Parliament", type: "LEGISLATION", provisions: "ss43–47", url: "https://www.legislation.gov.uk/ukpga/1974/39/part/IV", description: "Offences and requirements relating to credit advertisements." },
    { id: "reg-006", reference: "REG-006", name: "FCA Principles for Businesses — Principle 7", shortName: "PRIN 7", body: "FCA", type: "PRINCIPLE", provisions: "Principle 7", url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must communicate information in a way which is clear, fair and not misleading." },
    { id: "reg-007", reference: "REG-007", name: "FCA Senior Management Arrangements (SYSC)", shortName: "SYSC", body: "FCA", type: "HANDBOOK_RULE", provisions: "SYSC 3.1, 3.2, 4.1", url: "https://www.handbook.fca.org.uk/handbook/SYSC/3", description: "Systems and controls requirements including financial promotions oversight and record-keeping." },
    { id: "reg-008", reference: "REG-008", name: "Consumer Credit Act 1974 — Agreements", shortName: "CCA 1974", body: "Parliament", type: "LEGISLATION", provisions: "ss60–65, 127", url: "https://www.legislation.gov.uk/ukpga/1974/39", description: "Pre-contractual information and agreement content requirements linked to advertising promises." },
    { id: "reg-009", reference: "REG-009", name: "Financial Services and Markets Act 2000 — General", shortName: "FSMA 2000", body: "Parliament", type: "LEGISLATION", provisions: "ss137R, 138D", url: "https://www.legislation.gov.uk/ukpga/2000/8", description: "FCA rule-making powers for product intervention and financial promotion rules." },
    { id: "reg-010", reference: "REG-010", name: "UK General Data Protection Regulation", shortName: "UK GDPR", body: "ICO", type: "LEGISLATION", provisions: "Articles 5, 6, 13, 14, 21", url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/", description: "Lawful basis, transparency, and data subject rights for marketing data processing." },
    { id: "reg-011", reference: "REG-011", name: "Privacy and Electronic Communications Regulations 2003", shortName: "PECR", body: "ICO", type: "STATUTORY_INSTRUMENT", provisions: "Regulations 21, 22, 23", url: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/", description: "Consent and opt-out rules for electronic direct marketing (email, SMS, calls)." },
    { id: "reg-012", reference: "REG-012", name: "CAP Code (Non-Broadcast)", shortName: "CAP Code", body: "ASA", type: "INDUSTRY_CODE", provisions: "Sections 1, 3, 14", url: "https://www.asa.org.uk/codes-and-rulings/advertising-codes/non-broadcast-code.html", description: "Advertising standards for non-broadcast media including financial services rules." },
    { id: "reg-013", reference: "REG-013", name: "BCAP Code (Broadcast)", shortName: "BCAP Code", body: "ASA", type: "INDUSTRY_CODE", provisions: "Sections 1, 3, 14", url: "https://www.asa.org.uk/codes-and-rulings/advertising-codes/broadcast-code.html", description: "Broadcast advertising code — TV and radio financial promotions." },
    { id: "reg-014", reference: "REG-014", name: "Ofcom Broadcasting Code — Commercial References", shortName: "Ofcom Code", body: "Ofcom", type: "GUIDANCE", provisions: "Section Nine", url: "https://www.ofcom.org.uk/tv-radio-and-on-demand/broadcast-codes/broadcast-code", description: "Rules on commercial references in television and radio programmes." },
    { id: "reg-015", reference: "REG-015", name: "FCA Senior Managers & Certification Regime", shortName: "SM&CR", body: "FCA", type: "HANDBOOK_RULE", provisions: "SYSC 24, 25, 26", url: "https://www.fca.org.uk/firms/senior-managers-certification-regime", description: "Accountability for SM&CR-designated financial promotions approver (SMF16/SMF24)." },
    { id: "reg-016", reference: "REG-016", name: "Equality Act 2010 — Services", shortName: "EA 2010", body: "Parliament", type: "LEGISLATION", provisions: "Part 3, ss29–31", url: "https://www.legislation.gov.uk/ukpga/2010/15", description: "Prohibition of discrimination in the provision of services, including advertising." },
    { id: "reg-017", reference: "REG-017", name: "FCA Conduct of Business Sourcebook (COBS 4)", shortName: "COBS 4", body: "FCA", type: "HANDBOOK_RULE", provisions: "COBS 4.1–4.12", url: "https://www.handbook.fca.org.uk/handbook/COBS/4", description: "Rules on communicating with clients: fair, clear and not misleading standard." },
    { id: "reg-018", reference: "REG-018", name: "Consumer Rights Act 2015", shortName: "CRA 2015", body: "Parliament", type: "LEGISLATION", provisions: "Part 1, ss2–32; Part 3, ss61–76", url: "https://www.legislation.gov.uk/ukpga/2015/15", description: "Unfair terms, consumer contracts, and unfair trading provisions applicable to promotions." },
    { id: "reg-019", reference: "REG-019", name: "FCA CONC 3 — Exclusions and Exemptions", shortName: "CONC 3 Exclusions", body: "FCA", type: "HANDBOOK_RULE", provisions: "CONC 3.1, 3.2", url: "https://www.handbook.fca.org.uk/handbook/CONC/3/1", description: "Activities and communications excluded from CONC 3 financial promotion rules." },
  ];

  for (const reg of SEED_REGULATIONS) {
    await prisma.regulation.upsert({
      where: { id: reg.id },
      update: { name: reg.name, shortName: reg.shortName, body: reg.body, type: reg.type, provisions: reg.provisions, url: reg.url, description: reg.description },
      create: reg,
    });
  }
  console.log(`  ✓ ${SEED_REGULATIONS.length} regulations (REG-001 to REG-019)`);

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

  // ── Seed Policy: Financial Promotions (real data from XLSX) ────────────
  const policyId = "pol-finprom";
  await prisma.policy.create({
    data: {
      id: policyId,
      reference: "POL-FINPROM",
      name: "Financial Promotions Policy",
      description: "Governs the creation, review, approval, and management of all financial promotional material to ensure regulatory compliance.",
      status: "OVERDUE",
      version: "v4.1",
      ownerId: "user-cath",
      approvedBy: "CCROC",
      classification: "Internal Only",
      reviewFrequencyDays: 365,
      lastReviewedDate: new Date("2024-02-05"),
      nextReviewDate: new Date("2025-02-05"),
      effectiveDate: new Date("2023-01-01"),
      scope: "All staff involved in creating, reviewing, or approving marketing material",
      applicability: "Marketing, Compliance, Senior Management",
      exceptions: "Image-only advertising (name/logo/contact only) — partial CONC 3 exemption per section 11",
      relatedPolicies: ["Data Protection Policy", "Conduct Risk Policy", "AML/KYC/PEPs Policy"],
      storageUrl: null,
    },
  });
  console.log("  ✓ 1 policy (POL-FINPROM, v4.1, OVERDUE)");

  // Link all 19 regulations to policy
  const regIds = SEED_REGULATIONS.map((r) => r.id);
  for (const regId of regIds) {
    await prisma.policyRegulatoryLink.create({
      data: { policyId, regulationId: regId, linkedBy: "user-rob" },
    });
  }
  console.log(`  ✓ ${regIds.length} policy-regulation links`);

  // Link all 18 FP controls to policy
  for (const ctrlId of fpControlIds) {
    await prisma.policyControlLink.create({
      data: { policyId, controlId: ctrlId, linkedBy: "user-rob" },
    });
  }
  console.log(`  ✓ ${fpControlIds.length} policy-control links`);

  // Seed obligations (updated refs to use REG-xxx and FP-Cxxx)
  const fpRefs = FP_CONTROLS.map((fp) => fp.controlRef);
  const SEED_OBLIGATIONS: {
    id: string; reference: string; category: string; description: string;
    regulationRefs: string[]; controlRefs: string[];
  }[] = [
    { id: "obl-01", reference: "POL-FINPROM-OBL-01", category: "Regulatory Compliance", description: "All financial promotions must comply with FCA CONC Chapter 3 requirements for consumer credit promotions.", regulationRefs: ["REG-001"], controlRefs: ["FP-C001", "FP-C003"] },
    { id: "obl-02", reference: "POL-FINPROM-OBL-02", category: "Regulatory Compliance", description: "Communications must be fair, clear and not misleading per FCA Principle 7.", regulationRefs: ["REG-006", "REG-017"], controlRefs: ["FP-C001", "FP-C005"] },
    { id: "obl-03", reference: "POL-FINPROM-OBL-03", category: "Regulatory Compliance", description: "Financial promotions must pass through the s21 gateway or qualify for an FPO exemption.", regulationRefs: ["REG-003", "REG-004"], controlRefs: ["FP-C001"] },
    { id: "obl-04", reference: "POL-FINPROM-OBL-04", category: "Promotions Approval", description: "All promotions must receive documented sign-off from the appointed compliance approver before publication.", regulationRefs: ["REG-001", "REG-007"], controlRefs: ["FP-C001", "FP-C018"] },
    { id: "obl-05", reference: "POL-FINPROM-OBL-05", category: "Promotions Approval", description: "Approval records must include the promotion content, target audience, channel, approver name, and date.", regulationRefs: ["REG-007"], controlRefs: ["FP-C008"] },
    { id: "obl-06", reference: "POL-FINPROM-OBL-06", category: "Promotions Approval", description: "Material changes to approved promotions require re-approval.", regulationRefs: ["REG-001"], controlRefs: ["FP-C018"] },
    { id: "obl-07", reference: "POL-FINPROM-OBL-07", category: "Content Standards", description: "Representative examples must be shown where required, using the median APR for the product.", regulationRefs: ["REG-001", "REG-005"], controlRefs: ["FP-C002"] },
    { id: "obl-08", reference: "POL-FINPROM-OBL-08", category: "Content Standards", description: "Risk warnings must be included and given equal prominence to any benefits claimed.", regulationRefs: ["REG-001", "REG-006"], controlRefs: ["FP-C003"] },
    { id: "obl-09", reference: "POL-FINPROM-OBL-09", category: "Content Standards", description: "Advertising must not target vulnerable consumers inappropriately or use misleading urgency.", regulationRefs: ["REG-002", "REG-018"], controlRefs: ["FP-C004"] },
    { id: "obl-10", reference: "POL-FINPROM-OBL-10", category: "Content Standards", description: "All promotions must be accessible and not discriminate on protected characteristics.", regulationRefs: ["REG-016", "REG-002"], controlRefs: ["FP-C012"] },
    { id: "obl-11", reference: "POL-FINPROM-OBL-11", category: "Record Keeping", description: "Retain copies of all financial promotions and approval records for a minimum of 3 years.", regulationRefs: ["REG-007", "REG-001"], controlRefs: ["FP-C008"] },
    { id: "obl-12", reference: "POL-FINPROM-OBL-12", category: "Record Keeping", description: "Maintain a complete register of all active promotions with review dates and channel information.", regulationRefs: ["REG-007"], controlRefs: ["FP-C008"] },
    { id: "obl-13", reference: "POL-FINPROM-OBL-13", category: "Monitoring & Oversight", description: "Conduct monthly monitoring of live promotions for accuracy and regulatory compliance.", regulationRefs: ["REG-007", "REG-002"], controlRefs: ["FP-C005", "FP-C016", "FP-C017"] },
    { id: "obl-14", reference: "POL-FINPROM-OBL-14", category: "Monitoring & Oversight", description: "Third-party and affiliate promotions must be subject to the same approval and monitoring standards.", regulationRefs: ["REG-001"], controlRefs: ["FP-C006"] },
    { id: "obl-15", reference: "POL-FINPROM-OBL-15", category: "Monitoring & Oversight", description: "Implement a withdrawal procedure for promotions that become misleading or non-compliant.", regulationRefs: ["REG-001", "REG-018"], controlRefs: ["FP-C007"] },
    { id: "obl-16", reference: "POL-FINPROM-OBL-16", category: "Data Protection", description: "Marketing communications must comply with PECR opt-in/opt-out requirements.", regulationRefs: ["REG-011", "REG-010"], controlRefs: ["FP-C009"] },
    { id: "obl-17", reference: "POL-FINPROM-OBL-17", category: "Data Protection", description: "Personal data used for targeting must have a lawful basis under UK GDPR.", regulationRefs: ["REG-010"], controlRefs: ["FP-C010"] },
    { id: "obl-18", reference: "POL-FINPROM-OBL-18", category: "Consumer Duty", description: "Promotions must support good consumer outcomes and avoid foreseeable harm.", regulationRefs: ["REG-002"], controlRefs: ["FP-C011", "FP-C004"] },
    { id: "obl-19", reference: "POL-FINPROM-OBL-19", category: "Consumer Duty", description: "Regularly assess whether promotions meet the Consumer Duty cross-cutting rules.", regulationRefs: ["REG-002", "REG-006"], controlRefs: ["FP-C011"] },
    { id: "obl-20", reference: "POL-FINPROM-OBL-20", category: "Reporting", description: "Report promotion compliance metrics to the Board/ExCo quarterly.", regulationRefs: ["REG-007"], controlRefs: ["FP-C014"] },
    { id: "obl-21", reference: "POL-FINPROM-OBL-21", category: "Reporting", description: "Escalate material breaches or near-misses to the CCRO and compliance function immediately.", regulationRefs: ["REG-007", "REG-001"], controlRefs: ["FP-C007"] },
    { id: "obl-22", reference: "POL-FINPROM-OBL-22", category: "Reporting", description: "Include promotion-related MI in the monthly CCRO dashboard.", regulationRefs: ["REG-007", "REG-002"], controlRefs: ["FP-C014"] },
  ];

  for (const obl of SEED_OBLIGATIONS) {
    await prisma.policyObligation.upsert({
      where: { id: obl.id },
      update: { category: obl.category, description: obl.description, regulationRefs: obl.regulationRefs, controlRefs: obl.controlRefs },
      create: { ...obl, policyId },
    });
  }
  console.log(`  ✓ ${SEED_OBLIGATIONS.length} policy obligations (updated refs)`);

  // Policy audit trail (v4.1 history)
  const POLICY_AUDIT: {
    id: string; policyId: string; userId: string; action: string;
    fieldChanged: string | null; oldValue: string | null; newValue: string | null;
    details: string | null; changedAt: Date;
  }[] = [
    { id: "pau-01", policyId, userId: "user-rob", action: "CREATED_POLICY", fieldChanged: null, oldValue: null, newValue: null, details: "Created policy POL-FINPROM: Financial Promotions Policy v1.0", changedAt: new Date("2023-01-01") },
    { id: "pau-02", policyId, userId: "user-cath", action: "UPDATED_FIELD", fieldChanged: "version", oldValue: "v1.0", newValue: "v2.0", details: "Major update — expanded scope to all channels, added social media and affiliate requirements", changedAt: new Date("2023-06-15") },
    { id: "pau-03", policyId, userId: "user-rob", action: "UPDATED_FIELD", fieldChanged: "version", oldValue: "v2.0", newValue: "v3.0", details: "Consumer Duty alignment — added PRIN 12 obligations, vulnerable customer screening, and outcomes assessment controls", changedAt: new Date("2024-01-10") },
    { id: "pau-04", policyId, userId: "user-cath", action: "UPDATED_FIELD", fieldChanged: "version", oldValue: "v3.0", newValue: "v4.0", details: "Annual review completed. Updated regulatory mapping to REG-001–REG-019 scheme. Added 18 FP controls.", changedAt: new Date("2024-02-05") },
    { id: "pau-05", policyId, userId: "user-cath", action: "UPDATED_FIELD", fieldChanged: "version", oldValue: "v4.0", newValue: "v4.1", details: "Minor updates — clarified CONC 3 exclusions (REG-019), added comparison site control (FP-C016), updated CCROC approval.", changedAt: new Date("2024-12-01") },
  ];

  for (const a of POLICY_AUDIT) {
    await prisma.policyAuditLog.upsert({
      where: { id: a.id },
      update: { action: a.action, fieldChanged: a.fieldChanged, oldValue: a.oldValue, newValue: a.newValue, details: a.details },
      create: a,
    });
  }
  console.log(`  ✓ ${POLICY_AUDIT.length} policy audit entries (v4.1 history)`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
