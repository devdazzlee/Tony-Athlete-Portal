import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log(
      "🔄 Applying migration 005: Remove category, terms, and requirements from offers..."
    );

    // Execute each statement separately
    console.log("   Dropping foreign key constraint...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "offers" 
      DROP CONSTRAINT IF EXISTS "offers_categoryId_fkey";
    `);

    console.log("   Dropping index...");
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "offers_categoryId_idx";
    `);

    console.log("   Removing columns...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "offers"
      DROP COLUMN IF EXISTS "category",
      DROP COLUMN IF EXISTS "categoryId",
      DROP COLUMN IF EXISTS "terms",
      DROP COLUMN IF EXISTS "requirements";
    `);

    console.log("✅ Migration 005 applied successfully!");
    console.log("   - Removed 'category' column");
    console.log("   - Removed 'categoryId' column");
    console.log("   - Removed 'terms' column");
    console.log("   - Removed 'requirements' column");
  } catch (error: any) {
    console.error("❌ Error applying migration:", error);

    // Check if columns don't exist (migration already applied)
    if (
      error.message?.includes("does not exist") ||
      (error.message?.includes("column") &&
        error.message?.includes("not found"))
    ) {
      console.log(
        "ℹ️  Migration may have already been applied. Columns may not exist."
      );
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
