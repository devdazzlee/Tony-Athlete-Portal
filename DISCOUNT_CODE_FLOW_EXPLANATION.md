# Discount Code & Referral Code System - Flow Explanation

## Overview

The system has **TWO SEPARATE** code systems that serve different purposes:

1. **Referral Codes** (`ReferralCode` model) - For tracking affiliate sales and commissions
2. **Discount Codes** (`Coupon` model) - For customer discounts at checkout

---

## Database Structure

### 1. ReferralCode Model
```prisma
model ReferralCode {
  id             String       @id
  affiliateId    String       // Links to AffiliateProfile
  code           String       @unique  // e.g., "AFF_ZAPO51"
  type           ReferralType // PRODUCT, CATEGORY, BOTH
  commissionRate Float        // Commission percentage (e.g., 15%)
  productId      String?
  maxUses        Int?
  currentUses    Int          @default(0)
  expiresAt      DateTime?
  isActive       Boolean      @default(true)
  
  // Relations
  affiliate AffiliateProfile
  usages    ReferralUsage[]
}
```

**Purpose:** 
- Tracks when customers click affiliate links
- Used to attribute sales to affiliates
- Determines commission rates
- Example: `AFF_ZAPO51` - When someone uses this, the affiliate gets commission

### 2. Coupon Model (Discount Code)
```prisma
model Coupon {
  id          String       @id
  affiliateId String       // Links to AffiliateProfile
  code        String       @unique  // e.g., "SAVE10", "ASDSADAS"
  description String
  discount    String       // e.g., "10%", "$10", "FREE_SHIPPING"
  validUntil  DateTime
  usage       Int          @default(0)
  maxUsage    Int?
  status      CouponStatus @default(ACTIVE)
  
  // Relations
  affiliate AffiliateProfile
}
```

**Purpose:**
- Customer discount codes at checkout
- Gives customers a discount (percentage or fixed amount)
- Example: `ASDSADAS` with `50%` - Customer gets 50% off

---

## Current Flow

### ✅ CORRECT Flow (After Fix)

#### 1. Admin Assigns Discount Code
```
Admin → Edit Affiliate → Enter:
  - Code: "ASDSADAS"
  - Discount: "50%"
  - Expires: (optional date)
  
Backend creates Coupon:
  POST /admin/affiliates/:id/discount-code
  → Creates Coupon record
  → Links to AffiliateProfile via affiliateId
```

#### 2. Affiliate Views Their Dashboard
```
GET /athlete/profile
  → Finds AffiliateProfile by userId
  → Queries Coupon table for most recent ACTIVE coupon
  → Returns: { discountCode: "ASDSADAS", discountValue: "50%" }
  
Frontend displays:
  - Discount Code: ASDSADAS
  - Discount Value: 50%
```

#### 3. Customer Uses Discount Code
```
Customer at checkout:
  - Enters code: "ASDSADAS"
  - System validates coupon
  - Applies 50% discount
  - Increments coupon.usage
```

---

## Issues & Fixes

### ❌ Previous Issue (WRONG)
```typescript
// OLD CODE - WRONG APPROACH
const discountCode = affiliate.referralCodes[0]?.code || null; // Gets "AFF_ZAPO51"
const coupon = await prisma.coupon.findFirst({
  where: {
    affiliateId: affiliate.id,
    code: discountCode, // ❌ Trying to match "AFF_ZAPO51" with coupon code
    status: "ACTIVE",
  },
});
```

**Problem:** 
- Referral codes (AFF_ZAPO51) ≠ Discount codes (ASDSADAS)
- These are completely different systems
- Would never find a match

### ✅ Current Fix (CORRECT)
```typescript
// NEW CODE - CORRECT APPROACH
const coupon = await prisma.coupon.findFirst({
  where: {
    affiliateId: affiliate.id,
    status: "ACTIVE",
  },
  orderBy: {
    createdAt: "desc", // Get most recent active coupon
  },
});

const discountCode = coupon?.code || null; // Gets "ASDSADAS"
const discountValue = coupon?.discount || null; // Gets "50%"
```

**Solution:**
- Directly queries Coupon table
- Gets the most recent active coupon for the affiliate
- Returns the actual discount code and value

---

## Complete System Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Admin assigns discount code
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /admin/affiliates/:id/discount-code                   │
│  {                                                           │
│    code: "ASDSADAS",                                         │
│    discount: "50%",                                         │
│    expiresAt: "2025-12-31"                                  │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Creates Coupon record
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE                                 │
│  ┌──────────────────────────────────────┐                  │
│  │ Coupon Table                          │                  │
│  │ ──────────────────────────────────── │                  │
│  │ id: "coupon_123"                      │                  │
│  │ affiliateId: "aff_456"               │                  │
│  │ code: "ASDSADAS"                      │                  │
│  │ discount: "50%"                       │                  │
│  │ status: "ACTIVE"                      │                  │
│  │ validUntil: "2025-12-31"             │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Affiliate views dashboard
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  GET /athlete/profile                                        │
│  → Queries Coupon table                                     │
│  → Finds most recent ACTIVE coupon                          │
│  → Returns: {                                               │
│      discountCode: "ASDSADAS",                              │
│      discountValue: "50%"                                  │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Displays on dashboard
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              AFFILIATE DASHBOARD                            │
│  ┌──────────────────────────────────────┐                  │
│  │ Affiliate Information                 │                  │
│  │ Discount Code: ASDSADAS               │                  │
│  │ Discount Value: 50%                  │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Customer uses code at checkout
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /coupons/validate                                     │
│  { code: "ASDSADAS" }                                       │
│  → Validates coupon                                         │
│  → Applies 50% discount                                    │
│  → Increments usage count                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Differences: Referral Code vs Discount Code

| Feature | Referral Code | Discount Code |
|---------|---------------|---------------|
| **Model** | `ReferralCode` | `Coupon` |
| **Purpose** | Track affiliate sales | Give customer discount |
| **Who Uses** | System (tracking) | Customer (checkout) |
| **Example** | `AFF_ZAPO51` | `ASDSADAS` |
| **Value** | Commission rate (15%) | Discount amount (50%) |
| **Tracking** | Tracks clicks & conversions | Tracks usage count |
| **Created By** | Affiliate (auto-generated) | Admin (manually assigned) |

---

## Best Practices

### ✅ DO:
1. **Separate the concepts** - Referral codes and discount codes are different
2. **Query directly** - Get coupons from Coupon table, not from referral codes
3. **Show most recent** - Display the latest active coupon for the affiliate
4. **Validate properly** - Check coupon status, expiration, and usage limits

### ❌ DON'T:
1. **Mix them up** - Don't try to match referral codes with coupon codes
2. **Assume relationship** - Referral codes and coupons are independent
3. **Use referral code as discount** - They serve different purposes

---

## Current Implementation Status

### ✅ Fixed:
- Backend now correctly fetches coupons from Coupon table
- Returns the most recent active coupon
- Displays correct discount code and value on affiliate dashboard

### 📝 Notes:
- An affiliate can have multiple coupons (but only most recent is shown)
- An affiliate can have multiple referral codes (for different products/campaigns)
- These two systems operate independently

---

## Summary

**The structure is CORRECT now:**
1. ✅ Admin creates Coupon (discount code) via admin panel
2. ✅ Coupon is stored in `coupons` table with `affiliateId`
3. ✅ Affiliate dashboard queries Coupon table directly
4. ✅ Returns the most recent active coupon
5. ✅ Displays code and discount value correctly

**The previous issue was:**
- Trying to match referral codes with coupons (wrong approach)
- Now fixed to query coupons directly (correct approach)

