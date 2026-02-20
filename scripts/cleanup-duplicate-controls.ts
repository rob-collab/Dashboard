import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const connStr = process.env.DATABASE_URL as string;
const adapter = new PrismaPg({ connectionString: connStr });
const prisma = new PrismaClient({ adapter });

/**
 * Cleans up duplicate controls from batch 3 markdown import.
 * Within each prefix (e.g. COI, ABC, FV, PAR), multiple control refs
 * share the same name + description. This script:
 *   1. Identifies duplicates within each prefix
 *   2. Keeps the lowest-numbered ref as canonical
 *   3. Rewrites requirement controlRefs that reference duplicates → canonical
 *   4. Deletes PolicyControlLinks for duplicates
 *   5. Deletes the duplicate Control records
 */
async function main() {
  console.log("Cleaning up duplicate controls");
  console.log("─".repeat(60));

  // Load all controls
  const allControls = await prisma.control.findMany({
    select: { id: true, controlRef: true, controlName: true, controlDescription: true },
    orderBy: { controlRef: "asc" },
  });
  console.log(`Total controls: ${allControls.length}`);

  // Group by (prefix, controlName) to find duplicates
  const groups = new Map<string, typeof allControls>();
  for (const c of allControls) {
    // Extract prefix: CTRL-FP-001 → FP, CTRL-PAYCE-001 → PAYCE
    const parts = c.controlRef.replace("CTRL-", "").split("-");
    parts.pop(); // remove number
    const prefix = parts.join("-");
    const key = `${prefix}|||${c.controlName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  // Find groups with more than 1 member
  const duplicateGroups = Array.from(groups.entries()).filter(([, ctrls]) => ctrls.length > 1);
  console.log(`Duplicate groups found: ${duplicateGroups.length}`);

  let totalDeleted = 0;
  let totalRefsUpdated = 0;
  let totalLinksDeleted = 0;

  for (const [key, ctrls] of duplicateGroups) {
    // Sort by ref to keep the lowest-numbered one
    ctrls.sort((a, b) => a.controlRef.localeCompare(b.controlRef));
    const canonical = ctrls[0];
    const duplicates = ctrls.slice(1);

    console.log(`\n● ${key.split("|||")[1]} (keep ${canonical.controlRef}, delete ${duplicates.map(d => d.controlRef).join(", ")})`);

    for (const dup of duplicates) {
      // 1. Update requirement controlRefs: replace dup ref with canonical ref
      const requirements = await prisma.policyObligation.findMany({
        where: { controlRefs: { has: dup.controlRef } },
        select: { id: true, controlRefs: true },
      });

      for (const req of requirements) {
        const updatedRefs = req.controlRefs.map(r => r === dup.controlRef ? canonical.controlRef : r);
        // De-duplicate in case canonical was already in the list
        const uniqueRefs = [...new Set(updatedRefs)];
        await prisma.policyObligation.update({
          where: { id: req.id },
          data: { controlRefs: uniqueRefs },
        });
        totalRefsUpdated++;
      }

      // Also update sections JSON controlRefs
      const reqsWithSections = await prisma.policyObligation.findMany({
        where: { NOT: { sections: { equals: null } } },
        select: { id: true, sections: true },
      });
      for (const req of reqsWithSections) {
        const sections = req.sections as any[];
        if (!Array.isArray(sections)) continue;
        let changed = false;
        for (const sec of sections) {
          if (Array.isArray(sec.controlRefs) && sec.controlRefs.includes(dup.controlRef)) {
            sec.controlRefs = [...new Set(sec.controlRefs.map((r: string) => r === dup.controlRef ? canonical.controlRef : r))];
            changed = true;
          }
        }
        if (changed) {
          await prisma.policyObligation.update({
            where: { id: req.id },
            data: { sections },
          });
        }
      }

      // 2. Delete PolicyControlLinks for the duplicate
      const deletedLinks = await prisma.policyControlLink.deleteMany({
        where: { controlId: dup.id },
      });
      totalLinksDeleted += deletedLinks.count;

      // 3. Delete any RegulationControlLinks
      await prisma.regulationControlLink.deleteMany({
        where: { controlId: dup.id },
      });

      // 4. Delete any ControlAttestations
      await prisma.controlAttestation.deleteMany({
        where: { controlId: dup.id },
      });

      // 5. Delete any ControlChanges
      await prisma.controlChange.deleteMany({
        where: { controlId: dup.id },
      });

      // 6. Delete any TestingScheduleEntries + test results
      const schedule = await prisma.testingScheduleEntry.findUnique({
        where: { controlId: dup.id },
        select: { id: true },
      });
      if (schedule) {
        await prisma.testResult.deleteMany({ where: { scheduleEntryId: schedule.id } });
        await prisma.testingScheduleEntry.delete({ where: { id: schedule.id } });
      }

      // 7. Delete any RiskControlLinks
      await prisma.riskControlLink.deleteMany({
        where: { controlId: dup.id },
      });

      // 8. Re-point actions from duplicate to canonical
      await prisma.action.updateMany({
        where: { controlId: dup.id },
        data: { controlId: canonical.id },
      });

      // 9. Finally delete the duplicate control
      await prisma.control.delete({ where: { id: dup.id } });
      totalDeleted++;
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Done: ${totalDeleted} duplicate controls deleted, ${totalRefsUpdated} requirement refs updated, ${totalLinksDeleted} policy links removed`);

  const remaining = await prisma.control.count();
  console.log(`Controls remaining: ${remaining}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
