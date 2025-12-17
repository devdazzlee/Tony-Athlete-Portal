# Trackdesk Integration Guide for Next.js

## Complete Step-by-Step Integration

This guide will help you integrate Trackdesk tracking into your Next.js website for both development and production.

---

## 📋 STEP 1: Copy the Tracking Script

Copy the `trackdesk.js` file to your Next.js `public` folder:

```bash
# The file should be at:
frontend/public/trackdesk.js
```

If it doesn't exist, create it with the content below:

```javascript
/**
 * Trackdesk CDN Tracking Script
 * Version: 1.0.0
 * Production-ready tracking script for Next.js
 */

(function () {
  "use strict";

  // Configuration - will be overridden by init()
  const TRACKDESK_CONFIG = {
    apiUrl: "",
    version: "1.0.0",
    debug: false,
    batchSize: 10,
    flushInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
  };

  // Global namespace
  window.Trackdesk = window.Trackdesk || {};

  // Event queue
  let eventQueue = [];
  let isInitialized = false;
  let sessionId = null;
  let userId = null;
  let websiteId = null;

  // Utility functions
  const utils = {
    generateId: () =>
      Math.random().toString(36).substr(2, 9) + Date.now().toString(36),

    getCurrentTime: () => new Date().toISOString(),

    getPageInfo: () => ({
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    }),

    getDeviceInfo: () => ({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),

    getBrowserInfo: () => {
      const ua = navigator.userAgent;
      let browser = "Unknown";
      let version = "Unknown";

      if (ua.indexOf("Chrome") > -1 && ua.indexOf("Edg") === -1) {
        browser = "Chrome";
        version = ua.match(/Chrome\/(\d+)/)?.[1] || "Unknown";
      } else if (ua.indexOf("Firefox") > -1) {
        browser = "Firefox";
        version = ua.match(/Firefox\/(\d+)/)?.[1] || "Unknown";
      } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
        browser = "Safari";
        version = ua.match(/Version\/(\d+)/)?.[1] || "Unknown";
      } else if (ua.indexOf("Edg") > -1) {
        browser = "Edge";
        version = ua.match(/Edg\/(\d+)/)?.[1] || "Unknown";
      }

      return { browser, version };
    },

    log: (message, data = null) => {
      if (TRACKDESK_CONFIG.debug) {
        console.log(`[Trackdesk] ${message}`, data || "");
      }
    },
  };

  // Event tracking
  const tracker = {
    // Initialize tracking
    init: (config = {}) => {
      if (isInitialized) {
        utils.log("Trackdesk already initialized");
        return;
      }

      // Merge config
      Object.assign(TRACKDESK_CONFIG, config);

      // Get website ID from script tag or config
      const script = document.querySelector('script[src*="trackdesk.js"]');
      if (script) {
        websiteId =
          script.getAttribute("data-website-id") ||
          script.getAttribute("data-id") ||
          config.websiteId;
      }

      if (!websiteId && !config.websiteId) {
        utils.log(
          "Warning: No website ID found. Please add data-website-id to the script tag."
        );
        return;
      }

      if (config.websiteId) {
        websiteId = config.websiteId;
      }

      if (!TRACKDESK_CONFIG.apiUrl) {
        utils.log(
          "Warning: No API URL configured. Please set apiUrl in init config."
        );
        return;
      }

      // Generate session ID
      sessionId = utils.generateId();

      isInitialized = true;
      utils.log("Trackdesk initialized", {
        sessionId,
        websiteId,
        apiUrl: TRACKDESK_CONFIG.apiUrl,
      });

      // Track page view
      tracker.track("page_view", {
        page: utils.getPageInfo(),
        device: utils.getDeviceInfo(),
        browser: utils.getBrowserInfo(),
      });

      // Set up event listeners
      tracker.setupEventListeners();

      // Start batch processing
      tracker.startBatchProcessing();
    },

    // Track custom event
    track: (eventName, eventData = {}) => {
      if (!isInitialized) {
        utils.log("Trackdesk not initialized. Call Trackdesk.init() first.");
        return;
      }

      const event = {
        id: utils.generateId(),
        event: eventName,
        data: eventData,
        timestamp: utils.getCurrentTime(),
        sessionId: sessionId,
        userId: userId,
        websiteId: websiteId,
        page: utils.getPageInfo(),
        device: utils.getDeviceInfo(),
        browser: utils.getBrowserInfo(),
      };

      eventQueue.push(event);
      utils.log("Event tracked", { eventName, event });

      // Flush if queue is full
      if (eventQueue.length >= TRACKDESK_CONFIG.batchSize) {
        tracker.flush();
      }
    },

    // Set user ID
    identify: (id, userData = {}) => {
      userId = id;
      tracker.track("user_identified", {
        userId: id,
        userData: userData,
      });
    },

    // Track conversion
    convert: (conversionData = {}) => {
      tracker.track("conversion", conversionData);
    },

    // Set up automatic event listeners
    setupEventListeners: () => {
      // Page visibility changes
      document.addEventListener("visibilitychange", () => {
        tracker.track("visibility_change", {
          hidden: document.hidden,
          visibilityState: document.visibilityState,
        });
      });

      // Page unload - flush events
      window.addEventListener("beforeunload", () => {
        tracker.flush(true);
      });

      // Click tracking (throttled)
      let clickTimeout;
      document.addEventListener("click", (e) => {
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          const target = e.target;
          if (target && target.tagName) {
            tracker.track("click", {
              element: {
                tagName: target.tagName,
                id: target.id,
                className: target.className,
                text: target.textContent?.substring(0, 100),
                href: target.href,
                type: target.type,
              },
              position: { x: e.clientX, y: e.clientY },
            });
          }
        }, 100);
      });

      // Form submissions
      document.addEventListener("submit", (e) => {
        const form = e.target;
        if (form && form.tagName === "FORM") {
          tracker.track("form_submit", {
            form: {
              id: form.id,
              className: form.className,
              action: form.action,
              method: form.method,
              fieldCount: form.elements.length,
            },
          });
        }
      });

      // Scroll tracking (throttled)
      let scrollTimeout;
      window.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const scrollPercent = Math.round(
            (window.scrollY /
              (document.body.scrollHeight - window.innerHeight)) *
              100
          );
          tracker.track("scroll", {
            scrollPercent: scrollPercent,
            scrollY: window.scrollY,
            scrollHeight: document.body.scrollHeight,
          });
        }, 500);
      });

      // Time on page tracking
      let timeOnPage = 0;
      setInterval(() => {
        timeOnPage += 1;
        if (timeOnPage % 30 === 0) {
          tracker.track("time_on_page", { seconds: timeOnPage });
        }
      }, 1000);
    },

    // Start batch processing
    startBatchProcessing: () => {
      setInterval(() => {
        if (eventQueue.length > 0) {
          tracker.flush();
        }
      }, TRACKDESK_CONFIG.flushInterval);
    },

    // Flush events to server
    flush: async (force = false) => {
      if (eventQueue.length === 0) return;

      const events = [...eventQueue];
      if (!force) {
        eventQueue = [];
      }

      try {
        await tracker.sendEvents(events);
        if (force) {
          eventQueue = [];
        }
        utils.log("Events flushed successfully", { count: events.length });
      } catch (error) {
        utils.log("Failed to flush events", error);
        if (force) {
          eventQueue = [];
        } else {
          // Re-add events to queue for retry
          eventQueue.unshift(...events);
        }
      }
    },

    // Send events to server
    sendEvents: async (events) => {
      const payload = {
        events: events,
        websiteId: websiteId,
        sessionId: sessionId,
        timestamp: utils.getCurrentTime(),
      };

      const response = await fetch(
        `${TRACKDESK_CONFIG.apiUrl}/tracking/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Trackdesk-Version": TRACKDESK_CONFIG.version,
          },
          body: JSON.stringify(payload),
          keepalive: true, // Important for beforeunload events
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
  };

  // Public API
  window.Trackdesk = {
    init: tracker.init,
    track: tracker.track,
    identify: tracker.identify,
    convert: tracker.convert,
    flush: tracker.flush,
    config: TRACKDESK_CONFIG,
  };

  utils.log("Trackdesk script loaded");
})();
```

---

## 📋 STEP 2: Update Your Layout.tsx

Update your `app/layout.tsx` file to include the tracking script:

```tsx
import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trackdesk - Affiliate Management Platform",
  description: "Professional affiliate management and tracking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get configuration from environment variables
  const apiUrl =
    process.env.NEXT_PUBLIC_TRACKDESK_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";
  const websiteId = process.env.NEXT_PUBLIC_TRACKDESK_WEBSITE_ID || "";
  const isProduction = process.env.NODE_ENV === "production";
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
        {/* Initialize Trackdesk with configuration */}
        <Script id="trackdesk-init" strategy="afterInteractive">
          {`
            if (window.Trackdesk && window.Trackdesk.init) {
              window.Trackdesk.init({
                apiUrl: '${apiUrl}',
                websiteId: '${websiteId}',
                debug: ${debugMode},
                batchSize: 10,
                flushInterval: 5000
              });
            }
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" richColors closeButton expand={false} />
      </body>
    </html>
  );
}
```

---

## 📋 STEP 3: Set Environment Variables

Create `.env.local` file in your Next.js project root:

```bash
# Trackdesk Configuration
NEXT_PUBLIC_TRACKDESK_API_URL=https://trackdesk-ihom.vercel.app/api
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_WEBSITE_ID_HERE
NEXT_PUBLIC_TRACKDESK_DEBUG=false

# Or use existing API URL variable
NEXT_PUBLIC_API_URL=https://trackdesk-ihom.vercel.app/api
```

**For Development:**

```bash
NEXT_PUBLIC_TRACKDESK_API_URL=http://localhost:3003/api
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_WEBSITE_ID_HERE
NEXT_PUBLIC_TRACKDESK_DEBUG=true
```

**For Production (Vercel):**

- Add these variables in Vercel Dashboard → Settings → Environment Variables
- `NEXT_PUBLIC_TRACKDESK_API_URL=https://trackdesk-ihom.vercel.app/api`
- `NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_WEBSITE_ID_HERE`
- `NEXT_PUBLIC_TRACKDESK_DEBUG=false`

---

## 📋 STEP 4: Usage in Your Components

### Track Custom Events

```tsx
"use client";

import { useEffect } from "react";

export default function ProductPage() {
  useEffect(() => {
    // Track page view (auto-tracked, but can add custom data)
    if (typeof window !== "undefined" && window.Trackdesk) {
      window.Trackdesk.track("product_view", {
        productId: "123",
        productName: "Sample Product",
        category: "Electronics",
      });
    }
  }, []);

  const handlePurchase = () => {
    // Track conversion
    if (typeof window !== "undefined" && window.Trackdesk) {
      window.Trackdesk.convert({
        orderId: "ORDER_123",
        value: 99.99,
        currency: "USD",
        items: [{ id: "123", quantity: 1 }],
      });
    }
  };

  return (
    <div>
      <button onClick={handlePurchase}>Buy Now</button>
    </div>
  );
}
```

### Identify Users After Login

```tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  useEffect(() => {
    if (user && typeof window !== "undefined" && window.Trackdesk) {
      // Identify user for better tracking
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

---

## 📋 STEP 5: Testing

### Test in Development

1. **Start your Next.js app:**

   ```bash
   npm run dev
   ```

2. **Open browser DevTools → Console:**

   - You should see: `[Trackdesk] Trackdesk script loaded`
   - Then: `[Trackdesk] Trackdesk initialized`

3. **Check Network tab:**

   - Look for POST requests to `/api/tracking/events`
   - Events should be sent every 5 seconds or when queue is full

4. **Test custom tracking:**
   ```javascript
   // In browser console
   window.Trackdesk.track("test_event", { test: true });
   ```

### Test in Production

1. **Deploy to Vercel**
2. **Check browser console** (if debug enabled)
3. **Check Network tab** for API calls
4. **Verify events in Trackdesk dashboard**

---

## 📋 STEP 6: Advanced Usage

### Track Button Clicks

```tsx
const handleButtonClick = () => {
  if (typeof window !== "undefined" && window.Trackdesk) {
    window.Trackdesk.track("button_click", {
      buttonId: "cta-hero",
      location: "homepage",
      text: "Get Started",
    });
  }
  // Your button logic
};
```

### Track Form Submissions

```tsx
const handleSubmit = (e) => {
  e.preventDefault();

  if (typeof window !== "undefined" && window.Trackdesk) {
    window.Trackdesk.track("form_submit", {
      formId: "contact-form",
      formName: "Contact Us",
      fieldCount: 5,
    });
  }

  // Submit form
};
```

### Track E-commerce Events

```tsx
// Add to Cart
window.Trackdesk.track("add_to_cart", {
  productId: "PROD_123",
  productName: "Product Name",
  price: 49.99,
  currency: "USD",
  quantity: 1,
});

// Purchase
window.Trackdesk.convert({
  orderId: "ORDER_123",
  value: 149.97,
  currency: "USD",
  items: [
    { id: "PROD_123", name: "Product 1", price: 49.99, quantity: 2 },
    { id: "PROD_456", name: "Product 2", price: 49.99, quantity: 1 },
  ],
});
```

---

## ✅ Verification Checklist

- [ ] Script file exists at `public/trackdesk.js`
- [ ] Layout.tsx includes Script tags
- [ ] Environment variables set (`.env.local` and Vercel)
- [ ] Website ID configured
- [ ] API URL points to correct backend
- [ ] Debug mode enabled for testing
- [ ] Browser console shows "Trackdesk initialized"
- [ ] Network tab shows POST requests to `/api/tracking/events`
- [ ] Events appear in Trackdesk dashboard

---

## 🚀 Production Deployment

### Vercel Environment Variables:

```
NEXT_PUBLIC_TRACKDESK_API_URL=https://trackdesk-ihom.vercel.app/api
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_WEBSITE_ID
NEXT_PUBLIC_TRACKDESK_DEBUG=false
```

### After Deployment:

1. Visit your production site
2. Open DevTools → Network
3. Filter by "tracking"
4. Verify events are being sent
5. Check Trackdesk dashboard for incoming events

---

## 🔧 Troubleshooting

### Script not loading?

- Check that `public/trackdesk.js` exists
- Verify Script tag in layout.tsx
- Check browser console for errors

### Events not sending?

- Verify API URL is correct
- Check website ID is set
- Ensure backend `/api/tracking/events` endpoint exists
- Check Network tab for failed requests

### Events not appearing in dashboard?

- Verify website ID matches your dashboard
- Check backend logs for incoming events
- Verify CORS settings on backend

---

## 📚 API Reference

### `Trackdesk.init(config)`

Initialize tracking with configuration.

```javascript
window.Trackdesk.init({
  apiUrl: "https://api.example.com",
  websiteId: "your-website-id",
  debug: false,
  batchSize: 10,
  flushInterval: 5000,
});
```

### `Trackdesk.track(eventName, eventData)`

Track a custom event.

```javascript
window.Trackdesk.track("custom_event", { key: "value" });
```

### `Trackdesk.identify(userId, userData)`

Identify a user.

```javascript
window.Trackdesk.identify("user_123", { email: "user@example.com" });
```

### `Trackdesk.convert(conversionData)`

Track a conversion.

```javascript
window.Trackdesk.convert({ orderId: "123", value: 99.99 });
```

### `Trackdesk.flush()`

Manually flush events to server.

```javascript
window.Trackdesk.flush();
```

---

## 🎉 You're Done!

Your Next.js website is now tracking user interactions and sending data to Trackdesk. The tracking script will automatically:

- ✅ Track page views
- ✅ Track clicks
- ✅ Track form submissions
- ✅ Track scroll behavior
- ✅ Track time on page
- ✅ Batch and send events efficiently

Test it locally and then deploy to production! 🚀
