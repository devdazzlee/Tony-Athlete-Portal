-- Migration: Add Website Table
-- Created: 2025-11-03
-- Description: Adds Website table to store website configurations for tracking

-- Create WebsiteStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "WebsiteStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create websites table
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

-- Create unique index on websiteId
CREATE UNIQUE INDEX IF NOT EXISTS "websites_websiteId_key" ON "websites"("websiteId");

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS "websites_createdBy_idx" ON "websites"("createdBy");
CREATE INDEX IF NOT EXISTS "websites_status_idx" ON "websites"("status");

