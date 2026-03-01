/**
 * One-time migration: uppercase dashboard_notifications.type values
 * before converting the column to the NotificationType enum.
 *
 * Run with: npx tsx prisma/migrate-notification-type.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const result = await prisma.$executeRaw`
    UPDATE dashboard_notifications
    SET type = UPPER(type)
    WHERE type IN ('info', 'warning', 'urgent')
  `;

  console.log(`Updated ${result} rows.`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
