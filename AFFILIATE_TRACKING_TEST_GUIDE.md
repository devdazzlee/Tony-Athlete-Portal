# 🧪 Affiliate Tracking Test Guide

## Overview

This guide shows you how to test your complete affiliate tracking system: Click → Add to Cart → Checkout → Conversion → Commission

---

## 🎯 **What We're Testing:**

1. ✅ **Affiliate Click Tracking** - When someone clicks your affiliate link
2. ✅ **Event Tracking** - Product views, add to cart, etc.
3. ✅ **Conversion Tracking** - When customer completes purchase
4. ✅ **Commission Calculation** - Automatic commission for affiliate
5. ✅ **Real-Time Updates** - Dashboard updates instantly

---

## 🚀 **Step-by-Step Test:**

### **Step 1: Generate Affiliate Link** (2 minutes)

1. **Login to Trackdesk:**

   ```
   URL: http://localhost:3000/auth/login
   Email: affiliate@trackdesk.com
   Password: password123
   ```

2. **Go to Links & Assets:**

   ```
   URL: http://localhost:3000/dashboard/links
   ```

3. **Generate a Test Link:**

   - Product URL: `http://localhost:8000/test-affiliate-tracking.html`
   - Campaign Name: `Test Campaign`
   - Custom Alias: `TEST001`
   - Click "Generate Link"

4. **Copy the Generated Link:**
   ```
   Example: http://localhost:8000/test-affiliate-tracking.html?ref=TEST001
   ```

**Note:** You'll need to serve the HTML file. See Step 2.

---

### **Step 2: Serve the Test HTML** (1 minute)

Open a new terminal and run:

```bash
# Option 1: Using Python (if installed)
cd /Users/mac/Documents/GitHub/Trackdesk
python3 -m http.server 8000

# Option 2: Using Node.js
npx http-server -p 8000

# Option 3: Using PHP (if installed)
php -S localhost:8000
```

**Your test store is now running at:**

```
http://localhost:8000/test-affiliate-tracking.html
```

---

### **Step 3: Test Affiliate Click** (1 minute)

1. **Open the affiliate link in your browser:**

   ```
   http://localhost:8000/test-affiliate-tracking.html?ref=TEST001
   ```

2. **You should see:**

   - ✅ Page loads with 3 products
   - ✅ Green banner: "Welcome! You're shopping through an affiliate link"
   - ✅ Referral Code displayed: `TEST001`
   - ✅ Status badge: "Affiliate Link Active ✅"
   - ✅ Event log shows: `AFFILIATE_LINK_CLICKED`
   - ✅ Event log shows: `CLICK_TRACKED_TO_API`

3. **Verify in Backend Console:**

   ```bash
   # You should see in your backend terminal:
   POST /api/tracking/click 200
   ```

4. **Verify in Trackdesk Dashboard:**
   ```
   Go to: http://localhost:3000/dashboard/links
   Your link should show: Clicks: 1
   ```

---

### **Step 4: Test Product Interaction** (1 minute)

1. **Click on any product card**

   - Event logged: `CLICK`

2. **Click "Add to Cart" button**

   - Event logged: `ADD_TO_CART`
   - Cart section appears
   - Product shows in cart

3. **Add multiple products**
   - Each adds to cart
   - Total updates
   - Events tracked

---

### **Step 5: Test Checkout Flow** (2 minutes)

1. **Click "Proceed to Checkout"**

   - Event logged: `CHECKOUT_INITIATED`
   - Checkout form appears

2. **Fill in the form:**

   ```
   Name: John Doe
   Email: john@example.com
   Card: 4242 4242 4242 4242
   Expiry: 12/25
   CVV: 123
   ```

3. **Click "Complete Purchase"**
   - Processing starts
   - Event logged: `PROCESSING_PAYMENT`
   - After 2 seconds:
     - ✅ Success message appears
     - ✅ Event logged: `CONVERSION_TRACKED_TO_CDN`
     - ✅ Event logged: `ORDER_TRACKED_TO_API`
     - ✅ Event logged: `PURCHASE_COMPLETED`

---

### **Step 6: Verify Commission** (1 minute)

1. **Check Backend Console:**

   ```bash
   # You should see:
   POST /api/tracking/order 200
   ```

2. **Check Trackdesk Dashboard:**

   ```
   Go to: http://localhost:3000/dashboard/links
   Your link should show:
   - Clicks: 1
   - Conversions: 1
   - Earnings: $XX.XX (10% of order value)
   ```

3. **Check Commissions Page:**
   ```
   Go to: http://localhost:3000/dashboard/commissions
   Should show new pending commission
   ```

---

## 📊 **Expected Event Flow:**

```
1. User clicks affiliate link
   ↓
2. AFFILIATE_LINK_CLICKED → Backend API
   ↓
3. AffiliateClick record created (database)
   ↓
4. User adds products to cart
   ↓
5. ADD_TO_CART events → Trackdesk CDN
   ↓
6. User completes checkout
   ↓
7. CONVERSION event → Trackdesk CDN
8. ORDER event → Backend API
   ↓
9. Commission calculated and created
   ↓
10. Dashboard updates in real-time
```

---

## 🔍 **What to Check:**

### **In Browser:**

- ✅ Events appear in the tracking log
- ✅ Referral code detected from URL
- ✅ Cart updates correctly
- ✅ Checkout processes successfully
- ✅ Success message appears

### **In Backend Console:**

```bash
# You should see these API calls:
POST /api/tracking/click 200
POST /api/tracking/events 200
POST /api/tracking/order 200
```

### **In Trackdesk Dashboard:**

- ✅ Click count increases
- ✅ Conversion count increases
- ✅ Earnings increase
- ✅ Commission appears in pending
- ✅ Statistics update

### **In Database (Prisma Studio):**

```bash
# Run: npx prisma studio
# Check these tables:
- AffiliateClick → Should have new record
- AffiliateLink → Clicks and conversions updated
- Commission → New pending commission
- AffiliateOrder → New order record
```

---

## 🧪 **Test Scenarios:**

### **Scenario 1: Without Referral Code**

```
URL: http://localhost:8000/test-affiliate-tracking.html

Expected:
- ✅ Page loads normally
- ✅ No referral banner
- ✅ Status: "No Affiliate"
- ✅ Purchase works but NO commission created
```

### **Scenario 2: With Valid Referral Code**

```
URL: http://localhost:8000/test-affiliate-tracking.html?ref=TEST001

Expected:
- ✅ Green banner appears
- ✅ Click tracked to API
- ✅ Purchase creates commission
- ✅ Affiliate earns 10% commission
```

### **Scenario 3: Multiple Purchases**

```
1. Complete first purchase
2. Refresh page with affiliate link
3. Complete second purchase

Expected:
- ✅ Both conversions tracked
- ✅ Total earnings = sum of both commissions
- ✅ Conversion count = 2
```

### **Scenario 4: Different Products, Different Prices**

```
Product 1: $49 → Commission: $4.90
Product 2: $99 → Commission: $9.90
Product 3: $299 → Commission: $29.90

Expected:
- ✅ Commission calculated correctly for each
- ✅ Total matches sum
```

---

## 🐛 **Troubleshooting:**

### **Issue: Referral code not detected**

```javascript
// Check URL has ?ref=CODE parameter
// Example: http://localhost:8000/test-affiliate-tracking.html?ref=TEST001
```

### **Issue: Events not appearing in log**

```javascript
// Open browser console (F12)
// Check for errors
// Verify Trackdesk script loaded:
console.log(window.Trackdesk);
```

### **Issue: Click tracking fails**

```bash
# Check backend is running:
curl http://localhost:3003/health

# Check CORS allows localhost:8000:
# Backend should allow all localhost origins
```

### **Issue: Commission not created**

```bash
# Check backend logs for errors
# Verify referral code exists in database
# Check AffiliateProfile exists for that code
```

### **Issue: Dashboard not updating**

```bash
# Clear browser cache
# Refresh dashboard page
# Check network tab for API calls
```

---

## 📈 **Expected Results:**

### **After 1 Purchase:**

```
Dashboard Stats:
- Clicks: 1
- Conversions: 1
- Earnings: $9.90 (if $99 order with 10% rate)
- Conversion Rate: 100%

Database:
- AffiliateClick: 1 record
- AffiliateOrder: 1 record
- Commission: 1 record (status: PENDING)
```

### **After Multiple Purchases:**

```
Dashboard Stats:
- Clicks: 1
- Conversions: 3
- Earnings: $44.70 (if $49+$99+$299 orders)
- Conversion Rate: 300%

Commissions Page:
- 3 pending commissions
- Total pending: $44.70
```

---

## 🎨 **Customizing the Test Page:**

### **Change API URL:**

```javascript
// In test-affiliate-tracking.html, line ~440
const API_URL = "http://localhost:3003/api";

// For production testing:
const API_URL = "https://api.your-domain.com/api";
```

### **Change Trackdesk Script URL:**

```html
<!-- Line ~420 -->
<script
  src="http://localhost:3000/trackdesk.js"
  data-website-id="test-website-001"
  data-auto-init="true"
></script>

<!-- For production: -->
<script
  src="https://your-domain.com/trackdesk.js"
  data-website-id="your-actual-website-id"
  data-auto-init="true"
></script>
```

### **Change Commission Rate:**

```javascript
// Current: 10% commission
// To change, update in Trackdesk dashboard:
// Settings > Commission Rates
```

---

## 🔗 **Integration Instructions (For Real Websites):**

### **Step 1: Host trackdesk.js on CDN**

```bash
# Upload to your CDN
# Example URL: https://cdn.your-domain.com/trackdesk.js
```

### **Step 2: Add Script to Your Website**

```html
<!-- Add before </head> tag -->
<script
  src="https://cdn.your-domain.com/trackdesk.js"
  data-website-id="YOUR_WEBSITE_ID"
  data-auto-init="true"
></script>
```

### **Step 3: Add Checkout Tracking**

```javascript
// On your checkout success page:
<script>
if (window.Trackdesk) {
    Trackdesk.convert({
        orderId: 'ORDER_ID_HERE',
        orderValue: 99.00,
        currency: 'USD',
        items: [
            { id: 'prod_1', name: 'Product 1', price: 99.00 }
        ],
        customer: {
            email: 'customer@example.com'
        }
    });
}
</script>
```

### **Step 4: Add to Thank You Page**

```php
// example-thank-you-page.php
<script>
<?php if (isset($_GET['ref'])): ?>
    // Track conversion with referral code
    fetch('https://api.your-domain.com/api/tracking/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            referralCode: '<?= htmlspecialchars($_GET['ref']) ?>',
            orderId: '<?= $order_id ?>',
            orderValue: <?= $order_total ?>,
            currency: 'USD',
            customerEmail: '<?= $customer_email ?>',
            items: <?= json_encode($order_items) ?>
        })
    });
<?php endif; ?>
</script>
```

---

## 📋 **Complete Test Checklist:**

```
[ ] Backend running on localhost:3003
[ ] Frontend running on localhost:3000
[ ] Test HTML served on localhost:8000
[ ] Affiliate link generated with referral code
[ ] Click tracking works (verified in dashboard)
[ ] Add to cart events tracked
[ ] Checkout initiated tracked
[ ] Conversion tracked via CDN
[ ] Order tracked via API
[ ] Commission created in database
[ ] Dashboard shows updated stats
[ ] Email notification sent (if configured)
```

---

## 🎯 **Quick Test Commands:**

### **1. Start All Services:**

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - Test HTML Server
python3 -m http.server 8000
```

### **2. Test the Flow:**

```bash
# 1. Generate link in dashboard
# 2. Open: http://localhost:8000/test-affiliate-tracking.html?ref=YOUR_CODE
# 3. Add products to cart
# 4. Complete checkout
# 5. Check dashboard for updates
```

### **3. Verify in Database:**

```bash
cd backend
npx prisma studio

# Check:
- AffiliateClick table (click recorded)
- AffiliateOrder table (order recorded)
- Commission table (commission created)
- AffiliateLink table (stats updated)
```

---

## 📊 **API Endpoints Being Tested:**

```
POST /api/tracking/click
- Tracks initial affiliate click
- Creates AffiliateClick record
- Updates link click count

POST /api/tracking/events
- Tracks page views, clicks, etc.
- Sent automatically by trackdesk.js
- Creates TrackingEvent records

POST /api/tracking/order
- Tracks completed purchase
- Creates AffiliateOrder record
- Creates Commission record
- Updates affiliate earnings
- Triggers notifications

GET /api/links/my-links
- Fetches updated stats
- Shows real-time click/conversion counts
```

---

## 🎨 **Visual Flow Diagram:**

```
┌─────────────────────────────────────────────────────┐
│  1. User clicks affiliate link                      │
│     http://example.com?ref=TEST001                  │
└─────────────┬───────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  2. Trackdesk.js tracks click                       │
│     POST /api/tracking/click                        │
│     → AffiliateClick created                        │
│     → Link.clicks += 1                              │
└─────────────┬───────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  3. User browses products                           │
│     Events: page_view, click, scroll                │
│     → Sent to /api/tracking/events                  │
└─────────────┬───────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  4. User adds to cart                               │
│     Event: add_to_cart                              │
│     → Tracked via Trackdesk.track()                 │
└─────────────┬───────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  5. User completes checkout                         │
│     Trackdesk.convert({ orderId, value, items })    │
│     POST /api/tracking/order                        │
└─────────────┬───────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  6. Backend processes order                         │
│     → Finds affiliate by referralCode               │
│     → Creates AffiliateOrder record                 │
│     → Calculates commission (10% default)           │
│     → Creates Commission record                     │
│     → Updates affiliate.totalEarnings               │
│     → Updates link.conversions                      │
│     → Sends notification (if configured)            │
└─────────────┬───────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  7. Dashboard updates                               │
│     → Real-time stats refresh                       │
│     → Shows new conversion                          │
│     → Shows earned commission                       │
│     → Notification appears                          │
└─────────────────────────────────────────────────────┘
```

---

## 📱 **Testing Different Scenarios:**

### **Test 1: Standard Flow**

```
1. Click affiliate link → ✅ Tracked
2. Browse products → ✅ Tracked
3. Add to cart → ✅ Tracked
4. Checkout → ✅ Commission created
```

### **Test 2: Direct Visit (No Referral)**

```
1. Visit without ?ref= parameter
2. Complete purchase
Expected: ❌ No commission created
Result: ✅ Order processed but no affiliate credited
```

### **Test 3: Invalid Referral Code**

```
1. Visit with ?ref=INVALID_CODE
2. Complete purchase
Expected: ❌ Error or no commission
Check: Backend should log "Affiliate not found"
```

### **Test 4: Multiple Products**

```
1. Add 3 products ($49 + $99 + $299 = $447)
2. Complete checkout
Expected: Commission = $44.70 (10% of $447)
```

### **Test 5: Return Customer (Same Email)**

```
1. First purchase: $99
2. Second purchase (same email): $149
Expected:
- 2 separate commissions
- Total: $24.80 ($9.90 + $14.90)
```

---

## 🎯 **Success Criteria:**

Your affiliate system is working if:

1. ✅ **Click tracked when opening affiliate link**
2. ✅ **Events appear in tracking log**
3. ✅ **Dashboard shows click count increase**
4. ✅ **Checkout completion triggers conversion**
5. ✅ **Commission record created in database**
6. ✅ **Earnings updated in dashboard**
7. ✅ **Conversion count increases**
8. ✅ **Commission appears in pending**

---

## 🔧 **Configuration:**

### **Current Settings:**

```javascript
// In test-affiliate-tracking.html
API_URL: 'http://localhost:3003/api'
Website ID: 'test-website-001'
Commission Rate: 10% (default)
Auto-tracking: Enabled
```

### **Adjustable Parameters:**

```javascript
// Change these in the HTML file:
1. API_URL → Your backend URL
2. data-website-id → Your website ID
3. Commission rate → Set in dashboard
4. Products → Add/remove products
5. Prices → Change product prices
```

---

## 📞 **Need Help?**

### **If clicks aren't tracked:**

1. Check backend is running (`curl http://localhost:3003/health`)
2. Check browser console for errors
3. Verify referral code exists in database
4. Check CORS settings allow localhost:8000

### **If conversions aren't tracked:**

1. Check backend logs for errors
2. Verify `/api/tracking/order` endpoint exists
3. Check referral code matches database
4. Verify AffiliateProfile exists

### **If commission isn't created:**

1. Check backend console for error messages
2. Verify affiliate has commission rate set
3. Check AffiliateOrder was created
4. Run: `npx prisma studio` to check database

---

## 🚀 **Ready to Test?**

### **Quick Start:**

```bash
# 1. Start backend (if not running)
cd backend && npm run dev

# 2. Start frontend (if not running)
cd frontend && npm run dev

# 3. Start test server
python3 -m http.server 8000

# 4. Generate affiliate link in dashboard
# 5. Open: http://localhost:8000/test-affiliate-tracking.html?ref=YOUR_CODE
# 6. Complete a purchase
# 7. Check dashboard for updates!
```

---

**File Created:** `test-affiliate-tracking.html`  
**Location:** `/Users/mac/Documents/GitHub/Trackdesk/`  
**Test URL:** `http://localhost:8000/test-affiliate-tracking.html?ref=YOUR_CODE`

**Start testing now!** 🎉
