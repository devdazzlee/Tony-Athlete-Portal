-- Migration: Add Tracking System Tables
-- Description: Add tables for tracking affiliate clicks and orders from e-commerce stores
-- Date: 2025-10-14

-- Create affiliate_clicks table
CREATE TABLE IF NOT EXISTS "affiliate_clicks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "affiliateId" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "referrer" TEXT,
  "userAgent" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "affiliate_clicks_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for affiliate_clicks
CREATE INDEX "affiliate_clicks_affiliateId_idx" ON "affiliate_clicks"("affiliateId");
CREATE INDEX "affiliate_clicks_referralCode_idx" ON "affiliate_clicks"("referralCode");
CREATE INDEX "affiliate_clicks_createdAt_idx" ON "affiliate_clicks"("createdAt");

-- Create affiliate_orders table
CREATE TABLE IF NOT EXISTS "affiliate_orders" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "affiliateId" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL UNIQUE,
  "orderValue" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "customerEmail" TEXT,
  "commissionAmount" DOUBLE PRECISION NOT NULL,
  "commissionRate" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "items" JSONB,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "affiliate_orders_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for affiliate_orders
CREATE INDEX "affiliate_orders_affiliateId_idx" ON "affiliate_orders"("affiliateId");
CREATE INDEX "affiliate_orders_referralCode_idx" ON "affiliate_orders"("referralCode");
CREATE INDEX "affiliate_orders_storeId_idx" ON "affiliate_orders"("storeId");
CREATE INDEX "affiliate_orders_orderId_idx" ON "affiliate_orders"("orderId");
CREATE INDEX "affiliate_orders_status_idx" ON "affiliate_orders"("status");
CREATE INDEX "affiliate_orders_createdAt_idx" ON "affiliate_orders"("createdAt");

-- Add comments
COMMENT ON TABLE "affiliate_clicks" IS 'Tracks all clicks on affiliate referral links';
COMMENT ON TABLE "affiliate_orders" IS 'Tracks all orders generated through affiliate referrals';

