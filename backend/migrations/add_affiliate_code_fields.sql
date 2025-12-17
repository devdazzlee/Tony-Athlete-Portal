-- Migration: Add affiliate code fields to coupons table
-- Date: 2025-12-03
-- Description: Adds freeShipping and isAffiliate fields to support affiliate monthly allowance codes

-- Add new columns to coupons table
ALTER TABLE "coupons" 
ADD COLUMN IF NOT EXISTS "freeShipping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "isAffiliate" BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries on affiliate codes
CREATE INDEX IF NOT EXISTS "coupons_isAffiliate_idx" ON "coupons"("isAffiliate") WHERE "isAffiliate" = true;

-- Update existing coupons to set isAffiliate = false (default)
UPDATE "coupons" SET "isAffiliate" = false WHERE "isAffiliate" IS NULL;

-- Add comment to the table
COMMENT ON COLUMN "coupons"."freeShipping" IS 'Indicates if this coupon includes free shipping';
COMMENT ON COLUMN "coupons"."isAffiliate" IS 'Marks if this is an affiliate monthly allowance code';















