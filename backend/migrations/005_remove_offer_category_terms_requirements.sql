-- Migration: Remove Category, Terms, and Requirements from Offers
-- Created: 2025-01-XX
-- Description: Removes category, categoryId, terms, and requirements columns from offers table

-- Drop foreign key constraint if it exists
ALTER TABLE "offers" 
DROP CONSTRAINT IF EXISTS "offers_categoryId_fkey";

-- Drop index on categoryId if it exists
DROP INDEX IF EXISTS "offers_categoryId_idx";

-- Remove columns from offers table
ALTER TABLE "offers"
DROP COLUMN IF EXISTS "category",
DROP COLUMN IF EXISTS "categoryId",
DROP COLUMN IF EXISTS "terms",
DROP COLUMN IF EXISTS "requirements";

