# 🧪 How to Test Tracking with Website ID

Quick guide to test your tracking system using Website IDs from your dashboard.

---

## 🚀 **Quick Start - 3 Steps**

### **Step 1: Get Your Website ID from Dashboard**

1. **Login to Dashboard:**

   ```
   http://localhost:3000/auth/login
   ```

2. **Go to Websites:**

   - Affiliate: `Dashboard → Settings → Websites`
   - Admin: `Admin → Settings → Websites`

3. **Copy Your Website ID:**
   - View your website
   - Click **"Copy ID"** button
   - You'll get: `store-1-production` (or your website ID)

---

### **Step 2: Start Your Servers**

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
# Running on http://localhost:3003
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
# Running on http://localhost:3000
# Serves trackdesk.js at /trackdesk.js
```

**Terminal 3 - Serve Test HTML:**

```bash
cd /Users/mac/Documents/GitHub/Trackdesk
python3 -m http.server 8000
# OR
npx http-server -p 8000
```

---

### **Step 3: Test with Website ID & Referral Code**

**Open in browser:**

```
http://localhost:8000/test-affiliate-tracking.html?websiteId=store-1-production&ref=AFF_0AGXXR
```

**You'll see:**

- ✅ Website ID: `store-1-production` (from URL)
- ✅ Referral Code: `AFF_0AGXXR` (from URL)
- ✅ Session ID: (auto-generated)
- ✅ Real-time event log

---

## 📋 **Test URL Formats**

### **Option 1: With Website ID & Referral Code (Recommended)**

```
http://localhost:8000/test-affiliate-tracking.html?websiteId=store-1-production&ref=AFF_0AGXXR
```

- Uses your Website ID from dashboard
- Tests referral code tracking
- Full end-to-end test

### **Option 2: Just Referral Code**

```
http://localhost:8000/test-affiliate-tracking.html?ref=AFF_0AGXXR
```

- Uses default Website ID: `test-website-001`
- Tests referral code tracking

### **Option 3: Just Website ID**

```
http://localhost:8000/test-affiliate-tracking.html?websiteId=store-1-production
```

- Uses your Website ID from dashboard
- Tests basic tracking (no referral code)

### **Option 4: Default Test**

```
http://localhost:8000/test-affiliate-tracking.html
```

- Uses default Website ID: `test-website-001`
- No referral code
- Basic tracking test

---

## 🎯 **Complete Test Flow**

### **1. Test with Your Website ID:**

```
URL: http://localhost:8000/test-affiliate-tracking.html?websiteId=store-1-production&ref=AFF_0AGXXR
```

**What Happens:**

1. ✅ Page loads
2. ✅ Website ID detected: `store-1-production`
3. ✅ Referral code detected: `AFF_0AGXXR`
4. ✅ Trackdesk initializes with websiteId
5. ✅ Click tracked: `POST /api/tracking/click`
   ```json
   {
     "referralCode": "AFF_0AGXXR",
     "storeId": "store-1-production" // ← Your Website ID
   }
   ```

### **2. Add Product to Cart:**

- Click "Add to Cart" on any product
- ✅ Event logged: `ADD_TO_CART`
- ✅ Trackdesk tracks with websiteId

### **3. Complete Purchase:**

- Fill checkout form
- Click "Complete Purchase"
- ✅ Conversion tracked
- ✅ Order sent: `POST /api/tracking/order`
  ```json
  {
    "referralCode": "AFF_0AGXXR",
    "storeId": "store-1-production", // ← Your Website ID
    "orderId": "ORD-123",
    "orderValue": 99.99
  }
  ```
- ✅ Commission calculated
- ✅ Affiliate dashboard updates

---

## 🔍 **What to Check:**

### **In Test HTML:**

1. ✅ Website ID displays correctly
2. ✅ Referral code detected
3. ✅ Event log shows events
4. ✅ Success message after purchase

### **In Browser Console:**

```javascript
// Should see:
[Trackdesk] Trackdesk initialized
[Trackdesk] Event tracked: { eventName: "page_view", websiteId: "store-1-production" }
[Trackdesk] Event tracked: { eventName: "add_to_cart", websiteId: "store-1-production" }
```

### **In Backend Logs:**

```bash
# Should see:
POST /api/tracking/click 200
POST /api/tracking/events 200
POST /api/tracking/order 200
```

### **In Affiliate Dashboard:**

1. ✅ Go to: `Dashboard → Statistics`
2. ✅ See new click recorded
3. ✅ See new conversion recorded
4. ✅ See earnings increased

---

## 🎯 **Example Test URLs**

### **For Website #1:**

```
http://localhost:8000/test-affiliate-tracking.html?websiteId=store-1-production&ref=AFF_0AGXXR
```

### **For Website #2:**

```
http://localhost:8000/test-affiliate-tracking.html?websiteId=store-2-production&ref=AFF_0AGXXR
```

### **Same Referral Code, Different Websites:**

```
Website 1: ?websiteId=store-1-production&ref=AFF_0AGXXR
Website 2: ?websiteId=store-2-production&ref=AFF_0AGXXR
```

Both use same referral code, but tracking is separated by websiteId!

---

## 📊 **What Gets Tracked:**

### **All Events Include websiteId:**

1. **Page View:**

   ```json
   {
     "event": "page_view",
     "websiteId": "store-1-production",  // ← From URL
     "sessionId": "...",
     ...
   }
   ```

2. **Add to Cart:**

   ```json
   {
     "event": "add_to_cart",
     "websiteId": "store-1-production",  // ← From URL
     "data": { "product": {...} }
   }
   ```

3. **Click Tracking:**

   ```json
   {
     "referralCode": "AFF_0AGXXR",
     "storeId": "store-1-production",  // ← From URL
     ...
   }
   ```

4. **Order Tracking:**
   ```json
   {
     "referralCode": "AFF_0AGXXR",
     "storeId": "store-1-production",  // ← From URL
     "orderId": "ORD-123",
     ...
   }
   ```

---

## ✅ **Test Checklist**

- [ ] Backend running (`localhost:3003`)
- [ ] Frontend running (`localhost:3000`)
- [ ] Test HTML served (`localhost:8000`)
- [ ] Got Website ID from dashboard
- [ ] Got referral code (`AFF_0AGXXR` or your code)
- [ ] Opened test URL with websiteId and ref
- [ ] Saw Website ID displayed correctly
- [ ] Saw referral code detected
- [ ] Added product to cart
- [ ] Completed purchase
- [ ] Saw success message
- [ ] Checked affiliate dashboard for commission

---

## 🔧 **Troubleshooting**

### **Website ID not showing?**

✅ Check URL has: `?websiteId=your-website-id`
✅ Check it's the exact Website ID from dashboard

### **Referral code not detected?**

✅ Check URL has: `?ref=AFF_0AGXXR` (or your code)
✅ Check referral code exists in database

### **Events not sending?**

✅ Check backend is running
✅ Check API_URL in test file matches backend
✅ Check browser console for errors

### **Commission not calculated?**

✅ Check referral code is valid
✅ Check order was sent to `/api/tracking/order`
✅ Check backend logs for errors

---

## 🎯 **Summary**

**To test with Website ID:**

1. **Get Website ID:** Dashboard → Settings → Websites → Copy ID
2. **Get Referral Code:** Dashboard → Referrals → My Codes → Copy code
3. **Test URL:** `http://localhost:8000/test-affiliate-tracking.html?websiteId=YOUR_WEBSITE_ID&ref=YOUR_REFERRAL_CODE`
4. **Test Flow:** Add to cart → Checkout → Purchase
5. **Verify:** Check affiliate dashboard for commission

**The test file now uses Website IDs from your dashboard!** ✅
