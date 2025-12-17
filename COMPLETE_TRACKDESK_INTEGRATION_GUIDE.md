# 🚀 Trackdesk Complete Integration Guide for Next.js

## Complete Step-by-Step Integration for Development & Production

This guide will help you integrate Trackdesk tracking into your Next.js website and test it in both development and production.

---

## 📋 STEP 1: Verify Script File

The tracking script should already exist at:

```
frontend/public/trackdesk.js
```

If it doesn't exist, copy the complete script from `NEXTJS_TRACKDESK_INTEGRATION_COMPLETE.md` or the file above.

---

## 📋 STEP 2: Update Environment Variables

Create or update `.env.local` in your Next.js project root:

```bash
# Trackdesk Configuration
# Development
NEXT_PUBLIC_TRACKDESK_API_URL=http://localhost:3003/api
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_WEBSITE_ID_HERE
NEXT_PUBLIC_TRACKDESK_DEBUG=true

# Production (add these to Vercel Environment Variables)
# NEXT_PUBLIC_TRACKDESK_API_URL=https://trackdesk-ihom.vercel.app/api
# NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_WEBSITE_ID_HERE
# NEXT_PUBLIC_TRACKDESK_DEBUG=false
```

**Important:** Replace `YOUR_WEBSITE_ID_HERE` with your actual website ID from Trackdesk dashboard.

---

## 📋 STEP 3: Integration is Already Done! ✅

Your `layout.tsx` has been updated to include the tracking script. It will:

- ✅ Load the script from `/public/trackdesk.js`
- ✅ Initialize with your environment variables
- ✅ Auto-track page views, clicks, forms, scroll, and time on page
- ✅ Send events to your backend API

---

## 📋 STEP 4: Test in Development

### 1. Start Your Backend

```bash
cd backend
npm start
# Backend should be running on http://localhost:3003
```

### 2. Start Your Next.js App

```bash
cd frontend
npm run dev
# App should be running on http://localhost:3000
```

### 3. Open Browser DevTools

1. **Open Console Tab:**

   - You should see: `[Trackdesk] Trackdesk script loaded`
   - Then: `[Trackdesk] Trackdesk initialized { sessionId, websiteId, apiUrl }`

2. **Open Network Tab:**

   - Filter by "tracking"
   - You should see POST requests to `/api/tracking/events`
   - Events are sent every 5 seconds or when queue reaches 10 events

3. **Test Custom Tracking:**
   ```javascript
   // In browser console
   window.Trackdesk.track("test_event", { message: "Testing!" });
   ```

### 4. Verify Events are Being Sent

Check the Network tab:

- Method: POST
- URL: `http://localhost:3003/api/tracking/events`
- Status: 200 OK
- Payload should contain events array

---

## 📋 STEP 5: Add Custom Tracking in Your Components

### Example: Track Button Clicks

```tsx
"use client";

import { Button } from "@/components/ui/button";

export default function ProductCard() {
  const handlePurchase = () => {
    // Track custom event
    if (typeof window !== "undefined" && window.Trackdesk) {
      window.Trackdesk.track("purchase_button_click", {
        productId: "PROD_123",
        productName: "Sample Product",
        price: 99.99,
      });
    }

    // Your purchase logic here
    console.log("Purchasing...");
  };

  return <Button onClick={handlePurchase}>Buy Now</Button>;
}
```

### Example: Track User Identification After Login

```tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  useEffect(() => {
    // Identify user after login
    if (user && typeof window !== "undefined" && window.Trackdesk) {
      window.Trackdesk.identify(user.id, {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
      });
    }
  }, [user]);

  return <div>Dashboard</div>;
}
```

### Example: Track Conversions

```tsx
const handleCheckout = async () => {
  // Complete checkout logic...
  const orderId = "ORDER_123";
  const total = 149.99;

  // Track conversion
  if (typeof window !== "undefined" && window.Trackdesk) {
    window.Trackdesk.convert({
      orderId: orderId,
      value: total,
      currency: "USD",
      items: [
        { id: "PROD_123", name: "Product 1", price: 49.99, quantity: 2 },
        { id: "PROD_456", name: "Product 2", price: 49.99, quantity: 1 },
      ],
    });
  }
};
```

---

## 📋 STEP 6: Production Deployment

### 1. Set Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables:

```
NEXT_PUBLIC_TRACKDESK_API_URL=https://trackdesk-ihom.vercel.app/api
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_WEBSITE_ID_HERE
NEXT_PUBLIC_TRACKDESK_DEBUG=false
```

### 2. Deploy

```bash
git add .
git commit -m "Add Trackdesk tracking integration"
git push origin main
```

Vercel will automatically deploy.

### 3. Test Production

1. Visit your production site
2. Open DevTools → Console (debug should be off, so minimal logs)
3. Open DevTools → Network → Filter by "tracking"
4. Verify POST requests to `https://trackdesk-ihom.vercel.app/api/tracking/events`
5. Check Trackdesk dashboard for incoming events

---

## 📋 STEP 7: Verify Tracking is Working

### Quick Test Checklist

- [ ] Script loads (check Network tab for `trackdesk.js`)
- [ ] Console shows "Trackdesk initialized"
- [ ] Network shows POST requests to `/api/tracking/events`
- [ ] Events have status 200 OK
- [ ] Events appear in Trackdesk dashboard
- [ ] Custom events work (`window.Trackdesk.track()`)
- [ ] Page views auto-track
- [ ] Clicks auto-track
- [ ] Form submissions auto-track

---

## 🎯 What Gets Tracked Automatically

The script automatically tracks:

1. **Page Views** - Every page load/navigation
2. **Clicks** - All button/link clicks with element info
3. **Form Submissions** - All form submits with form details
4. **Scroll Behavior** - Scroll depth percentage
5. **Time on Page** - Tracks every 30 seconds
6. **Visibility Changes** - Tab visibility changes
7. **Page Unload** - When user leaves page

---

## 🔧 Troubleshooting

### Script Not Loading?

**Check:**

- `public/trackdesk.js` file exists
- Script tag in `layout.tsx` has correct `src="/trackdesk.js"`
- No console errors

**Fix:**

```tsx
// Verify in layout.tsx
<Script src="/trackdesk.js" strategy="afterInteractive" />
```

### Events Not Sending?

**Check:**

- Environment variable `NEXT_PUBLIC_TRACKDESK_API_URL` is set
- Environment variable `NEXT_PUBLIC_TRACKDESK_WEBSITE_ID` is set
- Backend `/api/tracking/events` endpoint exists
- Network tab shows requests (even if failed)

**Fix:**

```bash
# Verify .env.local has:
NEXT_PUBLIC_TRACKDESK_API_URL=http://localhost:3003/api
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_ID
```

### Events Not Appearing in Dashboard?

**Check:**

- Website ID matches your dashboard
- Backend is receiving events (check backend logs)
- Backend is saving events to database
- Dashboard is filtering by correct website ID

---

## 📊 Testing Guide

### Test Page Views

1. Navigate between pages
2. Check Network tab for `page_view` events
3. Should see events every page load

### Test Custom Events

```javascript
// In browser console
window.Trackdesk.track("custom_test", {
  test: true,
  timestamp: Date.now(),
});

// Check Network tab - should see POST request immediately
```

### Test Conversions

```javascript
// In browser console
window.Trackdesk.convert({
  orderId: "TEST_123",
  value: 99.99,
  currency: "USD",
});
```

### Test User Identification

```javascript
// In browser console
window.Trackdesk.identify("user_123", {
  email: "test@example.com",
  name: "Test User",
});
```

---

## 🚀 Production Checklist

Before going live:

- [ ] Environment variables set in Vercel
- [ ] API URL points to production backend
- [ ] Website ID is correct
- [ ] Debug mode is OFF (`NEXT_PUBLIC_TRACKDESK_DEBUG=false`)
- [ ] Tested in production preview
- [ ] Events are being sent successfully
- [ ] Events appear in Trackdesk dashboard
- [ ] No console errors

---

## ✅ Integration Complete!

Your Next.js website is now fully integrated with Trackdesk tracking!

**What's Working:**

- ✅ Automatic event tracking (page views, clicks, forms, scroll, time)
- ✅ Custom event tracking via `window.Trackdesk.track()`
- ✅ User identification via `window.Trackdesk.identify()`
- ✅ Conversion tracking via `window.Trackdesk.convert()`
- ✅ Event batching and efficient sending
- ✅ Production-ready configuration

**Next Steps:**

1. Test in development (already done above)
2. Set Vercel environment variables
3. Deploy to production
4. Verify events in Trackdesk dashboard
5. Monitor and analyze tracking data

---

## 📞 Need Help?

- Check browser console for errors
- Check Network tab for failed requests
- Verify environment variables
- Check backend logs for incoming events
- Ensure `/api/tracking/events` endpoint is working

---

**Ready to go live!** 🎉
