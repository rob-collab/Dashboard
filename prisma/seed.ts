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
  { id: "user-ceo", email: "ceo@updraft.com", name: "CEO", role: "VIEWER", assignedMeasures: [], isActive: true },
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
    { id: "rah-003", acceptanceId: "ra-001", userId: "user-rob", action: "ROUTE_TO_APPROVER", fromStatus: "CCRO_REVIEW", toStatus: "AWAITING_APPROVAL", details: "Routed to CEO for approval", createdAt: new Date("2025-09-10") },
    { id: "rah-004", acceptanceId: "ra-001", userId: "user-ceo", action: "APPROVE", fromStatus: "AWAITING_APPROVAL", toStatus: "APPROVED", details: "Approved with monitoring conditions", createdAt: new Date("2025-09-15") },
    { id: "rah-005", acceptanceId: "ra-001", userId: null, action: "EXPIRE", fromStatus: "APPROVED", toStatus: "EXPIRED", details: "Review date 2025-12-01 has passed. Acceptance expired.", createdAt: new Date("2025-12-02") },
    // RA-002 story: PROPOSED → CCRO_REVIEW → AWAITING_APPROVAL
    { id: "rah-006", acceptanceId: "ra-002", userId: "user-cath", action: "CREATED", fromStatus: null, toStatus: "PROPOSED", details: "Risk acceptance RA-002 proposed: Accept residual operational resilience gap", createdAt: new Date("2026-01-15") },
    { id: "rah-007", acceptanceId: "ra-002", userId: "user-rob", action: "SUBMIT_FOR_REVIEW", fromStatus: "PROPOSED", toStatus: "CCRO_REVIEW", details: "Submitted for CCRO review", createdAt: new Date("2026-01-16") },
    { id: "rah-008", acceptanceId: "ra-002", userId: "user-rob", action: "ROUTE_TO_APPROVER", fromStatus: "CCRO_REVIEW", toStatus: "AWAITING_APPROVAL", details: "Routed to CEO for approval", createdAt: new Date("2026-01-20") },
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
    { id: "rah-016", acceptanceId: "ra-005", userId: "user-rob", action: "ROUTE_TO_APPROVER", fromStatus: "CCRO_REVIEW", toStatus: "AWAITING_APPROVAL", details: "Routed to CEO for approval", createdAt: new Date("2026-01-05") },
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

  console.log("Seed complete! Database is clean — ready for real data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
