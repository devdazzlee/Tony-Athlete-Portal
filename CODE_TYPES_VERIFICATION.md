# Code Types Verification Report

## Current Implementation Status

### ✅ 1. Affiliate Discount Code (For Followers) - UNLIMITED USE

**Status: ✅ CORRECTLY IMPLEMENTED**

- **Affiliate-generated codes** (`LinksService.generateCoupon()`):
  - `maxUsage: null` ✅ (unlimited use)
  - Any number of customers can use it multiple times ✅

- **Admin-created codes for followers** (`/admin/affiliates/:id/discount-code`):
  - `maxUsage: undefined` ✅ (unlimited use)
  - `oncePerCustomer: false` in Shopify ✅

**Example**: Code `SARAH10` - Anyone can use it multiple times ✅

---

### ✅ 2. Monthly Allowance Code - SINGLE-USE PER CUSTOMER

**Status: ✅ CORRECTLY IMPLEMENTED (FIXED)**

**Current Implementation:**
- Database: `maxUsage: null` ✅ (unlimited total uses)
- Shopify: `oncePerCustomer: true` ✅ (enforces once per customer)
- Shopify: `usageLimit: undefined` ✅ (no total limit)

**How It Works:**
- Monthly allowance codes are **single-use per customer** (not single-use total)
- Multiple customers can each use it once
- Example: Customer A uses `JANALLOW123` → Customer B can also use `JANALLOW123` once ✅
- Shopify's `oncePerCustomer: true` enforces the per-customer limit
- Database `maxUsage: null` allows unlimited total uses across all customers

---

### ✅ 3. Shipping/Delivery Code - SEPARATE FROM ALLOWANCE CODES

**Status: ✅ CORRECTLY IMPLEMENTED**

**Current Implementation:**
- ✅ Shipping codes are created as **SEPARATE coupon records** (different database entries)
- ✅ Shipping codes have `freeShipping: true` ✅
- ✅ Shipping codes use `targetType: "shipping_line"` in Shopify ✅ (line 321, 615)
- ✅ Shipping codes have `maxUsage: null` (unlimited use) ✅ (line 391, 667)
- ✅ Shipping codes have `oncePerCustomer: false` ✅ (line 324, 618)
- ✅ Shipping codes are completely separate from allowance codes ✅

**Example**: Code `FREESHIP` - Separate code that only affects shipping ✅

---

## Summary

| Code Type | Unlimited Use | Single-Use Per Customer | Separate from Others | Status |
|-----------|---------------|------------------------|---------------------|--------|
| Affiliate Discount (Followers) | ✅ Yes | ❌ No | ✅ Yes | ✅ CORRECT |
| Monthly Allowance | ✅ Yes (unlimited total) | ✅ Yes (via Shopify) | ✅ Yes | ✅ CORRECT |
| Shipping Code | ✅ Yes | ❌ No | ✅ Yes | ✅ CORRECT |

## ✅ ALL CODE TYPES CORRECTLY IMPLEMENTED

**Monthly Allowance Codes:**
- ✅ `maxUsage: null` (unlimited total uses)
- ✅ `oncePerCustomer: true` in Shopify (each customer can use it once)
- ✅ Result: Unlimited customers can each use it once ✅
