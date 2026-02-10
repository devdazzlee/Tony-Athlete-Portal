# 🧪 test-affiliate-tracking.html - What It Does & How It Works

Complete explanation of the test HTML file and how it validates your tracking system.

---

## 🎯 **What is `test-affiliate-tracking.html`?**

This is a **standalone HTML test file** that simulates an e-commerce store to test your complete affiliate tracking system **without needing a full Next.js website**.

### **Purpose:**

- ✅ Test affiliate referral code tracking
- ✅ Test click tracking
- ✅ Test order/conversion tracking
- ✅ Test commission calculation
- ✅ Verify tracking script integration
- ✅ Debug tracking issues in development

---

## 📋 **What It Tests:**

### **1. Referral Code Capture**

```
Customer visits: http://localhost:8000/test-affiliate-tracking.html?ref=AFF_0AGXXR
                                           ↓
Script captures: ?ref=AFF_0AGXXR
                                           ↓
Displays: "Referral Code: AFF_0AGXXR" ✅
                                           ↓
Tracks click: POST /api/tracking/click
```

### **2. Tracking Script Integration**

```
Loads: trackdesk.js from localhost:3000
                                           ↓
Initializes: Trackdesk.init()
                                           ↓
Captures: websiteId = "test-website-001"
                                           ↓
Sends events: POST /api/tracking/events
  with websiteId in every event
```

### **3. E-commerce Flow Testing**

```
Customer adds product to cart
                                           ↓
Tracks: ADD_TO_CART event
                                           ↓
Customer proceeds to checkout
                                           ↓
Tracks: CHECKOUT_INITIATED event
                                           ↓
Customer completes purchase
                                           ↓
Tracks: CONVERSION event
                                           ↓
Sends order: POST /api/tracking/order
  with referralCode + websiteId
                                           ↓
Backend calculates commission ✅
```

---

## 🔧 **How It Works:**

### **Configuration:**

```html
<!-- Loads tracking script -->
<script
  src="http://localhost:3000/trackdesk.js"
  data-website-id="test-website-001"
  data-auto-init="true"
></script>
```

### **Key Features:**

#### **1. Referral Code Detection:**

```javascript
// Gets referral code from URL
function getReferralCode() {
  const urlParams = new URLSearchParams(window.location.search);
  return (
    urlParams.get("ref") || urlParams.get("referral") || urlParams.get("aff")
  );
}

// If found:
if (referralCode) {
  // Display in UI
  // Track click to backend
  trackAffiliateClick(referralCode);
}
```

#### **2. Click Tracking:**

```javascript
// Sends click to backend
async function trackAffiliateClick(refCode) {
    POST /api/tracking/click
    {
        referralCode: "AFF_0AGXXR",
        storeId: "test-store-001",  // ← websiteId
        url: window.location.href,
        referrer: document.referrer,
        ...
    }
}
```

#### **3. Event Tracking:**

```javascript
// Uses Trackdesk tracking script
if (window.Trackdesk) {
  window.Trackdesk.track("add_to_cart", {
    product: { id, name, price },
    cartTotal: total,
  });

  // Automatically includes websiteId from init()
}
```

#### **4. Order Tracking:**

```javascript
// On checkout completion
POST /api/tracking/order
{
    referralCode: "AFF_0AGXXR",
    storeId: "test-store-001",  // ← websiteId
    orderId: "ORD-123",
    orderValue: 99.99,
    currency: "USD",
    customerEmail: "...",
    items: [...]
}
```

---

## 🚀 **How to Use It:**

### **Step 1: Start Backend**

```bash
cd backend
npm run dev
# Running on http://localhost:3003
```

### **Step 2: Start Frontend (for trackdesk.js)**

```bash
cd frontend
npm run dev
# Running on http://localhost:3000
# Serves trackdesk.js at /trackdesk.js
```

### **Step 3: Serve Test HTML File**

```bash
# Option 1: Python
cd /Users/mac/Documents/GitHub/Trackdesk
python3 -m http.server 8000

# Option 2: Node.js
npx http-server -p 8000

# Option 3: PHP
php -S localhost:8000
```

### **Step 4: Test with Referral Code**

```
1. Open browser:
   http://localhost:8000/test-affiliate-tracking.html?ref=AFF_0AGXXR

2. You'll see:
   ✅ Referral code detected: AFF_0AGXXR
   ✅ Website ID: test-website-001
   ✅ Session ID: (auto-generated)
   ✅ Event log showing real-time tracking

3. Test flow:
   - Add product to cart → See ADD_TO_CART event
   - Proceed to checkout → See CHECKOUT_INITIATED event
   - Complete purchase → See CONVERSION event
   - See commission calculated in backend
```

---

## 🔍 **What Gets Tracked:**

### **Automatic Events (from trackdesk.js):**

1. **Page View** - When page loads
2. **Clicks** - User clicks anywhere
3. **Form Submissions** - Form interactions
4. **Scroll** - Page scrolling
5. **Time on Page** - Every 30 seconds
6. **Visibility Changes** - Tab switches

### **Custom Events (from test HTML):**

1. **AFFILIATE_LINK_CLICKED** - Referral code detected
2. **CLICK_TRACKED_TO_API** - Click sent to backend
3. **ADD_TO_CART** - Product added to cart
4. **CHECKOUT_INITIATED** - Checkout started
5. **CONVERSION_TRACKED_TO_CDN** - Trackdesk.convert() called
6. **ORDER_TRACKED_TO_API** - Order sent to backend
7. **PURCHASE_COMPLETED** - Purchase finished

---

## 📊 **Real-Time Event Log:**

The test file shows a **live event log** at the bottom:

```
📊 Real-Time Event Tracking Log
─────────────────────────────────
[10:30:15] TRACKING_INITIALIZED
{
  "sessionId": "session-abc123",
  "websiteId": "test-website-001"
}

[10:30:16] AFFILIATE_LINK_CLICKED
{
  "referralCode": "AFF_0AGXXR"
}

[10:30:17] CLICK_TRACKED_TO_API
{
  "success": true,
  "clickId": "click-xyz789"
}

[10:31:20] ADD_TO_CART
{
  "productId": "prod_001",
  "productName": "Premium Package",
  "price": 99.00
}

[10:32:10] CHECKOUT_INITIATED
{
  "itemCount": 1,
  "total": 99.00
}

[10:33:05] PURCHASE_COMPLETED
{
  "orderId": "ORD-1234567890",
  "total": 99.00,
  "referralCode": "AFF_0AGXXR",
  "commissionEarned": "9.90"
}
```

---

## ✅ **What This Proves:**

### **1. Referral Code System Works:**

- ✅ Captures `?ref=AFF_0AGXXR` from URL
- ✅ Stores in localStorage (90 days)
- ✅ Sends click to backend
- ✅ Backend finds affiliate by code

### **2. Tracking Script Works:**

- ✅ Loads `trackdesk.js` correctly
- ✅ Initializes with `websiteId`
- ✅ Sends events with `websiteId`
- ✅ Batches events efficiently

### **3. Order Tracking Works:**

- ✅ Retrieves referral code from localStorage
- ✅ Sends order with referral code
- ✅ Backend calculates commission
- ✅ Creates AffiliateOrder record

### **4. Complete Flow Works:**

- ✅ Click → Order → Commission → Dashboard
- ✅ All events include `websiteId`
- ✅ Database stores everything correctly
- ✅ Affiliate sees updates in dashboard

---

## 🎯 **Integration with Your Next.js Websites:**

### **This Test File = Simplified Version of Your Next.js Store**

Your actual Next.js websites will work the same way:

#### **Test HTML (Current):**

```html
<script
  src="http://localhost:3000/trackdesk.js"
  data-website-id="test-website-001"
></script>
```

#### **Your Next.js (Production):**

```tsx
// app/layout.tsx
Trackdesk.init({
  websiteId: process.env.NEXT_PUBLIC_TRACKDESK_WEBSITE_ID, // From .env.local
  apiUrl: process.env.NEXT_PUBLIC_TRACKDESK_API_URL,
});
```

**Both work the same way!** The test file just makes it easier to test without building a full Next.js app.

---

## 📝 **Key Differences:**

| Feature             | Test HTML                     | Your Next.js      |
| ------------------- | ----------------------------- | ----------------- |
| **Tracking Script** | ✅ Same                       | ✅ Same           |
| **websiteId**       | Hardcoded: `test-website-001` | From `.env.local` |
| **Referral Code**   | ✅ Same capture               | ✅ Same capture   |
| **Click Tracking**  | ✅ Same                       | ✅ Same           |
| **Order Tracking**  | ✅ Same                       | ✅ Same           |
| **Event Tracking**  | ✅ Same                       | ✅ Same           |

**The test file proves your tracking works before integrating into Next.js!**

---

## 🚀 **Quick Test Checklist:**

- [ ] Backend running (`http://localhost:3003`)
- [ ] Frontend running (`http://localhost:3000`)
- [ ] Test HTML served (`http://localhost:8000`)
- [ ] Visit with referral code: `?ref=AFF_0AGXXR`
- [ ] See referral code detected ✅
- [ ] Add product to cart ✅
- [ ] Complete checkout ✅
- [ ] See conversion tracked ✅
- [ ] Check affiliate dashboard for commission ✅

---

## 💡 **Why This Test File is Valuable:**

1. **Quick Testing** - Test tracking without building full website
2. **Visual Feedback** - See events in real-time log
3. **Debugging** - Easy to spot issues
4. **Development** - Test before production
5. **Validation** - Confirm everything works

---

## 🎯 **Summary:**

**`test-affiliate-tracking.html` is a testing tool that:**

✅ Simulates an e-commerce store  
✅ Tests complete affiliate tracking flow  
✅ Validates referral code capture  
✅ Verifies order tracking  
✅ Confirms commission calculation  
✅ Shows real-time event tracking  
✅ Proves your tracking system works

**Use it to test your tracking before integrating into your actual Next.js websites!**

Once this test file works, your Next.js websites will work the same way because they use the same tracking script and backend APIs.
