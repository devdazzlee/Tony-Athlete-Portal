# Changes Summary - Implementation Status

## ✅ ALL CHANGES COMPLETED

## 1. Affiliate Discount Codes

### ✅ Completed:
- Monthly allowance codes: `maxUsage: 1` (single-use per customer) ✅
- Shipping codes: `maxUsage: null` (unlimited use) ✅
- Shipping codes are separate from allowance codes ✅
- Admin-created codes for followers: `maxUsage: undefined` (unlimited) ✅
- **FIXED**: Affiliate-generated codes via `LinksService.generateCoupon()`: Changed from `maxUsage: data.maxUsage || 100` to `maxUsage: null` (unlimited for followers) ✅

## 2. Affiliate Settings Changes

### ✅ Completed:
- Backend forces PayPal only (`paymentMethod: "PAYPAL"`) ✅
- Bank details set to `null` in backend ✅
- Minimum payout set to `null` in backend ✅
- Payout frequency set to `null` in backend ✅
- **FIXED**: Removed bank details column from admin commissions table ✅
- **FIXED**: Removed bank details modal from admin commissions page ✅
- **FIXED**: Removed bank details interface and related code ✅
- Affiliate dashboard already shows PayPal-only settings ✅

## 3. Commission Calculation

### ✅ Completed:
- `getCommissionableValue()` function exists and calculates correctly (after discount, before shipping & tax) ✅
- Used correctly in `ShopifyController.ts` ✅
- Used correctly in `payment.ts` capture endpoint ✅
- **FIXED**: `/athlete/orders/create` endpoint: Changed from using `subtotal_price` directly to using `getCommissionableValue()` ✅
