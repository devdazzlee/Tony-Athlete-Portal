# ⚡ Quick Test Instructions - Affiliate Tracking

## 🎯 **Test Your Affiliate System in 5 Minutes!**

---

## ✅ **All Servers Running:**

| Service    | Status     | URL                   |
| ---------- | ---------- | --------------------- |
| Backend    | ✅ Running | http://localhost:3003 |
| Frontend   | ✅ Running | http://localhost:3000 |
| Test Store | ✅ Running | http://localhost:8000 |

---

## 🚀 **Step-by-Step Test:**

### **1. Generate Affiliate Link** (1 minute)

```bash
# Open your browser:
http://localhost:3000/auth/login

# Login:
Email: affiliate@trackdesk.com
Password: password123

# Go to:
http://localhost:3000/dashboard/links

# Click "Generate New Link"
# Fill in:
- Product URL: http://localhost:8000/test-affiliate-tracking.html
- Campaign Name: Test Campaign
- Custom Alias: TEST001

# Copy the generated link (example):
http://localhost:8000/test-affiliate-tracking.html?ref=TEST001
```

---

### **2. Test Affiliate Click** (1 minute)

```bash
# Open the generated link in a NEW browser tab:
http://localhost:8000/test-affiliate-tracking.html?ref=TEST001

# You should see:
✅ Green banner: "Welcome! You're shopping through an affiliate link"
✅ Referral Code: TEST001
✅ Status: "Affiliate Link Active ✅"
✅ Event log shows: "AFFILIATE_LINK_CLICKED"
```

**Check Dashboard:**

```
Go back to: http://localhost:3000/dashboard/links
Your link should show: Clicks: 1 ✅
```

---

### **3. Test Purchase & Conversion** (2 minutes)

**In the test store page:**

```bash
1. Click "Add to Cart" on any product
   ✅ Cart section appears
   ✅ Event logged: ADD_TO_CART

2. Click "Proceed to Checkout"
   ✅ Checkout form appears
   ✅ Event logged: CHECKOUT_INITIATED

3. Fill in the form:
   Name: John Doe
   Email: john@example.com
   Card: 4242 4242 4242 4242
   Expiry: 12/25
   CVV: 123

4. Click "Complete Purchase"
   ✅ Processing... (2 seconds)
   ✅ Success message appears
   ✅ Events logged:
      - CONVERSION_TRACKED_TO_CDN
      - ORDER_TRACKED_TO_API
      - PURCHASE_COMPLETED
```

---

### **4. Verify Commission** (1 minute)

**Check Dashboard:**

```bash
# Refresh: http://localhost:3000/dashboard/links

Your link should show:
- Clicks: 1
- Conversions: 1 ✅
- Earnings: $9.90 (if $99 product, 10% commission) ✅
```

**Check Commissions:**

```bash
# Go to: http://localhost:3000/dashboard/commissions

Should show:
- New pending commission ✅
- Amount: $9.90 (or based on product price)
- Status: PENDING
```

**Check Database:**

```bash
cd backend
npx prisma studio

# Tables to check:
1. AffiliateClick → Should have 1 new record
2. AffiliateOrder → Should have 1 new record
3. Commission → Should have 1 new PENDING commission
4. AffiliateLink → clicks=1, conversions=1, earnings updated
```

---

## 🎯 **What Each Event Does:**

| Event               | Tracked By      | What Happens                       |
| ------------------- | --------------- | ---------------------------------- |
| **Page Load**       | trackdesk.js    | Session created, page view tracked |
| **Affiliate Click** | Your link       | AffiliateClick record created      |
| **Add to Cart**     | trackdesk.js    | Event tracked, cart updated        |
| **Checkout**        | trackdesk.js    | Checkout event tracked             |
| **Purchase**        | Manual API call | Commission created, affiliate paid |

---

## 📊 **Real-Time Tracking Log:**

The test page shows live events:

```
[10:30:45] TRACKING_INITIALIZED
[10:30:45] AFFILIATE_LINK_CLICKED
[10:30:46] CLICK_TRACKED_TO_API ✅
[10:31:20] ADD_TO_CART
[10:31:45] CHECKOUT_INITIATED
[10:32:10] PROCESSING_PAYMENT
[10:32:12] CONVERSION_TRACKED_TO_CDN ✅
[10:32:12] ORDER_TRACKED_TO_API ✅
[10:32:12] PURCHASE_COMPLETED ✅
```

---

## 🔍 **What to Look For:**

### **In Browser:**

- ✅ Referral code detected from URL
- ✅ Green affiliate banner appears
- ✅ Events appear in tracking log
- ✅ "CLICK_TRACKED_TO_API" shows ✅
- ✅ "ORDER_TRACKED_TO_API" shows ✅
- ✅ Success message appears after checkout

### **In Backend Console:**

```
POST /api/tracking/click 200
POST /api/tracking/events 200
POST /api/tracking/order 200
✅ All should return 200 status
```

### **In Dashboard:**

```
Before:  Clicks: 0, Conversions: 0, Earnings: $0.00
After:   Clicks: 1, Conversions: 1, Earnings: $9.90 ✅
```

---

## 🎮 **Test Commands (Copy & Paste):**

### **Open All URLs at Once:**

```bash
# Mac:
open http://localhost:3000/auth/login
open http://localhost:8000/test-affiliate-tracking.html?ref=TEST001

# Windows:
start http://localhost:3000/auth/login
start http://localhost:8000/test-affiliate-tracking.html?ref=TEST001

# Linux:
xdg-open http://localhost:3000/auth/login
xdg-open http://localhost:8000/test-affiliate-tracking.html?ref=TEST001
```

### **Check All Servers:**

```bash
# Backend health
curl http://localhost:3003/health

# Frontend
curl -I http://localhost:3000

# Test store
curl -I http://localhost:8000/test-affiliate-tracking.html

# All should return 200 ✅
```

---

## 🐛 **Common Issues:**

### **Issue: "Referral Code: Not detected"**

**Solution:** Make sure URL has `?ref=YOUR_CODE`

```
Wrong: http://localhost:8000/test-affiliate-tracking.html
Right: http://localhost:8000/test-affiliate-tracking.html?ref=TEST001
```

### **Issue: "CLICK_TRACKING_FAILED"**

**Solution:**

```bash
# Check backend is running:
lsof -ti:3003

# Check backend logs for errors
# Restart backend if needed
```

### **Issue: Dashboard shows 0 clicks**

**Solution:**

```bash
# Refresh dashboard page
# Check that referral code matches what you generated
# Check browser Network tab for API calls
# Check database: npx prisma studio
```

### **Issue: Commission not created**

**Solution:**

```bash
# Check backend console for errors
# Verify referral code exists in ReferralCode table
# Verify AffiliateProfile exists
# Check commission rate is set (default 10%)
```

---

## 🎉 **Expected Final Result:**

After completing one purchase of $99 product:

**Dashboard Stats:**

```
┌─────────────────────────────────────┐
│ DEMO_BOTH_001                       │
│ Clicks: 1                           │
│ Conversions: 1                      │
│ Earnings: $9.90                     │
│ Conversion Rate: 100%               │
└─────────────────────────────────────┘
```

**Commissions Page:**

```
┌─────────────────────────────────────┐
│ Pending Commissions                 │
│                                     │
│ Order #ORD-1234567                  │
│ Amount: $9.90                       │
│ Status: PENDING                     │
│ Date: Just now                      │
└─────────────────────────────────────┘
```

**Database Records:**

```
AffiliateClick:
- id: xxx
- referralCode: TEST001
- timestamp: 2025-10-17...

AffiliateOrder:
- orderId: ORD-xxx
- orderValue: 99.00
- referralCode: TEST001

Commission:
- amount: 9.90
- status: PENDING
- affiliateId: xxx
```

---

## ✅ **You're Ready to Test!**

**Just follow these 4 steps:**

1. Login to dashboard
2. Generate affiliate link
3. Open link in browser (with ?ref=CODE)
4. Complete a test purchase

**Check results in dashboard!** 🎊

---

**Test File:** `/Users/mac/Documents/GitHub/Trackdesk/test-affiliate-tracking.html`  
**Test URL:** http://localhost:8000/test-affiliate-tracking.html?ref=YOUR_CODE  
**Status:** ✅ Ready to test!
