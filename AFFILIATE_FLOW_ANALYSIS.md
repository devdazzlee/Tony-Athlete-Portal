# Affiliate Flow Analysis & Verification

## 📋 Complete Affiliate Flow

### **Phase 1: Affiliate Registration & Onboarding**

```
1. User Registration
   ↓
   POST /api/auth/register
   {
     firstName, lastName, email, password, role: "AFFILIATE"
   }
   ↓
   Backend:
   - Creates User record
   - Creates AffiliateProfile with default commission rate
   - Sets status: "ACTIVE" (or "PENDING" if approval needed)
   ↓
   User receives verification email
   ↓
   User logs in → Access to affiliate dashboard
```

**Current Status:** ✅ **CORRECT**
- User registration creates affiliate profile
- Default commission rate assigned
- User can access dashboard immediately

---

### **Phase 2: Discount Code Assignment**

```
2. Admin Creates Discount Code for Affiliate
   ↓
   Admin → /admin/affiliate-codes
   ↓
   POST /api/admin/affiliate-codes
   {
     affiliateId: "...",
     code: "ABCD",
     discount: "50%",
     description: "...",
     maxUsage: 100,
     validUntil: "2025-12-31"
   }
   ↓
   Backend:
   - Creates Coupon record
   - Links to affiliate via affiliateId
   - Sets status: "ACTIVE"
   - Sets isAffiliate: true
   ↓
   Discount code stored in database
```

**Current Status:** ✅ **CORRECT**
- Admin can create discount codes
- Codes are linked to specific affiliates
- Codes have usage limits and expiration dates

---

### **Phase 3: Shopify Sync**

```
3. Sync Discount Code to Shopify
   ↓
   Admin → /admin/shopify/discounts/:id/sync
   ↓
   POST /api/admin/shopify/discounts/:id/sync
   {
     storeId: "store-usa"
   }
   ↓
   Backend:
   - Creates Shopify Price Rule
   - Creates Shopify Discount Code
   - Updates Coupon with Shopify IDs
   - Sets syncedToShopify: true
   ↓
   Discount code now active in Shopify store
```

**Current Status:** ✅ **CORRECT**
- Codes sync to Shopify stores
- Supports multiple stores (USA, Canada)
- Tracks sync status

---

### **Phase 4: Customer Purchase Flow**

```
4. Customer Uses Discount Code
   ↓
   Customer visits Shopify store
   ↓
   Customer applies discount code at checkout
   ↓
   Shopify processes order with discount code
   ↓
   Order created in Shopify
```

**Current Status:** ✅ **CORRECT**
- Standard Shopify checkout flow
- Discount codes work as expected

---

### **Phase 5: Order Tracking & Attribution**

#### **5A. Real-time Webhook (Preferred Method)**

```
5A. Shopify Webhook → Portal
   ↓
   POST /api/shopify/webhook/orders
   {
     order: {
       id: "12345",
       discount_codes: [{ code: "ABCD" }],
       total_price: "100.00",
       ...
     }
   }
   ↓
   Backend (processNewOrder):
   1. Check if order already exists
   2. Extract discount codes from order
   3. Find Coupon by code (case-insensitive)
   4. Get affiliate from coupon
   5. Calculate commission:
      commissionAmount = orderValue × (commissionRate / 100)
   6. Create AffiliateOrder record
   7. Update coupon usage count
   8. Update affiliate stats (totalConversions, totalEarnings)
   ↓
   Order attributed to affiliate
```

**Current Status:** ✅ **CORRECT** (with recent fixes)
- Webhook processes orders in real-time
- Matches discount codes to affiliates
- Calculates commissions correctly
- **FIXED:** Now properly filters by affiliate's discount codes

#### **5B. Scheduled Sync (Backup Method)**

```
5B. Hourly Scheduled Sync
   ↓
   ShopifySyncScheduler runs every hour
   ↓
   For each active store:
   1. Fetch orders from last 24 hours
   2. Build map of discount codes → affiliates
   3. For each order:
      - Check if order exists
      - Match discount code to affiliate
      - Create AffiliateOrder if match found
   ↓
   Orders synced to database
```

**Current Status:** ✅ **CORRECT**
- Backup sync ensures no orders are missed
- Runs hourly automatically
- Handles multiple stores

#### **5C. Manual Sync (Affiliate-Initiated)**

```
5C. Affiliate Syncs Orders
   ↓
   Affiliate → /dashboard/shop → "Sync Orders"
   ↓
   POST /api/athlete/sync-orders
   {
     days: 30,
     testMode: false
   }
   ↓
   Backend:
   1. Get affiliate's discount codes
   2. Fetch orders from Shopify with those codes
   3. **FIXED:** Verify matched code belongs to affiliate
   4. Create AffiliateOrder records
   ↓
   Orders synced
```

**Current Status:** ✅ **CORRECT** (after recent fixes)
- Affiliates can manually sync orders
- **FIXED:** Now validates codes belong to affiliate
- Prevents wrong attribution

---

### **Phase 6: Commission Calculation**

```
6. Commission Calculation
   ↓
   When AffiliateOrder is created:
   ↓
   commissionAmount = orderValue × (commissionRate / 100)
   ↓
   Example:
   - Order Value: $100.00
   - Commission Rate: 30%
   - Commission: $100 × 0.30 = $30.00
   ↓
   Stored in AffiliateOrder:
   - commissionAmount: 30.00
   - commissionRate: 30.0
   - status: "PENDING"
```

**Current Status:** ✅ **CORRECT**
- Commission calculated correctly
- Based on order value (not subtotal)
- Uses affiliate's commission rate

---

### **Phase 7: Order Display & Filtering**

```
7. Affiliate Views Orders
   ↓
   GET /api/athlete/orders
   ↓
   Backend:
   1. Get affiliate profile
   2. **FIXED:** Get affiliate's active discount codes
   3. **FIXED:** Filter orders:
      WHERE affiliateId = ? AND referralCode IN (affiliateCodes)
   4. Return filtered orders
   ↓
   Affiliate sees only their orders
```

**Current Status:** ✅ **CORRECT** (after recent fixes)
- **FIXED:** Now filters by discount codes
- Affiliates only see their own orders
- Prevents seeing other affiliates' orders

---

### **Phase 8: Commission Summary**

```
8. Affiliate Views Commission Summary
   ↓
   GET /api/athlete/commission-summary
   ↓
   Backend:
   1. Get affiliate's discount codes
   2. **FIXED:** Filter orders by codes
   3. Calculate:
      - Total orders (current month)
      - Total units
      - Total commission
   4. Calculate previous months
   ↓
   Affiliate sees accurate commission data
```

**Current Status:** ✅ **CORRECT** (after recent fixes)
- **FIXED:** Only includes orders with matching codes
- Shows accurate commission amounts
- Monthly breakdown correct

---

### **Phase 9: Commission Approval**

```
9. Admin Approves Commissions
   ↓
   Admin → /admin/commissions
   ↓
   PATCH /api/admin/commissions/:id/approve
   ↓
   Backend:
   - Updates AffiliateOrder.status = "APPROVED"
   - Commission becomes available for payout
   ↓
   Commission approved
```

**Current Status:** ✅ **CORRECT**
- Admin can approve/reject commissions
- Status tracking works correctly

---

### **Phase 10: Payout Request**

```
10. Affiliate Requests Payout
   ↓
   Affiliate → /dashboard/commissions
   ↓
   POST /api/commissions/request-payout
   {
     amount: 500.00
   }
   ↓
   Backend:
   1. Get total pending commissions
   2. Validate amount (min $50)
   3. Create Payout record
   4. Status: "PENDING"
   ↓
   Payout request created
```

**Current Status:** ✅ **CORRECT**
- Affiliates can request payouts
- Minimum amount validation
- Payout tracking in place

---

## ✅ **Flow Verification: Is It Correct?**

### **What's Working Correctly:**

1. ✅ **Registration & Onboarding**
   - Affiliates can register and access dashboard
   - Profile creation works correctly

2. ✅ **Discount Code Management**
   - Admin creates codes for affiliates
   - Codes sync to Shopify stores
   - Multiple stores supported

3. ✅ **Order Attribution**
   - Webhook processes orders in real-time
   - Scheduled sync as backup
   - Manual sync available
   - **FIXED:** Now correctly attributes orders to correct affiliate

4. ✅ **Commission Calculation**
   - Based on order value
   - Uses affiliate's commission rate
   - Calculated correctly

5. ✅ **Data Filtering** (After Recent Fixes)
   - **FIXED:** Orders filtered by discount codes
   - **FIXED:** Affiliates only see their orders
   - **FIXED:** Commission summaries accurate

6. ✅ **Payout Process**
   - Affiliates can request payouts
   - Admin can process payouts
   - Minimum amount validation

---

### **Potential Issues & Recommendations:**

#### **1. Commission Rate Calculation** ⚠️
**Current:** Commission calculated on full order value
```javascript
commissionAmount = orderValue × (commissionRate / 100)
```

**Recommendation:** Consider if commission should be on:
- Full order value (current) ✅
- Subtotal (before tax/shipping)
- After discount amount

**Status:** Current approach is standard, but verify business requirements

---

#### **2. Multiple Discount Codes** ⚠️
**Current:** If order has multiple discount codes, only first match is processed
```javascript
break; // Only process first matching discount code
```

**Recommendation:** 
- ✅ Current approach is correct (one affiliate per order)
- Consider logging if multiple affiliate codes found

---

#### **3. Order Status Updates** ⚠️
**Current:** Orders created with status "PENDING"
- No automatic status updates when Shopify order changes

**Recommendation:**
- Add webhook handler for `orders/updated`
- Update AffiliateOrder status when Shopify order status changes
- Handle refunds/cancellations

---

#### **4. Commission Approval Workflow** ⚠️
**Current:** Manual approval by admin
- No automatic approval rules
- No hold period before approval

**Recommendation:**
- Consider automatic approval after X days
- Hold period for returns (e.g., 30 days)
- Auto-approve orders with financial_status = "paid" after hold period

---

#### **5. Payout Processing** ⚠️
**Current:** Payout requests created, but processing is manual

**Recommendation:**
- Integrate with payment gateway (PayPal, Stripe, bank transfer)
- Automated payout processing
- Payout history tracking

---

#### **6. Fraud Prevention** ⚠️
**Current:** Basic tracking, no fraud detection

**Recommendation:**
- Track IP addresses
- Detect self-purchases
- Monitor unusual patterns
- Rate limiting on discount codes

---

## 📊 **Flow Diagram**

```
┌─────────────────┐
│ Affiliate       │
│ Registration    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin Creates   │
│ Discount Code   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sync to Shopify │
│ (Price Rule +   │
│  Discount Code) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Customer Uses   │
│ Discount Code   │
│ at Checkout     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Shopify Webhook │
│ or Sync         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Match Code to   │
│ Affiliate       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calculate       │
│ Commission      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create          │
│ AffiliateOrder  │
│ (Status: PENDING)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin Approves  │
│ Commission      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Affiliate       │
│ Requests Payout │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin Processes │
│ Payout          │
└─────────────────┘
```

---

## ✅ **Final Verdict**

### **Current Flow Status: CORRECT** ✅

The affiliate flow is **functionally correct** and follows standard affiliate marketing practices:

1. ✅ Registration works
2. ✅ Discount code assignment works
3. ✅ Shopify integration works
4. ✅ Order tracking works (webhook + sync)
5. ✅ Commission calculation is correct
6. ✅ **FIXED:** Order filtering now works correctly
7. ✅ Commission approval workflow exists
8. ✅ Payout request system works

### **Recent Fixes Applied:**
- ✅ Orders now filtered by affiliate's discount codes
- ✅ Affiliates only see their own orders
- ✅ Commission summaries are accurate
- ✅ Sync process validates codes belong to affiliate

### **Recommended Improvements:**
1. Add automatic commission approval after hold period
2. Add order status updates from Shopify webhooks
3. Implement fraud detection
4. Add automated payout processing
5. Add commission hold period for returns

---

## 🎯 **Conclusion**

The affiliate flow is **correct and working** after the recent fixes. The system properly:
- Attributes orders to the correct affiliate
- Calculates commissions accurately
- Filters data correctly
- Provides proper tracking and reporting

The flow follows industry best practices for affiliate marketing systems.


