import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Users ──────────────────────────────────────────────────────────────────
const SEED_USERS: {
  id: string; email: string; name: string; role: "CCRO_TEAM" | "OWNER" | "VIEWER";
  assignedMeasures: string[]; isActive: boolean;
}[] = [
  { id: "user-rob", email: "rob@updraft.com", name: "Rob", role: "CCRO_TEAM", assignedMeasures: [], isActive: true },
  { id: "user-cath", email: "cath@updraft.com", name: "Cath", role: "CCRO_TEAM", assignedMeasures: ["1.9","4.1","5.1","5.2","5.5","5.8"], isActive: true },
  { id: "user-ash", email: "ash@updraft.com", name: "Ash", role: "OWNER", assignedMeasures: ["1.1","1.3","1.4","3.1","3.6","3.7"], isActive: true },
  { id: "user-chris", email: "chris@updraft.com", name: "Chris", role: "OWNER", assignedMeasures: ["1.5","1.8","3.3","3.4","3.5","4.2","4.3","4.4","4.5","4.6","4.7","4.8","4.9","4.10"], isActive: true },
  { id: "user-micha", email: "micha@updraft.com", name: "Micha", role: "OWNER", assignedMeasures: ["1.2","1.6","1.7","2.1","2.2","2.3","2.4","2.5","2.6","2.7"], isActive: true },
  { id: "user-ceo", email: "Aseem@updraft.com", name: "Aseem", role: "OWNER", assignedMeasures: [], isActive: true },
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
  // Seed Regulations
  const SEED_REGULATIONS: {
    id: string; reference: string; name: string; shortName: string | null;
    body: string; type: "HANDBOOK_RULE" | "PRINCIPLE" | "LEGISLATION" | "STATUTORY_INSTRUMENT" | "GUIDANCE" | "INDUSTRY_CODE";
    provisions: string | null; url: string | null; description: string | null;
  }[] = [
    { id: "reg-conc", reference: "FCA-CONC", name: "Consumer Credit Sourcebook", shortName: "CONC", body: "FCA", type: "HANDBOOK_RULE", provisions: "Chapter 3 — Financial Promotions", url: "https://www.handbook.fca.org.uk/handbook/CONC/3", description: "Rules and guidance on financial promotions for consumer credit." },
    { id: "reg-prin", reference: "FCA-PRIN", name: "Principles for Businesses", shortName: "PRIN", body: "FCA", type: "PRINCIPLE", provisions: "Principle 7 — Communications", url: "https://www.handbook.fca.org.uk/handbook/PRIN/2/1", description: "A firm must pay due regard to the information needs of its clients, and communicate information to them in a way which is clear, fair and not misleading." },
    { id: "reg-cobs", reference: "FCA-COBS", name: "Conduct of Business Sourcebook", shortName: "COBS", body: "FCA", type: "HANDBOOK_RULE", provisions: "Chapter 4 — Communicating with Clients", url: "https://www.handbook.fca.org.uk/handbook/COBS/4", description: "Rules on fair, clear and not misleading communications." },
    { id: "reg-sysc", reference: "FCA-SYSC", name: "Senior Management Arrangements, Systems and Controls", shortName: "SYSC", body: "FCA", type: "HANDBOOK_RULE", provisions: "Chapter 3 — Systems and Controls", url: "https://www.handbook.fca.org.uk/handbook/SYSC/3", description: "Systems and controls requirements for firms." },
    { id: "reg-cd", reference: "FCA-CD", name: "Consumer Duty", shortName: "Consumer Duty", body: "FCA", type: "PRINCIPLE", provisions: "Principle 12 — Consumer Duty", url: "https://www.fca.org.uk/firms/consumer-duty", description: "The Consumer Duty sets higher and clearer standards of consumer protection." },
    { id: "reg-cca", reference: "UK-CCA", name: "Consumer Credit Act 1974", shortName: "CCA 1974", body: "Parliament", type: "LEGISLATION", provisions: "Part III — Licensing", url: "https://www.legislation.gov.uk/ukpga/1974/39", description: "Primary legislation governing consumer credit agreements." },
    { id: "reg-cpr", reference: "UK-CPR", name: "Consumer Protection from Unfair Trading Regulations 2008", shortName: "CPRs", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: null, url: "https://www.legislation.gov.uk/uksi/2008/1277", description: "Prohibits unfair commercial practices." },
    { id: "reg-gdpr", reference: "ICO-GDPR", name: "UK General Data Protection Regulation", shortName: "UK GDPR", body: "ICO", type: "LEGISLATION", provisions: "Articles 5, 6, 13, 14", url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/", description: "Data protection requirements for processing personal data." },
    { id: "reg-pecr", reference: "ICO-PECR", name: "Privacy and Electronic Communications Regulations", shortName: "PECR", body: "ICO", type: "STATUTORY_INSTRUMENT", provisions: "Regulation 22 — Direct Marketing", url: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/", description: "Rules on electronic marketing, cookies and similar technologies." },
    { id: "reg-cap", reference: "ASA-CAP", name: "Committee of Advertising Practice Code", shortName: "CAP Code", body: "ASA", type: "INDUSTRY_CODE", provisions: "Section 1 — Financial Services", url: "https://www.asa.org.uk/codes-and-rulings/advertising-codes/non-broadcast-code.html", description: "Non-broadcast advertising code including financial services rules." },
    { id: "reg-bcap", reference: "ASA-BCAP", name: "Broadcast Committee of Advertising Practice Code", shortName: "BCAP Code", body: "ASA", type: "INDUSTRY_CODE", provisions: null, url: "https://www.asa.org.uk/codes-and-rulings/advertising-codes/broadcast-code.html", description: "Broadcast advertising code." },
    { id: "reg-fsma", reference: "UK-FSMA", name: "Financial Services and Markets Act 2000", shortName: "FSMA", body: "Parliament", type: "LEGISLATION", provisions: "Section 21 — Financial Promotion", url: "https://www.legislation.gov.uk/ukpga/2000/8/section/21", description: "Restrictions on financial promotion — the s21 gateway." },
    { id: "reg-smcr", reference: "FCA-SMCR", name: "Senior Managers and Certification Regime", shortName: "SM&CR", body: "FCA", type: "HANDBOOK_RULE", provisions: null, url: "https://www.fca.org.uk/firms/senior-managers-certification-regime", description: "Accountability framework for senior individuals at firms." },
    { id: "reg-fpo", reference: "UK-FPO", name: "Financial Promotion Order 2005", shortName: "FPO", body: "Parliament", type: "STATUTORY_INSTRUMENT", provisions: "Articles 15-73 — Exempt Communications", url: "https://www.legislation.gov.uk/uksi/2005/1529", description: "Exemptions from the financial promotion restriction." },
    { id: "reg-mcob", reference: "FCA-MCOB", name: "Mortgages and Home Finance Conduct of Business", shortName: "MCOB", body: "FCA", type: "HANDBOOK_RULE", provisions: "Chapter 3A — Financial Promotions", url: "https://www.handbook.fca.org.uk/handbook/MCOB/3A", description: "Mortgage-specific promotion rules." },
    { id: "reg-icobs", reference: "FCA-ICOBS", name: "Insurance: Conduct of Business Sourcebook", shortName: "ICOBS", body: "FCA", type: "HANDBOOK_RULE", provisions: "Chapter 2 — General Matters", url: "https://www.handbook.fca.org.uk/handbook/ICOBS/2", description: "Insurance-specific conduct rules." },
    { id: "reg-ofcom-bc", reference: "OFCOM-BC", name: "Ofcom Broadcasting Code", shortName: null, body: "Ofcom", type: "GUIDANCE", provisions: "Section Nine — Commercial References", url: "https://www.ofcom.org.uk/tv-radio-and-on-demand/broadcast-codes/broadcast-code", description: "Broadcasting standards for commercial content." },
    { id: "reg-eq-act", reference: "UK-EQA", name: "Equality Act 2010", shortName: "EqA 2010", body: "Parliament", type: "LEGISLATION", provisions: "Part 3 — Services and Public Functions", url: "https://www.legislation.gov.uk/ukpga/2010/15", description: "Anti-discrimination legislation." },
    { id: "reg-pra-ss", reference: "PRA-SS", name: "PRA Supervisory Statement on Operational Resilience", shortName: null, body: "PRA", type: "GUIDANCE", provisions: "SS1/21", url: "https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-ss", description: "PRA expectations on operational resilience." },
  ];

  for (const reg of SEED_REGULATIONS) {
    await prisma.regulation.upsert({
      where: { id: reg.id },
      update: { name: reg.name, shortName: reg.shortName, body: reg.body, type: reg.type, provisions: reg.provisions, url: reg.url, description: reg.description },
      create: reg,
    });
  }
  console.log(`  ✓ ${SEED_REGULATIONS.length} regulations`);

  // Seed Policy: Financial Promotions
  const policyId = "pol-finprom";
  await prisma.policy.upsert({
    where: { id: policyId },
    update: {
      name: "Financial Promotions Policy",
      description: "This policy sets out the requirements, governance framework, and operational controls for the approval, monitoring, and withdrawal of financial promotions across all channels and product lines. It ensures compliance with FCA rules, Consumer Duty obligations, and internal risk appetite.",
      status: "CURRENT",
      version: "3.2",
      ownerId: "user-rob",
      approvedBy: "Aseem (CEO)",
      classification: "Internal Only",
      reviewFrequencyDays: 365,
      lastReviewedDate: new Date("2025-11-15"),
      nextReviewDate: new Date("2026-11-15"),
      effectiveDate: new Date("2024-01-01"),
      scope: "All financial promotions issued or approved by the firm, including website content, marketing emails, social media, comparison site listings, and third-party affiliate materials.",
      applicability: "All staff involved in creating, reviewing, approving, or distributing financial promotions. Third-party agencies and affiliates acting on behalf of the firm.",
      exceptions: "Internal-only communications not accessible to consumers. Purely factual regulatory disclosures (e.g. FSCS notices).",
      relatedPolicies: ["Data Protection Policy", "Consumer Duty Framework", "Anti-Fraud Policy", "Complaints Handling Policy"],
      storageUrl: null,
    },
    create: {
      id: policyId,
      reference: "POL-001",
      name: "Financial Promotions Policy",
      description: "This policy sets out the requirements, governance framework, and operational controls for the approval, monitoring, and withdrawal of financial promotions across all channels and product lines. It ensures compliance with FCA rules, Consumer Duty obligations, and internal risk appetite.",
      status: "CURRENT",
      version: "3.2",
      ownerId: "user-rob",
      approvedBy: "Aseem (CEO)",
      classification: "Internal Only",
      reviewFrequencyDays: 365,
      lastReviewedDate: new Date("2025-11-15"),
      nextReviewDate: new Date("2026-11-15"),
      effectiveDate: new Date("2024-01-01"),
      scope: "All financial promotions issued or approved by the firm, including website content, marketing emails, social media, comparison site listings, and third-party affiliate materials.",
      applicability: "All staff involved in creating, reviewing, approving, or distributing financial promotions. Third-party agencies and affiliates acting on behalf of the firm.",
      exceptions: "Internal-only communications not accessible to consumers. Purely factual regulatory disclosures (e.g. FSCS notices).",
      relatedPolicies: ["Data Protection Policy", "Consumer Duty Framework", "Anti-Fraud Policy", "Complaints Handling Policy"],
      storageUrl: null,
    },
  });
  console.log("  ✓ 1 policy (Financial Promotions)");

  // Link regulations to policy
  const regLinks = [
    "reg-conc", "reg-prin", "reg-cobs", "reg-sysc", "reg-cd", "reg-cca",
    "reg-cpr", "reg-gdpr", "reg-pecr", "reg-cap", "reg-fsma", "reg-fpo",
  ];
  for (const regId of regLinks) {
    await prisma.policyRegulatoryLink.upsert({
      where: { policyId_regulationId: { policyId, regulationId: regId } },
      update: {},
      create: { policyId, regulationId: regId, linkedBy: "user-rob" },
    });
  }
  console.log(`  ✓ ${regLinks.length} policy-regulation links`);

  // Link controls to policy (if they exist)
  const controlsForPolicy = await prisma.control.findMany({ take: 8, orderBy: { controlRef: "asc" } });
  let ctrlLinked = 0;
  for (const ctrl of controlsForPolicy) {
    await prisma.policyControlLink.upsert({
      where: { policyId_controlId: { policyId, controlId: ctrl.id } },
      update: {},
      create: { policyId, controlId: ctrl.id, linkedBy: "user-rob" },
    });
    ctrlLinked++;
  }
  console.log(`  ✓ ${ctrlLinked} policy-control links`);

  // Seed obligations
  const SEED_OBLIGATIONS: {
    id: string; reference: string; category: string; description: string;
    regulationRefs: string[]; controlRefs: string[];
  }[] = [
    { id: "obl-01", reference: "POL-001-OBL-01", category: "Regulatory Compliance", description: "All financial promotions must comply with FCA CONC Chapter 3 requirements for consumer credit promotions.", regulationRefs: ["FCA-CONC"], controlRefs: controlsForPolicy[0]?.controlRef ? [controlsForPolicy[0].controlRef] : [] },
    { id: "obl-02", reference: "POL-001-OBL-02", category: "Regulatory Compliance", description: "Communications must be fair, clear and not misleading per FCA Principle 7.", regulationRefs: ["FCA-PRIN", "FCA-COBS"], controlRefs: controlsForPolicy[1]?.controlRef ? [controlsForPolicy[1].controlRef] : [] },
    { id: "obl-03", reference: "POL-001-OBL-03", category: "Regulatory Compliance", description: "Financial promotions must pass through the s21 gateway or qualify for an FPO exemption.", regulationRefs: ["UK-FSMA", "UK-FPO"], controlRefs: [] },
    { id: "obl-04", reference: "POL-001-OBL-04", category: "Promotions Approval", description: "All promotions must receive documented sign-off from the appointed compliance approver before publication.", regulationRefs: ["FCA-CONC", "FCA-SYSC"], controlRefs: controlsForPolicy[2]?.controlRef ? [controlsForPolicy[2].controlRef] : [] },
    { id: "obl-05", reference: "POL-001-OBL-05", category: "Promotions Approval", description: "Approval records must include the promotion content, target audience, channel, approver name, and date.", regulationRefs: ["FCA-SYSC"], controlRefs: [] },
    { id: "obl-06", reference: "POL-001-OBL-06", category: "Promotions Approval", description: "Material changes to approved promotions require re-approval.", regulationRefs: ["FCA-CONC"], controlRefs: controlsForPolicy[3]?.controlRef ? [controlsForPolicy[3].controlRef] : [] },
    { id: "obl-07", reference: "POL-001-OBL-07", category: "Content Standards", description: "Representative examples must be shown where required, using the median APR for the product.", regulationRefs: ["FCA-CONC", "UK-CCA"], controlRefs: controlsForPolicy[4]?.controlRef ? [controlsForPolicy[4].controlRef] : [] },
    { id: "obl-08", reference: "POL-001-OBL-08", category: "Content Standards", description: "Risk warnings must be included and given equal prominence to any benefits claimed.", regulationRefs: ["FCA-CONC", "FCA-PRIN"], controlRefs: [] },
    { id: "obl-09", reference: "POL-001-OBL-09", category: "Content Standards", description: "Advertising must not target vulnerable consumers inappropriately or use misleading urgency.", regulationRefs: ["FCA-CD", "UK-CPR"], controlRefs: [] },
    { id: "obl-10", reference: "POL-001-OBL-10", category: "Content Standards", description: "All promotions must be accessible and not discriminate on protected characteristics.", regulationRefs: ["UK-EQA", "FCA-CD"], controlRefs: [] },
    { id: "obl-11", reference: "POL-001-OBL-11", category: "Record Keeping", description: "Retain copies of all financial promotions and approval records for a minimum of 3 years.", regulationRefs: ["FCA-SYSC", "FCA-CONC"], controlRefs: controlsForPolicy[5]?.controlRef ? [controlsForPolicy[5].controlRef] : [] },
    { id: "obl-12", reference: "POL-001-OBL-12", category: "Record Keeping", description: "Maintain a complete register of all active promotions with review dates and channel information.", regulationRefs: ["FCA-SYSC"], controlRefs: [] },
    { id: "obl-13", reference: "POL-001-OBL-13", category: "Monitoring & Oversight", description: "Conduct monthly monitoring of live promotions for accuracy and regulatory compliance.", regulationRefs: ["FCA-SYSC", "FCA-CD"], controlRefs: controlsForPolicy[6]?.controlRef ? [controlsForPolicy[6].controlRef] : [] },
    { id: "obl-14", reference: "POL-001-OBL-14", category: "Monitoring & Oversight", description: "Third-party and affiliate promotions must be subject to the same approval and monitoring standards.", regulationRefs: ["FCA-CONC"], controlRefs: [] },
    { id: "obl-15", reference: "POL-001-OBL-15", category: "Monitoring & Oversight", description: "Implement a withdrawal procedure for promotions that become misleading or non-compliant.", regulationRefs: ["FCA-CONC", "UK-CPR"], controlRefs: [] },
    { id: "obl-16", reference: "POL-001-OBL-16", category: "Data Protection", description: "Marketing communications must comply with PECR opt-in/opt-out requirements.", regulationRefs: ["ICO-PECR", "ICO-GDPR"], controlRefs: [] },
    { id: "obl-17", reference: "POL-001-OBL-17", category: "Data Protection", description: "Personal data used for targeting must have a lawful basis under UK GDPR.", regulationRefs: ["ICO-GDPR"], controlRefs: [] },
    { id: "obl-18", reference: "POL-001-OBL-18", category: "Consumer Duty", description: "Promotions must support good consumer outcomes and avoid foreseeable harm.", regulationRefs: ["FCA-CD"], controlRefs: controlsForPolicy[7]?.controlRef ? [controlsForPolicy[7].controlRef] : [] },
    { id: "obl-19", reference: "POL-001-OBL-19", category: "Consumer Duty", description: "Regularly assess whether promotions meet the Consumer Duty cross-cutting rules.", regulationRefs: ["FCA-CD", "FCA-PRIN"], controlRefs: [] },
    { id: "obl-20", reference: "POL-001-OBL-20", category: "Reporting", description: "Report promotion compliance metrics to the Board/ExCo quarterly.", regulationRefs: ["FCA-SYSC"], controlRefs: [] },
    { id: "obl-21", reference: "POL-001-OBL-21", category: "Reporting", description: "Escalate material breaches or near-misses to the CCRO and compliance function immediately.", regulationRefs: ["FCA-SYSC", "FCA-CONC"], controlRefs: [] },
    { id: "obl-22", reference: "POL-001-OBL-22", category: "Reporting", description: "Include promotion-related MI in the monthly CCRO dashboard.", regulationRefs: ["FCA-SYSC", "FCA-CD"], controlRefs: [] },
  ];

  for (const obl of SEED_OBLIGATIONS) {
    await prisma.policyObligation.upsert({
      where: { id: obl.id },
      update: { category: obl.category, description: obl.description, regulationRefs: obl.regulationRefs, controlRefs: obl.controlRefs },
      create: { ...obl, policyId },
    });
  }
  console.log(`  ✓ ${SEED_OBLIGATIONS.length} policy obligations`);

  // Policy audit trail
  const POLICY_AUDIT: {
    id: string; policyId: string; userId: string; action: string;
    fieldChanged: string | null; oldValue: string | null; newValue: string | null;
    details: string | null; changedAt: Date;
  }[] = [
    { id: "pau-01", policyId, userId: "user-rob", action: "CREATED_POLICY", fieldChanged: null, oldValue: null, newValue: null, details: "Created policy POL-001: Financial Promotions Policy", changedAt: new Date("2024-01-01") },
    { id: "pau-02", policyId, userId: "user-rob", action: "UPDATED_FIELD", fieldChanged: "version", oldValue: "1.0", newValue: "2.0", details: "Annual review — updated version", changedAt: new Date("2025-01-15") },
    { id: "pau-03", policyId, userId: "user-cath", action: "UPDATED_FIELD", fieldChanged: "scope", oldValue: "Website and email promotions", newValue: "All financial promotions including social media and affiliate materials", details: "Scope expanded to cover all channels", changedAt: new Date("2025-06-01") },
    { id: "pau-04", policyId, userId: "user-rob", action: "UPDATED_FIELD", fieldChanged: "version", oldValue: "2.0", newValue: "3.0", details: "Consumer Duty alignment update", changedAt: new Date("2025-09-01") },
    { id: "pau-05", policyId, userId: "user-rob", action: "UPDATED_FIELD", fieldChanged: "version", oldValue: "3.0", newValue: "3.2", details: "Annual review completed. Minor updates to approval workflow.", changedAt: new Date("2025-11-15") },
  ];

  for (const a of POLICY_AUDIT) {
    await prisma.policyAuditLog.upsert({
      where: { id: a.id },
      update: { action: a.action, fieldChanged: a.fieldChanged, oldValue: a.oldValue, newValue: a.newValue, details: a.details },
      create: a,
    });
  }
  console.log(`  ✓ ${POLICY_AUDIT.length} policy audit entries`);

  console.log("Seed complete! Database is clean — ready for real data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
