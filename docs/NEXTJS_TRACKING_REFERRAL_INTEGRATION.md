# 🚀 Complete Next.js Integration Guide: Tracking + Referral Codes

Complete step-by-step guide to integrate Trackdesk tracking with referral codes in your Next.js websites.

---

## 📋 **Understanding the Flow**

```
1. AFFILIATE CREATES REFERRAL CODE
   ↓
   Affiliate Dashboard → My Referral Codes → Create Code: AFF_0AGXXR

2. AFFILIATE SHARES LINK
   ↓
   https://your-website.com/?ref=AFF_0AGXXR

3. CUSTOMER VISITS YOUR WEBSITE
   ↓
   Tracking script captures: ?ref=AFF_0AGXXR
   ↓
   Tracks click to: /api/tracking/click

4. CUSTOMER MAKES PURCHASE
   ↓
   Tracking script sends order to: /api/tracking/order
   ↓
   Commission calculated and attributed to affiliate
```

---

## 🎯 **Step 1: Get Your Referral Code from Affiliate Dashboard**

### **Login to Affiliate Dashboard:**

1. **Open:** `http://localhost:3000/auth/login` (or your frontend URL)

2. **Login as Affiliate:**

   ```
   Email: your-affiliate-email@example.com
   Password: your-password
   ```

3. **Navigate to Referral Codes:**

   - Go to: `Dashboard → Referrals → My Codes`
   - Or directly: `http://localhost:3000/dashboard/referrals`

4. **Get Your Referral Code:**

   - You'll see your code: **`AFF_0AGXXR`** (or your own code)
   - Copy the code
   - You can also create new codes here

5. **Get Shareable Link:**
   - Go to: `Dashboard → Referrals → Shareable Links`
   - Copy the full link with your code

---

## 🔧 **Step 2: Get Your Website ID from Dashboard**

### **Option 1: Get from Dashboard (Recommended)** ✅

1. **Login to Affiliate Dashboard:**

   ```
   http://localhost:3000/auth/login
   ```

2. **Navigate to Websites:**

   - Go to: `Dashboard → Settings → Websites`
   - Or directly: `http://localhost:3000/dashboard/settings/websites`

3. **Create or View Your Website:**

   - If you don't have one, click **"Add Website"**
   - Enter:
     - **Name:** My Store #1
     - **Domain:** mystore.com (or localhost:3000)
     - **Description:** (optional)
   - Click **"Create Website"**

4. **Copy Your Website ID:**

   - Your Website ID will be generated automatically
   - Click **"Copy ID"** button to copy
   - Or click **"Copy ENV Variable"** to copy the full environment variable

5. **Use in Your Project:**
   - Copy the Website ID
   - Add to your `.env.local` file

### **Option 2: Generate Manually**

If you prefer to generate it yourself, use:

- Domain-based: `my-store-com` (from `my-store.com`)
- UUID-based: `website-abc123-def456` (generated ID)

### **Key Difference: Website ID vs Referral Code**

- **`websiteId`**: Identifies **YOUR website/store** in Trackdesk

  - Example: `store-1-production`, `my-ecommerce-store`
  - **One `websiteId` per Next.js website**
  - **Get from Dashboard:** `Settings → Websites`

- **`referralCode`**: Identifies **which affiliate** sent the customer
  - Example: `AFF_0AGXXR`
  - **Many referral codes can be used on same website**
  - **Get from Dashboard:** `Referrals → My Codes`

### **Example:**

```
Website 1 (Next.js App 1):
  websiteId: "store-1-production"
  Can accept: ref=AFF_0AGXXR, ref=AFF_ABC123, etc.

Website 2 (Next.js App 2):
  websiteId: "store-2-production"
  Can accept: ref=AFF_0AGXXR, ref=AFF_XYZ789, etc.
```

---

## 📦 **Step 3: Integrate Tracking Script (Enhanced for Referral Codes)**

### **Update `frontend/public/trackdesk.js`**

The tracking script needs to capture referral codes from URL. Let me create an enhanced version:

```javascript
// Add this function to trackdesk.js to capture referral codes
// This should be added in the init() function

// Capture referral code from URL
function getReferralCodeFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return (
    urlParams.get("ref") ||
    urlParams.get("referral") ||
    urlParams.get("aff") ||
    urlParams.get("code") ||
    null
  );
}

// Store referral code in localStorage (persist for 90 days)
function storeReferralCode(code) {
  if (code) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 90); // 90 days
    localStorage.setItem("trackdesk_referral_code", code);
    localStorage.setItem("trackdesk_referral_expiry", expiry.toISOString());
    return code;
  }
  return null;
}

// Get stored referral code
function getStoredReferralCode() {
  const code = localStorage.getItem("trackdesk_referral_code");
  const expiry = localStorage.getItem("trackdesk_referral_expiry");

  if (code && expiry && new Date(expiry) > new Date()) {
    return code;
  }

  // Clean up expired code
  if (expiry && new Date(expiry) <= new Date()) {
    localStorage.removeItem("trackdesk_referral_code");
    localStorage.removeItem("trackdesk_referral_expiry");
  }

  return null;
}

// Track referral click when page loads with referral code
function trackReferralClick(code, websiteId, storeId) {
  if (!code || !websiteId) return;

  fetch(`${TRACKDESK_CONFIG.apiUrl}/tracking/click`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      referralCode: code,
      storeId: storeId || websiteId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    }),
  }).catch((error) => {
    utils.log("Failed to track referral click", error);
  });
}
```

---

## 🌐 **Step 4: Integrate in Next.js Website #1**

### **4.1 Create Environment File**

Create `frontend/.env.local`:

```bash
# Website 1 Configuration
NEXT_PUBLIC_TRACKDESK_API_URL=http://localhost:3003/api
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=store-1-production
NEXT_PUBLIC_TRACKDESK_DEBUG=true
```

### **4.2 Update `app/layout.tsx`**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your Store #1",
  description: "Your first e-commerce store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiUrl =
    process.env.NEXT_PUBLIC_TRACKDESK_API_URL || "http://localhost:3003/api";
  const websiteId =
    process.env.NEXT_PUBLIC_TRACKDESK_WEBSITE_ID || "store-1-production";
  const debugMode = process.env.NEXT_PUBLIC_TRACKDESK_DEBUG === "true";

  return (
    <html lang="en">
      <head>
        {/* Trackdesk Tracking Script */}
        <Script
          id="trackdesk-script"
          src="/trackdesk.js"
          strategy="afterInteractive"
          data-website-id={websiteId}
          data-auto-init="false"
        />
        {/* Initialize Trackdesk */}
        <Script id="trackdesk-init" strategy="afterInteractive">
          {`
            (function() {
              if (typeof window !== 'undefined' && window.Trackdesk && window.Trackdesk.init) {
                // Initialize tracking
                window.Trackdesk.init({
                  apiUrl: '${apiUrl}',
                  websiteId: '${websiteId}',
                  debug: ${debugMode},
                  batchSize: 10,
                  flushInterval: 5000
                });

                // Capture and track referral code
                function getReferralCodeFromURL() {
                  const urlParams = new URLSearchParams(window.location.search);
                  return urlParams.get('ref') || 
                         urlParams.get('referral') || 
                         urlParams.get('aff') || 
                         urlParams.get('code') ||
                         null;
                }

                function storeReferralCode(code) {
                  if (code) {
                    const expiry = new Date();
                    expiry.setDate(expiry.getDate() + 90);
                    localStorage.setItem('trackdesk_referral_code', code);
                    localStorage.setItem('trackdesk_referral_expiry', expiry.toISOString());
                    return code;
                  }
                  return null;
                }

                // Get referral code from URL
                const refCode = getReferralCodeFromURL();
                if (refCode) {
                  storeReferralCode(refCode);
                  
                  // Track the click
                  fetch('${apiUrl}/tracking/click', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      referralCode: refCode,
                      storeId: '${websiteId}',
                      url: window.location.href,
                      referrer: document.referrer,
                      userAgent: navigator.userAgent,
                      timestamp: new Date().toISOString(),
                    }),
                  }).catch(error => {
                    console.error('Failed to track referral click', error);
                  });
                }
              }
            })();
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### **4.3 Track Orders on Checkout Success**

Create `app/checkout/success/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderValue = searchParams.get("amount");

  useEffect(() => {
    // Get stored referral code
    const getStoredReferralCode = () => {
      const code = localStorage.getItem("trackdesk_referral_code");
      const expiry = localStorage.getItem("trackdesk_referral_expiry");

      if (code && expiry && new Date(expiry) > new Date()) {
        return code;
      }
      return null;
    };

    // Track order/conversion
    if (
      orderId &&
      orderValue &&
      typeof window !== "undefined" &&
      window.Trackdesk
    ) {
      const referralCode = getStoredReferralCode();
      const apiUrl =
        process.env.NEXT_PUBLIC_TRACKDESK_API_URL ||
        "http://localhost:3003/api";
      const websiteId =
        process.env.NEXT_PUBLIC_TRACKDESK_WEBSITE_ID || "store-1-production";

      if (referralCode) {
        // Track conversion
        window.Trackdesk.convert({
          orderId: orderId,
          value: parseFloat(orderValue),
          currency: "USD",
        });

        // Also send to tracking/order endpoint
        fetch(`${apiUrl}/tracking/order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            referralCode: referralCode,
            storeId: websiteId,
            orderId: orderId,
            orderValue: parseFloat(orderValue),
            currency: "USD",
            timestamp: new Date().toISOString(),
          }),
        }).catch((error) => {
          console.error("Failed to track order", error);
        });
      }
    }
  }, [orderId, orderValue]);

  return (
    <div className="container mx-auto py-12">
      <h1>Order Successful!</h1>
      <p>Thank you for your purchase.</p>
    </div>
  );
}
```

---

## 🌐 **Step 5: Integrate in Next.js Website #2**

### **5.1 Create Environment File**

Create `frontend-website2/.env.local`:

```bash
# Website 2 Configuration
NEXT_PUBLIC_TRACKDESK_API_URL=http://localhost:3003/api
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=store-2-production
NEXT_PUBLIC_TRACKDESK_DEBUG=true
```

### **5.2 Use Same Integration Code**

Use the **same code from Step 4.2** but change:

- `websiteId` to `store-2-production`
- Update metadata title to "Your Store #2"

---

## 🧪 **Step 6: Testing the Integration**

### **Test Website #1:**

1. **Start your backend:**

   ```bash
   cd backend
   npm run dev
   ```

2. **Start Website #1:**

   ```bash
   cd frontend
   npm run dev
   ```

3. **Test with referral code:**

   ```
   http://localhost:3000/?ref=AFF_0AGXXR
   ```

4. **Check browser console:**

   - Should see: `[Trackdesk] Trackdesk initialized`
   - Should see POST request to `/api/tracking/click`

5. **Complete a test purchase:**

   - Go through checkout
   - Complete order
   - Check backend logs for order tracking

6. **Check affiliate dashboard:**
   - Login to affiliate dashboard
   - Go to: `Dashboard → Statistics`
   - Should see new click and conversion

### **Test Website #2:**

1. **Start Website #2:**

   ```bash
   cd frontend-website2
   npm run dev
   ```

2. **Test with same referral code:**

   ```
   http://localhost:3001/?ref=AFF_0AGXXR
   ```

3. **Verify separate tracking:**
   - Each website has its own `websiteId`
   - Same referral code works on both
   - Tracking is separate per website

---

## 📊 **Step 7: Verify Tracking in Dashboard**

### **Check Affiliate Dashboard:**

1. **Login:** `http://localhost:3000/auth/login`

2. **Go to Statistics:**

   - `Dashboard → Statistics`
   - See clicks from both websites
   - See conversions from both websites

3. **Go to My Referral Codes:**
   - `Dashboard → Referrals → My Codes`
   - See code: `AFF_0AGXXR`
   - Click count increases
   - Conversion count increases

---

## 🔍 **Troubleshooting**

### **Referral code not captured?**

✅ Check URL format: `?ref=AFF_0AGXXR`
✅ Check browser console for errors
✅ Check localStorage: `localStorage.getItem('trackdesk_referral_code')`

### **Clicks not tracking?**

✅ Check API URL is correct
✅ Check backend is running
✅ Check network tab for POST requests
✅ Check referral code exists in database

### **Orders not tracking?**

✅ Check referral code is in localStorage
✅ Check checkout success page calls tracking
✅ Verify order endpoint receives data

---

## ✅ **Quick Checklist**

**Website #1:**

- [ ] Created `.env.local` with `websiteId: store-1-production`
- [ ] Updated `layout.tsx` with tracking script
- [ ] Added referral code capture logic
- [ ] Added order tracking on checkout success
- [ ] Tested with `?ref=AFF_0AGXXR`

**Website #2:**

- [ ] Created `.env.local` with `websiteId: store-2-production`
- [ ] Updated `layout.tsx` with tracking script
- [ ] Added referral code capture logic
- [ ] Added order tracking on checkout success
- [ ] Tested with `?ref=AFF_0AGXXR`

**Both Websites:**

- [ ] Backend running and accessible
- [ ] Referral code exists in database
- [ ] Can see clicks in affiliate dashboard
- [ ] Can see conversions in affiliate dashboard

---

## 🎯 **Summary**

**Your Setup:**

- **Website 1:** `websiteId: store-1-production` + accepts `ref=AFF_0AGXXR`
- **Website 2:** `websiteId: store-2-production` + accepts `ref=AFF_0AGXXR`
- **Referral Code:** `AFF_0AGXXR` (or any code from affiliate dashboard)
- **Backend API:** `http://localhost:3003/api` (or your production URL)

**Flow:**

1. Affiliate shares: `https://website1.com/?ref=AFF_0AGXXR`
2. Customer visits → Click tracked
3. Customer purchases → Order tracked → Commission calculated
4. Affiliate sees stats in dashboard

---

**Now both your Next.js websites are integrated with referral tracking!** 🎉
