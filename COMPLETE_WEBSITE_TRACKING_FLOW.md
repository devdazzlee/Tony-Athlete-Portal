# 🔄 Complete Website & Tracking Integration Flow

Complete documentation of how websites, Website IDs, and tracking integrate across the entire Trackdesk system.

---

## 📋 **Table of Contents**

1. [System Architecture Overview](#system-architecture-overview)
2. [Website Management Flow](#website-management-flow)
3. [Backend CRUD Operations](#backend-crud-operations)
4. [Tracking Script Integration](#tracking-script-integration)
5. [Database Schema & Relationships](#database-schema--relationships)
6. [Complete End-to-End Flow](#complete-end-to-end-flow)
7. [API Endpoints Reference](#api-endpoints-reference)

---

## 🏗️ **System Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    TRACKDESK SYSTEM                         │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Frontend   │────────▶│   Backend    │                  │
│  │  Dashboard   │         │     API      │                  │
│  └──────────────┘         └──────────────┘                  │
│         │                           │                        │
│         │                           │                        │
│         │                           ▼                        │
│         │                  ┌──────────────┐                  │
│         │                  │   Database   │                  │
│         │                  │  (PostgreSQL)│                  │
│         │                  └──────────────┘                  │
│         │                           │                        │
│         ▼                           ▼                        │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  Your Next.js│────────▶│  Tracking   │                  │
│  │   Websites   │         │    Script    │                  │
│  │ (Store #1 &  │         │ (trackdesk.js│                  │
│  │  Store #2)   │         │              │                  │
│  └──────────────┘         └──────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 **Website Management Flow**

### **Step 1: Admin Creates Website**

```
Admin Dashboard → Settings → Websites → "Add Website"
                                                    ↓
                                    Fill Form:
                                    - Name: "Store #1"
                                    - Domain: "mystore.com"
                                    - Description: (optional)
                                                    ↓
                                    Click "Create Website"
                                                    ↓
                                    Frontend → POST /api/websites
                                                    ↓
                                    Backend validates & generates websiteId
                                                    ↓
                                    Returns website object with websiteId
                                                    ↓
                                    Display in dashboard
```

### **Step 2: Get Website ID**

```
Admin/Affiliate → Settings → Websites
                                                    ↓
                                    View list of websites
                                                    ↓
                                    See generated websiteId
                                                    ↓
                                    Click "Copy ID" or "Copy ENV Variable"
                                                    ↓
                                    Use in Next.js project
```

---

## 🔧 **Backend CRUD Operations**

### **API Endpoints:**

| Method   | Endpoint            | Role Required   | Description        |
| -------- | ------------------- | --------------- | ------------------ |
| `GET`    | `/api/websites`     | AFFILIATE/ADMIN | Get all websites   |
| `GET`    | `/api/websites/:id` | AFFILIATE/ADMIN | Get website by ID  |
| `POST`   | `/api/websites`     | ADMIN only      | Create new website |
| `PUT`    | `/api/websites/:id` | ADMIN only      | Update website     |
| `DELETE` | `/api/websites/:id` | ADMIN only      | Delete website     |

### **1. GET /api/websites - Get All Websites**

**Request:**

```http
GET /api/websites
Authorization: Bearer <token>
```

**Response (Affiliate - View Only):**

```json
{
  "success": true,
  "websites": [
    {
      "id": "website-123",
      "name": "Store #1",
      "domain": "mystore.com",
      "websiteId": "mystore-com",
      "description": "Main production store",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Response (Admin - Full Access):**

```json
{
  "success": true,
  "websites": [
    // All websites in system
  ],
  "canCreate": true,
  "canEdit": true,
  "canDelete": true
}
```

**Access Control:**

- ✅ Affiliates: Can view all websites (read-only)
- ✅ Admins: Can view all websites (full access)

---

### **2. POST /api/websites - Create Website (Admin Only)**

**Request:**

```http
POST /api/websites
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Store #1",
  "domain": "mystore.com",
  "description": "Main production store",
  "websiteId": "mystore-com" // Optional - auto-generated if not provided
}
```

**Backend Processing:**

```typescript
// 1. Validate request (requireAdmin middleware)
// 2. Parse and validate data with Zod schema
// 3. Generate websiteId if not provided:
const websiteId = data.websiteId || generateWebsiteId(data.domain);
// Result: "mystore-com"

// 4. Create website object
// 5. Store in database (TODO: Implement database storage)
// 6. Return created website
```

**Response:**

```json
{
  "success": true,
  "website": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Store #1",
    "domain": "mystore.com",
    "websiteId": "mystore-com",
    "description": "Main production store",
    "status": "ACTIVE",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Website created successfully"
}
```

**Access Control:**

- ❌ Affiliates: Cannot create (403 Forbidden)
- ✅ Admins: Can create (201 Created)

---

### **3. PUT /api/websites/:id - Update Website (Admin Only)**

**Request:**

```http
PUT /api/websites/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Store #1 Updated",
  "domain": "newstore.com",
  "description": "Updated description"
}
```

**Response:**

```json
{
  "success": true,
  "website": {
    "id": "website-123",
    "name": "Store #1 Updated",
    "domain": "newstore.com",
    "websiteId": "mystore-com", // websiteId doesn't change
    "description": "Updated description"
  },
  "message": "Website updated successfully"
}
```

**Access Control:**

- ❌ Affiliates: Cannot update (403 Forbidden)
- ✅ Admins: Can update (200 OK)

---

### **4. DELETE /api/websites/:id - Delete Website (Admin Only)**

**Request:**

```http
DELETE /api/websites/:id
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Website deleted successfully"
}
```

**Access Control:**

- ❌ Affiliates: Cannot delete (403 Forbidden)
- ✅ Admins: Can delete (200 OK)

---

## 📡 **Tracking Script Integration**

### **How websiteId Flows Through Tracking:**

```
┌─────────────────────────────────────────────────────────────┐
│  1. NEXT.JS WEBSITE INTEGRATION                             │
│                                                              │
│  frontend/.env.local:                                        │
│  NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=mystore-com              │
│                                                              │
│  app/layout.tsx:                                             │
│  Trackdesk.init({                                            │
│    websiteId: 'mystore-com'  ← From environment variable   │
│  })                                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  2. TRACKING SCRIPT (trackdesk.js)                          │
│                                                              │
│  - Captures websiteId from init() config                     │
│  - Stores in internal variable                              │
│  - Includes websiteId in EVERY tracking event               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  3. TRACKING EVENTS                                          │
│                                                              │
│  Every event includes websiteId:                             │
│  {                                                           │
│    event: "page_view",                                       │
│    websiteId: "mystore-com", ← Always included              │
│    sessionId: "session-123",                                 │
│    data: {...},                                              │
│    page: {...},                                              │
│    device: {...}                                             │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  4. API REQUEST                                              │
│                                                              │
│  POST /api/tracking/events                                   │
│  {                                                           │
│    events: [                                                 │
│      {                                                       │
│        websiteId: "mystore-com", ← Sent to backend          │
│        event: "page_view",                                   │
│        ...                                                   │
│      }                                                       │
│    ],                                                        │
│    websiteId: "mystore-com", ← Batch level                  │
│    sessionId: "session-123"                                  │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  5. BACKEND PROCESSING                                       │
│                                                              │
│  TrackingService.processEvent() {                            │
│    - Extracts websiteId from event                           │
│    - Creates/updates TrackingSession with websiteId          │
│    - Stores TrackingEvent with websiteId                     │
│    - Updates TrackingStats by websiteId                      │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  6. DATABASE STORAGE                                         │
│                                                              │
│  TrackingEvent table:                                        │
│  - websiteId: "mystore-com"                                 │
│                                                              │
│  TrackingSession table:                                      │
│  - websiteId: "mystore-com"                                 │
│                                                              │
│  TrackingStats table:                                        │
│  - websiteId: "mystore-com"                                 │
│  - Unique by [websiteId, date]                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ **Database Schema & Relationships**

### **Tracking Tables Using websiteId:**

#### **1. TrackingEvent Table:**

```sql
CREATE TABLE tracking_events (
  id              VARCHAR PRIMARY KEY,
  trackingCodeId  VARCHAR,
  eventType       VARCHAR,
  event           VARCHAR,
  data            JSONB,
  timestamp       TIMESTAMP,
  sessionId       VARCHAR,
  websiteId       VARCHAR,  -- ← Links to website
  ipAddress       VARCHAR,
  userAgent       VARCHAR,
  referrer        VARCHAR,
  FOREIGN KEY (trackingCodeId) REFERENCES tracking_codes(id)
);
```

**Usage:**

- Every tracking event (page_view, click, form_submit, etc.) stores `websiteId`
- Allows filtering events by website
- Links events to specific websites

---

#### **2. TrackingSession Table:**

```sql
CREATE TABLE tracking_sessions (
  id          VARCHAR PRIMARY KEY,
  sessionId   VARCHAR UNIQUE,
  websiteId   VARCHAR,  -- ← Links to website
  userId      VARCHAR,
  ipAddress   VARCHAR,
  userAgent   VARCHAR,
  country     VARCHAR,
  city        VARCHAR,
  startTime   TIMESTAMP,
  endTime     TIMESTAMP,
  pageViews   INT DEFAULT 0,
  events      INT DEFAULT 0
);
```

**Usage:**

- Each user session is linked to a `websiteId`
- Tracks visitor sessions per website
- Enables website-specific analytics

---

#### **3. TrackingStats Table:**

```sql
CREATE TABLE tracking_stats (
  id                 VARCHAR PRIMARY KEY,
  websiteId          VARCHAR,  -- ← Links to website
  date               TIMESTAMP,
  pageViews          INT DEFAULT 0,
  uniqueVisitors     INT DEFAULT 0,
  sessions           INT DEFAULT 0,
  events             INT DEFAULT 0,
  conversions        INT DEFAULT 0,
  revenue            FLOAT DEFAULT 0,
  bounceRate         FLOAT DEFAULT 0,
  avgSessionDuration FLOAT DEFAULT 0,
  UNIQUE(websiteId, date)  -- One stat record per website per day
);
```

**Usage:**

- Daily aggregated statistics per website
- Unique constraint: `[websiteId, date]`
- Enables website performance comparison

---

## 🔄 **Complete End-to-End Flow**

### **Scenario: Affiliate Shares Link & Customer Purchases**

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: ADMIN CREATES WEBSITE                              │
│                                                              │
│  Admin Dashboard → Settings → Websites → "Add Website"       │
│  Form: Name="Store #1", Domain="mystore.com"                │
│  Backend generates: websiteId="mystore-com"                 │
│  Returns: { id, name, domain, websiteId, ... }              │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: AFFILIATE GETS WEBSITE ID                          │
│                                                              │
│  Affiliate Dashboard → Settings → Websites                   │
│  Views website: "Store #1"                                  │
│  Sees websiteId: "mystore-com"                              │
│  Clicks "Copy ENV Variable"                                 │
│  Gets: NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=mystore-com        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: INTEGRATE IN NEXT.JS WEBSITE                       │
│                                                              │
│  Your Next.js Store:                                         │
│  1. Create frontend/.env.local:                              │
│     NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=mystore-com            │
│                                                              │
│  2. app/layout.tsx:                                          │
│     Trackdesk.init({                                         │
│       websiteId: 'mystore-com'                               │
│     })                                                       │
│                                                              │
│  3. Tracking script now knows websiteId                      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: AFFILIATE CREATES REFERRAL CODE                    │
│                                                              │
│  Affiliate Dashboard → Referrals → My Codes                 │
│  Creates code: "AFF_0AGXXR"                                 │
│  Gets shareable link:                                        │
│  https://mystore.com/?ref=AFF_0AGXXR                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: AFFILIATE SHARES LINK                              │
│                                                              │
│  Affiliate shares:                                           │
│  https://mystore.com/?ref=AFF_0AGXXR                       │
│                                                              │
│  (Instagram, Facebook, Email, etc.)                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: CUSTOMER CLICKS LINK                               │
│                                                              │
│  Customer visits:                                            │
│  https://mystore.com/?ref=AFF_0AGXXR                       │
│                                                              │
│  Your Next.js site:                                          │
│  1. Tracking script captures ?ref=AFF_0AGXXR                │
│  2. Stores referral code in localStorage (90 days)          │
│  3. Sends click to: POST /api/tracking/click                │
│     {                                                         │
│       referralCode: "AFF_0AGXXR",                          │
│       storeId: "mystore-com",  ← websiteId                   │
│       url: "https://mystore.com/?ref=AFF_0AGXXR"            │
│     }                                                         │
│                                                              │
│  Backend:                                                     │
│  - Finds referral code "AFF_0AGXXR"                         │
│  - Creates AffiliateClick record                            │
│  - Links click to affiliate                                  │
│  - Updates affiliate stats                                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 7: TRACKING SCRIPT SENDS EVENTS                       │
│                                                              │
│  Your Next.js site automatically tracks:                    │
│                                                              │
│  1. Page View:                                               │
│     POST /api/tracking/events                                │
│     {                                                         │
│       events: [{                                              │
│         event: "page_view",                                   │
│         websiteId: "mystore-com", ← From env                │
│         sessionId: "session-123",                            │
│         data: {                                              │
│           page: { url: "...", title: "..." },               │
│           device: {...},                                     │
│           browser: {...}                                     │
│         }                                                     │
│       }],                                                     │
│       websiteId: "mystore-com",                             │
│       sessionId: "session-123"                               │
│     }                                                         │
│                                                              │
│  2. Clicks, Scrolls, Forms, etc.                             │
│     (All include websiteId)                                  │
│                                                              │
│  Backend stores in:                                           │
│  - TrackingEvent (with websiteId)                            │
│  - TrackingSession (with websiteId)                          │
│  - Updates TrackingStats (by websiteId)                      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 8: CUSTOMER MAKES PURCHASE                            │
│                                                              │
│  Customer completes checkout:                                │
│  - Order ID: "ORD-123"                                       │
│  - Order Value: $99.99                                       │
│                                                              │
│  Your Next.js checkout success page:                         │
│  1. Gets referral code from localStorage:                    │
│     localStorage.getItem('trackdesk_referral_code')          │
│     Returns: "AFF_0AGXXR"                                   │
│                                                              │
│  2. Sends order tracking:                                     │
│     POST /api/tracking/order                                 │
│     {                                                         │
│       referralCode: "AFF_0AGXXR",                          │
│       storeId: "mystore-com",  ← websiteId                   │
│       orderId: "ORD-123",                                    │
│       orderValue: 99.99,                                     │
│       currency: "USD"                                        │
│     }                                                         │
│                                                              │
│  Backend:                                                     │
│  - Finds affiliate by referral code                         │
│  - Calculates commission (e.g., 10% = $9.99)                │
│  - Creates AffiliateOrder record                             │
│  - Updates affiliate stats (conversions, earnings)           │
│  - Creates commission record                                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 9: ANALYTICS & REPORTING                              │
│                                                              │
│  Admin can view:                                              │
│  - Tracking stats by websiteId                              │
│  - Analytics filtered by websiteId                          │
│  - Conversion tracking per website                           │
│                                                              │
│  GET /api/tracking/stats/:websiteId                          │
│  GET /api/tracking/analytics/:websiteId                      │
│                                                              │
│  Returns website-specific:                                    │
│  - Page views                                                │
│  - Unique visitors                                           │
│  - Conversions                                               │
│  - Revenue                                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 **API Endpoints Reference**

### **Website Management APIs:**

| Method   | Endpoint            | Role            | Description         |
| -------- | ------------------- | --------------- | ------------------- |
| `GET`    | `/api/websites`     | AFFILIATE/ADMIN | List all websites   |
| `GET`    | `/api/websites/:id` | AFFILIATE/ADMIN | Get website details |
| `POST`   | `/api/websites`     | ADMIN           | Create website      |
| `PUT`    | `/api/websites/:id` | ADMIN           | Update website      |
| `DELETE` | `/api/websites/:id` | ADMIN           | Delete website      |

### **Tracking APIs (Using websiteId):**

| Method | Endpoint                 | Description                                           |
| ------ | ------------------------ | ----------------------------------------------------- |
| `POST` | `/api/tracking/events`   | Batch tracking events (includes websiteId)            |
| `POST` | `/api/tracking/click`    | Track referral click (includes storeId = websiteId)   |
| `POST` | `/api/tracking/order`    | Track order/conversion (includes storeId = websiteId) |
| `POST` | `/api/tracking/pageview` | Track page view (includes websiteId)                  |

### **Analytics APIs (Filtered by websiteId):**

| Method | Endpoint                              | Description               |
| ------ | ------------------------------------- | ------------------------- |
| `GET`  | `/api/tracking/stats/:websiteId`      | Get stats for website     |
| `GET`  | `/api/tracking/analytics/:websiteId`  | Get analytics for website |
| `GET`  | `/api/tracking/realtime/:websiteId`   | Get real-time analytics   |
| `GET`  | `/api/tracking/pages/:websiteId`      | Get page analytics        |
| `GET`  | `/api/tracking/devices/:websiteId`    | Get device analytics      |
| `GET`  | `/api/tracking/geographic/:websiteId` | Get geographic analytics  |

---

## 🔑 **Key Integration Points**

### **1. Frontend Dashboard → Backend API:**

```typescript
// Frontend: frontend/app/dashboard/settings/websites/page.tsx

// Create Website (Admin only)
const response = await fetch(`${config.apiUrl}/websites`, {
  method: "POST",
  headers: getAuthHeaders(), // Includes Authorization: Bearer <token>
  body: JSON.stringify({
    name: formData.name,
    domain: formData.domain,
    description: formData.description,
  }),
});

// Backend validates:
// 1. User is authenticated (authenticateToken)
// 2. User is admin (requireAdmin)
// 3. Data is valid (Zod schema)
// 4. Generates websiteId
// 5. Returns website object
```

### **2. Next.js Website → Tracking Script:**

```typescript
// Next.js: app/layout.tsx

const websiteId = process.env.NEXT_PUBLIC_TRACKDESK_WEBSITE_ID;

// Initialize tracking with websiteId
window.Trackdesk.init({
  apiUrl: 'http://localhost:3003/api',
  websiteId: websiteId, // ← Used in all events
  debug: true
});

// Every event now includes websiteId:
window.Trackdesk.track('page_view', {...});
// Internally includes: websiteId: 'mystore-com'
```

### **3. Tracking Script → Backend API:**

```javascript
// trackdesk.js sends events with websiteId

fetch(`${TRACKDESK_CONFIG.apiUrl}/tracking/events`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Trackdesk-Version': TRACKDESK_CONFIG.version
  },
  body: JSON.stringify({
    events: [
      {
        event: 'page_view',
        websiteId: websiteId, // ← From init() config
        sessionId: sessionId,
        data: {...},
        page: {...},
        device: {...},
        browser: {...}
      }
    ],
    websiteId: websiteId, // ← Batch level
    sessionId: sessionId,
    timestamp: new Date().toISOString()
  })
});
```

### **4. Backend → Database:**

```typescript
// Backend: services/TrackingService.ts

await this.storeEvent({
  id: event.id,
  eventType: event.event,
  websiteId: event.websiteId, // ← Stored in database
  sessionId: event.sessionId,
  data: event.data,
  timestamp: event.timestamp,
  // ...
});

// Stored in TrackingEvent table with websiteId
// Can query: WHERE websiteId = 'mystore-com'
```

---

## 📊 **Multi-Website Support**

### **Scenario: Two Next.js Websites**

#### **Website #1:**

- **Website ID:** `store-1-production`
- **Environment:** `frontend/.env.local`
- **Tracking:** All events tagged with `websiteId: "store-1-production"`

#### **Website #2:**

- **Website ID:** `store-2-production`
- **Environment:** `frontend-website2/.env.local`
- **Tracking:** All events tagged with `websiteId: "store-2-production"`

#### **Result:**

- ✅ Separate tracking per website
- ✅ Can filter analytics by websiteId
- ✅ Can compare performance between websites
- ✅ Shared affiliate referral codes work on both

---

## 🎯 **Summary**

### **Complete Flow:**

1. **Admin creates website** → Backend generates `websiteId`
2. **Affiliate views website** → Gets `websiteId` from dashboard
3. **Website ID added to Next.js** → Set in `.env.local`
4. **Tracking script initialized** → Uses `websiteId` from env
5. **Every event includes websiteId** → Sent to backend API
6. **Backend stores with websiteId** → In TrackingEvent, TrackingSession, TrackingStats
7. **Analytics filtered by websiteId** → View per-website stats

### **Key Points:**

- ✅ **websiteId identifies each website** in the system
- ✅ **Tracking script automatically includes websiteId** in all events
- ✅ **Database stores all data with websiteId** for filtering
- ✅ **Analytics APIs support websiteId filtering**
- ✅ **Multi-website support** - Each website has unique websiteId
- ✅ **Referral codes work across all websites** with same websiteId

---

**The complete flow is integrated and working!** 🎉
