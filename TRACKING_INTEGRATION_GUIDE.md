## Trackdesk Tracking Integration Guide (Next.js)

This guide shows how to integrate the Trackdesk tracking script and send events in your Next.js app.

### 1) Prerequisites

- Backend API URL (e.g., https://trackdesk-ihom.vercel.app/api)
- Your Website ID (UUID/string issued by Trackdesk)

Set environment variables:

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://trackdesk-ihom.vercel.app/api
NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=YOUR_WEBSITE_ID
```

### 2) Add the script to your app

Add the CDN/bundled script to the global layout `frontend/app/layout.tsx` (or a custom `_app.tsx` if using pages router).

```tsx
// frontend/app/layout.tsx (excerpt)
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const websiteId = process.env.NEXT_PUBLIC_TRACKDESK_WEBSITE_ID;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <html lang="en">
      <head>
        {/* Trackdesk script - loads from local public folder */}
        <Script
          src="/trackdesk.js"
          strategy="afterInteractive"
          data-website-id={websiteId}
          data-auto-init="true"
        />
        {/* Initialize config once */}
        <Script id="trackdesk-init" strategy="afterInteractive">
          {`window.Trackdesk && window.Trackdesk.init({ apiUrl: '${apiUrl}', debug: false });`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

Notes:

- The script file already exists at `frontend/public/trackdesk.js`.
- `data-website-id` is required.
- `apiUrl` must point to your backend `/api` base (e.g., https://trackdesk-ihom.vercel.app/api).

### 3) Basic usage

Trackdesk auto tracks page views, clicks, forms, scroll, and time-on-page.

Optional custom events:

```ts
// Anywhere client-side (components)
if (typeof window !== "undefined" && window.Trackdesk) {
  window.Trackdesk.track("cta_click", { placement: "hero", variant: "A" });
}
```

Identify user after login:

```ts
// After successful login
if (typeof window !== "undefined" && window.Trackdesk) {
  window.Trackdesk.identify(user.id, {
    email: user.email,
    role: user.role,
  });
}
```

Mark a conversion:

```ts
if (typeof window !== "undefined" && window.Trackdesk) {
  window.Trackdesk.convert({
    value: 49.99,
    currency: "USD",
    source: "checkout",
  });
}
```

### 4) Shareable referral links (Affiliate)

To fetch shareable links in the app (already implemented):

- Use `${process.env.NEXT_PUBLIC_API_URL}/referral/shareable-links`
- Send Authorization header via localStorage token
- See `frontend/app/dashboard/referrals/share/page.tsx` for a complete example

```ts
import { getAuthHeaders } from "@/lib/getAuthHeaders";

const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/referral/shareable-links`,
  {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ platforms: ["facebook", "twitter"] }),
  }
);
```

### 5) Server events (optional)

You can send events from the server (RSC/route handlers) if needed:

```ts
// app/api/track/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/tracking/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: process.env.NEXT_PUBLIC_TRACKDESK_WEBSITE_ID,
        sessionId: body.sessionId || "server",
        events: body.events || [],
        timestamp: new Date().toISOString(),
      }),
    }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

### 6) Testing locally

- Start backend (must expose `/api/tracking/events`)
- Start frontend
- Open DevTools → Network to confirm POSTs to `/api/tracking/events`
- Confirm events appear in your dashboard

### 7) Production checklist

- Ensure `NEXT_PUBLIC_API_URL` points to your production backend `/api`
- Set `NEXT_PUBLIC_TRACKDESK_WEBSITE_ID`
- Keep `data-auto-init="true"` or manually call `Trackdesk.init()` once
- Verify events POST to `https://<backend>/api/tracking/events`

That’s it. Trackdesk is now integrated and sending events from your Next.js app.
