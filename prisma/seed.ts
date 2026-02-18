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

  console.log("Seed complete! Database is clean — ready for real data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
