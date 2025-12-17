import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createWebsitesTable() {
  try {
    console.log("Creating websites table...");

    // Create WebsiteStatus enum if it doesn't exist
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
          CREATE TYPE "WebsiteStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INACTIVE');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create websites table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "websites" (
          "id" TEXT NOT NULL,
          "websiteId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "domain" TEXT NOT NULL,
          "description" TEXT,
          "status" "WebsiteStatus" NOT NULL DEFAULT 'ACTIVE',
          "createdBy" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create unique index on websiteId
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "websites_websiteId_key" ON "websites"("websiteId");
    `);

    // Add indexes for faster queries
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "websites_createdBy_idx" ON "websites"("createdBy");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "websites_status_idx" ON "websites"("status");
    `);

    console.log("✅ Websites table created successfully!");
  } catch (error: any) {
    console.error("❌ Error creating websites table:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createWebsitesTable();
